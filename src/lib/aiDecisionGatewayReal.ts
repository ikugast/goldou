import OpenAI from 'openai';
import { Model, Stock, Order } from '@/types';

const MIN_SHARES = 100;

export interface AIDecision {
  thought: string;
  orders: Order[];
}

const MODEL_CONFIGS = {
  value: {
    provider: 'doubao' as const,
    model: process.env.DOUBAO_MODEL || 'doubao-pro-32k',
    systemPrompt: `你是一个专业的价值投资分析师，专注于A股市场投资。你的任务是基于当前市场数据和持仓情况，做出理性的投资决策。

要求：
1. 只输出JSON格式，不要任何其他文字或markdown标记
2. JSON格式如下：
{
  "thought": "你的详细思考过程，分析市场和持仓",
  "orders": [
    {
      "symbol": "股票代码，如600519",
      "type": "buy或sell",
      "shares": 数量（必须是100的整数倍）,
      "priceType": "market"
    }
  ]
}
3. 买入数量必须是100的整数倍
4. 卖出不能超过当前持仓数量
5. 严格遵守A股T+1交易规则（当日买入的股票当日不可卖出）
6. 每笔交易要考虑资金充足性
7. 控制单只股票仓位不超过总资产的30%
8. 价值投资理念：寻找被低估、有安全边际的股票`
  },
  momentum: {
    provider: 'deepseek' as const,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    systemPrompt: `你是一个专业的动量交易策略专家，专注于A股市场。你的任务是追踪市场趋势，追涨杀跌。

要求：
1. 只输出JSON格式，不要任何其他文字
2. JSON格式如下：
{
  "thought": "分析市场动量和趋势",
  "orders": [
    {
      "symbol": "股票代码",
      "type": "buy或sell",
      "shares": 数量,
      "priceType": "market"
    }
  ]
}
3. 买入数量必须是100的整数倍
4. 卖出不能超过持仓数量
5. 买入上涨趋势明确的股票
6. 快速止损，严格控制亏损
7. 遵守T+1规则`
  },
  quant: {
    provider: 'doubao' as const,
    model: process.env.DOUBAO_MODEL || 'doubao-pro-32k',
    systemPrompt: `你是一个量化分析师，使用多因子模型进行A股投资决策。

要求：
1. 只输出JSON格式
2. JSON格式：
{
  "thought": "量化分析过程",
  "orders": [
    {
      "symbol": "股票代码",
      "type": "buy/sell",
      "shares": 数量,
      "priceType": "market"
    }
  ]
}
3. 数量必须是100的整数倍
4. 考虑多因子：动量、估值、质量、流动性等
5. 分散投资，单只股票不超过20%仓位
6. 遵守T+1交易规则`
  },
  risk: {
    provider: 'deepseek' as const,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    systemPrompt: `你是一个风险控制优先的投资经理，专注于A股市场的稳健投资。

要求：
1. 只输出JSON格式
2. JSON格式：
{
  "thought": "风险评估和分析",
  "orders": [
    {
      "symbol": "股票代码",
      "type": "buy/sell",
      "shares": 数量,
      "priceType": "market"
    }
  ]
}
3. 数量必须是100的整数倍
4. 保持至少40%的现金储备
5. 优先选择低波动、高分红的蓝筹股
6. 单只股票仓位不超过15%
7. 及时止盈止损
8. 遵守T+1规则`
  }
};

export async function generateRealAIDecision(
  model: Model,
  stocks: Stock[]
): Promise<AIDecision> {
  const config = MODEL_CONFIGS[model.strategyType] || MODEL_CONFIGS.value;
  
  const marketContext = stocks.map(s => 
    `${s.symbol} ${s.name} - 价格:${s.price.toFixed(2)} 涨跌幅:${s.changePercent.toFixed(2)}% 成交量:${(s.volume / 10000).toFixed(0)}万`
  ).join('\n');
  
  const positionsContext = model.positions.map(p => 
    `${p.symbol} ${p.name} - 持仓:${p.shares}股 成本:${p.avgPrice.toFixed(2)} 现价:${p.currentPrice.toFixed(2)} 盈亏:${p.unrealizedPnLPercent.toFixed(2)}%`
  ).join('\n');

  const userPrompt = `
当前时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

账户情况：
- 策略类型: ${model.strategyType === 'value' ? '价值投资' : model.strategyType === 'momentum' ? '动量交易' : model.strategyType === 'quant' ? '量化分析' : '风险控制'}
- 现金: ¥${model.cash.toFixed(2)}
- 总资产: ¥${model.totalValue.toFixed(2)}
- 总收益率: ${model.returnPercent.toFixed(2)}%

当前持仓：
${positionsContext || '无持仓'}

市场行情（A股）：
${marketContext}

请基于以上信息，做出交易决策。`;

  try {
    const client = createClient(config.provider);
    
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const decision = JSON.parse(jsonMatch[0]);
        return {
          thought: decision.thought || content,
          orders: (decision.orders || []).map((order: any) => ({
            ...order,
            id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            modelId: model.id,
            status: 'pending' as const,
            timestamp: new Date()
          }))
        };
      } catch (e) {
        console.error('JSON解析失败:', e);
      }
    }
    
    return { thought: content, orders: [] };
    
  } catch (error) {
    console.error('AI决策失败:', error);
    return { 
      thought: `AI服务暂时不可用: ${error instanceof Error ? error.message : '未知错误'}`, 
      orders: [] 
    };
  }
}

function createClient(provider: 'doubao' | 'deepseek' | 'openai') {
  switch (provider) {
    case 'doubao':
      return new OpenAI({
        apiKey: process.env.DOUBAO_API_KEY || '',
        baseURL: process.env.DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
      });
    case 'deepseek':
      return new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'
      });
    default:
      return new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || '' 
      });
  }
}
