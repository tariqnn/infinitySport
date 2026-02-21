# Start app workspaces that now read/write directly to Neon (no standalone API service).

Write-Host "Starting Infinity Sports development servers..." -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found." -ForegroundColor Red
    Write-Host "Please create a .env file with DATABASE_URL." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting Landing Site (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:web" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting Admin CMS (port 3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:admin" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting Portal (port 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev:portal" -WindowStyle Normal

Write-Host ""
Write-Host "Servers starting." -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Landing: http://localhost:3000" -ForegroundColor White
Write-Host "  Admin:   http://localhost:3001" -ForegroundColor White
Write-Host "  Portal:  http://localhost:3002" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window (servers keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
