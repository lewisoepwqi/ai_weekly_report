# AI 设计探针 · 周报系统 API 使用指南

> 本文档供 OpenClaw AI 助手使用，教你如何通过 API 管理周报数据
> 文档版本: 1.0
> 最后更新: 2026-03-18

---

## 📋 概述

AI 设计探针周报系统是一个用于收集、整理和展示 AI 与设计领域周报内容的 Web 应用。

作为 OpenClaw AI 助手，你可以通过 API 调用来：
- 创建新的周报期数
- 更新周报内容（导语、关键词、条目等）
- 发布周报
- 查询周报数据
- 处理原始数据

---

## 🔗 API 基础信息

| 项目 | 值 |
|------|-----|
| **基础 URL** | `http://weekly-report:3000` |
| **认证方式** | Header: `x-api-key` |
| **API Key** | 从环境变量 `WEEKLY_REPORT_API_KEY` 读取 |
| **数据格式** | JSON |

### 认证示例

所有需要认证的 API 调用都必须带上 Header：
```http
x-api-key: your-api-key-here
```

---

## 📊 API 列表

### 一、状态查询（无需认证）

#### 1. 获取系统状态
**用途**: 检查周报系统和数据库是否正常

```http
GET /api/data/status
```

**响应示例**:
```json
{
  "ok": true,
  "latestWeek": {
    "id": "2026-W11",
    "period": "第 2 期",
    "date_range": "2026.03.10-03.16",
    "status": "published"
  },
  "unprocessedRaw": 5,
  "totalItems": 42
}
```

---

### 二、周报管理（需要认证）

#### 2. 获取周报列表
**用途**: 查看所有已创建的周报

```http
GET /api/data/weeks
```

**响应示例**:
```json
[
  {
    "id": "2026-W12",
    "period": "第 3 期",
    "date_range": "2026.03.17-03.23",
    "intro": "本周AI设计领域...",
    "keywords": "[\"AI\",\"设计\",\"工具\"]",
    "status": "draft",
    "created_at": "2026-03-18T08:00:00Z",
    "updated_at": "2026-03-18T10:30:00Z"
  }
]
```

---

#### 3. 创建/更新周报
**用途**: 创建新的周报期数或更新现有周报的基本信息

```http
POST /api/data/weeks
Content-Type: application/json
x-api-key: your-api-key
```

**请求体**:
```json
{
  "id": "2026-W12",
  "period": "第 3 期",
  "date_range": "2026.03.17-03.23",
  "intro": "本周AI设计领域的重要动态...",
  "keywords": ["AI", "设计", "工具", "大模型"],
  "data_source_line": "数据来源：RSS订阅、GitHub、社交媒体",
  "status": "draft"
}
```

**必填字段**:
- `id`: 周报ID，格式 `YYYY-WNN`，如 `2026-W12`
- `period`: 期号，如 `第 3 期`
- `date_range`: 日期范围，如 `2026.03.17-03.23`

