import { NextResponse } from 'next/server';
import { resetState, getState } from '@/lib/memoryState';

export async function POST() {
  try {
    resetState();
    const state = getState();
    
    return NextResponse.json({
      success: true,
      data: {
        stocks: state.stocks,
        models: state.models,
        gameState: state.gameState,
      },
    });
  } catch (error) {
    console.error('重置失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
