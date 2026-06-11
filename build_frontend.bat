@echo off
chcp 65001 >nul 2>&1
echo  构建前端静态文件...
cd frontend
call npm ci --silent
call npm run build
if %errorlevel% neq 0 (
    echo  [X] 构建失败
    pause
    exit /b 1
)
if exist ..\backend\static rmdir /s /q ..\backend\static
xcopy /E /I /Q out ..\backend\static >nul
cd ..
echo  [OK] 前端已构建到 backend/static/
