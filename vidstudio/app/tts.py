"""Lồng tiếng: tạo giọng đọc (Edge, FPT.AI, ElevenLabs, OpenAI) và ghép thành track khớp thời gian."""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import shutil
import time
from pathlib import Path
from typing import Callable, Optional

import httpx
import numpy as np

from . import config, media
from .subtitles import plain

SR = 44100
GLOBAL_CACHE = config.CACHE_DIR / "tts"
GLOBAL_CACHE.mkdir(parents=True, exist_ok=True)


class TtsError(RuntimeError):
    pass


def available() -> bool:
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False


def split_voice(voice: str) -> tuple[str, str]:
    """'fpt:banmai' → ('fpt', 'banmai'); tên cũ 'vi-VN-…' là giọng Edge."""
    if ":" in voice:
        prov, vid = voice.split(":", 1)
        return prov, vid
    return "edge", voice


def _rate_str(pct: int) -> str:
    return f"{'+' if pct >= 0 else ''}{int(pct)}%"


def tts_key(text: str, voice: str, rate: int) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{plain(text)}".encode()).hexdigest()[:16]


def words_file(mp3: Path) -> Path:
    return mp3.with_suffix(".words.json")


def _proxy() -> str | None:
    return os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None


async def _edge(text: str, vid: str, rate: int, out: Path) -> list:
    """Edge TTS, lấy kèm mốc thời gian từng chữ (WordBoundary) để làm karaoke khớp giọng."""
    import edge_tts
    com = edge_tts.Communicate(text, vid, rate=_rate_str(rate), boundary="WordBoundary", proxy=_proxy())
    audio = bytearray()
    words = []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append([round(chunk["offset"] / 1e7, 3), round(chunk["duration"] / 1e7, 3), chunk["text"]])
    if not audio:
        raise TtsError("Edge không trả âm thanh")
    out.write_bytes(bytes(audio))
    return words


def _fpt(text: str, vid: str, rate: int, out: Path, key: str) -> None:
    speed = max(-3, min(3, round(rate / 15)))
    r = httpx.post("https://api.fpt.ai/hmi/tts/v5", content=text.encode("utf-8"), timeout=30,
                   headers={"api-key": key, "voice": vid, "speed": str(speed), "format": "mp3"})
    data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    url = data.get("async")
    if r.status_code != 200 or not url:
        raise TtsError(f"FPT.AI lỗi {r.status_code}: {data.get('message') or r.text[:200]}")
    for _ in range(40):  # FPT tạo file bất đồng bộ → chờ file sẵn sàng
        time.sleep(1.0)
        g = httpx.get(url, timeout=30)
        if g.status_code == 200 and len(g.content) > 1000:
            out.write_bytes(g.content)
            return
    raise TtsError("FPT.AI tạo giọng quá lâu")


def _eleven(text: str, vid: str, rate: int, out: Path, key: str, model: str) -> None:
    r = httpx.post(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}", timeout=120,
                   params={"output_format": "mp3_44100_128"}, headers={"xi-api-key": key},
                   json={"text": text, "model_id": model,
                         "voice_settings": {"speed": max(0.7, min(1.2, 1 + rate / 100))}})
    if r.status_code != 200:
        raise TtsError(f"ElevenLabs lỗi {r.status_code}: {r.text[:200]}")
    out.write_bytes(r.content)


def _openai(text: str, vid: str, rate: int, out: Path, key: str) -> None:
    r = httpx.post("https://api.openai.com/v1/audio/speech", timeout=120, headers={"Authorization": f"Bearer {key}"},
                   json={"model": "gpt-4o-mini-tts", "voice": vid, "input": text, "response_format": "mp3",
                         "speed": max(0.5, min(2.0, 1 + rate / 100)),
                         "instructions": "Đọc tiếng Việt tự nhiên, giọng miền Bắc, nhịp nhanh vừa phải như lồng tiếng video."})
    if r.status_code != 200:
        raise TtsError(f"OpenAI TTS lỗi {r.status_code}: {r.text[:200]}")
    out.write_bytes(r.content)


