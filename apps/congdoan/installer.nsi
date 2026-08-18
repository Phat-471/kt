; =========================================================================
; NSIS INSTALLER SCRIPT FOR KE TOAN CONG DOAN (v1.3.1)
; =========================================================================

Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; General Settings
Name "Ke Toan Tai Chinh Cong Doan"
OutFile "release\KeToanCongDoan-Setup-v1.3.1.exe"
InstallDir "$LOCALAPPDATA\Programs\KeToanCongDoan"
InstallDirRegKey HKCU "Software\KeToanCongDoan" "Install_Dir"
RequestExecutionLevel user
SetCompressor /SOLID zlib

; Auto-Relaunch on silent update
Function .onInit
  ; Đóng mọi tiến trình KeToanCongDoan.exe đang chạy trước khi ghi đè bản mới
  nsExec::Exec 'taskkill /F /IM KeToanCongDoan.exe /T'
  Sleep 1500
FunctionEnd

Function .onInstSuccess
  ${If} ${Silent}
    ExecShell "" "$INSTDIR\KeToanCongDoan.exe"
  ${EndIf}
FunctionEnd

; Interface Configuration
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_ABORTWARNING

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\KeToanCongDoan.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Khoi chay Phan Mem Ke Toan Cong Doan ngay"
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
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayName" "Phan Mem Ke Toan Tai Chinh Cong Doan"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayIcon" "$INSTDIR\KeToanCongDoan.exe,0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "DisplayVersion" "1.3.1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "Publisher" "Cong Doan Co So"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan" "NoRepair" 1

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\Ke Toan Cong Doan"
  CreateShortcut "$SMPROGRAMS\Ke Toan Cong Doan\Ke Toan Cong Doan.lnk" "$INSTDIR\KeToanCongDoan.exe" "" "$INSTDIR\KeToanCongDoan.exe" 0
  CreateShortcut "$SMPROGRAMS\Ke Toan Cong Doan\Go Bo Ke Toan Cong Doan.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0

  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\Ke Toan Cong Doan.lnk" "$INSTDIR\KeToanCongDoan.exe" "" "$INSTDIR\KeToanCongDoan.exe" 0
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove Desktop Shortcut
  Delete "$DESKTOP\Ke Toan Cong Doan.lnk"

  ; Remove Start Menu Shortcuts
  Delete "$SMPROGRAMS\Ke Toan Cong Doan\*.*"
  RMDir "$SMPROGRAMS\Ke Toan Cong Doan"

  ; Remove Registry Keys
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\KeToanCongDoan"
  DeleteRegKey HKCU "Software\KeToanCongDoan"

  ; Remove Installation Directory
  RMDir /r "$INSTDIR"
SectionEnd
