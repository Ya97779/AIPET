# PetAI Mind 开发 Session 总结

## 项目概述

**产品名称**：宠爱智囊 (PetAI Mind)
**产品定位**：一站式智能宠物健康与行为管理看板
**技术栈**：Next.js 14 + FastAPI + PostgreSQL + Redis + 智谱GLM
**部署地址**：https://www.aipet.gzyhm.xyz

---

## 开发过程

### 阶段一：PRD 审视与重构

原始 PRD 存在以下问题：
- 缺少用户旅程、错误处理、边界条件
- 缺少商业模式、法律合规、KPI 等关键章节
- 模块顺序混乱

重构后 PRD 包含 9 个章节：
1. 文档基本信息与产品定位（含竞品分析）
2. 目标用户画像与用户旅程
3. 产品架构与技术方案
4. 信息架构与交互设计
5. 核心功能需求（5大模块）
6. 非功能性需求（含社区内容治理）
7. 商业模式与增长策略
8. 成功指标 (KPI)
9. 路线图与排期

新增功能模块：
- **AI 对话式宠物医生** — 多轮问诊，2-4轮追问后给出诊断
- **社区互助区** — 问答发帖 + 积分体系 + 积分商城
- **AI 推荐商城** — 诊断后推荐商品，CPS 佣金模式

### 阶段二：技术设计

技术选型决策：
- Monorepo 结构（pnpm workspace）
- 4核4G 云服务器 + Nginx 反向代理
- 智谱 GLM-4.6V（视觉）+ GLM-4.7（文本）
- shadcn/ui + Tailwind CSS
- 简化认证（MVP 固定账号）

### 阶段三：后端开发（Plan 1 + Plan 2）

**Plan 1：后端基础**（7个Task）
- Monorepo 初始化 + Docker Compose
- SQLAlchemy 模型（User/Pet/WeightRecord）
- Alembic 数据库迁移
- Pydantic Schema
- 认证服务 + 登录 API + 种子用户
- 宠物档案 CRUD + 体重追踪
- 测试套件

**Plan 2：AI 核心**（7个Task）
- 智谱 GLM API 客户端（流式+非流式+视觉）
- 问诊/食谱数据模型和 Schema
- 传图识病 Agent（GLM-4.6V）
- AI 对话医生 Agent（GLM-4.7）
- 智能食谱 Agent（RER/MER 计算 + AI）
- 问诊/食谱服务层
- API 路由（SSE 流式）

**后端 API 端点（15个）**：
```
认证:     POST /api/auth/login, GET /api/auth/me
宠物:     GET/POST /api/pets, GET/PUT/DELETE /api/pets/:id
          POST /api/pets/:id/weight, GET /api/pets/:id/weight/history
问诊:     POST /api/consultation/image (SSE)
          POST /api/consultation/chat/start
          POST /api/consultation/chat/:id (SSE)
          GET /api/consultation/chat/:id/history
食谱:     POST /api/recipe/generate, GET /api/recipe/history
```

### 阶段四：前端开发（Plan 3）

**前端页面（7个Task）**：
- Next.js 项目初始化 + Tailwind + 设计 Token
- API 客户端 + 认证工具
- 登录页（渐变背景）
- 主布局（侧边栏）+ Dashboard
- 宠物档案页（列表/新建/详情+体重追踪）
- AI 问诊页（传图识病 + AI 对话 + SSE 流式）
- 智能食谱页

**设计 Token**：
- 主色：#2563EB（信任、专业）
- 辅助色：#F59E0B（温暖、活泼）
- 字体：Inter + JetBrains Mono
- 圆角：12px

### 阶段五：部署

**部署架构**：
```
用户浏览器 → Nginx (443/HTTPS)
  ├── /         → Next.js :3000
  ├── /api/     → FastAPI :8000
  └── /api/consultation/ → FastAPI :8000 (SSE, 关闭缓冲)

Docker 容器：
  ├── PostgreSQL 16 (端口 5433)
  └── Redis 7 (端口 6379)
```

**部署过程遇到的问题及解决**：
1. **Docker 镜像拉取超时** — 配置国内镜像加速
2. **端口 5432 冲突** — 服务器已有 PostgreSQL，Docker 改用 5433
3. **Alembic 连接失败** — .env 文件不在 apps/api 目录下，修改 config.py 指向项目根目录
4. **TypeScript 类型错误** — Pet 类型 null vs undefined 不兼容
5. **useSearchParams 需要 Suspense** — 包裹 Suspense 边界
6. **Nginx 域名冲突** — 旧项目配置占用域名，使用新子域名
7. **HTTPS 证书** — 使用 certbot 申请 Let's Encrypt 证书
8. **图片上传后 AI 无响应** — 本地路径无法被智谱 API 访问，改为 base64 编码
9. **端口 3000 冲突** — 旧 Next.js 进程未完全退出

