# OpenClaw 本地测试指南

本文档指导你在本地测试 OpenClaw 与飞书的连接，确保一切正常后再部署到服务器。

## 前置准备

### 1. 安装 Docker Desktop

- **Windows**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Mac**: 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: 按照官方文档安装 Docker 和 Docker Compose

### 2. 验证 Docker 安装

```bash
# 打开终端/PowerShell 运行
docker --version
docker-compose --version
```

### 3. 准备飞书应用

确保你已经在 [飞书开发者平台](https://open.feishu.cn/app) 完成以下步骤：

1. ✅ 创建企业自建应用
2. ✅ 获取 App ID 和 App Secret
3. ✅ 添加 Bot 能力
4. ✅ 申请所有必需权限
5. ✅ **发布应用**（关键步骤！）

---

## 测试步骤

### 第一步：配置环境变量

```bash
# 复制本地测试配置模板
cp .env.local .env.local.test

# 编辑配置（Windows 用记事本，Mac/Linux 用 vim/nano）
notepad .env.local
```

填写以下配置：

```bash
# 飞书配置（必填）
FEISHU_APP_ID=cli_xxxxx          # 你的飞书应用 ID
FEISHU_APP_SECRET=xxxxxx         # 你的飞书应用 Secret

# AI 配置（至少填一个）
ANTHROPIC_API_KEY=sk-ant-xxxxx   # Claude API Key
# 或 OPENAI_API_KEY=sk-xxxxx
# 或 GEMINI_API_KEY=xxxxx
```

### 第二步：运行本地测试

**Windows (PowerShell/Git Bash):**
```bash
bash scripts/test-local.sh
```

**Mac/Linux:**
```bash
chmod +x scripts/test-local.sh
./scripts/test-local.sh
```

测试脚本会自动完成以下检查：
1. ✅ Docker 环境检查
2. ✅ 配置文件验证
3. ✅ 镜像构建
4. ✅ 服务启动
5. ✅ 健康检查
6. ✅ 飞书连接检查

### 第三步：测试飞书消息

#### 3.1 查看配对码

服务启动后，查看日志获取配对码：

```bash
# 查看日志
docker-compose -f docker-compose.local.yml logs -f
```

寻找类似这样的输出：
```
🔑 Pairing code: ABCD-1234
Please send this code to the bot to pair
```

#### 3.2 在飞书中测试

**方法一：私聊测试**
1. 打开飞书，搜索你的应用名称
2. 发送配对码（如 `ABCD-1234`）
3. 等待 AI 回复

**方法二：群聊测试**
1. 创建一个测试群
2. 添加你的机器人到群聊
3. @机器人并发送配对码
4. 等待 AI 回复

#### 3.3 预期结果

- ✅ 飞书消息能正常发送
- ✅ AI 能正确回复
- ✅ 日志显示消息接收和发送记录

### 第四步：功能测试清单

复制以下清单，测试完成后勾选：

```markdown
## 本地测试清单

### 基础功能
- [ ] Docker 服务正常启动
- [ ] 健康检查接口返回 ok
- [ ] 日志无报错信息

### 飞书连接
- [ ] 私聊发送配对码成功
- [ ] 私聊收到 AI 回复
- [ ] 群聊 @机器人成功
- [ ] 群聊收到 AI 回复

### AI 功能
- [ ] AI 能理解中文提问
- [ ] AI 回复内容合理
- [ ] 连续对话正常

### 记忆功能
- [ ] 能记住用户名称
- [ ] 能记住之前的对话内容
```

---

## 常见问题排查

### 问题1：飞书连接失败

**现象**：
```
❌ 未检测到飞书连接成功日志
```

**排查步骤**：

1. **检查凭证**
   ```bash
   # 查看配置是否正确加载
   docker-compose -f docker-compose.local.yml exec openclaw-gateway env | grep FEISHU
   ```

2. **检查应用状态**
   - 登录 [飞书开发者平台](https://open.feishu.cn/app)
   - 确认应用已发布（未发布的应用无法使用）
   - 检查应用状态是否为「已启用」

3. **检查网络**
   ```bash
   # 测试飞书 API 连通性
   docker-compose -f docker-compose.local.yml exec openclaw-gateway \
     curl -I https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal
   ```

4. **查看详细日志**
   ```bash
   docker-compose -f docker-compose.local.yml logs --tail 100 | grep -i error
   ```

### 问题2：AI 无回复

**现象**：飞书消息发送成功，但 AI 不回复

**排查步骤**：

1. **检查 API Key**
   ```bash
   # 确认 API Key 已设置
   docker-compose -f docker-compose.local.yml exec openclaw-gateway env | grep API_KEY
   ```

2. **检查 API 额度**
   - 登录 [Anthropic Console](https://console.anthropic.com/) 检查余额
   - 或 OpenAI/Gemini 控制台检查额度

3. **查看 AI 错误日志**
   ```bash
   docker-compose -f docker-compose.local.yml logs -f | grep -i "api\|error\|claude"
   ```

### 问题3：端口被占用

**现象**：
```
Error: Ports are not available: exposing port TCP 0.0.0.0:17654
```

**解决方案**：

```bash
# 查找占用端口的进程
# Windows
netstat -ano | findstr :17654

# Mac/Linux
lsof -i :17654

# 修改端口（编辑 docker-compose.local.yml）
ports:
  - "18889:17654"  # 改为其他端口
```

### 问题4：Docker 构建失败

**现象**：镜像构建过程中报错

**解决方案**：

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose -f docker-compose.local.yml build --no-cache
```

---

## 手动测试命令

如果自动化测试脚本有问题，可以手动执行：

```bash
# 1. 构建并启动
docker-compose -f docker-compose.local.yml up -d --build

# 2. 查看日志
docker-compose -f docker-compose.local.yml logs -f

# 3. 健康检查
curl http://localhost:17654/healthz

# 4. 进入容器检查
docker-compose -f docker-compose.local.yml exec openclaw-gateway /bin/bash

# 5. 停止服务
docker-compose -f docker-compose.local.yml down

# 6. 完全清理
docker-compose -f docker-compose.local.yml down -v
docker system prune -a
```

---

## 测试通过后部署到服务器

本地测试通过后，执行以下步骤部署到服务器：

### 1. 停止本地服务

```bash
docker-compose -f docker-compose.local.yml down
```

### 2. 打包镜像

```bash
bash scripts/build-and-export.sh
```

### 3. 上传到服务器

```bash
scp openclaw-deploy-package-*.tar.gz root@你的服务器IP:/opt/
```

### 4. 服务器部署

```bash
ssh root@你的服务器IP
cd /opt/openclaw
bash scripts/deploy-on-server.sh
```

---

## 快速验证脚本

创建一个简单的验证脚本：

```bash
cat > test-quick.sh << 'EOF'
#!/bin/bash
echo "=== OpenClaw 快速验证 ==="
echo ""

# 检查服务状态
echo "1. 检查服务状态:"
docker-compose -f docker-compose.local.yml ps

echo ""
echo "2. 健康检查:"
curl -s http://localhost:17654/healthz | jq .

echo ""
echo "3. 最近日志:"
docker-compose -f docker-compose.local.yml logs --tail 10

echo ""
echo "4. 飞书连接状态:"
docker-compose -f docker-compose.local.yml logs | grep -i "feishu\|lark\|pairing" | tail -5

echo ""
echo "=== 验证完成 ==="
EOF

chmod +x test-quick.sh
bash test-quick.sh
```

---

## 测试环境 vs 生产环境

| 项目 | 本地测试 | 生产服务器 |
|-----|---------|-----------|
| 配置文件 | `.env.local` | `.env` |
| Compose 文件 | `docker-compose.local.yml` | `docker-compose.yml` |
| 数据卷 | `openclaw-memory-local` | `openclaw-memory` |
| 容器名 | `openclaw-gateway-local` | `openclaw-gateway` |
| Token | 简单密码 | 强密码 |
| 重启策略 | unless-stopped | unless-stopped |
| 端口映射 | 17654:17654 | 17654:17654 |

---

## 获取帮助

如果测试过程中遇到问题：

1. 查看详细日志：`docker-compose -f docker-compose.local.yml logs -f`
2. 检查配置：`cat .env.local | grep -v '^#' | grep -v '^$'`
3. 重启服务：`docker-compose -f docker-compose.local.yml restart`
4. 完全重置：`docker-compose -f docker-compose.local.yml down -v && docker system prune -a`
