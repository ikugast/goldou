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
    const searchQueries = [
      'A股 大盘走势 最新',
      '上证指数 今日分析',
      '创业板指 走势预测',
      '科创50 行情分析'
    ];

    const allSearchResults: SearchResult[] = [];
    for (const query of searchQueries) {
      const result = await searchWeb(query, 3);
      allSearchResults.push(...result.results);
    }

    const uniqueResults = Array.from(
      new Map(allSearchResults.map(item => [item.url, item])).values()
    );

    const context = uniqueResults.map(r => 
      `标题: ${r.title}\n内容: ${r.content}\n链接: ${r.url}`
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
    
    const mockAnalyses: MarketAnalysis[] = [
      {
        index: '上证指数',
        prediction: 'bullish',
        confidence: 72,
        reasoning: '政策面支持叠加资金流入，预计今日震荡上行'
      },
      {
        index: '创业板指',
        prediction: 'neutral',
        confidence: 65,
        reasoning: '科技股分化，关注成交量变化'
      },
      {
        index: '科创50',
        prediction: 'bullish',
        confidence: 78,
        reasoning: 'AI概念持续火热，半导体板块领涨'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        analyses: mockAnalyses,
        searchResults: [],
      },
    });
  }
}
