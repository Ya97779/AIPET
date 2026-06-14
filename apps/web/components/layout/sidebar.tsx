'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import { Home, PawPrint, Stethoscope, ChefHat, LogOut } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/pets', label: '宠物档案', icon: PawPrint },
  { href: '/consultation', label: 'AI问诊', icon: Stethoscope },
  { href: '/recipe', label: '智能食谱', icon: ChefHat },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900">宠爱智囊</h1>
            <p className="text-xs text-slate-400">PetAI Mind</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
            {(user?.nickname || user?.username || '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.nickname || user?.username}</p>
            <p className="text-xs text-slate-400">积分 {user?.points_balance || 0}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );
}
