"""Đọc phụ đề cứng (hardsub) bằng OCR: dò vùng sub và lấy chữ làm câu gốc."""
from __future__ import annotations

import subprocess
from difflib import SequenceMatcher
from pathlib import Path
from typing import Callable, Optional

import numpy as np

from . import media
from .subtitles import CJK

_engine = None


def available() -> bool:
    try:
        import rapidocr_onnxruntime  # noqa: F401
        return True
    except ImportError:
        return False


def _get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def _frames(src: Path, fps: float, width: int, info: dict, start_y: float = 0.0):
    h = int(info["height"] * width / max(1, info["width"])) // 2 * 2
    crop_y = int(h * start_y) // 2 * 2
    vf = f"fps={fps},scale={width}:{h},crop={width}:{h - crop_y}:0:{crop_y}"
    cmd = [media.FFMPEG, "-v", "error", "-i", str(src), "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    fh = h - crop_y
    size = width * fh * 3
    i = 0
    try:
        while True:
            buf = proc.stdout.read(size)  # type: ignore[union-attr]
            if len(buf) < size:
                break
            yield i / fps, np.frombuffer(buf, np.uint8).reshape(fh, width, 3), h, crop_y
            i += 1
    finally:
        proc.kill()


def _boxes(img) -> list[tuple[list, str, float]]:
    res, _ = _get_engine()(img)
    return res or []


def detect_region(src: Path, info: dict, samples: int = 24) -> dict | None:
    """Tìm vùng chữ xuất hiện lặp lại ở nửa dưới video → vùng sub gốc."""
    if not available() or not info.get("duration"):
        return None
    fps = max(0.2, samples / info["duration"])
    width = 640
    boxes = []
    full_h = 0
    for t, img, full_h, crop_y in _frames(src, fps, width, info, start_y=0.45):
        for box, text, score in _boxes(img):
            if score < 0.6 or len(text.strip()) < 2:
                continue
            xs = [p[0] for p in box]
            ys = [p[1] + crop_y for p in box]
            boxes.append((min(xs), min(ys), max(xs), max(ys)))
    if len(boxes) < 3 or not full_h:
        return None
    # chọn dải dọc có nhiều hộp chữ nhất
    centers = np.array([(b[1] + b[3]) / 2 for b in boxes])
    hist, edges = np.histogram(centers, bins=20, range=(0, full_h))
    k = int(np.argmax(hist))
    lo, hi = edges[max(0, k - 1)], edges[min(len(edges) - 1, k + 2)]
    sel = [b for b, c in zip(boxes, centers) if lo <= c <= hi]
    x0 = min(b[0] for b in sel)
    x1 = max(b[2] for b in sel)
    y0 = np.percentile([b[1] for b in sel], 10)
    y1 = np.percentile([b[3] for b in sel], 90)
    pad_y = (y1 - y0) * 0.35 + 4
    pad_x = 12
    return {
        "x": max(0.0, (x0 - pad_x) / width),
        "y": max(0.0, (y0 - pad_y) / full_h),
        "w": min(1.0, (x1 - x0 + 2 * pad_x) / width),
        "h": min(0.4, (y1 - y0 + 2 * pad_y) / full_h),
    }


def read_subtitles(src: Path, info: dict, region: dict, fps: float = 3.0,
                   progress: Optional[Callable[[float], None]] = None, cancel=None) -> list[dict]:
    """Đọc chữ trong vùng sub theo thời gian, gộp khung trùng nhau thành câu."""
    if not available():
        raise RuntimeError("Chưa cài OCR: pip install rapidocr-onnxruntime")
    width = 960
    out: list[dict] = []
    cur = None
    dur = info.get("duration") or 1
    for t, img, full_h, crop_y in _frames(src, fps, width, info):
        if cancel and cancel():
            raise RuntimeError("Đã huỷ")
        y0 = int(region["y"] * full_h)
        y1 = int((region["y"] + region["h"]) * full_h)
        x0 = int(region["x"] * width)
        x1 = int((region["x"] + region["w"]) * width)
        crop = img[y0:y1, x0:x1]
        text = ""
        if crop.size:
            parts = sorted(_boxes(np.ascontiguousarray(crop)), key=lambda r: (r[0][0][1] // 20, r[0][0][0]))
            text = "".join(p[1] for p in parts if p[2] > 0.6).strip()
        if text and not CJK.search(text) and len(text) < 3:
            text = ""
        if cur and text and SequenceMatcher(None, cur["src"], text).ratio() > 0.7:
            cur["end"] = t + 1 / fps
            if len(text) > len(cur["src"]):
                cur["src"] = text
        else:
            if cur:
                out.append(cur)
            cur = {"start": t, "end": t + 1 / fps, "src": text} if text else None
        if progress:
            progress(min(1.0, t / dur))
    if cur:
        out.append(cur)
    return [s for s in out if s["end"] - s["start"] >= 0.3]
