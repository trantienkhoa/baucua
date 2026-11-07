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
