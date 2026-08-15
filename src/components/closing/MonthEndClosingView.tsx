import React, { useState } from 'react';
import { NormalizedTransaction, ReconciliationPair, Client } from '../../types/accounting';
import { auditMonthEndClosing as runAudit } from '../../services/monthEndClosingService';
import { exportMonthEndClosingPDF } from '../../services/closingPdfExporter';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Eye,
  CalendarCheck,
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';

interface MonthEndClosingViewProps {
  transactions: NormalizedTransaction[];
  reconciliations?: ReconciliationPair[];
  activeClient?: Client | null;
  onNavigateTab: (tab: TabType) => void;
  onQuickBackup?: () => void;
}

export const MonthEndClosingView: React.FC<MonthEndClosingViewProps> = ({
  transactions,
  reconciliations = [],
  activeClient = null,
  onNavigateTab,
}) => {
  const [isLocked, setIsLocked] = useState(false);
  const auditResult = runAudit(transactions, reconciliations);

  const getStatusBadge = (status: 'PASSED' | 'FAILED' | 'WARNING') => {
    switch (status) {
      case 'PASSED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> DAT
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> LOI
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> CANH BAO
          </span>
        );
    }
  };

  const getRiskBadge = (risk: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (risk) {
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">CAO</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">VỪA</span>;
      case 'LOW':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">THẤP</span>;
    }
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Lock className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
              <span>Màn Hình Khóa Sổ Tháng & Checklist Tự Động</span>
              <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full text-white font-bold">
                Kỳ {auditResult.periodMonth}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Tự động audit 10 điều kiện tiên quyết trước khi nghiệm thu & nộp báo cáo thuế</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportMonthEndClosingPDF(activeClient, auditResult)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Xuất Biên Bản Khóa Sổ PDF 📄</span>
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            disabled={!auditResult.isReadyToClose}
            className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
              isLocked
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : auditResult.isReadyToClose
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isLocked ? '🔓 Mở Khóa Sổ Sổ Kỳ Này' : '🔒 Khóa Sổ Tháng Ngay'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-2xl border shadow-sm flex items-center gap-3 ${
          auditResult.isReadyToClose
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30'
            : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
            auditResult.isReadyToClose ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            {auditResult.isReadyToClose ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng Thái Khóa Sổ</div>
            <div className={`text-xs font-extrabold mt-0.5 ${
              auditResult.isReadyToClose ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
            }`}>
              {auditResult.isReadyToClose ? 'HOÀN THÀNH (SẮN SÀNG)' : 'CHƯA HOÀN THÀNH (CẦN XỬ LÝ)'}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mức Độ Rủi Ro Tổng Thể</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-extrabold ${
              auditResult.overallRiskLevel === 'HIGH' ? 'text-rose-600' : auditResult.overallRiskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              MỨC RỦI RO {auditResult.overallRiskLevel === 'HIGH' ? 'CAO 🔴' : auditResult.overallRiskLevel === 'MEDIUM' ? 'VỪA 🟡' : 'THẤP 🟢'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu Chí Đã Đạt</div>
          <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 tabular-nums">
            {auditResult.passedRulesCount} / {auditResult.totalRulesCount} Tiêu chí
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vấn Đề Cần Xử Lý</div>
          <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
            {auditResult.pendingIssuesCount} Vi phạm & Cảnh báo
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center select-none">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-500" />
            Bảng Rà Soát 10 Điều Kiện Khóa Sổ Tháng Của Kế Toán Trưởng
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Tự động quét lúc {auditResult.closingDate}</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {auditResult.rules.map((rule) => (
            <div key={rule.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start gap-3 flex-1">
                <div className="pt-0.5 shrink-0">{getStatusBadge(rule.status)}</div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{rule.title}</span>
                    {getRiskBadge(rule.riskImpact)}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{rule.detailsMessage}</p>
                  {rule.status !== 'PASSED' && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                      <span>👉 Việc cần làm: {rule.actionRequired}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigateTab(rule.navTabTarget as TabType)}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 self-end md:self-center"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Soi Chi Tiết 👁</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
