@echo off
echo ========================================================
echo   Launching MargRakshak AI Backend and Frontend
echo ========================================================
echo.
start "MargRakshak Backend (Port 8000)" cmd /k "%~dp0start_backend.bat"
ping 127.0.0.1 -n 3 >nul
start "MargRakshak Frontend (Port 3000)" cmd /k "%~dp0start_frontend.bat"
echo Both servers have been launched in separate terminal windows!

