#!/bin/bash
set -e

echo "======================================"
echo "   OpenClaw + Feishu 启动脚本"
echo "======================================"

# 检查必需的环境变量
if [ -z "$FEISHU_APP_ID" ] || [ "$FEISHU_APP_ID" = "cli_xxxxxxxxxxxxxxxxx" ]; then
    echo "❌ 错误: 请设置 FEISHU_APP_ID 环境变量"
    echo "   前往 https://open.feishu.cn/app 创建应用获取"
    exit 1
fi

if [ -z "$FEISHU_APP_SECRET" ]; then
    echo "❌ 错误: 请设置 FEISHU_APP_SECRET 环境变量"
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$GEMINI_API_KEY" ] && [ -z "$BAILIAN_API_KEY" ]; then
    echo "❌ 错误: 请至少配置一个 AI API Key"
    echo "   支持的 API: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, BAILIAN_API_KEY"
    echo "   国内用户推荐使用 BAILIAN_API_KEY (阿里云百炼)"
    exit 1
fi

# 创建工作目录
mkdir -p /home/node/.openclaw/workspace/memory
mkdir -p /home/node/.openclaw/memory

# 检查配置文件
if [ ! -f "/home/node/.openclaw/openclaw.json" ]; then
    echo "⚠️  未找到 openclaw.json，使用默认配置..."
    # 这里可以复制默认配置
fi

echo "✅ 环境检查通过"
echo "📱 飞书应用ID: $FEISHU_APP_ID"
if [ -n "$BAILIAN_API_KEY" ]; then
    echo "☁️  AI 提供商: 阿里云百炼 (Coding Plan)"
elif [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "🤖 AI 提供商: Claude (Anthropic)"
elif [ -n "$OPENAI_API_KEY" ]; then
    echo "🤖 AI 提供商: OpenAI"
elif [ -n "$GEMINI_API_KEY" ]; then
    echo "🤖 AI 提供商: Gemini"
fi
echo "🚀 启动 OpenClaw Gateway..."

# 启动网关 (bind 参数从配置文件读取)
exec openclaw gateway --port 17654
