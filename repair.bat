@echo off
:: Auto-elevation check
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Elevating to Administrator...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo =========================================================
echo    Windows 11 System & Shell Repair Script
echo =========================================================
echo.
echo [1/3] Disabling Fast Startup (powercfg)...
powercfg /h off
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f >nul 2>&1

echo.
echo [2/3] Repairing Windows Component Store (DISM)...
echo Please wait, this takes a few minutes...
dism /online /cleanup-image /restorehealth

echo.
echo [3/3] Checking and repairing system files (SFC)...
sfc /scannow

echo.
echo =========================================================
echo  Repairs finished successfully! Please restart your PC.
echo =========================================================
pause
