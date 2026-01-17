@echo off
REM Words Dictionary - Windows Installation Script
REM Run as Administrator or in the target directory

set APP_NAME=Words Dictionary
set INSTALL_DIR=%LOCALAPPDATA%\Words

echo Installing %APP_NAME%...

REM Create install directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy files
xcopy /E /I /Y resources "%INSTALL_DIR%\resources"
xcopy /E /I /Y database "%INSTALL_DIR%\database"
xcopy /E /I /Y extensions "%INSTALL_DIR%\extensions"
copy /Y bin\neutralino-win_x64.exe "%INSTALL_DIR%\Words.exe"

REM Install npm dependencies for sqlite
cd /d "%INSTALL_DIR%\extensions\sqlite"
call npm install --production 2>nul
cd /d "%~dp0"

REM Create Start Menu shortcut
set SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\%APP_NAME%.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%INSTALL_DIR%\Words.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()"

REM Create Desktop shortcut
set DESKTOP_SHORTCUT=%USERPROFILE%\Desktop\%APP_NAME%.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP_SHORTCUT%'); $s.TargetPath = '%INSTALL_DIR%\Words.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()"

echo.
echo Installation complete!
echo.
echo The app has been installed to: %INSTALL_DIR%
echo Shortcuts created in Start Menu and Desktop.
echo.
pause
