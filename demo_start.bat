@echo off
setlocal
title PS-03 ECG Demo Launcher

echo.
echo  ======================================================
echo     PS-03 AI-Assisted ECG Screening System
echo            Hackathon Demo Launcher
echo  ======================================================
echo.

:: 1. Check Python
where python >nul 2>&1
if not errorlevel 1 goto py_ok
if exist "D:\python.exe" (
    set "PYTHON=D:\python.exe"
    goto py_found
)
echo [ERROR] Python not found on PATH.
pause
exit /b 1

:py_ok
set "PYTHON=python"

:py_found
echo [OK] Python: %PYTHON%

:: 2. Check Node
where node >nul 2>&1
if not errorlevel 1 goto node_ok
echo [ERROR] Node.js not found. Please install Node.js 18+
pause
exit /b 1

:node_ok
echo [OK] Node.js found

:: 3. Set paths and config
cd /d "%~dp0"
set "PYTHONPATH=D:\Lib\site-packages;%~dp0"
if not exist "%~dp0.env" if exist "%~dp0.env.example" copy "%~dp0.env.example" "%~dp0.env" >nul

:: 4. Start Backend
echo.
echo [1/2] Starting backend on http://localhost:8000 ...
start "PS03-Backend" /d "%~dp0" cmd /k "%PYTHON% -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: 5. Wait for Backend
echo [WAIT] Waiting for backend API to be ready...
set /a tries=0
:wait_backend
set /a tries+=1
if %tries% gtr 30 (
    echo [WARN] Backend took longer than expected, proceeding...
    goto start_frontend
)
curl.exe -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_backend
)
echo [OK] Backend is ready!

:start_frontend
:: 6. Start Frontend
echo.
echo [2/2] Starting frontend on http://localhost:5173 ...
start "PS03-Frontend" /d "%~dp0frontend" cmd /k "node_modules\.bin\vite --port 5173"

:: 7. Wait for Frontend
echo [WAIT] Waiting for frontend to compile...
set /a tries=0
:wait_frontend
set /a tries+=1
if %tries% gtr 30 (
    echo [WARN] Frontend took longer than expected, opening browser...
    goto open_browser
)
curl.exe -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_frontend
)
echo [OK] Frontend is ready!

:open_browser
timeout /t 1 /nobreak >nul
echo.
echo [OPENING] Launching browser at http://localhost:5173/screen ...
start "" "http://localhost:5173/screen"

if exist "%~dp0demo_signals" (
    echo [OPENING] Opening demo signal files in Explorer...
    start "" explorer "%~dp0demo_signals"
)

echo.
echo  =========================================================
echo   PS-03 is LIVE!
echo.
echo   App:      http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
echo   DEMO STEPS:
echo   1. Drag a CSV file from demo_signals folder into the app
echo   2. Click "Analyse ECG"
echo   3. See real beat-by-beat AI classifications!
echo.
echo   DEMO FILES (in demo_signals folder):
echo     demo_normal.csv  -^> Normal sinus rhythm (all green N beats)
echo     demo_pvc.csv     -^> Frequent PVCs (red V beats appear)
echo     demo_svt.csv     -^> Supraventricular (amber S beats)
echo     demo_mixed.csv   -^> Rich mix of N, V, and F beats (15s)
echo.
echo   To stop: close the two PS03 terminal windows.
echo  =========================================================
echo.
pause
