'use client';

import { Stock } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface StockCardProps {
  stock: Stock;
}

export default function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.changePercent >= 0;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-lg font-bold text-white">{stock.symbol}</div>
          <div className="text-sm text-slate-400">{stock.name}</div>
        </div>
      </div>
      <div className="flex justify-between items-end mb-3">
        <div className="text-2xl font-bold text-white">
          {formatCurrency(stock.price)}
        </div>
        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          <span className="font-medium">{formatPercent(stock.changePercent)}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-900 rounded p-2">
          <div className="text-slate-500">开</div>
          <div className="text-slate-300 font-medium">{formatCurrency(stock.open)}</div>
        </div>
        <div className="bg-slate-900 rounded p-2">
          <div className="text-slate-500">高/低</div>
          <div className="text-slate-300 font-medium">
            {formatCurrency(stock.high)}/{formatCurrency(stock.low)}
          </div>
        </div>
        <div className="bg-slate-900 rounded p-2">
          <div className="text-slate-500 flex items-center gap-1">
            <BarChart3 size={10} />
            成交量
          </div>
          <div className="text-slate-300 font-medium">{(stock.volume / 1000000).toFixed(2)}M</div>
        </div>
      </div>
    </div>
  );
}
