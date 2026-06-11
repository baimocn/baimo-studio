import sys
import os
import webbrowser
import threading
from pathlib import Path


def get_base_dir():
    if getattr(sys, 'frozen', False):
        return Path(sys._MEIPASS)
    return Path(__file__).resolve().parent


def ensure_env():
    base = get_base_dir()
    if getattr(sys, 'frozen', False):
        env_path = Path(sys.executable).parent / ".env"
    else:
        env_path = base / ".env"

    if not env_path.exists():
        example = base / ".env.example"
        if example.exists():
            content = example.read_text(encoding="utf-8")
            env_path.write_text(content, encoding="utf-8")
            print(f"[首次运行] 已创建配置文件: {env_path}")


def open_browser():
    import time
    time.sleep(2.5)
    webbrowser.open("http://localhost:5180")


def main():
    base = get_base_dir()

    if getattr(sys, 'frozen', False):
        work_dir = Path(sys.executable).parent
        data_dir = work_dir / "baimo-studio-data"
        data_dir.mkdir(exist_ok=True)
        os.chdir(str(work_dir))
    else:
        os.chdir(str(base))
        data_dir = base / "data"
        data_dir.mkdir(exist_ok=True)

    ensure_env()

    # 在启动服务前显式初始化配置（确保 .env 已就绪）
    from app.core.config import init_settings
    init_settings()

    print()
    print("  baimo Studio — AI 图片与视频生成平台")
    print("  访问地址: http://localhost:5180")
    print("  按 Ctrl+C 停止服务")
    print()

    threading.Thread(target=open_browser, daemon=True).start()

    from app.main import app
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5180, log_level="info")


if __name__ == "__main__":
    main()
