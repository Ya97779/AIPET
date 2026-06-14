#!/bin/bash
# PetAI Mind 一键部署脚本
# 使用方式: chmod +x deploy.sh && ./deploy.sh

set -e

echo "🐾 PetAI Mind 部署脚本"
echo "========================"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查依赖
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ 未安装 $1${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ $1 已安装${NC}"
    return 0
}

echo ""
echo "📋 检查依赖..."
check_dependency docker
check_dependency python3 || check_dependency python
check_dependency node
check_dependency npm

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo ""
    echo -e "${YELLOW}⚠️  未找到 .env 文件，正在从模板创建...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}请编辑 .env 文件填入你的配置：${NC}"
    echo "  - DB_PASSWORD: 数据库密码"
    echo "  - ZHIPU_API_KEY: 智谱AI API Key"
    echo "  - SECRET_KEY: 应用密钥"
    echo ""
    read -p "已编辑 .env？按 Enter 继续，Ctrl+C 退出..."
fi

# 1. 启动数据库
echo ""
echo "🐘 启动 PostgreSQL 和 Redis..."
docker compose up -d
sleep 5

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U petai &>/dev/null; then
        echo -e "${GREEN}✅ 数据库已就绪${NC}"
        break
    fi
    sleep 1
done

# 2. 配置后端
echo ""
echo "🐍 配置后端..."
cd apps/api

if [ ! -d ".venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv .venv 2>/dev/null || python -m venv .venv
fi

source .venv/bin/activate 2>/dev/null || . .venv/Scripts/activate

echo "安装依赖..."
pip install -r requirements.txt -q

# 3. 数据库迁移
echo ""
echo "🗃️  执行数据库迁移..."
alembic revision --autogenerate -m "initial tables" 2>/dev/null || true
alembic upgrade head

# 4. 启动后端
echo ""
echo "🚀 启动后端服务..."
if pgrep -f "uvicorn app.main" > /dev/null; then
    echo "后端已在运行，跳过..."
else
    nohup .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 > ../../logs/api.log 2>&1 &
    echo -e "${GREEN}✅ 后端已启动 (端口 8000)${NC}"
fi

cd "$SCRIPT_DIR"

# 5. 构建前端
echo ""
echo "📦 构建前端..."
cd apps/web
npm install -q
npm run build

# 6. 启动前端
echo ""
echo "🌐 启动前端服务..."
if pgrep -f "next start" > /dev/null; then
    echo "前端已在运行，跳过..."
else
    nohup npm start > ../../logs/web.log 2>&1 &
    echo -e "${GREEN}✅ 前端已启动 (端口 3000)${NC}"
fi

cd "$SCRIPT_DIR"

# 7. 配置 Nginx
echo ""
echo "🔧 配置 Nginx..."
if command -v nginx &> /dev/null; then
    if [ -f nginx/petai.conf ]; then
        sudo cp nginx/petai.conf /etc/nginx/conf.d/petai.conf
        sudo nginx -t && sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx 配置已更新${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到 nginx/petai.conf，跳过 Nginx 配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  未安装 Nginx，跳过${NC}"
fi

# 完成
echo ""
echo "========================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo "访问地址："
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo ""
echo "测试账号："
echo "  user1 / 123456"
echo "  user2 / 123456"
echo "  admin / admin123"
echo ""
echo "日志文件："
echo "  后端: logs/api.log"
echo "  前端: logs/web.log"
echo ""
echo "常用命令："
echo "  查看后端日志: tail -f logs/api.log"
echo "  查看前端日志: tail -f logs/web.log"
echo "  重启服务: docker compose restart && ./deploy.sh"
echo "  停止服务: docker compose down"
