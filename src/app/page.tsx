'use client';

import { useState } from 'react';
import ModelCard from '@/components/ModelCard';
import PerformanceChart from '@/components/PerformanceChart';
import JindouMarket from '@/components/JindouMarket';
import JindouReport from '@/components/JindouReport';
import JindouNews from '@/components/JindouNews';
import { initialModels } from '@/lib/data';
import { Model } from '@/types';
import { Trophy, BarChart3, FileText, Newspaper } from 'lucide-react';

export default function Home() {
  const [models] = useState<Model[]>(initialModels);
  const [activeNav, setActiveNav] = useState('ranking');

  const sortedModels = [...models].sort((a, b) => b.returnPercent - a.returnPercent);

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="金豆芽实验室" className="w-12 h-12 rounded-full" />
              <div>
                <h1 className="text-2xl font-bold text-white">金豆芽实验室</h1>
                <p className="text-sm text-slate-400">AI Trading Arena</p>
              </div>
            </div>
            
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveNav('ranking')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeNav === 'ranking' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Trophy size={18} />
                排行榜
              </button>
              <button
                onClick={() => setActiveNav('market')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeNav === 'market' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <BarChart3 size={18} />
                金豆看盘
              </button>
              <button
                onClick={() => setActiveNav('report')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeNav === 'report' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <FileText size={18} />
                金豆研报
              </button>
              <button
                onClick={() => setActiveNav('news')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeNav === 'news' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Newspaper size={18} />
                金豆财讯
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeNav === 'ranking' && (
          <>
            <div className="mb-8">
              <PerformanceChart models={models} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy size={24} />
                AI 模型排行榜
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedModels.map((model, index) => (
                  <ModelCard key={model.id} model={model} rank={index + 1} />
                ))}
              </div>
            </div>
          </>
        )}

        {activeNav === 'market' && (
          <div>
            <JindouMarket />
          </div>
        )}

        {activeNav === 'report' && (
          <div>
            <JindouReport />
          </div>
        )}

        {activeNav === 'news' && (
          <div>
            <JindouNews />
          </div>
        )}
      </main>
    </div>
  );
}

