export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY || process.env.SERPAPI_KEY;
  
  if (!apiKey) {
    console.warn('No search API key found, using mock data');
    return getMockSearchResults(query);
  }

  try {
    if (process.env.TAVILY_API_KEY) {
      return await searchWithTavily(query, numResults);
    } else if (process.env.SERPAPI_KEY) {
      return await searchWithSerpAPI(query, numResults);
    } else {
      return getMockSearchResults(query);
    }
  } catch (error) {
    console.error('Search API error:', error);
    return getMockSearchResults(query);
  }
}

async function searchWithTavily(query: string, numResults: number): Promise<SearchResponse> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      search_depth: 'basic',
      max_results: numResults,
      include_answer: false,
      include_images: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    query,
    results: data.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.content,
    })) || [],
  };
}

async function searchWithSerpAPI(query: string, numResults: number): Promise<SearchResponse> {
  const params = new URLSearchParams({
    api_key: process.env.SERPAPI_KEY || '',
    q: query,
    num: numResults.toString(),
    engine: 'google',
    hl: 'zh-CN',
    gl: 'cn',
  });

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    query,
    results: data.organic_results?.slice(0, numResults).map((result: any) => ({
      title: result.title,
      url: result.link,
      content: result.snippet || '',
    })) || [],
  };
}

function getMockSearchResults(query: string): SearchResponse {
  const mockData: Record<string, SearchResult[]> = {
    'A股 大盘走势': [
      {
        title: '2025年A股市场展望：政策支持下的结构性机会',
        url: 'https://example.com/a-share-outlook',
        content: '2025年A股市场在政策面持续支持下，预计将呈现结构性行情。科技、新能源、消费等板块有望持续受益。'
      },
      {
        title: '上证指数技术分析：关键点位与趋势判断',
        url: 'https://example.com/shanghai-index',
        content: '上证指数当前处于震荡上行阶段，关注3200点支撑位，若突破3300点可确认上升趋势。'
      },
      {
        title: '资金流向监测：北向资金持续流入A股',
        url: 'https://example.com/capital-flow',
        content: '近期北向资金持续净流入A股市场，显示外资对中国资产的信心逐步恢复。'
      }
    ],
    '贵州茅台 股票分析': [
      {
        title: '贵州茅台2025年一季报点评：业绩稳健增长',
        url: 'https://example.com/moutai-report',
        content: '贵州茅台2025年一季度实现营收约425亿元，同比增长18.5%；净利润约250亿元，同比增长22.3%。'
      },
      {
        title: '白酒行业深度报告：高端化趋势延续',
        url: 'https://example.com/baijiu-industry',
        content: '白酒行业高端化趋势持续，贵州茅台作为行业龙头，品牌护城河深厚，直销占比持续提升。'
      }
    ],
    '今日财经要闻': [
      {
        title: '央行宣布降准0.5个百分点，释放长期资金约1万亿元',
        url: 'https://example.com/pboc-rrr',
        content: '中国人民银行决定下调金融机构存款准备金率0.5个百分点，预计释放长期资金约1万亿元。'
      },
      {
        title: '科技部：加大对人工智能、半导体等领域支持力度',
        url: 'https://example.com/tech-support',
        content: '科技部表示将进一步加大对人工智能、半导体、生物医药等战略性新兴产业的支持力度。'
      },
      {
        title: '新能源汽车销量创历史新高，比亚迪持续领跑',
        url: 'https://example.com/nevs-sales',
        content: '2025年一季度国内新能源汽车销量突破300万辆，同比增长45%，比亚迪继续占据市场份额第一。'
      }
    ]
  };

  let results = mockData[query] || [];
  
  if (results.length === 0) {
    results = [
      {
        title: `${query} - 最新资讯`,
        url: 'https://example.com/search',
        content: `关于"${query}"的最新市场动态和分析资料正在整理中...`
      }
    ];
  }

  return {
    query,
    results,
  };
}
