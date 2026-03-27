import { NextResponse } from 'next/server';
import { fetchCNStockData, defaultSymbols } from '@/lib/marketData';

export async function GET() {
  try {
    const stocks = await fetchCNStockData(defaultSymbols);
    return NextResponse.json({ stocks, timestamp: new Date() });
  } catch (error) {
    console.error('获取市场数据失败:', error);
    return NextResponse.json(
      { error: '获取市场数据失败' },
      { status: 500 }
    );
  }
}
