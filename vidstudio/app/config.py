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
    "claude": {"label": "Claude", "free": False, "desc": "Dịch tự nhiên nhất, hiểu ngữ cảnh", "key": True,
               "model": "claude-opus-5-5", "key_url": "https://console.anthropic.com"},
    "gemini": {"label": "Gemini", "free": True, "desc": "Gói miễn phí, không cần thẻ (có giới hạn lượt/ngày)", "key": True,
               "model": "gemini-2.5-flash", "key_url": "https://aistudio.google.com/apikey"},
    "deepseek": {"label": "DeepSeek", "free": False, "desc": "Rẻ, giỏi tiếng Trung", "key": True,
                 "model": "deepseek-chat", "key_url": "https://platform.deepseek.com"},
    "openai": {"label": "OpenAI", "free": False, "desc": "GPT, ổn định", "key": True,
               "model": "gpt-4o-mini", "key_url": "https://platform.openai.com/api-keys"},
    "ollama": {"label": "Ollama", "free": True, "desc": "AI chạy trên máy, miễn phí, không giới hạn", "key": False,
               "model": "qwen2.5:7b", "key_url": "https://ollama.com"},
    "google": {"label": "Google dịch", "free": True, "desc": "Miễn phí, không cần key, kém tự nhiên hơn", "key": False,
               "model": "", "key_url": ""},
    "offline": {"label": "Dịch offline", "free": True, "desc": "Miễn phí, chạy trên máy, không cần mạng", "key": False,
                "model": "", "key_url": ""},
}

VOICES = [
    {"id": "vi-VN-HoaiMyNeural", "label": "Hoài My (Nữ) · Edge miễn phí", "gender": "female", "provider": "edge"},
    {"id": "vi-VN-NamMinhNeural", "label": "Nam Minh (Nam) · Edge miễn phí", "gender": "male", "provider": "edge"},
    {"id": "piper:vi_VN-vais1000-medium", "label": "VAIS (Nữ) · Offline miễn phí", "gender": "female", "provider": "piper"},
    {"id": "piper:vi_VN-25hours_single-low", "label": "25hours (Nữ) · Offline miễn phí", "gender": "female", "provider": "piper"},
    {"id": "fpt:banmai", "label": "Ban Mai (Nữ Bắc) · FPT.AI", "gender": "female", "provider": "fpt"},
    {"id": "fpt:thuminh", "label": "Thu Minh (Nữ Bắc) · FPT.AI", "gender": "female", "provider": "fpt"},
    {"id": "fpt:leminh", "label": "Lê Minh (Nam Bắc) · FPT.AI", "gender": "male", "provider": "fpt"},
    {"id": "fpt:myan", "label": "Mỹ An (Nữ Trung) · FPT.AI", "gender": "female", "provider": "fpt"},
    {"id": "fpt:giahuy", "label": "Gia Huy (Nam Trung) · FPT.AI", "gender": "male", "provider": "fpt"},
    {"id": "fpt:lannhi", "label": "Lan Nhi (Nữ Nam) · FPT.AI", "gender": "female", "provider": "fpt"},
    {"id": "fpt:linhsan", "label": "Linh San (Nữ Nam) · FPT.AI", "gender": "female", "provider": "fpt"},
    {"id": "fpt:minhquang", "label": "Minh Quang (Nam Nam) · FPT.AI", "gender": "male", "provider": "fpt"},
    {"id": "openai:nova", "label": "Nova (Nữ) · OpenAI", "gender": "female", "provider": "openai"},
    {"id": "openai:coral", "label": "Coral (Nữ) · OpenAI", "gender": "female", "provider": "openai"},
    {"id": "openai:onyx", "label": "Onyx (Nam) · OpenAI", "gender": "male", "provider": "openai"},
    {"id": "openai:ash", "label": "Ash (Nam) · OpenAI", "gender": "male", "provider": "openai"},
]

FREE_TTS = {"edge", "piper"}
PIPER_DEFAULT = "vi_VN-vais1000-medium"
VOICES_DIR = DATA_DIR / "voices"


def voice_provider(voice: str) -> str:
    return voice.split(":", 1)[0] if ":" in voice else "edge"


def is_free_voice(voice: str) -> bool:
    return voice_provider(voice) in FREE_TTS


def is_free_provider(provider: str) -> bool:
    return bool(PROVIDERS.get(provider, {}).get("free"))


def free_voice_for(voice: str, gender: str = "") -> str:
    """Thay giọng trả phí bằng giọng Edge miễn phí cùng giới tính."""
    if not gender:
        gender = next((v["gender"] for v in VOICES if v["id"] == voice), "female")
    return "vi-VN-NamMinhNeural" if gender == "male" else "vi-VN-HoaiMyNeural"


def guard_translator(provider: str, settings: dict) -> str:
    """Chế độ miễn phí 100%: không bao giờ gọi dịch vụ trả phí."""
    if settings.get("free_only", True) and not is_free_provider(provider):
        return "google"
    return provider


# nhà cung cấp giọng cần API key (key lưu chung trong keys.json)
TTS_PROVIDERS = {
    "fpt": {"label": "FPT.AI", "key_url": "https://console.fpt.ai"},
    "eleven": {"label": "ElevenLabs", "key_url": "https://elevenlabs.io/app/settings/api-keys"},
}


def all_voices(settings: dict | None = None) -> list[dict]:
    """Giọng có sẵn + giọng ElevenLabs người dùng tự thêm (mỗi dòng: Tên = voice_id)."""
    settings = settings or load_settings()
    out = list(VOICES)
    for line in (settings.get("eleven_voices") or "").splitlines():
        if "=" in line:
            name, vid = (x.strip() for x in line.split("=", 1))
            if name and vid:
                g = "male" if "nam" in name.lower() and "nữ" not in name.lower() else "female"
                out.append({"id": f"eleven:{vid}", "label": f"{name} · ElevenLabs", "gender": g, "provider": "eleven"})
    for v in out:
        v["free"] = v["provider"] in FREE_TTS
    return out


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
    "free_only": True,         # chế độ miễn phí 100%: ẩn và chặn mọi dịch vụ trả phí
    "tts_offline_fallback": True,  # Edge lỗi/mất mạng → tự đọc bằng giọng offline Piper
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
    "asr_batched": "auto",    # auto: chạy theo lô khi có GPU | on | off
    "diarize": False,         # phân biệt người nói bằng pyannote (cần token Hugging Face)
    "parallel_translate": 3,  # số lô dịch gửi cùng lúc
    "dub": True,
    "voice_default": "vi-VN-HoaiMyNeural",
    "voice_male": "vi-VN-NamMinhNeural",
    "voice_female": "vi-VN-HoaiMyNeural",
    "speaker_voices": {},      # nhãn người nói (A, B…) → giọng
    "eleven_voices": "",       # mỗi dòng: Tên = voice_id (giọng clone của bạn trên ElevenLabs)
    "eleven_model": "eleven_flash_v2_5",
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
