# 宠爱智囊 (PetAI Mind) MVP 技术设计文档

## 1. 项目概述

**产品**：宠爱智囊 (PetAI Mind) - 智能宠物健康管理系统  
**阶段**：Phase 0+1（AI问诊核心）  
**目标**：在4核4G云服务器上跑通用户系统、宠物档案、AI问诊、智能食谱的完整流程  

## 2. 技术栈

| 层级 | 选型 | 版本/说明 |
|------|------|----------|
| 包管理 | pnpm workspace | Monorepo |
| 前端框架 | Next.js 14+ | App Router, standalone模式 |
| UI组件 | shadcn/ui + Tailwind CSS | 数据看板美观 |
| 图表 | ECharts / Recharts | 体重趋势可视化 |
| 后端框架 | FastAPI | 异步SSE友好 |
| ASGI服务器 | uvicorn | 单worker(4G内存) |
| AI模型-视觉 | GLM-4.6V | 传图识病、化验单识别 |
| AI模型-文本 | GLM-4.7 | AI对话、食谱生成 |
| 数据库 | PostgreSQL 16 | 结构化数据 |
| 向量扩展 | PGVector | RAG知识库(Phase 1.5) |
| 缓存 | Redis | 对话上下文、会话管理 |
| 部署 | Nginx + 云服务器 | 4核4G，已备案域名 |

## 3. 项目结构

```
ai-pet/
├── apps/
│   ├── web/                          # Next.js 前端
│   │   ├── app/
│   │   │   ├── (auth)/               # 认证相关页面
│   │   │   │   └── login/page.tsx
│   │   │   ├── (dashboard)/          # 主应用页面
│   │   │   │   ├── page.tsx          # 首页Dashboard
│   │   │   │   ├── pets/             # 宠物档案
│   │   │   │   ├── consultation/     # AI问诊大厅
│   │   │   │   │   ├── image/        # 传图识病
│   │   │   │   │   └── chat/         # AI对话医生
│   │   │   │   └── recipe/           # 智能食谱
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui组件
│   │   │   ├── layout/               # 布局组件
│   │   │   ├── pet/                  # 宠物相关组件
│   │   │   ├── consultation/         # 问诊相关组件
│   │   │   └── recipe/               # 食谱相关组件
│   │   ├── lib/
│   │   │   ├── api.ts                # API客户端
│   │   │   ├── auth.ts               # 认证工具
│   │   │   └── utils.ts              # 通用工具
│   │   ├── next.config.js            # standalone配置
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                          # FastAPI 后端
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth.py           # 认证接口
│       │   │   ├── pets.py           # 宠物档案接口
│       │   │   ├── consultation.py   # 问诊接口(含SSE)
│       │   │   └── recipe.py         # 食谱接口
│       │   ├── agents/
│       │   │   ├── image_diagnosis.py # 传图识病Agent
│       │   │   ├── chat_doctor.py     # AI对话医生Agent
│       │   │   └── recipe_generator.py # 食谱生成Agent
│       │   ├── models/
│       │   │   ├── user.py
│       │   │   ├── pet.py
│       │   │   ├── consultation.py
│       │   │   └── recipe.py
│       │   ├── services/
│       │   │   ├── auth_service.py
│       │   │   ├── pet_service.py
│       │   │   ├── consultation_service.py
│       │   │   └── recipe_service.py
│       │   ├── core/
│       │   │   ├── config.py         # 配置管理
│       │   │   ├── database.py       # 数据库连接
│       │   │   ├── redis.py          # Redis连接
│       │   │   └── security.py       # 认证中间件
│       │   └── main.py               # FastAPI入口
│       ├── alembic/                   # 数据库迁移
│       ├── requirements.txt
│       └── alembic.ini
│
├── data/
│   ├── breeds.json                    # 品种数据(100+品种)
│   ├── breed_curves.json              # 品种标准体重曲线
│   └── nutrition.json                 # 营养学基础数据
│
├── nginx/
│   └── petai.conf                     # Nginx配置
│
├── docker-compose.yml                 # PG + Redis
├── pnpm-workspace.yaml
├── package.json
└── .env.example                       # 环境变量模板
```

## 4. 数据库设计

### 4.1 ER图概要

