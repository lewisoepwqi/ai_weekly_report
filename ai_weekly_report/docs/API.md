# AI 设计探针 · 周报系统 API 文档

## 概述

基地址：`http://<host>:3000`

### 鉴权

管理写接口需要 `x-api-key` 请求头：

```http
x-api-key: <API_KEY>
```

`API_KEY` 由环境变量配置。缺失或不匹配返回 `401`。

### 响应约定

当前接口存在两类成功响应：

1. 带 `ok: true` 的管理接口响应（如 `/api/data/*`）
2. 直接返回业务对象/数组的公开读取接口（如 `/api/week/list`、`/api/week/:weekId`）

错误响应统一为 JSON，包含 `error`，多数包含 `fix`，验证失败包含 `issues`。

### 网关与安全头

- 所有 API 响应均带 `x-request-id` 与 `x-api-version: 1`
- 已启用基础限流，响应头包含 `RateLimit-Limit`、`RateLimit-Remaining`、`RateLimit-Reset`
- 当反向代理传入 `x-forwarded-proto: http` 且非本地环境时，接口会重定向到 HTTPS
- 已统一下发安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、`Content-Security-Policy`

---

## 公开接口

### GET /api/data/status

系统状态概览。

```json
{
  "ok": true,
  "latestWeek": {
    "id": "2026-W10",
    "period": "第 1 期",
    "date_range": "2026.03.04-03.10",
    "intro": "多模态能力大跃升...",
    "keywords": "[\"多模态\",\"Vibe Coding\"]",
    "status": "published",
    "created_at": "2026-03-10T00:00:00.000Z",
    "updated_at": "2026-03-10T00:00:00.000Z"
  },
  "unprocessedRaw": 0,
  "totalItems": 18
}
```

### GET /api/week/list

获取已发布期列表。

```json
[
  {
    "id": "2026-W11",
    "period": "第 2 期",
    "date_range": "2026.03.11-03.17",
    "status": "published"
  }
]
```

### GET /api/week/:weekId

获取指定期完整数据（前端渲染用）。

```json
{
  "week": {},
  "topThree": [],
  "industry": [],
  "designTools": [],
  "opensource": [],
  "hotTopics": [],
  "sourceInfo": null,
  "totalItems": 18,
  "selectedItems": 18
}
```

---

## 管理接口

### POST /api/data/raw

写入原始采集数据，支持单条或数组。

```json
{
  "source_type": "rss",
  "source_name": "The Verge AI",
  "title": "OpenAI releases GPT-5",
  "content": "Article content preview...",
  "url": "https://example.com/article",
  "raw_data": "{\"extra\":true}"
}
```

成功响应：

```json
{ "ok": true, "inserted": 1 }
```

### GET /api/data/weeks

获取所有期（含 draft），管理视角。

```json
[
  {
    "id": "2026-W11",
    "period": "第 2 期",
    "date_range": "2026.03.11-03.17",
    "status": "draft",
    "created_at": "2026-03-11T00:00:00.000Z",
    "updated_at": "2026-03-11T00:00:00.000Z"
  }
]
```

### POST /api/data/weeks

创建或更新期元数据。

```json
{
  "id": "2026-W11",
  "period": "第 2 期",
  "date_range": "2026.03.11-03.17",
  "intro": "本周 AI 设计领域...",
  "keywords": ["Agent", "多模态"],
  "data_source_line": "共处理 420 条，精选 30 条",
  "status": "draft"
}
```

成功响应：

```json
{ "ok": true, "weekId": "2026-W11", "action": "created" }
```

### GET /api/data/weeks/:weekId

获取指定期完整数据（分 section 聚合），返回：

```json
{
  "ok": true,
  "data": {
    "week": {},
    "topThree": [],
    "industry": [],
    "designTools": [],
    "opensource": [],
    "hotTopics": [],
    "sourceInfo": null,
    "totalItems": 18,
    "selectedItems": 18
  }
}
```

### PUT /api/data/weeks/:weekId

组合写入接口，支持一次请求内同时操作 week/items/source_info/publish。

