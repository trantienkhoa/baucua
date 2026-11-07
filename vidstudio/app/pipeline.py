"""Hàng đợi xử lý: tải → nhận dạng → dịch → lồng tiếng → dựng video."""
from __future__ import annotations

import json
import queue
import shutil
import threading
import time
import traceback
from pathlib import Path

from . import asr, config, media, ocr, store, translate, tts
from .subtitles import build_ass, parse_srt, plain, quality_check

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


_q: "queue.Queue[Job]" = queue.Queue()
_pending: list[Job] = []
_current: Job | None = None
_plock = threading.Lock()
_events: list[dict] = []  # thông báo hoàn thành cho giao diện


def enqueue(pid: str, kind: str = "full", opts: dict | None = None) -> None:
    job = Job(pid, kind, opts)
    with _plock:
        _pending.append(job)
    status = "queued"
    store.update(pid, status=status, message="Đang chờ trong hàng đợi", error="")
    _q.put(job)


def cancel(pid: str) -> bool:
    found = False
    with _plock:
        for j in _pending:
            if j.pid == pid:
                j.cancelled = True
                found = True
        if _current and _current.pid == pid:
            _current.cancelled = True
            found = True
    return found


def queue_state() -> dict:
    with _plock:
        return {"current": _current.pid if _current else None,
                "pending": [j.pid for j in _pending if not j.cancelled]}


def pop_events(since: float) -> list[dict]:
    return [e for e in _events if e["t"] > since]


def _event(pid: str, kind: str, msg: str):
    _events.append({"t": time.time(), "pid": pid, "kind": kind, "msg": msg})
    del _events[:-50]


def _set(pid: str, stage: str, frac: float, msg: str):
    lo, hi = WEIGHTS.get(stage, (0, 100))
    store.update(pid, stage=stage, progress=round(lo + (hi - lo) * max(0, min(1, frac)), 1), message=msg)


def _prog(pid: str, stage: str, msg: str):
    last = [0.0]

    def cb(f: float):
        now = time.time()
        if now - last[0] > 0.7 or f >= 1:
            last[0] = now
            _set(pid, stage, f, f"{msg} {int(f * 100)}%")
    return cb


def worker():
    global _current
    while True:
        job = _q.get()
        with _plock:
            if job in _pending:
                _pending.remove(job)
            if job.cancelled:
                try:
                    store.update(job.pid, status="cancelled", message="Đã huỷ")
                except KeyError:
                    pass
                continue
            _current = job
        try:
            store.update(job.pid, status="processing", error="")
            if job.kind == "full":
                run_full(job)
            elif job.kind in ("update", "render", "clip"):
                run_update(job)
            elif job.kind == "merge":
                run_merge(job)
        except (media.Cancelled,) as e:
            store.update(job.pid, status="cancelled", message=str(e))
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            msg = str(e) if job.cancelled is False else "Đã huỷ"
            try:
                store.update(job.pid, status="cancelled" if job.cancelled else "error",
                             error=msg, message="Lỗi: " + msg.splitlines()[0][:160] if msg else "Lỗi")
                _event(job.pid, "error", msg[:200])
            except KeyError:
                pass
        finally:
            with _plock:
                _current = None


def start_worker():
    threading.Thread(target=worker, daemon=True, name="pipeline").start()
    # dự án đang dở dang khi tắt app → đánh dấu để người dùng chạy lại
    for p in store.list_projects():
        if p["status"] in ("queued", "processing"):
            store.update(p["id"], status="error", message="Bị gián đoạn — bấm Chạy lại", error="interrupted")


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
                              cancel=lambda: job.cancelled)
    if not segs:
        raise RuntimeError("Không nhận dạng được câu nào")
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
    return store.update(pid, segments=out, next_id=nid)


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
    upd = {"segments": segs}
    if proj.get("title_src") and (not proj.get("title") or proj["title"] == proj.get("title_src")):
        try:
            upd["title"] = translate.translate_texts([proj["title_src"]], s, s.get("source_lang", "zh"),
                                                     s.get("target_lang", "vi"))[0]
        except Exception:  # noqa: BLE001
            pass
    return store.update(pid, **upd)


def voice_for(seg: dict, s: dict) -> str:
    if seg.get("voice"):
        return seg["voice"]
    if s.get("voice_default") == "auto":
        return s["voice_male"] if seg.get("speaker") == "male" else s["voice_female"]
    return s.get("voice_default") or s["voice_female"]


def make_voice(job: Job, proj: dict) -> dict:
    pid = proj["id"]
    d = store.pdir(pid)
    s = proj["settings"]
    if not s.get("dub"):
        (d / "dub.wav").unlink(missing_ok=True)
        return proj
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
    tts.synthesize(jobs, progress=_prog(pid, "voice", "Đang lồng tiếng"))
    _set(pid, "voice", 0.95, "Đang ghép giọng đọc")
    stats = tts.build_dub_track(proj["segments"], d / "tts", d / "dub.wav", proj["duration"],
                                float(s.get("max_speed", 1.4)))
    by_id = {x["id"]: x for x in stats}
    for seg in proj["segments"]:
        st = by_id.get(seg["id"]) or {}
        seg["rate"], seg["tts_dur"] = st.get("rate"), st.get("tts_dur")
    (d / "peaks_dub.json").write_text(json.dumps(media.waveform_peaks(d / "dub.wav")))
    # dọn file TTS cũ không còn dùng
    used = {f"{x.get('tts_key')}.mp3" for x in proj["segments"]}
    for f in (d / "tts").glob("*.mp3"):
        if f.name not in used:
            f.unlink(missing_ok=True)
    return store.update(pid, segments=proj["segments"])


