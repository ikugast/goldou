import { Model, Stock, Order } from '@/types';

const MIN_SHARES = 100;

export interface AIDecision {
  thought: string;
  orders: Order[];
}

export const generateAIDecision = (
  model: Model,
  stocks: Stock[]
): AIDecision => {
  switch (model.strategyType) {
    case 'value':
      return generateValueStrategyDecision(model, stocks);
    case 'momentum':
      return generateMomentumStrategyDecision(model, stocks);
    case 'quant':
      return generateQuantStrategyDecision(model, stocks);
    case 'risk':
      return generateRiskStrategyDecision(model, stocks);
    default:
      return { thought: '等待市场信号', orders: [] };
  }
};

const generateValueStrategyDecision = (model: Model, stocks: Stock[]): AIDecision => {
  const thoughts: string[] = [];
  const orders: Order[] = [];

  thoughts.push('📊 正在分析被低估的价值股...');

  const undervaluedStocks = stocks
    .filter(s => s.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3);

  for (const undervaluedStock of undervaluedStocks) {
    const hasPosition = model.positions.some(p => p.symbol === undervaluedStock.symbol);
    
    if (!hasPosition && model.cash > undervaluedStock.price * MIN_SHARES * 2) {
      const shares = Math.floor((model.cash * 0.15) / undervaluedStock.price / MIN_SHARES) * MIN_SHARES;
      if (shares >= MIN_SHARES) {
        orders.push({
          id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          modelId: model.id,
          symbol: undervaluedStock.symbol,
          type: 'buy',
          shares,
          priceType: 'market',
          status: 'pending',
          timestamp: new Date(),
        });
        thoughts.push(`✅ 发现价值洼地 ${undervaluedStock.symbol}，计划买入 ${shares} 股`);
      }
    }
  }

  for (const position of model.positions) {
    const profitPercent = position.unrealizedPnLPercent;

    if (profitPercent > 15) {
      orders.push({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        modelId: model.id,
        symbol: position.symbol,
        type: 'sell',
        shares: position.shares,
        priceType: 'market',
        status: 'pending',
        timestamp: new Date(),
      });
      thoughts.push(`💰 ${position.symbol} 已获利 ${profitPercent.toFixed(2)}%，止盈卖出`);
    }
  }

  return {
    thought: thoughts.length > 0 ? thoughts.join(' | ') : '当前持仓合理，继续持有观察',
    orders,
  };
};

const generateMomentumStrategyDecision = (model: Model, stocks: Stock[]): AIDecision => {
  const thoughts: string[] = [];
  const orders: Order[] = [];

  thoughts.push('🚀 追踪市场动量，寻找强势股...');

  const topGainers = stocks
    .filter(s => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 2);

  for (const stock of topGainers) {
    const hasPosition = model.positions.some(p => p.symbol === stock.symbol);
    
    if (!hasPosition && model.cash > stock.price * MIN_SHARES * 2) {
      const shares = Math.floor((model.cash * 0.3) / stock.price / MIN_SHARES) * MIN_SHARES;
      if (shares >= MIN_SHARES) {
        orders.push({
          id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          modelId: model.id,
          symbol: stock.symbol,
          type: 'buy',
          shares,
          priceType: 'market',
          status: 'pending',
          timestamp: new Date(),
        });
        thoughts.push(`🔥 ${stock.symbol} 强势上涨 ${stock.changePercent.toFixed(2)}%，追涨买入`);
      }
    }
  }

  for (const position of model.positions) {
    const stock = stocks.find(s => s.symbol === position.symbol)!;
    
    if (stock.changePercent < -5) {
      orders.push({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        modelId: model.id,
        symbol: position.symbol,
        type: 'sell',
        shares: position.shares,
        priceType: 'market',
        status: 'pending',
        timestamp: new Date(),
      });
      thoughts.push(`📉 ${position.symbol} 破位下跌，止损卖出`);
    }
  }

  return {
    thought: thoughts.length > 0 ? thoughts.join(' | ') : '市场动量不明显，等待机会',
    orders,
  };
};

