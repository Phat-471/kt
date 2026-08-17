@echo off
title DONG GOI PHAN MEM KE TOAN CONG DOAN (.EXE)
color 0a
echo ========================================================
echo   DONG GOI PHAN MEM KE TOAN TAI CHINH CONG DOAN
echo   Dang tao file cai dat .exe cho Windows...
echo ========================================================
echo.

cd /d "%~dp0\apps\congdoan"

call npm run build:installer

echo.
echo ========================================================
echo   HOAN TAT DONG GOI FILE CAI DAT (.EXE)!
echo   File cai dat duy nhat: apps\congdoan\release\KeToanCongDoan-Setup-v1.1.0.exe
echo   (Mang file nay sang may tinh khac, nhap dup la cai dat tu dong)
echo ========================================================
pause
