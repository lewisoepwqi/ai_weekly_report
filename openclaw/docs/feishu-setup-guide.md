# 飞书机器人配置完整指南

本文档详细说明如何配置飞书机器人，确保 OpenClaw 能正常连接。

---

## 第一步：创建飞书应用

### 1.1 访问开发者平台

- **国内版飞书**: https://open.feishu.cn/app
- **国际版 Lark**: https://open.larksuite.com/app

### 1.2 创建应用

1. 点击「创建企业自建应用」
2. 选择「企业自建应用」
3. 填写应用信息：
   - **应用名称**: OpenClaw（或其他你喜欢的名字）
   - **应用描述**: AI 助手机器人
   - **应用图标**: 上传一个图标（可选）

### 1.3 记录凭证

创建成功后，进入「凭证与基础信息」页面，记录：

- **App ID**: 以 `cli_` 开头的字符串
- **App Secret**: 点击显示后复制的密钥

⚠️ **重要**: App Secret 只显示一次，请妥善保存！

---

## 第二步：开启机器人能力

### 2.1 进入机器人设置

1. 左侧菜单点击「机器人」
2. 打开「机器人能力」开关

### 2.2 配置机器人信息

- **机器人名称**: OpenClaw
- **机器人介绍**: 你的 AI 助手
- **机器人头像**: 上传头像（可选）

### 2.3 设置事件订阅（Webhook 模式需要）

如果使用 Webhook 模式，需要配置：
- **请求地址**: `http://你的服务器IP:17654/feishu/webhook`
- **验证令牌**: 随机生成一个字符串填入 `.env` 的 `FEISHU_VERIFICATION_TOKEN`

⚠️ **注意**: Webhook 模式需要服务器能被公网访问，且有 SSL 证书。

**推荐**: 本地测试使用 WebSocket 模式，无需配置 Webhook。

---

## 第三步：申请权限

### 3.1 进入权限管理

左侧菜单点击「权限管理」

### 3.2 添加必需权限

搜索并添加以下权限：

```
// 基础权限
application:application:app_message_stats.overview:readonly
application:application:self_manage
application:bot.menu:write

// 联系人权限
contact:user.employee_id:readonly
contact:user.base:readonly

// 群聊权限
im:chat.access_event.bot_p2p_chat:read
im:chat.members:bot_access
im:chat:readonly

// 消息权限
im:message.group_at_msg:readonly
im:message.group_msg:readonly
im:message.p2p_msg:readonly
im:message:send_as_bot

// 用户权限
im:user:readonly
```

### 3.3 申请权限

1. 点击「批量申请」
2. 填写申请理由：「用于机器人收发消息」
3. 等待管理员审批（企业内部应用通常自动通过）

---

## 第四步：发布应用

### 4.1 创建版本

1. 左侧菜单点击「版本管理与发布」
2. 点击「创建版本」
3. 填写版本信息：
   - **版本号**: 1.0.0
   - **更新说明**: 初始版本
   - **申请理由**: 企业内部使用

### 4.2 申请发布

1. 点击「申请发布」
2. 等待管理员审批

⚠️ **重要**: 应用必须发布后才能使用！未发布的应用无法连接。

---

## 第五步：使用机器人

### 5.1 私聊方式

1. 在飞书搜索框输入应用名称
2. 点击机器人进入对话
3. 发送配对码进行配对

### 5.2 群聊方式

1. 创建一个群聊
2. 点击「添加群机器人」
3. 搜索并选择你的应用
4. 在群里 @机器人 发送消息

---

## 配置检查清单

复制以下清单，逐项检查：

```markdown
## 飞书应用配置检查清单

### 基础配置
- [ ] 已创建企业自建应用
- [ ] 已记录 App ID
- [ ] 已记录 App Secret

### 机器人配置
- [ ] 已开启机器人能力
- [ ] 已设置机器人名称和头像

### 权限配置
- [ ] 已申请 application:application:self_manage
- [ ] 已申请 im:message:send_as_bot
- [ ] 已申请 im:message.p2p_msg:readonly
- [ ] 已申请 im:message.group_at_msg:readonly
- [ ] 已申请 contact:user.employee_id:readonly
- [ ] 权限申请已通过

### 发布状态
- [ ] 已创建版本 1.0.0
- [ ] 已申请发布
- [ ] 发布申请已通过

### 测试准备
- [ ] 可以在飞书搜索到机器人
- [ ] 可以私聊机器人
- [ ] 可以邀请机器人进群
```

---

## 常见问题

### Q1: App Secret 丢失了怎么办？

A: 进入「凭证与基础信息」，点击「重置」生成新的 Secret。

### Q2: 权限申请被拒绝？

A: 检查申请理由是否清晰，或联系企业管理员手动审批。

### Q3: 搜索不到机器人？

A: 确保应用已发布，且你有权限访问该应用。

### Q4: 机器人不回复消息？

A: 检查以下几点：
1. 应用是否已发布
2. 权限是否已全部申请并通过
3. 是否在群里 @了机器人
4. 是否已完成配对流程

---

## 配置验证

完成以上步骤后，运行验证脚本：

```bash
bash scripts/verify-config.sh
```

验证通过后，运行本地测试：

```bash
bash scripts/test-local.sh
```
