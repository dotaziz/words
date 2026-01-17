@echo off
REM Words Dictionary - Windows Uninstall Script

set INSTALL_DIR=%LOCALAPPDATA%\Words
set APP_NAME=Words Dictionary

echo Uninstalling %APP_NAME%...

REM Remove installation directory
if exist "%INSTALL_DIR%" rmdir /S /Q "%INSTALL_DIR%"

REM Remove shortcuts
del /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\%APP_NAME%.lnk" 2>nul
del /Q "%USERPROFILE%\Desktop\%APP_NAME%.lnk" 2>nul

echo.
echo %APP_NAME% has been uninstalled.
echo.
pause
