# AI Weekly Report + OpenClaw Ubuntu 服务器部署实施文档

> 版本: 1.0
> 适用系统: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
> 最后更新: 2026-03-18

---

## 📋 项目概述

### 系统架构
```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker 容器架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐      ┌─────────────────────────────┐   │
│  │   weekly-report     │◄────►│     openclaw-gateway        │   │
│  │   (周报系统)         │ API  │     (AI助手/飞书机器人)       │   │
│  │   Port: 3000        │      │     Port: 17654/17655       │   │
│  │   SQLite数据库       │      │     WebSocket/飞书连接       │   │
│  └─────────────────────┘      └─────────────────────────────┘   │
│           │                              │                      │
│           └──────────┬───────────────────┘                      │
│                      │                                           │
│           ┌──────────▼───────────┐                               │
│           │ ai-weekly-network    │                               │
│           │ (Docker Bridge网络)   │                               │
│           └──────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### 组件说明
| 组件 | 功能 | 技术栈 |
|-----|------|--------|
| weekly-report | 周报展示 + API服务 | Next.js + SQLite |
| openclaw-gateway | AI助手 + 飞书机器人 | Node.js + OpenClaw |

---

## 🚀 部署前准备

### 1. 服务器要求

```bash
# 系统要求
- 操作系统: Ubuntu 20.04 LTS 或更高
- CPU: 2核+
- 内存: 4GB+
- 磁盘: 20GB+ 可用空间
- 网络: 可访问外网（下载Docker镜像、连接飞书API）

# 需要开放的端口
- 3000: 周报系统Web界面
- 17654: OpenClaw Gateway
- 17655: OpenClaw Bridge (可选)
```

### 2. 安装 Docker

```bash
# 一键安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker 服务
sudo systemctl enable docker
sudo systemctl start docker

# 验证安装
docker --version
docker-compose --version

# 如果 docker-compose 未安装
sudo pip3 install docker-compose
# 或
sudo apt-get install docker-compose-plugin
```

### 3. 上传项目文件

```bash
# 方式1: 使用 scp 从本地上传
scp -r ai-weekly-report-with-openclaw root@你的服务器IP:/opt/

# 方式2: 使用 git 克隆（如果代码在仓库）
git clone https://你的仓库地址.git /opt/ai-weekly-report-with-openclaw

# 方式3: 压缩后上传
# 本地先压缩: tar -czf ai-weekly-deploy.tar.gz ai-weekly-report-with-openclaw/
# 上传到服务器后解压
tar -xzf ai-weekly-deploy.tar.gz -C /opt/
```

---

## 🔧 部署步骤

### 第一步: 进入项目目录

```bash
cd /opt/ai-weekly-report-with-openclaw
pwd
# 应输出: /opt/ai-weekly-report-with-openclaw
```

### 第二步: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
# 或使用 vim
vim .env
```

**必填配置项**:
```bash
# =============================================================================
# 基础配置
# =============================================================================
TZ=Asia/Shanghai
WEEKLY_REPORT_PORT=3000
OPENCLAW_GATEWAY_PORT=17654
OPENCLAW_BRIDGE_PORT=17655

# =============================================================================
# 安全认证（生产环境务必修改！）
# =============================================================================
# 生成强密码: openssl rand -hex 32
API_KEY=your-secure-api-key-here
OPENCLAW_GATEWAY_TOKEN=your-openclaw-gateway-token-here

# =============================================================================
# AI 模型配置（至少配置一个）
# =============================================================================
# 阿里云百炼（国内推荐）
BAILIAN_API_KEY=sk-your-bailian-api-key

# 或其他
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# =============================================================================
# 飞书配置（如需飞书机器人）
# =============================================================================
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket
```

### 第三步: 构建 Docker 镜像

```bash
# 构建两个服务的镜像
docker-compose -f docker-compose.full.yml build

# 构建过程可能需要 5-10 分钟，请耐心等待
# 成功后会显示:
# Successfully built xxx
# Successfully tagged ai-weekly-report:latest
# Successfully tagged openclaw:feishu-ready
```

### 第四步: 启动服务

```bash
# 后台启动所有服务
docker-compose -f docker-compose.full.yml up -d

# 查看启动状态
docker-compose -f docker-compose.full.yml ps

# 期望输出:
# NAME              STATUS                    PORTS
# weekly-report     Up xx seconds (healthy)   0.0.0.0:3000->3000/tcp
# openclaw-gateway  Up xx seconds (healthy)   0.0.0.0:17654->17654/tcp
```

### 第五步: 初始化数据库

```bash
# 周报系统需要初始化数据库表结构
docker exec weekly-report node tools/init-db.js

# 成功后会显示:
# Inserted 17 default sources
# {"ok":true,"dbPath":"/app/data/weekly.db","message":"Database initialized"}
```

### 第六步: 重启周报服务（应用数据库）

