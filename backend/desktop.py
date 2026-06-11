"""
baimo Studio — 桌面客户端入口

用 pywebview 创建原生窗口，加载本地 FastAPI 服务。
提供原生文件保存对话框桥接。
"""
import sys
import os
import threading
import time
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


class NativeBridge:
    """暴露给 JS 的原生功能桥接。"""

    def __init__(self, window):
        self._window = window

    def save_file(self, url: str, filename: str) -> dict:
        """从 URL 下载文件并弹出原生保存对话框。

        Args:
            url: 文件 URL（Agnes AI 返回的图片/视频地址）
            filename: 默认文件名（如 baimo-image-xxx.png）

        Returns:
            {"ok": True, "path": "..."} 或 {"ok": False, "error": "..."}
        """
        import webview
        import urllib.request
        import ssl

        try:
            # 弹出原生保存对话框
            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=filename,
                file_types=(f"所有文件 (*.*)",),
            )

            if not result:
                return {"ok": False, "error": "用户取消"}

            save_path = result if isinstance(result, str) else result[0]

            # 下载文件
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(url, timeout=120, context=ctx) as resp:
                data = resp.read()

            # 写入用户选择的路径
            Path(save_path).parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "wb") as f:
                f.write(data)

            return {"ok": True, "path": save_path}

        except Exception as e:
            return {"ok": False, "error": str(e)}

    def open_folder(self, path: str) -> dict:
        """打开文件所在的文件夹。"""
        import subprocess
        try:
            folder = str(Path(path).parent)
            if sys.platform == "win32":
                subprocess.Popen(["explorer", folder])
            elif sys.platform == "darwin":
                subprocess.Popen(["open", folder])
            else:
                subprocess.Popen(["xdg-open", folder])
            return {"ok": True}
        except Exception as e:
            return {"ok": False, "error": str(e)}


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

    # 注册原生桥接（窗口加载后 JS 可调用 window.pywebview.api.save_file）
    bridge = NativeBridge(window)
    window.expose(bridge.save_file)
    window.expose(bridge.open_folder)

    # 窗口关闭时停止服务器
    def on_closed():
        stop_event.set()

    window.events.closed += on_closed

    # 启动 GUI 事件循环
    webview.start(debug=False)

    # 清理
    stop_event.set()
    time.sleep(0.5)
    print("baimo Studio 已退出")


if __name__ == "__main__":
    main()
