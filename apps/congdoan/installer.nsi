; =========================================================================
; NSIS INSTALLER SCRIPT FOR KE TOAN CONG DOAN (v1.1.0)
; =========================================================================

Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"

; General Settings
Name "Kế Toán Tài Chính Công Đoàn"
OutFile "release\KeToanCongDoan-Setup-v1.1.0.exe"
InstallDir "$LOCALAPPDATA\Programs\KeToanCongDoan"
InstallDirRegKey HKCU "Software\KeToanCongDoan" "Install_Dir"
RequestExecutionLevel user
SetCompressor /SOLID zlib

; Interface Configuration
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\KeToanCongDoan.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Khởi chạy Phần Mềm Kế Toán Công Đoàn ngay"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "Vietnamese"
!insertmacro MUI_LANGUAGE "English"

; Installer Section
Section "KeToanCongDoan (required)" SecCore
  SectionIn RO

  ; Set output path to the installation directory
  SetOutPath "$INSTDIR"

  ; Put all files from release\KeToanCongDoan-win32-x64
  File /r "release\KeToanCongDoan-win32-x64\*.*"

  ; Write registry keys for install directory & Add/Remove Programs
  WriteRegStr HKCU "Software\KeToanCongDoan" "Install_Dir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayName" "Phần Mềm Kế Toán Tài Chính Công Đoàn"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayIcon" "$INSTDIR\KeToanCongDoan.exe,0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayVersion" "1.1.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "Publisher" "Công Đoàn Cơ Sở"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "NoRepair" 1

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\Kế Toán Công Đoàn"
  CreateShortcut "$SMPROGRAMS\Kế Toán Công Đoàn\Kế Toán Công Đoàn.lnk" "$INSTDIR\KeToanCongDoan.exe" "" "$INSTDIR\KeToanCongDoan.exe" 0
  CreateShortcut "$SMPROGRAMS\Kế Toán Công Đoàn\Gỡ Bỏ Kế Toán Công Đoàn.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\Kế Toán Công Đoàn.lnk" "$INSTDIR\KeToanCongDoan.exe" "" "$INSTDIR\KeToanCongDoan.exe" 0
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove Desktop Shortcut
  Delete "$DESKTOP\Kế Toán Công Đoàn.lnk"

  ; Remove Start Menu Shortcuts
  Delete "$SMPROGRAMS\Kế Toán Công Đoàn\*.*"
  RMDir "$SMPROGRAMS\Kế Toán Công Đoàn"

  ; Remove Registry Keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan"
  DeleteRegKey HKCU "Software\KeToanCongDoan"

  ; Remove Installation Directory
  RMDir /r "$INSTDIR"
SectionEnd
