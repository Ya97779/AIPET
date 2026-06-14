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
  ├── /api/     → FastAPI :8001
  └── /api/consultation/ → FastAPI :8001 (SSE, 关闭缓冲)

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
10. **端口 8000 冲突** — 服务器上 fitcoach 项目占用 8000，PetAI 改用 8001
11. **Nginx sites-enabled 缺少链接** — petai.conf 未链接到 sites-enabled
12. **conf.d 配置冲突** — conf.d/petai.conf 旧配置与 sites-available 冲突，删除旧配置

---

### 阶段六：Phase 1.5 — 社区 + 积分商城 + 化验单 + AI推荐（2026-06-21）

本次 Session 实现了 PRD 中的 4 个未完成模块。

#### 6.1 社区互助区

**功能**：
- 用户发帖提问（支持 5 个分类：疾病咨询/营养喂养/行为训练/日常护理/其他）
- 悬赏积分系统（发帖时可选悬赏，从余额扣除）
- 回答问题（回答者固定获得 20 积分）
- 采纳最佳回答（悬赏积分转给被采纳者）
- 点赞回答
- 跨账号可见

**新增数据模型**：
- `questions` — 问题表（含悬赏积分、分类、状态）
- `answers` — 回答表
- `likes` — 点赞记录表

**新增 API**：
```
POST   /api/community/questions          发帖
GET    /api/community/questions          问题列表（分类筛选+排序+分页）
GET    /api/community/questions/:id      问题详情
POST   /api/community/questions/:id/answers  回答
POST   /api/community/answers/:id/accept     采纳
POST   /api/community/answers/:id/like       点赞
```

**前端页面**：
- `/community` — 问题列表（分类 tab + 最新/最热/待回答排序）
- `/community/new` — 发帖（含悬赏积分设置）
- `/community/[id]` — 问题详情 + 回答列表 + 采纳/点赞

#### 6.2 积分系统

**积分规则**：
| 行为 | 积分 |
|------|------|
| 初始注册 | +100 |
| 回答问题 | +20 |
| 回答被采纳 | +悬赏值 |
| 发帖悬赏 | -悬赏值 |

**积分商城**：
- 5 个积分商品（零食/逗猫棒/罐头/Pro体验/毛绒玩具）
- 10 个推荐商品（药品/食品/用品，带标签匹配）
- 兑换记录 + 积分明细

**新增数据模型**：
- `points_transactions` — 积分流水表
- `points_products` — 积分商品表
- `points_redemptions` — 兑换记录表
- `products` — 推荐商品表
- `product_clicks` — 点击记录表

**前端页面**：
- `/mall` — 三个 tab（积分兑换 / 为你推荐 / 兑换记录+积分明细）

#### 6.3 化验单解读

**功能**：上传化验单图片 → 智谱 GLM-4.6V 识别 → 输出格式化解读文字

**提示词设计**：输出包含 📋检测指标解读 → 📊综合分析 → 💡建议 → ⚠️紧急程度

**新增 API**：
```
POST /api/consultation/lab-report      化验单解读 (SSE)
GET  /api/consultation/history         问诊历史列表（支持 type 筛选）
GET  /api/consultation/chat/sessions   对话会话列表
```

**前端页面**：
- `/consultation/lab-report` — 上传 + 结果展示 + 历史记录

#### 6.4 AI 诊断推荐

**功能**：诊断完成后，AI 输出推荐商品标签，前端根据标签匹配商品展示

**推荐逻辑**：
1. AI 在诊断结果末尾输出「推荐商品标签」（从预定义标签中选择）
2. 前端解析标签，调用 `/api/mall/recommend?tags=xxx`
3. 后端按标签交集匹配商品，返回相关商品卡片

**预定义标签**：皮肤/猫癣/真菌/脱毛/瘙痒/红肿/过敏/肠胃/呕吐/腹泻/耳螨/肥胖/毛球/寄生虫/营养/眼睛/口腔/呼吸道 等

#### 6.5 其他优化

**传图识病提示词扩展**：
- 从「皮肤科AI助手」改为「全科AI助手」
- 覆盖皮肤/眼睛/耳朵/鼻子/口腔/体液/肢体等全部可图片观察的健康问题

**宠物选择改为可选**：
- 问诊不再强制选择宠物
- 化验单、传图识病、AI对话均可不选宠物直接使用

**历史记录**：
- 所有问诊页面显示历史记录（传图识病/AI对话/化验单）
- AI 问诊主页合并显示所有类型历史（按时间倒序）
- 传图识病历史显示图片缩略图 + 诊断结果（可展开）
- 化验单历史显示解读文字（可展开）
- 对话历史自动从第一条消息回填标题

**性能优化**：
- HTTP 连接复用（httpx 持久客户端）
- 对话历史限制最近 10 条（避免 prompt 过长）
- 去掉 chat sessions 的 N+1 查询
- 前端 GET 请求内存缓存（30 秒 TTL）

**Bug 修复**：
- 对话医生回复丢失 — React 闭包陷阱，用 useRef 保存最新流式内容
- 积分显示不一致 — 发帖前从服务器实时获取积分余额
- Alembic 多 head — 修正 down_revision 链接
- update.sh 端口占用 — 改用 pkill -9 杀进程
- 化验单 Agent 导入错误 — ZhipuClient 不存在，改用 vision_completion_stream

---

## 项目文件结构

