"""Nhận dạng giọng nói (faster-whisper) + đoán giới tính người nói theo cao độ."""
from __future__ import annotations

import re
import threading
from pathlib import Path
from typing import Callable, Optional

import numpy as np

_model_lock = threading.Lock()
_model_cache: dict = {}

INITIAL_PROMPTS = {
    "zh": "以下是普通话的句子，使用简体中文，带标点符号。",
    "ja": "以下は日本語の文です。",
    "en": "The following is a transcript with punctuation.",
}


class AsrError(RuntimeError):
    pass


def available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def cuda_available() -> bool:
    try:
        import ctranslate2
        return ctranslate2.get_cuda_device_count() > 0
    except Exception:  # noqa: BLE001
        return False


def _load(model_name: str, device: str):
    from faster_whisper import WhisperModel
    if device == "auto":
        device = "cuda" if cuda_available() else "cpu"
    compute = "float16" if device == "cuda" else "int8"
    key = (model_name, device)
    with _model_lock:
        if key not in _model_cache:
            _model_cache.clear()
            _model_cache[key] = WhisperModel(model_name, device=device, compute_type=compute)
        return _model_cache[key]


SPLIT_PUNCT = "。！？!?；;…"
SOFT_PUNCT = "，,、：:"


def _split_words(words, max_dur: float = 5.0, max_chars: int = 22):
    """Chia đoạn dài thành câu ngắn dựa vào dấu câu và mốc thời gian của từng từ."""
    out, cur = [], []
    for w in words:
        cur.append(w)
        text = "".join(x.word for x in cur).strip()
        dur = cur[-1].end - cur[0].start
        last = w.word.strip()[-1:] if w.word.strip() else ""
        if last in SPLIT_PUNCT or (last in SOFT_PUNCT and (dur > 2.2 or len(text) > 10)) \
                or dur > max_dur or len(text) > max_chars:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def transcribe(wav: Path, language: str = "zh", model_name: str = "small", device: str = "auto",
               progress: Optional[Callable[[float], None]] = None, cancel=None) -> list[dict]:
    if not available():
        raise AsrError("Chưa cài faster-whisper (pip install faster-whisper) — hoặc nhập file SRT khi tạo video.")
    model = _load(model_name, device)
    lang = None if language == "auto" else language
    segments, info = model.transcribe(
        str(wav), language=lang, vad_filter=True, word_timestamps=True, beam_size=5,
        initial_prompt=INITIAL_PROMPTS.get(language or "", None),
        vad_parameters={"min_silence_duration_ms": 300},
    )
    total = info.duration or 1
    out: list[dict] = []
    for seg in segments:
        if cancel and cancel():
            raise RuntimeError("Đã huỷ")
        words = [w for w in (seg.words or []) if w.word.strip()]
        groups = _split_words(words) if words else []
        if not groups:
            out.append({"start": seg.start, "end": seg.end, "src": seg.text.strip()})
        for g in groups:
            text = "".join(w.word for w in g).strip()
            text = re.sub(r"\s+", " " if language not in ("zh", "ja") else "", text)
            out.append({"start": float(g[0].start), "end": float(g[-1].end), "src": text})
        if progress:
            progress(min(1.0, seg.end / total))
    # nối khoảng hở nhỏ, bỏ dòng rỗng
    out = [s for s in out if s["src"].strip(" ，,。")]
    for i in range(len(out) - 1):
        gap = out[i + 1]["start"] - out[i]["end"]
        if 0 < gap < 0.25:
            out[i]["end"] = out[i + 1]["start"]
    return out


def _f0(frame: np.ndarray, sr: int) -> float:
    frame = frame - frame.mean()
    if np.abs(frame).max() < 0.02:
        return 0.0
    corr = np.correlate(frame, frame, mode="full")[len(frame) - 1:]
    lo, hi = int(sr / 400), int(sr / 70)
    if hi >= len(corr):
        return 0.0
    seg = corr[lo:hi]
    k = int(np.argmax(seg)) + lo
    if corr[k] < 0.3 * corr[0]:
        return 0.0
    return sr / k


def guess_genders(pcm16k: np.ndarray, segments: list[dict], sr: int = 16000) -> list[str]:
    """Đoán Nam/Nữ cho từng câu dựa vào cao độ trung bình (đơn giản, nhanh, không cần model)."""
    out = []
    win = int(0.04 * sr)
    for s in segments:
        a, b = int(s["start"] * sr), int(s["end"] * sr)
        chunk = pcm16k[a:b]
        f0s = []
        for i in range(0, max(0, len(chunk) - win), win):
            f = _f0(chunk[i:i + win], sr)
            if f:
                f0s.append(f)
        if len(f0s) < 3:
            out.append("")
        else:
            out.append("female" if float(np.median(f0s)) > 165 else "male")
    # làm mượt: câu không đoán được lấy theo câu trước
    last = "female"
    for i, g in enumerate(out):
        if not g:
            out[i] = last
        last = out[i]
    return out
