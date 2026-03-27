import { NextResponse } from 'next/server';
import { initialStocks, initialModels, initialGameState } from '@/lib/data';

export async function POST() {
  try {
    const resetData = {
      stocks: initialStocks,
      models: initialModels,
      gameState: {
        ...initialGameState,
        startDate: new Date().toISOString().split('T')[0],
      },
    };

    return NextResponse.json({
      success: true,
      data: resetData,
    });
  } catch (error) {
    console.error('重置失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
