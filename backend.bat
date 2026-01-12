@echo off
title SupriAI Backend Server
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║           SupriAI Backend Server Launcher             ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: Change to the backend directory
cd /d "%~dp0backend"

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo [INFO] Python found!
echo.

:: Check if dependencies are installed
echo [INFO] Checking dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo [INFO] Starting SupriAI Backend Server...
echo [INFO] Server will be running at: http://localhost:5000
echo.
echo ══════════════════════════════════════════════════════════
echo   Press Ctrl+C to stop the server
echo ══════════════════════════════════════════════════════════
echo.

:: Run the Flask application
python app.py

:: If server stops, pause to see any error messages
echo.
echo [INFO] Server stopped.
pause
