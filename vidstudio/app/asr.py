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
               progress: Optional[Callable[[float], None]] = None, cancel=None, batched: bool | None = None) -> list[dict]:
    if not available():
        raise AsrError("Chưa cài faster-whisper (pip install faster-whisper) — hoặc nhập file SRT khi tạo video.")
    model = _load(model_name, device)
    lang = None if language == "auto" else language
    opts = dict(language=lang, vad_filter=True, word_timestamps=True, beam_size=5,
                initial_prompt=INITIAL_PROMPTS.get(language or "", None))
    if batched is None:  # mặc định: chạy theo lô khi có GPU (nhanh hơn nhiều)
        batched = (device == "cuda") or (device == "auto" and cuda_available())
    try:
        if batched:
            from faster_whisper import BatchedInferencePipeline
            segments, info = BatchedInferencePipeline(model=model).transcribe(str(wav), batch_size=8, **opts)
        else:
            raise ImportError
    except ImportError:
        segments, info = model.transcribe(str(wav), vad_parameters={"min_silence_duration_ms": 300}, **opts)
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


# ---------------------------------------------------------------- nhận diện người nói

def diarize_available() -> bool:
    try:
        import pyannote.audio  # noqa: F401
        return True
    except ImportError:
        return False


_diar = None


def diarize(wav: Path, token: str) -> list[tuple[float, float, str]]:
    """Chia đoạn theo người nói bằng pyannote. Trả về [(bắt đầu, kết thúc, nhãn)]."""
    global _diar
    if not diarize_available():
        raise AsrError('Chưa cài pyannote: pip install pyannote.audio')
    if not token:
        raise AsrError("Cần token Hugging Face (và chấp nhận điều khoản model pyannote/speaker-diarization-3.1)")
    if _diar is None:
        from pyannote.audio import Pipeline
        try:
            _diar = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", token=token)
        except TypeError:  # pyannote 3.x dùng tên tham số cũ
            _diar = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=token)
        if _diar is None:
            raise AsrError("Không tải được model pyannote — kiểm tra token và đã chấp nhận điều khoản trên Hugging Face chưa")
        try:
            import torch
            if torch.cuda.is_available():
                _diar.to(torch.device("cuda"))
        except Exception:  # noqa: BLE001
            pass
    res = _diar(str(wav))
    ann = getattr(res, "speaker_diarization", res)  # pyannote 4 bọc kết quả
    return [(float(t.start), float(t.end), str(spk)) for t, _, spk in ann.itertracks(yield_label=True)]


def assign_speakers(segments: list[dict], turns: list[tuple[float, float, str]], genders: list[str]) -> None:
    """Gán người nói cho từng câu theo thời gian trùng nhiều nhất; đặt nhãn A, B, C… và giới tính theo đa số."""
    names: dict[str, str] = {}
    for seg in segments:
        best, best_ov = None, 0.0
        for a, b, spk in turns:
            ov = min(b, seg["end"]) - max(a, seg["start"])
            if ov > best_ov:
                best, best_ov = spk, ov
        if best is not None:
            if best not in names:
                names[best] = chr(ord("A") + len(names)) if len(names) < 26 else f"S{len(names)}"
            seg["speaker_id"] = names[best]
    votes: dict[str, list[str]] = {}
    for seg, g in zip(segments, genders):
        if seg.get("speaker_id") and g:
            votes.setdefault(seg["speaker_id"], []).append(g)
    for seg in segments:
        v = votes.get(seg.get("speaker_id", ""), [])
        if v:
            seg["speaker"] = max(set(v), key=v.count)
