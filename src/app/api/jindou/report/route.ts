import { NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/lib/search';
import { callLLMWithJSON } from '@/lib/llm';
import { getStockQuote, getStockFinancials } from '@/lib/qveris';

interface ReportData {
  symbol: string;
  name: string;
  rating: 'buy' | 'hold' | 'sell';
  targetPrice: number;
  currentPrice: number;
  upside: number;
  summary: string;
  pros: string[];
  cons: string[];
  financials: {
    revenue: number;
    revenueGrowth: number;
    netProfit: number;
    profitGrowth: number;
    pe: number;
    pb: number;
  };
  timestamp: string;
}

interface ReportResponse {
  success: boolean;
  data?: {
    report: ReportData;
    searchResults: SearchResult[];
  };
  error?: string;
}

const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .trim();
};

export async function POST(request: Request): Promise<NextResponse<ReportResponse>> {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Please provide stock code or name',
      }, { status: 400 });
    }

    console.log('='.repeat(50));
    console.log('Generating report for:', query);
    console.log('Environment check:');
    console.log('- DOUBAO_API_KEY:', process.env.DOUBAO_API_KEY ? 'Configured' : 'Not configured');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured');
    console.log('- DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? 'Configured' : 'Not configured');
    console.log('='.repeat(50));

    const hasLLMKey = process.env.DOUBAO_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!hasLLMKey) {
      return NextResponse.json({
        success: false,
        error: 'LLM API key not configured. Please configure in Vercel environment variables.',
      }, { status: 500 });
    }

    let uniqueResults: SearchResult[] = [];
    
    try {
      const currentYear = new Date().getFullYear();
      const searchQueries = [
        `${query} A股 股票分析`,
        `${query} 财报 ${currentYear}`,
        `${query} 目标价 评级`,
        `${query} 行业分析`
      ];

      console.log('Starting search with queries:', searchQueries);
      const allSearchResults: SearchResult[] = [];
      for (const q of searchQueries) {
        try {
          const result = await searchWeb(q, 2);
          allSearchResults.push(...result.results);
          console.log(`Search "${q}" completed, got ${result.results.length} results`);
        } catch (searchError) {
          console.warn('Search query failed:', q, searchError);
        }
      }

      uniqueResults = Array.from(
        new Map(allSearchResults.map(item => [item.url, item])).values()
      );
      console.log('Unique search results:', uniqueResults.length);
    } catch (searchError) {
      console.error('Search API failed:', searchError);
    }

    console.log('Starting LLM report generation...');
    const context = uniqueResults.length > 0 
      ? uniqueResults.map(r => `标题: ${cleanText(r.title)}\n内容: ${cleanText(r.content)}\n链接: ${r.url}`).join('\n\n')
      : '暂无最新资讯，请根据常识生成报告。';

    const systemPrompt = cleanText(`你是一名专业的股票分析师。根据提供的最新资讯，仅为用户查询的股票生成标准化分析报告。

重要提示：
1. 你必须只为用户查询中提到的股票生成报告。不要为任何其他股票生成报告。
2. 评级必须与目标价一致：
   - 如果目标价 > 当前价 + 5%，评级应为 "buy"（买入）
   - 如果目标价 < 当前价 - 5%，评级应为 "sell"（卖出）
   - 否则评级应为 "hold"（持有）

请输出以下JSON格式：
{
  "symbol": "股票代码",
  "name": "股票名称",
  "rating": "buy|hold|sell",
  "targetPrice": 目标价数字,
  "currentPrice": 当前价数字,
  "upside": 上涨空间百分比（正数表示上涨空间）,
  "summary": "投资摘要（约200字）",
  "pros": ["看涨理由1", "看涨理由2", "看涨理由3"],
  "cons": ["风险提示1", "风险提示2", "风险提示3"],
  "financials": {
    "revenue": 营业收入（单位：亿元）,
    "revenueGrowth": 营收增长率百分比,
    "netProfit": 净利润（单位：亿元）,
    "profitGrowth": 净利润增长率百分比,
    "pe": 市盈率,
    "pb": 市净率
  }
}`);

    const userPrompt = cleanText(`当前时间: ${new Date().toISOString().split('T')[0]}

关键提示：你必须只为这只股票生成报告："${query}"。不要为任何其他股票（如贵州茅台）或其他公司生成报告。

股票查询: ${query}

以下是最新相关资讯：
${context}

根据以上信息，请仅为股票"${query}"生成标准化分析报告。如果资讯中没有具体财务数据，请使用合理估计。`);

    let stockQuote = null;
    let stockFinancials = null;
    
    try {
      stockQuote = await getStockQuote(query);
      console.log('获取股票行情成功:', stockQuote);
    } catch (error) {
      console.warn('获取股票行情失败，使用LLM生成:', error);
    }
    
    try {
      stockFinancials = await getStockFinancials(query);
      console.log('获取股票财务数据成功:', stockFinancials);
    } catch (error) {
      console.warn('获取股票财务数据失败，使用LLM生成:', error);
    }

    let report = await callLLMWithJSON<ReportData>(userPrompt, {
      provider: 'doubao',
      systemPrompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    console.log('LLM report generation successful:', report?.name);

    if (report) {
      if (stockQuote) {
        report.currentPrice = stockQuote.price;
        report.symbol = stockQuote.symbol;
        report.name = stockQuote.name || report.name;
      }
      
      if (stockFinancials) {
        report.financials = {
          revenue: stockFinancials.revenue,
          revenueGrowth: stockFinancials.revenueGrowth,
          netProfit: stockFinancials.netProfit,
          profitGrowth: stockFinancials.profitGrowth,
          pe: stockFinancials.pe,
          pb: stockFinancials.pb,
        };
      }
      
      const upside = report.targetPrice - report.currentPrice;
      report.upside = (upside / report.currentPrice) * 100;
      
      if (report.upside > 5) {
        report.rating = 'buy';
      } else if (report.upside < -5) {
        report.rating = 'sell';
      } else {
        report.rating = 'hold';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        report: {
          ...report,
          timestamp: new Date().toISOString(),
        },
        searchResults: uniqueResults,
      },
    });
  } catch (error) {
    console.error('Jindou Report API error:', error);
    return NextResponse.json({
      success: false,
      error: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}, please try again later`,
    }, { status: 500 });
  }
}
