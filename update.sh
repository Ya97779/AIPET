#!/bin/bash
# PetAI Mind 一键更新脚本
# 使用方式: chmod +x update.sh && ./update.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🐾 PetAI Mind 更新脚本"
echo "========================"

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 更新后端依赖
echo "🐍 更新后端依赖..."
cd apps/api
source .venv/bin/activate
pip install -r requirements.txt -q

# 3. 执行数据库迁移（如果有新迁移）
echo "🗃️  检查数据库迁移..."
alembic upgrade head 2>/dev/null || echo "无新迁移"

cd "$SCRIPT_DIR"

# 4. 更新前端
echo "📦 更新前端..."
cd apps/web
npm install -q
npm run build

cd "$SCRIPT_DIR"

# 5. 重启服务（systemd 管理）
echo "🚀 重启后端..."
systemctl restart petai-api

echo "🌐 重启前端..."
systemctl restart petai-web

# 6. 检查状态
sleep 2
echo ""
echo "服务状态："
systemctl is-active petai-api && echo "  ✅ 后端运行中" || echo "  ❌ 后端启动失败"
systemctl is-active petai-web && echo "  ✅ 前端运行中" || echo "  ❌ 前端启动失败"

echo ""
echo "========================"
echo "🎉 更新完成！"
echo ""
echo "查看日志："
echo "  journalctl -u petai-api -f    # 后端日志"
echo "  journalctl -u petai-web -f    # 前端日志"
