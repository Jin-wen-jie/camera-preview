#!/usr/bin/env bash
# DeepSeek Image Filter Proxy - 启动脚本 (Git Bash / Linux / macOS)
# 用法: bash start.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "正在启动 DeepSeek 图片过滤代理..."
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js"
    echo "下载: https://nodejs.org/"
    read -p "按回车键退出..."
    exit 1
fi

echo "Node.js 版本: $(node --version)"
echo ""

# 启动代理（端口可通过 PORT 环境变量自定义）
node proxy.js
