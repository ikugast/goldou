'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Model } from '@/types';

interface PerformanceChartProps {
  models: Model[];
}

const colors = [
  '#22c55e',
  '#f97316',
  '#8b5cf6',
  '#3b82f6',
  '#ec4899',
  '#14b8a6',
];

export default function PerformanceChart({ models }: PerformanceChartProps) {
  const chartData = models.length > 0 ? (() => {
    const maxDays = Math.max(...models.map(m => m.navHistory.length));
    const data: { day: string; [key: string]: string | number }[] = [];

    for (let i = 0; i < maxDays; i++) {
      const point: { day: string; [key: string]: string | number } = { day: `Day ${i + 1}` };
      models.forEach((model) => {
        if (model.navHistory[i]) {
          point[model.name] = model.navHistory[i].nav;
        }
      });
      data.push(point);
    }

    return data;
  })() : [];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">📈 收益走势</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              labelStyle={{ color: '#f1f5f9' }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, '收益率']}
            />
            <Legend wrapperStyle={{ color: '#f1f5f9' }} />
            {models.map((model, index) => (
              <Line
                key={model.id}
                type="monotone"
                dataKey={model.name}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

