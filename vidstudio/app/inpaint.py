"""Xoá sub gốc bằng cách vẽ lại nền (inpainting) thay vì làm mờ.

- Có `simple-lama-inpainting` (cần PyTorch, nên có GPU): dùng model LaMa — sạch nhất.
- Không có: dùng OpenCV (thuật toán Telea) — nhanh, chạy được trên mọi máy, hợp với chữ mảnh.

Chỉ xử lý vùng sub và chỉ những khung hình có chữ, phần còn lại giữ nguyên.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Callable, Optional

import numpy as np

from . import media

_lama = None


def available() -> bool:
    try:
        import cv2  # noqa: F401
        return True
    except ImportError:
        return False


def engine() -> str:
    try:
        import simple_lama_inpainting  # noqa: F401
        return "lama"
    except ImportError:
        return "opencv" if available() else ""


def text_mask(crop: np.ndarray):
    """Mặt nạ nét chữ: điểm sáng/tối nổi bật so với nền xung quanh (chữ + viền)."""
    import cv2
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
    top = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, k)
    black = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, k)
    mask = ((top > 45) | (black > 60)).astype(np.uint8) * 255
    # bỏ chấm lẻ, nới rộng để phủ cả viền chữ
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    return cv2.dilate(mask, np.ones((7, 7), np.uint8), iterations=1)


def _fill(crop: np.ndarray, mask: np.ndarray, eng: str) -> np.ndarray:
    import cv2
    if not mask.any():
        return crop
    if eng == "lama":
        global _lama
        from PIL import Image
        if _lama is None:
            from simple_lama_inpainting import SimpleLama
            _lama = SimpleLama()
        out = np.asarray(_lama(Image.fromarray(crop), Image.fromarray(mask)).convert("RGB"))
        return out[: crop.shape[0], : crop.shape[1]]
    return cv2.inpaint(crop, mask, 3, cv2.INPAINT_TELEA)


def clean_video(src: Path, out: Path, info: dict, region: dict, times: list | None,
                progress: Optional[Callable[[float], None]] = None, cancel=None) -> str:
    """Tạo bản video đã xoá sub (giữ nguyên tiếng). Trả về tên engine đã dùng."""
    eng = engine()
    if not eng:
        raise RuntimeError("Chưa cài OpenCV: pip install opencv-python-headless")
    W, H, fps = info["width"], info["height"], info.get("fps") or 30.0
    x0, y0 = int(region["x"] * W), int(region["y"] * H)
    x1, y1 = min(W, x0 + int(region["w"] * W)), min(H, y0 + int(region["h"] * H))
    frame_bytes = W * H * 3
    dec = subprocess.Popen([media.FFMPEG, "-v", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-vsync", "passthrough", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen([media.FFMPEG, "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", f"{fps:.5f}", "-i", "-", "-i", str(src),
                            "-map", "0:v", "-map", "1:a?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
                            "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", str(out)], stdin=subprocess.PIPE)
    total = max(1, int(info.get("duration", 0) * fps))
    i = 0
    try:
        while True:
            buf = dec.stdout.read(frame_bytes)  # type: ignore[union-attr]
            if len(buf) < frame_bytes:
                break
            t = i / fps
            if times is None or any(a <= t <= b for a, b in times):
                frame = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
                crop = frame[y0:y1, x0:x1]
                frame[y0:y1, x0:x1] = _fill(np.ascontiguousarray(crop), text_mask(crop), eng)
                buf = frame.tobytes()
            enc.stdin.write(buf)  # type: ignore[union-attr]
            i += 1
            if cancel and cancel():
                raise media.Cancelled("Đã huỷ")
            if progress and i % 15 == 0:
                progress(min(1.0, i / total))
    finally:
        dec.kill()
        try:
            enc.stdin.close()  # type: ignore[union-attr]
        except OSError:
            pass
        enc.wait()
    if enc.returncode != 0 or not out.exists():
        raise media.MediaError("Không ghi được video đã xoá sub")
    return eng


def ensure_clean(workdir: Path, info: dict, region: dict, times: list | None, progress=None, cancel=None) -> Path:
    """Dùng lại bản đã xoá sub nếu vùng/thời điểm không đổi."""
    out = workdir / "clean.mp4"
    meta_f = workdir / "clean.json"
    key = {"region": region, "times": times, "engine": engine()}
    if out.exists() and meta_f.exists():
        try:
            if json.loads(meta_f.read_text()) == key:
                return out
        except ValueError:
            pass
    tmp = workdir / "_clean.mp4"
    clean_video(workdir / "source.mp4", tmp, info, region, times, progress, cancel)
    tmp.replace(out)
    meta_f.write_text(json.dumps(key))
    return out
