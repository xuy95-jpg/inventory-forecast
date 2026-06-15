const XLSX = require('xlsx');
const fs = require('fs');
function s2d(s) { const d = new Date((s - 25569) * 86400 * 1000); return d.toISOString().split('T')[0]; }
function pad(i) { return String(i+1).padStart(3,'0'); }

// Read old data
const wb1 = XLSX.readFile('C:/Users/Administrator/Downloads/nana生产计划杭州.xlsx');
const oldDay = XLSX.utils.sheet_to_json(wb1.Sheets['武林路当日'], { header: 1, defval: '' });
const dateCols = [];
for (let c = 1; c <= 200; c++) {
  const d = s2d(oldDay[1]?.[c]);
  if (d && d >= '2025-12-01') dateCols.push({ col: c, date: d });
}

// Only keep active products (has sales OR stock)
const activeProducts = [];
for (let r = 2; r < oldDay.length; r++) {
  const rawName = (oldDay[r][0] || '').toString().trim();
  if (!rawName || rawName === '销售额') continue;
  // Skip header rows (date serials as names)
  if (/^\d+$/.test(rawName)) continue;

  const cleanName = rawName.replace(/（.+）/g, '').trim();
  if (activeProducts.find(p => p.name === cleanName)) continue;
  if (!cleanName) continue;

  const cut = Number(oldDay[r][1]) || 0;
  const whole = Number(oldDay[r][2]) || 0;
  const sales = {};
  dateCols.forEach(dc => { const v = Number(oldDay[r][dc.col]) || 0; if (v > 0) sales[dc.date] = v; });
  const added = Number(oldDay[r][7]) || 0;
  const salesDays = Object.keys(sales).length;

  // Filter: must have stock OR meaningful sales history (>5 days)
  const hasStock = cut > 0 || whole > 0 || added > 0;
  const hasHistory = salesDays > 5;
  const isOMSub = cleanName.toUpperCase().startsWith('OM') && cleanName.toUpperCase() !== 'OMAKASE';
  const isZombieRow = !hasStock && !hasHistory;

  if (!isZombieRow && !isOMSub) {
    activeProducts.push({ name: cleanName, cut, whole, added, sales });
  }
}

// Read new data (6.4-6.9) - only add to existing active products
const wb2 = XLSX.readFile('C:/Users/Administrator/Desktop/6.4-6.10数据.xlsx');
const newData = XLSX.utils.sheet_to_json(wb2.Sheets['Sheet1'], { header: 1, defval: '' });
const newDates = [46177,46178,46179,46180,46181,46182].map(s2d);
for (let r = 2; r < newData.length; r++) {
  const name = (newData[r][6] || '').toString().trim();
  if (!name || name === '销售额') continue;
  if (/^\d+$/.test(name)) continue;
  const cleanName = name.replace(/（.+）/g, '').trim();
  let p = activeProducts.find(p => p.name === cleanName);
  if (!p) continue; // only merge into existing products, don't create zombies
  [0,1,2,3,4,5].forEach(c => {
    const v = Number(newData[r][c]) || 0;
    if (v > 0) p.sales[newDates[c]] = v;
  });
}

console.log('Active products:', activeProducts.length);
activeProducts.forEach(p => {
  const salesDays = Object.keys(p.sales).length;
  const st = [];
  if (p.cut > 0) st.push('切' + p.cut);
  if (p.whole > 0) st.push('整' + p.whole);
  console.log('  ' + p.name.padEnd(12) + ' | 销售天数:' + String(salesDays).padStart(3) + ' | 库存:' + (st.join('+') || '0') + ' | 手工添加:' + p.added);
});

// ====== GENERATE FILES ======

