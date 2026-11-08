"""Hàng đợi xử lý: tải → nhận dạng → dịch → lồng tiếng → dựng video."""
from __future__ import annotations

import json
import queue
import shutil
import threading
import time
import traceback
from pathlib import Path

from . import asr, config, inpaint, media, ocr, store, translate, tts
from .subtitles import align_words, build_ass, parse_srt, plain, quality_check, to_srt

STAGES = [
    ("download", "Tải video"),
    ("audio", "Tách âm thanh"),
    ("recognize", "Nhận dạng lời"),
    ("translate", "Dịch"),
    ("voice", "Lồng tiếng"),
    ("render", "Xuất video"),
]
WEIGHTS = {"download": (0, 15), "audio": (15, 20), "recognize": (20, 45), "translate": (45, 62),
           "voice": (62, 82), "render": (82, 100)}


class Job:
    def __init__(self, pid: str, kind: str, opts: dict | None = None):
        self.pid, self.kind, self.opts = pid, kind, opts or {}
        self.cancelled = False
        self.created = time.time()
        self.steps: list[tuple[str, callable]] = []  # (làn, hàm) chạy lần lượt
        self.lane = ""


# Ba làn chạy song song: việc dùng mạng, nhận dạng (GPU/CPU nặng), xuất video (FFmpeg).
# Một video chỉ nằm ở một làn tại một thời điểm, nhưng video 2 có thể đang dịch
# trong lúc video 1 đang xuất.
LANES = {"net": 2, "asr": 1, "render": 1}
_queues: dict[str, "queue.Queue[Job]"] = {k: queue.Queue() for k in LANES}
_jobs: dict[str, Job] = {}          # pid → job đang sống (chờ hoặc chạy)
_running: dict[str, str] = {}       # pid → làn đang chạy
_plock = threading.Lock()
_events: list[dict] = []            # thông báo cho giao diện
_live: dict[str, dict] = {}         # tiến độ giữ trong bộ nhớ, không ghi đĩa liên tục


class Busy(RuntimeError):
    pass


def is_busy(pid: str) -> bool:
    with _plock:
        return pid in _jobs


def enqueue(pid: str, kind: str = "full", opts: dict | None = None) -> None:
    job = Job(pid, kind, opts)
    job.steps = plan(job)
    with _plock:
        if pid in _jobs:
            raise Busy("Video đang được xử lý — chờ xong hoặc bấm Huỷ")
        _jobs[pid] = job
    _live[pid] = {"stage": "", "progress": 0.0, "message": "Đang chờ trong hàng đợi"}
    store.update(pid, status="queued", message="Đang chờ trong hàng đợi", error="")
    _advance(job)


def _advance(job: Job) -> None:
    lane = job.steps[0][0]
    job.lane = lane
    _queues[lane].put(job)


def cancel(pid: str) -> bool:
    with _plock:
        job = _jobs.get(pid)
        if job:
            job.cancelled = True
        return bool(job)


def queue_state() -> dict:
    with _plock:
        return {"running": dict(_running),
                "pending": [p for p, j in _jobs.items() if p not in _running and not j.cancelled]}


def live(pid: str) -> dict | None:
    return _live.get(pid)


def overlay_live(proj: dict) -> dict:
    """Ghép tiến độ trong bộ nhớ vào dữ liệu dự án đọc từ đĩa."""
    lv = _live.get(proj.get("id"))
    if lv and proj.get("status") in ("queued", "processing"):
        proj.update(lv)
    return proj


def pop_events(since: float) -> list[dict]:
    return [e for e in _events if e["t"] > since]


def _event(pid: str, kind: str, msg: str):
    _events.append({"t": time.time(), "pid": pid, "kind": kind, "msg": msg})
    del _events[:-50]


def _set(pid: str, stage: str, frac: float, msg: str):
    lo, hi = WEIGHTS.get(stage, (0, 100))
    _live[pid] = {"stage": stage, "progress": round(lo + (hi - lo) * max(0, min(1, frac)), 1), "message": msg}


def _prog(pid: str, stage: str, msg: str):
    def cb(f: float):
        _set(pid, stage, f, f"{msg} {int(f * 100)}%")
    return cb


