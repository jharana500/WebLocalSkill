# LocalSkill local dev launcher (Windows PowerShell)
#
# Verifies prerequisites, then starts the backend and frontend dev servers
# in separate windows. Press Ctrl+C in each window (or close it) to stop
# that process; this script does not touch the database or migrations.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

Write-Step "Checking .env files"
if (-not (Test-Path (Join-Path $backend ".env"))) {
    Write-Warn "backend\.env is missing. Run scripts\setup-local.ps1 first."
    exit 1
}
if (-not (Test-Path (Join-Path $frontend ".env"))) {
    Write-Warn "frontend\.env is missing. Run scripts\setup-local.ps1 first."
    exit 1
}
Write-Ok ".env files present"

Write-Step "Checking PostgreSQL is reachable on port 5432"
$pgUp = Test-NetConnection -ComputerName "localhost" -Port 5432 -WarningAction SilentlyContinue
if (-not $pgUp.TcpTestSucceeded) {
    Write-Warn "PostgreSQL does not appear to be listening on localhost:5432. Start the PostgreSQL service before continuing."
    exit 1
}
Write-Ok "PostgreSQL is reachable"

$clientGenerated = Test-Path (Join-Path $backend "node_modules\@prisma\client\index.js")
if (-not $clientGenerated) {
    Write-Step "Prisma client not generated yet - running prisma generate"
    Push-Location $backend
    try { npx prisma generate } finally { Pop-Location }
}

function Test-Port($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conn
}

if (Test-Port 5000) {
    Write-Warn "Port 5000 is already in use - backend may already be running, or another process holds the port."
} else {
    Write-Step "Starting backend (http://localhost:5000)"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run dev"
}

if (Test-Port 5173) {
    Write-Warn "Port 5173 is already in use - frontend may already be running, or another process holds the port."
} else {
    Write-Step "Starting frontend (http://localhost:5173)"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev"
}

Write-Step "Launched"
Write-Host "Backend:  http://localhost:5000/api/health"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Close the opened PowerShell windows to stop each server."
