export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  timestamp: string;
}

export interface IndexQuote {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface StockFinancial {
  revenue: number;
  revenueGrowth: number;
  netProfit: number;
  profitGrowth: number;
  pe: number;
  pb: number;
}

async function fetchEastMoneyAPI(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`东方财富API错误: ${response.status}`);
  }

  return await response.text();
}

function convertToStockCode(symbol: string): string {
  symbol = symbol.replace(/\.SH$/, '').replace(/\.SZ$/, '');
  
  if (/^60[0-9]{4}$/.test(symbol) || /^688[0-9]{3}$/.test(symbol)) {
    return `1.${symbol}`;
  } else if (/^00[0-9]{4}$/.test(symbol) || /^30[0-9]{4}$/.test(symbol)) {
    return `0.${symbol}`;
  }
  
  return symbol;
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const code = convertToStockCode(symbol);
    const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${code}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58`;
    
    const response = await fetchEastMoneyAPI(url);
    const data = JSON.parse(response);
    
    if (!data.data) {
      throw new Error('无法获取股票数据');
    }
    
    const stock = data.data;
    
    return {
      symbol: symbol,
      name: stock.f58 || '',
      price: stock.f43 || 0,
      change: stock.f169 || 0,
      changePercent: stock.f170 || 0,
      high: stock.f44 || 0,
      low: stock.f45 || 0,
      open: stock.f46 || 0,
      volume: stock.f47 || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取股票行情失败:', error);
    throw error;
  }
}

export async function getIndexQuote(symbol: string): Promise<IndexQuote> {
  try {
    const indexCodes: Record<string, string> = {
      '上证指数': '1.000001',
      'sh': '1.000001',
      '000001': '1.000001',
      '创业板指': '0.399006',
      'cyb': '0.399006',
      '399006': '0.399006',
      '科创50': '1.000688',
      'kc50': '1.000688',
      '000688': '1.000688',
    };
    
    const code = indexCodes[symbol] || symbol;
    const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${code}&fields=f43,f44,f45,f46,f47,f48,f49,f57,f58`;
    
    const response = await fetchEastMoneyAPI(url);
    const data = JSON.parse(response);
    
    if (!data.data) {
      throw new Error('无法获取指数数据');
    }
    
    const index = data.data;
    
    const indexNames: Record<string, string> = {
      '1.000001': '上证指数',
      '0.399006': '创业板指',
      '1.000688': '科创50',
    };
    
    return {
      name: indexNames[code] || index.f58 || symbol,
      symbol: symbol,
      price: index.f43 || 0,
      change: index.f169 || 0,
      changePercent: index.f170 || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取指数行情失败:', error);
    throw error;
  }
}

export async function getStockFinancials(symbol: string): Promise<StockFinancial> {
  try {
    const code = convertToStockCode(symbol);
    const url = `http://push2.eastmoney.com/api/qt/stock/get?secid=${code}&fields=f9,f10,f11,f12,f13,f14`;
    
    const response = await fetchEastMoneyAPI(url);
    const data = JSON.parse(response);
    
    if (!data.data) {
      throw new Error('无法获取财务数据');
    }
    
    const stock = data.data;
    
    return {
      revenue: stock.f9 || 0,
      revenueGrowth: stock.f10 || 0,
      netProfit: stock.f11 || 0,
      profitGrowth: stock.f12 || 0,
      pe: stock.f13 || 0,
      pb: stock.f14 || 0,
    };
  } catch (error) {
    console.error('获取财务数据失败:', error);
    return {
      revenue: 0,
      revenueGrowth: 0,
      netProfit: 0,
      profitGrowth: 0,
      pe: 0,
      pb: 0,
    };
  }
}
