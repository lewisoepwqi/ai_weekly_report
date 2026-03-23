#!/bin/bash
set -e

echo "======================================"
echo "   从阿里云部署 OpenClaw"
echo "======================================"

# 配置
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="your-namespace"
REPO_NAME="openclaw"
IMAGE_TAG="feishu-ready"

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${REPO_NAME}:${IMAGE_TAG}"

cd /opt/openclaw

echo "🔐 步骤1: 登录阿里云..."
docker login --username=your-aliyun-username ${REGISTRY}

echo ""
echo "📥 步骤2: 拉取最新镜像..."
docker pull ${FULL_IMAGE}

echo ""
echo "🛑 步骤3: 停止旧服务..."
docker stop openclaw-gateway 2>/dev/null || true
docker rm openclaw-gateway 2>/dev/null || true

echo ""
echo "🚀 步骤4: 启动新服务..."
docker run -d \
  --name openclaw-gateway \
  --env-file .env \
  -v $(pwd)/config:/home/node/.openclaw \
  -v $(pwd)/workspace:/home/node/.openclaw/workspace \
  -v openclaw-memory:/home/node/.openclaw/memory \
  -p 17654:17654 \
  -p 17655:17655 \
  --restart unless-stopped \
  ${FULL_IMAGE}

echo ""
echo "⏳ 步骤5: 等待启动..."
sleep 5

echo ""
echo "🔍 步骤6: 健康检查..."
if curl -s http://localhost:17654/healthz | grep -q "ok"; then
    echo "✅ 服务运行正常!"
else
    echo "⚠️  检查中..."
    docker logs openclaw-gateway --tail 20
fi

echo ""
echo "✅ 部署完成!"
