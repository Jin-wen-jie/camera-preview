@echo off
:: DeepSeek Image Filter Proxy - 卸载开机自启

echo ========================================
echo   DeepSeek 图片过滤代理 - 卸载开机自启
echo ========================================
echo.

:: 删除启动文件夹中的快捷方式
powershell -Command ^
"$startup = [Environment]::GetFolderPath('Startup');" ^
"$shortcutPath = Join-Path $startup 'DeepSeek-Filter-Proxy.lnk';" ^
"if (Test-Path $shortcutPath) {" ^
"  Remove-Item $shortcutPath -Force;" ^
"  Write-Host '已删除快捷方式:' $shortcutPath" ^
"} else {" ^
"  Write-Host '未找到开机自启快捷方式，可能已卸载'" ^
"}"

echo.
echo 如果代理正在运行，请手动关闭或重启电脑。
echo.
pause