---

## 项目文件结构

```
ai-pet/
├── apps/
│   ├── web/                    # Next.js 前端
│   │   ├── app/
│   │   │   ├── (auth)/login/   # 登录页
│   │   │   ├── (dashboard)/    # 主应用
│   │   │   │   ├── page.tsx    # Dashboard
│   │   │   │   ├── pets/       # 宠物管理
│   │   │   │   ├── consultation/ # AI 问诊
│   │   │   │   └── recipe/     # 智能食谱
│   │   ├── components/         # UI 组件
│   │   └── lib/                # 工具函数
│   └── api/                    # FastAPI 后端
│       ├── app/
│       │   ├── api/            # API 路由
│       │   ├── agents/         # AI Agent
│       │   ├── models/         # 数据模型
│       │   ├── schemas/        # Pydantic Schema
│       │   ├── services/       # 业务逻辑
│       │   └── core/           # 配置/安全
│       └── alembic/            # 数据库迁移
├── docker-compose.yml          # PG + Redis
├── nginx/petai.conf            # Nginx 配置
├── deploy.sh                   # 一键部署脚本
├── update.sh                   # 一键更新脚本
├── README.md                   # 项目文档
└── docs/                       # 设计文档和实现计划
```

---

## 常用命令

```bash
# 部署（首次）
chmod +x deploy.sh && ./deploy.sh

# 更新代码
chmod +x update.sh && ./update.sh

# 查看日志
tail -f logs/api.log          # 后端日志
tail -f logs/web.log          # 前端日志

# Docker 管理
docker compose up -d          # 启动数据库
docker compose down           # 停止数据库
docker compose restart        # 重启数据库

# 手动重启后端
pkill -f uvicorn
cd apps/api && source .venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 > ../../logs/api.log 2>&1 &

# 手动重启前端
pkill -f "next start"
cd apps/web
nohup npm start > ../../logs/web.log 2>&1 &

# Nginx
sudo nginx -t && sudo systemctl reload nginx

# SSL 证书续期（certbot 自动续期，手动触发）
sudo certbot renew
```

---

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| user1 | 123456 | 测试用户 1 |
| user2 | 123456 | 测试用户 2 |
| admin | admin123 | 管理员 |

---

## Git 提交记录

```
bb1a728 chore: add update script
8cb10fd fix: convert uploaded images to base64 for Zhipu API
7a22a98 chore: update nginx config with HTTPS for aipet.gzyhm.xyz
e54b0c5 fix: wrap useSearchParams with Suspense
7316f1d fix: type error in pet detail page
fc3f57e feat: add recipe page with AI generation
ca6b25e feat: add AI consultation pages with SSE streaming
321edca feat: add pet management pages
24244c1 feat: add sidebar layout and dashboard homepage
432bfcd feat: add login page with gradient background
0bfa7f6 feat: add API client, auth utils, and helpers
219de68 feat: initialize Next.js frontend with Tailwind
75aadfa feat: add consultation and recipe API routes with SSE
a7112d5 feat: add consultation and recipe service layers
524041b feat: add recipe generator with RER/MER calculation
63b5159 feat: add chat doctor agent with GLM-4.7
558cc46 feat: add image diagnosis agent with GLM-4.6V
80a5c53 feat: add consultation and recipe models and schemas
15afd68 feat: add Zhipu GLM API client with streaming support
0d2cff2 feat: add pet CRUD API and weight tracking
2ffb95d test: add auth and pet API tests
ba6e886 feat: add Pydantic schemas for auth, pets, weight
afd380c feat: add SQLAlchemy models for User, Pet, WeightRecord
608e204 chore: initialize monorepo with FastAPI skeleton and Docker
```

---

## 待优化事项

1. **社区互助区** — PRD 中规划但未实现
2. **AI 推荐商城** — PRD 中规划但未实现
3. **化验单解读** — PRD 中规划但未实现
4. **体重趋势图表** — ECharts 图表集成
5. **图片云存储** — 当前使用本地存储，生产环境需 OSS
6. **用户注册** — 当前为固定账号，需开放注册
7. **Pro 订阅** — 支付集成
8. **移动端适配** — 响应式优化
9. **错误监控** — Sentry 集成
10. **CI/CD** — GitHub Actions 自动部署
