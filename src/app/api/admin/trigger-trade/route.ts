import { NextResponse } from 'next/server';
import { initialStocks, initialModels, initialGameState } from '@/lib/data';
import { updatePositions, recordNAV, validateOrder, executeOrder } from '@/lib/tradeEngine';
import { generateAIDecision } from '@/lib/aiDecisionGateway';

const TRADING_SESSIONS = ['09:30', '10:30', '11:30', '13:00', '14:00', '14:30'];

export async function POST(request: Request) {
  try {
    const { stocks, models, gameState } = await request.json();

    if (!stocks || !models || !gameState) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
      }, { status: 400 });
    }

    const simulateMarket = () => {
      const newStocks = stocks.map((stock: any) => {
        const volatility = 0.03;
        const change = (Math.random() - 0.5) * 2 * volatility * stock.price;
        const newPrice = Math.max(stock.price + change, 1);
        const priceChange = newPrice - stock.price;
        const percentChange = (priceChange / stock.price) * 100;
        const newHigh = Math.max(stock.high, newPrice);
        const newLow = Math.min(stock.low, newPrice);
        const volumeChange = 0.8 + Math.random() * 0.4;

        return {
          ...stock,
          price: parseFloat(newPrice.toFixed(2)),
          change: parseFloat(priceChange.toFixed(2)),
          changePercent: parseFloat(percentChange.toFixed(2)),
          high: parseFloat(newHigh.toFixed(2)),
          low: parseFloat(newLow.toFixed(2)),
          volume: Math.floor(stock.volume * volumeChange),
        };
      });

      let newModels = models.map((model: any) => updatePositions(model, newStocks));

      const currentSessionIndex = TRADING_SESSIONS.indexOf(gameState.currentSession);
      const heldSince = new Map<string, Date>();

      newModels = newModels.map((model: any) => {
        const decision = generateAIDecision(model, newStocks);
        let updatedModel = { ...model, lastThought: decision.thought };

        for (const order of decision.orders) {
          const validation = validateOrder(order, updatedModel, newStocks, heldSince);
          if (validation.valid) {
            const result = executeOrder(order, updatedModel, newStocks, heldSince);
            updatedModel = result.model;
          }
        }

        return updatedModel;
      });

      let newDay = gameState.currentDay;
      let newSession = gameState.currentSession;
      const nextSessionIndex = currentSessionIndex + 1;

      if (nextSessionIndex >= TRADING_SESSIONS.length) {
        newDay += 1;
        newSession = TRADING_SESSIONS[0];
        newModels = newModels.map((model: any) => recordNAV(model, newDay));
      } else {
        newSession = TRADING_SESSIONS[nextSessionIndex];
      }

      const newGameState = {
        ...gameState,
        currentDay: newDay,
        currentSession: newSession,
        lastUpdate: new Date(),
      };

      return {
        stocks: newStocks,
        models: newModels,
        gameState: newGameState,
      };
    };

    const result = simulateMarket();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('触发交易失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }, { status: 500 });
  }
}
