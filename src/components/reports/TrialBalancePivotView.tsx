import React, { useState, useMemo } from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import { calculateTrialBalance, TrialBalanceReport } from '../../services/trialBalancePivotEngine';
import { Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageHeader, SearchBar } from '../common';

interface TrialBalancePivotViewProps {
  transactions: NormalizedTransaction[];
  activeClient: Client | null;
}

export const TrialBalancePivotView: React.FC<TrialBalancePivotViewProps> = ({
  transactions,
  activeClient,
}) => {
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const report: TrialBalanceReport = useMemo(() => {
    return calculateTrialBalance(transactions, periodFrom || undefined, periodTo || undefined);
  }, [transactions, periodFrom, periodTo]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return report.rows;
    const term = searchTerm.toLowerCase();
    return report.rows.filter(
      r => r.accountCode.toLowerCase().includes(term) || r.accountName.toLowerCase().includes(term)
    );
  }, [report.rows, searchTerm]);

  const fmt = (n: number) => (n > 0 ? n.toLocaleString('vi-VN') : '—');

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        variant="gradient"
        icon={Scale}
        title="Bảng Cân Đối Phát Sinh Tài Khoản (Pivot TT200)"
        subtitle={`Tự động tổng hợp số dư đầu kỳ, phát sinh Nợ/Có và dư cuối kỳ tài khoản cấp 1 - cấp 2${activeClient ? ` — ${activeClient.name}` : ''}`}
        actions={
          report.isBalanced ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> CÂN BẰNG NỢ / CÓ
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 border border-rose-400/30 text-rose-200 rounded-xl text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> LỖI Còn
            </div>
          )
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm mã TK hoặc tên TK..."
            className="w-56"
          />
          <div className="flex items-center gap-1 text-slate-500">
            <span>Từ:</span>
            <input
              type="date"
              value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <span>Đến:</span>
            <input
              type="date"
              value={periodTo}
              onChange={e => setPeriodTo(e.target.value)}
              className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="text-slate-500 font-bold">
          Tổng số: <strong className="text-slate-900 dark:text-slate-100">{filteredRows.length}</strong> tài khoản
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[900px] border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
              <tr>
                <th rowSpan={2} className="p-3 border-r border-slate-200 dark:border-slate-800 w-[80px]">Mã TK</th>
                <th rowSpan={2} className="p-3 border-r border-slate-200 dark:border-slate-800">Tên Tài Khoản</th>
                <th colSpan={2} className="p-2 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/50">Số Dư Đầu Kỳ</th>
                <th colSpan={2} className="p-2 text-center border-b border-r border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900/50">Số Phát Sinh Trong Kỳ</th>
                <th colSpan={2} className="p-2 text-center bg-slate-200/50 dark:bg-slate-900/50">Số Dư Cuối Kỳ</th>
              </tr>
              <tr className="bg-slate-100 dark:bg-slate-950 text-[10px]">
                <th className="p-2 text-right w-[110px] border-r border-slate-200 dark:border-slate-800">Nợ</th>
                <th className="p-2 text-right w-[110px] border-r border-slate-200 dark:border-slate-800">Có</th>
                <th className="p-2 text-right w-[120px] border-r border-slate-200 dark:border-slate-800">Nợ</th>
                <th className="p-2 text-right w-[120px] border-r border-slate-200 dark:border-slate-800">Có</th>
                <th className="p-2 text-right w-[120px] border-r border-slate-200 dark:border-slate-800">Nợ</th>
                <th className="p-2 text-right w-[120px]">Có</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRows.map((r) => {
                const isLevel1 = r.accountLevel === 1;
                return (
                  <tr
                    key={r.accountCode}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isLevel1 ? 'font-bold bg-slate-50/50 dark:bg-slate-800/20' : 'pl-4'
                      }`}
                  >
                    <td className="p-2.5 font-mono text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800 font-bold">{r.accountCode}</td>
                    <td className="p-2.5 border-r border-slate-100 dark:border-slate-800">{r.accountName}</td>
                    <td className="p-2.5 text-right tabular-num border-r border-slate-100 dark:border-slate-800">{fmt(r.openingDebit)}</td>
                    <td className="p-2.5 text-right tabular-num border-r border-slate-100 dark:border-slate-800">{fmt(r.openingCredit)}</td>
                    <td className="p-2.5 text-right tabular-num text-amber-700 dark:text-amber-400 font-semibold border-r border-slate-100 dark:border-slate-800">{fmt(r.periodDebit)}</td>
                    <td className="p-2.5 text-right tabular-num text-indigo-700 dark:text-indigo-400 font-semibold border-r border-slate-100 dark:border-slate-800">{fmt(r.periodCredit)}</td>
                    <td className="p-2.5 text-right tabular-num text-emerald-700 dark:text-emerald-400 font-extrabold border-r border-slate-100 dark:border-slate-800">{fmt(r.closingDebit)}</td>
                    <td className="p-2.5 text-right tabular-num text-rose-700 dark:text-rose-400 font-extrabold">{fmt(r.closingCredit)}</td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Không có dữ liệu tài khoản</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-emerald-50 dark:bg-emerald-950/40 font-extrabold border-t-2 border-emerald-500/30 text-xs">
              <tr>
                <td colSpan={2} className="p-3 text-right text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">CỘNG TOÀN BỘ TÀI KHOẢN:</td>
                <td className="p-3 text-right tabular-num">{fmt(report.totalOpeningDebit)}</td>
                <td className="p-3 text-right tabular-num">{fmt(report.totalOpeningCredit)}</td>
                <td className="p-3 text-right tabular-num text-amber-700 dark:text-amber-300">{fmt(report.totalPeriodDebit)}</td>
                <td className="p-3 text-right tabular-num text-indigo-700 dark:text-indigo-300">{fmt(report.totalPeriodCredit)}</td>
                <td className="p-3 text-right tabular-num text-emerald-700 dark:text-emerald-300">{fmt(report.totalClosingDebit)}</td>
                <td className="p-3 text-right tabular-num text-rose-700 dark:text-rose-300">{fmt(report.totalClosingCredit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
