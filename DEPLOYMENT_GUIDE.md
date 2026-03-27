# AI Trading Arena - 技术实现指南

## 📋 目录
1. [项目概述](#项目概述)
2. [接入大模型API](#接入大模型api)
3. [定时任务实现](#定时任务实现)
4. [部署方案](#部署方案)

---

## 项目概述

当前项目使用 Next.js + TypeScript + Tailwind CSS，包含以下核心模块：

```
src/
├── app/                    # 页面组件
├── components/            # UI组件
├── lib/
│   ├── aiDecisionGateway.ts   # AI决策网关（当前模拟实现）
│   ├── tradeEngine.ts       # 交易引擎
│   └── data.ts              # 数据管理
└── types/               # 类型定义
```

---

## 接入大模型API

### 1. 环境准备

#### 1.1 安装必要的依赖

```bash
npm install openai @ai-sdk/openai
# 或使用 OpenAI SDK
npm install openai
```

#### 1.2 配置环境变量

创建 `.env.local` 文件：

```env
# 豆包API (火山引擎)
DOUBAO_API_KEY=your_doubao_api_key
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# OpenAI API (可选)
OPENAI_API_KEY=your_openai_api_key
```

### 2. 创建真实的AI决策网关实现

创建新的 `src/lib/aiDecisionGatewayReal.ts：

```typescript
import OpenAI from 'openai';
import { Model, Stock, Order } from '@/types';

const MIN_SHARES = 100;

export interface AIDecision {
  thought: string;
  orders: Order[];
}

// 模型配置
const MODEL_CONFIGS = {
  'deepvalue: {
    provider: 'doubao',
    model: 'ep-202412052xxxxxx',
    systemPrompt: `你是一个专业的价值投资分析师。你的任务是基于当前市场数据和持仓情况，做出投资决策。

要求：
1. 只输出JSON格式，不要其他文字
2. JSON格式如下：
{
  "thought": "你的思考过程",
  "orders": [
    {
      "symbol": "股票代码",
      "type": "buy/sell",
      "shares": 数量,
      "priceType": "market"
    }
  ]
}
3. 买入数量必须是100的整数倍
4. 卖出不能超过持仓数量
5. 考虑T+1规则`
  },
  momentum: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    systemPrompt: '你是一个动量交易策略专家...'
  }
};

export async function generateRealAIDecision(
  model: Model,
  stocks: Stock[]
): Promise<AIDecision> {
  const config = MODEL_CONFIGS[model.strategyType] || MODEL_CONFIGS.deepvalue;
  
  // 构建市场数据上下文
  const marketContext = stocks.map(s => `${s.symbol} ${s.name} - 价格:${s.price} 涨跌幅:${s.changePercent}%`).join('\n');
  
  const positionsContext = model.positions.map(p => 
    `${p.symbol} - 持仓:${p.shares}股 成本:${p.avgPrice} 现价:${p.currentPrice} 盈亏:${p.unrealizedPnLPercent}%`
  ).join('\n');

  const userPrompt = `
当前时间: ${new Date().toLocaleString('zh-CN')}

账户情况：
- 现金: ¥${model.cash.toFixed(2)}
- 总资产: ¥${model.totalValue.toFixed(2)}

当前持仓：
${positionsContext || '无持仓'}

市场行情：
${marketContext}

请做出交易决策。`;

  try {
    const client = createClient(config.provider);
    
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content || '';
    
    // 解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const decision = JSON.parse(jsonMatch[0]);
      return decision as AIDecision;
    }
    
    return { thought: content, orders: [] };
    
  } catch (error) {
    console.error('AI决策失败:', error);
    return { thought: 'AI服务暂时不可用', orders: [] };
  }
}

function createClient(provider: string) {
  switch (provider) {
    case 'doubao':
      return new OpenAI({
        apiKey: process.env.DOUBAO_API_KEY,
        baseURL: process.env.DOUBAO_BASE_URL
      });
    case 'deepseek':
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL
      });
    default:
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}
```

### 3. API Route实现

创建 `src/app/api/trade/route.ts：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateRealAIDecision } from '@/lib/aiDecisionGatewayReal';
import { validateOrder, executeOrder } from '@/lib/tradeEngine';

export async function POST(request: NextRequest) {
  try {
    const { model, stocks, heldSince } = await request.json();
    
    const decision = await generateRealAIDecision(model, stocks);
    
    let updatedModel = { ...model, lastThought: decision.thought };
    
    for (const order of decision.orders) {
      const validation = validateOrder(order, updatedModel, stocks, heldSince);
      if (validation.valid) {
        const result = executeOrder(order, updatedModel, stocks, heldSince);
        updatedModel = result.model;
      }
    }
    
    return NextResponse.json({ model: updatedModel, decision });
  } catch (error) {
    return NextResponse.json(
      { error: '交易执行失败' },
      { status: 500 }
    );
  }
}
```

---

## 定时任务实现

### 方案一：Vercel Cron Jobs（推荐）

在 `vercel.json` 中配置：

```json
{
  "crons": [
    {
      "path": "/api/cron/trade",
      "schedule": "30 9 * * 1-5"
    },
    {
      "path": "/api/cron/trade",
      "schedule": "30 10 * * 1-5"
    },
    {
      "path": "/api/cron/trade",
      "schedule": "30 11 * * 1-5"
    },
    {
      "path": "/api/cron/trade",
      "schedule": "0 13 * * 1-5"
    },
    {
      "path": "/api/cron/trade",
      "schedule": "0 14 * * 1-5"
    },
    {
      "path": "/api/cron/trade",
      "schedule": "30 14 * * 1-5"
    }
  ]
}
```

创建 `src/app/api/cron/trade/route.ts`：

```typescript
import { NextResponse } from 'next/server';
import { initialStocks, initialModels } from '@/lib/data';
import { updatePositions, recordNAV, validateOrder, executeOrder } from '@/lib/tradeEngine';
import { generateRealAIDecision } from '@/lib/aiDecisionGatewayReal';

