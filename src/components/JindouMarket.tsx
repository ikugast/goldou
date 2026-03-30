'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Brain, BarChart3, Zap } from 'lucide-react';
import { formatPercent } from '@/lib/utils';

interface MarketAnalysis {
  index: string;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

interface IndexQuote {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export default function JindouMarket() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyses, setAnalyses] = useState<MarketAnalysis[]>([]);
  const [indexQuotes, setIndexQuotes] = useState<IndexQuote[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketAnalysis = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/jindou/market', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAnalyses(data.data.analyses);
        if (data.data.indexQuotes) {
          setIndexQuotes(data.data.indexQuotes);
        }
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('获取金豆看盘数据失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!hasLoaded) {
      fetchMarketAnalysis();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const getPredictionIcon = (prediction: string) => {
    if (prediction === 'bullish') return <TrendingUp size={20} className="text-red-400" />;
    if (prediction === 'bearish') return <TrendingDown size={20} className="text-emerald-400" />;
    return <BarChart3 size={20} className="text-slate-400" />;
  };

  const getPredictionText = (prediction: string) => {
    if (prediction === 'bullish') return '看涨';
    if (prediction === 'bearish') return '看跌';
    return '震荡';
  };

  const getPredictionColor = (prediction: string) => {
    if (prediction === 'bullish') return 'text-red-400';
    if (prediction === 'bearish') return 'text-emerald-400';
    return 'text-slate-400';
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-400';
    if (change < 0) return 'text-emerald-400';
    return 'text-slate-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp size={16} />;
    if (change < 0) return <TrendingDown size={16} />;
    return <BarChart3 size={16} />;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/20 p-2 rounded-lg">
            <Brain className="text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">金豆看盘</h3>
            <p className="text-sm text-slate-400">AI生成，仅供参考</p>
          </div>
        </div>
        <button
          onClick={fetchMarketAnalysis}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <Zap size={18} className={isGenerating ? 'animate-pulse' : ''} />
          {isGenerating ? '分析中...' : '重新分析'}
        </button>
      </div>

      {error && (
        <div className="text-center py-12">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchMarketAnalysis}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              重新尝试
            </button>
          </div>
        </div>
      )}

      {isGenerating && analyses.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">正在联网搜索并分析市场...</p>
        </div>
      )}

      {analyses.length > 0 && (
        <div>
          {indexQuotes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-slate-400" />
                实时指数行情
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {indexQuotes.map((quote, index) => (
                  <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-white">{quote.name}</h5>
                      <div className={`flex items-center gap-1 ${getChangeColor(quote.change)}`}>
                        {getChangeIcon(quote.change)}
                        <span className="font-bold">
                          {quote.change > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {quote.price.toFixed(2)}
                    </div>
                    <div className={`text-sm ${getChangeColor(quote.change)}`}>
                      {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain size={18} className="text-slate-400" />
            大盘走势预判
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyses.map((analysis, index) => (
              <div key={index} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-white">{analysis.index}</h5>
                  <div className="flex items-center gap-2">
                    {getPredictionIcon(analysis.prediction)}
                    <span className={`font-bold ${getPredictionColor(analysis.prediction)}`}>
                      {getPredictionText(analysis.prediction)}
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">置信度</span>
                    <span className="text-white font-medium">{formatPercent(analysis.confidence)}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        analysis.prediction === 'bullish' ? 'bg-red-500' : 
                        analysis.prediction === 'bearish' ? 'bg-emerald-500' : 'bg-slate-500'
                      }`}
                      style={{ width: `${analysis.confidence}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-400">{analysis.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
