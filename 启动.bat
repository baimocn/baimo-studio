@echo off
chcp 65001 >nul 2>&1
title baimo Studio

echo.
echo  ╔══════════════════════════════════════╗
echo  ║         baimo Studio                 ║
echo  ║    AI 图片与视频生成平台              ║
echo  ╚══════════════════════════════════════╝
echo.

:: Step 1: 检测 Python
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] 检测到 Python
    set PYTHON=python
    goto :check_deps
)

if exist "backend\embedded-python\python.exe" (
    echo  [OK] 使用内嵌 Python
    set PYTHON=backend\embedded-python\python.exe
    goto :check_deps
)

echo  [X] 未检测到 Python
echo.
echo      请安装 Python 3.12+ 后重试
echo      下载: https://www.python.org/downloads/
echo.
pause
exit /b 1

:check_deps
:: Step 2: 检测依赖
if exist "backend\.deps_installed" (
    echo  [OK] 依赖已安装
    goto :check_static
)

echo  [..] 首次运行，正在安装依赖...
%PYTHON% -m pip install --quiet -r backend\requirements.txt
if %errorlevel% neq 0 (
    echo  [X] 依赖安装失败，请检查网络连接
    pause
    exit /b 1
)
echo done > backend\.deps_installed
echo  [OK] 依赖安装完成

:check_static
:: Step 3: 检测前端静态文件
if exist "backend\static\index.html" (
    echo  [OK] 前端资源就绪
    goto :start
)

echo  [..] 首次运行，正在构建前端...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] 未检测到 Node.js，请先安装 Node.js 20+
    echo      下载: https://nodejs.org/
    pause
    exit /b 1
)

cd frontend
call npm ci --silent
call npm run build
if %errorlevel% neq 0 (
    echo  [X] 前端构建失败
    pause
    exit /b 1
)
if exist ..\backend\static rmdir /s /q ..\backend\static
xcopy /E /I /Q out ..\backend\static >nul
cd ..
echo  [OK] 前端构建完成

:start
:: Step 4: 启动服务
echo.
echo  ══════════════════════════════════════
echo   访问地址: http://localhost:5180
echo   按 Ctrl+C 停止服务
echo  ══════════════════════════════════════
echo.

cd backend
start "" http://localhost:5180
%PYTHON% -m uvicorn app.main:app --host 0.0.0.0 --port 5180
