@echo off
title DONG GOI PHAN MEM KE TOAN CONG DOAN (.EXE)
color 0a
echo ========================================================
echo   DONG GOI PHAN MEM KE TOAN TAI CHINH CONG DOAN
echo   Dang tao file cai dat .exe cho Windows...
echo ========================================================
echo.

cd /d "%~dp0\apps\congdoan"

call npm run build:exe

echo.
echo ========================================================
echo   HOAN TAT!
echo   File cai dat .exe nam trong thu muc: apps\congdoan\release
echo ========================================================
pause
