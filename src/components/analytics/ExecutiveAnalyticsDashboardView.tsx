import React from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import { analyzeExecutiveFinancials } from '../../services/executiveAnalyticsService';
import { calculateBreakEvenPoint, estimateQuarterlyTax } from '../../services/financialCalculationEngine';
import {
  PieChart,
  TrendingUp,
  Activity,
  Target,
  Award,
  Layers,
  ArrowUpRight,
  Calculator,
} from 'lucide-react';
import { PageHeader, StatCard } from '../common';
import { formatNumber } from '../../utils/formatters';

interface ExecutiveAnalyticsDashboardViewProps {
  transactions: NormalizedTransaction[];
  activeClient?: Client | null;
}

export const ExecutiveAnalyticsDashboardView: React.FC<ExecutiveAnalyticsDashboardViewProps> = ({
  transactions,
  activeClient,
}) => {
  const analytics = analyzeExecutiveFinancials(transactions);
  const bep = calculateBreakEvenPoint(transactions);
  const taxEst = estimateQuarterlyTax(transactions, 'Q3/2026');

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <PageHeader
        variant="gradient"
        icon={PieChart}
        title="Trung Tâm Phân Tích Quản Trị & Điểm Hòa Vốn BEP"
        badgeText="EXECUTIVE 360°"
        subtitle={`${activeClient ? activeClient.name : 'Doanh Nghiệp Kế Toán Pro'} | Đọc phân tích EBITDA, Chỉ số sức khỏe tài chính & Thuế TNDN tạm tính`}
        actions={
          <div className="px-3.5 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Điểm Sức Khỏe Tài Chính</div>
            <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-end gap-1">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{analytics.health.score}/100 ({analytics.health.ratingLabel})</span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          label="LỢI NHUẬN EBITDA"
          value={`${formatNumber(analytics.ebitda)} đ`}
          subtext={`Biên EBITDA: ${analytics.ebitdaMargin.toFixed(1)}%`}
          icon={TrendingUp}
          variant="purple"
          badge={
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> {analytics.ebitdaMargin.toFixed(1)}%
            </span>
          }
        />

        <StatCard
          label="DOANH THU HÒA VỐN (BEP)"
          value={`${formatNumber(bep.breakEvenRevenue)} đ`}
          subtext={`Mức an toàn: ${bep.safetyMarginPercent}%`}
          icon={Target}
          variant="emerald"
        />

        <StatCard
          label={`THUẾ TNDN TẠM TÍNH (${taxEst.quarter})`}
          value={`${formatNumber(taxEst.citTaxAmount)} đ`}
          subtext={`Thuế suất 20% | B4: ${formatNumber(taxEst.nonDeductibleExpenseB4)} đ`}
          icon={Calculator}
          variant="amber"
        />

        <StatCard
          label="THANH TOÁN NHANH & NỢ XẤU"
          value={`Quick Ratio: ${analytics.health.quickRatio}`}
          subtext={`Tỷ lệ nợ xấu: ${analytics.health.badDebtRatio}%`}
          icon={Activity}
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Tỷ Trọng Cấu Trúc Chi Phí Doanh Nghiệp
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
              Tổng phát sinh
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {analytics.costBreakdown.map((item) => (
              <div key={item.accountGroup} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300">{item.categoryName}</span>
                  <span className="tabular-nums text-slate-900 dark:text-slate-100">{item.amount.toLocaleString()} VNĐ ({item.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, item.percentage)}%`, backgroundColor: item.colorHex }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Top 5 Khách Hàng / Đối Tác Đóng Góp Doanh Thu Lớn Nhất
            </h3>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded">
              Doanh Thu
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {analytics.topRevenuePartners.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Chưa có dữ liệu phát sinh doanh thu bán hàng.</p>
            ) : (
              analytics.topRevenuePartners.map((partner, idx) => (
                <div key={partner.partnerName} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{partner.partnerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{partner.amount.toLocaleString()} VNĐ</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">({partner.percentage.toFixed(1)}% Tổng DT)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