def _finish(job: Job, **fields):
    with _plock:
        _jobs.pop(job.pid, None)
        _running.pop(job.pid, None)
    _live.pop(job.pid, None)
    if fields:
        try:
            store.update(job.pid, **fields)
        except KeyError:
            pass


def worker(lane: str):
    q = _queues[lane]
    while True:
        job = q.get()
        if job.cancelled:
            _finish(job, status="cancelled", message="Đã huỷ")
            continue
        with _plock:
            _running[job.pid] = lane
        try:
            if store.load(job.pid).get("status") != "processing":
                store.update(job.pid, status="processing", error="")
            # chạy liên tiếp các bước cùng làn
            while job.steps and job.steps[0][0] == lane:
                if job.cancelled:
                    raise media.Cancelled("Đã huỷ")
                _, fn = job.steps.pop(0)
                fn(job)
            if job.steps:
                with _plock:
                    _running.pop(job.pid, None)
                _live.setdefault(job.pid, {})["message"] = "Đang chờ bước tiếp theo"
                _advance(job)
            else:
                _finish(job)
        except media.Cancelled as e:
            _finish(job, status="cancelled", message=str(e))
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            msg = "Đã huỷ" if job.cancelled else (str(e) or type(e).__name__)
            _finish(job, status="cancelled" if job.cancelled else "error", error=msg,
                     message="Lỗi: " + msg.splitlines()[0][:160])
            if not job.cancelled:
                _event(job.pid, "error", msg[:200])


def start_worker():
    for lane, n in LANES.items():
        for i in range(n):
            threading.Thread(target=worker, args=(lane,), daemon=True, name=f"pipeline-{lane}-{i}").start()
    threading.Thread(target=_janitor, daemon=True, name="janitor").start()
    # dự án đang dở dang khi tắt app → đánh dấu để người dùng chạy lại
    for p in store.list_projects():
        if p["status"] in ("queued", "processing"):
            store.update(p["id"], status="error", message="Bị gián đoạn — bấm Chạy lại", error="interrupted")


def _janitor():
    while True:
        try:
            store.cleanup()
        except Exception:  # noqa: BLE001
            traceback.print_exc()
        time.sleep(6 * 3600)


# ---------------------------------------------------------------- các bước

def download(job: Job, proj: dict) -> dict:
    d = store.pdir(proj["id"])
    if (d / "source.mp4").exists():
        return proj
    url = proj["source_url"]
    if not url:
        raise RuntimeError("Không có video nguồn")
    import yt_dlp
    settings = config.load_settings()
    cb = _prog(proj["id"], "download", "Đang tải video")

    def hook(h):
        if job.cancelled:
            raise media.Cancelled("Đã huỷ")
        if h.get("status") == "downloading":
            tot = h.get("total_bytes") or h.get("total_bytes_estimate") or 0
            if tot:
                cb(h.get("downloaded_bytes", 0) / tot)

    opts = {
        "format": "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b",
        "merge_output_format": "mp4", "outtmpl": str(d / "dl.%(ext)s"), "noplaylist": True,
        "quiet": True, "no_warnings": True, "progress_hooks": [hook], "retries": 5,
        "http_headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                                       "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"},
    }
    if settings.get("cookies_file") and Path(settings["cookies_file"]).exists():
        opts["cookiefile"] = settings["cookies_file"]
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
    files = sorted(d.glob("dl.*"), key=lambda p: p.stat().st_size, reverse=True)
    if not files:
        raise RuntimeError("Tải video thất bại")
    src = files[0]
    if src.suffix.lower() != ".mp4":
        media.run_ffmpeg(["-i", str(src), "-c", "copy", str(d / "source.mp4")])
        src.unlink()
    else:
        src.rename(d / "source.mp4")
    for f in d.glob("dl.*"):
        f.unlink(missing_ok=True)
    title = (info or {}).get("title") or proj["title"]
    proj = store.update(proj["id"], title_src=title, uploader=(info or {}).get("uploader", ""),
                        platform=proj["platform"] or (info or {}).get("extractor_key", ""))
    return proj


