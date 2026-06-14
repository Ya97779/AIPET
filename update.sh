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

# 4. 重启后端
echo "🚀 重启后端..."
pkill -9 -f "uvicorn app.main" 2>/dev/null || true
pkill -9 -f "gunicorn" 2>/dev/null || true
sleep 2
nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 > ../../logs/api.log 2>&1 &
echo "✅ 后端已重启 (PID: $!)"

cd "$SCRIPT_DIR"

# 5. 更新前端
echo "📦 更新前端..."
cd apps/web
npm install -q
npm run build

# 6. 重启前端
echo "🌐 重启前端..."
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 2
nohup npm start > ../../logs/web.log 2>&1 &
echo "✅ 前端已重启 (PID: $!)"

cd "$SCRIPT_DIR"

echo ""
echo "========================"
echo -e "🎉 更新完成！"
echo ""
echo "查看日志："
echo "  tail -f logs/api.log"
echo "  tail -f logs/web.log"
