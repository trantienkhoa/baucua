"""Máy chủ web cục bộ: API + giao diện."""
from __future__ import annotations

import json
import os
import platform
import re
import shutil
import subprocess
import time
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from . import __version__, config, discover, media, ocr, pipeline, store, system, translate, tts
from .subtitles import PRESETS, parse_srt, plain, quality_check, to_srt

app = FastAPI(title="VieDub Studio", version=__version__)

PLATFORMS = [("bilibili", "Bilibili"), ("douyin", "Douyin"), ("ixigua", "Xigua"), ("kuaishou", "Kuaishou"),
             ("xiaohongshu", "Xiaohongshu"), ("xhslink", "Xiaohongshu"), ("youtube", "YouTube"),
             ("youtu.be", "YouTube"), ("tiktok", "TikTok"), ("weibo", "Weibo"), ("facebook", "Facebook")]


@app.on_event("startup")
def _startup():
    pipeline.start_worker()


def _proj(pid: str) -> dict:
    try:
        return store.load(pid)
    except KeyError:
        raise HTTPException(404, "Không tìm thấy video")


def _platform(url: str) -> str:
    low = url.lower()
    for k, v in PLATFORMS:
        if k in low:
            return v
    return "Web"


# ------------------------------------------------------------ meta & cài đặt

@app.get("/api/meta")
def meta():
    return {"version": __version__, "providers": config.PROVIDERS, "voices": config.all_voices(),
            "tts_providers": config.TTS_PROVIDERS,
            "presets": {k: v["label"] for k, v in PRESETS.items()}, "categories": discover.CATEGORIES,
            "stages": pipeline.STAGES, "ratios": ["source", "9:16", "1:1", "16:9", "4:5"],
            "data_dir": str(config.DATA_DIR), "exports_dir": str(config.EXPORTS_DIR),
            "config_file": str(config.SETTINGS_FILE)}


@app.get("/api/system")
def system_check():
    return system.check()


@app.get("/api/settings")
def get_settings():
    return {"settings": config.load_settings(), "is_default": config.is_default_settings(),
            "keys": config.masked_keys()}


@app.put("/api/settings")
def put_settings(data: dict = Body(...)):
    return {"settings": config.save_settings(data)}


@app.post("/api/settings/reset")
def reset_settings():
    return {"settings": config.reset_settings()}


@app.post("/api/keys")
def save_key(data: dict = Body(...)):
    prov = data.get("provider")
    if prov not in config.PROVIDERS and prov not in config.TTS_PROVIDERS and prov != "huggingface":
        raise HTTPException(400, "Nhà cung cấp không hợp lệ")
    config.save_key(prov, data.get("key", ""))
    return {"keys": config.masked_keys()}


@app.post("/api/test-translate")
def test_translate(data: dict = Body(...)):
    s = config.load_settings()
    if data.get("model"):
        s["models"][data["provider"]] = data["model"]
    try:
        return {"ok": True, "text": translate.test_provider(data.get("provider") or s["translator"], s)}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)}


@app.post("/api/voices/download")
def download_voice(data: dict = Body(default={})):
    model = data.get("model") or config.PIPER_DEFAULT
    if not tts.piper_available():
        raise HTTPException(400, "Chưa cài giọng offline: pip install piper-tts")
    try:
        tts.piper_download(model)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, str(e))
    return {"ok": True}


@app.get("/api/voices/status")
def voice_status():
    return {"piper": tts.piper_available(),
            "downloaded": [v["id"].split(":", 1)[1] for v in config.VOICES if v["provider"] == "piper"
                           and tts.piper_model(v["id"].split(":", 1)[1]).exists()]}


@app.post("/api/recipes")
def save_recipe(data: dict = Body(...)):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Thiếu tên công thức")
    s = config.load_settings()
    recipe = data.get("values") or {k: s[k] for k in ("translator", "dub", "voice_default", "tts_rate", "orig_volume",
                                                        "hardsub", "output_ratio", "flip", "speed", "burn_subs",
                                                        "style", "style_prompt", "separate_music")}
    s["recipes"][name] = recipe
    config.save_settings(s)
    return {"recipes": s["recipes"]}


@app.delete("/api/recipes/{name}")
def delete_recipe(name: str):
    s = config.load_settings()
    s["recipes"].pop(name, None)
    config.save_settings(s)
    return {"recipes": s["recipes"]}


def _apply_recipe(settings: dict, recipe: str, overrides: dict | None) -> dict:
    s = dict(settings)
    if recipe and recipe in s.get("recipes", {}):
        for k, v in s["recipes"][recipe].items():
            s[k] = v
    for k, v in (overrides or {}).items():
        if k in s and v is not None:
            s[k] = v
    return s


# ------------------------------------------------------------ tạo dự án

