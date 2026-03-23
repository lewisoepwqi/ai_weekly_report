# OpenClaw + 飞书 快速开始指南

本文档提供从零开始部署 OpenClaw 的最简流程。

---

## 📋 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OpenClaw 部署流程                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ 准备工作  │ ──▶ │ 本地测试  │ ──▶ │ 打包上传  │ ──▶ │ 服务器部署│
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                │                │                │
       ▼                ▼                ▼                ▼
  • 安装 Docker     • 配置 .env    • 导出镜像       • 导入镜像
  • 准备飞书应用    • 构建镜像     • 上传到服务器   • 启动服务
  • 获取 API Key    • 测试连接     •                • 验证运行
```

---

## 🚀 5分钟快速开始

### 第1步：准备工作（2分钟）

#### 1.1 安装 Docker

- **Windows/Mac**: [下载 Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**:
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```

#### 1.2 准备飞书应用

1. 访问 https://open.feishu.cn/app
2. 创建「企业自建应用」
3. 开启「机器人能力」
4. 申请权限（参考 `docs/feishu-setup-guide.md`）
5. **发布应用**（重要！）
6. 记录 **App ID** 和 **App Secret**

#### 1.3 准备 AI API Key

**推荐国内用户使用阿里云百炼 Coding Plan：**

- **阿里云百炼**（推荐国内用户）: https://bailian.console.aliyun.com/cn-beijing/?tab=model#/efm/coding_plan
  - 支持 qwen3.5-plus、qwen3-coder 等中文大模型
  - 国内访问速度快，无需代理

**其他可选：**
- Claude: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Gemini: https://makersuite.google.com/

---

### 第2步：本地测试（2分钟）

```bash
# 1. 复制配置模板
cp .env.local .env.local.test

# 2. 编辑配置（填入你的凭证）
# Windows: notepad .env.local
# Mac:     open -e .env.local
# Linux:   nano .env.local

# 3. 验证配置
bash scripts/verify-config.sh

# 4. 运行本地测试
bash scripts/test-local.sh
```

**预期输出**:
```
✅ Docker 版本: Docker version 24.x
✅ FEISHU_APP_ID: cli_xxx...
✅ 镜像构建成功
✅ Gateway 健康检查通过
✅ 飞书连接成功
🎉 所有测试通过！可以部署到服务器了
```

---

### 第3步：打包上传（1分钟）

```bash
# 1. 停止本地服务
docker-compose -f docker-compose.local.yml down

# 2. 打包镜像
bash scripts/build-and-export.sh

# 3. 上传到服务器
scp openclaw-deploy-package-*.tar.gz root@你的服务器IP:/opt/
```

---

### 第4步：服务器部署（2分钟）

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 解压部署包
cd /opt
mkdir -p openclaw
tar -xzf openclaw-deploy-package-*.tar.gz -C openclaw/
cd openclaw

# 3. 配置环境
vim .env  # 填入飞书凭证和 AI API Key（推荐阿里云百炼 BAILIAN_API_KEY）

# 4. 一键部署
bash scripts/deploy-on-server.sh
```

---

## ✅ 部署验证

```bash
# 查看服务状态
docker-compose ps

# 健康检查
curl http://localhost:17654/healthz

# 查看飞书连接日志
docker-compose logs | grep -i feishu

# 查看 AI 回复日志
docker-compose logs -f
```

---

## 📁 项目文件说明

| 文件/目录 | 说明 |
|-----------|------|
| `Dockerfile` | Docker 镜像构建文件 |
| `docker-compose.yml` | 生产环境容器配置 |
| `docker-compose.local.yml` | 本地测试容器配置 |
| `.env.local` | 本地测试环境变量模板 |
| `.env.example` | 生产环境变量模板 |
| `config/` | OpenClaw 配置文件 |
| `workspace/` | AI 记忆和配置目录 |
| `scripts/` | 各种自动化脚本 |
| `docs/` | 详细文档 |

---

## 📚 详细文档

- [TEST-GUIDE.md](./TEST-GUIDE.md) - 完整本地测试指南
- [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md) - 完整部署指南
- [docs/feishu-setup-guide.md](./docs/feishu-setup-guide.md) - 飞书应用配置指南
- [docs/bailian-setup-guide.md](./docs/bailian-setup-guide.md) - 阿里云百炼配置指南
- [README.md](./README.md) - 项目说明

---

## 🛠️ 常用命令速查

```bash
# ========== 本地测试 ==========
bash scripts/verify-config.sh         # 验证配置
bash scripts/test-local.sh            # 完整本地测试
bash scripts/quick-test.sh            # 快速检查状态

# ========== 本地服务管理 ==========
docker-compose -f docker-compose.local.yml up -d      # 启动
docker-compose -f docker-compose.local.yml down       # 停止
docker-compose -f docker-compose.local.yml logs -f    # 查看日志

# ========== 打包部署 ==========
bash scripts/build-and-export.sh      # 打包镜像
scp openclaw-deploy-package-*.tar.gz root@ip:/opt/   # 上传

# ========== 服务器管理 ==========
bash scripts/deploy-on-server.sh      # 服务器一键部署
docker-compose ps                     # 查看状态
docker-compose logs -f                # 查看日志
docker-compose restart                # 重启服务

# ========== 飞书测试 ==========
# 私聊：搜索应用名称，发送配对码
# 群聊：@机器人，发送配对码
```

---

## ❓ 常见问题

### Q: 本地测试失败怎么办？

A:
1. 检查 `scripts/verify-config.sh` 输出
2. 查看详细日志: `docker-compose -f docker-compose.local.yml logs -f`
3. 参考 [TEST-GUIDE.md](./TEST-GUIDE.md) 排查问题

### Q: 飞书连接不上？

A:
1. 检查应用是否已发布
2. 检查权限是否已申请
3. 检查网络是否能访问飞书 API

### Q: AI 不回复？

A:
1. 检查 API Key 是否正确
   - 阿里云百炼 Key 格式: `sk-xxxxx`
2. 检查 API 额度是否充足
3. 查看日志中的错误信息
4. 国内用户建议使用阿里云百炼，避免网络问题

---

## 📞 获取帮助

遇到问题？按以下顺序查找解决方案：

1. 查看本文档和 [TEST-GUIDE.md](./TEST-GUIDE.md)
2. 检查 [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md) 的「常见问题排查」
3. 查看飞书配置指南 [docs/feishu-setup-guide.md](./docs/feishu-setup-guide.md)
4. 查看日志: `docker-compose logs -f | grep error`

---

## 🎉 恭喜你！

完成以上步骤后，你就拥有了一个完整的 OpenClaw + 飞书 AI 助手！

现在可以在飞书中：
- 私聊机器人进行对话
- 在群里 @机器人 获取帮助
- 让 AI 协助你完成各种任务
