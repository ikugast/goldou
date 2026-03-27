import { Model, Stock, Order, Trade } from '@/types';

const INITIAL_CASH = 1000000;
const MIN_SHARES = 100;
const SHARE_MULTIPLE = 100;

export const validateOrder = (
  order: Order,
  model: Model,
  stocks: Stock[],
  heldSince: Map<string, Date> = new Map()
): { valid: boolean; reason?: string } => {
  const stock = stocks.find(s => s.symbol === order.symbol);
  if (!stock) {
    return { valid: false, reason: `股票 ${order.symbol} 不存在` };
  }

  if (order.type === 'buy') {
    if (order.shares < MIN_SHARES) {
      return { valid: false, reason: `最少买入 ${MIN_SHARES} 股` };
    }
    if (order.shares % SHARE_MULTIPLE !== 0) {
      return { valid: false, reason: `买入数量必须是 ${SHARE_MULTIPLE} 的整数倍` };
    }

    const executionPrice = order.priceType === 'limit' && order.limitPrice 
      ? order.limitPrice 
      : stock.price;
    const totalCost = order.shares * executionPrice;

    if (totalCost > model.cash) {
      return { valid: false, reason: '可用资金不足' };
    }
  } else if (order.type === 'sell') {
    const position = model.positions.find(p => p.symbol === order.symbol);
    if (!position) {
      return { valid: false, reason: `未持有 ${order.symbol}` };
    }
    if (order.shares > position.shares) {
      return { valid: false, reason: `持仓不足，当前持有 ${position.shares} 股` };
    }
    if (order.shares % SHARE_MULTIPLE !== 0 && order.shares !== position.shares) {
      return { valid: false, reason: `卖出数量必须是 ${SHARE_MULTIPLE} 的整数倍或全部清仓` };
    }

    const heldDate = heldSince.get(order.symbol);
    if (heldDate) {
      const now = new Date();
      const daysHeld = (now.getTime() - heldDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysHeld < 1) {
        return { valid: false, reason: 'T+1 限制，今日买入的股票不可卖出' };
      }
    }
  }

  return { valid: true };
};

export const executeOrder = (
  order: Order,
  model: Model,
  stocks: Stock[],
  heldSince: Map<string, Date>
): { model: Model; trade: Trade; heldSince: Map<string, Date> } => {
  const stock = stocks.find(s => s.symbol === order.symbol)!;
  const executionPrice = order.priceType === 'limit' && order.limitPrice 
    ? order.limitPrice 
    : stock.price;
  const tradeAmount = order.shares * executionPrice;

  let newCash = model.cash;
  let newPositions = [...model.positions];
  const newHeldSince = new Map(heldSince);
  let pnl: number | undefined;
  let pnlPercent: number | undefined;

  if (order.type === 'buy') {
    newCash -= tradeAmount;
    
    const existingPosition = newPositions.find(p => p.symbol === order.symbol);
    if (existingPosition) {
      const totalShares = existingPosition.shares + order.shares;
      const totalCost = existingPosition.costBasis + tradeAmount;
      const newAvgPrice = totalCost / totalShares;
      
      newPositions = newPositions.map(p => 
        p.symbol === order.symbol 
          ? {
              ...p,
              shares: totalShares,
              avgPrice: newAvgPrice,
              costBasis: totalCost,
              currentPrice: executionPrice,
              marketValue: totalShares * executionPrice,
              unrealizedPnL: (executionPrice - newAvgPrice) * totalShares,
              unrealizedPnLPercent: ((executionPrice - newAvgPrice) / newAvgPrice) * 100,
            }
          : p
      );
    } else {
      newPositions.push({
        symbol: order.symbol,
        name: stock.name,
        shares: order.shares,
        avgPrice: executionPrice,
        currentPrice: executionPrice,
        costBasis: tradeAmount,
        marketValue: tradeAmount,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
      });
    }
    newHeldSince.set(order.symbol, new Date());
  } else if (order.type === 'sell') {
    newCash += tradeAmount;
    
    const existingPosition = newPositions.find(p => p.symbol === order.symbol)!;
    pnl = (executionPrice - existingPosition.avgPrice) * order.shares;
    pnlPercent = ((executionPrice - existingPosition.avgPrice) / existingPosition.avgPrice) * 100;
    
    if (order.shares === existingPosition.shares) {
      newPositions = newPositions.filter(p => p.symbol !== order.symbol);
      newHeldSince.delete(order.symbol);
    } else {
      const remainingShares = existingPosition.shares - order.shares;
      newPositions = newPositions.map(p => 
        p.symbol === order.symbol 
          ? {
              ...p,
              shares: remainingShares,
              costBasis: p.avgPrice * remainingShares,
              marketValue: remainingShares * executionPrice,
              unrealizedPnL: (executionPrice - p.avgPrice) * remainingShares,
              unrealizedPnLPercent: ((executionPrice - p.avgPrice) / p.avgPrice) * 100,
            }
          : p
      );
    }
  }

  const positionsValue = newPositions.reduce((sum, pos) => sum + pos.shares * pos.currentPrice, 0);
  const totalValue = newCash + positionsValue;
  const returnPercent = ((totalValue - INITIAL_CASH) / INITIAL_CASH) * 100;

  const trade: Trade = {
    id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    symbol: order.symbol,
    name: stock.name,
    type: order.type,
    shares: order.shares,
    price: executionPrice,
    amount: tradeAmount,
    timestamp: new Date(),
    pnl,
    pnlPercent,
  };

  const winningTrades = model.trades.filter(t => t.pnl && t.pnl > 0).length + (pnl && pnl > 0 ? 1 : 0);
  const totalTrades = model.trades.length + 1;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const updatedModel: Model = {
    ...model,
    cash: newCash,
    positions: newPositions,
    trades: [...model.trades, trade],
    totalValue: parseFloat(totalValue.toFixed(2)),
    returnPercent: parseFloat(returnPercent.toFixed(2)),
    totalTrades,
    winRate: parseFloat(winRate.toFixed(2)),
  };

  return { model: updatedModel, trade, heldSince: newHeldSince };
};

export const updatePositions = (model: Model, stocks: Stock[]): Model => {
  const updatedPositions = model.positions.map(pos => {
    const stock = stocks.find(s => s.symbol === pos.symbol);
    const currentPrice = stock ? stock.price : pos.currentPrice;
    const marketValue = pos.shares * currentPrice;
    const unrealizedPnL = (currentPrice - pos.avgPrice) * pos.shares;
    const unrealizedPnLPercent = ((currentPrice - pos.avgPrice) / pos.avgPrice) * 100;

    return {
      ...pos,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  });

  const positionsValue = updatedPositions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalValue = model.cash + positionsValue;
  const returnPercent = ((totalValue - INITIAL_CASH) / INITIAL_CASH) * 100;

  return {
    ...model,
    positions: updatedPositions,
    totalValue: parseFloat(totalValue.toFixed(2)),
    returnPercent: parseFloat(returnPercent.toFixed(2)),
  };
};

export const recordNAV = (model: Model, day: number): Model => {
  const newNAVHistory = [...model.navHistory, {
    date: `Day ${day}`,
    nav: model.totalValue / INITIAL_CASH * 100,
    returnPercent: model.returnPercent,
  }];

  return {
    ...model,
    navHistory: newNAVHistory,
  };
};
