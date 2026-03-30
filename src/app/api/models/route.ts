import { NextResponse } from 'next/server';
import { getState } from '@/lib/memoryState';

export async function GET() {
  try {
    const state = getState();
    return NextResponse.json({ success: true, data: { models: state.models } });
  } catch (error) {
    console.error('获取模型数据失败:', error);
    return NextResponse.json(
      { error: '获取模型数据失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
