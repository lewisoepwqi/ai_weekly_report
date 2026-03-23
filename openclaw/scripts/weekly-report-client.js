#!/usr/bin/env node
/**
 * Weekly Report API Client
 * OpenClaw 调用 AI Weekly Report API 的示例客户端
 *
 * 使用方法:
 *   node weekly-report-client.js list
 *   node weekly-report-client.js create --id 2026-W12 --period "第4期" --range "2026.03.17-03.23"
 *   node weekly-report-client.js get --id 2026-W12
 *   node weekly-report-client.js update-items --id 2026-W12 --file items.json
 */

const BASE_URL = process.env.WEEKLY_REPORT_API_URL || 'http://weekly-report:3000';
const API_KEY = process.env.WEEKLY_REPORT_API_KEY || process.env.API_KEY;

async function apiCall(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

// API 方法
const api = {
  // 获取周报列表
  listWeeks: () => apiCall('/api/data/weeks'),

  // 创建周报
  createWeek: (data) => apiCall('/api/data/weeks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 获取单期周报
  getWeek: (weekId) => apiCall(`/api/data/weeks/${weekId}`),

  // 更新周报内容
  updateWeekItems: (weekId, data) => apiCall(`/api/data/weeks/${weekId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // 更新周报元数据
  updateWeekMeta: (weekId, data) => apiCall(`/api/data/weeks/${weekId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  // 发布周报
  publishWeek: (weekId) => apiCall(`/api/data/weeks/${weekId}`, {
    method: 'POST',
  }),

  // 删除周报
  deleteWeek: (weekId) => apiCall(`/api/data/weeks/${weekId}`, {
    method: 'DELETE',
  }),

  // 处理数据
  processData: (week, options = {}) => apiCall('/api/admin/process', {
    method: 'POST',
    body: JSON.stringify({ week, ...options }),
  }),

  // 获取状态
  getStatus: () => apiCall('/api/data/status'),
};

// CLI 命令处理
const commands = {
  async list() {
    const weeks = await api.listWeeks();
    console.log('周报列表:');
    console.table(weeks);
  },

  async create(args) {
    const data = {
      id: args.id,
      period: args.period,
      date_range: args.range,
      intro: args.intro,
      keywords: args.keywords?.split(','),
      status: args.status || 'draft',
    };
    const result = await api.createWeek(data);
    console.log('创建成功:', result);
  },

  async get(args) {
    const data = await api.getWeek(args.id);
    console.log(JSON.stringify(data, null, 2));
  },

  async 'update-items'(args) {
    const fs = await import('fs');
    const items = JSON.parse(fs.readFileSync(args.file, 'utf-8'));
    const result = await api.updateWeekItems(args.id, { items, publish: args.publish });
    console.log('更新成功:', result);
  },

  async publish(args) {
    const result = await api.publishWeek(args.id);
    console.log('发布成功:', result);
  },

  async delete(args) {
    const result = await api.deleteWeek(args.id);
    console.log('删除成功:', result);
  },

  async process(args) {
    const result = await api.processData(args.week, {
      noAi: args.noAi,
      force: args.force,
    });
    console.log('处理结果:', result);
  },

  async status() {
    const status = await api.getStatus();
    console.log('系统状态:', status);
  },
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};

  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--?/, '');
    const value = args[i + 1];
    options[key] = value;
  }

  return { command, options };
}

// 主函数
async function main() {
  if (!API_KEY) {
    console.error('错误: 未设置 API_KEY 环境变量');
    process.exit(1);
  }

  const { command, options } = parseArgs();

  if (!command || command === 'help') {
    console.log(`
Weekly Report API Client

用法:
  node weekly-report-client.js <command> [options]

命令:
  list                          列出所有周报
  create                        创建新周报
    --id <YYYY-WNN>            周报ID (必填)
    --period <string>          期号，如 "第4期" (必填)
    --range <string>           日期范围，如 "2026.03.17-03.23" (必填)
    --intro <string>           导语
    --keywords <k1,k2>         关键词，逗号分隔
    --status <draft|published> 状态

  get                           获取单期周报
    --id <YYYY-WNN>            周报ID (必填)

  update-items                  更新周报条目
    --id <YYYY-WNN>            周报ID (必填)
    --file <path>              JSON文件路径 (必填)
    --publish                  同时发布

  publish                       发布周报
    --id <YYYY-WNN>            周报ID (必填)

  delete                        删除周报
    --id <YYYY-WNN>            周报ID (必填)

  process                       处理数据
    --week <YYYY-WNN>          周报ID (必填)
    --noAi                     跳过AI处理
    --force                    强制重新处理

  status                        获取系统状态
`);
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`未知命令: ${command}`);
    console.log('使用 "help" 查看帮助');
    process.exit(1);
  }

  try {
    await handler(options);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
