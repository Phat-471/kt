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
  CheckCircle2,
  BookMarked,
  BarChart3
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';
import { SmartAlertPanel } from './SmartAlertPanel';
import { DashboardCharts } from './DashboardCharts';
import { TaxLawPolicyAlertBanner } from '../tax/TaxLawPolicyAlertBanner';
import { TaxDeadlineWidget } from './TaxDeadlineWidget';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PageHeader, StatCard, EmptyState, StatusBadge } from '../common';

interface DashboardViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
  reconciliations: ReconciliationPair[];
  onNavigateTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeClient,
  transactions,
  reconciliations: _reconciliations,
  onNavigateTab,
}) => {
  if (!activeClient) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Building2}
          title="Chưa chọn khách hàng / Job kế toán"
          description="Vui lòng chọn hoặc thêm mới một công ty khách hàng ở góc trên màn hình để bắt đầu làm việc."
        />
      </div>
    );
  }

  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const errorCount = transactions.filter(t => t.validationStatus === 'ERROR').length;
  const warningCount = transactions.filter(t => t.validationStatus === 'WARNING').length;
  const approvedCount = transactions.filter(t => t.userApproved).length;

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        variant="gradient"
        icon={Sparkles}
        title={activeClient.name}
        badgeText={`MST: ${activeClient.taxCode}`}
        subtitle={`Niên độ: ${activeClient.financialYear} | Địa chỉ: ${activeClient.address}`}
        actions={
          <button
            onClick={() => onNavigateTab('import')}
            className="px-4 py-2.5 bg-white text-brand-800 hover:bg-brand-50 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            <span>Import Excel Mới</span>
          </button>
        }
      />

      <TaxLawPolicyAlertBanner transactions={transactions} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="TỔNG PHÁT SINH THU"
          value={`${formatCurrency(totalIncome)} đ`}
          subtext={`${incomeTxs.length} khoản thu đã ghi sổ`}
          icon={TrendingUp}
          variant="emerald"
        />

        <StatCard
          label="TỔNG PHÁT SINH CHI"
          value={`${formatCurrency(totalExpense)} đ`}
          subtext={`${expenseTxs.length} khoản chi đã ghi sổ`}
          icon={TrendingDown}
          variant="rose"
        />

        <StatCard
          label="DÒNG TIỀN THUẦN"
          value={`${formatCurrency(netBalance)} đ`}
          subtext="Thu chênh lệch chi tiền mặt/NH"
          icon={netBalance >= 0 ? ArrowUpRight : ArrowDownRight}
          variant={netBalance >= 0 ? 'blue' : 'rose'}
        />

        <StatCard
          label="TRẠNG THÁI KIỂM LỖI"
          value={`${errorCount} Lỗi / ${warningCount} Cảnh báo`}
          subtext={`Đã duyệt: ${approvedCount} dòng`}
          icon={ShieldAlert}
          variant={errorCount > 0 ? 'rose' : warningCount > 0 ? 'amber' : 'emerald'}
          onClick={() => onNavigateTab('validation')}
          badge={
            approvedCount > 0 ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> {approvedCount}
              </span>
            ) : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateTab('import')}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Bước 1: Nạp Excel / XML</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">Đọc bảng tính Excel & hóa đơn điện tử XML, tự động nhận diện tài khoản.</p>
        </button>

        <button
          onClick={() => onNavigateTab('validation')}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Bước 2: Kiểm Lỗi Chứng Từ</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">Phát hiện mất cân đối Nợ/Có, rủi ro MST bỏ trốn & thanh toán ≥20tr tiền mặt.</p>
        </button>

        <button
          onClick={() => onNavigateTab('accounting-ledger')}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookMarked className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Bước 3: Sổ Sách Kế Toán</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">Xem Sổ Nhật ký chung (S03a), Sổ cái từng tài khoản, Sổ chi tiết & in ấn PDF.</p>
        </button>

        <button
          onClick={() => onNavigateTab('financial-reports')}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-left transition-all duration-200 space-y-2 group cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Bước 4: Báo Cáo Tài Chính</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">Sinh tự động Bảng CĐKT B01-DN, KQKD B02-DN, Lưu chuyển tiền B03-DN & Thuyết minh.</p>
        </button>
      </div>

      <DashboardCharts transactions={transactions} />

      <TaxDeadlineWidget />

      <SmartAlertPanel transactions={transactions} onNavigateTab={onNavigateTab} />

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
                  <td className="p-3 text-right font-bold tabular-num text-slate-900 dark:text-slate-100">{formatNumber(t.amount)} đ</td>
                  <td className="p-3">
                    <StatusBadge status={t.validationStatus} />
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
