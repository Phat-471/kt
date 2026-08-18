@echo off
title DONG GOI PHAN MEM KTCD HP (.EXE)
color 0a
echo ========================================================
echo   DONG GOI PHAN MEM KTCD HP v1.3.4
echo   Dang tao file cai dat .exe cho Windows...
echo ========================================================
echo.

cd /d "%~dp0\apps\congdoan"

call npm run build:exe
"C:\Users\IT\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1\makensis.exe" /INPUTCHARSET UTF8 installer.nsi
copy /y "release\KTCD-HP-Setup-v1.3.4.exe" "%~dp0KTCD-HP-Setup-v1.3.4.exe"

echo.
echo ========================================================
echo   HOAN TAT DONG GOI FILE CAI DAT (.EXE)!
echo   File cai dat duy nhat: KTCD-HP-Setup-v1.3.4.exe
echo   (Mang file nay sang may tinh khac, nhap dup la cai dat tu dong)
echo ========================================================
pause