// 使用数据库连接（示例用Upstash Redis或Supabase）
// import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // 1. 获取真实市场数据
    // const marketData = await fetchStockData();
    
    // 2. 从数据库读取当前状态
    // const { data = await supabase.from('game_state').select('*').single();
    
    // 3. 为每个模型执行AI决策
    const heldSince = new Map();
    const updatedModels = [];
    
    for (const model of initialModels) {
      const decision = await generateRealAIDecision(model, initialStocks);
      let updatedModel = { ...model, lastThought: decision.thought };
      
      for (const order of decision.orders) {
        const validation = validateOrder(order, updatedModel, initialStocks, heldSince);
        if (validation.valid) {
          const result = executeOrder(order, updatedModel, initialStocks, heldSince);
          updatedModel = result.model;
        }
      }
      
      updatedModels.push(updatedModel);
    }
    
    // 4. 保存到数据库
    // await supabase.from('models').upsert(updatedModels);
    
    return NextResponse.json({ success: true, models: updatedModels });
  } catch (error) {
    console.error('定时任务失败:', error);
    return NextResponse.json(
      { error: '定时任务执行失败' },
      { status: 500 }
    );
  }
}
```

### 方案二：GitHub Actions

创建 `.github/workflows/trade.yml`：

```yaml
name: AI Trading Bot

on:
  schedule:
    - cron: '30 1 * * 1-5'   # 09:30 北京时间
    - cron: '30 2 * * 1-5'   # 10:30
    - cron: '30 3 * * 1-5'   # 11:30
    - cron: '0 5 * * 1-5'    # 13:00
    - cron: '0 6 * * 1-5'    # 14:00
    - cron: '30 6 * * 1-5'    # 14:30

jobs:
  trade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: node scripts/run-trade.js
        env:
          DOUBAO_API_KEY: ${{ secrets.DOUBAO_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

### 方案三：自建服务器 + node-cron

创建 `scripts/trade-cron.js`：

```javascript
import cron from 'node-cron';
import { generateRealAIDecision } from '../src/lib/aiDecisionGatewayReal.js';

// 交易时间配置
const tradingTimes = [
  '30 9 * * 1-5',   // 09:30
  '30 10 * * 1-5',  // 10:30
  '30 11 * * 1-5',  // 11:30
  '0 13 * * 1-5',   // 13:00
  '0 14 * * 1-5',    // 14:00
  '30 14 * * 1-5',   // 14:30
];

tradingTimes.forEach(time => {
  cron.schedule(time, async () => {
    console.log('触发交易:', new Date().toLocaleString('zh-CN'));
    await executeTradingSession();
  }, {
    timezone: 'Asia/Shanghai'
  });
});

console.log('定时任务已启动，等待交易时间...');
```

---

## 部署方案

### 推荐方案：Vercel + Supabase

#### 1. 数据库设置（Supabase）

创建表结构：

```sql
-- 游戏状态表
CREATE TABLE game_state (
  id SERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  current_day INTEGER NOT NULL DEFAULT 1,
  current_session VARCHAR(10) NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 模型表
CREATE TABLE models (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar VARCHAR(10),
  strategy_type VARCHAR(20) NOT NULL,
  initial_cash DECIMAL(15,2) NOT NULL,
  cash DECIMAL(15,2) NOT NULL,
  total_value DECIMAL(15,2) NOT NULL,
  return_percent DECIMAL(10,4) NOT NULL,
  win_rate DECIMAL(10,4),
  total_trades INTEGER DEFAULT 0,
  last_thought TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 持仓表
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id),
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  shares INTEGER NOT NULL,
  avg_price DECIMAL(15,2) NOT NULL,
  current_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE trades (
  id VARCHAR(100) PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id),
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL,
  shares INTEGER NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  pnl DECIMAL(15,2),
  pnl_percent DECIMAL(10,4),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- NAV历史表
CREATE TABLE nav_history (
  id SERIAL PRIMARY KEY,
  model_id VARCHAR(50) REFERENCES models(id),
  date VARCHAR(20) NOT NULL,
  nav DECIMAL(15,4) NOT NULL,
  return_percent DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. 部署步骤

1. **部署到Vercel：
```bash
npm install -g vercel
vercel login
vercel
```

2. **设置环境变量**：
在Vercel Dashboard → Settings → Environment Variables中添加：
- `DOUBAO_API_KEY`
- `DEEPSEEK_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

3. **配置Cron Jobs**（Vercel Pro计划支持

---

## 获取真实市场数据

### 接入东方财富/新浪财经（免费）

```typescript
// src/lib/marketData.ts
export async function fetchCNStockData(symbols: string[]) {
  const data = [];
  for (const symbol of symbols) {
    // 这里可以接入真实的A股数据源
    // 例如：Tushare、AkShare、或付费API
  }
  return data;
}
```

### 推荐数据源：
- **Tushare**（免费）
- **AkShare**（免费，Python）
- **聚宽**（部分免费）
- **Wind**（付费）
- **东方财富API**（部分免费）

---

## 完整架构图

```
┌─────────────────┐
│   定时触发器      │ (Vercel Cron / GitHub Actions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  获取市场数据API   │ (A股数据源
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI决策网关      │ (调用豆包/DeepSeek)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   交易引擎       │ (验证+执行订单)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase DB   │ (持久化存储)
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Next.js 前端   │ (数据展示)
└─────────────────┘
```
