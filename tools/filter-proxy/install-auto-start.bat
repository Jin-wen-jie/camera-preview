@echo off
:: DeepSeek Image Filter Proxy - 安装开机自启
:: 在 Windows 启动文件夹中创建快捷方式，开机后自动静默启动代理

cd /d "%~dp0"

echo ========================================
echo   DeepSeek 图片过滤代理 - 开机自启安装
echo ========================================
echo.

:: 获取当前目录的绝对路径
set "PROXY_DIR=%~dp0"
set "VBS_PATH=%PROXY_DIR%start-silent.vbs"

:: 检查 VBS 文件是否存在
if not exist "%VBS_PATH%" (
    echo [错误] 找不到 start-silent.vbs
    pause
    exit /b 1
)

:: 使用 PowerShell 创建快捷方式到启动文件夹
powershell -Command ^
"$startup = [Environment]::GetFolderPath('Startup');" ^
"$shortcutPath = Join-Path $startup 'DeepSeek-Filter-Proxy.lnk';" ^
"$WshShell = New-Object -ComObject WScript.Shell;" ^
"$Shortcut = $WshShell.CreateShortcut($shortcutPath);" ^
"$Shortcut.TargetPath = '%VBS_PATH%';" ^
"$Shortcut.WorkingDirectory = '%PROXY_DIR%';" ^
"$Shortcut.Description = 'DeepSeek 图片过滤代理 - 自动过滤 image_url';" ^
"$Shortcut.Save();" ^
"Write-Host '快捷方式已创建:' $shortcutPath"

if %errorlevel% equ 0 (
    echo.
    echo [成功] 已安装开机自启！
    echo 快捷方式位置: 启动文件夹\DeepSeek-Filter-Proxy.lnk
    echo.
    echo 下次开机时，代理会自动在后台启动（无窗口）。
    echo 如需卸载，请运行: uninstall-auto-start.bat
) else (
    echo [失败] 安装失败，请以管理员身份运行或检查权限。
)

echo.
pause
