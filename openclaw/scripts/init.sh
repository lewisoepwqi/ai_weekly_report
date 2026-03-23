#!/bin/bash
set -e

echo "======================================"
echo "   OpenClaw 初始化脚本"
echo "======================================"

# 创建必要的目录
echo "📁 创建目录结构..."
mkdir -p /home/node/.openclaw/workspace/memory
mkdir -p /home/node/.openclaw/memory
mkdir -p /home/node/.openclaw/config

# 设置权限
echo "🔐 设置权限..."
chown -R node:node /home/node/.openclaw

echo "✅ 初始化完成"
echo ""
echo "下一步:"
echo "1. 复制 .env.example 为 .env 并配置"
echo "2. 运行 docker-compose up -d 启动服务"
