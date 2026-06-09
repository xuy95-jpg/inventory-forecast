'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  BrainCircuit,
  BarChart3,
  ClipboardCheck,
  ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/data-entry', label: '数据录入', icon: FileSpreadsheet },
  { href: '/prediction', label: 'AI预测', icon: BrainCircuit },
  { href: '/summary', label: '总汇总', icon: BarChart3 },
  { href: '/production-plan', label: '生产计划', icon: ClipboardCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-200 shrink-0`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100">
        {!collapsed && (
          <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">
            🍰 备货预测
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`ml-auto p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-transform ${
            collapsed ? 'rotate-180' : ''
          }`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">MVP v0.1.0</div>
          <div className="text-xs text-gray-400">本地离线版</div>
        </div>
      )}
    </aside>
  );
}
