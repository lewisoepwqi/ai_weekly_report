#!/bin/bash
set -e

echo "======================================"
echo "   推送到阿里云镜像仓库"
echo "======================================"

# 配置（修改为你的信息）
REGISTRY="registry.cn-hangzhou.aliyuncs.com"
NAMESPACE="your-namespace"
REPO_NAME="openclaw"
IMAGE_TAG="feishu-ready"

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${REPO_NAME}:${IMAGE_TAG}"

echo "🔐 步骤1: 登录阿里云..."
docker login --username=your-aliyun-username ${REGISTRY}

echo ""
echo "🏗️ 步骤2: 构建镜像..."
docker-compose build

echo ""
echo "🏷️ 步骤3: 标记镜像..."
docker tag openclaw:feishu-ready ${FULL_IMAGE}

echo ""
echo "📤 步骤4: 推送镜像..."
docker push ${FULL_IMAGE}

echo ""
echo "✅ 推送完成: ${FULL_IMAGE}"
echo ""
echo "服务器拉取命令:"
echo "  docker pull ${FULL_IMAGE}"
