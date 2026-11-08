"""Lưu trữ dự án (mỗi video là một thư mục chứa project.json và các file media)."""
from __future__ import annotations

import shutil
import threading
import time
import uuid
from pathlib import Path

from . import config

_locks: dict[str, threading.RLock] = {}
_glock = threading.Lock()


def lock(pid: str) -> threading.RLock:
    with _glock:
        return _locks.setdefault(pid, threading.RLock())


def pdir(pid: str) -> Path:
    if not pid or "/" in pid or "\\" in pid or ".." in pid:
        raise KeyError(pid)
    return config.PROJECTS_DIR / pid


def new_project(*, title: str, source_url: str = "", platform: str = "", settings: dict | None = None,
                recipe: str = "") -> dict:
    pid = time.strftime("%y%m%d") + "-" + uuid.uuid4().hex[:6]
    s = settings or config.load_settings()
    proj = {
        "id": pid, "title": title or "Video mới", "title_src": "", "source_url": source_url,
        "platform": platform, "uploader": "", "created": time.time(), "updated": time.time(),
        "status": "queued", "stage": "", "progress": 0.0, "message": "Đang chờ", "error": "",
        "duration": 0.0, "width": 0, "height": 0, "has_audio": True,
        "segments": [], "next_id": 1, "style": dict(s["style"]),
        "settings": {k: s[k] for k in ("translator", "source_lang", "target_lang", "dub", "voice_default",
                                       "voice_male", "voice_female", "tts_rate", "max_speed", "orig_volume",
                                       "voice_volume", "separate_music", "ducking", "gap_volume", "loudnorm",
                                       "auto_shorten", "hardsub_timing", "speaker_voices", "hardsub", "hardsub_region",
                                       "auto_detect_region", "burn_subs", "output_ratio", "flip", "speed",
                                       "encoder", "crf", "asr_model")},
        "source_mode": "asr", "trim": {"start": 0, "end": 0}, "cuts": [],
        "outputs": [], "caption": None, "recipe": recipe, "qa": None, "folder": "",
    }
    pdir(pid).mkdir(parents=True, exist_ok=True)
    (pdir(pid) / "tts").mkdir(exist_ok=True)
    save(proj)
    return proj


def load(pid: str) -> dict:
    data = config.read_json(pdir(pid) / "project.json", None)
    if data is None:
        raise KeyError(pid)
    return data


def save(proj: dict) -> dict:
    with lock(proj["id"]):
        proj["updated"] = time.time()
        config.write_json(pdir(proj["id"]) / "project.json", proj)
    return proj


def update(pid: str, **fields) -> dict:
    with lock(pid):
        proj = load(pid)
        proj.update(fields)
        return save(proj)


def list_projects() -> list[dict]:
    out = []
    for d in config.PROJECTS_DIR.iterdir():
        f = d / "project.json"
        if f.exists():
            p = config.read_json(f, None)
            if p:
                p = {k: v for k, v in p.items() if k != "segments"} | {"lines": len(p.get("segments", []))}
                out.append(p)
    out.sort(key=lambda p: p.get("created", 0), reverse=True)
    return out


def delete(pid: str) -> None:
    shutil.rmtree(pdir(pid), ignore_errors=True)


def duplicate(pid: str) -> dict:
    src = load(pid)
    proj = new_project(title=src["title"] + " (bản sao)", source_url=src["source_url"], platform=src["platform"])
    for f in pdir(pid).iterdir():
        if f.name in ("project.json",) or f.name.startswith("output"):
            continue
        dst = pdir(proj["id"]) / f.name
        if f.is_dir():
            shutil.copytree(f, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(f, dst)
    keep = {k: v for k, v in src.items() if k not in ("id", "title", "created", "outputs")}
    proj.update(keep)
    proj["outputs"] = []
    proj["status"] = "ready" if src["status"] in ("done", "ready") else src["status"]
    return save(proj)


def cleanup(max_age_hours: float = 24) -> int:
    """Xoá ảnh khung hình tạm và file nghe thử cũ. Trả về số file đã xoá."""
    cutoff = time.time() - max_age_hours * 3600
    n = 0
    files = list(config.CACHE_DIR.glob("frame-*.jpg")) + list(config.PROJECTS_DIR.glob("*/tts/preview-*.mp3"))
    for f in files:
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
                n += 1
        except OSError:
            pass
    # cache giọng đọc dùng chung giữa các dự án: giữ 30 ngày
    old = time.time() - 30 * 86400
    for f in (config.CACHE_DIR / "tts").glob("*"):
        try:
            if f.stat().st_mtime < old:
                f.unlink()
                n += 1
        except OSError:
            pass
    return n
