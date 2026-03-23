#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "======================================"
echo "   OpenClaw 配置验证工具"
echo "======================================"
echo ""

ENV_FILE="${1:-.env.local}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 配置文件不存在: $ENV_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}📋 正在验证配置文件: $ENV_FILE${NC}"
echo ""

# 加载环境变量
export $(grep -v '^#' "$ENV_FILE" | xargs)

ERRORS=0
WARNINGS=0

# 验证函数
check_required() {
    local name=$1
    local value=$2
    local pattern=$3
    local desc=$4

    if [ -z "$value" ]; then
        echo -e "${RED}❌ $name: 未设置${NC}"
        echo "   $desc"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    if [ -n "$pattern" ] && ! [[ "$value" =~ $pattern ]]; then
        echo -e "${YELLOW}⚠️  $name: 格式可能不正确${NC}"
        echo "   当前值: ${value:0:20}..."
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi

    # 脱敏显示
    if [ ${#value} -gt 20 ]; then
        echo -e "${GREEN}✅ $name: ${value:0:10}...${value: -5}${NC}"
    else
        echo -e "${GREEN}✅ $name: 已设置${NC}"
    fi
    return 0
}

check_optional() {
    local name=$1
    local value=$2

    if [ -z "$value" ]; then
        echo -e "${YELLOW}⚠️  $name: 未设置（可选）${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ $name: 已设置${NC}"
    fi
}

# 检查必需配置
echo -e "${BLUE}🔍 检查飞书配置:${NC}"
check_required "FEISHU_APP_ID" "$FEISHU_APP_ID" "^cli_" "请从 https://open.feishu.cn/app 获取"
check_required "FEISHU_APP_SECRET" "$FEISHU_APP_SECRET" "" "飞书应用的 Secret"
check_required "FEISHU_DOMAIN" "$FEISHU_DOMAIN" "^(feishu|lark)$" "应为 feishu 或 lark"
check_required "FEISHU_CONNECTION_MODE" "$FEISHU_CONNECTION_MODE" "^(websocket|webhook)$" "应为 websocket 或 webhook"

echo ""
echo -e "${BLUE}🔍 检查 AI 配置:${NC}"

AI_CONFIGURED=0
if check_optional "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY"; then
    AI_CONFIGURED=1
fi
if check_optional "OPENAI_API_KEY" "$OPENAI_API_KEY"; then
    AI_CONFIGURED=1
fi
if check_optional "GEMINI_API_KEY" "$GEMINI_API_KEY"; then
    AI_CONFIGURED=1
fi
if check_optional "BAILIAN_API_KEY (阿里云百炼)" "$BAILIAN_API_KEY"; then
    AI_CONFIGURED=1
fi

if [ $AI_CONFIGURED -eq 0 ]; then
    echo -e "${RED}❌ 至少需要一个 AI API Key${NC}"
    echo "   支持的 API: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, BAILIAN_API_KEY"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo -e "${BLUE}🔍 检查其他配置:${NC}"
check_required "OPENCLAW_GATEWAY_TOKEN" "$OPENCLAW_GATEWAY_TOKEN" "" "用于网关认证"

if [ -n "$OPENCLAW_GATEWAY_TOKEN" ] && [ ${#OPENCLAW_GATEWAY_TOKEN} -lt 16 ]; then
    echo -e "${YELLOW}⚠️  OPENCLAW_GATEWAY_TOKEN: 建议设置更长的安全令牌${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 飞书应用 ID 格式检查
if [ -n "$FEISHU_APP_ID" ]; then
    echo ""
    echo -e "${BLUE}🔍 飞书应用 ID 格式检查:${NC}"

    if [[ "$FEISHU_APP_ID" =~ ^cli_[a-zA-Z0-9]{16}$ ]]; then
        echo -e "${GREEN}✅ App ID 格式正确（企业自建应用）${NC}"
    elif [[ "$FEISHU_APP_ID" =~ ^cli_[a-zA-Z0-9]+$ ]]; then
        echo -e "${YELLOW}⚠️  App ID 格式正确，但长度不标准${NC}"
    else
        echo -e "${YELLOW}⚠️  App ID 格式可能不正确${NC}"
        echo "   标准格式: cli_ 开头 + 16位字符"
        echo "   当前格式: ${FEISHU_APP_ID:0:20}"
    fi
fi

# 总结
echo ""
echo "======================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}   ✅ 所有配置正确！${NC}"
    echo "======================================"
    echo ""
    echo "可以运行本地测试了:"
    echo "  bash scripts/test-local.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}   ⚠️  配置有警告，但可以继续${NC}"
    echo "======================================"
    echo ""
    echo "警告数: $WARNINGS"
    echo ""
    read -p "是否继续测试? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash scripts/test-local.sh
    fi
else
    echo -e "${RED}   ❌ 配置有错误，请修复后再测试${NC}"
    echo "======================================"
    echo ""
    echo "错误数: $ERRORS, 警告数: $WARNINGS"
    echo ""
    echo "请编辑 $ENV_FILE 文件修复以上问题"
    exit 1
fi