def prepare_audio(job: Job, proj: dict) -> dict:
    d = store.pdir(proj["id"])
    src = d / "source.mp4"
    info = media.probe(src)
    if not info["has_video"]:
        raise RuntimeError("File không có hình ảnh")
    upd = {"duration": info["duration"], "width": info["width"], "height": info["height"],
           "has_audio": info["has_audio"], "fps": info["fps"]}
    if proj["trim"].get("end", 0) <= 0:
        upd["trim"] = {"start": 0, "end": info["duration"]}
    proj = store.update(proj["id"], **upd)
    _set(proj["id"], "audio", 0.2, "Đang tách âm thanh")
    if info["has_audio"] and not (d / "audio16k.wav").exists():
        media.extract_audio(src, d / "audio16k.wav", 16000, mono=True)
    if not (d / "thumb.jpg").exists():
        try:
            media.thumbnail(src, d / "thumb.jpg", min(2.0, info["duration"] / 3))
        except media.MediaError:
            pass
    if info["has_audio"] and not (d / "peaks_orig.json").exists():
        (d / "peaks_orig.json").write_text(json.dumps(media.waveform_peaks(src)))
    # tách nhạc nền (tuỳ chọn)
    if proj["settings"].get("separate_music") and info["has_audio"] and not (d / "instrumental.wav").exists():
        _set(proj["id"], "audio", 0.6, "Đang tách nhạc nền")
        try:
            from audio_separator.separator import Separator  # type: ignore
            sep = Separator(output_dir=str(d), output_single_stem="Instrumental")
            sep.load_model()
            outs = sep.separate(str(src))
            for o in outs:
                p = d / Path(o).name
                if p.exists():
                    p.rename(d / "instrumental.wav")
                    break
        except Exception as e:  # noqa: BLE001
            _event(proj["id"], "warn", f"Không tách được nhạc nền: {e}")
    return proj


def recognize(job: Job, proj: dict) -> dict:
    d = store.pdir(proj["id"])
    pid = proj["id"]
    s = proj["settings"]
    info = {"duration": proj["duration"], "width": proj["width"], "height": proj["height"]}
    # dò vùng sub gốc
    region = s.get("hardsub_region")
    if s.get("auto_detect_region") and ocr.available() and not proj.get("region_detected"):
        _set(pid, "recognize", 0.02, "Đang dò vùng phụ đề gốc")
        try:
            found = ocr.detect_region(d / "source.mp4", info)
            if found:
                s["hardsub_region"] = region = found
                proj = store.update(pid, settings=s, region_detected=True)
        except Exception as e:  # noqa: BLE001
            _event(pid, "warn", f"Dò vùng sub lỗi: {e}")
    if proj["segments"]:
        return proj
    srt = d / "import.srt"
    if srt.exists():
        rows = parse_srt(srt.read_text("utf-8", "replace"))
        segs = [{"start": r["start"], "end": r["end"], "src": r["text"]} for r in rows]
    elif proj.get("source_mode") == "ocr":
        segs = ocr.read_subtitles(d / "source.mp4", info, region, progress=_prog(pid, "recognize", "Đang đọc sub gốc"),
                                  cancel=lambda: job.cancelled)
    else:
        if not proj.get("has_audio"):
            raise RuntimeError("Video không có tiếng — hãy chọn chế độ đọc sub gốc (OCR) hoặc nhập SRT")
        segs = asr.transcribe(d / "audio16k.wav", s.get("source_lang", "zh"), s.get("asr_model", "small"),
                              config.load_settings().get("asr_device", "auto"),
                              progress=_prog(pid, "recognize", "Đang nghe và chép lời"),
                              cancel=lambda: job.cancelled,
                              batched={"on": True, "off": False}.get(config.load_settings().get("asr_batched", "auto")))
    if not segs:
        raise RuntimeError("Không nhận dạng được câu nào")
    if proj.get("source_mode") == "ocr" and region:
        # đọc sub bằng OCR → đã biết chính xác lúc nào có chữ
        store.update(pid, hardsub_times={"region": dict(region),
                                         "ranges": media.merge_ranges([(x["start"], x["end"]) for x in segs])})
    genders = [""] * len(segs)
    if proj.get("has_audio") and (d / "audio16k.wav").exists():
        try:
            pcm = media.decode_pcm(d / "audio16k.wav", 16000)
            genders = asr.guess_genders(pcm, segs)
        except Exception:  # noqa: BLE001
            pass
    nid = proj["next_id"]
    out = []
    for seg, g in zip(segs, genders):
        out.append({"id": nid, "start": round(seg["start"], 2), "end": round(seg["end"], 2), "src": seg["src"],
                    "text": "", "speaker": g or "female", "voice": "", "speed": 1.0})
        nid += 1
    # nhận diện người nói (pyannote) → mỗi người một giọng
    if config.load_settings().get("diarize") and proj.get("has_audio") and asr.diarize_available():
        _set(pid, "recognize", 0.97, "Đang phân biệt người nói")
        try:
            turns = asr.diarize(d / "audio16k.wav", config.load_keys().get("huggingface", ""))
            asr.assign_speakers(out, turns, genders)
        except Exception as e:  # noqa: BLE001
            _event(pid, "warn", f"Không phân biệt được người nói: {e}")
    return store.update(pid, segments=out, next_id=nid)