@app.post("/api/projects")
def create_projects(data: dict = Body(...)):
    urls = [u.strip() for u in re.split(r"[\s,]+", data.get("urls", "") if isinstance(data.get("urls"), str)
                                         else " ".join(data.get("urls", []))) if u.strip().startswith("http")]
    if not urls:
        raise HTTPException(400, "Hãy dán ít nhất một đường link video")
    s = _apply_recipe(config.load_settings(), data.get("recipe", ""), data.get("overrides"))
    created = []
    for u in urls[:50]:
        proj = store.new_project(title=data.get("title") or "Đang lấy tiêu đề…", source_url=u,
                                 platform=_platform(u), settings=s, recipe=data.get("recipe", ""))
        if data.get("title_vi"):
            proj["title"] = data["title_vi"]
        if data.get("title_src"):
            proj["title_src"] = data["title_src"]
        proj["source_mode"] = data.get("source_mode", "asr")
        store.save(proj)
        _enqueue(proj["id"], "full", {"render": data.get("auto_render", True)})
        created.append(proj["id"])
    return {"ids": created}


@app.post("/api/projects/upload")
async def upload_projects(files: list[UploadFile] = File(...), srt: UploadFile | None = File(None),
                          options: str = Form("{}")):
    opts = json.loads(options or "{}")
    s = _apply_recipe(config.load_settings(), opts.get("recipe", ""), opts.get("overrides"))
    created = []
    for f in files:
        title = Path(f.filename or "video").stem
        proj = store.new_project(title=title, platform="Máy tính", settings=s, recipe=opts.get("recipe", ""))
        proj["title_src"] = title
        proj["source_mode"] = opts.get("source_mode", "asr")
        d = store.pdir(proj["id"])
        raw = d / ("upload" + (Path(f.filename or "").suffix or ".mp4"))
        with raw.open("wb") as out:
            shutil.copyfileobj(f.file, out, 1024 * 1024)
        if raw.suffix.lower() == ".mp4":
            raw.rename(d / "source.mp4")
        else:
            try:
                media.run_ffmpeg(["-i", str(raw), "-c:v", "copy", "-c:a", "aac", str(d / "source.mp4")])
            except media.MediaError:
                media.run_ffmpeg(["-i", str(raw), "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac",
                                  str(d / "source.mp4")])
            raw.unlink(missing_ok=True)
        if srt is not None and len(files) == 1:
            (d / "import.srt").write_bytes(await srt.read())
        store.save(proj)
        _enqueue(proj["id"], "full", {"render": opts.get("auto_render", True)})
        created.append(proj["id"])
    return {"ids": created}


# ------------------------------------------------------------ dự án

@app.get("/api/projects")
def list_projects():
    return [pipeline.overlay_live(p) for p in store.list_projects()]


def _enqueue(pid: str, kind: str, opts: dict | None = None) -> None:
    try:
        pipeline.enqueue(pid, kind, opts)
    except pipeline.Busy as e:
        raise HTTPException(409, str(e))


@app.get("/api/projects/{pid}")
def get_project(pid: str):
    proj = pipeline.overlay_live(_proj(pid))
    proj["busy"] = pipeline.is_busy(pid)
    proj["qa"] = quality_check(proj["segments"], float(proj["settings"].get("max_speed", 1.4))) \
        if proj["segments"] else proj.get("qa")
    return proj


EDITABLE = {"segments", "style", "settings", "trim", "cuts", "title", "source_mode", "folder", "next_id", "caption"}


@app.put("/api/projects/{pid}")
def put_project(pid: str, data: dict = Body(...)):
    busy = pipeline.is_busy(pid)
    with store.lock(pid):
        proj = _proj(pid)
        for k, v in data.items():
            # đang xử lý thì không nhận danh sách câu (tránh ghi đè lẫn nhau với tiến trình nền)
            if k in EDITABLE and not (busy and k in ("segments", "next_id")):
                proj[k] = v
        if "segments" in data and not busy:
            proj["segments"].sort(key=lambda s: float(s["start"]))
            proj["next_id"] = max([proj.get("next_id", 1)] + [int(s["id"]) + 1 for s in proj["segments"]])
        if not busy and proj["status"] == "done" and data.keys() & {"segments", "style", "settings", "trim", "cuts"}:
            proj["status"] = "ready"
            proj["message"] = "Có thay đổi chưa xuất lại"
        store.save(proj)
    out = get_project(pid)
    out["segments_locked"] = busy and "segments" in data
    return out


@app.delete("/api/projects/{pid}")
def delete_project(pid: str):
    pipeline.cancel(pid)
    store.delete(pid)
    return {"ok": True}


@app.post("/api/projects/{pid}/duplicate")
def duplicate_project(pid: str):
    _proj(pid)
    return store.duplicate(pid)


