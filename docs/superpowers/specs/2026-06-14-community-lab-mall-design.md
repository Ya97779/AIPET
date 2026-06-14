# 宠爱智囊 Phase 1.5 设计文档：社区互助区 + 积分商城 + 化验单解读 + AI诊断推荐

## 1. 概述

在 MVP 核心功能（宠物档案、AI 问诊、智能食谱）已上线的基础上，新增 4 个模块：

| 模块 | 目标 | 优先级 |
|------|------|--------|
| 社区互助区 | 用户间问答，悬赏积分激励 | P0 |
| 积分系统 | 支撑社区积分流转 + 商城兑换 | P0 |
| 化验单解读 | 上传化验单图片 → 结构化表格 + AI 解读 | P1 |
| AI 诊断推荐 | 诊断后根据症状推荐药品/用品卡片 | P1 |

**设计约束**：
- 4 核 4G 云服务器，单 FastAPI worker
- 复用现有智谱 GLM API（视觉用 glm-4.6v，文本用 glm-4.7）
- 复用现有 SSE 流式传输架构
- MVP 阶段不做真实支付、不做外部链接跳转

---

## 2. 数据模型

### 2.1 新增表（6 张）

```
users (已有，修改 points_balance 默认值为 100)
  │
  ├── (N) questions              社区问题
  │     └── (N) answers          社区回答
  │           └── (N) likes      点赞记录
  │
  ├── (N) points_transactions    积分流水
  ├── (N) points_redemptions     兑换记录
  └── (N) product_clicks         推荐点击

points_products    积分商品（独立表，不关联用户）
products           推荐商品（独立表，不关联用户）
```

### 2.2 表结构

```sql
-- 社区问题表
questions (
  id UUID PK,
  user_id UUID FK→users,
  title VARCHAR(100) NOT NULL,          -- 5-100字
  content TEXT NOT NULL,                 -- 10-2000字
  image_urls JSONB DEFAULT '[]',        -- 最多9张
  category VARCHAR(20) NOT NULL,        -- disease/nutrition/behavior/daily/other
  pet_id UUID FK→pets,                  -- 可选，关联宠物档案
  bounty_points INT DEFAULT 0,          -- 悬赏积分
  status VARCHAR(20) DEFAULT 'open',    -- open/answered/closed
  view_count INT DEFAULT 0,
  answer_count INT DEFAULT 0,
  accepted_answer_id UUID,              -- 被采纳的回答
  created_at TIMESTAMPTZ
)

-- 社区回答表
answers (
  id UUID PK,
  question_id UUID FK→questions ON DELETE CASCADE,
  user_id UUID FK→users,
  content TEXT NOT NULL,                 -- 10-2000字
  image_urls JSONB DEFAULT '[]',
  is_accepted BOOLEAN DEFAULT FALSE,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- 点赞记录表
likes (
  id UUID PK,
  user_id UUID FK→users,
  answer_id UUID FK→answers ON DELETE CASCADE,
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, answer_id)            -- 防重复点赞
)

-- 积分流水表
points_transactions (
  id UUID PK,
  user_id UUID FK→users,
  amount INT NOT NULL,                   -- 正数=收入，负数=支出
  type VARCHAR(20) NOT NULL,             -- earn/spend
  reason VARCHAR(50) NOT NULL,           -- answer_reward/bounty_reward/question_cost/signin/initial
  reference_id UUID,                     -- 关联的问题/回答/兑换ID
  created_at TIMESTAMPTZ
)

-- 积分商品表
points_products (
  id UUID PK,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  points_cost INT NOT NULL,              -- 所需积分
  stock INT NOT NULL DEFAULT 0,          -- 库存
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
)

-- 积分兑换记录表
points_redemptions (
  id UUID PK,
  user_id UUID FK→users,
  product_id UUID FK→points_products,
  points_spent INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending/completed/cancelled
  created_at TIMESTAMPTZ
)

-- 推荐商品表（静态数据，AI 诊断后匹配展示）
products (
  id UUID PK,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  price VARCHAR(20),                     -- 展示价格，如 "¥89"
  category VARCHAR(20),                  -- medicine/food/tool/other
  tags JSONB DEFAULT '[]',               -- 匹配标签，如 ["皮肤","猫癣","真菌","瘙痒"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
)

-- 推荐点击记录表
product_clicks (
  id UUID PK,
  user_id UUID FK→users,
  product_id UUID FK→products,
  source VARCHAR(20),                    -- diagnosis/chat/lab_report
  created_at TIMESTAMPTZ
)
```

