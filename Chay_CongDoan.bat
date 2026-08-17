@echo off
title UNG DUNG KE TOAN CONG DOAN CO SO
color 0b
echo ========================================================
echo   UNG DUNG KE TOAN TAI CHINH CONG DOAN CO SO
echo   Dang khoi dong may chu lam viec...
echo ========================================================
echo.

cd /d "%~dp0\apps\congdoan"

if not exist node_modules (
  echo Dang cai dat thu vien lan dau (vui long doi giay lat)...
  call npm install
)

start http://localhost:5173
echo.
echo Da mo ung dung tren trinh duyet!
echo.
call npm run dev
pause
