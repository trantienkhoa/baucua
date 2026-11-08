"""Tiện ích FFmpeg: đọc thông tin, tách âm, sóng âm, dựng video."""
from __future__ import annotations

import functools
import json
import re
import shutil
import subprocess
import wave
from pathlib import Path
from typing import Callable, Optional

import numpy as np

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"

ProgressCb = Optional[Callable[[float], None]]


class MediaError(RuntimeError):
    pass


class Cancelled(RuntimeError):
    pass


def run_ffmpeg(args: list[str], duration: float = 0.0, progress: ProgressCb = None,
               cwd: Path | None = None, cancel: Callable[[], bool] | None = None) -> None:
    cmd = [FFMPEG, "-hide_banner", "-nostdin", "-y", "-progress", "pipe:1", "-nostats", *args]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            cwd=str(cwd) if cwd else None, encoding="utf-8", errors="replace")
    err_tail: list[str] = []

    import threading

    def _drain():
        for line in proc.stderr:  # type: ignore[union-attr]
            err_tail.append(line)
            if len(err_tail) > 40:
                err_tail.pop(0)

    t = threading.Thread(target=_drain, daemon=True)
    t.start()
    for line in proc.stdout:  # type: ignore[union-attr]
        if cancel and cancel():
            proc.kill()
            raise Cancelled("Đã huỷ")
        if progress and duration > 0 and line.startswith("out_time_ms="):
            try:
                us = int(line.split("=", 1)[1])
                progress(min(1.0, us / 1e6 / duration))
            except ValueError:
                pass
    proc.wait()
    t.join(timeout=2)
    if proc.returncode != 0:
        raise MediaError("FFmpeg lỗi:\n" + "".join(err_tail[-15:]))


def probe(path: Path) -> dict:
    out = subprocess.run([FFPROBE, "-v", "error", "-print_format", "json", "-show_format",
                          "-show_streams", str(path)], capture_output=True, text=True)
    if out.returncode != 0:
        raise MediaError(f"Không đọc được file: {path.name}")
    data = json.loads(out.stdout or "{}")
    info = {"duration": float(data.get("format", {}).get("duration") or 0), "width": 0,
            "height": 0, "fps": 30.0, "has_audio": False, "has_video": False}
    for s in data.get("streams", []):
        if s.get("codec_type") == "video" and not info["has_video"]:
            info["has_video"] = True
            w, h = int(s.get("width") or 0), int(s.get("height") or 0)
            rot = 0
            for sd in s.get("side_data_list", []) or []:
                if "rotation" in sd:
                    rot = abs(int(sd["rotation"]))
            if str((s.get("tags") or {}).get("rotate", "0")) in ("90", "270"):
                rot = 90
            if rot in (90, 270):
                w, h = h, w
            info["width"], info["height"] = w, h
            try:
                num, den = (s.get("avg_frame_rate") or "30/1").split("/")
                info["fps"] = float(num) / float(den) if float(den) else 30.0
            except (ValueError, ZeroDivisionError):
                pass
        elif s.get("codec_type") == "audio":
            info["has_audio"] = True
    return info


def extract_audio(src: Path, dst: Path, sr: int = 16000, mono: bool = True) -> None:
    args = ["-i", str(src), "-vn", "-ac", "1" if mono else "2", "-ar", str(sr),
            "-c:a", "pcm_s16le", str(dst)]
    run_ffmpeg(args)


