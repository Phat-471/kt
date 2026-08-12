import React from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import { ShieldAlert, AlertTriangle, Info, ArrowRight, CheckCircle2 } from 'lucide-react';
import { TabType } from '../layout/Sidebar';

interface SmartAlertPanelProps {
  transactions: NormalizedTransaction[];
  onNavigateTab: (tab: TabType) => void;
}

interface AlertItem {
  severity: 'error' | 'warning' | 'info';
  code: string;
  count: number;
  label: string;
  detail: string;
}

export const SmartAlertPanel: React.FC<SmartAlertPanelProps> = ({ transactions, onNavigateTab }) => {
  if (transactions.length === 0) return null;

  // --- Phân tích cảnh báo thông minh ---
  const alerts: AlertItem[] = [];

  // 1. Lỗi nghiêm trọng: chứng từ có lỗi cần sửa
  const errorTxs = transactions.filter(t => t.validationStatus === 'ERROR' && !t.userApproved);
  if (errorTxs.length > 0) {
    alerts.push({
      severity: 'error',
      code: 'CRITICAL_ERRORS',
      count: errorTxs.length,
      label: 'Lỗi nghiêm trọng cần xử lý',
      detail: `${errorTxs.length} chứng từ có lỗi (thiếu ngày, sai tài khoản, số tiền không hợp lệ...) chưa được phê duyệt.`,
    });
  }

  // 2. Cảnh báo: tiền thuế sai logic
  const taxMismatchTxs = transactions.filter(t =>
    t.errors?.some(e => e.code === 'WARN_TAX_MATH_MISMATCH')
  );
  if (taxMismatchTxs.length > 0) {
    alerts.push({
      severity: 'warning',
      code: 'TAX_MISMATCH',
      count: taxMismatchTxs.length,
      label: 'Sai lệch Tiền thuế / Tiền hàng',
      detail: `${taxMismatchTxs.length} hóa đơn có tổng tiền hàng + thuế KHÔNG khớp với tổng thanh toán. Cần kiểm tra lại.`,
    });
  }

  // 3. Cảnh báo: MST đối tác có vẻ ảo
  const fakeTaxCodeTxs = transactions.filter(t =>
    t.errors?.some(e => e.code === 'WARN_FAKE_TAX_CODE')
  );
  if (fakeTaxCodeTxs.length > 0) {
    alerts.push({
      severity: 'warning',
      code: 'FAKE_TAX_CODE',
      count: fakeTaxCodeTxs.length,
      label: 'Mã số thuế đối tác nghi ngờ (MST ảo)',
      detail: `${fakeTaxCodeTxs.length} chứng từ có MST đối tác chứa dãy số lặp (ví dụ: 9999999999) — dấu hiệu gian lận thuế.`,
    });
  }

  // 4. Cảnh báo: ngày chứng từ trong tương lai
  const futureDateTxs = transactions.filter(t =>
    t.errors?.some(e => e.code === 'WARN_FUTURE_DATE')
  );
  if (futureDateTxs.length > 0) {
    alerts.push({
      severity: 'warning',
      code: 'FUTURE_DATE',
      count: futureDateTxs.length,
      label: 'Ngày chứng từ nằm trong tương lai',
      detail: `${futureDateTxs.length} chứng từ có ngày phát sinh lớn hơn ngày hôm nay — cần rà soát lại.`,
    });
  }

  // 5. Cảnh báo: trùng lặp chứng từ xuyên file
  const crossDupTxs = transactions.filter(t =>
    t.errors?.some(e => e.code === 'WARN_CROSS_FILE_DUPLICATE')
  );
  if (crossDupTxs.length > 0) {
    alerts.push({
      severity: 'warning',
      code: 'CROSS_DUP',
      count: crossDupTxs.length,
      label: 'Trùng lặp chứng từ xuyên file',
      detail: `${crossDupTxs.length} chứng từ có khả năng được ghi sổ trùng lặp từ nhiều file import khác nhau.`,
    });
  }

  // 6. Info: chứng từ chưa đối chiếu
  const unmatchedVouchers = transactions.filter(
    t => (t.type === 'INCOME' || t.type === 'EXPENSE') && t.reconciledStatus !== 'MATCHED'
  );
  if (unmatchedVouchers.length > 5) {
    alerts.push({
      severity: 'info',
      code: 'UNMATCHED',
      count: unmatchedVouchers.length,
      label: 'Chứng từ chưa đối chiếu sao kê',
      detail: `${unmatchedVouchers.length} phiếu thu/chi chưa được ghép khớp với sao kê ngân hàng. Chạy tự động đối chiếu để hoàn thiện sổ sách.`,
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">Tất cả chứng từ đều ổn ✅</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Không phát hiện lỗi, cảnh báo hoặc sai lệch nào trong dữ liệu hiện tại.</p>
        </div>
      </div>
    );
  }

  const errorAlerts = alerts.filter(a => a.severity === 'error');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Bảng Cảnh Báo Thông Minh
          </span>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 text-[10px] font-bold rounded-full border border-rose-200 dark:border-rose-500/30">
            {alerts.length} vấn đề
          </span>
        </div>
        <button
          onClick={() => onNavigateTab('validation')}
          className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
        >
          Xem chi tiết <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Alert List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {[...errorAlerts, ...warningAlerts, ...infoAlerts].map((alert) => {
          const isError = alert.severity === 'error';
          const isWarning = alert.severity === 'warning';
          const Icon = isError ? ShieldAlert : isWarning ? AlertTriangle : Info;
          const colorClass = isError
            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
            : isWarning
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
            : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10';
          const badgeClass = isError
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
            : isWarning
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';

          return (
            <div
              key={alert.code}
              className="flex items-start gap-3.5 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-default group"
            >
              <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{alert.label}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${badgeClass}`}>
                    {alert.count}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {alert.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