```
users (1) ──── (N) pets (1) ──── (N) weight_records
   │                │
   │                ├── (N) consultations
   │                ├── (N) chat_sessions (1) ──── (N) chat_messages
   │                └── (N) recipes
   │
   └── points_transactions (Phase 1.5)
```

### 4.2 表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50),
  avatar_url TEXT,
  points_balance INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 宠物档案表
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  species VARCHAR(20) NOT NULL,           -- cat/dog
  breed VARCHAR(50) NOT NULL,
  gender VARCHAR(10) NOT NULL,            -- male/female
  neutered BOOLEAN NOT NULL DEFAULT FALSE,
  birthday DATE,
  weight_kg DECIMAL(5,2),
  medical_history JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 体重记录表
CREATE TABLE weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_weight_pet_date ON weight_records(pet_id, recorded_at DESC);

-- 问诊记录表
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id),
  type VARCHAR(20) NOT NULL,              -- image/chat
  input_text TEXT,
  input_images JSONB DEFAULT '[]',
  ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_consultation_pet ON consultations(pet_id, created_at DESC);

-- AI对话会话表
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  pet_id UUID REFERENCES pets(id),
  status VARCHAR(20) DEFAULT 'active',    -- active/ended
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- 对话消息表
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,              -- user/assistant
  content TEXT NOT NULL,
  image_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_msg_session ON chat_messages(session_id, created_at ASC);

-- 食谱记录表
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id),
  daily_calories DECIMAL(7,2),
  food_items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 预置数据

**MVP固定账号**：
```sql
INSERT INTO users (username, password_hash, nickname) VALUES
  ('user1', '<hashed_123456>', '测试用户1'),
  ('user2', '<hashed_123456>', '测试用户2'),
  ('admin', '<hashed_admin123>', '管理员');
```

## 5. API 设计

### 5.1 认证 API

```
POST /api/auth/login
  Request:  { "username": "user1", "password": "123456" }
  Response: { "token": "xxx", "user": { "id", "nickname", ... } }

GET /api/user/me
  Header:   Authorization: Bearer <token>
  Response: { "id", "username", "nickname", "avatar_url", "points_balance" }
```

### 5.2 宠物档案 API

```
GET    /api/pets                       # 获取当前用户所有宠物
POST   /api/pets                       # 创建宠物档案
GET    /api/pets/:id                   # 获取单个宠物详情
PUT    /api/pets/:id                   # 更新宠物档案
DELETE /api/pets/:id                   # 删除宠物档案
POST   /api/pets/:id/weight            # 录入体重 { "weight_kg": 4.5, "recorded_at": "2026-06-13" }
GET    /api/pets/:id/weight/history     # 体重历史 ?period=month|year
```

### 5.3 AI 问诊 API

```
POST /api/consultation/image           # 传图识病 (SSE)
  Request:  multipart/form-data { pet_id, text, images[] }
  Response: SSE stream → { "type": "text", "content": "..." }

POST /api/consultation/chat/start      # 开始AI对话
  Request:  { "pet_id": "xxx" }
  Response: { "session_id": "xxx" }

POST /api/consultation/chat/:session_id  # 发送消息 (SSE)
  Request:  multipart/form-data { text, images[] }
  Response: SSE stream → { "type": "text", "content": "..." }

GET  /api/consultation/chat/:session_id  # 获取对话历史
  Response: { "messages": [...] }

GET  /api/consultations                # 问诊记录列表
  Query:    pet_id, page, limit
```

### 5.4 智能食谱 API

```
POST /api/recipe/generate              # 生成食谱
  Request:  { "pet_id": "xxx" }
  Response: { "daily_calories", "food_items": [...], "nutrition_ratio" }

GET  /api/recipe/history               # 食谱历史
  Query:    pet_id, page, limit
```

### 5.5 SSE 流式传输协议

```
Content-Type: text/event-stream

event: start
data: {"type": "status", "content": "正在读取宠物档案..."}

event: message
data: {"type": "text", "content": "根据"}

event: message
data: {"type": "text", "content": "您描述的症状"}

event: message
data: {"type": "text", "content": "..."}

event: end
data: {"type": "done", "consultation_id": "xxx"}
```

## 6. AI Agent 设计