def _save_segment_fields(pid: str, segs: list[dict], fields: tuple[str, ...]) -> dict:
    """Ghi lại một số trường của từng câu theo id, không đè các thay đổi khác."""
    by_id = {x["id"]: x for x in segs}
    with store.lock(pid):
        proj = store.load(pid)
        for seg in proj["segments"]:
            src = by_id.get(seg["id"])
            if src:
                for f in fields:
                    if f in src:
                        seg[f] = src[f]
        return store.save(proj)


def do_translate(job: Job, proj: dict, only_ids: set | None = None) -> dict:
    pid = proj["id"]
    s = {**config.load_settings(), **proj["settings"]}
    segs = proj["segments"]
    todo = [x for x in segs if (only_ids is None and not x.get("text")) or (only_ids and x["id"] in only_ids)]
    if not todo:
        return proj
    if s.get("source_lang") == s.get("target_lang"):
        for x in todo:
            x["text"] = x["src"]
    else:
        highlight = proj["style"].get("preset") in ("tiktok", "pop")
        res = translate.translate_segments(todo, s, progress=_prog(pid, "translate", "Đang dịch"),
                                           highlight=highlight, context_title=proj.get("title_src", ""))
        for x, t in zip(todo, res):
            x["text"] = t
            x["locked"] = False  # bản dịch máy → cho phép tự rút gọn
    proj = _save_segment_fields(pid, todo, ("text", "locked"))
    if proj.get("title_src") and (not proj.get("title") or proj["title"] == proj.get("title_src")):
        try:
            title = translate.translate_texts([proj["title_src"]], s, s.get("source_lang", "zh"),
                                              s.get("target_lang", "vi"))[0]
            proj = store.update(pid, title=title)
        except Exception:  # noqa: BLE001
            pass
    return proj


def voice_for(seg: dict, s: dict) -> str:
    if seg.get("voice"):
        return seg["voice"]
    spk = (s.get("speaker_voices") or {}).get(seg.get("speaker_id") or "")
    if spk:
        return spk
    if s.get("voice_default") == "auto":
        return s["voice_male"] if seg.get("speaker") == "male" else s["voice_female"]
    return s.get("voice_default") or s["voice_female"]


def _assign_keys(proj: dict, s: dict) -> list[tuple]:
    d = store.pdir(proj["id"])
    jobs = []
    for seg in proj["segments"]:
        if not plain(seg.get("text", "")) or seg.get("mute"):
            seg["tts_key"] = ""
            continue
        voice = voice_for(seg, s)
        rate = int(s.get("tts_rate", 0))
        key = tts.tts_key(seg["text"], voice, rate)
        seg["tts_key"] = key
        jobs.append((seg["text"], voice, rate, d / "tts" / f"{key}.mp3"))
    return jobs


