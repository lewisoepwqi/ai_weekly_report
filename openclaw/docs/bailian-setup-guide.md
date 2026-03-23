# 阿里云百炼 Coding Plan 配置指南

本文档详细介绍如何在 OpenClaw Docker 镜像中配置阿里云百炼(Coding Plan)模型。

---

## 什么是阿里云百炼 Coding Plan

阿里云百炼 Coding Plan 是阿里云提供的 AI 编程助手服务，包含多个强大的中文大模型：

- **qwen3.5-plus**: 通义千问 3.5 增强版，支持文本和图像输入，100万上下文
- **qwen3-max-2026-01-23**: 通义千问 3 Max 版本，26万上下文
- **qwen3-coder-next**: 通义千问 3 编程专用模型
- **qwen3-coder-plus**: 通义千问 3 编程增强版，100万上下文
- **MiniMax-M2.5**: MiniMax 大模型
- **glm-5**: 智谱 GLM-5 大模型
- **glm-4.7**: 智谱 GLM-4.7 大模型
- **kimi-k2.5**: Moonshot Kimi K2.5，支持文本和图像

---

## 获取 API Key

### 步骤 1：登录阿里云百炼控制台

访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/cn-beijing/?tab=model#/efm/coding_plan)

### 步骤 2：获取 API Key

1. 在控制台页面找到「Coding Plan」服务
2. 点击「创建 API Key」或查看已有 Key
3. 复制 API Key（格式通常为 `sk-...`）

⚠️ **重要**：API Key 只显示一次，请妥善保存！

---

## 配置方法

### 方法一：通过环境变量配置（推荐）

编辑 `.env.local`（本地测试）或 `.env`（生产环境）文件：

```bash
# 阿里云百炼 Coding Plan
BAILIAN_API_KEY=sk-你的APIKey
```

### 方法二：直接修改配置文件

如需更多自定义配置，可编辑 `config/openclaw.json`：

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "bailian": {
        "baseUrl": "https://coding.dashscope.aliyuncs.com/v1",
        "apiKey": "${BAILIAN_API_KEY}",
        "api": "openai-completions",
        "enabled": true,
        "models": [
          {
            "id": "qwen3.5-plus",
            "name": "qwen3.5-plus",
            "reasoning": false,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 1000000,
            "maxTokens": 65536,
            "compat": { "thinkingFormat": "qwen" }
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "bailian/qwen3.5-plus"
      }
    }
  }
}
```

---

## 切换模型

### 默认模型

镜像已预设默认模型为 `bailian/qwen3.5-plus`

如需修改，编辑 `config/openclaw.json` 中的 `agents.defaults.model.primary`：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "bailian/qwen3-coder-plus"
      }
    }
  }
}
```

### 运行时切换（TUI 模式）

在对话中输入：

```
/model qwen3-coder-next
```

查看可用模型：

```
/model
```

---

## 模型对比

| 模型 | 上下文长度 | 支持输入 | 适用场景 |
|------|-----------|---------|---------|
| qwen3.5-plus | 100万 | 文本+图像 | 通用对话、多模态任务 |
| qwen3-max-2026-01-23 | 26万 | 文本 | 长文档处理、复杂推理 |
| qwen3-coder-next | 26万 | 文本 | 代码生成、编程辅助 |
| qwen3-coder-plus | 100万 | 文本 | 长代码分析、大型项目 |
| MiniMax-M2.5 | 19.6万 | 文本 | 通用对话 |
| glm-5 | 20万 | 文本 | 通用对话、推理任务 |
| glm-4.7 | 20万 | 文本 | 通用对话 |
| kimi-k2.5 | 26万 | 文本+图像 | 长文档、多模态任务 |

---

## 常见问题

### Q1: 配置后提示 "No API key found for provider bailian"

**原因**：环境变量未正确加载或配置文件未更新

**解决**：
1. 检查 `.env` 文件中 `BAILIAN_API_KEY` 是否已设置
2. 重启容器：`docker-compose restart`
3. 检查配置文件是否正确挂载

### Q2: 提示 "HTTP 401: Incorrect API key provided"

**原因**：API Key 无效或过期

**解决**：
1. 登录 [百炼控制台](https://bailian.console.aliyun.com) 确认 Key 有效
2. 检查 Key 是否完整复制（不要遗漏字符）
3. 确认订阅状态正常

### Q3: 如何同时使用多个 AI 提供商？

可以同时配置多个 API Key：

```bash
# .env 文件
ANTHROPIC_API_KEY=sk-ant-xxx      # Claude
BAILIAN_API_KEY=sk-xxx             # 阿里云百炼
```

然后在配置中设置默认模型：

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "bailian/qwen3.5-plus"  // 默认使用百炼
      }
    }
  }
}
```

运行时可以通过 `/model` 命令切换。

### Q4: 国内服务器访问不了 Claude/OpenAI？

**解决**：使用阿里云百炼替代

阿里云百炼在国内访问速度快，无需代理，推荐国内用户使用。

---

## 与其他配置的关系

### 已有 Claude/OpenAI 配置如何添加百炼？

无需删除已有配置，只需：

1. 在 `.env` 中添加 `BAILIAN_API_KEY`
2. 重启容器

配置文件会自动合并，所有模型都可使用。

### 已有百炼配置如何添加其他渠道？

参考 [飞书配置指南](./feishu-setup-guide.md) 或钉钉配置，添加渠道配置即可。

---

## 测试验证

配置完成后，运行验证脚本：

```bash
bash scripts/verify-config.sh
```

应看到：

```
✅ BAILIAN_API_KEY (阿里云百炼): 已设置
```

然后运行本地测试：

```bash
bash scripts/test-local.sh
```

---

## 相关链接

- [阿里云百炼控制台](https://bailian.console.aliyun.com/cn-beijing/?tab=model#/efm/coding_plan)
- [TEST-GUIDE.md](../TEST-GUIDE.md) - 本地测试指南
- [DEPLOY-GUIDE.md](../DEPLOY-GUIDE.md) - 部署指南
