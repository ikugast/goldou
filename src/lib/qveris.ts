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

const QVERIS_BASE_URL = 'https://api.qveris.ai';

async function callQverisAPI(endpoint: string, params: Record<string, any> = {}) {
  const apiKey = process.env.QVERIS_API_KEY;
  
  if (!apiKey) {
    throw new Error('QVERIS_API_KEY not configured');
  }

  const url = new URL(`${QVERIS_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value.toString());
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Qveris API error: ${response.status}`);
  }

  return await response.json();
}

export async function getStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const data = await callQverisAPI('/stock/quote', { symbol });
    
    return {
      symbol: data.symbol || symbol,
      name: data.name || '',
      price: data.price || 0,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      high: data.high || 0,
      low: data.low || 0,
      open: data.open || 0,
      volume: data.volume || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('获取股票行情失败:', error);
    throw error;
  }
}

export async function getIndexQuotes(): Promise<IndexQuote[]> {
  try {
    const indices = ['000001.SH', '399006.SZ', '000688.SH'];
    const quotes: IndexQuote[] = [];

    for (const symbol of indices) {
      try {
        const data = await callQverisAPI('/stock/quote', { symbol });
        
        let name = '';
        if (symbol === '000001.SH') name = '上证指数';
        else if (symbol === '399006.SZ') name = '创业板指';
        else if (symbol === '000688.SH') name = '科创50';

        quotes.push({
          name,
          symbol: data.symbol || symbol,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn(`获取指数${symbol}行情失败:`, error);
      }
    }

    return quotes;
  } catch (error) {
    console.error('获取指数行情失败:', error);
    throw error;
  }
}

export async function getStockFinancials(symbol: string): Promise<StockFinancial> {
  try {
    const data = await callQverisAPI('/stock/financials', { symbol });
    
    return {
      revenue: data.revenue || 0,
      revenueGrowth: data.revenueGrowth || 0,
      netProfit: data.netProfit || 0,
      profitGrowth: data.profitGrowth || 0,
      pe: data.pe || 0,
      pb: data.pb || 0,
    };
  } catch (error) {
    console.error('获取股票财务数据失败:', error);
    throw error;
  }
}

export async function getMarketNews(): Promise<any[]> {
  try {
    const data = await callQverisAPI('/market/news');
    return data.news || [];
  } catch (error) {
    console.error('获取市场新闻失败:', error);
    throw error;
  }
}
