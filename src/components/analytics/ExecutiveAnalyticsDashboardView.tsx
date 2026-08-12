import React, { useState } from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import { analyzeExecutiveFinancials } from '../../services/executiveAnalyticsService';
import { calculateBreakEvenPoint, estimateQuarterlyTax } from '../../services/financialCalculationEngine';
import {
  PieChart,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  Target,
  DollarSign,
  Award,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';

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
      {/* Executive Dark Glassmorphism Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl select-none">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold shadow-inner shrink-0">
              <PieChart className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                <span>Trung Tâm Phân Tích Quản Trị & Điểm Hòa Vốn BEP</span>
                <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 rounded-full text-white font-extrabold shadow-sm">
                  EXECUTIVE 360°
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeClient ? activeClient.name : 'Doanh Nghiệp Kế Toán Pro'} | Đọc phân tích EBITDA, Chỉ số sức khỏe tài chính & Thuế TNDN tạm tính
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Điểm Sức Khỏe Tài Chính</div>
              <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-end gap-1">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>{analytics.health.score}/100 ({analytics.health.ratingLabel})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Financial Key Executive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* EBITDA Card */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lợi Nhuận EBITDA</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-2 tabular-nums">
            {analytics.ebitda.toLocaleString()} VNĐ
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Biên EBITDA: {analytics.ebitdaMargin.toFixed(1)}%
          </div>
        </div>

        {/* BEP Card */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Doanh Thu Hòa Vốn (BEP)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-2 tabular-nums">
            {bep.breakEvenRevenue.toLocaleString()} VNĐ
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
            Mức an toàn: <span className="font-bold text-emerald-600">{bep.safetyMarginPercent}%</span>
          </div>
        </div>

        {/* CIT Tax Estimate Card */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-500/50 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Thuế TNDN Tạm Tính ({taxEst.quarter})</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {taxEst.citTaxAmount.toLocaleString()} VNĐ
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">
            Thuế suất: <span className="font-bold">20%</span> | B4: <span className="font-bold text-rose-500">{taxEst.nonDeductibleExpenseB4.toLocaleString()} VNĐ</span>
          </div>
        </div>

        {/* Bad Debt & Quick Ratio Card */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-500/50 transition-all duration-300">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Thanh Toán Nhanh & Nợ Xấu</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-2 tabular-nums">
            Quick Ratio: {analytics.health.quickRatio}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1">
            Tỷ lệ nợ xấu: <span className={`font-bold ${analytics.health.badDebtRatio > 10 ? 'text-rose-500' : 'text-emerald-500'}`}>{analytics.health.badDebtRatio}%</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Cost Structure & Break Even Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost Structure Breakdown */}
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

        {/* Top 5 Revenue Partners */}
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
