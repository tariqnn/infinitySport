@echo off
echo Starting Infinity Sports Development Servers...
echo.

REM Start Web (Landing) Server
echo Starting Landing Site (port 3000)...
start "Landing Site" cmd /k "npm run dev:web"

timeout /t 2 /nobreak >nul

REM Start Admin Server
echo Starting Admin CMS (port 3001)...
start "Admin CMS" cmd /k "npm run dev:admin"

timeout /t 2 /nobreak >nul

REM Start Portal Server
echo Starting Portal (port 3002)...
start "Portal" cmd /k "npm run dev:portal"

echo.
echo All servers starting.
echo.
echo URLs:
echo    Landing:    http://localhost:3000
echo    Admin:      http://localhost:3001
echo    Portal:     http://localhost:3002
echo.
pause