```json
{
  "week": {
    "period": "第 2 期",
    "date_range": "2026.03.11-03.17",
    "intro": "本周 AI 设计领域...",
    "keywords": ["Agent", "多模态"],
    "data_source_line": "共处理 420 条，精选 30 条",
    "status": "draft"
  },
  "items": [
    {
      "section": "top_three",
      "title": "Claude 4 发布",
      "summary": "Anthropic 发布新一代模型...",
      "ai_detail": "① 影响...\n② 依据...\n③ 建议动作...",
      "sort_order": 0
    }
  ],
  "source_info": {
    "categories": "[{\"name\":\"科技媒体\",\"examples\":[\"The Verge\"]}]",
    "statement": "通过 RSS 订阅、关键词搜索、GitHub API 采集，经 AI 筛选去重后精选。",
    "representative_sources": "{\"total\":392,\"selected\":28}"
  },
  "publish": true
}
```

成功响应：

```json
{ "ok": true, "weekId": "2026-W11" }
```

### PATCH /api/data/weeks/:weekId

仅更新期元数据，不影响 items。

```json
{
  "intro": "本周 AI 设计能力持续演进",
  "keywords": ["多模态", "Vibe Coding"]
}
```

成功响应：

```json
{ "ok": true, "weekId": "2026-W11" }
```

### POST /api/data/weeks/:weekId

发布指定期（将 status 更新为 `published`）。

成功响应：

```json
{ "ok": true, "weekId": "2026-W11", "status": "published" }
```

### DELETE /api/data/weeks/:weekId

删除指定期、其 items、其 source_info。

成功响应：

```json
{ "ok": true, "weekId": "2026-W11" }
```

### GET /api/data/weeks/:weekId/source-info

读取来源信息。

```json
{
  "ok": true,
  "data": {
    "week_id": "2026-W11",
    "categories": "[{\"name\":\"科技媒体\",\"examples\":[\"The Verge\"]}]",
    "statement": "通过 RSS 订阅...",
    "representative_sources": "{\"total\":392,\"selected\":28}",
    "updated_at": "2026-03-11T00:00:00.000Z"
  }
}
```

### PUT /api/data/weeks/:weekId/source-info

更新来源信息。

```json
{
  "categories": "[{\"name\":\"科技媒体\",\"examples\":[\"The Verge\"]}]",
  "statement": "通过 RSS 订阅...",
  "representative_sources": "{\"total\":392,\"selected\":28}"
}
```

成功响应：

```json
{ "ok": true, "weekId": "2026-W11" }
```

---

## 调用流程（当前实现）

```text
1. POST /api/data/raw
2. POST /api/data/weeks                （创建周）
3. PUT  /api/data/weeks/:weekId        （写入 items/source_info，可带 publish）
4. 或 POST /api/data/weeks/:weekId     （独立发布）
```

---

## 错误码

| HTTP 状态码 | 含义 | 常见触发场景 |
|------------|------|--------------|
| 400 | 参数验证失败 / JSON 非法 | 字段缺失、类型错误、JSON 格式错误 |
| 401 | 鉴权失败 | 缺少 `x-api-key` 或 API Key 错误 |
| 403 | 跨域来源不允许 | `Origin` 不在允许列表 |
| 404 | 资源不存在 | weekId 不存在、source_info 不存在 |
| 409 | 约束冲突 | 外键约束失败 |
| 429 | 请求过于频繁 | 触发限流策略 |
| 500 | 服务端错误 | DB/运行时异常 |

400 验证失败示例：

```json
{
  "ok": false,
  "error": "Request body validation failed",
  "fix": "Fix the fields listed in `issues` and retry.",
  "issues": [
    { "field": "id", "message": "Required" }
  ]
}
```

401 鉴权失败示例：

```json
{
  "ok": false,
  "error": "Unauthorized",
  "fix": "Add header: x-api-key: <your API_KEY>",
  "detail": {
    "header_name": "x-api-key",
    "received": "missing"
  }
}
```

429 限流示例：

```json
{
  "ok": false,
  "error": "Too Many Requests",
  "fix": "Retry after a short delay.",
  "detail": {
    "requestId": "7eec57d1-2d78-4a6f-8d80-0c4f8f5337b0"
  }
}
```

---

## 版本与兼容性

- 当前未启用 URL/Header 版本号（如 `/api/v1` 或 `x-api-version`）。
- 当前未提供字段级废弃声明机制（如 `deprecated`、`sunset_date`）。
- 对接方应将 `docs/API.md` 与 `skills/SKILL.md` 视为同版本契约，并在发布前校验差异。
