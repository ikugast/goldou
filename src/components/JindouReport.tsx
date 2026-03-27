'use client';

import { useState } from 'react';
import { Search, FileText, TrendingUp, TrendingDown, BarChart3, Clock, Zap } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface ReportData {
  symbol: string;
  name: string;
  rating: 'buy' | 'hold' | 'sell';
  targetPrice: number;
  currentPrice: number;
  upside: number;
  summary: string;
  pros: string[];
  cons: string[];
  financials: {
    revenue: number;
    revenueGrowth: number;
    netProfit: number;
    profitGrowth: number;
    pe: number;
    pb: number;
  };
  timestamp: string;
}

export default function JindouReport() {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!query.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/jindou/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });
      
      const data = await response.json();
      if (data.success && data.data) {
        setReport(data.data.report);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('生成研报失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const getRatingText = (rating: string) => {
    if (rating === 'buy') return '买入';
    if (rating === 'sell') return '卖出';
    return '持有';
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'buy') return 'text-emerald-400 bg-emerald-500/20';
    if (rating === 'sell') return 'text-red-400 bg-red-500/20';
    return 'text-slate-400 bg-slate-500/20';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-500/20 p-2 rounded-lg">
          <FileText className="text-blue-400" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">金豆研报</h3>
          <p className="text-sm text-slate-400">AI生成，仅供参考</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入股票代码或名称，如：600519 或 贵州茅台"
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !query.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {isGenerating ? <Zap size={20} className="animate-pulse" /> : <Search size={20} />}
          {isGenerating ? '生成中...' : '生成研报'}
        </button>
      </div>

      {error && (
        <div className="text-center py-12">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !query.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              重新尝试
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-2xl font-bold text-white">{report.name}</h4>
                <span className="text-slate-500 text-lg">{report.symbol}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingColor(report.rating)}`}>
                  {getRatingText(report.rating)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(report.timestamp).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 mb-1">目标价</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{formatCurrency(report.targetPrice)}</span>
                {report.upside > 0 ? (
                  <span className="text-emerald-400 font-medium">+{formatPercent(report.upside)}</span>
                ) : report.upside < 0 ? (
                  <span className="text-red-400 font-medium">{formatPercent(report.upside)}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
              <FileText size={16} />
              投资摘要
            </h5>
            <p className="text-slate-300 leading-relaxed">{report.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h5 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                <TrendingUp size={16} />
                看多逻辑
              </h5>
              <ul className="space-y-2">
                {report.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-1">•</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <TrendingDown size={16} />
                风险提示
              </h5>
              <ul className="space-y-2">
                {report.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-red-400 mt-1">•</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {report.financials.revenue > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                <BarChart3 size={16} />
                财务概览
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-sm mb-1">营业总收入</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{report.financials.revenue}亿</span>
                    <span className={report.financials.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatPercent(report.financials.revenueGrowth)}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-sm mb-1">净利润</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{report.financials.netProfit}亿</span>
                    <span className={report.financials.profitGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatPercent(report.financials.profitGrowth)}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-slate-500 text-sm mb-1">估值指标</div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <span className="text-slate-400 text-xs">PE</span>
                      <div className="text-lg font-bold text-white">{report.financials.pe}x</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">PB</span>
                      <div className="text-lg font-bold text-white">{report.financials.pb}x</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
