'use client';

import PlanTable from '@/components/production-plan/PlanTable';

export default function ProductionPlanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">生产计划确认</h1>
        <p className="text-sm text-gray-500 mt-1">AI预测 → 调整 → 确认 → 进入库存系统</p>
      </div>

      <PlanTable />
    </div>
  );
}
