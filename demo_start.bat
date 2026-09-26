@echo off
setlocal enabledelayedexpansion
title PS-03 ECG Demo Launcher

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     PS-03 AI-Assisted ECG Screening System           ║
echo  ║            Hackathon Demo Launcher                   ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ── Check Python ────────────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    where D:\python.exe >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python not found. Please install Python 3.10+
        pause & exit /b 1
    )
    set PYTHON=D:\python.exe
) else (
    set PYTHON=python
)
echo [OK] Python: %PYTHON%

:: ── Check node ──────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause & exit /b 1
)
echo [OK] Node.js found

:: ── Install frontend deps if needed ─────────────────────────────────────────
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies (first run only)...
    cd frontend
    call npm install --silent
    cd ..
)

:: ── Set PYTHONPATH ──────────────────────────────────────────────────────────
set PYTHONPATH=D:\Lib\site-packages;%CD%

:: ── Create minimal .env if missing ──────────────────────────────────────────
if not exist ".env" (
    echo [INFO] Creating local .env from .env.example
    copy .env.example .env >nul
)

:: ── Start FastAPI backend in background ─────────────────────────────────────
echo.
echo [STARTING] Backend API on http://localhost:8000 ...
start "PS03-Backend" cmd /k "%PYTHON% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ── Wait for backend to boot ────────────────────────────────────────────────
echo [WAITING] Giving backend 4 seconds to boot...
timeout /t 4 /nobreak >nul

:: ── Start Vite dev server in background ─────────────────────────────────────
echo [STARTING] Frontend on http://localhost:5173 ...
cd frontend
start "PS03-Frontend" cmd /k "node_modules\.bin\vite --port 5173"
cd ..

:: ── Wait then open browser ──────────────────────────────────────────────────
echo [WAITING] Giving frontend 3 seconds to compile...
timeout /t 3 /nobreak >nul

echo.
echo [OPENING] Launching browser...
start "" "http://localhost:5173"

echo.
echo  ┌─────────────────────────────────────────────┐
echo  │  PS-03 is running!                          │
echo  │                                             │
echo  │  Frontend  →  http://localhost:5173         │
echo  │  API Docs  →  http://localhost:8000/docs    │
echo  │  Health    →  http://localhost:8000/health  │
echo  │                                             │
echo  │  Close the two terminal windows to stop.   │
echo  └─────────────────────────────────────────────┘
echo.
pause
