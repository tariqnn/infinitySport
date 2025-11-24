# Start All Services Script for Infinity Sports
# This script starts the API, Web, and Admin apps

Write-Host "🚀 Starting Infinity Sports Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "   Please create a .env file with your DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Start API Server
Write-Host "📡 Starting API Server (port 4000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:api" -WindowStyle Normal

Start-Sleep -Seconds 3

# Start Web (Landing) Server
Write-Host "🌐 Starting Landing Site (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:web" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Admin Server
Write-Host "⚙️  Starting Admin CMS (port 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:admin" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✅ All servers starting!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Cyan
Write-Host "   API:        http://localhost:4000" -ForegroundColor White
Write-Host "   Health:     http://localhost:4000/api/health" -ForegroundColor White
Write-Host "   Landing:    http://localhost:3000" -ForegroundColor White
Write-Host "   Admin:     http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 To verify database connection, visit:" -ForegroundColor Yellow
Write-Host "   http://localhost:4000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