// 1. SKUs
let skuCode = 'import { Sku } from "@/types";\n\nexport const mockSkus: Sku[] = [\n';
activeProducts.forEach((p, i) => {
  const nm = p.name;
  let cat = '6寸巴斯克', unit = '个', sl = 5;
  if (nm.toUpperCase() === 'OMAKASE') { cat = 'OMAKASE'; unit = '份'; sl = 2; }
  else if (nm.toUpperCase().startsWith('OM')) { cat = 'OMAKASE'; unit = '个'; sl = 2; }
  else if (nm.includes('罐罐')) { cat = '罐罐'; unit = '罐'; sl = 5; }
  skuCode += '  { id: "sku-' + pad(i) + '", name: "' + nm + '", category: "' + cat + '", shelfLife: ' + sl + ', unit: "' + unit + '" },\n';
});
skuCode += '];\n';
fs.writeFileSync('src/data/mock-skus.ts', skuCode);

// 2. Store
fs.writeFileSync('src/data/mock-stores.ts', 'import { Store } from "@/types";\n\nexport const mockStores: Store[] = [\n  { id: "store-001", name: "武林路", code: "HZ_WLL", region: "杭州" },\n];\n');

// 3. Sales
const allDates = [...new Set(activeProducts.flatMap(p => Object.keys(p.sales)))].sort();
let salesCode = 'import { SalesRecord } from "@/types";\n\n';
salesCode += '// ' + allDates[0] + ' ~ ' + allDates[allDates.length-1] + ' (' + activeProducts.length + ' SKU)\n\n';
salesCode += 'export const mockSalesRecords: SalesRecord[] = [\n';
let count = 0;
activeProducts.forEach((p, i) => {
  const skuId = 'sku-' + pad(i);
  Object.entries(p.sales).forEach(([date, qty]) => {
    const stockTotal = Math.round(qty * 1.3 + 2);
    const ws = Math.floor(stockTotal / 6);
    const cs = stockTotal - ws * 6;
    salesCode += '  { id: "sales-' + date + '-store-001-' + skuId + '", date: "' + date + '", storeId: "store-001", skuId: "' + skuId + '", salesQuantity: ' + qty + ', cutStock: ' + cs + ', wholeStock: ' + ws + ', createdAt: "' + date + 'T22:00:00.000Z", updatedAt: "' + date + 'T22:00:00.000Z" },\n';
    count++;
  });
});
salesCode += '];\n';
fs.writeFileSync('src/data/mock-sales.ts', salesCode);

// 4. Inventory
let invCode = 'import { InventoryBatch } from "@/types";\n\n';
invCode += '// 整模 + 切角分开追踪\n\n';
invCode += 'export const mockInventoryBatches: InventoryBatch[] = [\n';
let bn = 0;
activeProducts.forEach((p, i) => {
  const skuId = 'sku-' + pad(i);
  let sl = 5;
  if (p.name.toUpperCase() === 'OMAKASE' || p.name.toUpperCase().startsWith('OM')) sl = 2;
  if (p.whole > 0) { bn++;
    const exp = new Date('2026-06-10'); exp.setDate(exp.getDate() + sl);
    invCode += '  { id: "batch-' + String(bn).padStart(3,'0') + '", skuId: "' + skuId + '", storeId: "store-001", productionDate: "2026-06-08", quantity: ' + p.whole + ', remainingQuantity: ' + p.whole + ', shelfLife: ' + sl + ', expiryDate: "' + exp.toISOString().split('T')[0] + '", batchType: "whole" },\n';
  }
  if (p.cut > 0) { bn++;
    const exp = new Date('2026-06-10'); exp.setDate(exp.getDate() + sl);
    invCode += '  { id: "batch-' + String(bn).padStart(3,'0') + '", skuId: "' + skuId + '", storeId: "store-001", productionDate: "2026-06-08", quantity: ' + p.cut + ', remainingQuantity: ' + p.cut + ', shelfLife: ' + sl + ', expiryDate: "' + exp.toISOString().split('T')[0] + '", batchType: "cut" },\n';
  }
});
invCode += '];\n';
fs.writeFileSync('src/data/mock-inventory.ts', invCode);

console.log('\nProducts:', activeProducts.length, 'Sales:', count, 'Batches:', bn, 'Date range:', allDates[0], '~', allDates[allDates.length-1]);
