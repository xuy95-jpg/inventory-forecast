'use client';

import { useState } from 'react';
import ManualEntryForm from '@/components/data-entry/ManualEntryForm';
import CsvImporter from '@/components/data-entry/CsvImporter';
import DataTable from '@/components/data-entry/DataTable';

export default function DataEntryPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'history'>('manual');

  const tabs = [
    { key: 'manual' as const, label: '✏️ 手动录入' },
    { key: 'csv' as const, label: '📁 CSV导入' },
    { key: 'history' as const, label: '📋 历史数据' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">数据录入</h1>
        <p className="text-sm text-gray-500 mt-1">录入每日销售与库存数据</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'manual' && <ManualEntryForm />}
      {activeTab === 'csv' && <CsvImporter />}
      {activeTab === 'history' && <DataTable />}
    </div>
  );
}
