"""Lồng tiếng: tạo giọng đọc bằng edge-tts và ghép thành track khớp thời gian."""
from __future__ import annotations

import asyncio
import hashlib
import os
from pathlib import Path
from typing import Callable, Optional

import numpy as np

from . import media
from .subtitles import plain

SR = 44100


class TtsError(RuntimeError):
    pass


def available() -> bool:
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False


def _rate_str(pct: int) -> str:
    return f"{'+' if pct >= 0 else ''}{int(pct)}%"


def tts_key(text: str, voice: str, rate: int) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{plain(text)}".encode()).hexdigest()[:16]


async def _speak(text: str, voice: str, rate: int, out: Path) -> None:
    import edge_tts
    last = None
    for attempt in range(3):
        try:
            proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None
            com = edge_tts.Communicate(plain(text), voice, rate=_rate_str(rate), proxy=proxy)
            await com.save(str(out))
            if out.exists() and out.stat().st_size > 0:
                return
        except Exception as e:  # noqa: BLE001
            last = e
            await asyncio.sleep(1.0 + attempt)
    raise TtsError(f"Không tạo được giọng đọc ({voice}) — kiểm tra mạng (cần truy cập speech.platform.bing.com): {last}")


def synthesize(jobs: list[tuple[str, str, int, Path]], progress: Optional[Callable[[float], None]] = None,
               concurrency: int = 6) -> None:
    """jobs: (text, voice, rate%, out_path). Bỏ qua file đã có (cache)."""
    if not available():
        raise TtsError("Chưa cài edge-tts (pip install edge-tts)")
    todo = [j for j in jobs if not j[3].exists() and plain(j[0])]
    if not todo:
        if progress:
            progress(1.0)
        return
    done = 0

    async def runner():
        nonlocal done
        sem = asyncio.Semaphore(concurrency)

        async def one(job):
            nonlocal done
            async with sem:
                await _speak(*job)
                done += 1
                if progress:
                    progress(done / len(todo))

        await asyncio.gather(*(one(j) for j in todo))

    asyncio.run(runner())


def _trim_silence(pcm: np.ndarray) -> np.ndarray:
    nz = np.where(np.abs(pcm) > 0.01)[0]
    return pcm[max(0, nz[0] - 400): nz[-1] + 800] if nz.size else pcm


def speech_duration(f: Path) -> float:
    """Thời lượng giọng đọc sau khi bỏ khoảng lặng đầu/cuối."""
    return len(_trim_silence(media.decode_pcm(f, 16000))) / 16000


def window(segments: list[dict], i: int, duration: float) -> float:
    """Khoảng thời gian câu i được phép đọc: tới đầu câu sau (mượn cả khoảng lặng)."""
    start = float(segments[i]["start"])
    nxt = float(segments[i + 1]["start"]) if i + 1 < len(segments) else duration
    return max(0.3, min(nxt, duration) - start)


def build_dub_track(segments: list[dict], tts_dir: Path, out_wav: Path, duration: float,
                    max_speed: float = 1.4) -> list[dict]:
    """Đặt từng câu đọc vào đúng thời điểm, tự tăng tốc nếu dài hơn khoảng trống.

    Trả về danh sách {id, rate, tts_dur} để cập nhật vào dự án.
    """
    total = np.zeros(int((duration + 1) * SR), dtype=np.float32)
    stats = []
    for i, s in enumerate(segments):
        f = tts_dir / f"{s.get('tts_key')}.mp3"
        if not s.get("tts_key") or not f.exists() or s.get("mute"):
            stats.append({"id": s["id"], "rate": None, "tts_dur": None})
            continue
        pcm = _trim_silence(media.decode_pcm(f, SR))
        raw_dur = len(pcm) / SR
        start = float(s["start"])
        win = window(segments, i, duration)
        user_speed = float(s.get("speed") or 1.0)
        speed = user_speed
        if raw_dur / speed > win:  # đọc không kịp → tăng tốc, tối đa max_speed
            speed = min(max(max_speed, user_speed), raw_dur / win)
        speed = max(0.5, speed)
        if abs(speed - 1.0) > 0.01:
            pcm = _trim_silence(media.decode_pcm(f, SR, filters=media.atempo_chain(speed)))
        # nếu vẫn quá dài thì cắt và làm nhỏ dần cuối câu
        limit = int((win + 0.25) * SR)
        if len(pcm) > limit:
            pcm = pcm[:limit].copy()
            fade = min(len(pcm), int(0.12 * SR))
            pcm[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        gain = float(s.get("gain") or 1.0)
        a = int(start * SR)
        b = min(len(total), a + len(pcm))
        total[a:b] += pcm[: b - a] * gain
        stats.append({"id": s["id"], "rate": round(speed, 2), "tts_dur": round(raw_dur, 2)})
    peak = float(np.abs(total).max() or 1)
    if peak > 0.98:
        total *= 0.98 / peak
    media.write_wav(out_wav, total, SR)
    return stats
