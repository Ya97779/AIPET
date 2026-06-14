# 🐾 宠爱智囊 (PetAI Mind)

智能宠物健康管理系统 —— 用 AI 让每位宠物主都拥有"随身兽医顾问"。

🔗 **在线体验**：https://www.aipet.gzyhm.xyz

## ✨ 功能介绍

### 📋 宠物档案管理
- 创建宠物档案（品种、性别、生日、体重、病史、过敏史）
- 体重趋势追踪，支持多次记录
- 同品种标准曲线对比

### 🔍 传图识病
- 上传宠物患处照片 + 描述症状
- AI 分析可能的病因（概率排序）
- 紧急程度评估（🟢正常 / 🟡择日就医 / 🔴立即就医）
- 居家护理建议

### 💬 AI 对话医生
- 多轮对话式问诊
- AI 智能追问（持续时间、伴随症状等）
- 2-4 轮后给出结构化诊断报告
- 支持对话中追加图片

### 🍽️ 智能食谱
- 根据宠物体重自动计算每日能量需求（RER/MER）
- AI 生成具体食谱（主食克数 + 自制辅食）
- 营养配比展示（蛋白质/脂肪/碳水）

## 🚀 快速开始

### 测试账号

| 用户名 | 密码 |
|--------|------|
| user1 | 123456 |
| user2 | 123456 |

### 使用流程

1. 访问 https://www.aipet.gzyhm.xyz
2. 使用测试账号登录
3. 创建宠物档案（填写品种、体重等信息）
4. 进入「AI问诊」使用传图识病或AI对话医生
5. 进入「智能食谱」生成专属食谱

## 🛠️ 本地开发

```bash
# 克隆项目
git clone https://github.com/Ya97779/AIPET.git
cd AIPET

# 启动数据库
docker compose up -d

# 后端
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 填入 ZHIPU_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 前端
cd apps/web
npm install
npm run dev
```

## 📁 项目结构

```
ai-pet/
├── apps/
│   ├── web/          # Next.js 前端
│   └── api/          # FastAPI 后端
├── docs/             # PRD 和设计文档
├── docker-compose.yml
├── deploy.sh         # 一键部署
└── update.sh         # 一键更新
```

## 📄 文档

- [产品需求文档 (PRD)](docs/prd.md)
- [技术设计文档](docs/superpowers/specs/2026-06-13-petai-mvp-technical-design.md)
- [开发 Session 总结](SESSION_SUMMARY.md)

## 🔑 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + Tailwind CSS + Lucide Icons |
| 后端 | FastAPI + SQLAlchemy 2.0 |
| AI | 智谱 GLM-4.6V（视觉）+ GLM-4.7（文本） |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 部署 | Docker + Nginx + HTTPS |
