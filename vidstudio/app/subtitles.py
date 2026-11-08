"""Phụ đề: đọc/ghi SRT, dựng ASS theo kiểu, ngắt dòng, kiểm tra chất lượng."""
from __future__ import annotations

import re
from typing import Iterable

CJK = re.compile(r"[㐀-鿿豈-﫿]")
MARK = re.compile(r"\*([^*]+)\*")


def plain(text: str) -> str:
    """Bỏ dấu *nhấn mạnh* để đọc TTS / xuất SRT."""
    return MARK.sub(r"\1", text or "").strip()


# ---------------- SRT ----------------

def _ts(t: float, sep: str = ",") -> str:
    t = max(0.0, t)
    h, rem = divmod(int(round(t * 1000)), 3600_000)
    m, rem = divmod(rem, 60_000)
    s, ms = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def _parse_ts(s: str) -> float:
    s = s.strip().replace(",", ".")
    parts = s.split(":")
    sec = 0.0
    for p in parts:
        sec = sec * 60 + float(p)
    return sec


def parse_srt(text: str) -> list[dict]:
    blocks = re.split(r"\n\s*\n", text.replace("\r\n", "\n").replace("﻿", "").strip())
    out = []
    for b in blocks:
        lines = [ln for ln in b.split("\n") if ln.strip()]
        for i, ln in enumerate(lines):
            if "-->" in ln:
                a, z = ln.split("-->")
                body = " ".join(lines[i + 1:]).strip()
                body = re.sub(r"<[^>]+>|\{[^}]+\}", "", body)
                if body:
                    out.append({"start": _parse_ts(a), "end": _parse_ts(z.split()[0]), "text": body})
                break
    return out


def to_srt(items: Iterable[tuple[float, float, str]]) -> str:
    rows = []
    for i, (a, b, t) in enumerate(items, 1):
        rows.append(f"{i}\n{_ts(a)} --> {_ts(b)}\n{t}\n")
    return "\n".join(rows)


# ---------------- ASS ----------------

PRESETS = {
    "classic": {"label": "Cổ điển"},
    "movie": {"label": "Phim"},
    "box": {"label": "Nền hộp"},
    "tiktok": {"label": "TikTok"},
    "karaoke": {"label": "Karaoke"},
    "pop": {"label": "Pop"},
}


def ass_color(hex_color: str, alpha: float = 0.0) -> str:
    h = (hex_color or "#FFFFFF").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = h[0:2], h[2:4], h[4:6]
    a = int(max(0.0, min(1.0, alpha)) * 255)
    return f"&H{a:02X}{b}{g}{r}".upper()


def wrap(text: str, max_chars: int) -> list[str]:
    """Ngắt dòng cân đối: ưu tiên 2 dòng đều nhau, câu quá dài thì ngắt tham lam."""
    words = text.split()
    if len(plain(text)) <= max_chars or len(words) < 2:
        return [text]
    best, best_diff = None, 10 ** 9
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        la, lb = len(plain(a)), len(plain(b))
        if max(la, lb) > max_chars:
            continue
        diff = abs(la - lb) - (6 if words[i - 1][-1:] in ",.;:!?" else 0)
        if diff < best_diff:
            best, best_diff = [a, b], diff
    if best:
        return best
    lines, cur = [], ""
    for w in words:
        if cur and len(plain(cur + " " + w)) > max_chars:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


def font_px(style: dict, width: int, height: int) -> int:
    """Cỡ chữ theo % cạnh ngắn của khung hình (đồng nhất cho video dọc và ngang)."""
    return max(10, int(min(width, height) * float(style.get("size", 5.0)) / 100))


def line_chars(style: dict, width: int, size: int) -> int:
    fit = int(width * 0.88 / (size * 0.55))
    return max(8, min(int(style.get("max_chars", 32)), fit))


_PUNCT = re.compile(r"[^\w]+", re.U)


def _norm(w: str) -> str:
    return _PUNCT.sub("", w.lower())


