# OpenClaw + 飞书 Docker 镜像

开箱即用的 OpenClaw 镜像，已集成飞书(Lark/Feishu)插件和阿里云百炼(Coding Plan)模型。

## 项目结构

```
openclaw-docker/
├── Dockerfile                    # OpenClaw 镜像构建文件
├── docker-compose.yml            # Docker Compose 配置
├── .env.example                  # 环境变量模板
├── config/
│   ├── openclaw.json            # 主配置文件
│   └── feishu.json              # 飞书渠道配置
├── workspace/                    # OpenClaw 工作目录
│   ├── SOUL.md                  # AI 个性核心配置
│   ├── USER.md                  # 用户信息配置
│   ├── AGENTS.md                # 操作规则配置
│   ├── IDENTITY.md              # 身份标识配置
│   ├── MEMORY.md                # 长期记忆存储
│   ├── TOOLS.md                 # 工具环境配置
│   ├── HEARTBEAT.md             # 定时任务配置
│   └── CRITICAL-RULES.md        # 安全边界配置
└── scripts/
    ├── init.sh                  # 初始化脚本
    └── start.sh                 # 启动脚本
```

## 快速开始

### 1. 环境准备

确保已安装 Docker 和 Docker Compose。

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的飞书应用信息和 AI API Key
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 检查状态

```bash
# 查看日志
docker-compose logs -f

# 健康检查
curl http://localhost:17654/healthz
```

## 飞书应用配置步骤

### 1. 创建应用

1. 前往 [飞书开发者平台](https://open.feishu.cn/app) 或 [Lark开发者平台](https://open.larksuite.com/app)
2. 点击「创建企业自建应用」
3. 填写应用名称和描述

### 2. 获取凭证

1. 进入「凭证与基础信息」
2. 复制 `App ID` 和 `App Secret`
3. 填入 `.env` 文件的 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`

### 3. 添加机器人能力

1. 进入「机器人」菜单
2. 开启机器人能力
3. 配置回调地址（如使用 Webhook 模式）

### 4. 申请权限

进入「权限管理」，申请以下权限：

```
application:application:app_message_stats.overview:readonly
application:application:self_manage
application:bot.menu:write
contact:user.employee_id:readonly
im:chat.access_event.bot_p2p_chat:read
im:chat.members:bot_access
im:message.group_at_msg:readonly
im:message.p2p_msg:readonly
im:message:send_as_bot
```

### 5. 发布应用

1. 进入「版本管理与发布」
2. 创建版本并填写更新说明
3. 申请发布（如为企业内部应用，管理员审批后即可使用）

### 6. 使用机器人

- **私聊**: 在飞书中搜索应用名称，开始对话
- **群聊**: 将机器人添加到群聊，@机器人发送消息

## 配置文件说明

### workspace/SOUL.md
AI 个性核心配置，定义 AI 的行为方式和沟通风格。

### workspace/USER.md
用户信息配置，包含用户偏好、工作习惯等。

### workspace/MEMORY.md
长期记忆存储，AI 会自动更新此文件记录重要信息。

### workspace/AGENTS.md
操作规则配置，定义 AI 的边界和行为准则。

### workspace/HEARTBEAT.md
定时任务配置，可定义周期性执行的任务。

## 环境变量说明

| 变量 | 说明 | 必需 |
|------|------|------|
| `OPENCLAW_GATEWAY_TOKEN` | 网关认证令牌 | 是 |
| `ANTHROPIC_API_KEY` | Claude API Key | 至少一个 |
| `OPENAI_API_KEY` | OpenAI API Key | 至少一个 |
| `GEMINI_API_KEY` | Gemini API Key | 至少一个 |
| `BAILIAN_API_KEY` | 阿里云百炼 Coding Plan API Key | 至少一个（推荐国内用户）|
| `FEISHU_APP_ID` | 飞书应用 ID | 是 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 | 是 |
| `FEISHU_DOMAIN` | feishu 或 lark | 否，默认 feishu |
| `FEISHU_CONNECTION_MODE` | websocket 或 webhook | 否，默认 websocket |

## 常见问题

**Q: 如何查看配对码？**

A: 首次对话时查看日志: `docker-compose logs | grep pairing`

**Q: 如何进入 CLI 模式？**

A: `docker-compose run --rm openclaw-cli`

**Q: 连接飞书失败？**

A: 检查以下几点：
1. 确认 FEISHU_APP_ID 和 FEISHU_APP_SECRET 正确
2. 确认应用已发布
3. 确认已申请所有必需权限
4. 检查日志中的详细错误信息

**Q: 如何更新配置？**

A: 修改 `.env` 文件后，执行：
```bash
docker-compose down
docker-compose up -d
```

**Q: 数据存储在哪里？**

A: 数据存储在 Docker Volume `openclaw-memory` 中，也可以通过挂载目录持久化：
```yaml
volumes:
  - ./data:/home/node/.openclaw/memory
```

## 安全提示

1. **妥善保管 `.env` 文件**，不要提交到 Git 仓库
2. **使用强密码** 作为 `OPENCLAW_GATEWAY_TOKEN`
3. **定期更换** API Keys
4. **限制飞书应用权限**，只申请必需的权限

## AI 模型配置

本镜像支持多种 AI 模型提供商：

### 阿里云百炼 Coding Plan（推荐国内用户）

阿里云百炼提供稳定的中文大模型服务，国内访问速度快。

**支持的模型：**
- `qwen3.5-plus` - 通义千问 3.5 增强版（默认）
- `qwen3-max-2026-01-23` - 通义千问 3 Max
- `qwen3-coder-next` - 编程专用模型
- `qwen3-coder-plus` - 编程增强版
- `MiniMax-M2.5` - MiniMax 大模型
- `glm-5` / `glm-4.7` - 智谱 GLM 系列
- `kimi-k2.5` - Moonshot Kimi

**获取 API Key：**
访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/cn-beijing/?tab=model#/efm/coding_plan)

**配置方法：**
```bash
# 编辑 .env 文件
BAILIAN_API_KEY=sk-你的APIKey
```

详细配置请参考 [docs/bailian-setup-guide.md](./docs/bailian-setup-guide.md)

### 其他模型

- **Claude**: 设置 `ANTHROPIC_API_KEY`
- **OpenAI**: 设置 `OPENAI_API_KEY`
- **Gemini**: 设置 `GEMINI_API_KEY`

---

## 相关链接

- [OpenClaw 官方文档](https://github.com/openclaw/openclaw)
- [飞书开放平台](https://open.feishu.cn/)
- [Lark 开放平台](https://open.larksuite.com/)
- [阿里云百炼控制台](https://bailian.console.aliyun.com/)

## License

MIT License
