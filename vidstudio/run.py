"""Khởi động VieDub Studio: python run.py [--port 8765] [--no-browser] [--window]"""
from __future__ import annotations

import argparse
import socket
import threading
import time
import webbrowser


def free_port(preferred: int) -> int:
    for port in [preferred, *range(preferred + 1, preferred + 20)]:
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred


def main():
    ap = argparse.ArgumentParser(description="VieDub Studio")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--window", action="store_true", help="Mở trong cửa sổ riêng (cần pywebview)")
    args = ap.parse_args()

    import uvicorn
    port = free_port(args.port)
    url = f"http://{args.host if args.host != '0.0.0.0' else '127.0.0.1'}:{port}"
    config = uvicorn.Config("app.main:app", host=args.host, port=port, log_level="warning")
    server = uvicorn.Server(config)
    from app import __author__, __version__
    print(f"\n  VieDub Studio {__version__} — tác giả {__author__}\n  Đang chạy tại {url}\n  Nhấn Ctrl+C để tắt.\n")

    if args.window:
        try:
            import webview  # type: ignore
        except ImportError:
            print("Chưa cài pywebview → mở bằng trình duyệt.")
            args.window = False
    if args.window:
        threading.Thread(target=server.run, daemon=True).start()
        time.sleep(1.2)
        webview.create_window("VieDub Studio", url, width=1440, height=900, min_size=(1100, 700))
        webview.start()
        return
    if not args.no_browser:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    server.run()


if __name__ == "__main__":
    main()
