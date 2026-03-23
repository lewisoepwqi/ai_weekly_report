#!/bin/bash
set -e

echo "======================================"
echo "   OpenClaw 服务器部署脚本"
echo "======================================"

# 检查是否以root运行
if [ "$EUID" -ne 0 ]; then
   echo "⚠️  建议以 sudo 运行此脚本"
fi

echo "📋 步骤1: 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   安装命令: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装"
    echo "   安装命令: pip install docker-compose"
    exit 1
fi

echo "✅ Docker 版本: $(docker --version)"
echo "✅ Docker Compose 版本: $(docker-compose --version)"

echo ""
echo "📁 步骤2: 解压部署包..."
if [ -f "openclaw-deploy-package-*.tar.gz" ]; then
    tar -xzf openclaw-deploy-package-*.tar.gz
    echo "✅ 解压完成"
else
    echo "⚠️  未找到部署包，请确保在正确目录"
fi

echo ""
echo "💾 步骤3: 导入镜像..."
if [ -f "openclaw-latest.tar.gz" ]; then
    gunzip -c openclaw-latest.tar.gz | docker load
    echo "✅ 镜像导入完成"
else
    echo "⚠️  未找到镜像文件，跳过导入"
fi

echo ""
echo "⚙️ 步骤4: 配置环境..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  已创建 .env 文件，请编辑配置后再启动"
    echo "   需要配置: FEISHU_APP_ID, FEISHU_APP_SECRET, ANTHROPIC_API_KEY"
    exit 0
fi

echo ""
echo "🚀 步骤5: 启动服务..."
docker-compose down 2>/dev/null || true
docker-compose up -d

echo ""
echo "⏳ 步骤6: 等待服务启动..."
sleep 5

echo ""
echo "🔍 步骤7: 健康检查..."
if curl -s http://localhost:17654/healthz | grep -q "ok"; then
    echo "✅ 服务运行正常!"
else
    echo "⚠️  健康检查失败，查看日志: docker-compose logs -f"
fi

echo ""
echo "======================================"
echo "   部署完成!"
echo "======================================"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  查看状态: docker-compose ps"
echo "  停止服务: docker-compose down"
echo "  重启服务: docker-compose restart"
echo "  进入 CLI: docker-compose run --rm openclaw-cli"
echo ""
echo "飞书连接测试:"
echo "  docker-compose logs | grep -i feishu"
