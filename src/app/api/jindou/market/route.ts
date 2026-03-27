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

const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\xFF]/g, '')
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
      'A股 market trend',
      'Shanghai Composite Index analysis',
      'ChiNext Index forecast',
      'STAR 50 Index analysis'
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
      `Title: ${cleanText(r.title)}\nContent: ${cleanText(r.content)}\nURL: ${r.url}`
    ).join('\n\n');

    const systemPrompt = cleanText(`You are a professional A-share market analyst. Based on the latest financial news provided, please make today's market trend predictions for the Shanghai Composite Index, ChiNext Index, and STAR 50 Index.

Please output the following JSON format:
{
  "analyses": [
    {
      "index": "Shanghai Composite Index",
      "prediction": "bullish|bearish|neutral",
      "confidence": number between 0-100,
      "reasoning": "detailed analysis"
    },
    {
      "index": "ChiNext Index",
      "prediction": "bullish|bearish|neutral",
      "confidence": number between 0-100,
      "reasoning": "detailed analysis"
    },
    {
      "index": "STAR 50 Index",
      "prediction": "bullish|bearish|neutral",
      "confidence": number between 0-100,
      "reasoning": "detailed analysis"
    }
  ]
}`);

    const userPrompt = cleanText(`Current time: ${new Date().toISOString().split('T')[0]}

Here is the latest market news:
${context}

Based on the above information, please make today's market trend predictions for the Shanghai Composite Index, ChiNext Index, and STAR 50 Index.`);

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