def _auto_shorten(job: Job, proj: dict, s: dict) -> int:
    """Câu đọc không kịp → nhờ AI dịch ngắn lại rồi tạo giọng lại. Trả về số câu đã rút gọn."""
    if not s.get("auto_shorten", True) or s.get("translator") in ("google", "offline"):
        return 0
    d = store.pdir(proj["id"])
    max_speed = float(s.get("max_speed", 1.4))
    total = 0
    for rnd in range(2):
        segs = proj["segments"]
        too_long = []
        for i, seg in enumerate(segs):
            if seg.get("locked") or not seg.get("tts_key") or seg.get("mute"):
                continue
            f = d / "tts" / f"{seg['tts_key']}.mp3"
            if not f.exists():
                continue
            dur = tts.speech_duration(f)
            win = tts.window(segs, i, proj["duration"])
            need = dur / float(seg.get("speed") or 1.0)
            if need > win * max_speed * 0.97:
                # nhắm tới tốc độ ~1,15x để giọng còn tự nhiên
                target = max(4, int(len(plain(seg["text"])) * win * 1.15 / need))
                too_long.append({"id": seg["id"], "text": seg["text"], "src": seg.get("src", ""),
                                 "max_chars": target, "seconds": round(win, 1)})
        if not too_long:
            break
        _set(proj["id"], "voice", 0.6 + rnd * 0.15, f"Đang rút gọn {len(too_long)} câu đọc không kịp")
        try:
            short = translate.shorten_lines(too_long, s)
        except Exception as e:  # noqa: BLE001
            _event(proj["id"], "warn", f"Không rút gọn được câu: {e}")
            break
        changed = []
        for seg in segs:
            t = short.get(seg["id"])
            if t and len(plain(t)) < len(plain(seg["text"])):
                seg["text"] = t
                changed.append(seg)
        if not changed:
            break
        total += len(changed)
        proj = _save_segment_fields(proj["id"], changed, ("text",))
        tts.synthesize(_assign_keys(proj, s))
        if job.cancelled:
            raise media.Cancelled("Đã huỷ")
    return total


def make_voice(job: Job, proj: dict) -> dict:
    pid = proj["id"]
    d = store.pdir(pid)
    s = {**config.load_settings(), **proj["settings"]}
    if not s.get("dub"):
        (d / "dub.wav").unlink(missing_ok=True)
        return proj
    tts.synthesize(_assign_keys(proj, s), progress=_prog(pid, "voice", "Đang lồng tiếng"))
    n = _auto_shorten(job, proj, s)
    if n:
        proj = store.load(pid)
        _assign_keys(proj, s)
        _event(pid, "warn", f"Đã tự rút gọn {n} câu đọc không kịp — xem lại trong Studio")
    _set(pid, "voice", 0.95, "Đang ghép giọng đọc")
    stats = tts.build_dub_track(proj["segments"], d / "tts", d / "dub.wav", proj["duration"],
                                float(s.get("max_speed", 1.4)))
    by_id = {x["id"]: x for x in stats}
    for seg in proj["segments"]:
        st = by_id.get(seg["id"]) or {}
        seg["rate"], seg["tts_dur"] = st.get("rate"), st.get("tts_dur")
        seg["kara"] = align_words(seg.get("text", ""), st.get("words"))  # karaoke khớp giọng
    (d / "peaks_dub.json").write_text(json.dumps(media.waveform_peaks(d / "dub.wav")))
    # dọn file TTS cũ không còn dùng
    used = {f"{x.get('tts_key')}.mp3" for x in proj["segments"]}
    for f in (d / "tts").glob("*.mp3"):
        if f.name not in used and not f.name.startswith("preview-"):
            f.unlink(missing_ok=True)
            words_f = tts.words_file(f)
            words_f.unlink(missing_ok=True)
    return _save_segment_fields(pid, proj["segments"], ("tts_key", "rate", "tts_dur", "kara"))


def _hardsub_times(job: Job, proj: dict, region: dict) -> list | None:
    """Khoảng thời gian sub gốc xuất hiện (để chỉ làm mờ lúc có chữ). None = làm mờ suốt video."""
    s = proj["settings"]
    if s.get("hardsub_timing", "auto") != "auto" or s.get("hardsub") in ("none", "crop"):
        return None
    cached = proj.get("hardsub_times")
    if cached and cached.get("region") == region:
        return cached["ranges"]
    if not ocr.available():
        return None
    info = {"duration": proj["duration"], "width": proj["width"], "height": proj["height"]}
    _set(proj["id"], "render", 0.0, "Đang dò lúc nào có sub gốc")
    ranges = ocr.text_ranges(store.pdir(proj["id"]) / "source.mp4", info, region, cancel=lambda: job.cancelled)
    store.update(proj["id"], hardsub_times={"region": dict(region), "ranges": ranges})
    return ranges


