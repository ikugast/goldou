import { NextResponse } from 'next/server';
import { searchWeb, SearchResult } from '@/lib/search';
import { callLLMWithJSON } from '@/lib/llm';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: number;
  timestamp: string;
}

interface NewsResponse {
  success: boolean;
  data?: {
    news: NewsItem[];
    searchResults: SearchResult[];
  };
  error?: string;
}

export async function POST(): Promise<NextResponse<NewsResponse>> {
  try {
    const apiKey = process.env.TAVILY_API_KEY || process.env.SERPAPI_KEY || process.env.WEB_SEARCH_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '未配置搜索API密钥，请在环境变量中配置TAVILY_API_KEY、SERPAPI_KEY或WEB_SEARCH_API_KEY',
      }, { status: 500 });
    }

    const searchQueries = [
      '今日财经要闻 最新',
      'A股市场 重要新闻',
      '宏观经济 政策动态',
      '行业资讯 热点事件'
    ];

    console.log('开始搜索财经资讯，查询:', searchQueries);

    const allSearchResults: SearchResult[] = [];
    for (const query of searchQueries) {
      try {
        const result = await searchWeb(query, 4);
        allSearchResults.push(...result.results);
        console.log(`搜索"${query}"完成，获得${result.results.length}条结果`);
      } catch (searchError) {
        console.warn('搜索查询失败:', query, searchError);
      }
    }

    const uniqueResults = Array.from(
      new Map(allSearchResults.map(item => [item.url, item])).values()
    );

    console.log('去重后结果数量:', uniqueResults.length);

    if (uniqueResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: '未能获取到最新财经资讯，请稍后重试',
      }, { status: 500 });
    }

    const news: NewsItem[] = uniqueResults.slice(0, 8).map((r, i) => ({
      id: `news-${i}`,
      title: r.title,
      content: r.content.substring(0, 150) + (r.content.length > 150 ? '...' : ''),
      source: r.url.split('/')[2] || '网络',
      url: r.url,
      sentiment: 'neutral' as const,
      importance: Math.floor(Math.random() * 5) + 5,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        news,
        searchResults: uniqueResults,
      },
    });
  } catch (error) {
    console.error('金豆财讯API错误:', error);
    return NextResponse.json({
      success: false,
      error: `获取财讯失败: ${error instanceof Error ? error.message : '未知错误'}，请稍后重试`,
    }, { status: 500 });
  }
}
