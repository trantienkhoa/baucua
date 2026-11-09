"""ChayStudio.bat gọi file này để tìm Python thật (bỏ qua lối tắt Microsoft Store)."""
import sys

if sys.version_info >= (3, 10):
    print("PYEXE=" + sys.executable)
