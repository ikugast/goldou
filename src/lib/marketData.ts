import { Stock } from '@/types';

export async function fetchCNStockData(symbols: string[]): Promise<Stock[]> {
  try {
    const stocks: Stock[] = [];
    
    for (const symbol of symbols) {
      const stock = await fetchSingleStock(symbol);
      if (stock) {
        stocks.push(stock);
      }
    }
    
    return stocks;
  } catch (error) {
    console.error('获取A股数据失败:', error);
    return getMockCNStockData();
  }
}

async function fetchSingleStock(symbol: string): Promise<Stock | null> {
  try {
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=1.${symbol}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f169,f170,f171,f177,f127`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.data) return null;
    
    const d = data.data;
    const price = d.f43 / 100;
    const prevClose = d.f46 / 100;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    
    return {
      symbol: symbol,
      name: d.f58,
      price: price,
      change: change,
      changePercent: changePercent,
      open: d.f46 / 100,
      high: d.f44 / 100,
      low: d.f45 / 100,
      volume: d.f47,
    };
  } catch (error) {
    console.error(`获取股票 ${symbol} 数据失败:`, error);
    return null;
  }
}

function getMockCNStockData(): Stock[] {
  return [
    { 
      symbol: '600519', 
      name: '贵州茅台', 
      price: 1688.00, 
      change: 25.50, 
      changePercent: 1.53,
      open: 1662.50,
      high: 1695.00,
      low: 1658.00,
      volume: 2340000
    },
    { 
      symbol: '601318', 
      name: '中国平安', 
      price: 45.80, 
      change: -0.80, 
      changePercent: -1.72,
      open: 46.60,
      high: 47.10,
      low: 45.50,
      volume: 56780000
    },
    { 
      symbol: '000858', 
      name: '五粮液', 
      price: 142.50, 
      change: 3.20, 
      changePercent: 2.30,
      open: 139.30,
      high: 143.80,
      low: 138.50,
      volume: 34560000
    },
    { 
      symbol: '600036', 
      name: '招商银行', 
      price: 32.80, 
      change: 0.50, 
      changePercent: 1.54,
      open: 32.30,
      high: 33.10,
      low: 32.10,
      volume: 45670000
    },
    { 
      symbol: '000333', 
      name: '美的集团', 
      price: 58.60, 
      change: -1.20, 
      changePercent: -2.00,
      open: 59.80,
      high: 60.20,
      low: 58.20,
      volume: 28900000
    },
    { 
      symbol: '600900', 
      name: '长江电力', 
      price: 28.50, 
      change: 0.30, 
      changePercent: 1.06,
      open: 28.20,
      high: 28.80,
      low: 28.00,
      volume: 32100000
    },
    { 
      symbol: '002594', 
      name: '比亚迪', 
      price: 235.80, 
      change: 8.50, 
      changePercent: 3.74,
      open: 227.30,
      high: 238.50,
      low: 225.80,
      volume: 67890000
    },
    { 
      symbol: '601899', 
      name: '紫金矿业', 
      price: 15.20, 
      change: -0.30, 
      changePercent: -1.94,
      open: 15.50,
      high: 15.70,
      low: 15.00,
      volume: 89010000
    },
  ];
}

export const defaultSymbols = [
  '600519', '601318', '000858', '600036',
  '000333', '600900', '002594', '601899'
];