### 2.3 种子数据

**积分商品（points_products）**：

| 名称 | 积分 | 库存 |
|------|------|------|
| 宠物零食试用装 | 200 | 100 |
| 逗猫棒 | 300 | 50 |
| 宠物湿粮罐头 | 500 | 30 |
| Pro 会员 7 天体验 | 300 | 999 |
| 宠物毛绒玩具 | 400 | 50 |

**推荐商品（products）**：

| 名称 | 价格 | 分类 | 标签 |
|------|------|------|------|
| 猫癣药浴液 | ¥89 | medicine | ["皮肤","猫癣","真菌","脱毛"] |
| 伊丽莎白圈 | ¥25 | tool | ["皮肤","术后","防舔"] |
| 宠物益生菌 | ¥59 | medicine | ["肠胃","呕吐","腹泻","软便"] |
| 处方粮（肠胃型） | ¥128 | food | ["肠胃","消化","处方"] |
| 皮肤喷剂 | ¥45 | medicine | ["皮肤","瘙痒","红肿","过敏"] |
| 体外驱虫药 | ¥68 | medicine | ["寄生虫","跳蚤","蜱虫","瘙痒"] |
| 减肥处方粮 | ¥138 | food | ["肥胖","超重","减肥"] |
| 营养膏 | ¥39 | food | ["营养","体弱","术后恢复"] |
| 化毛膏 | ¥35 | food | ["毛球","呕吐毛球"] |
| 耳螨滴耳液 | ¥42 | medicine | ["耳朵","耳螨","甩头","异味"] |

---

## 3. 积分系统设计

### 3.1 积分规则

| 行为 | 积分变动 | 类型 | reason |
|------|---------|------|--------|
| 注册/初始化 | +100 | earn | initial |
| 回答问题 | +20 | earn | answer_reward |
| 回答被采纳 | +悬赏值 | earn | bounty_reward |
| 发布问题（悬赏） | -悬赏值 | spend | question_cost |
| 每日签到 | +2 | earn | signin |
| 兑换商品 | -商品积分 | spend | redeem |

### 3.2 积分流转逻辑（事务保证）

**发布问题（带悬赏）**：
```
BEGIN
  1. 检查 user.points_balance >= bounty_points
  2. UPDATE users SET points_balance = points_balance - bounty_points
  3. INSERT points_transactions (amount=-bounty_points, type=spend, reason=question_cost)
  4. INSERT questions (bounty_points=bounty_points)
COMMIT
```

**回答被采纳**：
```
BEGIN
  1. UPDATE answers SET is_accepted = TRUE
  2. UPDATE questions SET accepted_answer_id = answer_id, status = 'answered'
  3. UPDATE users SET points_balance = points_balance + bounty_points  -- 回答者得悬赏
  4. INSERT points_transactions (amount=+bounty_points, type=earn, reason=bounty_reward)
COMMIT
```

**回答问题（固定奖励）**：
```
BEGIN
  1. INSERT answers
  2. UPDATE users SET points_balance = points_balance + 20
  3. INSERT points_transactions (amount=+20, type=earn, reason=answer_reward)
  4. UPDATE questions SET answer_count = answer_count + 1
COMMIT
```

### 3.3 初始积分迁移

现有用户的 `points_balance` 需要更新为 100。通过 Alembic migration 的 data migration 实现：

```python
def upgrade():
    op.execute("UPDATE users SET points_balance = 100 WHERE points_balance = 0")
```

---

## 4. 社区互助区

### 4.1 API 设计

```
POST   /api/community/questions          发帖（含可选悬赏）
GET    /api/community/questions          问题列表（分类筛选 + 排序 + 分页）
GET    /api/community/questions/:id      问题详情（含回答列表）
POST   /api/community/questions/:id/answers  回答问题
POST   /api/community/answers/:id/accept     采纳回答
POST   /api/community/answers/:id/like       点赞回答
GET    /api/community/my/questions       我的提问
GET    /api/community/my/answers         我的回答
```