```
ai-pet/
├── apps/
│   ├── web/                          # Next.js 前端
│   │   ├── app/
│   │   │   ├── (auth)/login/         # 登录页
│   │   │   ├── (dashboard)/          # 主应用
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── pets/             # 宠物管理
│   │   │   │   ├── consultation/     # AI 问诊
│   │   │   │   │   ├── page.tsx      # 问诊大厅（含历史记录）
│   │   │   │   │   ├── image/        # 传图识病
│   │   │   │   │   ├── chat/[id]/    # AI 对话
│   │   │   │   │   └── lab-report/   # 化验单解读
│   │   │   │   ├── recipe/           # 智能食谱
│   │   │   │   ├── community/        # 社区互助
│   │   │   │   │   ├── page.tsx      # 问题列表
│   │   │   │   │   ├── new/          # 发帖
│   │   │   │   │   └── [id]/         # 问题详情
│   │   │   │   └── mall/             # 积分商城
│   │   ├── components/
│   │   │   ├── layout/sidebar.tsx    # 侧边栏（6个导航项）
│   │   │   ├── community/            # 社区组件
│   │   │   ├── mall/                 # 商城组件
│   │   │   ├── consultation/         # 问诊组件
│   │   │   ├── pet/                  # 宠物组件
│   │   │   └── recipe/               # 食谱组件
│   │   └── lib/
│   │       ├── api.ts                # API 客户端（含缓存）
│   │       ├── auth.ts               # 认证工具
│   │       ├── sse.ts                # SSE 流式工具
│   │       └── utils.ts
│   └── api/                          # FastAPI 后端
│       ├── app/
│       │   ├── api/                  # API 路由
│       │   │   ├── auth.py
│       │   │   ├── pets.py
│       │   │   ├── consultation.py   # 问诊（含化验单+历史+会话列表）
│       │   │   ├── recipe.py
│       │   │   ├── community.py      # 社区问答
│       │   │   └── mall.py           # 商城（积分兑换+推荐）
│       │   ├── agents/               # AI Agent
│       │   │   ├── image_diagnosis.py # 传图识病（全科）
│       │   │   ├── chat_doctor.py     # AI 对话医生
│       │   │   ├── recipe_generator.py # 食谱生成
│       │   │   └── lab_report.py      # 化验单解读
│       │   ├── models/               # 数据模型（13个表）
│       │   ├── schemas/              # Pydantic Schema
│       │   ├── services/             # 业务逻辑
│       │   ├── seeds/                # 种子数据
│       │   └── core/                 # 配置/安全/HTTP客户端
│       └── alembic/                  # 数据库迁移
├── docker-compose.yml                # PG + Redis
├── nginx/petai.conf                  # Nginx 配置（端口 8001）
├── deploy.sh                         # 一键部署脚本
├── update.sh                         # 一键更新脚本
└── docs/                             # 设计文档和实现计划
```

---

## 数据库表结构（13张表）

| 表名 | 用途 |
|------|------|
| users | 用户（含积分余额） |
| pets | 宠物档案 |
| weight_records | 体重记录 |
| consultations | 问诊记录（传图/化验单） |
| chat_sessions | AI 对话会话 |
| chat_messages | 对话消息 |
| recipes | 食谱记录 |
| questions | 社区问题 |
| answers | 社区回答 |
| likes | 点赞记录 |
| points_transactions | 积分流水 |
| points_products | 积分商品 |
| points_redemptions | 兑换记录 |
| products | 推荐商品 |
| product_clicks | 推荐点击记录 |

---

## 后端 API 端点（完整）

```
认证:
  POST /api/auth/login
  GET  /api/auth/me

宠物:
  GET/POST   /api/pets
  GET/PUT/DELETE /api/pets/:id
  POST       /api/pets/:id/weight
  GET        /api/pets/:id/weight/history

问诊:
  POST /api/consultation/image           传图识病 (SSE)
  POST /api/consultation/chat/start      开始对话
  POST /api/consultation/chat/:id        发送消息 (SSE)
  GET  /api/consultation/chat/:id/history 对话历史
  GET  /api/consultation/chat/sessions    会话列表
  POST /api/consultation/lab-report       化验单解读 (SSE)
  GET  /api/consultation/history          问诊历史列表

食谱:
  POST /api/recipe/generate
  GET  /api/recipe/history

社区:
  POST /api/community/questions
  GET  /api/community/questions
  GET  /api/community/questions/:id
  POST /api/community/questions/:id/answers
  POST /api/community/answers/:id/accept
  POST /api/community/answers/:id/like

商城:
  GET  /api/mall/points-products
  POST /api/mall/redeem
  GET  /api/mall/redemptions
  GET  /api/mall/points/history
  GET  /api/mall/recommend
  GET  /api/mall/products
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

# 手动重启后端
pkill -9 -f uvicorn
cd apps/api && source .venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1 > ../../logs/api.log 2>&1 &

# 手动重启前端
pkill -9 -f "next start"
cd apps/web
nohup npm start > ../../logs/web.log 2>&1 &

# 数据库迁移
cd apps/api && source .venv/bin/activate
alembic upgrade head

# Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 测试账号

| 用户名 | 密码 | 角色 | 积分 |
|--------|------|------|------|
| user1 | 123456 | 测试用户 1 | 100 |
| user2 | 123456 | 测试用户 2 | 100 |
| admin | admin123 | 管理员 | 80 |

---

## 已知问题与待优化

1. **体重趋势图表** — ECharts 图表集成
2. **图片云存储** — 当前使用本地存储，生产环境需 OSS
3. **用户注册** — 当前为固定账号，需开放注册
4. **Pro 订阅** — 支付集成
5. **移动端适配** — 响应式优化
6. **错误监控** — Sentry 集成
7. **CI/CD** — GitHub Actions 自动部署
8. **社区内容治理** — AI 审核、举报机制
9. **化验单历史** — 旧记录显示原始 JSON（新记录已改为文字）
10. **对话历史** — 旧会话显示"未命名对话"（新会话已自动保存标题）