```bash
# 重启让服务识别新数据库
docker-compose -f docker-compose.full.yml restart weekly-report

# 再次检查状态，确认变为 healthy
docker-compose -f docker-compose.full.yml ps
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
# 查看所有容器状态
docker-compose -f docker-compose.full.yml ps

# 查看详细日志
docker-compose -f docker-compose.full.yml logs -f

# 按 Ctrl+C 退出日志查看
```

### 2. 测试周报系统

```bash
# 测试1: 系统状态（无需认证）
curl http://localhost:3000/api/data/status

# 期望返回: {"ok":true,"latestWeek":...,"unprocessedRaw":0,"totalItems":0}

# 测试2: 周报列表（需要认证）
curl -H "x-api-key: 你的API_KEY" http://localhost:3000/api/data/weeks

# 期望返回: [] (空数组表示成功，暂无数据)
```

### 3. 测试 OpenClaw

```bash
# 测试健康检查
curl http://localhost:17654/healthz

# 期望返回: OK
```

### 4. 测试容器间通信（关键！）

```bash
# 从 OpenClaw 容器内部访问周报 API
docker exec openclaw-gateway curl -s \
  -H "x-api-key: 你的API_KEY" \
  http://weekly-report:3000/api/data/weeks

# 期望返回: [] (表示网络打通，API调用成功)
```

### 5. 浏览器访问

```
# 周报系统界面
http://你的服务器IP:3000

# OpenClaw Gateway
http://你的服务器IP:17654/healthz
```

---

## 🤖 飞书机器人配置

### 1. 创建飞书应用

1. 访问 https://open.feishu.cn/app
2. 创建「企业自建应用」
3. 开启「机器人能力」
4. 记录 **App ID** 和 **App Secret**

### 2. 申请权限

在开发者后台申请以下权限：
- `im:chat:readonly` - 读取群聊信息
- `im:message:send_as_bot` - 以机器人身份发消息
- `im:message.group_msg` - 接收群消息
- `im:message.p2p_msg` - 接收私聊消息

### 3. 配置事件订阅

```
开发者后台 → 事件与回调 → 订阅方式
选择: ☑️ 使用长连接接收事件 (WebSocket模式)
```

### 4. 发布应用

```
开发者后台 → 版本管理与发布 → 创建版本 → 发布
```

### 5. 配对测试

```bash
# 查看 OpenClaw 日志，确认飞书连接成功
docker-compose -f docker-compose.full.yml logs -f openclaw-gateway | grep feishu

# 在飞书中私聊机器人，发送配对请求
# 机器人会回复配对码，需要管理员批准
```

### 6. 批准配对

```bash
# 进入 OpenClaw 容器
docker exec -it openclaw-gateway sh

# 执行批准命令（替换为实际配对码）
openclaw pairing approve feishu XXXXXXXX

# 退出容器
exit
```

---

## 📝 常用操作命令

### 服务管理

```bash
# 启动服务
docker-compose -f docker-compose.full.yml up -d

# 停止服务
docker-compose -f docker-compose.full.yml down

# 重启服务
docker-compose -f docker-compose.full.yml restart

# 查看日志
docker-compose -f docker-compose.full.yml logs -f

# 只看周报日志
docker-compose -f docker-compose.full.yml logs -f weekly-report

# 只看 OpenClaw 日志
docker-compose -f docker-compose.full.yml logs -f openclaw-gateway
```

### 容器操作

```bash
# 进入周报容器
docker exec -it weekly-report sh

# 进入 OpenClaw 容器
docker exec -it openclaw-gateway sh

# 查看容器资源使用
docker stats

# 查看容器详情
docker inspect weekly-report
docker inspect openclaw-gateway
```

### 数据备份

```bash
# 备份数据库
docker exec weekly-report cat /app/data/weekly.db > backup-weekly-$(date +%Y%m%d).db

# 备份 OpenClaw 配置
docker cp openclaw-gateway:/home/node/.openclaw ./backup-openclaw-$(date +%Y%m%d)

# 完整备份脚本
#!/bin/bash
BACKUP_DIR="/backup/ai-weekly-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份数据库
docker exec weekly-report cat /app/data/weekly.db > $BACKUP_DIR/weekly.db

# 备份配置
docker cp openclaw-gateway:/home/node/.openclaw $BACKUP_DIR/
cp .env $BACKUP_DIR/

# 压缩
tar -czf ${BACKUP_DIR}.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

echo "备份完成: ${BACKUP_DIR}.tar.gz"
```

### 数据恢复

```bash
# 停止服务
docker-compose -f docker-compose.full.yml down

# 恢复数据库
docker cp backup-weekly-20260318.db weekly-report:/app/data/weekly.db

# 重启服务
docker-compose -f docker-compose.full.yml up -d

# 初始化数据库（如有需要）
docker exec weekly-report node tools/init-db.js
```

