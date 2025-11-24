@echo off
echo 🚀 Starting Infinity Sports Development Servers...
echo.

REM Start API Server
echo 📡 Starting API Server (port 4000)...
start "API Server" cmd /k "npm run dev:api"

timeout /t 3 /nobreak >nul

REM Start Web (Landing) Server
echo 🌐 Starting Landing Site (port 3000)...
start "Landing Site" cmd /k "npm run dev:web"

timeout /t 2 /nobreak >nul

REM Start Admin Server
echo ⚙️  Starting Admin CMS (port 3001)...
start "Admin CMS" cmd /k "npm run dev:admin"

timeout /t 2 /nobreak >nul

echo.
echo ✅ All servers starting!
echo.
echo 📍 URLs:
echo    API:        http://localhost:4000
echo    Health:     http://localhost:4000/api/health
echo    Landing:    http://localhost:3000
echo    Admin:      http://localhost:3001
echo.
echo 💡 To verify database connection, visit:
echo    http://localhost:4000/api/health
echo.
pause

