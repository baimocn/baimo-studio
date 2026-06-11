"""
baimo Studio — 桌面客户端入口

用 pywebview 创建原生窗口，加载本地 FastAPI 服务。
后端逻辑完全复用 run.py，前端静态文件不变。
"""
import sys
import os
import threading
import time
import webbrowser
from pathlib import Path


def get_base_dir():
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def ensure_env():
    base = get_base_dir()
    if getattr(sys, "frozen", False):
        env_path = Path(sys.executable).parent / ".env"
    else:
        env_path = base / ".env"

    if not env_path.exists():
        example = base / ".env.example"
        if example.exists():
            content = example.read_text(encoding="utf-8")
            env_path.write_text(content, encoding="utf-8")
            print(f"[首次运行] 已创建配置文件: {env_path}")


def start_server(stop_event: threading.Event):
    """在后台线程中启动 FastAPI + uvicorn 服务器。"""
    import uvicorn
    from app.main import app

    class Server(uvicorn.Server):
        def install_signal_handlers(self):
            pass

    config = uvicorn.Config(
        app=app,
        host="localhost",
        port=5180,
        log_level="warning",
    )
    server = Server(config)

    def watch_stop():
        stop_event.wait()
        server.should_exit = True

    threading.Thread(target=watch_stop, daemon=True).start()
    server.run()


def wait_for_server(url: str, timeout: float = 15):
    """等待服务器就绪。"""
    import urllib.request
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return True
        except Exception:
            time.sleep(0.3)
    return False


def main():
    import webview

    base = get_base_dir()

    # 准备工作目录和环境
    if getattr(sys, "frozen", False):
        work_dir = Path(sys.executable).parent
        data_dir = work_dir / "baimo-studio-data"
    else:
        work_dir = base
        data_dir = base / "data"

    data_dir.mkdir(exist_ok=True)
    os.chdir(str(work_dir))
    ensure_env()

    # 初始化配置
    from app.core.config import init_settings
    init_settings()

    # 启动服务器
    stop_event = threading.Event()
    server_thread = threading.Thread(target=start_server, args=(stop_event,), daemon=True)
    server_thread.start()

    # 等待服务器就绪
    if not wait_for_server("http://localhost:5180/api/health"):
        print("[错误] 服务器启动超时")
        sys.exit(1)

    # 创建原生窗口
    window = webview.create_window(
        title="baimo Studio",
        url="http://localhost:5180",
        width=1280,
        height=860,
        min_size=(960, 640),
        text_select=True,
    )

    # 窗口关闭时停止服务器
    def on_closed():
        stop_event.set()

    window.events.closed += on_closed

    # 启动 GUI 事件循环（阻塞直到窗口关闭）
    webview.start(debug=False)

    # 窗口关闭后清理
    stop_event.set()
    time.sleep(0.5)
    print("baimo Studio 已退出")


if __name__ == "__main__":
    main()
