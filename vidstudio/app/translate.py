"""Dịch phụ đề và các tác vụ chữ khác qua nhiều nhà cung cấp AI."""
from __future__ import annotations

import json
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional

import httpx

from . import config

LANG_NAMES = {"zh": "tiếng Trung", "en": "tiếng Anh", "ja": "tiếng Nhật", "ko": "tiếng Hàn",
              "vi": "tiếng Việt", "th": "tiếng Thái", "auto": "ngôn ngữ gốc"}
GOOGLE_CODES = {"zh": "zh-CN", "auto": "auto"}
TIMEOUT = httpx.Timeout(120.0, connect=15.0)


class TranslateError(RuntimeError):
    pass


def _extract_json(text: str):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"[\[{].*[\]}]", text, re.S)
        if m:
            return json.loads(m.group(0))
        raise


# ---------------- gọi LLM thô ----------------

def llm_complete(provider: str, system: str, user: str, settings: dict, schema: dict | None = None) -> str:
    if settings.get("free_only", True) and not config.is_free_provider(provider):
        raise TranslateError("Đang bật chế độ miễn phí 100% — không gọi dịch vụ trả phí. Tắt trong Cài đặt nếu muốn dùng.")
    keys = config.load_keys()
    model = settings["models"].get(provider) or config.PROVIDERS[provider]["model"]
    if config.PROVIDERS.get(provider, {}).get("key") and not keys.get(provider):
        raise TranslateError(f"Chưa có API key cho {config.PROVIDERS[provider]['label']} — vào Cài đặt để dán key.")

    if provider == "claude":
        import anthropic
        client = anthropic.Anthropic(api_key=keys["claude"], timeout=300.0)
        output_config: dict = {"effort": settings.get("claude_effort", "medium")}
        if schema:
            output_config["format"] = {"type": "json_schema", "schema": schema}
        try:
            resp = client.beta.messages.create(
                model=model, max_tokens=16000, system=system,
                messages=[{"role": "user", "content": user}],
                output_config=output_config,
                betas=["server-side-fallback-2026-07-01"], fallbacks="default",
                cache_control={"type": "ephemeral"},  # các lô dùng chung system prompt → đọc từ cache
            )
        except anthropic.AuthenticationError:
            raise TranslateError("API key Claude không hợp lệ")
        except anthropic.RateLimitError:
            raise TranslateError("Claude đang giới hạn tốc độ — thử lại sau ít phút")
        except anthropic.APIStatusError as e:
            raise TranslateError(f"Claude lỗi {e.status_code}: {e.message}")
        except anthropic.APIConnectionError:
            raise TranslateError("Không kết nối được tới Claude")
        if resp.stop_reason == "refusal":
            raise TranslateError("Claude từ chối dịch đoạn này")
        return "".join(b.text for b in resp.content if b.type == "text")

    if provider == "gemini":
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        body = {"systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {"temperature": 0.4,
                                     **({"responseMimeType": "application/json"} if schema else {})}}
        r = httpx.post(url, params={"key": keys["gemini"]}, json=body, timeout=TIMEOUT)
        if r.status_code != 200:
            raise TranslateError(f"Gemini lỗi {r.status_code}: {r.text[:200]}")
        data = r.json()
        try:
            return "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
        except (KeyError, IndexError):
            raise TranslateError("Gemini không trả kết quả (có thể bị chặn nội dung)")

    if provider in ("deepseek", "openai"):
        base = "https://api.deepseek.com" if provider == "deepseek" else "https://api.openai.com/v1"
        body = {"model": model, "temperature": 0.4,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if schema:
            body["response_format"] = {"type": "json_object"}
        r = httpx.post(f"{base}/chat/completions", json=body, timeout=TIMEOUT,
                       headers={"Authorization": f"Bearer {keys[provider]}"})
        if r.status_code != 200:
            raise TranslateError(f"{provider} lỗi {r.status_code}: {r.text[:200]}")
        return r.json()["choices"][0]["message"]["content"]

    if provider == "ollama":
        body = {"model": model, "stream": False, "options": {"temperature": 0.3},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
        if schema:
            body["format"] = "json"
        try:
            r = httpx.post(settings.get("ollama_url", "http://127.0.0.1:11434").rstrip("/") + "/api/chat",
                           json=body, timeout=httpx.Timeout(600.0, connect=5.0))
        except httpx.HTTPError:
            raise TranslateError("Không kết nối được Ollama — đã chạy `ollama serve` chưa?")
        if r.status_code != 200:
            raise TranslateError(f"Ollama lỗi {r.status_code}: {r.text[:200]}")
        return r.json()["message"]["content"]

    raise TranslateError(f"Nhà cung cấp {provider} không hỗ trợ tác vụ này")


# ---------------- dịch máy ----------------

def google_translate(lines: list[str], src: str, tgt: str) -> list[str]:
    sl = GOOGLE_CODES.get(src, src)
    out: list[str] = []
    chunk: list[str] = []

    def flush():
        if not chunk:
            return
        q = "\n".join(chunk)
        for attempt in range(3):
            try:
                r = httpx.get("https://translate.googleapis.com/translate_a/single",
                              params={"client": "gtx", "sl": sl, "tl": tgt, "dt": "t", "q": q},
                              timeout=30)
                r.raise_for_status()
                data = r.json()
                text = "".join(p[0] for p in data[0] if p and p[0])
                parts = [p.strip() for p in text.split("\n")]
                if len(parts) != len(chunk):
                    parts = [google_translate([c], src, tgt)[0] if len(chunk) > 1 else text.strip()
                             for c in chunk]
                out.extend(parts)
                chunk.clear()
                return
            except (httpx.HTTPError, ValueError, IndexError):
                time.sleep(1.5 * (attempt + 1))
        raise TranslateError("Google dịch bị chặn hoặc mất mạng — thử nhà cung cấp khác")

    size = 0
    for ln in lines:
        if size + len(ln) > 1500 and chunk:
            flush()
            size = 0
        chunk.append(ln.replace("\n", " "))
        size += len(ln) + 1
    flush()
    return out


def offline_translate(lines: list[str], src: str, tgt: str) -> list[str]:
    try:
        import argostranslate.translate as at  # type: ignore
    except ImportError:
        raise TranslateError("Chưa cài dịch offline: pip install argostranslate, rồi tải gói ngôn ngữ trong Cài đặt")
    try:
        return [at.translate(ln, src, tgt) for ln in lines]
    except Exception as e:  # noqa: BLE001
        raise TranslateError(f"Dịch offline lỗi: {e}. Hãy cài gói {src}→en và en→{tgt}.")


# ---------------- dịch phụ đề ----------------

SUB_SCHEMA = {
    "type": "object",
    "properties": {"lines": {"type": "array", "items": {
        "type": "object",
        "properties": {"i": {"type": "integer"}, "t": {"type": "string"}},
        "required": ["i", "t"], "additionalProperties": False}}},
    "required": ["lines"], "additionalProperties": False,
}


def _sub_system(settings: dict, src: str, tgt: str, highlight: bool) -> str:
    rules = [
        f"Bạn là biên dịch viên phụ đề video ngắn, dịch từ {LANG_NAMES.get(src, src)} sang {LANG_NAMES.get(tgt, tgt)}.",
        f"Văn phong: {settings.get('style_prompt') or 'tự nhiên'}",
        "Mỗi dòng có thời lượng d (giây). Bản dịch phải đọc kịp trong thời lượng đó: khoảng 4 tiếng/giây, "
        "nếu dài thì rút gọn ý, bỏ từ thừa nhưng giữ nghĩa và cảm xúc.",
        "Dịch theo ngữ cảnh cả đoạn hội thoại, xưng hô nhất quán, tên riêng giữ nhất quán, không thêm chú thích.",
        "Nhận dạng giọng nói có thể sai chữ đồng âm — hãy đoán nghĩa đúng theo ngữ cảnh.",
        "Không gộp hay tách dòng: trả về đúng số dòng, giữ nguyên chỉ số i.",
    ]
    if highlight:
        rules.append("Trong mỗi dòng, bọc đúng MỘT từ/cụm từ quan trọng nhất bằng dấu *sao* (ví dụ: Mang *nhiều tiền* thế).")
    if settings.get("glossary"):
        rules.append("Bảng thuật ngữ bắt buộc (gốc = dịch):\n" + settings["glossary"].strip())
    rules.append('Trả về JSON dạng {"lines":[{"i":0,"t":"..."}]}.')
    return "\n".join(rules)


def translate_segments(segments: list[dict], settings: dict, provider: str | None = None,
                       progress: Optional[Callable[[float], None]] = None, highlight: bool = False,
                       context_title: str = "") -> list[str]:
    provider = config.guard_translator(provider or settings.get("translator", "google"), settings)
    src, tgt = settings.get("source_lang", "zh"), settings.get("target_lang", "vi")
    texts = [s.get("src", "") for s in segments]
    if provider == "google":
        res = google_translate(texts, src, tgt)
        if progress:
            progress(1.0)
        return res
    if provider == "offline":
        res = offline_translate(texts, src, tgt)
        if progress:
            progress(1.0)
        return res

    system = _sub_system(settings, src, tgt, highlight)
    results: list[str] = [""] * len(segments)
    batch = 40
    starts = list(range(0, len(segments), batch))
    done_lines = 0
    plock = threading.Lock()

    def run_batch(start: int) -> None:
        nonlocal done_lines
        part = segments[start:start + batch]
        # các lô chạy song song nên ngữ cảnh là câu gốc phía trước (chưa có bản dịch)
        prev = [segments[j].get("src") for j in range(max(0, start - 6), start)]
        payload = {
            "tieu_de_video": context_title,
            "cau_goc_phia_truoc": prev,
            "lines": [{"i": start + k, "d": round(float(s["end"]) - float(s["start"]), 1), "src": s.get("src", "")}
                      for k, s in enumerate(part)],
        }
        user = "Dịch các dòng sau:\n" + json.dumps(payload, ensure_ascii=False)
        last_err: Exception | None = None
        for attempt in range(3):
            try:
                raw = llm_complete(provider, system, user, settings, schema=SUB_SCHEMA)
                data = _extract_json(raw)
                rows = data["lines"] if isinstance(data, dict) else data
                got = {int(r["i"]): str(r.get("t", "")).strip() for r in rows if "i" in r}
                missing = [start + k for k in range(len(part)) if not got.get(start + k)]
                for k in range(len(part)):
                    results[start + k] = got.get(start + k, "") or results[start + k]
                if missing and attempt < 2:
                    last_err = TranslateError(f"Thiếu {len(missing)} dòng")
                    continue
                last_err = None
                break
            except TranslateError:
                raise
            except Exception as e:  # noqa: BLE001 — JSON hỏng, thử lại
                last_err = e
                time.sleep(1.0)
        if last_err and not any(results[start:start + len(part)]):
            raise TranslateError(f"AI trả kết quả không hợp lệ: {last_err}")
        with plock:
            done_lines += len(part)
            if progress:
                progress(min(1.0, done_lines / len(segments)))

    workers = max(1, min(int(settings.get("parallel_translate", 3) or 1), len(starts)))
    if provider == "ollama":
        workers = 1  # model chạy trên máy: gửi song song không nhanh hơn
    with ThreadPoolExecutor(max_workers=workers) as ex:
        for fut in [ex.submit(run_batch, st) for st in starts]:
            fut.result()
    # dòng nào AI bỏ sót thì dịch bằng Google cho đủ
    holes = [i for i, t in enumerate(results) if not t and texts[i].strip()]
    if holes:
        try:
            filled = google_translate([texts[i] for i in holes], src, tgt)
            for i, t in zip(holes, filled):
                results[i] = t
        except TranslateError:
            pass
    return results


def translate_texts(texts: list[str], settings: dict, src: str = "zh", tgt: str = "vi",
                    provider: str | None = None) -> list[str]:
    """Dịch nhanh danh sách câu ngắn (tiêu đề video, từ khoá tìm kiếm)."""
    if not texts:
        return []
    provider = config.guard_translator(provider or settings.get("translator", "google"), settings)
    if provider in ("google", "offline"):
        fn = google_translate if provider == "google" else offline_translate
        return fn(texts, src, tgt)
    system = (f"Dịch từng câu từ {LANG_NAMES.get(src, src)} sang {LANG_NAMES.get(tgt, tgt)}, ngắn gọn, tự nhiên. "
              'Trả JSON {"lines":[{"i":0,"t":"..."}]}, giữ nguyên số dòng.')
    raw = llm_complete(provider, system, json.dumps([{"i": i, "src": t} for i, t in enumerate(texts)],
                                                    ensure_ascii=False), settings, schema=SUB_SCHEMA)
    data = _extract_json(raw)
    rows = data["lines"] if isinstance(data, dict) else data
    got = {int(r["i"]): r.get("t", "") for r in rows}
    return [got.get(i) or texts[i] for i in range(len(texts))]


SHORT_SCHEMA = {
    "type": "object",
    "properties": {"lines": {"type": "array", "items": {
        "type": "object",
        "properties": {"id": {"type": "integer"}, "t": {"type": "string"}},
        "required": ["id", "t"], "additionalProperties": False}}},
    "required": ["lines"], "additionalProperties": False,
}


# từ đệm / từ thừa có thể bỏ mà câu vẫn đủ nghĩa khi lồng tiếng
_FILLERS = [
    "thật ra thì", "thật ra", "thực ra", "nói chung là", "nói chung", "thế là", "vậy thì", "thế thì", "kiểu như",
    "thực sự là", "thực sự", "một cách", "đúng là", "chắc chắn là", "có lẽ là", "rồi thì", "cơ mà",
    "nhé", "nha", "đấy", "đó nha", "ạ", "à nha", "cơ", "chứ nhỉ", "nhỉ", "luôn đó", "luôn",
]
_SOFT = ["những", "các", "cái", "rất", "lắm", "thì", "mà", "đã", "sẽ", "đang"]  # bỏ đi không đổi nghĩa


def _drop(text: str, words: list[str]) -> str:
    for w in sorted(words, key=len, reverse=True):
        text = re.sub(rf"(?<![\wÀ-ỹ*]){re.escape(w)}(?![\wÀ-ỹ*])", " ", text, flags=re.I)
    text = re.sub(r"\s+([,.!?…])", r"\1", text)
    text = re.sub(r"([,.!?])\1+", r"\1", text)
    return re.sub(r"\s{2,}", " ", text).strip(" ,")


def shorten_rule(text: str, max_chars: int) -> str:
    """Rút gọn câu không cần AI: bỏ từ đệm trước, sau đó bỏ hư từ cho tới khi đủ ngắn."""
    from .subtitles import plain
    out = _drop(text, _FILLERS)
    if len(plain(out)) > max_chars:
        for w in _SOFT:
            if len(plain(out)) <= max_chars:
                break
            out = _drop(out, [w])
    if not plain(out):
        return text
    return out[0].upper() + out[1:]


def shorten_lines(items: list[dict], settings: dict) -> dict[int, str]:
    """Viết lại câu dịch ngắn hơn để giọng đọc kịp thời lượng.

    items: {id, text, src, max_chars, seconds}. Trả về {id: câu mới}.
    """
    provider = config.guard_translator(settings.get("translator", "google"), settings)
    if not items:
        return {}
    if provider in ("google", "offline"):  # không có AI → rút gọn theo luật, miễn phí, chạy tức thì
        return {it["id"]: shorten_rule(it["text"], it["max_chars"]) for it in items}
    system = (
        "Bạn biên tập phụ đề lồng tiếng tiếng Việt. Mỗi câu dưới đây đọc không kịp trong thời lượng cho phép. "
        "Viết lại NGẮN HƠN, không vượt max_chars ký tự, giữ ý chính, cảm xúc và cách xưng hô; "
        "bỏ từ đệm, từ lặp, chủ ngữ hiển nhiên. Đối chiếu câu gốc (src) để không sai nghĩa. "
        "Nếu câu có từ được bọc *dấu sao* thì giữ dấu sao quanh từ quan trọng nhất. "
        f"Văn phong: {settings.get('style_prompt') or 'tự nhiên'}. "
        'Trả JSON {"lines":[{"id":1,"t":"..."}]}.'
    )
    out: dict[int, str] = {}
    for start in range(0, len(items), 40):
        part = items[start:start + 40]
        raw = llm_complete(provider, system, json.dumps(part, ensure_ascii=False), settings, schema=SHORT_SCHEMA)
        data = _extract_json(raw)
        rows = data["lines"] if isinstance(data, dict) else data
        for r in rows:
            try:
                t = str(r.get("t", "")).strip()
                if t:
                    out[int(r["id"])] = t
            except (KeyError, ValueError, TypeError):
                continue
    return out


CAPTION_SCHEMA = {
    "type": "object",
    "properties": {
        "titles": {"type": "array", "items": {"type": "string"}},
        "description": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "hook": {"type": "string"},
    },
    "required": ["titles", "description", "hashtags", "hook"],
    "additionalProperties": False,
}


def generate_caption(title: str, transcript: str, settings: dict, platform: str = "TikTok") -> dict:
    provider = config.guard_translator(settings.get("translator", "google"), settings)
    if provider in ("google", "offline"):
        words = [w for w in re.findall(r"\w+", title.lower()) if len(w) > 3][:3]
        return {"titles": [title], "description": title,
                "hashtags": ["#xuhuong", "#fyp", "#viral"] + [f"#{w}" for w in words], "hook": "",
                "note": "Chọn Gemini (gói miễn phí) hoặc Ollama (chạy trên máy) trong Cài đặt để AI viết caption hay hơn."}
    system = ("Bạn là chuyên gia viết nội dung mạng xã hội Việt Nam. Viết bằng tiếng Việt, tự nhiên, "
              "gây tò mò nhưng không giật tít sai sự thật. Trả JSON đúng schema.")
    user = (f"Nền tảng: {platform}\nTiêu đề hiện tại: {title}\nNội dung lời thoại (đã dịch):\n{transcript[:4000]}\n\n"
            "Hãy viết: 3 tiêu đề (≤ 80 ký tự) khác nhau, 1 mô tả 2-3 câu, 8 hashtag phù hợp (có dấu #), "
            "và 1 câu hook mở đầu ≤ 12 từ.")
    data = _extract_json(llm_complete(provider, system, user, settings, schema=CAPTION_SCHEMA))
    data["hashtags"] = [h if h.startswith("#") else "#" + h.replace(" ", "") for h in data.get("hashtags", [])]
    return data


def test_provider(provider: str, settings: dict) -> str:
    seg = [{"src": "你好，今天我们来尝尝这家店。", "start": 0, "end": 2.5}]
    return translate_segments(seg, settings, provider=provider)[0]
