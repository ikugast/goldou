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

const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\xFF]/g, '')
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
      const searchQueries = [
        `${query} stock analysis`,
        `${query} financial report`,
        `${query} target price rating`,
        `${query} industry analysis`
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
      ? uniqueResults.map(r => `Title: ${cleanText(r.title)}\nContent: ${cleanText(r.content)}\nURL: ${r.url}`).join('\n\n')
      : 'No latest news available. Please generate report based on general knowledge.';

    const systemPrompt = cleanText(`You are a professional stock analyst. Based on the latest news provided, generate a standardized analysis report for the specified stock.

Please output the following JSON format:
{
  "symbol": "stock code",
  "name": "stock name",
  "rating": "buy|hold|sell",
  "targetPrice": target price number,
  "currentPrice": current price number,
  "upside": upside percentage (positive means upside),
  "summary": "investment summary (around 200 words)",
  "pros": ["bullish reason 1", "bullish reason 2", "bullish reason 3"],
  "cons": ["risk warning 1", "risk warning 2", "risk warning 3"],
  "financials": {
    "revenue": revenue (in 100 million yuan),
    "revenueGrowth": revenue growth percentage,
    "netProfit": net profit (in 100 million yuan),
    "profitGrowth": net profit growth percentage,
    "pe": P/E ratio,
    "pb": P/B ratio
  }
}`);

    const userPrompt = cleanText(`Current time: ${new Date().toISOString().split('T')[0]}

Stock query: ${query}

Here is the latest related news:
${context}

Based on the above information, please generate a standardized analysis report for this stock. If there is no specific financial data in the news, please use reasonable estimates.`);

    const report = await callLLMWithJSON<ReportData>(userPrompt, {
      provider: 'doubao',
      systemPrompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    console.log('LLM report generation successful:', report?.name);

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
