import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateRealAIDecision } from '@/lib/aiDecisionGatewayReal';
import { validateOrder, executeOrder, updatePositions, recordNAV } from '@/lib/tradeEngine';
import { fetchCNStockData, defaultSymbols } from '@/lib/marketData';
import { Model } from '@/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET() {
  const authHeader = process.env.CRON_SECRET 
    ? `Bearer ${process.env.CRON_SECRET}` 
    : '';
  
  try {
    const { data: gameState } = await supabase
      .from('game_state')
      .select('*')
      .single();

    if (!gameState) {
      return NextResponse.json({ error: '游戏状态未初始化' }, { status: 400 });
    }

    const { data: dbModels } = await supabase
      .from('models')
      .select('*')
      .eq('is_active', true);

    if (!dbModels || dbModels.length === 0) {
      return NextResponse.json({ error: '没有活跃的模型' }, { status: 400 });
    }

    const stocks = await fetchCNStockData(defaultSymbols);

    const models: Model[] = await Promise.all(dbModels.map(async (dbModel: any) => {
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('model_id', dbModel.id);

      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('model_id', dbModel.id)
        .order('timestamp', { ascending: false });

      const { data: navHistory } = await supabase
        .from('nav_history')
        .select('*')
        .eq('model_id', dbModel.id)
        .order('date', { ascending: true });

      const modelPositions = (positions || []).map((p: any) => ({
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
        id: dbModel.id,
        name: dbModel.name,
        description: dbModel.description,
        avatar: dbModel.avatar,
        strategyType: dbModel.strategy_type,
        initialCash: dbModel.initial_cash,
        cash: dbModel.cash,
        positions: modelPositions,
        trades: trades || [],
        totalValue: dbModel.total_value,
        returnPercent: dbModel.return_percent,
        navHistory: navHistory || [],
        winRate: dbModel.win_rate || 0,
        totalTrades: dbModel.total_trades || 0,
        lastThought: dbModel.last_thought || '',
        isActive: dbModel.is_active
      };
    }));

    const { data: heldSinceData } = await supabase
      .from('held_since')
      .select('*');

    const heldSince = new Map<string, Date>();
    (heldSinceData || []).forEach((h: any) => {
      heldSince.set(h.symbol, new Date(h.date));
    });

    const updatedModels: Model[] = [];

    for (const model of models) {
      let updatedModel = updatePositions(model, stocks);
      const decision = await generateRealAIDecision(updatedModel, stocks);
      updatedModel = { ...updatedModel, lastThought: decision.thought };

      for (const order of decision.orders) {
        const validation = validateOrder(order, updatedModel, stocks, heldSince);
        if (validation.valid) {
          const result = executeOrder(order, updatedModel, stocks, heldSince);
          updatedModel = result.model;
          
          await supabase.from('trades').insert({
            id: result.trade.id,
            model_id: updatedModel.id,
            symbol: result.trade.symbol,
            name: result.trade.name,
            type: result.trade.type,
            shares: result.trade.shares,
            price: result.trade.price,
            amount: result.trade.amount,
            pnl: result.trade.pnl,
            pnl_percent: result.trade.pnlPercent,
            timestamp: result.trade.timestamp
          });
        }
      }

      updatedModels.push(updatedModel);
    }

    const currentSessionIndex = ['09:30', '10:30', '11:30', '13:00', '14:00', '14:30'].indexOf(gameState.current_session);
    let newDay = gameState.current_day;
    let newSession = gameState.current_session;
    const nextSessionIndex = currentSessionIndex + 1;

    if (nextSessionIndex >= 6) {
      newDay += 1;
      newSession = '09:30';
      
      for (const model of updatedModels) {
        const updatedModel = recordNAV(model, newDay);
        await supabase.from('nav_history').insert({
          model_id: model.id,
          date: `Day ${newDay}`,
          nav: updatedModel.navHistory[updatedModel.navHistory.length - 1].nav,
          return_percent: updatedModel.navHistory[updatedModel.navHistory.length - 1].returnPercent
        });
      }
    } else {
      newSession = ['09:30', '10:30', '11:30', '13:00', '14:00', '14:30'][nextSessionIndex];
    }

    for (const model of updatedModels) {
      await supabase
        .from('models')
        .update({
          cash: model.cash,
          total_value: model.totalValue,
          return_percent: model.returnPercent,
          win_rate: model.winRate,
          total_trades: model.totalTrades,
          last_thought: model.lastThought,
          updated_at: new Date()
        })
        .eq('id', model.id);

      await supabase.from('positions').delete().eq('model_id', model.id);
      
      for (const position of model.positions) {
        await supabase.from('positions').insert({
          model_id: model.id,
          symbol: position.symbol,
          name: position.name,
          shares: position.shares,
          avg_price: position.avgPrice,
          current_price: position.currentPrice
        });
      }
    }

    const heldSinceArray = Array.from(heldSince.entries()).map(([symbol, date]) => ({
      symbol,
      date: date.toISOString()
    }));
    
    await supabase.from('held_since').delete().neq('id', 0);
    if (heldSinceArray.length > 0) {
      await supabase.from('held_since').insert(heldSinceArray);
    }

    await supabase
      .from('game_state')
      .update({
        current_day: newDay,
        current_session: newSession,
        last_update: new Date()
      })
      .eq('id', gameState.id);

    return NextResponse.json({ 
      success: true, 
      models: updatedModels, 
      stocks,
      gameState: { ...gameState, current_day: newDay, current_session: newSession }
    });

  } catch (error) {
    console.error('定时任务失败:', error);
    return NextResponse.json(
      { error: '定时任务执行失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
