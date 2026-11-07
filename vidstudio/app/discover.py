"""Khám phá: lấy video thịnh hành / tìm kiếm trên Bilibili, chấm điểm "đáng làm"."""
from __future__ import annotations

import hashlib
import math
import re
import threading
import time

import httpx

from . import config, translate

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/130.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Referer": "https://www.bilibili.com/", "Accept": "application/json"}

# ánh xạ phân vùng Bilibili → chủ đề tiếng Việt
CATEGORY_MAP = [
    ("Ẩm thực", ["美食", "食", "吃", "厨"]),
    ("Thú cưng", ["动物", "宠物", "猫", "狗", "萌宠"]),
    ("Ô tô", ["汽车", "车", "赛车", "摩托"]),
    ("Game", ["游戏", "电竞", "手游", "单机"]),
    ("Anime", ["动画", "番剧", "国创", "MAD", "鬼畜"]),
    ("Âm nhạc", ["音乐", "翻唱", "演奏", "歌"]),
    ("Nhảy", ["舞蹈", "宅舞", "街舞"]),
    ("Phim", ["影视", "电影", "电视剧", "纪录片"]),
    ("Phim ngắn", ["短剧", "小剧场", "剧情", "搞笑"]),
    ("Kiến thức", ["知识", "科普", "人文", "社科", "财经", "校园"]),
    ("Công nghệ", ["科技", "数码", "手机", "电脑", "软件"]),
    ("AI", ["AI", "人工智能", "大模型"]),
    ("Thể thao", ["运动", "体育", "篮球", "足球", "健身"]),
    ("Du lịch", ["旅游", "出行", "风景"]),
    ("Nông thôn", ["三农", "农村", "乡村"]),
    ("Vlog", ["VLOG", "vlog", "日常", "生活"]),
    ("Thủ công", ["手工", "DIY", "手作"]),
    ("Thời trang", ["时尚", "穿搭", "美妆", "颜值"]),
    ("Sức khỏe", ["健康", "医学", "养生"]),
    ("Vẽ", ["绘画", "画", "插画"]),
    ("Tin tức", ["资讯", "热点", "新闻", "环球"]),
    ("Giải trí", ["娱乐", "综艺", "明星", "鬼畜"]),
    ("Ngoài trời", ["户外", "露营", "钓鱼", "野外"]),
]
CATEGORIES = ["Gợi ý cho bạn", "Đang hot"] + [c for c, _ in CATEGORY_MAP] + ["Khác", "Kinh điển"]

# phân vùng xếp hạng (rid) cho một số chủ đề
RANK_RID = {"Ẩm thực": 211, "Thú cưng": 217, "Ô tô": 223, "Game": 4, "Anime": 1, "Âm nhạc": 3, "Nhảy": 129,
            "Phim": 181, "Kiến thức": 36, "Công nghệ": 188, "Thể thao": 234, "Giải trí": 5,
            "Thời trang": 155, "Vlog": 160, "Phim ngắn": 138}

_cache: dict[str, tuple[float, list]] = {}
_title_cache: dict[str, str] = config.read_json(config.CACHE_DIR / "titles.json", {})
_lock = threading.Lock()
_client: httpx.Client | None = None


def _http() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(headers=HEADERS, timeout=20, follow_redirects=True)
        try:  # lấy cookie buvid3 để API tìm kiếm không chặn
            _client.get("https://www.bilibili.com/")
        except httpx.HTTPError:
            pass
    return _client


def _category(tname: str, title: str) -> str:
    text = f"{tname} {title}"
    for name, keys in CATEGORY_MAP:
        if any(k in text for k in keys):
            return name
    return "Khác"


def _parse_duration(v) -> int:
    if isinstance(v, (int, float)):
        return int(v)
    parts = [int(x) for x in str(v).split(":") if x.isdigit()]
    sec = 0
    for p in parts:
        sec = sec * 60 + p
    return sec


def _normalize(item: dict) -> dict:
    stat = item.get("stat") or {}
    views = int(stat.get("view") or item.get("play") or 0)
    likes = int(stat.get("like") or item.get("like") or 0)
    pub = int(item.get("pubdate") or item.get("pubtime") or 0)
    dim = item.get("dimension") or {}
    w, h = int(dim.get("width") or 0), int(dim.get("height") or 0)
    if dim.get("rotate"):
        w, h = h, w
    title = re.sub(r"<[^>]+>", "", item.get("title") or "")
    pic = item.get("pic") or ""
    if pic.startswith("//"):
        pic = "https:" + pic
    bvid = item.get("bvid") or ""
    owner = (item.get("owner") or {}).get("name") or item.get("author") or ""
    return {
        "id": bvid or str(item.get("aid")), "platform": "Bilibili", "title_src": title, "title": "",
        "url": f"https://www.bilibili.com/video/{bvid}" if bvid else item.get("arcurl", ""),
        "cover": pic, "duration": _parse_duration(item.get("duration")), "views": views, "likes": likes,
        "pubdate": pub, "author": owner, "tname": item.get("tname") or item.get("typename") or "",
        "category": _category(item.get("tname") or item.get("typename") or "", title),
        "vertical": bool(h and h > w), "width": w, "height": h,
    }


