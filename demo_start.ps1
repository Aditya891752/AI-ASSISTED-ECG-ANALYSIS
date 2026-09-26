# PS-03 AI-Assisted ECG Screening System — PowerShell Demo Launcher
$Host.UI.RawUI.WindowTitle = "PS-03 ECG Demo Launcher"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   PS-03 AI-Assisted ECG Screening System" -ForegroundColor White
Write-Host "          Hackathon Demo Launcher" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $baseDir

# 1. Check Python
$pythonCmd = "python"
try {
    $null = & python --version 2>&1
    Write-Host "[OK] Python detected" -ForegroundColor Green
} catch {
    if (Test-Path "D:\python.exe") {
        $pythonCmd = "D:\python.exe"
        Write-Host "[OK] Using D:\python.exe" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Python not found." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# 2. Check Node.js
try {
    $null = & node --version 2>&1
    Write-Host "[OK] Node.js detected" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 3. Environment configuration
$env:PYTHONPATH = "D:\Lib\site-packages;$baseDir"
$envFile = Join-Path $baseDir ".env"
$envExample = Join-Path $baseDir ".env.example"
if (!(Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
}

# 4. Start Backend
Write-Host ""
Write-Host "[1/2] Starting backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k", "$pythonCmd -m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $baseDir

# 5. Wait for Backend API
Write-Host "[WAIT] Waiting for backend API to be ready..." -ForegroundColor Gray
$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($backendReady) {
    Write-Host "[OK] Backend is ready!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Backend took longer than expected, continuing..." -ForegroundColor Yellow
}

# 6. Start Frontend
$frontendDir = Join-Path $baseDir "frontend"
Write-Host ""
Write-Host "[2/2] Starting frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process cmd.exe -ArgumentList "/k", "node_modules\.bin\vite --port 5173" -WorkingDirectory $frontendDir

# 7. Wait for Frontend
Write-Host "[WAIT] Waiting for frontend to compile..." -ForegroundColor Gray
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $frontendReady = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($frontendReady) {
    Write-Host "[OK] Frontend is ready!" -ForegroundColor Green
} else {
    Write-Host "[WARN] Frontend took longer than expected, opening browser..." -ForegroundColor Yellow
}

# 8. Launch Browser & Explorer
Start-Sleep -Seconds 1
Write-Host ""
Write-Host "[OPENING] Launching browser at http://localhost:5173/screen ..." -ForegroundColor Cyan
Start-Process "http://localhost:5173/screen"

$demoSignalsDir = Join-Path $baseDir "demo_signals"
if (Test-Path $demoSignalsDir) {
    Write-Host "[OPENING] Opening demo signal files in Explorer..." -ForegroundColor Cyan
    Start-Process explorer.exe -ArgumentList $demoSignalsDir
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "   PS-03 is LIVE!" -ForegroundColor White
Write-Host ""
Write-Host "   App:      http://localhost:5173" -ForegroundColor Yellow
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "   DEMO STEPS:" -ForegroundColor Cyan
Write-Host "   1. Drag a CSV from the demo_signals folder into the app" -ForegroundColor White
Write-Host "   2. Click 'Analyse ECG'" -ForegroundColor White
Write-Host "   3. See real beat-by-beat AI classifications!" -ForegroundColor White
Write-Host ""
Write-Host "   DEMO FILES:" -ForegroundColor Cyan
Write-Host "     demo_normal.csv  -> Healthy sinus rhythm (all green N beats)" -ForegroundColor Gray
Write-Host "     demo_pvc.csv     -> Frequent PVCs (red V beats appear)" -ForegroundColor Gray
Write-Host "     demo_svt.csv     -> Supraventricular beats (amber S beats)" -ForegroundColor Gray
Write-Host "     demo_mixed.csv   -> 15s rich mix of N, V, and F beats" -ForegroundColor Gray
Write-Host ""
Write-Host "   To stop: Close the two PS03 terminal windows." -ForegroundColor Gray
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit launcher"