**可选字段**:
- `intro`: 导语/导读文字
- `keywords`: 关键词数组
- `data_source_line`: 数据来源说明
- `status`: `draft`(草稿) 或 `published`(已发布)

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12",
  "action": "created"
}
```

---

#### 4. 获取单期周报详情
**用途**: 查看某一期的完整内容，包括所有条目

```http
GET /api/data/weeks/{weekId}
```

**示例**:
```http
GET /api/data/weeks/2026-W12
```

**响应示例**:
```json
{
  "ok": true,
  "data": {
    "week": {
      "id": "2026-W12",
      "period": "第 3 期",
      "date_range": "2026.03.17-03.23",
      "intro": "本周AI设计领域...",
      "keywords": "[\"AI\",\"设计\"]",
      "status": "published"
    },
    "topThree": [...],
    "industry": [...],
    "designTools": [...],
    "opensource": [...],
    "hotTopics": [...],
    "sourceInfo": {...},
    "totalItems": 15
  }
}
```

---

#### 5. 更新周报内容（条目级别）
**用途**: 为周报添加或更新具体的内容条目

```http
PUT /api/data/weeks/{weekId}
Content-Type: application/json
x-api-key: your-api-key
```

**示例**:
```http
PUT /api/data/weeks/2026-W12
```

**请求体**:
```json
{
  "week": {
    "intro": "更新后的导读文字",
    "keywords": ["AI", "设计", "更新"]
  },
  "items": [
    {
      "section": "top_three",
      "title": "Claude 4 发布",
      "summary": "Anthropic 发布 Claude 4，性能大幅提升...",
      "highlight": "多模态能力增强",
      "category": "AI模型",
      "tags": ["Claude", "Anthropic", "大模型"],
      "source_url": "https://anthropic.com/...",
      "author": "Anthropic团队",
      "sort_order": 1
    },
    {
      "section": "industry",
      "title": "AI设计工具新趋势",
      "summary": "本周多个AI设计工具推出新功能...",
      "category": "行业动态",
      "tags": ["设计工具", "AI"],
      "sort_order": 2
    }
  ],
  "publish": false
}
```

**字段说明**:

`week` 对象（可选，更新周报元数据）:
- `period`: 期号
- `date_range`: 日期范围
- `intro`: 导语
- `keywords`: 关键词
- `status`: 状态

`items` 数组（可选，更新条目，传入会替换该期所有条目）:
每个条目包含：
- `section` **必填**: 栏目，可选值：
  - `top_three` - AI焦点
  - `industry` - 行业动态
  - `design_tools` - 设计工具
  - `opensource` - 开源项目
  - `hot_topics` - 热点话题
- `title` **必填**: 标题（最多200字）
- `summary`: 摘要
- `highlight`: 亮点/金句
- `category`: 分类标签
- `tags`: 标签数组
- `image_url`: 图片URL
- `logo_url`: Logo URL
- `source_url`: 原文链接
- `author`: 作者
- `author_label`: 作者身份标签
- `author_avatar`: 作者头像URL
- `heat_data`: 热度数据，JSON格式如 `{"likes":"1.2k"}`
- `ai_summary`: AI解读摘要
- `ai_detail`: AI解读详情
- `sort_order`: 排序序号（0-10）
- `source_platform`: 来源平台
- `source_date`: 来源日期
- `source_type`: 来源类型

`publish`（可选）:
- `true`: 同时将该期状态改为 published
- `false`: 保持原状态

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12"
}
```

---

#### 6. 更新周报元数据（PATCH）
**用途**: 只更新周报的基本信息，不动条目内容

```http
PATCH /api/data/weeks/{weekId}
Content-Type: application/json
x-api-key: your-api-key
```

**示例**:
```http
PATCH /api/data/weeks/2026-W12
```

**请求体**（所有字段可选，只传要更新的）:
```json
{
  "intro": "新的导读文字",
  "keywords": ["AI", "更新"],
  "status": "published"
}
```

---

#### 7. 发布周报
**用途**: 将周报状态从 draft 改为 published

```http
POST /api/data/weeks/{weekId}
x-api-key: your-api-key
```

**示例**:
```http
POST /api/data/weeks/2026-W12
```

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12",
  "status": "published"
}
```

---

#### 8. 删除周报
**用途**: 删除某期周报及其所有条目（不可恢复！）

```http
DELETE /api/data/weeks/{weekId}
x-api-key: your-api-key
```

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12"
}
```

---

### 三、原始数据管理

#### 9. 写入原始数据
**用途**: 将采集到的原始数据写入数据库，等待后续处理

```http
POST /api/data/raw
Content-Type: application/json
x-api-key: your-api-key
```

**请求体**（单条或数组）:
```json
{
  "source_type": "rss",
  "source_name": "TechCrunch",
  "title": "AI设计工具的新突破",
  "content": "文章内容...",
  "url": "https://techcrunch.com/...",
  "raw_data": {
    "feed_id": "123",
    "published": "2026-03-18"
  }
}
```

**字段说明**:
- `source_type` **必填**: 来源类型，如 `rss`, `github`, `skillsmp`, `social`
- `source_name`: 来源名称
- `title`: 标题
- `content`: 正文内容
- `url`: 原文链接
- `raw_data`: 原始数据（对象或字符串）

**批量写入**:
```json
[
  { "source_type": "rss", "title": "文章1", ... },
  { "source_type": "rss", "title": "文章2", ... }
]
```

**响应示例**:
```json
{
  "ok": true,
  "inserted": 1
}
```

---

### 四、数据处理

#### 10. 处理原始数据（AI分类）
**用途**: 使用 AI 将 raw_items 中的原始数据分类、摘要后生成周报条目

```http
POST /api/admin/process
Content-Type: application/json
x-api-key: your-api-key
```

**请求体**:
```json
{
  "week": "2026-W12",
  "noAi": false,
  "force": false
}
```