@app.post("/api/projects/{pid}/retry")
def retry_project(pid: str, data: dict = Body(default={})):
    proj = _proj(pid)
    if pipeline.is_busy(pid):
        raise HTTPException(409, "Video đang được xử lý")
    if data.get("from_scratch"):
        proj["segments"] = []
        proj.pop("hardsub_times", None)
        store.save(proj)
    _enqueue(pid, "full", {"render": True})
    return {"ok": True}


@app.post("/api/projects/{pid}/cancel")
def cancel_project(pid: str):
    return {"ok": pipeline.cancel(pid)}


@app.post("/api/projects/{pid}/run")
def run_project(pid: str, data: dict = Body(default={})):
    proj = _proj(pid)
    if not (store.pdir(pid) / "source.mp4").exists():
        raise HTTPException(400, "Video chưa tải xong")
    kind = data.get("kind", "update")
    if kind not in ("update", "render", "clip"):
        raise HTTPException(400, "Kiểu xử lý không hợp lệ")
    if not proj["segments"] and proj.get("kind") != "merge":
        raise HTTPException(400, "Chưa có phụ đề")
    _enqueue(pid, kind, {k: data[k] for k in ("clip", "retranslate_ids", "revoice", "no_render", "draft") if k in data})
    return {"ok": True}


@app.post("/api/projects/{pid}/translate-line")
def translate_line(pid: str, data: dict = Body(...)):
    proj = _proj(pid)
    seg = next((s for s in proj["segments"] if s["id"] == data.get("id")), None)
    if not seg:
        raise HTTPException(404, "Không tìm thấy câu")
    s = {**config.load_settings(), **proj["settings"]}
    idx = proj["segments"].index(seg)
    ctx = proj["segments"][max(0, idx - 3): idx + 4]
    try:
        if s["translator"] in ("google", "offline"):
            res = translate.translate_segments([seg], s)
            return {"text": res[0]}
        prompt_segs = [dict(x, src=x["src"]) for x in ctx]
        res = translate.translate_segments(prompt_segs, s, highlight=proj["style"].get("preset") in ("tiktok", "pop"),
                                           context_title=proj.get("title_src", ""))
        return {"text": res[ctx.index(seg)]}
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, str(e))


@app.post("/api/projects/{pid}/tts-line")
def tts_line(pid: str, data: dict = Body(...)):
    proj = _proj(pid)
    s = proj["settings"]
    text = data.get("text") or ""
    if not plain(text):
        raise HTTPException(400, "Câu trống")
    seg = {"voice": data.get("voice", ""), "speaker": data.get("speaker", "female")}
    voice = pipeline.voice_for(seg, s)
    rate = int(s.get("tts_rate", 0)) + int(round((float(data.get("speed") or 1.0) - 1) * 100))
    key = tts.tts_key(text, voice, rate)
    out = store.pdir(pid) / "tts" / f"preview-{key}.mp3"
    try:
        tts.synthesize([(text, voice, rate, out)])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, str(e))
    return {"url": f"/media/{pid}/tts/{out.name}", "duration": media.probe(out)["duration"]}


@app.post("/api/projects/{pid}/caption")
def make_caption(pid: str, data: dict = Body(default={})):
    proj = _proj(pid)
    transcript = "\n".join(plain(s.get("text", "")) for s in proj["segments"])
    s = {**config.load_settings(), **proj["settings"]}
    try:
        cap = translate.generate_caption(proj.get("title", ""), transcript, s, data.get("platform", "TikTok"))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, str(e))
    store.update(pid, caption=cap)
    return cap


@app.post("/api/projects/{pid}/detect-region")
def detect_region(pid: str):
    proj = _proj(pid)
    if not ocr.available():
        raise HTTPException(400, "Chưa cài OCR (pip install rapidocr-onnxruntime) — hãy kéo khung vùng sub bằng tay")
    info = {"duration": proj["duration"], "width": proj["width"], "height": proj["height"]}
    region = ocr.detect_region(store.pdir(pid) / "source.mp4", info)
    if not region:
        raise HTTPException(404, "Không thấy phụ đề cứng trong video")
    return region


@app.get("/api/projects/{pid}/peaks")
def peaks(pid: str):
    d = store.pdir(pid)
    out = {"per_second": 40}
    for k in ("orig", "dub"):
        f = d / f"peaks_{k}.json"
        out[k] = json.loads(f.read_text()) if f.exists() else []
    return out


