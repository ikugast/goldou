export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  amount: number;
  timestamp: Date;
  pnl?: number;
  pnlPercent?: number;
}

export interface NAVHistory {
  date: string;
  nav: number;
  returnPercent: number;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  avatar: string;
  strategyType: 'value' | 'momentum' | 'quant' | 'risk';
  initialCash: number;
  cash: number;
  positions: Position[];
  trades: Trade[];
  totalValue: number;
  returnPercent: number;
  navHistory: NAVHistory[];
  winRate: number;
  totalTrades: number;
  lastThought: string;
  isActive: boolean;
}

export interface MarketData {
  stocks: Stock[];
  timestamp: Date;
  session: string;
}

export interface Order {
  id: string;
  modelId: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  priceType: 'market' | 'limit';
  limitPrice?: number;
  status: 'pending' | 'executed' | 'rejected';
  rejectionReason?: string;
  timestamp: Date;
}

export interface GameState {
  startDate: string;
  currentDay: number;
  currentSession: string;
  isRunning: boolean;
  lastUpdate: Date;
}
