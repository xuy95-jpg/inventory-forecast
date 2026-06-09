'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, Check, X, AlertTriangle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { parseSalesCsv, CsvParseResult, generateCsvTemplate } from '@/lib/csv-parser';
import { SalesRecord } from '@/types';
import { generateId } from '@/lib/helpers';

export default function CsvImporter() {
  const { stores, skus, getStoreByCode, getSkuByName, importSalesRecords } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage('正在解析...');

    try {
      const result = await parseSalesCsv(file);
      setParseResult(result);
      setImportMessage('');
    } catch (err) {
      setImportMessage(`解析失败: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  const handleImport = () => {
    if (!parseResult || parseResult.data.length === 0) return;

    const records: SalesRecord[] = [];
    const skipped: string[] = [];

    for (const row of parseResult.data) {
      const store = getStoreByCode(row.storeCode);
      if (!store) {
        skipped.push(`未知门店编码: ${row.storeCode}`);
        continue;
      }

      const sku = getSkuByName(row.skuName);
      if (!sku) {
        skipped.push(`未知SKU: ${row.skuName}`);
        continue;
      }

      const id = `sales-${row.date}-${store.id}-${sku.id}`;
      const now = new Date().toISOString();
      records.push({
        id,
        date: row.date,
        storeId: store.id,
        skuId: sku.id,
        salesQuantity: row.salesQuantity,
        stockQuantity: row.stockQuantity,
        actualProduction: row.actualProduction ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    importSalesRecords(records);

    const msg = `✅ 成功导入 ${records.length} 条记录`;
    if (skipped.length > 0) {
      setImportMessage(`${msg}，${skipped.length} 条跳过:\n${skipped.join('\n')}`);
    } else {
      setImportMessage(msg);
    }

    setParseResult(null);
  };

  const handleDownloadTemplate = () => {
    const csv = generateCsvTemplate();
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '销售数据导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={16} /> CSV 导入
        </h3>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Download size={14} />
          下载模板
        </button>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload size={28} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">点击选择 CSV 文件</p>
        <p className="text-xs text-gray-400 mt-1">
          支持列：日期, 门店编码, SKU名称, 当日销量, 当日盘点库存, 实际生产量（可选）
        </p>
      </div>

      {importing && <p className="text-sm text-blue-600">正在解析文件...</p>}

      {/* Parse result preview */}
      {parseResult && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              解析完成：
              <span className="text-green-600 font-medium">{parseResult.meta.validRows} 条有效</span>
              {parseResult.meta.errorRows > 0 && (
                <span className="text-red-500 font-medium ml-2">
                  {parseResult.meta.errorRows} 条错误
                </span>
              )}
            </span>
          </div>

          {/* Error details */}
          {parseResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
              {parseResult.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-600 flex items-start gap-1">
                  <X size={12} className="shrink-0 mt-0.5" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview table */}
          {parseResult.data.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500">日期</th>
                    <th className="px-3 py-2 text-left text-gray-500">门店编码</th>
                    <th className="px-3 py-2 text-left text-gray-500">SKU</th>
                    <th className="px-3 py-2 text-right text-gray-500">销量</th>
                    <th className="px-3 py-2 text-right text-gray-500">库存</th>
                    <th className="px-3 py-2 text-right text-gray-500">生产量</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.data.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-700">{row.date}</td>
                      <td className="px-3 py-1.5 text-gray-700">{row.storeCode}</td>
                      <td className="px-3 py-1.5 text-gray-700">{row.skuName}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{row.salesQuantity}</td>
                      <td className="px-3 py-1.5 text-right text-gray-700">{row.stockQuantity}</td>
                      <td className="px-3 py-1.5 text-right text-gray-400">{row.actualProduction ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.data.length > 10 && (
                <div className="text-xs text-gray-400 text-center py-2 bg-gray-50">
                  ... 还有 {parseResult.data.length - 10} 条记录
                </div>
              )}
            </div>
          )}

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={parseResult.data.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={14} />
            确认导入 {parseResult.data.length} 条记录
          </button>
        </div>
      )}

      {importMessage && (
        <div className={`text-sm whitespace-pre-line ${
          importMessage.includes('跳过') ? 'text-amber-600' : 'text-green-600'
        }`}>
          {importMessage.includes('跳过') && <AlertTriangle size={14} className="inline mr-1" />}
          {importMessage}
        </div>
      )}
    </div>
  );
}
