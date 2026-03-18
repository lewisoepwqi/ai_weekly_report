#!/bin/bash

# AI Weekly Report 部署脚本

set -e

echo "=== AI Weekly Report 部署脚本 ==="
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 检查外部网络是否存在（用于 OpenClaw 集成）
if ! docker network ls | grep -q openclaw_default; then
    echo "警告: Docker 网络 'openclaw_default' 不存在"
    echo "如需与 OpenClaw 集成，请先创建该网络:"
    echo "  docker network create openclaw_default"
    echo ""
    echo "或者修改 docker-compose.yml 移除 openclaw_net 网络配置"
    echo ""
fi

# 创建数据目录
mkdir -p data

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "警告: .env 文件不存在，复制 .env.example"
    cp .env.example .env
    echo "请编辑 .env 文件设置 API_KEY 等环境变量"
    exit 1
fi

# 加载镜像
echo "加载 Docker 镜像..."
docker load -i ai-weekly-report.tar

# 启动服务
echo "启动服务..."
docker-compose up -d

echo ""
echo "=== 部署完成 ==="
echo ""
echo "服务地址: http://localhost:3000"
echo ""
echo "查看日志: docker-compose logs -f"
echo "停止服务: docker-compose down"
echo ""