### 6.1 传图识病 Agent

```python
# Prompt 结构
SYSTEM_PROMPT = """
你是一位专业的宠物皮肤科AI助手。
请根据用户上传的图片和描述，分析宠物的皮肤状况。

{pet_context}  # 宠物档案上下文

输出格式要求（JSON）：
{
  "possible_causes": [
    {"name": "病因名称", "probability": "高/中/低", "description": "简述"}
  ],
  "urgency": "normal/warning/critical",
  "home_care": ["建议1", "建议2"],
  "see_doctor": true/false,
  "disclaimer": "本报告由AI生成..."
}
"""
```

### 6.2 AI 对话医生 Agent

```python
# 多轮对话上下文管理
# Redis Key: chat:{session_id}
# TTL: 30分钟

SYSTEM_PROMPT = """
你是一位经验丰富的宠物AI医生。
请通过多轮问诊，帮助主人分析宠物的健康问题。

{pet_context}  # 宠物档案上下文

问诊流程：
1. 了解主诉症状
2. 追问关键信息（持续时间、伴随症状、饮食变化等）
3. 2-4轮后给出诊断建议

输出格式：
- 追问阶段：自然语言提问
- 诊断阶段：JSON格式的结构化报告
"""
```

### 6.3 食谱生成 Agent

```python
# RER/MER 计算（纯Python，不调用AI）
def calculate_rer(weight_kg: float) -> float:
    return 70 * (weight_kg ** 0.75)

def calculate_mer(rer: float, factor: float) -> float:
    return rer * factor

# AI生成具体食谱
RECIPE_PROMPT = """
根据以下信息生成宠物每日食谱：
- 每日能量需求：{mer} kcal
- 品种：{breed}
- 过敏史：{allergies}

要求输出JSON格式的食物清单，包含食物名称、克数、营养素。
"""
```

## 7. 4G内存优化策略

| 组件 | 配置 | 预估内存 |
|------|------|---------|
| PostgreSQL | shared_buffers=256MB, work_mem=4MB, max_connections=50 | ~500MB |
| Redis | maxmemory=256MB, maxmemory-policy=allkeys-lru | ~256MB |
| Next.js | standalone模式, NODE_OPTIONS="--max-old-space-size=384" | ~50MB |
| FastAPI | 单worker, --limit-concurrency=50 | ~200MB |
| Nginx | worker_processes=1 | ~20MB |
| OS + 其他 | | ~500MB |
| **总计** | | **~1.5GB / 4GB** |

## 8. 部署配置

### 8.1 Docker Compose（PG + Redis）

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: petai
      POSTGRES_USER: petai
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    deploy:
      resources:
        limits:
          memory: 768M

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    ports:
      - "6379:6379"
    deploy:
      resources:
        limits:
          memory: 384M

volumes:
  pgdata:
  redisdata:
```

### 8.2 Nginx 配置

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

    # 后端API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SSE流式传输（关键！关闭缓冲）
    location ~ ^/api/consultation/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 300s;
    }

    # 上传文件静态服务
    location /uploads/ {
        alias /data/petai/uploads/;
        expires 7d;
    }
}
```

## 9. 开发计划

### Phase 0：技术验证（1-2天）
- [ ] 初始化Monorepo（pnpm workspace）
- [ ] Next.js standalone构建验证
- [ ] FastAPI + 智谱GLM API连通测试
- [ ] SSE流式传输端到端Demo
- [ ] Docker Compose启动PG + Redis
- [ ] Nginx配置验证
- [ ] 4G内存下所有服务稳定性验证

### Phase 1：核心开发（5-6周）
- Week 1：用户系统 + 宠物档案
- Week 2-3：AI问诊大厅（传图识病 + AI对话医生）
- Week 4：智能食谱
- Week 5-6：联调 + 优化 + 部署

## 10. 环境变量

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=petai
DB_USER=petai
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379/0

# AI模型
ZHIPU_API_KEY=your_api_key
ZHIPU_VISION_MODEL=glm-4.6v
ZHIPU_TEXT_MODEL=glm-4.7

# 应用
SECRET_KEY=your_secret_key
UPLOAD_DIR=/data/petai/uploads
MAX_UPLOAD_SIZE=5242880  # 5MB
```
