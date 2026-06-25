@echo off
:: DeepSeek Image Filter Proxy - 启动脚本 (Windows CMD)
:: 用法: 双击此文件 或 在命令行运行 start.bat

cd /d "%~dp0"

echo 正在启动 DeepSeek 图片过滤代理...
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    echo 下载: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js 版本:
node --version
echo.

:: 启动代理
node proxy.js
pause