async def _speak(text: str, voice: str, rate: int, out: Path) -> None:
    prov, vid = split_voice(voice)
    text = plain(text)
    keys = config.load_keys()
    last = None
    for attempt in range(3):
        try:
            words: list = []
            if prov == "edge":
                words = await _edge(text, vid, rate, out)
            elif prov == "fpt":
                if not keys.get("fpt"):
                    raise TtsError("Chưa có API key FPT.AI — dán trong Cài đặt › Giọng đọc")
                await asyncio.to_thread(_fpt, text, vid, rate, out, keys["fpt"])
            elif prov == "eleven":
                if not keys.get("eleven"):
                    raise TtsError("Chưa có API key ElevenLabs — dán trong Cài đặt › Giọng đọc")
                model = config.load_settings().get("eleven_model", "eleven_flash_v2_5")
                await asyncio.to_thread(_eleven, text, vid, rate, out, keys["eleven"], model)
            elif prov == "openai":
                if not keys.get("openai"):
                    raise TtsError("Chưa có API key OpenAI — dán trong Cài đặt")
                await asyncio.to_thread(_openai, text, vid, rate, out, keys["openai"])
            else:
                raise TtsError(f"Không biết nhà cung cấp giọng: {prov}")
            if out.exists() and out.stat().st_size > 0:
                if words:
                    words_file(out).write_text(json.dumps(words, ensure_ascii=False))
                return
        except TtsError:
            raise
        except Exception as e:  # noqa: BLE001
            last = e
            await asyncio.sleep(1.0 + attempt)
    hint = " — kiểm tra mạng (cần truy cập speech.platform.bing.com)" if prov == "edge" else ""
    raise TtsError(f"Không tạo được giọng đọc ({voice}){hint}: {last}")


def _link(src: Path, dst: Path) -> None:
    dst.unlink(missing_ok=True)
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def _from_cache(out: Path) -> bool:
    """Dùng lại giọng đã tạo ở dự án khác (cùng câu, cùng giọng, cùng tốc độ)."""
    g = GLOBAL_CACHE / out.name
    if not g.exists():
        return False
    _link(g, out)
    if words_file(g).exists():
        _link(words_file(g), words_file(out))
    return True


def _to_cache(out: Path) -> None:
    try:
        _link(out, GLOBAL_CACHE / out.name)
        if words_file(out).exists():
            _link(words_file(out), words_file(GLOBAL_CACHE / out.name))
    except OSError:
        pass


def synthesize(jobs: list[tuple[str, str, int, Path]], progress: Optional[Callable[[float], None]] = None,
               concurrency: int = 6) -> None:
    """jobs: (text, voice, rate%, out_path). Bỏ qua file đã có hoặc có trong cache chung."""
    todo = [j for j in jobs if plain(j[0]) and not j[3].exists() and not _from_cache(j[3])]
    if not todo:
        if progress:
            progress(1.0)
        return
    if any(split_voice(j[1])[0] == "edge" for j in todo) and not available():
        raise TtsError("Chưa cài edge-tts (pip install edge-tts)")
    done = 0

    async def runner():
        nonlocal done
        sem = asyncio.Semaphore(concurrency)

        async def one(job):
            nonlocal done
            async with sem:
                await _speak(*job)
                _to_cache(job[3])
                done += 1
                if progress:
                    progress(done / len(todo))

        await asyncio.gather(*(one(j) for j in todo))

    asyncio.run(runner())


def _lead(pcm: np.ndarray) -> int:
    nz = np.where(np.abs(pcm) > 0.01)[0]
    return max(0, int(nz[0]) - 400) if nz.size else 0


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

    Trả về danh sách {id, rate, tts_dur, words} để cập nhật vào dự án; `words` là mốc
    thời gian tuyệt đối của từng chữ (nếu nhà cung cấp giọng có trả) để làm karaoke khớp giọng.
    """
    total = np.zeros(int((duration + 1) * SR), dtype=np.float32)
    stats = []
    for i, s in enumerate(segments):
        f = tts_dir / f"{s.get('tts_key')}.mp3"
        if not s.get("tts_key") or not f.exists() or s.get("mute"):
            stats.append({"id": s["id"], "rate": None, "tts_dur": None, "words": None})
            continue
        full = media.decode_pcm(f, SR)
        lead = _lead(full) / SR
        pcm = _trim_silence(full)
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
        placed_end = start + len(pcm) / SR
        words = None
        wf = words_file(f)
        if wf.exists():
            try:
                words = []
                for off, dur, txt in json.loads(wf.read_text("utf-8")):
                    ws = start + (off - lead) / speed
                    we = min(placed_end, ws + dur / speed)
                    if ws < placed_end:
                        words.append([round(ws, 3), round(we, 3), txt])
            except (ValueError, TypeError):
                words = None
        stats.append({"id": s["id"], "rate": round(speed, 2), "tts_dur": round(raw_dur, 2), "words": words})
    peak = float(np.abs(total).max() or 1)
    if peak > 0.98:
        total *= 0.98 / peak
    media.write_wav(out_wav, total, SR)
    return stats
