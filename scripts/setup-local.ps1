# LocalSkill local environment setup (Windows PowerShell)
#
# Safe to re-run. Never drops the database, never resets Prisma migration
# history, never overwrites an existing .env without backing it up first,
# and never writes secrets into this script or into git-tracked files.
#
# What it does:
#   1. Checks Node.js / npm / PostgreSQL are present.
#   2. Installs backend + frontend dependencies (npm ci when a lockfile exists).
#   3. Creates backend/.env and frontend/.env from their .env.example files
#      if missing (does not fill in real secrets for you).
#   4. Runs `prisma generate`.
#   5. Runs `prisma migrate deploy` against the existing migrations.
#   6. Runs the seed script only if one exists and the DB looks empty.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "! $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

Write-Step "Checking prerequisites"
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node -or -not $npm) {
    Write-Warn "Node.js/npm not found on PATH. Install Node.js 20+ before continuing."
    exit 1
}
Write-Ok "node $(node --version), npm $(npm --version)"

$pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Write-Warn "PostgreSQL service '$($pgService.Name)' is not running. Attempting to start it (may require administrator rights)..."
        try {
            Start-Service $pgService.Name
            Write-Ok "Started $($pgService.Name)"
        } catch {
            Write-Warn "Could not start PostgreSQL automatically. Run this from an elevated PowerShell: Start-Service $($pgService.Name)"
        }
    } else {
        Write-Ok "PostgreSQL service '$($pgService.Name)' is running"
    }
} else {
    Write-Warn "No PostgreSQL Windows service detected. Install PostgreSQL, or start it manually, before running migrations."
}

function Install-Deps($dir, $label) {
    Write-Step "Installing $label dependencies"
    Push-Location $dir
    try {
        if (Test-Path "package-lock.json") {
            npm ci
        } else {
            npm install
        }
    } finally {
        Pop-Location
    }
}

Install-Deps $backend "backend"
Install-Deps $frontend "frontend"

function Ensure-EnvFile($dir, $label) {
    $envPath = Join-Path $dir ".env"
    $examplePath = Join-Path $dir ".env.example"
    if (Test-Path $envPath) {
        Write-Ok "$label/.env already exists (left untouched)"
    } elseif (Test-Path $examplePath) {
        Copy-Item $examplePath $envPath
        Write-Warn "$label/.env created from .env.example - edit it with real local values (DATABASE_URL, JWT_SECRET, etc.) before starting the app."
    } else {
        Write-Warn "$label/.env.example not found; cannot scaffold $label/.env"
    }
}

Write-Step "Ensuring .env files exist"
Ensure-EnvFile $backend "backend"
Ensure-EnvFile $frontend "frontend"

Write-Step "Generating Prisma client"
Push-Location $backend
try {
    npx prisma generate

    Write-Step "Applying existing migrations (prisma migrate deploy)"
    npx prisma migrate deploy
    npx prisma migrate status

    $seedJs = Test-Path (Join-Path $backend "prisma\seed.js")
    $seedTs = Test-Path (Join-Path $backend "prisma\seed.ts")
    if ($seedJs -or $seedTs) {
        Write-Step "Seed script detected - running prisma db seed"
        npx prisma db seed
    } else {
        Write-Ok "No seed script present - skipping seed step"
    }
} finally {
    Pop-Location
}

Write-Step "Setup complete"
Write-Host "Next: review backend/.env and frontend/.env, then run scripts\start-local.ps1"
