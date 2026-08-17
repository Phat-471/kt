@echo off
title DONG GOI PHAN MEM KE TOAN CONG DOAN (.EXE)
color 0a
echo ========================================================
echo   DONG GOI PHAN MEM KE TOAN TAI CHINH CONG DOAN v1.2.0
echo   Dang tao file cai dat .exe cho Windows...
echo ========================================================
echo.

cd /d "%~dp0\apps\congdoan"

call npm run build:exe
"C:\Users\IT\AppData\Local\electron-builder\Cache\nsis\nsis-3.0.4.1\makensis.exe" /INPUTCHARSET UTF8 installer.nsi
copy /y "release\KeToanCongDoan-Setup-v1.2.0.exe" "%~dp0KeToanCongDoan-Setup-v1.2.0.exe"

echo.
echo ========================================================
echo   HOAN TAT DONG GOI FILE CAI DAT (.EXE)!
echo   File cai dat duy nhat: KeToanCongDoan-Setup-v1.2.0.exe
echo   (Mang file nay sang may tinh khac, nhap dup la cai dat tu dong)
echo ========================================================
pause
