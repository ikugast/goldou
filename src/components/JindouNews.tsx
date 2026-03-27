'use client';

import { useState, useEffect } from 'react';
import { Newspaper, Clock, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  importance: number;
  timestamp: string;
}

export default function JindouNews() {
  const [isLoading, setIsLoading] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/jindou/news', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success && data.data) {
        setNews(data.data.news);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('获取金豆财讯数据失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasLoaded) {
      fetchNews();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getTypeIcon = (sentiment: string) => {
    if (sentiment === 'positive') return <TrendingUp size={16} className="text-red-400" />;
    if (sentiment === 'negative') return <TrendingDown size={16} className="text-emerald-400" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  const getTypeColor = (sentiment: string) => {
    if (sentiment === 'positive') return 'border-l-red-500';
    if (sentiment === 'negative') return 'border-l-emerald-500';
    return 'border-l-slate-500';
  };

  const getSentimentText = (sentiment: string) => {
    if (sentiment === 'positive') return '利好';
    if (sentiment === 'negative') return '利空';
    return '中性';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Newspaper className="text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">金豆财讯</h3>
            <p className="text-sm text-slate-400">AI生成，仅供参考</p>
          </div>
        </div>
        <button
          onClick={fetchNews}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          <Zap size={18} className={isLoading ? 'animate-pulse' : ''} />
          {isLoading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="text-center py-12">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {isLoading && news.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">正在联网搜索最新财经资讯...</p>
        </div>
      )}

      {news.length > 0 && (
        <div className="space-y-4">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block bg-slate-900 rounded-lg p-4 border-l-4 ${getTypeColor(item.sentiment)} hover:bg-slate-800/50 transition-colors`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getTypeIcon(item.sentiment)}
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.sentiment === 'positive' ? 'bg-red-500/20 text-red-400' :
                    item.sentiment === 'negative' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {getSentimentText(item.sentiment)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{formatTime(item.timestamp)}</span>
                  <span>•</span>
                  <span>重要度: {item.importance}/10</span>
                </div>
              </div>
              <p className="text-sm text-slate-400">{item.content}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
