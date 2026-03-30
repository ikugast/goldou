import { Stock, Model, GameState, Position, Trade } from '@/types';
import { initialStocks, initialModels, initialGameState } from '@/lib/data';

interface MemoryState {
  stocks: Stock[];
  models: Model[];
  gameState: GameState;
  heldSince: Map<string, Date>;
}

let state: MemoryState = {
  stocks: [...initialStocks],
  models: [...initialModels],
  gameState: { ...initialGameState },
  heldSince: new Map(),
};

export function getState() {
  return state;
}

export function setState(newState: Partial<MemoryState>) {
  state = { ...state, ...newState };
}

export function resetState() {
  state = {
    stocks: [...initialStocks],
    models: [...initialModels],
    gameState: { ...initialGameState },
    heldSince: new Map(),
  };
}

export function updateStockPrices(updatedStocks: Stock[]) {
  state.stocks = updatedStocks;
}

export function updateModel(updatedModel: Model) {
  state.models = state.models.map(m => 
    m.id === updatedModel.id ? updatedModel : m
  );
}

export function updateGameState(updatedState: Partial<GameState>) {
  state.gameState = { ...state.gameState, ...updatedState };
}

export function addTrade(modelId: string, trade: Trade) {
  const model = state.models.find(m => m.id === modelId);
  if (model) {
    model.trades.unshift(trade);
  }
}

export function updatePositions(modelId: string, positions: Position[]) {
  const model = state.models.find(m => m.id === modelId);
  if (model) {
    model.positions = positions;
  }
}