**参数说明**:
- `week` **必填**: 目标周报ID，格式 `YYYY-WNN`
- `noAi`: 是否跳过 AI，只做规则筛选（默认 false）
- `force`: 是否强制重新处理（会清空已有 items，默认 false）

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12",
  "rawProcessed": 25,
  "itemsCreated": 8,
  "mode": "ai"
}
```

---

#### 11. 发布周报（Admin API）
**用途**: 通过 Admin API 发布周报

```http
POST /api/admin/publish
Content-Type: application/json
x-api-key: your-api-key
```

**请求体**:
```json
{
  "week": "2026-W12"
}
```

**响应示例**:
```json
{
  "ok": true,
  "weekId": "2026-W12",
  "status": "published"
}
```

---

## 💡 使用场景示例

### 场景1：创建新周报并添加内容

```bash
# 1. 创建周报
POST /api/data/weeks
{
  "id": "2026-W12",
  "period": "第 3 期",
  "date_range": "2026.03.17-03.23",
  "intro": "本周AI设计领域的重要动态...",
  "keywords": ["AI", "设计", "工具"]
}

# 2. 添加内容条目
PUT /api/data/weeks/2026-W12
{
  "items": [
    {
      "section": "top_three",
      "title": "Claude 4 发布",
      "summary": "Anthropic发布新一代AI模型...",
      "category": "AI模型",
      "sort_order": 1
    }
  ]
}

# 3. 发布
POST /api/data/weeks/2026-W12
```

### 场景2：采集数据并自动处理

```bash
# 1. 写入原始数据
POST /api/data/raw
[
  { "source_type": "rss", "title": "文章1", "url": "..." },
  { "source_type": "rss", "title": "文章2", "url": "..." }
]

# 2. 使用AI处理生成周报条目
POST /api/admin/process
{
  "week": "2026-W12"
}

# 3. 查看结果
GET /api/data/weeks/2026-W12
```

---

## 🐛 错误处理

### 常见错误码

| HTTP状态 | 含义 | 解决方式 |
|---------|------|---------|
| 200 | 成功 | - |
| 401 | 未授权 | 检查 x-api-key 是否正确 |
| 400 | 请求格式错误 | 检查 JSON 格式和必填字段 |
| 404 | 周报不存在 | 先创建周报 |
| 409 | 外键约束失败 | 先创建周报再添加条目 |
| 500 | 服务器内部错误 | 查看日志排查 |

### 错误响应示例

```json
{
  "ok": false,
  "error": "Unauthorized",
  "fix": "Provide a valid x-api-key header"
}
```

---

## 🔧 OpenClaw 调用示例

### 使用 fetch（在 Node.js 环境中）

```javascript
const API_URL = process.env.WEEKLY_REPORT_API_URL || 'http://weekly-report:3000';
const API_KEY = process.env.WEEKLY_REPORT_API_KEY;

// 创建周报
async function createWeek(weekData) {
  const response = await fetch(`${API_URL}/api/data/weeks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(weekData),
  });
  return response.json();
}

// 使用示例
createWeek({
  id: '2026-W12',
  period: '第 3 期',
  date_range: '2026.03.17-03.23',
});
```

### 使用 curl（命令行测试）

```bash
# 创建周报
curl -X POST http://weekly-report:3000/api/data/weeks \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"id":"2026-W12","period":"第3期","date_range":"2026.03.17-03.23"}'

# 获取列表
curl -H "x-api-key: your-api-key" http://weekly-report:3000/api/data/weeks

# 处理数据
curl -X POST http://weekly-report:3000/api/admin/process \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"week":"2026-W12"}'
```

---

## 📝 最佳实践

1. **先创建周报再添加条目**: 必须先调用 POST /api/data/weeks 创建周报，才能添加条目
2. **使用 PUT 批量更新条目**: 传入 items 数组可以一次性更新所有内容
3. **AI处理前确保有原始数据**: 调用 /api/admin/process 前，先通过 /api/data/raw 写入数据
4. **发布前检查内容**: 使用 GET /api/data/weeks/{id} 查看完整内容后再发布

---

## 🔗 相关链接

- 周报系统: http://localhost:3000
- API 基础地址: http://weekly-report:3000
- 健康检查: http://weekly-report:3000/api/data/status

---

> 💡 提示：作为 OpenClaw AI 助手，当用户要求"创建周报"、"更新周报"或"发布周报"时，你应该主动调用上述 API，而不是只写本地文件！
