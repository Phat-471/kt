import React, { useMemo } from 'react';
import { TAX_DEADLINES } from '../../services/legalDatabase';
import { AlarmClock, AlertTriangle, CheckCircle2, CalendarClock, Bell } from 'lucide-react';

// Thêm deadline động theo tháng/quý hiện tại
function buildDynamicDeadlines() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-indexed

  const extras: typeof TAX_DEADLINES = [];

  // Hạn nộp thuế GTGT / TNCN hàng tháng (áp dụng nếu kê khai theo tháng)
  // Hạn nộp = ngày 20 tháng tiếp theo
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextMonthYear = m === 12 ? y + 1 : y;
  extras.push({
    id: `dl-monthly-${y}-${m}`,
    title: `Nộp TK Thuế GTGT tháng ${m}/${y} (nếu kê khai tháng)`,
    deadline: `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-20`,
    type: 'MONTHLY',
    description: `Hạn nộp Tờ khai GTGT tháng ${m}/${y} - ngày 20/${nextMonth}/${nextMonthYear}. Phạt từ 2-5 triệu nếu trễ.`,
  });

  // Hạn tạm tính TNDN Quý
  const currentQuarter = Math.ceil(m / 3);
  const nextQuarterMonth = currentQuarter * 3 + 1;
  const nextQYear = nextQuarterMonth > 12 ? y + 1 : y;
  const nextQM = nextQuarterMonth > 12 ? nextQuarterMonth - 12 : nextQuarterMonth;
  extras.push({
    id: `dl-tndn-q${currentQuarter}-${y}`,
    title: `Nộp Thuế TNDN tạm tính Quý ${currentQuarter}/${y}`,
    deadline: `${nextQYear}-${String(nextQM).padStart(2, '0')}-30`,
    type: 'QUARTERLY',
    description: `Tạm tính và nộp 20% thuế TNDN theo kết quả kinh doanh Quý ${currentQuarter}/${y}. Trể 1-5 ngày phạt 2M.`,
  });

  return extras;
}

function getDaysLeft(deadlineStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyLevel(daysLeft: number): 'overdue' | 'critical' | 'warning' | 'safe' {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 5) return 'critical';
  if (daysLeft <= 15) return 'warning';
  return 'safe';
}

export const TaxDeadlineWidget: React.FC = () => {
  const allDeadlines = useMemo(() => {
    const dynamic = buildDynamicDeadlines();
    const combined = [...TAX_DEADLINES, ...dynamic];
    // Sắp xếp theo hạn chót gần nhất, bỏ các hạn đã quá 30 ngày
    return combined
      .map(d => ({ ...d, daysLeft: getDaysLeft(d.deadline) }))
      .filter(d => d.daysLeft > -30)  // Bỏ quá hạn >30 ngày
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6); // Chỉ hiển thị 6 deadline gần nhất
  }, []);

  const criticalCount = allDeadlines.filter(d => d.daysLeft >= 0 && d.daysLeft <= 5).length;
  const overdueCount = allDeadlines.filter(d => d.daysLeft < 0).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 ${
        criticalCount > 0 || overdueCount > 0
          ? 'bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-500/20'
          : 'bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-500/20'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            criticalCount > 0 || overdueCount > 0
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
          }`}>
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Lịch Hạn Nộp Thuế
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Cập nhật theo luật Quản lý Thuế TT80/2021</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-500/30">
              <AlertTriangle className="w-3 h-3" />
              {overdueCount} QUÁ HẠN
            </span>
          )}
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-500/30 animate-pulse">
              <Bell className="w-3 h-3" />
              {criticalCount} KHẨN CẤP
            </span>
          )}
        </div>
      </div>

      {/* Deadline list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {allDeadlines.map((item) => {
          const urgency = getUrgencyLevel(item.daysLeft);

          const urgencyStyles = {
            overdue: {
              bar: 'bg-rose-500',
              badge: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
              icon: <AlertTriangle className="w-3.5 h-3.5" />,
              label: `Quá hạn ${Math.abs(item.daysLeft)} ngày`,
              row: 'bg-rose-50/50 dark:bg-rose-950/20',
            },
            critical: {
              bar: 'bg-rose-400 animate-pulse',
              badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20',
              icon: <AlarmClock className="w-3.5 h-3.5" />,
              label: item.daysLeft === 0 ? 'HÔM NAY!' : `Còn ${item.daysLeft} ngày`,
              row: 'bg-rose-50/30 dark:bg-rose-950/10',
            },
            warning: {
              bar: 'bg-amber-400',
              badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
              icon: <AlarmClock className="w-3.5 h-3.5" />,
              label: `Còn ${item.daysLeft} ngày`,
              row: '',
            },
            safe: {
              bar: 'bg-emerald-400',
              badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
              icon: <CheckCircle2 className="w-3.5 h-3.5" />,
              label: `Còn ${item.daysLeft} ngày`,
              row: '',
            },
          }[urgency];

          // Progress bar: 100% = 0 days, 0% = 60+ days
          const progressPct = Math.max(0, Math.min(100, Math.round((1 - item.daysLeft / 60) * 100)));

          return (
            <div key={item.id} className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 ${urgencyStyles.row} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors`}>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{item.description}</p>
                {/* Mini countdown bar */}
                <div className="mt-1.5 w-full max-w-[200px] bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${urgencyStyles.bar}`} style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              {/* Badge */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${urgencyStyles.badge}`}>
                  {urgencyStyles.icon}
                  {urgencyStyles.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Hạn: {new Date(item.deadline).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="px-5 py-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500">
        ⚠️ Chậm nộp từ 1-5 ngày: phạt 2-5 triệu (NĐ 125/2020). Chậm quá 90 ngày: phạt 15-25 triệu.
      </div>
    </div>
  );
};
