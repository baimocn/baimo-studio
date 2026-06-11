@echo off
chcp 65001 >nul 2>&1
echo.
echo  ╔══════════════════════════════════════╗
echo  ║    baimo Studio — 构建 .exe          ║
echo  ╚══════════════════════════════════════╝
echo.

:: Step 1: 构建前端静态文件
echo  [1/3] 构建前端...
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

:: Step 2: 安装 PyInstaller
echo  [2/3] 检查 PyInstaller...
pip show pyinstaller >nul 2>&1
if %errorlevel% neq 0 (
    echo  [..] 安装 PyInstaller...
    pip install --quiet pyinstaller
)
echo  [OK] PyInstaller 就绪

:: Step 3: 打包 .exe
echo  [3/3] 打包 baimo-studio.exe...
pyinstaller --clean --noconfirm build_exe.spec
if %errorlevel% neq 0 (
    echo  [X] 打包失败
    pause
    exit /b 1
)

echo.
echo  ══════════════════════════════════════
echo   构建完成!
echo   输出: dist\baimo-studio.exe
echo  ══════════════════════════════════════
echo.
pause
