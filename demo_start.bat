@echo off
setlocal enabledelayedexpansion
title PS-03 ECG Demo Launcher

echo.
echo  +======================================================+
echo  ^|     PS-03 AI-Assisted ECG Screening System           ^|
echo  ^|            Hackathon Demo Launcher                   ^|
echo  +======================================================+
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
    echo [INFO] Installing frontend dependencies (first run only, ~40s)...
    cd frontend
    call npm install
    cd ..
    echo [OK] Dependencies installed
)

:: ── Set PYTHONPATH ──────────────────────────────────────────────────────────
set PYTHONPATH=D:\Lib\site-packages;%CD%

:: ── Create minimal .env if missing ──────────────────────────────────────────
if not exist ".env" (
    echo [INFO] Creating local .env from .env.example
    copy .env.example .env >nul
)

:: ── Start FastAPI backend ─────────────────────────────────────────────────────
echo.
echo [STARTING] Backend API on http://localhost:8000 ...
start "PS03-Backend" cmd /k "%PYTHON% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ── Poll until backend is up (max 30s) ────────────────────────────────────────
echo [WAITING] Waiting for backend to be ready...
set /a tries=0
:wait_backend
set /a tries+=1
if %tries% gtr 30 (
    echo [WARN] Backend taking longer than expected, continuing anyway...
    goto start_frontend
)
powershell -Command "try { Invoke-WebRequest http://localhost:8000/health -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_backend
)
echo [OK] Backend is ready!

:start_frontend
:: ── Start Vite dev server ─────────────────────────────────────────────────────
echo [STARTING] Frontend on http://localhost:5173 ...
cd frontend
start "PS03-Frontend" cmd /k "node_modules\.bin\vite --port 5173"
cd ..

:: ── Poll until frontend is up (max 30s) ──────────────────────────────────────
echo [WAITING] Waiting for frontend to compile (usually 5-10s)...
set /a tries=0
:wait_frontend
set /a tries+=1
if %tries% gtr 30 (
    echo [WARN] Frontend taking longer than expected, opening browser anyway...
    goto open_browser
)
powershell -Command "try { Invoke-WebRequest http://localhost:5173 -UseBasicParsing -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_frontend
)
echo [OK] Frontend is ready!

:open_browser
:: ── Open browser + demo files ─────────────────────────────────────────────────
echo [OPENING] Launching browser at Screen page...
start "" "http://localhost:5173/screen"

timeout /t 1 /nobreak >nul

echo [OPENING] Opening demo signal files in Explorer...
start "" explorer "%CD%\demo_signals"

echo.
echo  +---------------------------------------------------------+
echo  ^|  PS-03 is LIVE!                                        ^|
echo  ^|                                                        ^|
echo  ^|  App      ->  http://localhost:5173                    ^|
echo  ^|  API Docs ->  http://localhost:8000/docs               ^|
echo  ^|                                                        ^|
echo  ^|  HOW TO DEMO:                                          ^|
echo  ^|  1. Drag a CSV from the Explorer window into the app   ^|
echo  ^|  2. Click "Analyse ECG"                               ^|
echo  ^|  3. Watch real beat-by-beat results appear!            ^|
echo  ^|                                                        ^|
echo  ^|  DEMO FILES (best order):                              ^|
echo  ^|    demo_normal.csv   -> healthy patient (all green)    ^|
echo  ^|    demo_pvc.csv      -> PVCs: red V-beats appear       ^|
echo  ^|    demo_mixed.csv    -> V+F+N mix  (most impressive)   ^|
echo  ^|                                                        ^|
echo  ^|  To stop: close the two PS03 terminal windows         ^|
echo  +---------------------------------------------------------+
echo.
pause
