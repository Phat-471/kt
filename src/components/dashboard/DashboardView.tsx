import React from 'react';
import { Client, NormalizedTransaction, ReconciliationPair } from '../../types/accounting';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  GitCompare, 
  FileSpreadsheet, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';
import { SmartAlertPanel } from './SmartAlertPanel';
import { DashboardCharts } from './DashboardCharts';
import { TaxLawPolicyAlertBanner } from '../tax/TaxLawPolicyAlertBanner';
import { TaxDeadlineWidget } from './TaxDeadlineWidget';

interface DashboardViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
  reconciliations: ReconciliationPair[];
  onNavigateTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeClient,
  transactions,
  reconciliations,
  onNavigateTab,
}) => {
  if (!activeClient) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-4">
        <Building2 className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Chưa chọn khách hàng / Job kế toán</h2>
        <p className="text-xs">Vui lòng chọn hoặc thêm mới một công ty khách hàng ở góc trên màn hình để làm việc.</p>
      </div>
    );
  }

  // Calculations
  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const maxVal = Math.max(totalIncome, totalExpense, 1);
  const incomePercent = Math.min(Math.round((totalIncome / maxVal) * 100), 100);
  const expensePercent = Math.min(Math.round((totalExpense / maxVal) * 100), 100);

  const errorCount = transactions.filter(t => t.validationStatus === 'ERROR').length;
  const warningCount = transactions.filter(t => t.validationStatus === 'WARNING').length;
  const approvedCount = transactions.filter(t => t.userApproved).length;

  return (
    <div className="p-4 space-y-4">
      {/* Compact Welcome & Client Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-4 py-3 rounded-2xl border border-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-white">{activeClient.name}</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">MST: {activeClient.taxCode}</span>
            </div>
            <p className="text-[11px] text-slate-300">Niên độ: {activeClient.financialYear} | Địa chỉ: {activeClient.address}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => onNavigateTab('import')}
            className="px-4 py-2.5 bg-white text-brand-800 hover:bg-brand-50 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            <span>Import Excel Mới</span>
          </button>
        </div>
      </div>

      {/* Tax Law Policy Alert */}
      <TaxLawPolicyAlertBanner transactions={transactions} />

      {/* Top 4 Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>TỔNG PHÁT SINH THU</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold tabular-num text-emerald-600 dark:text-emerald-400">{totalIncome.toLocaleString('vi-VN')} đ</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${incomePercent}%` }}></div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">{incomeTxs.length} khoản thu đã ghi sổ</div>
        </div>

        {/* Total Expense */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>TỔNG PHÁT SINH CHI</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold tabular-num text-rose-600 dark:text-rose-400">{totalExpense.toLocaleString('vi-VN')} đ</div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${expensePercent}%` }}></div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">{expenseTxs.length} khoản chi đã ghi sổ</div>
        </div>

        {/* Net Cashflow Balance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>DÒNG TIỀN THUẦN</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              {netBalance >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            </div>
          </div>
          <div className={`text-xl font-extrabold tabular-num ${netBalance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
            {netBalance.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Thu chênh lệch chi tiền mặt/NH</div>
        </div>

        {/* Error Diagnostics Rate */}
        <div
          onClick={() => onNavigateTab('validation')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm cursor-pointer hover:border-amber-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            <span>TRẠNG THÁI KIỂM LỖI</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300">{errorCount} Lỗi / {warningCount} Cảnh báo</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã duyệt: {approvedCount} dòng</span>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => onNavigateTab('import')}
          className="p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Phân hệ 1: Import Excel & Map Cột</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đọc bảng tính Excel, chuẩn hoá danh mục tài khoản Nợ/Có, ngày chứng từ.</p>
        </button>

        <button
          onClick={() => onNavigateTab('validation')}
          className="p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Phân hệ 2: Trình Kiểm Lỗi Chứng Từ</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Phát hiện mất cân đối Nợ/Có, sai Mã số thuế, thiếu thông tin bắt buộc.</p>
        </button>

        <button
          onClick={() => onNavigateTab('reconciliation')}
          className="p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <GitCompare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Phân hệ 3: So Sánh & Khớp Sao Kê</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đối chiếu 2 chiều tự động giữa Phiếu Thu/Chi và Sao kê Ngân hàng.</p>
        </button>
      </div>

      {/* BI Charts Section */}
      <DashboardCharts transactions={transactions} />

      {/* Tax Deadline Countdown Widget */}
      <TaxDeadlineWidget />

      {/* Smart Alert Panel */}
      <SmartAlertPanel transactions={transactions} onNavigateTab={onNavigateTab} />

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Danh Sách 10 Chứng Từ Mới Nhất Trong Sổ Sách</span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[350px]">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3">Ngày CT</th>
                <th className="p-3">Số CT</th>
                <th className="p-3">Diễn giải</th>
                <th className="p-3">TK Nợ/Có</th>
                <th className="p-3 text-right">Số tiền</th>
                <th className="p-3">Trạng thái kiểm lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-200">{t.date}</td>
                  <td className="p-3 text-brand-700 dark:text-brand-300 font-bold">{t.voucherNo}</td>
                  <td className="p-3 max-w-xs truncate">{t.description}</td>
                  <td className="p-3 font-mono text-amber-700 dark:text-amber-300 font-semibold">{t.debitAcc || '---'} / {t.creditAcc || '---'}</td>
                  <td className="p-3 text-right font-bold tabular-num text-slate-900 dark:text-slate-100">{t.amount.toLocaleString('vi-VN')} đ</td>
                  <td className="p-3">
                    {t.validationStatus === 'ERROR' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                        Lỗi nghiêm trọng
                      </span>
                    ) : t.validationStatus === 'WARNING' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                        Cảnh báo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                        Hợp lệ
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
