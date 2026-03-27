'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (password === 'zt1998') {
        localStorage.setItem('adminPassword', password);
        router.push('/admin');
      } else {
        setError('密码错误，请重试');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={20} />
          <span>返回首页</span>
        </Link>

        <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-orange-500/20 p-3 rounded-lg">
              <Lock className="text-orange-400" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">管理后台</h1>
              <p className="text-sm text-slate-400">请输入访问密码</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                访问密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
            >
              {isLoading ? '验证中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
