import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { NormalizedTransaction } from '../../types/accounting';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartsProps {
  transactions: NormalizedTransaction[];
}

// Detect dark mode from document
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ transactions }) => {
  const dark = isDarkMode();
  const gridColor = dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.5)';
  const textColor = dark ? '#94a3b8' : '#64748b';

  // ─── Chart 1: Thu vs Chi theo Tháng (Stacked Bar) ───
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};

    transactions.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (!months[monthKey]) months[monthKey] = { income: 0, expense: 0 };
      if (tx.type === 'INCOME') months[monthKey].income += tx.amount;
      else if (tx.type === 'EXPENSE') months[monthKey].expense += tx.amount;
    });

    const sortedKeys = Object.keys(months).sort();
    const labels = sortedKeys.map(k => {
      const [y, m] = k.split('-');
      return `T${parseInt(m)}/${y.slice(2)}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Phát sinh Thu',
          data: sortedKeys.map(k => months[k].income),
          backgroundColor: dark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.75)',
          borderRadius: 6,
          borderSkipped: false as const,
        },
        {
          label: 'Phát sinh Chi',
          data: sortedKeys.map(k => months[k].expense),
          backgroundColor: dark ? 'rgba(251, 113, 133, 0.7)' : 'rgba(244, 63, 94, 0.75)',
          borderRadius: 6,
          borderSkipped: false as const,
        },
      ],
    };
  }, [transactions, dark]);

  // ─── Chart 2: Phân bổ TK Nợ theo Nhóm (Doughnut) ───
  const accountData = useMemo(() => {
    const groups: Record<string, number> = {};
    const groupLabels: Record<string, string> = {
      '1': 'Tài sản (1xx)',
      '2': 'Tài sản dài hạn (2xx)',
      '3': 'Nợ phải trả (3xx)',
      '4': 'Vốn chủ sở hữu (4xx)',
      '5': 'Doanh thu (5xx)',
      '6': 'Chi phí (6xx)',
      '7': 'Thu nhập khác (7xx)',
      '8': 'Chi phí khác (8xx)',
      '9': 'Xác định KQKD (9xx)',
    };

    transactions.forEach(tx => {
      if (tx.debitAcc && tx.debitAcc.length >= 1) {
        const prefix = tx.debitAcc[0];
        const label = groupLabels[prefix] || `Nhóm ${prefix}xx`;
        groups[label] = (groups[label] || 0) + tx.amount;
      }
    });

    const labels = Object.keys(groups);
    const values = Object.values(groups);

    const palette = dark
      ? ['#6ee7b7', '#93c5fd', '#fcd34d', '#f9a8d4', '#c4b5fd', '#fca5a5', '#67e8f9', '#a5b4fc', '#fde68a']
      : ['#059669', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04'];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    };
  }, [transactions, dark]);

  // ─── Chart 3: Xu hướng Dòng tiền ròng (Line + Area) ───
  const cashflowData = useMemo(() => {
    const months: Record<string, number> = {};

    transactions.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7);
      if (!months[monthKey]) months[monthKey] = 0;
      if (tx.type === 'INCOME') months[monthKey] += tx.amount;
      else if (tx.type === 'EXPENSE') months[monthKey] -= tx.amount;
    });

    const sortedKeys = Object.keys(months).sort();

    // Tính lũy kế
    let cumulative = 0;
    const cumulativeValues = sortedKeys.map(k => {
      cumulative += months[k];
      return cumulative;
    });

    const labels = sortedKeys.map(k => {
      const [y, m] = k.split('-');
      return `T${parseInt(m)}/${y.slice(2)}`;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Dòng tiền ròng/tháng',
          data: sortedKeys.map(k => months[k]),
          borderColor: dark ? '#818cf8' : '#6366f1',
          backgroundColor: dark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: dark ? '#818cf8' : '#6366f1',
          pointBorderWidth: 0,
        },
        {
          label: 'Lũy kế dòng tiền',
          data: cumulativeValues,
          borderColor: dark ? '#34d399' : '#10b981',
          backgroundColor: 'transparent',
          borderDash: [6, 3],
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: dark ? '#34d399' : '#10b981',
          pointBorderWidth: 0,
        },
      ],
    };
  }, [transactions, dark]);

  // Shared options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: textColor, font: { size: 11, weight: 'bold' as const }, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#fff',
        titleColor: dark ? '#e2e8f0' : '#1e293b',
        bodyColor: dark ? '#94a3b8' : '#475569',
        borderColor: dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('vi-VN')} đ`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10 },
          callback: (val: any) => val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}tr` : val.toLocaleString('vi-VN'),
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: textColor, font: { size: 10, weight: 'bold' as const }, boxWidth: 10, padding: 8 },
      },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#fff',
        titleColor: dark ? '#e2e8f0' : '#1e293b',
        bodyColor: dark ? '#94a3b8' : '#475569',
        borderColor: dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed.toLocaleString('vi-VN')} đ`,
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: textColor, font: { size: 11, weight: 'bold' as const }, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#fff',
        titleColor: dark ? '#e2e8f0' : '#1e293b',
        bodyColor: dark ? '#94a3b8' : '#475569',
        borderColor: dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('vi-VN')} đ`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10 },
          callback: (val: any) => val >= 1_000_000 ? `${(val / 1_000_000).toFixed(0)}tr` : val >= -1_000_000 ? val.toLocaleString('vi-VN') : `${(val / 1_000_000).toFixed(0)}tr`,
        },
      },
    },
  };

  if (transactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Bar Chart: Thu vs Chi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Thu vs Chi Theo Tháng</h4>
            <p className="text-[10px] text-slate-500">Phát sinh theo niên độ kế toán</p>
          </div>
        </div>
        <div className="h-[220px]">
          <Bar data={monthlyData} options={barOptions} />
        </div>
      </div>

      {/* Doughnut Chart: Nhóm TK */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Phân Bổ Tài Khoản</h4>
            <p className="text-[10px] text-slate-500">Phát sinh Nợ theo nhóm TK</p>
          </div>
        </div>
        <div className="h-[220px]">
          <Doughnut data={accountData} options={doughnutOptions} />
        </div>
      </div>

      {/* Line Chart: Cashflow Trend */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Xu Hướng Dòng Tiền</h4>
            <p className="text-[10px] text-slate-500">Ròng + Lũy kế theo tháng</p>
          </div>
        </div>
        <div className="h-[220px]">
          <Line data={cashflowData} options={lineOptions} />
        </div>
      </div>
    </div>
  );
};
