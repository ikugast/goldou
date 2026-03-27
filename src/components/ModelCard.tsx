'use client';

import { Model } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, TrendingUp as TrendingUpIcon, ExternalLink, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ModelCardProps {
  model: Model;
  rank: number;
}

export default function ModelCard({ model, rank }: ModelCardProps) {
  const router = useRouter();
  const isPositive = model.returnPercent >= 0;

  const getRankColor = () => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-slate-400';
  };

  const getStrategyBadge = () => {
    switch (model.strategyType) {
      case 'value':
        return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">价值</span>;
      case 'momentum':
        return <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">动量</span>;
      case 'quant':
        return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">量化</span>;
      case 'risk':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">风控</span>;
    }
  };

  return (
    <div 
      onClick={() => router.push(`/model/${model.id}`)}
      className="bg-slate-800 rounded-lg p-5 border border-slate-700 hover:border-slate-500 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-bold ${getRankColor()}`}>#{rank}</div>
          <div className="text-4xl">{model.avatar}</div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                {model.name}
              </div>
              <ExternalLink size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-sm text-slate-400 mb-1">{model.description}</div>
            {getStrategyBadge()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-900 rounded p-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Wallet size={14} />
            <span>总资产</span>
          </div>
          <div className="text-xl font-bold text-white">{formatCurrency(model.totalValue)}</div>
        </div>

        <div className="bg-slate-900 rounded p-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <TrendingUpIcon size={14} />
            <span>现金</span>
          </div>
          <div className="text-xl font-bold text-white">{formatCurrency(model.cash)}</div>
        </div>

        <div className="bg-slate-900 rounded p-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>收益率</span>
          </div>
          <div className={`text-xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(model.returnPercent)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-900 rounded p-3">
          <div className="text-slate-400 text-sm mb-1">交易次数</div>
          <div className="text-lg font-bold text-white">{model.totalTrades}</div>
        </div>
        <div className="bg-slate-900 rounded p-3">
          <div className="text-slate-400 text-sm mb-1">胜率</div>
          <div className="text-lg font-bold text-white">{formatPercent(model.winRate)}</div>
        </div>
      </div>

      {model.lastThought && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Activity size={14} />
            <span>最新思考</span>
          </div>
          <div className="bg-slate-900 rounded p-3 text-sm text-slate-300 line-clamp-2">
            {model.lastThought}
          </div>
        </div>
      )}

      {model.positions.length > 0 && (
        <div>
          <div className="text-sm text-slate-400 mb-2">持仓</div>
          <div className="space-y-2">
            {model.positions.slice(0, 3).map((position) => {
              const posIsPositive = position.unrealizedPnL >= 0;
              return (
                <div key={position.symbol} className="flex justify-between items-center bg-slate-900 rounded p-2 text-sm">
                  <div className="text-white">{position.symbol}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-slate-300">{position.shares} 股</div>
                    <div className={`text-xs ${posIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercent(position.unrealizedPnLPercent)}
                    </div>
                  </div>
                </div>
              );
            })}
            {model.positions.length > 3 && (
              <div className="text-center text-slate-500 text-sm">
                +{model.positions.length - 3} 更多
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
