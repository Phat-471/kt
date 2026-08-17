import React from 'react';
import { Calculator, Coins } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface UnionCalculatorTabProps {
  grossPayroll: number;
  onGrossPayrollChange: (val: number) => void;
  memberCount: number;
  onMemberCountChange: (val: number) => void;
  avgSalary: number;
  onAvgSalaryChange: (val: number) => void;
  doanPhiRate: number;
  onDoanPhiRateChange: (val: number) => void;
  doanPhiRetainedRate: number;
  onDoanPhiRetainedRateChange: (val: number) => void;
  budgetCalc: {
    kpcdTotal: number;
    kpcdRetained: number;
    doanPhiTotal: number;
    doanPhiRetained: number;
    totalUnionBudget: number;
    totalPayableSuperior: number;
  };
}

export const UnionCalculatorTab: React.FC<UnionCalculatorTabProps> = ({
  grossPayroll,
  onGrossPayrollChange,
  memberCount,
  onMemberCountChange,
  avgSalary,
  onAvgSalaryChange,
  doanPhiRate,
  onDoanPhiRateChange,
  doanPhiRetainedRate,
  onDoanPhiRetainedRateChange,
  budgetCalc,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span>Tham Số Tính Toán & Tỷ Lệ Trích Nộp</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Tổng Quỹ Lương Đóng BHXH (đ/tháng)</label>
            <input
              type="number"
              value={grossPayroll}
              onChange={(e) => onGrossPayrollChange(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Số Lượng Đoàn Viên</label>
              <input
                type="number"
                value={memberCount}
                onChange={(e) => onMemberCountChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Lương Bình Quân Đoàn Viên</label>
              <input
                type="number"
                value={avgSalary}
                onChange={(e) => onAvgSalaryChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mức Đóng Đoàn Phí</label>
              <select
                value={doanPhiRate}
                onChange={(e) => onDoanPhiRateChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value={0.005}>0.5% (QĐ 61/QĐ-TLĐ)</option>
                <option value={0.01}>1% (Mức cũ)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Tỷ Lệ CĐCS Giữ Lại</label>
              <select
                value={doanPhiRetainedRate}
                onChange={(e) => onDoanPhiRetainedRateChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value={0.70}>70% giữ lại (Nộp 30%)</option>
                <option value={0.60}>60% giữ lại (Nộp 40%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Kết Quả Phân Bổ Ngân Sách</span>
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between border border-slate-100">
            <span className="text-slate-600">1. Kinh Phí Công Đoàn 2%:</span>
            <strong className="text-slate-900">{formatNumber(budgetCalc.kpcdTotal)} đ</strong>
          </div>
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg flex justify-between text-emerald-800">
            <span>- Giữ lại CĐCS (75%):</span>
            <strong className="font-bold">{formatNumber(budgetCalc.kpcdRetained)} đ</strong>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between border border-slate-100">
            <span className="text-slate-600">2. Đoàn Phí Công Đoàn ({doanPhiRate * 100}%):</span>
            <strong className="text-slate-900">{formatNumber(budgetCalc.doanPhiTotal)} đ</strong>
          </div>
          <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg flex justify-between text-emerald-800">
            <span>- Giữ lại CĐCS ({doanPhiRetainedRate * 100}%):</span>
            <strong className="font-bold">{formatNumber(budgetCalc.doanPhiRetained)} đ</strong>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between text-blue-900 text-sm font-bold shadow-sm">
            <span>TỔNG QUỸ CĐCS ĐƯỢC DÙNG:</span>
            <span>{formatNumber(budgetCalc.totalUnionBudget)} đ</span>
          </div>
          <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-lg flex justify-between text-rose-800">
            <span>Tổng phải nộp Công đoàn cấp trên:</span>
            <strong className="font-bold">{formatNumber(budgetCalc.totalPayableSuperior)} đ</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
