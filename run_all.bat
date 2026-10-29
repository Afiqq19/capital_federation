@echo off
echo ===================================================
echo   CAPITAL FEDERATION - LAUNCHING ALL SERVICES
echo ===================================================

:: Setup ADB reverse port forwarding for connected Android physical phones
echo [*] Checking connected Android devices for port forwarding...
adb reverse tcp:4000 tcp:4000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] ADB reverse port 4000 aktif untuk perangkat Android!
)

echo [1/2] Starting Node.js Backend Server on port 4000...
start "Capital Federation - Backend" cmd /k "cd /d %~dp0backend && node ./src/server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Web Admin Dashboard on port 5173...
start "Capital Federation - Web Admin" cmd /k "cd /d %~dp0admin && npm.cmd run dev"

timeout /t 2 /nobreak >nul

echo ===================================================
echo  Backend:   http://localhost:4000
echo  Web Admin: http://localhost:5173
echo ===================================================
echo.
echo Untuk menjalankan aplikasi Flutter Klien ke HP fisik:
echo   cd mobile
echo   flutter run -d 3466240990000FX
echo.
pause