def align_words(text: str, words: list | None) -> list[float] | None:
    """Ghép mốc thời gian chữ của giọng đọc với từng từ hiển thị.

    Trả về danh sách [bắt đầu, ...] + [kết thúc chữ cuối], hoặc None nếu không khớp.
    """
    if not words:
        return None
    disp = [w for w in plain(text).split() if _norm(w)]
    toks = [(a, b, _norm(t)) for a, b, t in words if _norm(t)]
    out, j = [], 0
    for w in disp:
        target, acc, first = _norm(w), "", None
        while j < len(toks) and len(acc) < len(target):
            if first is None:
                first = toks[j][0]
            acc += toks[j][2]
            j += 1
        if acc != target or first is None:
            return None
        out.append(first)
    if not out:
        return None
    return out + [toks[j - 1][1]]


def _escape(t: str) -> str:
    return t.replace("\\", "\\\\").replace("{", "(").replace("}", ")")


def _styled_text(text: str, preset: str, st: dict, dur: float, max_chars: int,
                 kara: list[float] | None = None, seg_start: float = 0.0) -> str:
    hl = ass_color(st.get("highlight", "#FFD400"))
    base = ass_color(st.get("color", "#FFFFFF"))
    if st.get("uppercase") or preset == "pop":
        text = text.upper()
    lines = wrap(text, max_chars)
    if preset == "karaoke" and kara:
        # khớp đúng lúc giọng đọc nói tới từng chữ
        idx, out = 0, []
        first_delay = max(0, int(round((kara[0] - seg_start) * 100)))
        for li, line in enumerate(lines):
            parts = []
            for w in line.split():
                word = _escape(w.replace("*", ""))
                if not _norm(w):
                    parts.append(word)
                    continue
                k = max(1, int(round((kara[idx + 1] - kara[idx]) * 100))) if idx + 1 < len(kara) else 1
                parts.append(f"{{\\kf{k}}}{word}")
                idx += 1
            prefix = f"{{\\k{first_delay}}}" if li == 0 and first_delay else ""
            out.append(prefix + " ".join(parts))
        return "\\N".join(out)
    if preset == "karaoke":
        words = " ".join(lines).split()
        total = sum(len(plain(w)) + 1 for w in words) or 1
        cs_total = max(1, int(dur * 100))
        out = []
        for li, line in enumerate(lines):
            parts = []
            for w in line.split():
                k = max(1, int(cs_total * (len(plain(w)) + 1) / total))
                parts.append(f"{{\\kf{k}}}{_escape(w.replace('*', ''))}")
            out.append(" ".join(parts))
        return "\\N".join(out)
    rendered = []
    for line in lines:
        line = _escape(line)
        if preset in ("tiktok", "pop", "karaoke"):
            line = MARK.sub(lambda m: f"{{\\c{hl}}}{m.group(1)}{{\\c{base}}}", line)
        else:
            line = plain(line)
        rendered.append(line)
    return "\\N".join(rendered)


def build_ass(segments: list[dict], style: dict, width: int, height: int,
              time_map=None, show_source: bool = False) -> str:
    """time_map(t) -> t' hoặc None (đoạn đã bị cắt)."""
    st = style
    preset = st.get("preset", "tiktok")
    size = font_px(st, width, height)
    font = st.get("font", "Arial")
    bold = -1 if st.get("bold", True) else 0
    primary = ass_color(st.get("color", "#FFFFFF"))
    secondary = ass_color(st.get("highlight", "#FFD400"))
    outline_c = ass_color(st.get("outline_color", "#000000"))
    outline = float(st.get("outline", 3)) * height / 1080
    shadow = 0.0
    border_style = 1
    back = ass_color("#000000", 0.5)
    if preset == "movie":
        primary = ass_color(st.get("color") if st.get("color", "#FFFFFF").upper() != "#FFFFFF" else "#FFF4C2")
        shadow = 2 * height / 1080
    elif preset == "box":
        border_style = 3
        outline_c = ass_color(st.get("box_color", "#000000"), 1 - float(st.get("box_opacity", 0.6)))
        back = outline_c
        outline = max(6, outline * 2)
    elif preset == "pop":
        size = int(size * 1.15)
        outline = outline * 1.6
    elif preset == "karaoke":
        # \kf: chữ chuyển từ màu SecondaryColour sang PrimaryColour
        primary, secondary = secondary, primary
    chars = line_chars(st, width, size)
    if st.get("uppercase") or preset == "pop":
        chars = max(8, int(chars * 0.85))
    x = width // 2
    y = int(height * float(st.get("pos_y", 0.8)))
    src_size = int(size * 0.62)

    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,{font},{size},{primary},{secondary},{outline_c},{back},{bold},0,0,0,100,100,0,0,{border_style},{outline:.1f},{shadow:.1f},5,20,20,20,1
