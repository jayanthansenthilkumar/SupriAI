@echo off
echo ============================================
echo   SupriAI Backend - Starting All Servers
echo ============================================
echo.

cd /d "%~dp0server"

echo [1/5] Checking Python installation...
python --version 2>nul
if errorlevel 1 (
    echo WARNING: Python not found. ML features will be unavailable.
    echo Install Python 3.10+ from https://python.org
    goto :start_node
)

echo [2/5] Installing Python dependencies...
pip install -r requirements.txt --quiet

echo [3/5] Starting Python ML server (port 5000)...
start "SupriAI-Python" /min cmd /c "python app.py"
timeout /t 3 >nul

:start_node
echo.
echo [4/5] Checking Node.js installation...
node --version 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo [5/5] Installing Node dependencies and starting Express server...
call npm install --silent

echo.
echo ============================================
echo   Express API:   http://127.0.0.1:3001
echo   Python ML:     http://127.0.0.1:5000
echo   Press Ctrl+C to stop Express server
echo ============================================
echo.

node server.js
pause