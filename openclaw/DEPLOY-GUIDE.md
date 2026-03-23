# OpenClaw Docker 镜像部署指南

本文档详细介绍如何将 OpenClaw Docker 镜像打包并部署到服务器。

## ⚠️ 重要提示

**强烈建议先在本地测试通过后再部署到服务器！**

## 目录

1. [本地测试（必须先完成）](#本地测试)
2. [方式一：导出/导入镜像（无仓库环境）](#方式一导出导入镜像)
3. [方式二：Docker Hub（公开/私人仓库）](#方式二docker-hub)
4. [方式三：阿里云/腾讯云镜像仓库（国内推荐）](#方式三阿里云镜像仓库)
5. [服务器配置要求](#服务器配置要求)
6. [常见问题排查](#常见问题排查)

---

## 本地测试

在部署到服务器之前，必须先在本地完成测试，确保：
1. Docker 环境正常
2. 飞书连接成功
3. AI 回复正常

### 测试流程

```bash
# 1. 复制并编辑本地测试配置
cp .env.local .env.local.test
# 编辑 .env.local，填入你的飞书凭证和 AI API Key

# 2. 验证配置
bash scripts/verify-config.sh

# 3. 运行本地测试
bash scripts/test-local.sh
```

详细测试指南请参考：[TEST-GUIDE.md](./TEST-GUIDE.md)

飞书应用配置指南请参考：[docs/feishu-setup-guide.md](./docs/feishu-setup-guide.md)

### 测试成功标志

测试脚本会输出：
```
✅ Docker 版本: xxx
✅ FEISHU_APP_ID: cli_...
✅ FEISHU_APP_SECRET: 已配置
✅ ANTHROPIC_API_KEY: 已配置
🏗️ 步骤3: 构建 Docker 镜像...
✅ 镜像构建成功
🚀 步骤4: 启动服务...
✅ 服务已启动
✅ Gateway 健康检查通过
✅ 飞书连接成功
🎉 所有测试通过！可以部署到服务器了
```

### 下一步

本地测试通过后，继续选择下面的部署方式。

---

## 服务器配置要求

- **操作系统**: Ubuntu 20.04+, CentOS 7+, Debian 10+
- **内存**: 最低 2GB RAM（推荐 4GB）
- **磁盘**: 最低 10GB 可用空间
- **网络**: 需要访问飞书 API 和 AI 服务 API
- **端口**: 需要开放 17654（Gateway）和 17655（Bridge）

### 安装 Docker（如未安装）

```bash
# 一键安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
pip3 install docker-compose

# 启动 Docker
systemctl enable docker
systemctl start docker

# 验证安装
docker --version
docker-compose --version
```

---

## 方式一：导出/导入镜像（推荐）

适用于没有镜像仓库或内网环境。

### 前置条件

✅ 已完成 [本地测试](#本地测试) 且全部通过

### 本地操作（Windows/WSL/Mac/Linux）

```bash
# 1. 进入项目目录
cd openclaw

# 2. 执行构建脚本（在 Git Bash/WSL 中运行）
bash scripts/build-and-export.sh
```

脚本会生成：`openclaw-deploy-package-YYYYMMDD.tar.gz`

### 上传到服务器

```bash
# 方式A：SCP 上传
scp openclaw-deploy-package-*.tar.gz root@your-server-ip:/opt/

# 方式B：使用工具上传（如 FinalShell、WinSCP 等）
# 将文件上传到 /opt/ 目录
```

### 服务器端操作

```bash
# 1. SSH 登录服务器
ssh root@your-server-ip

# 2. 创建目录
cd /opt
mkdir -p openclaw
tar -xzf openclaw-deploy-package-*.tar.gz -C openclaw/
cd openclaw

# 3. 加载镜像
docker load < openclaw-latest.tar.gz

# 4. 配置环境变量
cp .env.example .env
vim .env  # 或使用 nano .env
```

编辑 `.env` 文件：

```bash
# 必填项
OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)
ANTHROPIC_API_KEY=sk-ant-xxx  # 或 OPENAI_API_KEY / GEMINI_API_KEY
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
```

```bash
# 5. 启动服务
docker-compose up -d

# 6. 查看日志
docker-compose logs -f

# 7. 健康检查
curl http://localhost:17654/healthz
```

---

## 方式二：Docker Hub

### 本地操作

```bash
# 1. 登录 Docker Hub
docker login

# 2. 构建镜像
docker-compose build

# 3. 标记镜像（替换 your-username）
docker tag openclaw:feishu-ready your-username/openclaw:feishu-ready

# 4. 推送镜像
docker push your-username/openclaw:feishu-ready
```

### 服务器操作

```bash
# 1. 登录服务器并拉取镜像
docker pull your-username/openclaw:feishu-ready

# 2. 创建目录和配置
mkdir -p /opt/openclaw/{config,workspace}
cd /opt/openclaw

# 3. 创建 .env 文件
cat > .env << 'EOF'
OPENCLAW_GATEWAY_TOKEN=your-token-here
ANTHROPIC_API_KEY=sk-ant-xxx
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket
EOF

# 4. 运行容器
docker run -d \
  --name openclaw-gateway \
  --env-file .env \
  -v $(pwd)/config:/home/node/.openclaw \
  -v $(pwd)/workspace:/home/node/.openclaw/workspace \
  -v openclaw-memory:/home/node/.openclaw/memory \
  -p 17654:17654 \
  -p 17655:17655 \
  --restart unless-stopped \
  your-username/openclaw:feishu-ready

# 5. 查看日志
docker logs -f openclaw-gateway
```

---

## 方式三：阿里云镜像仓库

### 准备工作

1. 登录 [阿里云容器镜像服务](https://cr.console.aliyun.com/)
2. 创建命名空间（如 `myproject`）
3. 创建镜像仓库（如 `openclaw`）
4. 记下仓库地址：`registry.cn-hangzhou.aliyuncs.com/myproject/openclaw`

### 本地操作

```bash
# 1. 修改 scripts/push-to-aliyun.sh 中的配置
# REGISTRY="你的仓库地址"
# NAMESPACE="你的命名空间"

# 2. 执行推送脚本
bash scripts/push-to-aliyun.sh
```

### 服务器操作

```bash
# 1. 修改 scripts/deploy-from-aliyun.sh 中的配置
# 与 push-to-aliyun.sh 保持一致

# 2. 执行部署脚本
bash scripts/deploy-from-aliyun.sh
```

---

## 使用 Nginx 反向代理（生产环境推荐）

如果需要使用域名和 HTTPS：

```bash
# 安装 Nginx
apt-get install nginx

# 创建配置文件
cat > /etc/nginx/sites-available/openclaw << 'EOF'
server {
    listen 80;
    server_name openclaw.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:17654;
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
ln -s /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 配置 HTTPS（使用 Certbot）
apt-get install certbot python3-certbot-nginx
certbot --nginx -d openclaw.yourdomain.com
```

---

## 常见问题排查

### 1. 镜像导入失败

```bash
# 错误：archive/tar: invalid tar header
# 解决：确保文件传输使用二进制模式
scp -o 'ForceBinaryMode yes' openclaw-*.tar.gz root@server:/opt/

# 或使用 rsync
rsync -avz openclaw-*.tar.gz root@server:/opt/
```

### 2. 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 18789

# 停止占用端口的进程
kill -9 <PID>

# 或使用不同端口
docker-compose up -d -p 18889:17654
```

### 3. 环境变量未生效

```bash
# 检查环境变量
docker exec openclaw-gateway env | grep FEISHU

# 重启服务
docker-compose down
docker-compose up -d
```

### 4. 飞书连接失败

```bash
# 查看详细日志
docker-compose logs -f | grep -i feishu

# 检查网络连通性
docker exec openclaw-gateway curl -v https://open.feishu.cn

# 检查防火墙
iptables -L | grep 18789
```

### 5. 内存不足

```bash
# 查看容器内存使用
docker stats openclaw-gateway

# 增加内存限制
docker run -d --memory=2g --memory-swap=2g ...
```

---

## 自动化部署（CI/CD）

### GitHub Actions 示例

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Image

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker Image
      run: docker-compose build

    - name: Login to Alibaba Cloud
      uses: docker/login-action@v2
      with:
        registry: registry.cn-hangzhou.aliyuncs.com
        username: ${{ secrets.ALIYUN_USERNAME }}
        password: ${{ secrets.ALIYUN_PASSWORD }}

    - name: Push Image
      run: |
        docker tag openclaw:feishu-ready registry.cn-hangzhou.aliyuncs.com/myproject/openclaw:${{ github.sha }}
        docker push registry.cn-hangzhou.aliyuncs.com/myproject/openclaw:${{ github.sha }}

    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/openclaw
          docker pull registry.cn-hangzhou.aliyuncs.com/myproject/openclaw:${{ github.sha }}
          docker-compose down
          docker-compose up -d
```

---

## 备份与恢复

### 备份数据

```bash
#!/bin/bash
BACKUP_DIR="/backup/openclaw-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份配置
cp -r /opt/openclaw/config $BACKUP_DIR/
cp -r /opt/openclaw/workspace $BACKUP_DIR/
cp /opt/openclaw/.env $BACKUP_DIR/

# 备份记忆数据
docker run --rm -v openclaw-memory:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/memory.tar.gz -C /data .

# 压缩
tar czf ${BACKUP_DIR}.tar.gz $BACKUP_DIR
```

### 恢复数据

```bash
#!/bin/bash
# 解压备份
tar xzf backup-20260318.tar.gz

# 恢复配置
cp -r backup-20260318/config /opt/openclaw/
cp -r backup-20260318/workspace /opt/openclaw/
cp backup-20260318/.env /opt/openclaw/

# 恢复记忆数据
docker run --rm -v openclaw-memory:/data -v $(pwd)/backup-20260318:/backup alpine tar xzf /backup/memory.tar.gz -C /data
```

---

## 相关脚本说明

| 脚本 | 用途 |
|------|------|
| `scripts/build-and-export.sh` | 本地构建并导出镜像 |
| `scripts/deploy-on-server.sh` | 服务器端部署（本地镜像） |
| `scripts/push-to-aliyun.sh` | 推送到阿里云镜像仓库 |
| `scripts/deploy-from-aliyun.sh` | 从阿里云拉取并部署 |

---

## 总结

| 部署方式 | 适用场景 | 复杂度 |
|---------|---------|--------|
| 导出/导入 | 内网环境、无仓库 | ⭐⭐ |
| Docker Hub | 公开项目、国外服务器 | ⭐⭐ |
| 阿里云仓库 | 国内服务器、企业环境 | ⭐⭐⭐ |

推荐国内用户使用 **阿里云镜像仓库**，速度快且稳定。
