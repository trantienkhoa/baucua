"""Kiểm tra máy: FFmpeg, GPU, các thành phần tuỳ chọn."""
from __future__ import annotations

import importlib.util
import shutil
import subprocess

from . import asr, media, ocr, tts


def _has(mod: str) -> bool:
    return importlib.util.find_spec(mod) is not None


def check() -> list[dict]:
    ff = shutil.which("ffmpeg") is not None
    libass = False
    if ff:
        try:
            out = subprocess.run([media.FFMPEG, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=10)
            libass = " ass " in out.stdout
        except (OSError, subprocess.TimeoutExpired):
            pass
    items = [
        {"name": "FFmpeg", "ok": ff, "hint": "Cài FFmpeg và thêm vào PATH"},
        {"name": "Chèn phụ đề (libass)", "ok": libass, "hint": "Cần bản FFmpeg có libass"},
        {"name": "Dựng video bằng GPU (NVENC)", "ok": ff and media.nvenc_available(), "optional": True,
         "hint": "Không có GPU NVIDIA thì dùng CPU (chậm hơn)"},
        {"name": "Nhận dạng giọng nói (Whisper)", "ok": asr.available(), "hint": "pip install faster-whisper"},
        {"name": "Nhận dạng bằng GPU (CUDA)", "ok": asr.available() and asr.cuda_available(), "optional": True,
         "hint": "Cần GPU NVIDIA + CUDA/cuDNN"},
        {"name": "Lồng tiếng (Edge TTS)", "ok": tts.available(), "hint": "pip install edge-tts"},
        {"name": "Tải video (yt-dlp)", "ok": _has("yt_dlp"), "hint": "pip install yt-dlp"},
        {"name": "Đọc và xoá sub gốc (OCR)", "ok": ocr.available(), "optional": True,
         "hint": 'pip install rapidocr-onnxruntime'},
        {"name": "Nhận diện giọng Nam/Nữ", "ok": True, "hint": ""},
        {"name": "Dịch offline", "ok": _has("argostranslate"), "optional": True, "hint": "pip install argostranslate"},
        {"name": "Tách nhạc nền", "ok": _has("audio_separator"), "optional": True,
         "hint": 'pip install "audio-separator[gpu]"'},
    ]
    return items