Style: Src,{font},{src_size},{ass_color('#FFFFFF')},{secondary},{ass_color('#000000')},{back},0,0,0,0,100,100,0,0,1,{max(1.0, outline * 0.6):.1f},0,5,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def ass_ts(t: float) -> str:
        t = max(0.0, t)
        cs = int(round(t * 100))
        h, cs = divmod(cs, 360000)
        m, cs = divmod(cs, 6000)
        s, cs = divmod(cs, 100)
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    events = []
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text or seg.get("hidden"):
            continue
        a, b = float(seg["start"]), float(seg["end"])
        if time_map:
            a2, b2 = time_map(a), time_map(b)
            if a2 is None and b2 is None:
                continue
            a = a2 if a2 is not None else b2
            b = b2 if b2 is not None else a2
            if b - a < 0.05:
                continue
        kara = seg.get("kara") if seg.get("tts_key") else None
        body = _styled_text(text, preset, st, b - a, chars, kara, float(seg["start"]))
        anim = ""
        if preset == "pop":
            anim = "{\\fscx80\\fscy80\\t(0,120,\\fscx108\\fscy108)\\t(120,200,\\fscx100\\fscy100)}"
        elif preset == "tiktok":
            anim = "{\\fad(60,40)}"
        events.append(f"Dialogue: 1,{ass_ts(a)},{ass_ts(b)},Main,,0,0,0,,{{\\pos({x},{y})}}{anim}{body}")
        if show_source and seg.get("src"):
            sy = y - int(size * (0.6 * len(wrap(text, chars)) + 0.6))
            events.append(f"Dialogue: 0,{ass_ts(a)},{ass_ts(b)},Src,,0,0,0,,{{\\pos({x},{sy})}}{_escape(seg['src'])}")
    return head + "\n".join(events) + "\n"


# ---------------- Kiểm tra chất lượng ----------------

def quality_check(segments: list[dict], max_speed: float = 1.4) -> dict:
    issues = []
    score = 100.0
    n = max(1, len(segments))
    for i, s in enumerate(segments):
        sid = s.get("id", i)
        text = plain(s.get("text", ""))
        dur = max(0.01, float(s["end"]) - float(s["start"]))
        if not text:
            issues.append({"id": sid, "level": "error", "msg": "Chưa có bản dịch"})
            score -= 300 / n
            continue
        if CJK.search(text):
            issues.append({"id": sid, "level": "error", "msg": "Còn chữ Trung chưa dịch"})
            score -= 200 / n
        cps = len(text) / dur
        if cps > 22:
            issues.append({"id": sid, "level": "warn", "msg": f"Chữ chạy quá nhanh ({cps:.0f} ký tự/giây)"})
            score -= 60 / n
        if dur < 0.5:
            issues.append({"id": sid, "level": "warn", "msg": "Câu hiện quá ngắn (< 0,5 giây)"})
            score -= 30 / n
        if len(text) > 90:
            issues.append({"id": sid, "level": "warn", "msg": "Câu quá dài, nên tách đôi"})
            score -= 40 / n
        rate = float(s.get("rate") or 1.0)
        if rate >= max_speed - 0.01 and s.get("tts_dur"):
            issues.append({"id": sid, "level": "warn", "msg": f"Giọng phải đọc nhanh {rate:.2f}x — nên rút gọn câu"})
            score -= 50 / n
        if i + 1 < len(segments) and float(segments[i + 1]["start"]) < float(s["end"]) - 0.05:
            issues.append({"id": sid, "level": "warn", "msg": "Chồng thời gian với câu sau"})
            score -= 30 / n
    return {"score": max(0, min(100, round(score))), "issues": issues}