@app.get("/api/projects/{pid}/srt")
def export_srt(pid: str, which: str = "text"):
    proj = _proj(pid)
    rows = [(s["start"], s["end"], plain(s.get(which, "") or "")) for s in proj["segments"]]
    name = media.safe_name(proj["title"]) + (".zh" if which == "src" else "") + ".srt"
    return Response(to_srt(rows), media_type="application/x-subrip",
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{_q(name)}"})


@app.post("/api/projects/{pid}/srt")
async def import_srt(pid: str, file: UploadFile = File(...), target: str = Form("text")):
    proj = _proj(pid)
    rows = parse_srt((await file.read()).decode("utf-8", "replace"))
    if not rows:
        raise HTTPException(400, "File SRT rỗng hoặc sai định dạng")
    nid = proj["next_id"]
    segs = []
    for r in rows:
        segs.append({"id": nid, "start": r["start"], "end": r["end"], "src": r["text"] if target == "src" else "",
                     "text": r["text"] if target == "text" else "", "speaker": "female", "voice": "", "speed": 1.0})
        nid += 1
    store.update(pid, segments=segs, next_id=nid, status="ready")
    return get_project(pid)


@app.get("/api/projects/{pid}/frame")
def frame(pid: str, t: float = 0.0, w: int = 1080):
    d = store.pdir(pid)
    src = d / "source.mp4"
    if not src.exists():
        raise HTTPException(404)
    out = config.CACHE_DIR / f"frame-{pid}-{int(t * 10)}-{w}.jpg"
    if not out.exists():
        media.thumbnail(src, out, t, width=w)
    return FileResponse(out, media_type="image/jpeg")


def _q(s: str) -> str:
    from urllib.parse import quote
    return quote(s)


@app.get("/media/{pid}/{path:path}")
def media_file(pid: str, path: str, download: int = 0):
    base = store.pdir(pid).resolve()
    f = (base / path).resolve()
    if base not in f.parents or not f.is_file():
        raise HTTPException(404)
    headers = {}
    if download:
        try:
            title = store.load(pid).get("title", "video")
        except KeyError:
            title = "video"
        name = media.safe_name(title) + f.suffix
        headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{_q(name)}"
    return FileResponse(f, headers=headers)


# ------------------------------------------------------------ khám phá

@app.get("/api/discover")
def api_discover(category: str = "Gợi ý cho bạn", refresh: int = 0):
    try:
        return {"items": discover.trending(category, bool(refresh)), "updated": time.time()}
    except Exception as e:  # noqa: BLE001
        return JSONResponse({"items": [], "error": f"Không lấy được danh sách: {e}"}, status_code=200)


@app.get("/api/discover/search")
def api_search(q: str):
    try:
        return {"items": discover.search(q)}
    except Exception as e:  # noqa: BLE001
        return {"items": [], "error": f"Tìm kiếm lỗi: {e}"}


@app.get("/api/discover/saved")
def api_saved():
    return {"items": discover.saved()}


@app.post("/api/discover/saved")
def api_toggle_saved(item: dict = Body(...)):
    return {"saved": discover.toggle_saved(item)}


# ------------------------------------------------------------ ghép video

@app.post("/api/merge")
def merge(data: dict = Body(...)):
    files = []
    for pid in data.get("ids", []):
        d = store.pdir(pid)
        out = d / "output.mp4"
        files.append(str(out if out.exists() else d / "source.mp4"))
    if len(files) < 2:
        raise HTTPException(400, "Chọn ít nhất 2 video để ghép")
    proj = store.new_project(title=data.get("title") or f"Ghép {len(files)} video", platform="Ghép")
    proj["kind"] = "merge"
    store.save(proj)
    _enqueue(proj["id"], "merge", {"files": files, "ratio": data.get("ratio", "9:16")})
    return {"id": proj["id"]}


# ------------------------------------------------------------ hàng đợi

@app.get("/api/jobs")
def jobs(since: float = 0):
    state = pipeline.queue_state()
    lanes = {"net": "Mạng", "asr": "Nhận dạng", "render": "Xuất video"}
    active = []
    for pid in list(state["running"]) + state["pending"]:
        try:
            p = pipeline.overlay_live(store.load(pid))
            row = {k: p.get(k) for k in ("id", "title", "status", "stage", "progress", "message")}
            row["lane"] = lanes.get(state["running"].get(pid, ""), "")
            active.append(row)
        except KeyError:
            pass
    return {"active": active, "events": pipeline.pop_events(since), "now": time.time()}


@app.post("/api/open-folder")
def open_folder(data: dict = Body(default={})):
    target = config.EXPORTS_DIR
    if data.get("pid"):
        target = store.pdir(data["pid"])
    try:
        if platform.system() == "Windows":
            os.startfile(str(target))  # type: ignore[attr-defined]
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", str(target)])
        else:
            subprocess.Popen(["xdg-open", str(target)])
        return {"ok": True}
    except Exception:  # noqa: BLE001
        return {"ok": False, "path": str(target)}


# ------------------------------------------------------------ giao diện

@app.get("/")
def index():
    return FileResponse(config.WEB_DIR / "index.html", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory=config.WEB_DIR), name="static")


@app.exception_handler(Exception)
async def unhandled(_, exc: Exception):
    return PlainTextResponse(str(exc), status_code=500)
