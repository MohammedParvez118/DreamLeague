@echo off
echo ========================================
echo Fantasy App - Development Servers
echo ========================================
echo.
echo Starting Backend API Server (Port 3000)...
echo Starting React Frontend (Port 5173)...
echo.
echo Backend API:     http://localhost:3000
echo React Frontend:  http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo ========================================
echo.

:: Start both servers using npm-run-all or concurrently
:: For now, instructions to run manually:

echo Please open TWO terminal windows and run:
echo.
echo Terminal 1:
echo   cd "c:\Users\admin\Documents\Fantasy-app - Backup"
echo   npm run dev
echo.
echo Terminal 2:
echo   cd "c:\Users\admin\Documents\Fantasy-app - Backup\client"
echo   npm run dev
echo.
pause