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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          <span>Cấu Hình Tỷ Lệ & Tham Số Tính Toán</span>
        </h3>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Tổng Quỹ Lương Đóng BHXH (VND/tháng)</label>
            <input
              type="number"
              value={grossPayroll}
              onChange={(e) => onGrossPayrollChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Số Lượng Đoàn Viên</label>
              <input
                type="number"
                value={memberCount}
                onChange={(e) => onMemberCountChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Lương Bình Quân Đoàn Viên</label>
              <input
                type="number"
                value={avgSalary}
                onChange={(e) => onAvgSalaryChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Mức Đóng Đoàn Phí</label>
              <select
                value={doanPhiRate}
                onChange={(e) => onDoanPhiRateChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value={0.005}>0.5% (Theo QĐ 61/QĐ-TLĐ mới)</option>
                <option value={0.01}>1% (Mức trước đây)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Tỷ Lệ Giữ Lại Đoàn Phí Tại CĐCS</label>
              <select
                value={doanPhiRetainedRate}
                onChange={(e) => onDoanPhiRetainedRateChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value={0.70}>70% giữ lại (Nộp cấp trên 30%)</option>
                <option value={0.60}>60% giữ lại (Nộp cấp trên 40%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-400" />
          <span>Kết Quả Phân Bổ Ngân Sách Công Đoàn</span>
        </h3>

        <div className="space-y-3 text-sm">
          <div className="p-3 bg-slate-800/50 rounded-lg flex justify-between">
            <span>1. Kinh Phí Công Đoàn 2%:</span>
            <strong className="text-slate-100">{formatNumber(budgetCalc.kpcdTotal)} đ</strong>
          </div>
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex justify-between text-emerald-300">
            <span>- Giữ lại CĐCS (75% KPCĐ):</span>
            <strong>{formatNumber(budgetCalc.kpcdRetained)} đ</strong>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg flex justify-between">
            <span>2. Đoàn Phí Công Đoàn ({doanPhiRate * 100}%):</span>
            <strong className="text-slate-100">{formatNumber(budgetCalc.doanPhiTotal)} đ</strong>
          </div>
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex justify-between text-emerald-300">
            <span>- Giữ lại CĐCS ({doanPhiRetainedRate * 100}% Đoàn phí):</span>
            <strong>{formatNumber(budgetCalc.doanPhiRetained)} đ</strong>
          </div>
          <div className="p-4 bg-cyan-950/50 border border-cyan-700/50 rounded-xl flex justify-between text-cyan-300 text-base font-bold">
            <span>TỔNG QUỸ HOẠT ĐỘNG CĐCS ĐƯỢC DÙNG:</span>
            <span>{formatNumber(budgetCalc.totalUnionBudget)} đ</span>
          </div>
          <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg flex justify-between text-rose-300">
            <span>Tổng phải nộp Liên đoàn Lao động cấp trên:</span>
            <strong>{formatNumber(budgetCalc.totalPayableSuperior)} đ</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
