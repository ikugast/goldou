import { NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/lib/search';
import { callLLMWithJSON } from '@/lib/llm';

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
  };
  error?: string;
}

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
      'A股 大盘走势 最新',
      '上证指数 今日分析',
      '创业板指 走势预测',
      '科创50 行情分析'
    ];

    const allSearchResults: SearchResult[] = [];
    for (const query of searchQueries) {
      try {
        const result = await searchWeb(query, 3);
        allSearchResults.push(...result.results);
      } catch (searchError) {
        console.warn('搜索查询失败:', query, searchError);
      }
    }

    const uniqueResults = Array.from(
      new Map(allSearchResults.map(item => [item.url, item])).values()
    );

    const cleanText = (text: string) => {
      return text.replace(/[^\x00-\xFF]/g, '').replace(/\s+/g, ' ').trim();
    };
    
    const context = uniqueResults.map(r => 
      `标题: ${cleanText(r.title)}\n内容: ${cleanText(r.content)}\n链接: ${r.url}`
    ).join('\n\n');

    const systemPrompt = `你是一个专业的A股市场分析师。请基于提供的最新财经资讯，对上证指数、创业板指、科创50三个指数进行今日走势预判。

请输出以下JSON格式：
{
  "analyses": [
    {
      "index": "上证指数",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100的数字,
      "reasoning": "详细的分析理由"
    },
    {
      "index": "创业板指",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100的数字,
      "reasoning": "详细的分析理由"
    },
    {
      "index": "科创50",
      "prediction": "bullish|bearish|neutral",
      "confidence": 0-100的数字,
      "reasoning": "详细的分析理由"
    }
  ]
}`;

    const userPrompt = `当前时间: ${new Date().toLocaleDateString('zh-CN')}

以下是最新的市场资讯：
${context}

请基于以上信息，对上证指数、创业板指、科创50三个指数进行今日走势预判。`;

    const result = await callLLMWithJSON<{ analyses: MarketAnalysis[] }>(userPrompt, {
      provider: 'doubao',
      systemPrompt,
      temperature: 0.3,
      maxTokens: 1500,
    });

    return NextResponse.json({
      success: true,
      data: {
        analyses: result.analyses,
        searchResults: uniqueResults,
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
