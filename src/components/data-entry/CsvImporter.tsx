'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, Check, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { parseSalesCsv, CsvParseResult, generateCsvTemplate } from '@/lib/csv-parser';
import { SalesRecord } from '@/types';

export default function CsvImporter() {
  const { stores, skus, addSalesRecords } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try { const r = await parseSalesCsv(file); setParseResult(r); }
    catch { setMessage('解析失败'); }
    finally { setImporting(false); }
  };

  const handleImport = () => {
    if (!parseResult?.data.length) return;
    const records: Omit<SalesRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    const skipped: string[] = [];

    for (const row of parseResult.data) {
      const store = stores.find(s => s.code === row.storeCode);
      if (!store) { skipped.push('未知门店: ' + row.storeCode); continue; }
      const sku = skus.find(s => s.name === row.skuName);
      if (!sku) { skipped.push('未知SKU: ' + row.skuName); continue; }
      records.push({ date: row.date, storeId: store.id, skuId: sku.id, salesQuantity: row.salesQuantity, cutStock: 0, wholeStock: Math.round(row.stockQuantity / 6) });
    }

    addSalesRecords(records);
    setMessage('✅ 导入 ' + records.length + ' 条' + (skipped.length ? '，' + skipped.length + ' 条跳过' : ''));
    setParseResult(null);
  };

  const downloadTemplate = () => {
    const csv = generateCsvTemplate();
    const b = new Blob(['﻿' + csv], { type: 'text/csv' });
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = '模板.csv'; a.click(); URL.revokeObjectURL(u);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><FileText size={16} /> CSV 导入</h3>
        <button onClick={downloadTemplate} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"><Download size={14} /> 下载模板</button>
      </div>
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <Upload size={28} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">点击选择 CSV 文件</p>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      </div>
      {parseResult && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">解析完成: <span className="text-green-600 font-medium">{parseResult.meta.validRows} 条有效</span>
            {parseResult.meta.errorRows > 0 && <span className="text-red-500 ml-2">{parseResult.meta.errorRows} 条错误</span>}</div>
          {parseResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto text-xs text-red-600">
              {parseResult.errors.map((e,i) => <div key={i} className="flex items-start gap-1"><X size={12} className="mt-0.5"/>{e}</div>)}
            </div>
          )}
          <button onClick={handleImport} disabled={!parseResult.data.length}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><Check size={14} /> 确认导入 {parseResult.data.length} 条</button>
        </div>
      )}
      {message && <div className="text-sm text-green-600">{message}</div>}
    </div>
  );
}