---

## 🔍 常见问题排查

### 问题1: 容器启动失败

```bash
# 查看详细错误日志
docker-compose -f docker-compose.full.yml logs

# 检查端口占用
sudo netstat -tlnp | grep -E '3000|17654'

# 释放被占用的端口
sudo kill -9 <PID>
```

### 问题2: 周报服务 unhealthy

```bash
# 原因: 数据库未初始化
# 解决:
docker exec weekly-report node tools/init-db.js
docker-compose -f docker-compose.full.yml restart weekly-report
```

### 问题3: OpenClaw 无法访问周报 API

```bash
# 检查网络连通性
docker exec openclaw-gateway ping weekly-report

# 测试 API 调用
docker exec openclaw-gateway curl \
  -H "x-api-key: 你的API_KEY" \
  http://weekly-report:3000/api/data/status

# 检查环境变量
docker exec openclaw-gateway env | grep WEEKLY
```

### 问题4: 飞书连接失败

```bash
# 查看飞书相关日志
docker-compose -f docker-compose.full.yml logs | grep -i feishu

# 检查配置
docker exec openclaw-gateway env | grep FEISHU

# 测试网络连通性
docker exec openclaw-gateway curl -v https://open.feishu.cn
```

### 问题5: 权限错误

```bash
# 修复数据库目录权限
docker exec weekly-report chown -R node:node /app/data

# 修复 OpenClaw 目录权限
docker exec openclaw-gateway chown -R node:node /home/node/.openclaw
```

---

## 🛡️ 安全加固建议

### 1. 修改默认密码

```bash
# 生成强密码
openssl rand -hex 32

# 更新 .env 文件中的
# API_KEY=
# OPENCLAW_GATEWAY_TOKEN=
```

### 2. 配置防火墙

```bash
# 使用 ufw (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # 周报系统
sudo ufw allow 17654/tcp # OpenClaw
sudo ufw enable

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 17654 -j ACCEPT
```

### 3. 使用 Nginx 反向代理（生产环境推荐）

```bash
# 安装 Nginx
sudo apt-get install nginx

# 创建配置文件
sudo tee /etc/nginx/sites-available/ai-weekly << 'EOF'
server {
    listen 80;
    server_name weekly.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/ai-weekly /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 配置 HTTPS (Certbot)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d weekly.yourdomain.com
```

---

## 📚 附录

### 项目文件结构

```
ai-weekly-report-with-openclaw/
├── docker-compose.full.yml      # Docker Compose 配置
├── .env                         # 环境变量配置
├── .env.example                 # 环境变量模板
├── DEPLOYMENT.md               # 部署文档
├── DEPLOY-UBUNTU.md            # 本文档
├── ai-weekly-report/           # 周报系统源码
│   ├── Dockerfile
│   ├── app/api/                # API 路由
│   └── data/                   # SQLite 数据库
├── openclaw/                   # OpenClaw 配置
│   ├── Dockerfile
│   ├── config/                 # OpenClaw 配置
│   └── workspace/              # AI 工作区
└── scripts/
    ├── test-all-api.ps1        # API 测试脚本 (Windows)
    └── verify-deployment.sh    # 部署验证脚本 (Linux)
```

### API 接口速查表

| 接口 | 方法 | 认证 | 用途 |
|-----|------|------|------|
| /api/data/status | GET | 否 | 系统状态 |
| /api/data/weeks | GET | 是 | 周报列表 |
| /api/data/weeks | POST | 是 | 创建周报 |
| /api/data/weeks/{id} | GET | 否 | 周报详情 |
| /api/data/weeks/{id} | PUT | 是 | 更新内容 |
| /api/data/weeks/{id} | PATCH | 是 | 更新元数据 |
| /api/data/weeks/{id} | POST | 是 | 发布周报 |
| /api/data/raw | POST | 是 | 写入原始数据 |
| /api/admin/process | POST | 是 | AI处理数据 |

### 相关资源

- 飞书开发者平台: https://open.feishu.cn/app
- 阿里云百炼: https://bailian.console.aliyun.com
- Docker 文档: https://docs.docker.com
- OpenClaw 文档: https://github.com/anthropics/openclaw

---

## 🎉 部署完成检查清单

- [ ] Docker 和 Docker Compose 已安装
- [ ] 项目文件已上传到服务器
- [ ] .env 文件已配置（API Key、AI Key、飞书配置）
- [ ] Docker 镜像构建成功
- [ ] 容器启动成功且状态为 healthy
- [ ] 数据库已初始化
- [ ] 周报系统可访问 (http://IP:3000)
- [ ] OpenClaw 可访问 (http://IP:17654/healthz)
- [ ] 容器间通信正常
- [ ] 飞书机器人连接成功（如配置）
- [ ] API 测试通过

---

**祝部署顺利！如有问题，请查看日志或参考常见问题排查章节。**
