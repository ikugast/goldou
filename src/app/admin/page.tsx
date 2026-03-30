'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw, Settings, CheckCircle2, AlertCircle, Plus, Trash2, List, Search, Lock, LogOut } from 'lucide-react';
import { initialStocks, initialModels, initialGameState } from '@/lib/data';
import { Stock, Model, GameState } from '@/types';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);
  const [models, setModels] = useState<Model[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    ...initialGameState,
    startDate: new Date().toISOString().split('T')[0],
  });
  const [isTrading, setIsTrading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'control' | 'stocks'>('control');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [isStockPoolLoading, setIsStockPoolLoading] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const savedPassword = typeof window !== 'undefined' ? localStorage.getItem('adminPassword') : null;
      if (savedPassword === 'zt1998') {
        setIsAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
      setIsChecking(false);
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('adminPassword');
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchStockPool = async () => {
    setIsStockPoolLoading(true);
    try {
      const response = await fetch('/api/admin/stock-pool');
      const data = await response.json();
      if (data.success) {
        setStocks(data.data.stocks);
      }
    } catch (error) {
      console.error('获取股票池失败:', error);
    } finally {
      setIsStockPoolLoading(false);
    }
  };

  const fetchModels = async () => {
    setIsModelsLoading(true);
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      if (data.success && data.data) {
        setModels(data.data.models);
      }
    } catch (error) {
      console.error('获取模型数据失败:', error);
    } finally {
      setIsModelsLoading(false);
    }
  };

  const handleAddStock = async () => {
    if (!newStockSymbol.trim() || !newStockName.trim()) {
      showMessage('请填写股票代码和名称', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/stock-pool', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          stock: {
            symbol: newStockSymbol.trim().toUpperCase(),
            name: newStockName.trim(),
            price: parseFloat(newStockPrice) || 50,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStocks(data.data.stocks);
        setNewStockSymbol('');
        setNewStockName('');
        setNewStockPrice('');
        showMessage('股票添加成功！', 'success');
      } else {
        showMessage(data.error || '添加失败', 'error');
      }
    } catch (error) {
      console.error('添加股票失败:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!confirm(`确定要删除股票 ${symbol} 吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/stock-pool', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          stock: { symbol },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStocks(data.data.stocks);
        showMessage('股票删除成功！', 'success');
      } else {
        showMessage(data.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除股票失败:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  };

  const handleResetStockPool = async () => {
    if (!confirm('确定要重置股票池为默认状态吗？')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/stock-pool', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStocks(data.data.stocks);
        showMessage('股票池已重置！', 'success');
      } else {
        showMessage(data.error || '重置失败', 'error');
      }
    } catch (error) {
      console.error('重置股票池失败:', error);
      showMessage('网络错误，请稍后重试', 'error');
    }
  };

  useEffect(() => {
    fetchStockPool();
    fetchModels();
  }, []);

  const filteredStocks = stocks.filter(stock =>
    stock.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    stock.symbol.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const handleTriggerTrade = async () => {
    setIsTrading(true);
    try {
      const response = await fetch('/api/admin/trigger-trade', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        showMessage('AI决策交易执行成功！', 'success');
        await fetchStockPool();
        await fetchModels();
      } else {
        showMessage(data.error || '交易执行失败', 'error');
      }
    } catch (error) {
      console.error('触发交易失败:', error);
      showMessage('网络错误，请稍后重试', 'error');
    } finally {
      setIsTrading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置模拟交易到初始状态吗？所有交易记录将被清除。')) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStocks(data.data.stocks);
        setModels(data.data.models);
        setGameState(data.data.gameState);
        showMessage('模拟交易已重置为初始状态！', 'success');
      } else {
        showMessage(data.error || '重置失败', 'error');
      }
    } catch (error) {
      console.error('重置失败:', error);
      showMessage('网络错误，请稍后重试', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const sortedModels = [...models].sort((a, b) => b.returnPercent - a.returnPercent);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">验证中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
                <span>返回首页</span>
              </Link>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <Settings className="text-orange-400" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">管理后台</h1>
                  <p className="text-sm text-slate-400">模拟交易管理</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>登出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/50' : 
            'bg-red-500/20 border border-red-500/50'
          }`}>
            {message.type === 'success' ? 
              <CheckCircle2 size={24} className="text-emerald-400" /> : 
              <AlertCircle size={24} className="text-red-400" />
            }
            <span className={message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>
              {message.text}
            </span>
          </div>
        )}

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('control')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              activeTab === 'control'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Settings size={20} />
            控制面板
          </button>
          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
              activeTab === 'stocks'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <List size={20} />
            股票池管理
          </button>
        </div>

        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings size={24} className="text-orange-400" />
                  控制面板
                </h2>

                <div className="space-y-4">
                  <button
                    onClick={handleTriggerTrade}
                    disabled={isTrading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                  >
                    <Play size={20} className={isTrading ? 'animate-pulse' : ''} />
                    {isTrading ? '交易执行中...' : '手工触发AI决策交易'}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                  >
                    <RotateCcw size={20} className={isResetting ? 'animate-spin' : ''} />
                    {isResetting ? '重置中...' : '重置模拟交易'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">当前状态</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">交易日</span>
                    <span className="text-white font-medium">Day {gameState.currentDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">交易时段</span>
                    <span className="text-white font-medium">{gameState.currentSession}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">模型数量</span>
                    <span className="text-white font-medium">{models.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">股票数量</span>
                    <span className="text-white font-medium">{stocks.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">AI模型排行榜</h3>
                <div className="space-y-3">
                  {sortedModels.map((model, index) => (
                    <div key={model.id} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-yellow-900' :
                            index === 1 ? 'bg-slate-400 text-slate-900' :
                            index === 2 ? 'bg-amber-700 text-amber-100' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{model.name}</h4>
                            <p className="text-sm text-slate-400">{model.strategy}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${
                            model.returnPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {model.returnPercent >= 0 ? '+' : ''}{model.returnPercent.toFixed(2)}%
                          </div>
                          <div className="text-sm text-slate-400">
                            总资产: ¥{model.totalValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stocks' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">添加股票</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={newStockSymbol}
                  onChange={(e) => setNewStockSymbol(e.target.value)}
                  placeholder="股票代码 (如：600519)"
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={newStockName}
                  onChange={(e) => setNewStockName(e.target.value)}
                  placeholder="股票名称 (如：贵州茅台)"
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="number"
                  value={newStockPrice}
                  onChange={(e) => setNewStockPrice(e.target.value)}
                  placeholder="基准价格 (如：1688)"
                  className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAddStock}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <Plus size={20} />
                  添加
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">股票池 ({filteredStocks.length}只)</h3>
                <div className="flex gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="搜索股票..."
                      className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleResetStockPool}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                  >
                    <RotateCcw size={18} />
                    重置
                  </button>
                </div>
              </div>

              {isStockPoolLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">加载中...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredStocks.map((stock) => (
                    <div key={stock.symbol} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{stock.name}</h4>
                          <p className="text-sm text-slate-500">{stock.symbol}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveStock(stock.symbol)}
                          className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">价格</span>
                          <span className="text-white font-medium">¥{stock.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">涨跌幅</span>
                          <span className={`font-medium ${
                            stock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
