@echo off
title Techfrost Trading Platform - Startup
color 0A

echo.
echo  ============================================================
echo    TECHFROST NIFTY OPTIONS AI TRADING PLATFORM
echo  ============================================================
echo.
echo  [1/3] Starting Backend Server...
echo.

start "Techfrost Backend" cmd /k "cd /d "d:\OneDrive - TECHFROST\Antigravity MS Laptop\Application - Trading\backend" && echo [BACKEND] Starting server... && node src/server.js"

echo  [2/3] Waiting 4 seconds for backend to initialize...
timeout /t 4 /nobreak >nul

echo  [3/3] Starting Frontend Dev Server...
echo.

start "Techfrost Frontend" cmd /k "cd /d "d:\OneDrive - TECHFROST\Antigravity MS Laptop\Application - Trading\frontend" && echo [FRONTEND] Starting Vite... && npm run dev"

echo  Waiting 5 seconds for frontend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo  Opening app in browser...
start "" "http://localhost:5173"

echo.
echo  ============================================================
echo    APP IS RUNNING!
echo    Backend  : http://localhost:3001
echo    Frontend : http://localhost:5173
echo  ============================================================
echo.
echo  Press any key to close this window (servers will keep running)
pause >nul
