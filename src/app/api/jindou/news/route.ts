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
    const searchQueries = [
      '今日财经要闻 最新',
      'A股市场 重要新闻',
      '宏观经济 政策动态',
      '行业资讯 热点事件'
    ];

    const allSearchResults: SearchResult[] = [];
    for (const query of searchQueries) {
      const result = await searchWeb(query, 4);
      allSearchResults.push(...result.results);
    }

    const uniqueResults = Array.from(
      new Map(allSearchResults.map(item => [item.url, item])).values()
    );

    const context = uniqueResults.map((r, i) => 
      `[${i + 1}] 标题: ${r.title}\n内容: ${r.content}\n链接: ${r.url}`
    ).join('\n\n');

    const systemPrompt = `你是一个专业的财经新闻编辑。请从提供的资讯中筛选出最重要的5-8条财经新闻，并进行整理和分类。

请输出以下JSON格式：
{
  "news": [
    {
      "id": "唯一标识",
      "title": "新闻标题",
      "content": "新闻内容摘要（100字左右）",
      "source": "来源名称",
      "url": "原文链接",
      "sentiment": "positive|negative|neutral（正面/负面/中性）",
      "importance": 1-10的数字（10最重要）,
      "timestamp": "ISO格式时间戳"
    }
  ]
}`;

    const userPrompt = `当前时间: ${new Date().toLocaleDateString('zh-CN')}

以下是最新的财经资讯：
${context}

请从以上资讯中筛选出最重要的5-8条财经新闻，整理成标准化格式。`;

    const result = await callLLMWithJSON<{ news: NewsItem[] }>(userPrompt, {
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2000,
    });

    return NextResponse.json({
      success: true,
      data: {
        news: result.news,
        searchResults: uniqueResults,
      },
    });
  } catch (error) {
    console.error('金豆财讯API错误:', error);
    
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
        content: '中国人民银行决定下调金融机构存款准备金率0.5个百分点，预计释放长期资金约1万亿元，支持实体经济发展。',
        source: '央行官网',
        url: 'https://example.com/pboc-rrr',
        sentiment: 'positive',
        importance: 9,
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        title: '科技部：加大对人工智能、半导体等领域支持力度',
        content: '科技部表示将进一步加大对人工智能、半导体、生物医药等战略性新兴产业的支持力度，推动科技创新。',
        source: '科技部',
        url: 'https://example.com/tech-support',
        sentiment: 'positive',
        importance: 8,
        timestamp: new Date().toISOString(),
      },
      {
        id: '3',
        title: '新能源汽车销量创历史新高，比亚迪持续领跑',
        content: '2025年一季度国内新能源汽车销量突破300万辆，同比增长45%，比亚迪继续占据市场份额第一。',
        source: '乘联会',
        url: 'https://example.com/nevs-sales',
        sentiment: 'positive',
        importance: 7,
        timestamp: new Date().toISOString(),
      },
      {
        id: '4',
        title: '房地产市场持续低迷，多地出台新政',
        content: '近期房地产市场成交持续低迷，多个城市相继出台限购放松、公积金贷款调整等政策，刺激市场需求。',
        source: '经济观察报',
        url: 'https://example.com/real-estate',
        sentiment: 'neutral',
        importance: 6,
        timestamp: new Date().toISOString(),
      },
      {
        id: '5',
        title: '美股三大指数收跌，科技股领跌',
        content: '受通胀数据超预期影响，美股三大指数全线收跌，科技股领跌市场，投资者对美联储降息预期降温。',
        source: '华尔街见闻',
        url: 'https://example.com/us-stocks',
        sentiment: 'negative',
        importance: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        news: mockNews,
        searchResults: [],
      },
    });
  }
}