**问题列表 Query 参数**：
- `category`: disease/nutrition/behavior/daily/other（可选）
- `sort`: latest/hottest/unanswered（默认 latest）
- `page`, `limit`: 分页

**问题详情响应**（合并问题 + 回答）：
```json
{
  "id": "...",
  "title": "猫咪最近频繁呕吐怎么办",
  "content": "...",
  "category": "disease",
  "bounty_points": 50,
  "status": "open",
  "view_count": 42,
  "answer_count": 3,
  "author": { "id": "...", "nickname": "猫奴小王", "avatar_url": null },
  "pet": { "name": "小白", "species": "cat", "breed": "英短" },
  "answers": [
    {
      "id": "...",
      "content": "...",
      "is_accepted": false,
      "like_count": 5,
      "liked_by_me": false,
      "author": { "id": "...", "nickname": "资深猫友" },
      "created_at": "..."
    }
  ],
  "created_at": "..."
}
```

### 4.2 前端页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 社区首页 | `/community` | 问题列表 + 分类 tab + 排序 + 搜索 + 发帖按钮 |
| 问题详情 | `/community/[id]` | 问题内容 + 回答列表 + 采纳 + 点赞 + 回答输入框 |
| 发帖页 | `/community/new` | 标题 + 内容 + 分类 + 关联宠物 + 悬赏积分 |

**侧边栏新增导航项**：`/community` → 社区互助（Users 图标）

### 4.3 悬赏交互流程

1. 用户发帖 → 选择「是否悬赏」
2. 若悬赏 → 显示当前积分余额，输入框限制最大值 = balance
3. 提交时后端校验余额 ≥ 悬赏值，事务扣减
4. 问题列表和详情页显示悬赏标签（如 `🏷️ 悬赏 50 积分`）
5. 回答者回答 → 固定获得 20 积分
6. 提问者采纳某回答 → 回答者额外获得悬赏积分，问题状态变为 `answered`

---

## 5. 化验单解读

### 5.1 工作流程

```
用户上传化验单图片
  → 前端压缩（webp, max 1MB）
  → POST /api/consultation/lab-report (multipart)
  → 后端读取宠物档案上下文
  → 调用智谱 GLM-4.6V（视觉模型）
  → Prompt 要求返回结构化 JSON
  → SSE 流式返回前端
  → 前端渲染结构化表格 + AI 综合建议
```

### 5.2 Prompt 设计

```python
LAB_REPORT_PROMPT = """
你是一位专业的宠物化验单解读助手。请分析这张化验单图片，提取所有检测指标并解读。

宠物档案信息：
{pet_context}

请按以下 JSON 格式输出：
{
  "indicators": [
    {
      "name": "WBC（白细胞）",
      "value": "18.5",
      "reference_range": "5.5-16.9 ×10⁹/L",
      "status": "high",          // high/normal/low
      "interpretation": "提示可能存在细菌性感染或急性炎症"
    }
  ],
  "summary": "综合来看，该宠物白细胞偏高，建议关注是否有感染症状...",
  "suggestions": ["建议3天内复查血常规", "观察是否有发烧、食欲下降等症状"],
  "urgency": "warning"           // normal/warning/critical
}

注意：
- 如果图片模糊或无法识别，返回 {"error": "图片不清晰，请重新拍摄"}
- 如果不是化验单，返回 {"error": "未检测到化验单内容"}
- 参考范围使用犬/猫通用标准，标注"可能因检测机构而异"
"""
```

### 5.3 API 设计

复用 `/api/consultation/` 路由前缀，新增端点：

```
POST /api/consultation/lab-report      上传化验单 (SSE)
  Request:  multipart/form-data { pet_id, image }
  Response: SSE stream → 结构化 JSON
```

**SSE 消息格式**：
```
event: start
data: {"type": "status", "content": "正在读取宠物档案..."}

event: message
data: {"type": "text", "content": "{\"indicators\":["}  -- 流式 JSON

event: end
data: {"type": "done", "consultation_id": "xxx"}
```

### 5.4 前端页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 化验单上传 | `/consultation/lab-report` | 选择宠物 + 上传图片 + 诊断按钮 |
| 结构化结果 | 同页面，下方展示 | 指标表格 + 状态标色 + AI 综合建议 |

**指标表格列**：检测指标 | 测定结果 | 参考范围 | 状态（↑高/正常/↓低）| 白话释义

