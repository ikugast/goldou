import { NextResponse } from 'next/server';
import { getState, setState, updateModel, updateGameState, addTrade, updatePositions } from '@/lib/memoryState';
import { fetchCNStockData, defaultSymbols } from '@/lib/marketData';
import { generateRealAIDecision } from '@/lib/aiDecisionGatewayReal';
import { updatePositions as updatePositionsEngine, recordNAV, validateOrder, executeOrder } from '@/lib/tradeEngine';

export async function POST() {
  try {
    const state = getState();
    const { gameState, models: currentModels } = state;

    const stocks = await fetchCNStockData(defaultSymbols);

    const heldSince = new Map(state.heldSince);

    const updatedModels: any[] = [];

    for (const model of currentModels) {
      let updatedModel = updatePositionsEngine(model, stocks);
      const decision = await generateRealAIDecision(updatedModel, stocks);
      updatedModel = { ...updatedModel, lastThought: decision.thought };

      for (const order of decision.orders) {
        const validation = validateOrder(order, updatedModel, stocks, heldSince);
        if (validation.valid) {
          const result = executeOrder(order, updatedModel, stocks, heldSince);
          updatedModel = result.model;
          
          addTrade(updatedModel.id, result.trade);
        }
      }

      updatedModels.push(updatedModel);
      updateModel(updatedModel);
    }

    const TRADING_SESSIONS = ['09:30', '10:30', '11:30', '13:00', '14:00', '14:30'];
    const currentSessionIndex = TRADING_SESSIONS.indexOf(gameState.current_session);
    let newDay = gameState.current_day;
    let newSession = gameState.current_session;
    const nextSessionIndex = currentSessionIndex + 1;

    if (nextSessionIndex >= 6) {
      newDay += 1;
      newSession = '09:30';
      
      for (const model of updatedModels) {
        const updatedModel = recordNAV(model, newDay);
        updateModel(updatedModel);
      }
    } else {
      newSession = TRADING_SESSIONS[nextSessionIndex];
    }

    updateGameState({
      current_day: newDay,
      current_session: newSession,
      lastUpdate: new Date(),
    });

    setState({ heldSince });

    return NextResponse.json({ 
      success: true, 
      models: updatedModels, 
      stocks,
      gameState: { ...gameState, current_day: newDay, current_session: newSession }
    });
  } catch (error) {
    console.error('触发交易失败:', error);
    return NextResponse.json(
      { error: '交易执行失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