def render(job: Job, proj: dict, clip: tuple[float, float] | None = None, draft: bool = False) -> dict:
    pid = proj["id"]
    d = store.pdir(pid)
    s = {**config.load_settings(), **proj["settings"], "_draft": draft}
    info = {"duration": proj["duration"], "width": proj["width"], "height": proj["height"],
            "has_audio": proj.get("has_audio", True)}
    if clip:
        ranges = media.keep_ranges(proj["duration"], {"start": clip[0], "end": clip[1]}, proj.get("cuts"))
    else:
        ranges = media.keep_ranges(proj["duration"], proj.get("trim"), proj.get("cuts"))
    W, H = media.render_size(info, s)
    ass_name = None
    if s.get("burn_subs", True):
        style = dict(proj["style"])
        # filter ass chạy trước khi đổi tốc độ nên chỉ cần đổi mốc theo các đoạn đã cắt
        ass = build_ass(proj["segments"], style, W, H, time_map=lambda t: media.remap_time(t, ranges),
                        show_source=style.get("show_source", False))
        (d / "subs.ass").write_text(ass, "utf-8")
        ass_name = "subs.ass"
    region = s.get("hardsub_region") if s.get("hardsub") != "none" else None
    region_times = None
    raw = None
    if region:
        try:
            raw = _hardsub_times(job, proj, region)
        except media.Cancelled:
            raise
        except Exception as e:  # noqa: BLE001
            _event(pid, "warn", f"Không dò được thời điểm sub gốc, sẽ làm mờ suốt video: {e}")
            raw = None
        if raw is not None:
            region_times = media.remap_ranges(raw, ranges)
    video_src = d / "source.mp4"
    if region and s.get("hardsub") == "inpaint":
        if draft or not inpaint.available():
            s["hardsub"] = "blur"  # bản nháp / thiếu OpenCV: làm mờ cho nhanh
        else:
            info_full = {**info, "fps": proj.get("fps") or media.probe(video_src)["fps"]}
            try:
                video_src = inpaint.ensure_clean(d, info_full, region, raw,
                                                 progress=_prog(pid, "render", "Đang xoá sub gốc (vẽ lại nền)"),
                                                 cancel=lambda: job.cancelled)
                region = None  # đã xoá sạch trong bản clean.mp4
            except media.Cancelled:
                raise
            except Exception as e:  # noqa: BLE001
                _event(pid, "warn", f"Vẽ lại nền lỗi, chuyển sang làm mờ: {e}")
                s["hardsub"] = "blur"
    # khoảng có giọng Việt → hạ tiếng gốc
    speech = None
    if s.get("dub") and s.get("ducking", True):
        speech = [(float(x["start"]), float(x["end"])) for x in proj["segments"]
                  if x.get("tts_key") and not x.get("mute")]
    bg = d / "instrumental.wav" if s.get("separate_music") and (d / "instrumental.wav").exists() else None
    stamp = time.strftime("%H%M%S")
    name = "draft.mp4" if draft else (f"output-clip-{stamp}.mp4" if clip else "output.mp4")
    tmp = d / ("_" + name)
    media.render_video(src=video_src, out=tmp, workdir=d, info=info, settings=s, ass_name=ass_name,
                       dub_wav=(d / "dub.wav") if s.get("dub") else None, bg_wav=bg, ranges=ranges,
                       region=region, region_times=region_times, speech=speech,
                       progress=_prog(pid, "render", "Đang xuất video"), cancel=lambda: job.cancelled)
    tmp.replace(d / name)
    if draft:  # bản nháp: chỉ để xem nhanh, không chép ra thư mục exports
        outputs = [o for o in proj.get("outputs", []) if not o.get("draft")]
        outputs.insert(0, {"file": name, "time": time.time(), "clip": False, "draft": True, "export": ""})
        proj = store.update(pid, outputs=outputs[:10], status="ready", progress=100,
                            message="Đã có bản nháp — bấm Xuất & đăng để xuất bản nét")
        _event(pid, "done", f"Bản nháp xong: {proj['title']}")
        return proj
    # bản sao dễ tìm trong thư mục exports
    nice = media.safe_name(proj.get("title", "video"))
    export = config.EXPORTS_DIR / f"{nice}-{pid}{'-clip-' + stamp if clip else ''}.mp4"
    try:
        shutil.copy2(d / name, export)
    except OSError:
        export = d / name
    speed = float(s.get("speed") or 1.0)
    srt_rows = []
    for x in proj["segments"]:
        a, b = media.remap_time(x["start"], ranges), media.remap_time(x["end"], ranges)
        if a is not None and b is not None and b > a and plain(x.get("text", "")):
            srt_rows.append((a / speed, b / speed, plain(x["text"])))
    (d / "output.srt").write_text(to_srt(srt_rows), "utf-8")
    outputs = [o for o in proj.get("outputs", []) if not o.get("draft")]
    outputs.insert(0, {"file": name, "time": time.time(), "clip": bool(clip), "export": str(export)})
    qa = quality_check(proj["segments"], float(s.get("max_speed", 1.4)))
    proj = store.update(pid, outputs=outputs[:10], status="done", stage="render", progress=100,
                        message="Hoàn tất", qa=qa, rendered_at=time.time())
    _event(pid, "done", f"Xong: {proj['title']}")
    return proj


