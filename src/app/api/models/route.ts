import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: '环境变量未配置' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('*')
      .eq('is_active', true);
    
    if (modelsError) throw modelsError;
    
    const modelsWithPositions = await Promise.all((models || []).map(async (model) => {
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('model_id', model.id);
      
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('model_id', model.id)
        .order('timestamp', { ascending: false });
      
      const { data: navHistory } = await supabase
        .from('nav_history')
        .select('*')
        .eq('model_id', model.id)
        .order('date', { ascending: true });
      
      const modelPositions = (positions || []).map((p) => ({
        symbol: p.symbol,
        name: p.name,
        shares: p.shares,
        avgPrice: p.avg_price,
        currentPrice: p.current_price,
        costBasis: p.avg_price * p.shares,
        marketValue: p.current_price * p.shares,
        unrealizedPnL: (p.current_price - p.avg_price) * p.shares,
        unrealizedPnLPercent: ((p.current_price - p.avg_price) / p.avg_price) * 100
      }));
      
      return {
        id: model.id,
        name: model.name,
        description: model.description,
        avatar: model.avatar,
        strategyType: model.strategy_type,
        initialCash: model.initial_cash,
        cash: model.cash,
        positions: modelPositions,
        trades: trades || [],
        totalValue: model.total_value,
        returnPercent: model.return_percent,
        navHistory: navHistory || [],
        winRate: model.win_rate || 0,
        totalTrades: model.total_trades || 0,
        lastThought: model.last_thought || '',
        isActive: model.is_active
      };
    }));
    
    return NextResponse.json({ success: true, data: { models: modelsWithPositions } });
  } catch (error) {
    console.error('获取模型数据失败:', error);
    return NextResponse.json(
      { error: '获取模型数据失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
