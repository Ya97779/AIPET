# 🐾 宠爱智囊 (PetAI Mind)

智能宠物健康管理系统 —— 用 AI 让每位宠物主都拥有"随身兽医顾问"。

## ✨ 核心功能

- **📋 宠物档案管理** — 建立宠物健康档案，追踪体重趋势
- **🔍 传图识病** — 上传宠物患处照片，AI 快速分析病因
- **💬 AI 对话医生** — 多轮问诊，AI 逐步分析健康问题
- **🍽️ 智能食谱** — 根据体重/品种自动生成精准营养配比

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + Tailwind CSS + Lucide Icons |
| 后端 | FastAPI + SQLAlchemy 2.0 + Alembic |
| AI 模型 | 智谱 GLM-4.6V (视觉) + GLM-4.7 (文本) |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 部署 | Nginx + Docker Compose |

## 📁 项目结构

```
ai-pet/
├── apps/
│   ├── web/                    # Next.js 前端
│   │   ├── app/                # 页面路由
│   │   ├── components/         # UI 组件
│   │   └── lib/                # 工具函数
│   └── api/                    # FastAPI 后端
│       ├── app/
│       │   ├── api/            # API 路由
│       │   ├── agents/         # AI Agent
│       │   ├── models/         # 数据模型
│       │   ├── schemas/        # Pydantic Schema
│       │   ├── services/       # 业务逻辑
│       │   └── core/           # 配置/数据库/安全
│       └── alembic/            # 数据库迁移
├── docker-compose.yml          # PG + Redis
├── nginx/                      # Nginx 配置
└── docs/                       # 设计文档和实现计划
```

## 🚀 快速开始

### 前置要求

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- 智谱 AI API Key ([申请地址](https://open.bigmodel.cn/))

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-pet.git
cd ai-pet
```

### 2. 启动数据库

```bash
docker compose up -d
```

启动 PostgreSQL (端口 5432) 和 Redis (端口 6379)。

### 3. 配置后端

```bash
cd apps/api

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 ZHIPU_API_KEY
```

### 4. 初始化数据库

```bash
# 生成迁移文件
alembic revision --autogenerate -m "initial tables"

# 执行迁移
alembic upgrade head
```

### 5. 启动后端

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端 API: http://localhost:8000
API 文档: http://localhost:8000/docs

### 6. 启动前端

```bash
cd apps/web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端页面: http://localhost:3000

### 7. 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| user1 | 123456 | 测试用户 1 |
| user2 | 123456 | 测试用户 2 |
| admin | admin123 | 管理员 |

## 🔌 API 端点

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户名密码登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 宠物档案

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/pets` | 获取宠物列表 |
| POST | `/api/pets` | 创建宠物档案 |
| GET | `/api/pets/:id` | 获取宠物详情 |
| PUT | `/api/pets/:id` | 更新宠物档案 |
| DELETE | `/api/pets/:id` | 删除宠物档案 |
| POST | `/api/pets/:id/weight` | 录入体重 |
| GET | `/api/pets/:id/weight/history` | 体重历史 |

### AI 问诊

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/consultation/image` | 传图识病 (SSE 流式) |
| POST | `/api/consultation/chat/start` | 开始 AI 对话 |
| POST | `/api/consultation/chat/:id` | 发送消息 (SSE 流式) |
| GET | `/api/consultation/chat/:id/history` | 对话历史 |

### 智能食谱

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/recipe/generate` | 生成食谱 |
| GET | `/api/recipe/history` | 食谱历史 |

## 🌐 生产部署

### 服务器要求

- 云服务器 4 核 4G 以上
- 已备案域名
- Docker & Docker Compose

### 部署步骤

```bash
# 1. 克隆代码
git clone https://github.com/your-username/ai-pet.git
cd ai-pet

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 填入生产配置

# 3. 启动数据库
docker compose up -d

# 4. 启动后端
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 &

# 5. 构建前端
cd ../web
npm install
npm run build
nohup npm start &

# 6. 配置 Nginx
sudo cp ../../nginx/petai.conf /etc/nginx/conf.d/
sudo nginx -t && sudo systemctl reload nginx
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSE 流式传输（关键！）
    location ~ ^/api/consultation/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 300s;
    }
}
```

## 🔑 环境变量

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petai
DB_USER=petai
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379/0

# AI 模型
ZHIPU_API_KEY=your_zhipu_api_key
ZHIPU_VISION_MODEL=glm-4.6v
ZHIPU_TEXT_MODEL=glm-4.7

# 应用
SECRET_KEY=your_random_secret_key
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=5242880
```

## 📄 许可证

MIT License
