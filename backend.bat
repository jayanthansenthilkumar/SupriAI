@echo off
echo ============================================
echo   SupriAI Backend - Starting Flask Server
echo ============================================
echo.

cd /d "%~dp0server\backend"

echo [1/3] Checking Python installation...
python --version 2>nul
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo.
echo [2/3] Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo [3/3] Starting Flask server...
echo.
echo ============================================
echo   Server running at http://127.0.0.1:5000
echo   Press Ctrl+C to stop
echo ============================================
echo.

python app.py
pause