def _score(v: dict) -> dict:
    hours = max(1.0, (time.time() - v["pubdate"]) / 3600) if v["pubdate"] else 48.0
    vph = v["views"] / hours
    like_rate = v["likes"] / max(1, v["views"])
    d = v["duration"]
    dur_fit = 1.0 if 45 <= d <= 300 else (0.75 if d <= 600 else 0.4)
    s = (min(1.0, math.log10(vph + 1) / 5.0) * 45 + min(1.0, like_rate / 0.08) * 30 + dur_fit * 15
         + (10 if v["vertical"] else 4))
    tags = []
    if vph > 20000:
        tags.append("Lên rất nhanh")
    elif vph > 3000:
        tags.append("Đang lên")
    if like_rate > 0.05:
        tags.append("Tương tác cao")
    if v["vertical"]:
        tags.append("Video dọc")
    if d and d <= 180:
        tags.append("Ngắn, làm nhanh")
    v.update(score=max(1, min(100, round(s))), per_hour=round(vph), like_rate=round(like_rate, 4), tags=tags)
    return v


def _fetch(url: str, params: dict) -> dict:
    r = _http().get(url, params=params)
    r.raise_for_status()
    data = r.json()
    if data.get("code") not in (0, None):
        raise RuntimeError(data.get("message") or "Bilibili từ chối yêu cầu")
    return data.get("data") or {}


def _translate_titles(items: list[dict]) -> None:
    need = [v for v in items if v["title_src"] and v["title_src"] not in _title_cache]
    if need:
        settings = config.load_settings()
        try:
            res = translate.translate_texts([v["title_src"] for v in need], settings, "zh", "vi")
            with _lock:
                for v, t in zip(need, res):
                    _title_cache[v["title_src"]] = t
                config.write_json(config.CACHE_DIR / "titles.json", dict(list(_title_cache.items())[-3000:]))
        except Exception:  # noqa: BLE001 — chưa dịch được thì để tiêu đề gốc
            pass
    for v in items:
        v["title"] = _title_cache.get(v["title_src"], v["title_src"])


def trending(category: str = "Gợi ý cho bạn", refresh: bool = False) -> list[dict]:
    key = f"trend:{category}"
    hit = _cache.get(key)
    if hit and not refresh and time.time() - hit[0] < 600:
        return hit[1]
    items: list[dict] = []
    if category in RANK_RID:
        data = _fetch("https://api.bilibili.com/x/web-interface/ranking/v2", {"rid": RANK_RID[category], "type": "all"})
        items = [_normalize(x) for x in data.get("list", [])]
    elif category == "Kinh điển":
        data = _fetch("https://api.bilibili.com/x/web-interface/popular/precious", {"page_size": 60, "page": 1})
        items = [_normalize(x) for x in data.get("list", [])]
    else:
        for pn in (1, 2, 3):
            data = _fetch("https://api.bilibili.com/x/web-interface/popular", {"ps": 50, "pn": pn})
            items += [_normalize(x) for x in data.get("list", [])]
            if category in ("Gợi ý cho bạn", "Đang hot") and len(items) >= 60:
                break
        if category not in ("Gợi ý cho bạn", "Đang hot"):
            items = [v for v in items if v["category"] == category]
    seen, uniq = set(), []
    for v in items:
        if v["id"] not in seen:
            seen.add(v["id"])
            uniq.append(_score(v))
    if category == "Đang hot":
        uniq.sort(key=lambda v: v["per_hour"], reverse=True)
    uniq = uniq[:60]
    _translate_titles(uniq)
    _cache[key] = (time.time(), uniq)
    return uniq


def search(query: str) -> list[dict]:
    q = query.strip()
    if not q:
        return []
    key = "search:" + hashlib.md5(q.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 600:
        return hit[1]
    kw = q
    if not re.search(r"[㐀-鿿]", q):  # gõ tiếng Việt → dịch sang tiếng Trung để tìm
        try:
            kw = translate.translate_texts([q], config.load_settings(), "vi", "zh")[0]
        except Exception:  # noqa: BLE001
            kw = translate.google_translate([q], "vi", "zh-CN")[0]
    data = _fetch("https://api.bilibili.com/x/web-interface/search/type",
                  {"search_type": "video", "keyword": kw, "page": 1, "order": "totalrank"})
    items = [_score(_normalize(x)) for x in data.get("result", []) if x.get("type") == "video"]
    _translate_titles(items)
    _cache[key] = (time.time(), items)
    return items


def saved() -> list[dict]:
    return config.read_json(config.SAVED_FILE, [])


def toggle_saved(item: dict) -> bool:
    items = saved()
    ids = [x["id"] for x in items]
    if item["id"] in ids:
        items = [x for x in items if x["id"] != item["id"]]
        on = False
    else:
        items.insert(0, item)
        on = True
    config.write_json(config.SAVED_FILE, items[:500])
    return on