**状态标色**：high=红色, low=蓝色, normal=绿色

**问诊大厅入口页新增**：在现有「传图识病」和「AI 对话医生」基础上，新增「化验单解读」入口卡片。

---

## 6. AI 诊断推荐

### 6.1 匹配逻辑

诊断完成后（传图识病 / AI 对话 / 化验单解读），从 AI 响应中提取关键词，与 `products.tags` 做交集匹配。

**关键词提取策略**（MVP 简化版）：
- 不调用额外 AI，直接用诊断结果中的关键词
- 维护一个 `keyword_mapping` 字典，将常见症状映射到商品标签

```python
KEYWORD_MAPPING = {
    "皮肤": ["皮肤", "瘙痒", "红肿", "脱毛"],
    "猫癣": ["猫癣", "真菌", "脱毛"],
    "肠胃": ["呕吐", "腹泻", "软便", "食欲不振"],
    "耳螨": ["耳朵", "耳螨", "甩头", "异味"],
    "肥胖": ["肥胖", "超重", "减肥"],
    "毛球": ["毛球", "呕吐毛球"],
    "寄生虫": ["跳蚤", "蜱虫", "寄生虫"],
    "营养": ["体弱", "术后", "营养不良"],
}
```

### 6.2 API 设计

```
GET /api/products/recommend
  Query: tags=皮肤,猫癣  (逗号分隔的标签)
  Response: { "products": [...] }  -- 最多返回 6 个

GET /api/products
  Query: category=medicine/food/tool/other, page, limit
  Response: { "products": [...], "total": N }
```

### 6.3 前端展示

**诊断结果页底部嵌入推荐卡片**：
```
┌─────────────────────────────────────────────┐
│ 🛒 为您推荐（基于诊断结果"皮肤过敏"）        │
│                                             │
│ ┌─────────┐  猫癣药浴液                      │
│ │  [图片]  │  💊 药品                         │
│ │          │  ¥89                            │
│ └─────────┘                                 │
│                                             │
│ ┌─────────┐  伊丽莎白圈                      │
│ │  [图片]  │  🔧 用品                         │
│ │          │  ¥25                            │
│ └─────────┘                                 │
│                                             │
│ 💡 以上商品由AI根据诊断结果推荐，仅供参考     │
└─────────────────────────────────────────────┘
```

**独立商城页面** `/mall`：
- 顶部 tab：积分兑换 | 为你推荐
- 积分兑换：商品卡片（图片 + 名称 + 积分 + 库存 + 兑换按钮）
- 为你推荐：商品卡片（图片 + 名称 + 价格 + 分类标签）

**侧边栏新增导航项**：`/mall` → 积分商城（ShoppingBag 图标）

---

## 7. 侧边栏导航更新

```
现有：
  🏠 首页
  🐾 宠物档案
  🩺 AI问诊
  👨‍🍳 智能食谱

新增：
  👥 社区互助    → /community
  🛒 积分商城    → /mall
```

---

## 8. 错误处理

| 场景 | 处理 |
|------|------|
| 积分不足发帖 | 提示"积分不足，当前余额 X 分" |
| 悬赏值 > 余额 | 前端限制输入范围，后端二次校验 |
| 重复点赞 | 返回 409 Conflict |
| 采纳非本人问题的回答 | 返回 403 Forbidden |
| 化验单图片模糊 | AI 返回 error，前端提示重拍 |
| 化验单非化验单图片 | AI 返回 error，前端提示 |
| 兑换库存不足 | 提示"库存不足" |
| 兑换积分不足 | 提示"积分不足" |

---

## 9. 实现顺序

```
Phase 1: 积分系统 + 社区互助区
  → 积分流水表 + 积分 Service
  → 问题/回答/点赞 模型 + API
  → 社区前端页面（列表 + 详情 + 发帖）
  → 种子数据（初始积分迁移）

Phase 2: 积分商城
  → 积分商品表 + 种子数据
  → 兑换 API
  → 商城前端页面

Phase 3: 化验单解读
  → Prompt 工程 + SSE 流式
  → 化验单前端页面（上传 + 表格渲染）

Phase 4: AI 诊断推荐
  → 推荐商品表 + 种子数据
  → 关键词匹配逻辑
  → 推荐卡片组件 + 商城推荐 tab
```
