#!/bin/bash
set -e

echo "======================================"
echo "   OpenClaw 镜像构建与导出脚本"
echo "======================================"

# 配置
IMAGE_NAME="openclaw"
IMAGE_TAG="feishu-ready-$(date +%Y%m%d)"
EXPORT_DIR="./exports"

echo "📦 步骤1: 构建镜像..."
docker-compose build

echo "🏷️ 步骤2: 标记镜像..."
docker tag openclaw:feishu-ready ${IMAGE_NAME}:${IMAGE_TAG}
docker tag openclaw:feishu-ready ${IMAGE_NAME}:latest

echo "💾 步骤3: 导出镜像..."
mkdir -p ${EXPORT_DIR}
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > ${EXPORT_DIR}/${IMAGE_NAME}-${IMAGE_TAG}.tar.gz
docker save ${IMAGE_NAME}:latest | gzip > ${EXPORT_DIR}/${IMAGE_NAME}-latest.tar.gz

echo "📋 步骤4: 复制配置文件..."
cp -r config ${EXPORT_DIR}/
cp -r workspace ${EXPORT_DIR}/
cp docker-compose.yml ${EXPORT_DIR}/
cp .env.example ${EXPORT_DIR}/
cp README.md ${EXPORT_DIR}/

echo "📦 步骤5: 打包部署包..."
tar -czf openclaw-deploy-package-$(date +%Y%m%d).tar.gz -C ${EXPORT_DIR} .

echo ""
echo "✅ 完成!"
echo "📁 镜像文件: ${EXPORT_DIR}/${IMAGE_NAME}-${IMAGE_TAG}.tar.gz"
echo "📦 部署包: openclaw-deploy-package-$(date +%Y%m%d).tar.gz"
echo ""
echo "上传到服务器:"
echo "  scp openclaw-deploy-package-$(date +%Y%m%d).tar.gz user@server:/path/to/deploy/"
