"""Cấu hình chung, API key và đường dẫn dữ liệu."""
from __future__ import annotations

import copy
import json
import os
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("VIDSTUDIO_DATA", ROOT / "data")).resolve()
PROJECTS_DIR = DATA_DIR / "projects"
CACHE_DIR = DATA_DIR / "cache"
EXPORTS_DIR = DATA_DIR / "exports"
SETTINGS_FILE = DATA_DIR / "settings.json"
KEYS_FILE = DATA_DIR / "keys.json"
SAVED_FILE = DATA_DIR / "saved_videos.json"
WEB_DIR = ROOT / "web"

for _d in (DATA_DIR, PROJECTS_DIR, CACHE_DIR, EXPORTS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

PROVIDERS = {
    "claude": {"label": "Claude", "desc": "Dịch tự nhiên nhất, hiểu ngữ cảnh", "key": True,
               "model": "claude-opus-5-5", "key_url": "https://console.anthropic.com"},
    "gemini": {"label": "Gemini", "desc": "Google, có gói miễn phí", "key": True,
               "model": "gemini-2.5-flash", "key_url": "https://aistudio.google.com/apikey"},
    "deepseek": {"label": "DeepSeek", "desc": "Rẻ, giỏi tiếng Trung", "key": True,
                 "model": "deepseek-chat", "key_url": "https://platform.deepseek.com"},
    "openai": {"label": "OpenAI", "desc": "GPT, ổn định", "key": True,
               "model": "gpt-4o-mini", "key_url": "https://platform.openai.com/api-keys"},
    "ollama": {"label": "Ollama", "desc": "Model AI chạy trên máy", "key": False,
               "model": "qwen2.5:7b", "key_url": "https://ollama.com"},
    "google": {"label": "Google dịch", "desc": "Miễn phí, kém tự nhiên, dễ bị chặn", "key": False,
               "model": "", "key_url": ""},
    "offline": {"label": "Dịch offline", "desc": "Argos Translate, không cần key", "key": False,
                "model": "", "key_url": ""},
}

VOICES = [
    {"id": "vi-VN-HoaiMyNeural", "label": "Hoài My (Nữ)", "gender": "female"},
    {"id": "vi-VN-NamMinhNeural", "label": "Nam Minh (Nam)", "gender": "male"},
]

DEFAULT_STYLE = {
    "preset": "tiktok",
    "font": "Arial",
    "size": 6.0,            # % cạnh ngắn của khung hình
    "color": "#FFFFFF",
    "highlight": "#FFD400",
    "outline_color": "#000000",
    "outline": 3,
    "box_color": "#000000",
    "box_opacity": 0.6,
    "bold": True,
    "uppercase": False,
    "pos_y": 0.80,           # tâm dòng sub theo chiều dọc (0..1)
    "max_chars": 32,         # ngắt dòng
    "show_source": False,    # hiển thị cả câu gốc phía trên
}

DEFAULT_SETTINGS = {
    "translator": "google",
    "models": {k: v["model"] for k, v in PROVIDERS.items()},
    "ollama_url": "http://127.0.0.1:11434",
    "claude_effort": "medium",
    "style_prompt": "Tự nhiên, khẩu ngữ, hợp với video ngắn trên mạng xã hội.",
    "glossary": "",
    "source_lang": "zh",
    "target_lang": "vi",
    "asr_model": "small",
    "asr_device": "auto",
    "dub": True,
    "voice_default": "vi-VN-HoaiMyNeural",
    "voice_male": "vi-VN-NamMinhNeural",
    "voice_female": "vi-VN-HoaiMyNeural",
    "tts_rate": 0,            # % tốc độ đọc gốc của edge-tts (-50..+50)
    "max_speed": 1.4,         # tăng tốc tối đa để khớp thời lượng câu
    "orig_volume": 0.12,      # âm lượng tiếng gốc lúc đang có giọng Việt (0 = tắt)
    "ducking": True,          # tiếng gốc to lại lúc giọng Việt im
    "gap_volume": 0.8,        # âm lượng tiếng gốc lúc không có lời
    "loudnorm": True,         # chuẩn âm lượng -14 LUFS
    "auto_shorten": True,     # AI tự rút gọn câu đọc không kịp
    "voice_volume": 1.0,
    "separate_music": False,
    "hardsub": "blur",        # none | blur | box | crop
    "hardsub_region": {"x": 0.04, "y": 0.74, "w": 0.92, "h": 0.14},
    "auto_detect_region": True,
    "hardsub_timing": "auto", # auto: chỉ làm mờ lúc có sub (cần OCR) | always
    "burn_subs": True,
    "encoder": "auto",        # auto | libx264 | h264_nvenc
    "crf": 21,
    "output_ratio": "source", # source | 9:16 | 1:1 | 16:9
    "flip": False,            # lật ngang (tránh trùng lặp nội dung)
    "speed": 1.0,             # tốc độ video thành phẩm
    "notify": True,
    "cookies_file": "",
    "style": DEFAULT_STYLE,
    "recipes": {},
}

_lock = threading.Lock()


def _deep_merge(base: dict, extra: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text("utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return copy.deepcopy(default)


def write_json(path: Path, data) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), "utf-8")
    os.replace(tmp, path)


def load_settings() -> dict:
    with _lock:
        return _deep_merge(DEFAULT_SETTINGS, read_json(SETTINGS_FILE, {}))


def save_settings(data: dict) -> dict:
    with _lock:
        merged = _deep_merge(DEFAULT_SETTINGS, data)
        write_json(SETTINGS_FILE, merged)
        return merged


def is_default_settings() -> bool:
    return not SETTINGS_FILE.exists()


def reset_settings() -> dict:
    with _lock:
        if SETTINGS_FILE.exists():
            SETTINGS_FILE.unlink()
    return load_settings()


def load_keys() -> dict:
    keys = read_json(KEYS_FILE, {})
    env_map = {"claude": "ANTHROPIC_API_KEY", "gemini": "GEMINI_API_KEY",
               "deepseek": "DEEPSEEK_API_KEY", "openai": "OPENAI_API_KEY"}
    for prov, env in env_map.items():
        if not keys.get(prov) and os.environ.get(env):
            keys[prov] = os.environ[env]
    return keys


def save_key(provider: str, key: str) -> None:
    with _lock:
        keys = read_json(KEYS_FILE, {})
        if key:
            keys[provider] = key.strip()
        else:
            keys.pop(provider, None)
        write_json(KEYS_FILE, keys)
        try:
            os.chmod(KEYS_FILE, 0o600)
        except OSError:
            pass


def masked_keys() -> dict:
    out = {}
    for k, v in load_keys().items():
        out[k] = (v[:6] + "…" + v[-4:]) if v and len(v) > 12 else ("đã lưu" if v else "")
    return out
