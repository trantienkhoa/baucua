# Cầu nối giọng đọc VieNeu-TTS cho game "Ngọn Đèn Cuối Cùng"
#
# Cài một lần:   pip install vieneu          (cần Python 3.10 trở lên, chạy được bằng CPU)
# Chạy:          python giong-ma.py          (hoặc bấm đúp ChayGiongMa.bat ở thư mục game)
#
# Máy chủ game gọi vào đây để đọc lời kể; hiệu ứng rùng rợn (hạ giọng, vang, tiếng vọng)
# do màn game tự thêm, chỉnh ở trang điều khiển → "Độ rợn của giọng".
#
# Tuỳ chọn:  --port 3399   --nano (mô hình nhẹ cho máy yếu)   --int8 (nhanh hơn trên CPU đời mới)
import argparse, json, os, sys, tempfile, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=3399)
ap.add_argument('--host', default='127.0.0.1')
ap.add_argument('--nano', action='store_true', help='dùng VieNeu v3 Nano (nhẹ, cho máy yếu)')
ap.add_argument('--int8', action='store_true', help='chạy int8 (CPU có VNNI)')
args = ap.parse_args()

try:
    from vieneu import Vieneu
except ImportError:
    print('Chưa cài VieNeu. Chạy:  pip install vieneu')
    sys.exit(1)

print('Đang nạp mô hình VieNeu-TTS (lần đầu sẽ tải về, hơi lâu)…')
kw = {}
if args.nano: kw['mode'] = 'v3nano'
if args.int8: kw['precision'] = 'int8'
tts = Vieneu(**kw)
lock = threading.Lock()

def voice_labels():
    try:
        return [v[0] if isinstance(v, (list, tuple)) else str(v) for v in tts.list_preset_voices()]
    except Exception:
        return []

VOICES = voice_labels()
print('Giọng có sẵn:', ', '.join(VOICES) or '(không đọc được danh sách)')

def synth(text, voice):
    fd, path = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    try:
        with lock:   # mô hình chỉ đọc một câu một lúc
            audio = tts.infer(text, voice=voice) if voice else tts.infer(text)
            tts.save(audio, path)
        with open(path, 'rb') as f:
            return f.read()
    finally:
        try: os.remove(path)
        except OSError: pass

class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path == '/health':
            return self._send(200, b'ok', 'text/plain')
        if u.path == '/voices':
            return self._send(200, json.dumps(VOICES, ensure_ascii=False).encode('utf8'), 'application/json; charset=utf-8')
        if u.path == '/tts':
            text = (q.get('text') or [''])[0].strip()[:400]
            voice = (q.get('voice') or [''])[0].strip()
            if voice and VOICES and voice not in VOICES: voice = ''
            if not text: return self._send(400, b'missing text', 'text/plain')
            try:
                return self._send(200, synth(text, voice), 'audio/wav')
            except Exception as e:
                print('Lỗi đọc:', e)
                return self._send(500, str(e).encode('utf8'), 'text/plain; charset=utf-8')
        self._send(404, b'not found', 'text/plain')

    def log_message(self, fmt, *a):
        pass

print(f'Giọng ma đã sẵn sàng: http://{args.host}:{args.port}  (giữ cửa sổ này mở khi LIVE)')
ThreadingHTTPServer((args.host, args.port), H).serve_forever()