def decode_pcm(src: Path, sr: int = 44100, filters: str | None = None) -> np.ndarray:
    """Giải mã file âm thanh thành mảng float32 mono."""
    cmd = [FFMPEG, "-hide_banner", "-nostdin", "-v", "error", "-i", str(src)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    out = subprocess.run(cmd, capture_output=True)
    if out.returncode != 0:
        raise MediaError(out.stderr.decode("utf-8", "replace")[-500:])
    return np.frombuffer(out.stdout, dtype=np.float32).copy()


def write_wav(path: Path, samples: np.ndarray, sr: int = 44100) -> None:
    data = np.clip(samples, -1.0, 1.0)
    data = (data * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())


def waveform_peaks(src: Path, per_second: int = 40) -> list[int]:
    sr = 8000
    try:
        pcm = decode_pcm(src, sr=sr)
    except MediaError:
        return []
    if pcm.size == 0:
        return []
    hop = max(1, sr // per_second)
    n = pcm.size // hop
    if n == 0:
        return []
    frames = np.abs(pcm[: n * hop]).reshape(n, hop).max(axis=1)
    top = float(np.percentile(frames, 99.5)) or 1.0
    return [int(v) for v in np.clip(frames / top * 100, 0, 100)]


ENV_SR = 8000


def duck_envelope(speech: list, duration: float, low: float, high: float, ramp: float = 0.15) -> np.ndarray:
    """Đường bao âm lượng mượt: `low` trong lúc có giọng lồng, `high` lúc im lặng."""
    n = int((duration + 1) * ENV_SR)
    mask = np.zeros(n, dtype=np.float32)
    for a, b in merge_ranges(speech, pad=0.08, gap=0.6):
        mask[int(a * ENV_SR):int(b * ENV_SR)] = 1.0
    k = max(1, int(ramp * ENV_SR))
    mask = np.convolve(mask, np.ones(k, dtype=np.float32) / k, mode="same")
    return (high + (low - high) * mask).astype(np.float32)


def merge_ranges(ranges, pad: float = 0.25, gap: float = 0.4) -> list[list[float]]:
    """Nới mỗi khoảng `pad` giây và gộp các khoảng cách nhau dưới `gap` giây."""
    out: list[list[float]] = []
    for a, b in sorted((max(0.0, float(a) - pad), float(b) + pad) for a, b in ranges):
        if out and a - out[-1][1] < gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([round(a, 2), round(b, 2)])
    return out


def remap_ranges(raw, keep: list[tuple[float, float]]) -> list[list[float]]:
    """Đổi khoảng thời gian trên video gốc sang thời gian sau khi cắt đoạn."""
    out = []
    for a, b in raw:
        for s, e in keep:
            lo, hi = max(a, s), min(b, e)
            if hi > lo:
                ra, rb = remap_time(lo, keep), remap_time(hi, keep)
                if ra is not None and rb is not None:
                    out.append((ra, rb))
    return merge_ranges(out, pad=0.0, gap=0.05)


def atempo_chain(speed: float) -> str:
    parts = []
    s = speed
    while s > 2.0:
        parts.append("atempo=2.0")
        s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5")
        s /= 0.5
    parts.append(f"atempo={s:.4f}")
    return ",".join(parts)


def thumbnail(src: Path, dst: Path, t: float = 1.0, width: int = 480) -> None:
    run_ffmpeg(["-ss", f"{max(0, t):.2f}", "-i", str(src), "-frames:v", "1",
                "-vf", f"scale={width}:-2", "-q:v", "3", str(dst)])


@functools.lru_cache(maxsize=1)
def nvenc_available() -> bool:
    try:
        r = subprocess.run([FFMPEG, "-hide_banner", "-v", "error", "-f", "lavfi", "-i",
                            "color=black:s=256x256:d=0.2", "-c:v", "h264_nvenc", "-f", "null", "-"],
                           capture_output=True, timeout=20)
        return r.returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def pick_encoder(pref: str) -> str:
    if pref == "libx264":
        return "libx264"
    if pref == "h264_nvenc":
        return "h264_nvenc" if nvenc_available() else "libx264"
    return "h264_nvenc" if nvenc_available() else "libx264"


def encoder_args(encoder: str, crf: int, draft: bool = False) -> list[str]:
    if encoder == "h264_nvenc":
        return ["-c:v", "h264_nvenc", "-preset", "p1" if draft else "p5", "-rc", "vbr", "-cq", str(crf), "-b:v", "0",
                "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "ultrafast" if draft else "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p"]


def render_size(info: dict, settings: dict) -> tuple[int, int]:
    """Cỡ khung thành phẩm; bản nháp lấy cạnh ngắn 540px cho nhanh."""
    W, H = output_size(info["width"], info["height"], settings.get("output_ratio", "source"))
    if settings.get("_draft"):
        k = 540 / max(1, min(W, H))
        if k < 1:
            W, H = int(W * k) // 2 * 2, int(H * k) // 2 * 2
    return W, H


RATIOS = {"9:16": (1080, 1920), "1:1": (1080, 1080), "16:9": (1920, 1080), "4:5": (1080, 1350)}


def output_size(src_w: int, src_h: int, ratio: str) -> tuple[int, int]:
    if ratio in RATIOS:
        return RATIOS[ratio]
    w, h = src_w or 1080, src_h or 1920
    return w - w % 2, h - h % 2


def keep_ranges(duration: float, trim: dict | None, cuts: list | None) -> list[tuple[float, float]]:
    start = max(0.0, float((trim or {}).get("start") or 0))
    end = float((trim or {}).get("end") or 0) or duration
    end = min(end, duration) if duration else end
    ranges = [(start, end)]
    for c in sorted(cuts or [], key=lambda c: c["start"]):
        a, b = float(c["start"]), float(c["end"])
        nxt = []
        for s, e in ranges:
            if b <= s or a >= e:
                nxt.append((s, e))
                continue
            if a > s:
                nxt.append((s, a))
            if b < e:
                nxt.append((b, e))
        ranges = nxt
    return [(s, e) for s, e in ranges if e - s > 0.05]


def remap_time(t: float, ranges: list[tuple[float, float]]) -> float | None:
    """Đổi thời điểm trên video gốc sang thời điểm trên video đã cắt."""
    acc = 0.0
    for s, e in ranges:
        if t < s:
            return acc
        if t <= e:
            return acc + (t - s)
        acc += e - s
    return None


def render_video(*, src: Path, out: Path, workdir: Path, info: dict, settings: dict,
                 ass_name: str | None, dub_wav: Path | None, bg_wav: Path | None,
                 ranges: list[tuple[float, float]], region: dict | None,
                 region_times: list | None = None, speech: list | None = None,
                 progress: ProgressCb = None, cancel=None) -> None:
    """Dựng thành phẩm: cắt đoạn, xoá sub gốc, đổi khung, chèn phụ đề, trộn tiếng."""
    W, H = render_size(info, settings)
    speed = float(settings.get("speed") or 1.0)
    inputs = ["-i", str(src)]
    idx_dub = idx_bg = None
    if dub_wav and dub_wav.exists():
        inputs += ["-i", str(dub_wav)]
        idx_dub = 1
    if bg_wav and bg_wav.exists():
        inputs += ["-i", str(bg_wav)]
        idx_bg = len(inputs) // 2 - 1
    idx_env = None
    orig_vol = float(settings.get("orig_volume", 0.12)) if idx_dub is not None else 1.0
    gap_vol = float(settings.get("gap_volume", 0.8))
    if idx_dub is not None and speech is not None and info.get("has_audio") and idx_bg is None:
        # đường bao âm lượng: tiếng gốc nhỏ khi có giọng Việt, to lại lúc im lặng
        write_wav(workdir / "duck.wav", duck_envelope(speech, info["duration"], orig_vol, gap_vol), ENV_SR)
        inputs += ["-i", "duck.wav"]
        idx_env = len(inputs) // 2 - 1

    f: list[str] = []
    # --- âm thanh ---
    a_parts = []
    if idx_bg is not None:
        f.append(f"[{idx_bg}:a]aresample=44100,volume=0.9[bg]")
        a_parts.append("[bg]")
    elif idx_env is not None:
        f.append(f"[0:a]aresample=44100,aformat=channel_layouts=stereo[o0];"
                 f"[{idx_env}:a]aresample=44100,pan=stereo|c0=c0|c1=c0[env];[o0][env]amultiply[orig]")
        a_parts.append("[orig]")
    elif info.get("has_audio") and orig_vol > 0:
        f.append(f"[0:a]aresample=44100,volume={orig_vol:.3f}[orig]")
        a_parts.append("[orig]")
    if idx_dub is not None:
        f.append(f"[{idx_dub}:a]aresample=44100,volume={float(settings.get('voice_volume', 1.0)):.3f}[dub]")
        a_parts.append("[dub]")
    if not a_parts:
        f.append(f"anullsrc=r=44100:cl=stereo,atrim=0:{info['duration']:.3f}[sil]")
        a_parts.append("[sil]")
    if len(a_parts) > 1:
        f.append(f"{''.join(a_parts)}amix=inputs={len(a_parts)}:duration=longest:normalize=0[amixed]")
        a_src = "[amixed]"
    else:
        a_src = a_parts[0]

    # --- cắt đoạn ---
    n = len(ranges)
    if n == 0:
        raise MediaError("Không còn đoạn nào để xuất (đã cắt hết?)")
    f.append(f"[0:v]split={n}" + "".join(f"[vs{i}]" for i in range(n)) if n > 1 else "[0:v]null[vs0]")
    f.append(f"{a_src}asplit={n}" + "".join(f"[as{i}]" for i in range(n)) if n > 1 else f"{a_src}anull[as0]")
    for i, (s, e) in enumerate(ranges):
        f.append(f"[vs{i}]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[vt{i}]")
        f.append(f"[as{i}]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS[at{i}]")
    f.append("".join(f"[vt{i}][at{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[vc][ac]")

    v = "[vc]"
    # --- xoá sub gốc ---
    mode = settings.get("hardsub", "none")
    enable = ""
    if region_times is not None and mode in ("blur", "box"):
        if not region_times:
            region = None  # không lúc nào có sub gốc → khỏi làm mờ
        else:
            expr = "+".join(f"between(t,{a:.2f},{b:.2f})" for a, b in region_times)
            enable = f":enable='{expr}'"
    if region and mode in ("blur", "box", "crop"):
        sw, sh = info["width"], info["height"]
        rx, ry = int(region["x"] * sw) // 2 * 2, int(region["y"] * sh) // 2 * 2
        rw, rh = max(2, int(region["w"] * sw) // 2 * 2), max(2, int(region["h"] * sh) // 2 * 2)
        rw, rh = min(rw, sw - rx), min(rh, sh - ry)
        if mode == "blur":
            f.append(f"{v}split[hb0][hb1];[hb1]crop={rw}:{rh}:{rx}:{ry},boxblur=luma_radius=min(h\\,w)/4:luma_power=3[hbb];"
                     f"[hb0][hbb]overlay={rx}:{ry}{enable}[vh]")
        elif mode == "box":
            f.append(f"{v}drawbox=x={rx}:y={ry}:w={rw}:h={rh}:color=black@0.85:t=fill{enable}[vh]")
        else:
            f.append(f"{v}crop={sw}:{max(2, ry // 2 * 2)}:0:0[vh]")
        v = "[vh]"
    if settings.get("flip"):  # lật sau khi xoá sub để toạ độ vùng sub vẫn đúng
        f.append(f"{v}hflip[vf]")
        v = "[vf]"
    # --- khung hình ---
    if settings.get("output_ratio", "source") in RATIOS or mode == "crop":
        f.append(f"{v}split[fg0][bg0];[bg0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                 f"boxblur=20:2,eq=brightness=-0.08[bgb];[fg0]scale={W}:{H}:force_original_aspect_ratio=decrease[fgs];"
                 f"[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1[vr]")
    else:
        f.append(f"{v}scale={W}:{H},setsar=1[vr]")
    v = "[vr]"
    if ass_name:
        f.append(f"{v}ass={ass_name}:fontsdir=.[vs]")
        v = "[vs]"
    a = "[ac]"
    if abs(speed - 1.0) > 0.01:
        f.append(f"{v}setpts=PTS/{speed:.4f}[vsp]")
        f.append(f"{a}{atempo_chain(speed)}[asp]")
        v, a = "[vsp]", "[asp]"
    if settings.get("loudnorm", True):  # chuẩn âm lượng mạng xã hội (~ -14 LUFS)
        f.append(f"{a}loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[aln]")
        a = "[aln]"
    f.append(f"{a}alimiter=limit=0.95[aout]")

    total = sum(e - s for s, e in ranges) / speed
    encoder = pick_encoder(settings.get("encoder", "auto"))
    graph = ";".join(f)
    (workdir / "filter.txt").write_text(graph, "utf-8")
    draft = bool(settings.get("_draft"))
    crf = 30 if draft else int(settings.get("crf", 21))

    def build(enc: str) -> list[str]:
        # có GPU NVIDIA: giải mã luôn bằng GPU (nhanh hơn, CPU rảnh cho bộ lọc)
        hw = ["-hwaccel", "cuda"] if enc == "h264_nvenc" and settings.get("hwdecode", True) else []
        return [*hw, *inputs, "-filter_complex_script", "filter.txt", "-map", v, "-map", "[aout]",
                *encoder_args(enc, crf, draft),
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-movflags", "+faststart", str(out)]

    try:
        run_ffmpeg(build(encoder), duration=total, progress=progress, cwd=workdir, cancel=cancel)
    except MediaError:
        if encoder != "h264_nvenc":
            raise
        # GPU lỗi giữa chừng → thử lại bằng CPU
        run_ffmpeg(build("libx264"), duration=total, progress=progress, cwd=workdir, cancel=cancel)


def concat_videos(files: list[Path], out: Path, ratio: str = "9:16", progress: ProgressCb = None,
                  encoder_pref: str = "auto") -> None:
    if not files:
        raise MediaError("Chưa chọn video nào")
    infos = [probe(p) for p in files]
    W, H = output_size(infos[0]["width"], infos[0]["height"], ratio)
    inputs: list[str] = []
    f: list[str] = []
    for i, (p, inf) in enumerate(zip(files, infos)):
        inputs += ["-i", str(p)]
        f.append(f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,"
                 f"setsar=1,fps=30,format=yuv420p[v{i}]")
        if inf["has_audio"]:
            f.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo[a{i}]")
        else:
            f.append(f"anullsrc=r=44100:cl=stereo,atrim=0:{inf['duration']:.3f}[a{i}]")
    f.append("".join(f"[v{i}][a{i}]" for i in range(len(files))) + f"concat=n={len(files)}:v=1:a=1[v][a]")
    enc = pick_encoder(encoder_pref)
    run_ffmpeg([*inputs, "-filter_complex", ";".join(f), "-map", "[v]", "-map", "[a]",
                *encoder_args(enc, 21), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)],
               duration=sum(i["duration"] for i in infos), progress=progress)


def safe_name(text: str, limit: int = 60) -> str:
    text = re.sub(r"[\\/:*?\"<>|\n\r\t]+", " ", text or "").strip()
    return (text[:limit].strip() or "video")
