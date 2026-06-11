cd "D:\Desktop\图片视频生成\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 5180 2>&1 | Tee-Object -FilePath "$env:TEMP\backend.log"
