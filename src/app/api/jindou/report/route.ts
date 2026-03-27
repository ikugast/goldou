import { NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/lib/search';
import { callLLMWithJSON } from '@/lib/llm';

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

export async function POST(request: Request): Promise<NextResponse<ReportResponse>> {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({
        success: false,
        error: '请提供股票代码或名称',
      }, { status: 400 });
    }

    console.log('='.repeat(50));
    console.log('正在生成研报，查询:', query);
    console.log('环境变量检查:');
    console.log('- DOUBAO_API_KEY:', process.env.DOUBAO_API_KEY ? '已配置' : '未配置');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '已配置' : '未配置');
    console.log('- DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置');
    console.log('- TAVILY_API_KEY:', process.env.TAVILY_API_KEY ? '已配置' : '未配置');
    console.log('- WEB_SEARCH_API_KEY:', process.env.WEB_SEARCH_API_KEY ? '已配置' : '未配置');
    console.log('- SERPAPI_KEY:', process.env.SERPAPI_KEY ? '已配置' : '未配置');
    console.log('='.repeat(50));

    const hasLLMKey = process.env.DOUBAO_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!hasLLMKey) {
      return NextResponse.json({
        success: false,
        error: '未配置LLM API密钥，请在Vercel环境变量中配置DOUBAO_API_KEY、OPENAI_API_KEY或DEEPSEEK_API_KEY',
      }, { status: 500 });
    }

    let uniqueResults: SearchResult[] = [];
    
    try {
      const searchQueries = [
        `${query} 股票分析 最新`,
        `${query} 财报 业绩`,
        `${query} 目标价 评级`,
        `${query} 行业分析`
      ];

      console.log('开始搜索，查询:', searchQueries);
      const allSearchResults: SearchResult[] = [];
      for (const q of searchQueries) {
        try {
          const result = await searchWeb(q, 3);
          allSearchResults.push(...result.results);
          console.log(`搜索"${q}"完成，获取${result.results.length}条结果`);
        } catch (searchError) {
          console.warn('搜索查询失败:', q, searchError);
        }
      }

      uniqueResults = Array.from(
        new Map(allSearchResults.map(item => [item.url, item])).values()
      );
      console.log('去重后搜索结果数量:', uniqueResults.length);
    } catch (searchError) {
      console.error('搜索API失败:', searchError);
    }

    const cleanText = (text: string) => {
      return text.replace(/[^\x00-\xFF]/g, '').replace(/\s+/g, ' ').trim();
    };
    
    console.log('开始调用LLM生成研报...');
    const context = uniqueResults.length > 0 
      ? uniqueResults.map(r => `标题: ${cleanText(r.title)}\n内容: ${cleanText(r.content)}\n链接: ${r.url}`).join('\n\n')
      : '暂无最新资讯，请基于一般情况生成研报。';

    const systemPrompt = `你是一个专业的股票分析师。请基于提供的最新资讯，为指定股票生成一份标准化的分析研报。

请输出以下JSON格式：
{
  "symbol": "股票代码",
  "name": "股票名称",
  "rating": "buy|hold|sell",
  "targetPrice": 目标价数字,
  "currentPrice": 当前价格数字,
  "upside": 涨跌幅百分比（正数表示上涨空间）,
  "summary": "投资摘要（200字左右）",
  "pros": ["看多理由1", "看多理由2", "看多理由3"],
  "cons": ["风险提示1", "风险提示2", "风险提示3"],
  "financials": {
    "revenue": 营业收入（亿元）,
    "revenueGrowth": 营收增长率百分比,
    "netProfit": 净利润（亿元）,
    "profitGrowth": 净利润增长率百分比,
    "pe": 市盈率,
    "pb": 市净率
  }
}`;

    const userPrompt = `当前时间: ${new Date().toLocaleDateString('zh-CN')}

股票查询: ${query}

以下是最新的相关资讯：
${context}

请基于以上信息，为该股票生成一份标准化的分析研报。如果资讯中没有具体的财务数据，请使用合理的估算值。`;

    const report = await callLLMWithJSON<ReportData>(userPrompt, {
      provider: 'doubao',
      systemPrompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    console.log('LLM研报生成成功:', report?.name);

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
    console.error('金豆研报API错误:', error);
    return NextResponse.json({
      success: false,
      error: `生成研报失败: ${error instanceof Error ? error.message : '未知错误'}，请稍后重试`,
    }, { status: 500 });
  }
}


