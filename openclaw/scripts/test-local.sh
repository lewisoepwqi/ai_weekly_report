#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================"
echo "   OpenClaw 本地测试脚本"
echo "======================================"
echo ""

# 检查 Docker 环境
echo -e "${BLUE}🔍 步骤1: 检查 Docker 环境...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "   请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 版本: $(docker --version)${NC}"
echo -e "${GREEN}✅ Docker Compose 版本: $(docker-compose --version)${NC}"
echo ""

# 检查 .env.local 文件
echo -e "${BLUE}🔍 步骤2: 检查配置文件...${NC}"

if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ 未找到 .env.local 文件${NC}"
    exit 1
fi

# 加载环境变量
export $(grep -v '^#' .env.local | xargs)

# 检查必需配置
MISSING_CONFIG=0

if [ -z "$FEISHU_APP_ID" ]; then
    echo -e "${RED}❌ 未配置 FEISHU_APP_ID${NC}"
    echo "   请编辑 .env.local 文件，填入飞书应用 ID"
    MISSING_CONFIG=1
else
    echo -e "${GREEN}✅ FEISHU_APP_ID: ${FEISHU_APP_ID:0:10}...${NC}"
fi

if [ -z "$FEISHU_APP_SECRET" ]; then
    echo -e "${RED}❌ 未配置 FEISHU_APP_SECRET${NC}"
    MISSING_CONFIG=1
else
    echo -e "${GREEN}✅ FEISHU_APP_SECRET: 已配置${NC}"
fi

if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ 未配置 AI API Key${NC}"
    echo "   请至少配置 ANTHROPIC_API_KEY、OPENAI_API_KEY 或 GEMINI_API_KEY 之一"
    MISSING_CONFIG=1
else
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo -e "${GREEN}✅ ANTHROPIC_API_KEY: 已配置${NC}"
    fi
    if [ -n "$OPENAI_API_KEY" ]; then
        echo -e "${GREEN}✅ OPENAI_API_KEY: 已配置${NC}"
    fi
    if [ -n "$GEMINI_API_KEY" ]; then
        echo -e "${GREEN}✅ GEMINI_API_KEY: 已配置${NC}"
    fi
fi

if [ $MISSING_CONFIG -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  请先完善 .env.local 配置后再运行测试${NC}"
    exit 1
fi

echo ""

# 构建镜像
echo -e "${BLUE}🏗️ 步骤3: 构建 Docker 镜像...${NC}"
docker-compose -f docker-compose.local.yml down 2>/dev/null || true
docker-compose -f docker-compose.local.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 镜像构建成功${NC}"
echo ""

# 启动服务
echo -e "${BLUE}🚀 步骤4: 启动服务...${NC}"
docker-compose -f docker-compose.local.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 服务启动失败${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 服务已启动${NC}"
echo ""

# 等待健康检查
echo -e "${BLUE}⏳ 步骤5: 等待服务就绪...${NC}"
echo "   等待 10 秒..."
sleep 10

# 健康检查
echo ""
echo -e "${BLUE}🔍 步骤6: 健康检查...${NC}"

HEALTH_STATUS=$(curl -s http://localhost:17654/healthz 2>/dev/null || echo "failed")

if echo "$HEALTH_STATUS" | grep -q "ok"; then
    echo -e "${GREEN}✅ Gateway 健康检查通过${NC}"
else
    echo -e "${RED}❌ Gateway 健康检查失败${NC}"
    echo "   响应: $HEALTH_STATUS"
    echo ""
    echo -e "${YELLOW}查看日志:${NC}"
    docker-compose -f docker-compose.local.yml logs --tail 20
    exit 1
fi

echo ""

# 检查飞书连接
echo -e "${BLUE}📱 步骤7: 检查飞书连接...${NC}"
echo "   正在检查飞书连接状态..."
sleep 5

FEISHU_LOGS=$(docker-compose -f docker-compose.local.yml logs --tail 50 2>&1)

if echo "$FEISHU_LOGS" | grep -qi "feishu.*connected\|飞书.*连接\|lark.*connected"; then
    echo -e "${GREEN}✅ 飞书连接成功${NC}"
    echo ""
    echo -e "${GREEN}🎉 所有测试通过！可以部署到服务器了${NC}"
    TEST_PASSED=1
else
    echo -e "${YELLOW}⚠️  未检测到飞书连接成功日志${NC}"
    echo ""
    echo -e "${YELLOW}可能的解决方案:${NC}"
    echo "   1. 检查 FEISHU_APP_ID 和 FEISHU_APP_SECRET 是否正确"
    echo "   2. 确认飞书应用已发布"
    echo "   3. 检查网络是否可以访问飞书 API"
    echo ""
    echo -e "${YELLOW}查看详细日志:${NC}"
    docker-compose -f docker-compose.local.yml logs -f &
    LOG_PID=$!

    echo ""
    read -p "按 Enter 键停止查看日志..."
    kill $LOG_PID 2>/dev/null || true

    TEST_PASSED=0
fi

echo ""

# 显示服务状态
echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose -f docker-compose.local.yml ps

echo ""
echo "======================================"
if [ "$TEST_PASSED" = "1" ]; then
    echo -e "${GREEN}   本地测试通过！${NC}"
    echo "======================================"
    echo ""
    echo "现在可以部署到服务器:"
    echo "  bash scripts/build-and-export.sh"
else
    echo -e "${YELLOW}   测试未完全通过，请检查配置${NC}"
    echo "======================================"
fi
echo ""

# 询问是否停止服务
echo -e "${BLUE}是否停止本地测试服务?${NC}"
read -p "输入 'y' 停止服务，其他键保持运行: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "停止服务..."
    docker-compose -f docker-compose.local.yml down
    echo -e "${GREEN}✅ 服务已停止${NC}"
else
    echo -e "${YELLOW}服务继续运行中...${NC}"
    echo ""
    echo "常用命令:"
    echo "  查看日志: docker-compose -f docker-compose.local.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose.local.yml down"
    echo "  进入 CLI: docker-compose -f docker-compose.local.yml run --rm openclaw-gateway /bin/bash"
fi
