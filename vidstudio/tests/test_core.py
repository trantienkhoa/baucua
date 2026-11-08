"""Kiểm tra nhanh các hàm lõi không cần mạng: python -m pytest tests"""
from app import media, subtitles


def test_srt_roundtrip():
    srt = subtitles.to_srt([(1.0, 2.5, "Xin chào"), (3, 4.25, "Tạm biệt")])
    rows = subtitles.parse_srt(srt)
    assert [r["text"] for r in rows] == ["Xin chào", "Tạm biệt"]
    assert rows[1]["end"] == 4.25


def test_keep_ranges_and_remap():
    r = media.keep_ranges(20, {"start": 2, "end": 18}, [{"start": 5, "end": 7}])
    assert r == [(2, 5), (7, 18)]
    assert media.remap_time(2, r) == 0
    assert media.remap_time(8, r) == 4
    assert media.remap_time(6, r) == 3  # trong đoạn bị cắt → dồn về điểm cắt


def test_wrap_balanced():
    lines = subtitles.wrap("Mang nhiều tiền thế, khoe giàu với tôi à? Đâu có.", 30)
    assert len(lines) == 2 and all(len(x) <= 30 for x in lines)


def test_ass_highlight_and_cut():
    segs = [{"start": 1, "end": 3, "text": "Mang *nhiều tiền* thế"}, {"start": 5.5, "end": 6.5, "text": "bị cắt"}]
    r = media.keep_ranges(10, None, [{"start": 5, "end": 7}])
    ass = subtitles.build_ass(segs, {"preset": "tiktok", "highlight": "#FFD400"}, 1080, 1920,
                              time_map=lambda t: media.remap_time(t, r))
    assert "\\c&H0000D4FF&" in ass or "\\c&H0000D4FF" in ass
    assert "bị cắt" not in ass


def test_quality_check():
    qa = subtitles.quality_check([{"id": 1, "start": 0, "end": 1, "text": "这个没翻译"},
                                  {"id": 2, "start": 1, "end": 3, "text": "Ổn"}])
    assert qa["score"] < 100 and qa["issues"][0]["id"] == 1


def test_merge_and_remap_ranges():
    assert media.merge_ranges([(1, 2), (2.2, 3), (6, 7)], pad=0, gap=0.4) == [[1, 3], [6, 7]]
    keep = media.keep_ranges(10, None, [{"start": 4, "end": 6}])
    # khoảng 3–7 bị cắt mất 4–6 → còn 3–4 và 6–7, nối liền thành 3–5 trên thành phẩm
    assert media.remap_ranges([(3, 7)], keep) == [[3, 5]]


def test_duck_envelope():
    env = media.duck_envelope([(1, 2)], 4, low=0.1, high=0.8)
    sr = media.ENV_SR
    assert abs(env[int(1.5 * sr)] - 0.1) < 0.01   # giữa câu: nhỏ
    assert abs(env[int(3.5 * sr)] - 0.8) < 0.01   # lúc im: to lại


def test_align_words_and_karaoke():
    words = [[1.0, 1.2, "Mang"], [1.25, 1.45, "nhiều"], [1.5, 1.7, "tiền"], [1.8, 2.1, "thế"]]
    kara = subtitles.align_words("Mang *nhiều tiền* thế!", words)
    assert kara == [1.0, 1.25, 1.5, 1.8, 2.1]
    assert subtitles.align_words("Câu khác hẳn", words) is None
    seg = {"start": 0.8, "end": 2.5, "text": "Mang *nhiều tiền* thế!", "tts_key": "x", "kara": kara}
    ass = subtitles.build_ass([seg], {"preset": "karaoke"}, 1080, 1920)
    assert "{\\k20}{\\kf25}Mang" in ass


def test_draft_size():
    assert media.render_size({"width": 1080, "height": 1920}, {"_draft": True}) == (540, 960)
    assert media.render_size({"width": 1080, "height": 1920}, {}) == (1080, 1920)


def test_free_mode_never_calls_paid():
    from app import config, translate, pipeline
    s = {**config.DEFAULT_SETTINGS, "translator": "claude", "free_only": True}
    assert config.guard_translator("claude", s) == "google"
    assert config.guard_translator("gemini", s) == "gemini"
    try:
        translate.llm_complete("openai", "x", "y", s)
        assert False, "phải chặn"
    except translate.TranslateError:
        pass
    assert pipeline.voice_for({"voice": "fpt:leminh"}, {"free_only": True}) == "vi-VN-NamMinhNeural"
    assert pipeline.voice_for({"voice": "piper:vi_VN-vais1000-medium"}, {"free_only": True}).startswith("piper:")


def test_rule_shorten():
    from app.translate import shorten_rule
    out = shorten_rule("Thật ra thì tôi đã rất muốn đi cùng các bạn nhé.", 30)
    assert len(out) <= 30 and "nhé" not in out and out[0].isupper()
