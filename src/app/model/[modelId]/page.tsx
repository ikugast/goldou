'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Model } from '@/types';
import { initialModels } from '@/lib/data';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  Activity,
  Trophy,
  BarChart3,
  History
} from 'lucide-react';

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [model, setModel] = useState<Model | null>(null);

  useEffect(() => {
    const foundModel = initialModels.find(m => m.id === params.modelId);
    if (foundModel) {
      setModel(foundModel);
    }
  }, [params.modelId]);

  if (!model) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">模型未找到</div>
      </div>
    );
  }

  const isPositive = model.returnPercent >= 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="text-white" size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{model.avatar}</div>
              <div>
                <h1 className="text-2xl font-bold text-white">{model.name}</h1>
                <p className="text-sm text-slate-400">{model.description}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Wallet size={24} />
                资产概览
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded p-4">
                  <div className="text-slate-400 text-sm mb-1">总资产</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(model.totalValue)}</div>
                </div>
                <div className="bg-slate-900 rounded p-4">
                  <div className="text-slate-400 text-sm mb-1">现金</div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(model.cash)}</div>
                </div>
                <div className="bg-slate-900 rounded p-4">
                  <div className="text-slate-400 text-sm mb-1">总收益率</div>
                  <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(model.returnPercent)}
                  </div>
                </div>
                <div className="bg-slate-900 rounded p-4">
                  <div className="text-slate-400 text-sm mb-1">持仓市值</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(model.positions.reduce((sum, p) => sum + p.marketValue, 0))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target size={24} />
                当前持仓
              </h2>
              {model.positions.length === 0 ? (
                <div className="text-slate-400 text-center py-8">
                  暂无持仓
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 text-sm">股票</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm">数量</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm">成本价</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm">现价</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm">市值</th>
                        <th className="text-right py-3 px-4 text-slate-400 text-sm">盈亏</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.positions.map((position) => {
                        const posIsPositive = position.unrealizedPnL >= 0;
                        return (
                          <tr key={position.symbol} className="border-b border-slate-700/50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-white">{position.symbol}</div>
                              <div className="text-sm text-slate-400">{position.name}</div>
                            </td>
                            <td className="text-right py-3 px-4 text-white">{position.shares} 股</td>
                            <td className="text-right py-3 px-4 text-slate-300">{formatCurrency(position.avgPrice)}</td>
                            <td className="text-right py-3 px-4 text-white">{formatCurrency(position.currentPrice)}</td>
                            <td className="text-right py-3 px-4 text-white">{formatCurrency(position.marketValue)}</td>
                            <td className={`text-right py-3 px-4 font-medium ${posIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {formatPercent(position.unrealizedPnLPercent)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History size={24} />
                交易记录
              </h2>
              {model.trades.length === 0 ? (
                <div className="text-slate-400 text-center py-8">
                  暂无交易记录
                </div>
              ) : (
                <div className="space-y-3">
                  {model.trades.slice().reverse().map((trade) => {
                    const tradeIsPositive = trade.type === 'sell' && trade.pnl && trade.pnl > 0;
                    return (
                      <div key={trade.id} className="bg-slate-900 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              {trade.type === 'buy' ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
                            </div>
                            <div>
                              <div className="font-bold text-white">{trade.symbol}</div>
                              <div className="text-sm text-slate-400">{trade.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.type === 'buy' ? '买入' : '卖出'} {trade.shares} 股
                            </div>
                            <div className="text-sm text-slate-400">{formatDate(trade.timestamp)}</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">成交价: {formatCurrency(trade.price)}</span>
                          <span className="text-slate-400">金额: {formatCurrency(trade.amount)}</span>
                          {trade.pnl !== undefined && (
                            <span className={`font-medium ${tradeIsPositive ? 'text-green-400' : 'text-red-400'}`}>
                              盈亏: {formatCurrency(trade.pnl)} ({formatPercent(trade.pnlPercent || 0)})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={24} />
                策略指标
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">总交易次数</span>
                    <span className="text-white font-medium">{model.totalTrades}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">胜率</span>
                    <span className="text-white font-medium">{formatPercent(model.winRate)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min(model.winRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">持仓数量</span>
                    <span className="text-white font-medium">{model.positions.length}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">现金占比</span>
                    <span className="text-white font-medium">
                      {formatPercent((model.cash / model.totalValue) * 100)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={24} />
                最新思考
              </h2>
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-slate-300 text-sm leading-relaxed">{model.lastThought}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy size={24} />
                策略类型
              </h2>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${model.strategyType === 'value' ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-slate-900'}`}>
                  <div className="font-medium text-white">🤖 价值投资</div>
                  <div className="text-xs text-slate-400">寻找被低估的股票</div>
                </div>
                <div className={`p-3 rounded-lg ${model.strategyType === 'momentum' ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-slate-900'}`}>
                  <div className="font-medium text-white">🚀 动量交易</div>
                  <div className="text-xs text-slate-400">追涨杀跌，顺势而为</div>
                </div>
                <div className={`p-3 rounded-lg ${model.strategyType === 'quant' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-slate-900'}`}>
                  <div className="font-medium text-white">📊 量化分析</div>
                  <div className="text-xs text-slate-400">多因子模型选股</div>
                </div>
                <div className={`p-3 rounded-lg ${model.strategyType === 'risk' ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-slate-900'}`}>
                  <div className="font-medium text-white">🛡️ 风险控制</div>
                  <div className="text-xs text-slate-400">稳健增长，严控风险</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
