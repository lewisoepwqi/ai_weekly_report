# AI Weekly Report 服务器部署说明

## 文件说明

| 文件 | 说明 |
|------|------|
| `ai-weekly-report.tar` | Docker 镜像文件 |
| `docker-compose.yml` | Docker Compose 配置文件 |
| `.env.example` | 环境变量示例文件 |
| `deploy.sh` | 快速部署脚本（Linux/Mac）|

## 部署步骤

### 1. 解压部署包

```bash
tar -xzf ai-weekly-report-deploy.tar.gz
cd ai-weekly-report-deploy
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，设置以下变量：
# - API_KEY: 用于 API 鉴权（必填，建议设置强密码）
# - ANTHROPIC_API_KEY: Claude API 密钥（可选）
# - GITHUB_TOKEN: GitHub Token（可选）
nano .env
```

### 3. 启动服务

**方式一：使用部署脚本（推荐）**
```bash
chmod +x deploy.sh
./deploy.sh
```

**方式二：手动部署**
```bash
# 加载镜像
docker load -i ai-weekly-report.tar

# 创建数据目录
mkdir -p data

# 启动服务
docker-compose up -d
```

### 4. 验证部署

```bash
# 查看容器状态
docker ps

# 查看日志
docker-compose logs -f

# 测试 API
curl http://localhost:3000/api/data/status
```

### 5. 初始化数据库（首次部署）

```bash
docker exec weekly-report node tools/init-db.js
```

## 网络配置

当前配置使用 `openclaw_default` 外部网络与 OpenClaw 系统集成。

如需独立部署，请修改 `docker-compose.yml`：

```yaml
# 移除以下配置
networks:
  - openclaw_net

networks:
  openclaw_net:
    external: true
    name: openclaw_default
```

## 常用命令

```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新镜像
docker load -i ai-weekly-report.tar
docker-compose up -d
```

## API 使用示例

```bash
# 创建周报（需要 API_KEY）
curl -X POST http://localhost:3000/api/data/weeks \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "id": "2026-W12",
    "period": "第 4 期",
    "date_range": "2026.03.17-03.23"
  }'

# 获取周报列表
curl http://localhost:3000/api/data/weeks
```

## 数据备份

数据库文件位于 `./data/weekly.db`，建议定期备份：

```bash
# 备份
cp data/weekly.db backup/weekly-$(date +%Y%m%d).db

# 恢复
cp backup/weekly-20260317.db data/weekly.db
docker-compose restart
```
