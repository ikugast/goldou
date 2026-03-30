import { NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/lib/search';
import { callLLMWithJSON } from '@/lib/llm';
import { getIndexQuote, IndexQuote } from '@/lib/eastmoney';

interface MarketAnalysis {
  index: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

interface MarketResponse {
  success: boolean;
  data?: {
    analyses: MarketAnalysis[];
    searchResults: SearchResult[];
    indexQuotes: IndexQuote[];
  };
  error?: string;
}

const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .trim();
};

export async function POST(): Promise<NextResponse<MarketResponse>> {
  try {
    const hasLLMKey = process.env.DOUBAO_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!hasLLMKey) {
      return NextResponse.json({
        success: false,
        error: '未配置LLM API密钥，请在Vercel环境变量中配置DOUBAO_API_KEY、OPENAI_API_KEY或DEEPSEEK_API_KEY',
      }, { status: 500 });
    }

    const searchQueries = [
      'A股 大盘走势',
      '上证指数 分析',
      '创业板指 预测',
      '科创50 分析'
    ];

    const allSearchResults: SearchResult[] = [];
    for (const query of searchQueries) {
      try {
        const result = await searchWeb(query, 2);
        allSearchResults.push(...result.results);
      } catch (searchError) {
        console.warn('搜索查询失败:', query, searchError);
      }
    }

    const uniqueResults = Array.from(
      new Map(allSearchResults.map(item => [item.url, item])).values()
    );
    
    const context = uniqueResults.map(r => 
      `标题: ${cleanText(r.title)}\n内容: ${cleanText(r.content)}\nURL: ${r.url}`
    ).join('\n\n');

    const systemPrompt = cleanText(`你是一名专业的A股市场分析师。根据提供的最新财经资讯，请对上证指数、创业板指和科创50指数做出今日走势预测。

请输出以下JSON格式：
{
  "analyses": [
    {
      "index": "上证指数",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100之间的数字,
      "reasoning": "详细分析"
    },
    {
      "index": "创业板指",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100之间的数字,
      "reasoning": "详细分析"
    },
    {
      "index": "科创50",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100之间的数字,
      "reasoning": "详细分析"
    }
  ]
}`);

    const userPrompt = cleanText(`当前时间: ${new Date().toISOString().split('T')[0]}

以下是最新市场资讯：
${context}

根据以上信息，请对上证指数、创业板指和科创50指数做出今日走势预测。`);

    const result = await callLLMWithJSON<{ analyses: MarketAnalysis[] }>(userPrompt, {
      provider: 'doubao',
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const indexQuotes: IndexQuote[] = [];
    const indexSymbols = ['上证指数', '创业板指', '科创50'];
    
    for (const symbol of indexSymbols) {
      try {
        const quote = await getIndexQuote(symbol);
        indexQuotes.push(quote);
        console.log(`获取${symbol}行情成功:`, quote);
      } catch (error) {
        console.warn(`获取${symbol}行情失败:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        analyses: result.analyses,
        searchResults: uniqueResults,
        indexQuotes,
      },
    });
  } catch (error) {
    console.error('金豆看盘API错误:', error);
    return NextResponse.json({
      success: false,
      error: `生成市场分析失败: ${error instanceof Error ? error.message : '未知错误'}，请稍后重试`,
    }, { status: 500 });
  }
}
