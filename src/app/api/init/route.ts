import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createInitialModel } from '@/lib/data';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function POST() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: '环境变量未配置' }, { status: 500 });
  }
  try {
    const startDate = new Date().toISOString().split('T')[0];
    
    const { error: stateError } = await supabase
      .from('game_state')
      .insert({
        start_date: startDate,
        current_day: 1,
        current_session: '09:30'
      });

    if (stateError) throw stateError;

    const initialModels = [
      createInitialModel('model-1', 'DeepValue AI', '价值投资策略，寻找被低估的股票', '🤖', 'value'),
      createInitialModel('model-2', 'Momentum Pro', '动量交易策略，追涨杀跌', '🚀', 'momentum'),
      createInitialModel('model-3', 'QuantSage', '量化分析，多因子模型', '📊', 'quant'),
      createInitialModel('model-4', 'RiskMaster', '风险控制优先，稳健增长', '🛡️', 'risk'),
    ];

    for (const model of initialModels) {
      const { error: modelError } = await supabase
        .from('models')
        .insert({
          id: model.id,
          name: model.name,
          description: model.description,
          avatar: model.avatar,
          strategy_type: model.strategyType,
          initial_cash: model.initialCash,
          cash: model.cash,
          total_value: model.totalValue,
          return_percent: model.returnPercent,
          last_thought: model.lastThought
        });

      if (modelError) throw modelError;

      const { error: navError } = await supabase
        .from('nav_history')
        .insert({
          model_id: model.id,
          date: 'Day 1',
          nav: 100,
          return_percent: 0
        });

      if (navError) throw navError;
    }

    return NextResponse.json({ success: true, message: '数据库初始化成功' });
  } catch (error) {
    console.error('初始化失败:', error);
    return NextResponse.json(
      { error: '初始化失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: '环境变量未配置' }, { status: 500 });
  }
  
  try {
    await supabase.from('held_since').delete().neq('id', 0);
    await supabase.from('nav_history').delete().neq('id', 0);
    await supabase.from('trades').delete().neq('id', 0);
    await supabase.from('positions').delete().neq('id', 0);
    await supabase.from('models').delete().neq('id', 0);
    await supabase.from('game_state').delete().neq('id', 0);

    return NextResponse.json({ success: true, message: '数据已清空' });
  } catch (error) {
    console.error('清空失败:', error);
    return NextResponse.json(
      { error: '清空失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
