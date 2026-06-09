import Papa from 'papaparse';
import { CsvImportRow } from '@/types';

/**
 * CSV 导入工具
 *
 * 支持的CSV格式：
 * 日期,门店编码,SKU名称,当日销量,当日盘点库存,实际生产量（可选）
 *
 * 示例：
 * 2026-06-01,HZ_MXC,百香果巴斯克,15,5,18
 */

export interface CsvParseResult {
  success: boolean;
  data: CsvImportRow[];
  errors: string[];
  meta: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

export function parseSalesCsv(file: File): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const data: CsvImportRow[] = [];
        const errors: string[] = [];

        for (let i = 0; i < results.data.length; i++) {
          const row = results.data[i] as Record<string, string>;
          try {
            const importRow = validateAndMapRow(row, i + 2); // +2 for header + 0-index
            data.push(importRow);
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '未知错误';
            errors.push(`第 ${i + 2} 行: ${message}`);
          }
        }

        resolve({
          success: errors.length === 0,
          data,
          errors,
          meta: {
            totalRows: results.data.length,
            validRows: data.length,
            errorRows: errors.length,
          },
        });
      },
      error: (err) => {
        resolve({
          success: false,
          data: [],
          errors: [`CSV解析失败: ${err.message}`],
          meta: { totalRows: 0, validRows: 0, errorRows: 0 },
        });
      },
    });
  });
}

function validateAndMapRow(row: Record<string, string>, lineNumber: number): CsvImportRow {
  // 支持中英文列名
  const date = row['日期'] || row['date'] || '';
  const storeCode = row['门店编码'] || row['storeCode'] || row['store_code'] || '';
  const skuName = row['SKU名称'] || row['skuName'] || row['sku_name'] || '';
  const salesStr = row['当日销量'] || row['salesQuantity'] || row['sales'] || '0';
  const stockStr = row['当日盘点库存'] || row['stockQuantity'] || row['stock'] || '0';
  const prodStr = row['实际生产量'] || row['actualProduction'] || row['production'] || '';

  if (!date) throw new Error('缺少日期');
  if (!storeCode) throw new Error('缺少门店编码');
  if (!skuName) throw new Error('缺少SKU名称');

  const salesQuantity = Number(salesStr);
  const stockQuantity = Number(stockStr);

  if (isNaN(salesQuantity) || salesQuantity < 0) throw new Error(`销量无效: ${salesStr}`);
  if (isNaN(stockQuantity) || stockQuantity < 0) throw new Error(`库存无效: ${stockStr}`);

  // 验证日期格式
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`日期格式错误: ${date}`);

  const result: CsvImportRow = {
    date,
    storeCode,
    skuName,
    salesQuantity,
    stockQuantity,
  };

  if (prodStr && prodStr.trim() !== '') {
    const prod = Number(prodStr);
    if (isNaN(prod) || prod < 0) throw new Error(`生产量无效: ${prodStr}`);
    result.actualProduction = prod;
  }

  return result;
}

/** 生成CSV模板用于下载 */
export function generateCsvTemplate(): string {
  const headers = ['日期', '门店编码', 'SKU名称', '当日销量', '当日盘点库存', '实际生产量'];
  const example = ['2026-06-01', 'HZ_MXC', '百香果巴斯克', '15', '5', '18'];
  return Papa.unparse([headers, example]);
}