def render(job: Job, proj: dict, clip: tuple[float, float] | None = None) -> dict:
    pid = proj["id"]
    d = store.pdir(pid)
    s = {**config.load_settings(), **proj["settings"]}
    info = {"duration": proj["duration"], "width": proj["width"], "height": proj["height"],
            "has_audio": proj.get("has_audio", True)}
    if clip:
        ranges = media.keep_ranges(proj["duration"], {"start": clip[0], "end": clip[1]}, proj.get("cuts"))
    else:
        ranges = media.keep_ranges(proj["duration"], proj.get("trim"), proj.get("cuts"))
    W, H = media.output_size(info["width"], info["height"], s.get("output_ratio", "source"))
    speed = float(s.get("speed") or 1.0)
    ass_name = None
    if s.get("burn_subs", True):
        style = dict(proj["style"])
        # filter ass chạy trước khi đổi tốc độ nên chỉ cần đổi mốc theo các đoạn đã cắt
        ass = build_ass(proj["segments"], style, W, H, time_map=lambda t: media.remap_time(t, ranges),
                        show_source=style.get("show_source", False))
        (d / "subs.ass").write_text(ass, "utf-8")
        ass_name = "subs.ass"
    region = s.get("hardsub_region") if s.get("hardsub") != "none" else None
    bg = d / "instrumental.wav" if s.get("separate_music") and (d / "instrumental.wav").exists() else None
    stamp = time.strftime("%H%M%S")
    name = f"output-clip-{stamp}.mp4" if clip else "output.mp4"
    tmp = d / ("_" + name)
    media.render_video(src=d / "source.mp4", out=tmp, workdir=d, info=info, settings=s, ass_name=ass_name,
                       dub_wav=(d / "dub.wav") if s.get("dub") else None, bg_wav=bg, ranges=ranges,
                       region=region, progress=_prog(pid, "render", "Đang xuất video"),
                       cancel=lambda: job.cancelled)
    tmp.replace(d / name)
    # bản sao dễ tìm trong thư mục exports
    nice = media.safe_name(proj.get("title", "video"))
    export = config.EXPORTS_DIR / f"{nice}-{pid}{'-clip-' + stamp if clip else ''}.mp4"
    try:
        shutil.copy2(d / name, export)
    except OSError:
        export = d / name
    # phụ đề SRT đi kèm
    srt_rows = []
    for x in proj["segments"]:
        a, b = media.remap_time(x["start"], ranges), media.remap_time(x["end"], ranges)
        if a is not None and b is not None and b > a and plain(x.get("text", "")):
            srt_rows.append((a / speed, b / speed, plain(x["text"])))
    from .subtitles import to_srt
    (d / "output.srt").write_text(to_srt(srt_rows), "utf-8")
    outputs = proj.get("outputs", [])
    outputs.insert(0, {"file": name, "time": time.time(), "clip": bool(clip), "export": str(export)})
    qa = quality_check(proj["segments"], float(s.get("max_speed", 1.4)))
    proj = store.update(pid, outputs=outputs[:10], status="done", stage="render", progress=100,
                        message="Hoàn tất", qa=qa, rendered_at=time.time())
    _event(pid, "done", f"Xong: {proj['title']}")
    return proj


# ---------------------------------------------------------------- luồng chính

def run_full(job: Job):
    pid = job.pid
    proj = store.load(pid)
    _set(pid, "download", 0, "Đang tải video")
    proj = download(job, proj)
    _set(pid, "audio", 0, "Đang tách âm thanh")
    proj = prepare_audio(job, proj)
    _set(pid, "recognize", 0, "Đang nhận dạng lời thoại")
    proj = recognize(job, proj)
    _set(pid, "translate", 0, "Đang dịch")
    proj = do_translate(job, proj)
    _set(pid, "voice", 0, "Đang lồng tiếng")
    proj = make_voice(job, proj)
    qa = quality_check(proj["segments"], float(proj["settings"].get("max_speed", 1.4)))
    proj = store.update(pid, qa=qa)
    if job.opts.get("render", True):
        _set(pid, "render", 0, "Đang xuất video")
        render(job, proj)
    else:
        store.update(pid, status="ready", progress=82, message="Sẵn sàng chỉnh sửa")
        _event(pid, "done", f"Đã dịch xong: {proj['title']}")


def run_update(job: Job):
    pid = job.pid
    proj = store.load(pid)
    if job.opts.get("retranslate_ids"):
        proj = do_translate(job, proj, set(job.opts["retranslate_ids"]))
    if job.kind in ("update",) or job.opts.get("revoice"):
        _set(pid, "voice", 0, "Đang cập nhật giọng đọc")
        proj = make_voice(job, proj)
    if job.opts.get("no_render"):
        store.update(pid, status="ready", message="Đã cập nhật giọng đọc", progress=82)
        return
    clip = tuple(job.opts["clip"]) if job.kind == "clip" and job.opts.get("clip") else None
    _set(pid, "render", 0, "Đang xuất video")
    render(job, proj, clip=clip)  # type: ignore[arg-type]


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