# ---------------------------------------------------------------- kế hoạch từng loại việc

def plan(job: Job) -> list[tuple[str, callable]]:
    """Chia việc thành các bước theo làn: net → asr → net → render."""
    def step(stage, label, fn):
        def run(j: Job):
            _set(j.pid, stage, 0, label)
            fn(j, store.load(j.pid))
        return run

    def finish_ready(j: Job):
        proj = store.load(j.pid)
        qa = quality_check(proj["segments"], float(proj["settings"].get("max_speed", 1.4)))
        store.update(j.pid, status="ready", progress=82, message="Sẵn sàng chỉnh sửa", qa=qa)
        _event(j.pid, "done", f"Đã dịch xong: {proj['title']}")

    o = job.opts
    if job.kind == "full":
        steps = [("net", step("download", "Đang tải video", download)),
                 ("asr", step("audio", "Đang tách âm thanh", prepare_audio)),
                 ("asr", step("recognize", "Đang nhận dạng lời thoại", recognize)),
                 ("net", step("translate", "Đang dịch", do_translate)),
                 ("net", step("voice", "Đang lồng tiếng", make_voice))]
        steps.append(("render", step("render", "Đang xuất video", render)) if o.get("render", True)
                     else ("net", finish_ready))
        return steps
    if job.kind == "merge":
        return [("render", run_merge)]
    steps = []
    if o.get("retranslate_ids"):
        ids = set(o["retranslate_ids"])
        steps.append(("net", step("translate", "Đang dịch lại", lambda j, p: do_translate(j, p, ids))))
    if job.kind == "update" or o.get("revoice"):
        steps.append(("net", step("voice", "Đang cập nhật giọng đọc", make_voice)))
    if o.get("no_render"):
        def done_voice(j: Job):
            store.update(j.pid, status="ready", message="Đã cập nhật giọng đọc", progress=82)
            _event(j.pid, "done", "Đã cập nhật giọng đọc")
        steps.append(("net", done_voice))
        return steps
    clip = tuple(o["clip"]) if job.kind == "clip" and o.get("clip") else None
    draft = bool(o.get("draft"))
    steps.append(("render", step("render", "Đang xuất bản nháp" if draft else "Đang xuất video",
                                 lambda j, p: render(j, p, clip=clip, draft=draft))))
    return steps


def run_merge(job: Job):
    pid = job.pid
    d = store.pdir(pid)
    files = [Path(f) for f in job.opts.get("files", [])]
    out = d / "output.mp4"
    media.concat_videos(files, out, job.opts.get("ratio", "9:16"), progress=_prog(pid, "render", "Đang ghép video"),
                        encoder_pref=config.load_settings().get("encoder", "auto"))
    info = media.probe(out)
    media.thumbnail(out, d / "thumb.jpg", 1.0)
    export = config.EXPORTS_DIR / f"ghep-{pid}.mp4"
    shutil.copy2(out, export)
    store.update(pid, status="done", progress=100, message="Đã ghép xong", duration=info["duration"],
                 width=info["width"], height=info["height"], kind="merge",
                 outputs=[{"file": "output.mp4", "time": time.time(), "clip": False, "export": str(export)}])
    _event(pid, "done", "Đã ghép xong video")
