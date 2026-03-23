#!/bin/bash
# 快速测试脚本 - 适合重复测试

echo "=== OpenClaw 快速测试 ==="
echo ""

# 检查服务是否运行
if ! docker ps | grep -q "openclaw-gateway-local"; then
    echo "服务未运行，尝试启动..."
    docker-compose -f docker-compose.local.yml up -d
    sleep 5
fi

echo "1. 健康检查:"
HEALTH=$(curl -s http://localhost:17654/healthz 2>/dev/null || echo '{"status":"error"}')
echo "   $HEALTH"

echo ""
echo "2. 飞书连接日志:"
docker-compose -f docker-compose.local.yml logs --tail 30 | grep -iE "(feishu|lark|connected|error|pairing)" | tail -10

echo ""
echo "3. 服务状态:"
docker-compose -f docker-compose.local.yml ps

echo ""
echo "=== 测试完成 ==="
echo ""
echo "查看完整日志: docker-compose -f docker-compose.local.yml logs -f"