const generateQuantStrategyDecision = (model: Model, stocks: Stock[]): AIDecision => {
  const thoughts: string[] = [];
  const orders: Order[] = [];

  thoughts.push('📈 多因子量化分析中...');

  const sortedStocks = [...stocks].sort((a, b) => {
    const scoreA = a.changePercent + (a.volume / 1000000);
    const scoreB = b.changePercent + (b.volume / 1000000);
    return scoreB - scoreA;
  });

  const targetStocks = sortedStocks.slice(0, 3);
  const currentHoldings = new Set(model.positions.map(p => p.symbol));

  for (const stock of targetStocks) {
    if (!currentHoldings.has(stock.symbol) && model.cash > stock.price * MIN_SHARES) {
      const shares = Math.floor((model.cash * 0.25) / stock.price / MIN_SHARES) * MIN_SHARES;
      if (shares >= MIN_SHARES) {
        orders.push({
          id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          modelId: model.id,
          symbol: stock.symbol,
          type: 'buy',
          shares,
          priceType: 'market',
          status: 'pending',
          timestamp: new Date(),
        });
        thoughts.push(`🔢 ${stock.symbol} 量化评分靠前，建仓`);
      }
    }
  }

  for (const position of model.positions) {
    const rank = sortedStocks.findIndex(s => s.symbol === position.symbol);
    if (rank > 5) {
      orders.push({
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        modelId: model.id,
        symbol: position.symbol,
        type: 'sell',
        shares: position.shares,
        priceType: 'market',
        status: 'pending',
        timestamp: new Date(),
      });
      thoughts.push(`📊 ${position.symbol} 评分下滑，调出组合`);
    }
  }

  return {
    thought: thoughts.length > 0 ? thoughts.join(' | ') : '量化模型显示当前组合最优，无调仓需求',
    orders,
  };
};

const generateRiskStrategyDecision = (model: Model, stocks: Stock[]): AIDecision => {
  const thoughts: string[] = [];
  const orders: Order[] = [];

  thoughts.push('🛡️ 风险优先，评估组合风险...');

  const lowVolatilityStocks = stocks
    .filter(s => Math.abs(s.changePercent) < 2)
    .sort((a, b) => Math.abs(a.changePercent) - Math.abs(b.changePercent))
    .slice(0, 2);

  const cashRatio = model.cash / model.totalValue;

  if (cashRatio < 0.4) {
    for (const position of model.positions) {
      if (Math.abs(position.unrealizedPnLPercent) > 5) {
        const sellShares = Math.floor(position.shares * 0.5 / MIN_SHARES) * MIN_SHARES;
        if (sellShares >= MIN_SHARES) {
          orders.push({
            id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            modelId: model.id,
            symbol: position.symbol,
            type: 'sell',
            shares: sellShares,
            priceType: 'market',
            status: 'pending',
            timestamp: new Date(),
          });
          thoughts.push(`⚖️ 降低 ${position.symbol} 仓位，控制风险`);
        }
      }
    }
  }

  if (cashRatio > 0.5) {
    for (const stock of lowVolatilityStocks) {
      const hasPosition = model.positions.some(p => p.symbol === stock.symbol);
      if (!hasPosition && model.cash > stock.price * MIN_SHARES * 2) {
        const shares = Math.floor((model.cash * 0.15) / stock.price / MIN_SHARES) * MIN_SHARES;
        if (shares >= MIN_SHARES) {
          orders.push({
            id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            modelId: model.id,
            symbol: stock.symbol,
            type: 'buy',
            shares,
            priceType: 'market',
            status: 'pending',
            timestamp: new Date(),
          });
          thoughts.push(`🏦 配置低波动 ${stock.symbol}，分散风险`);
        }
      }
    }
  }

  return {
    thought: thoughts.length > 0 ? thoughts.join(' | ') : `组合风险可控，现金占比 ${(cashRatio * 100).toFixed(1)}%`,
    orders,
  };
};
