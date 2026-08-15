import React, { useState } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import {
  calculateTrialBalancePivot,
  calculateIncomeStatement,
  calculateAssetDepreciationReport,
  AccountBalancePivotItem,
} from '../../services/financialReportService';
import { calculateBalanceSheet } from '../../services/balanceSheetService';
import { calculateCashFlowStatement } from '../../services/cashFlowStatementService';
import { generateFinancialNotes } from '../../services/financialNotesService';
import { exportTransactionsToExcel } from '../../services/excelService';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PageHeader, SubTabNav, SearchBar } from '../common';
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  Download,
  PieChart,
  Scale,
  Banknote,
  BookOpen,
  Edit3,
} from 'lucide-react';

interface FinancialStatementsViewProps {
  transactions: NormalizedTransaction[];
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({ transactions }) => {
  const [activeSubTab, setActiveSubTab] = useState<'TRIAL_BALANCE' | 'INCOME_STATEMENT' | 'DEPRECIATION' | 'BALANCE_SHEET' | 'CASH_FLOW' | 'FINANCIAL_NOTES'>('TRIAL_BALANCE');
  const [searchTerm, setSearchTerm] = useState('');
  const [, setSelectedAcc] = useState<AccountBalancePivotItem | null>(null);

  const trialBalance = calculateTrialBalancePivot(transactions);
  const incomeStatement = calculateIncomeStatement(transactions);
  const assets = calculateAssetDepreciationReport(transactions);
  const balanceSheet = calculateBalanceSheet(transactions);
  const cashFlowStatement = calculateCashFlowStatement(transactions);
  const financialNotes = generateFinancialNotes(transactions, balanceSheet, incomeStatement, cashFlowStatement);

  const totalPeriodDebit = trialBalance.reduce((sum, item) => sum + item.periodDebit, 0);
  const totalPeriodCredit = trialBalance.reduce((sum, item) => sum + item.periodCredit, 0);
  const isBalanced = totalPeriodDebit === totalPeriodCredit;

  const filteredTrialBalance = trialBalance.filter(
    (item) =>
      !searchTerm ||
      item.accountCode.includes(searchTerm) ||
      item.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const subTabs = [
    { id: 'TRIAL_BALANCE' as const, label: '1. Cân Đối Phát Sinh (1xx-9xx)', icon: FileSpreadsheet },
    { id: 'INCOME_STATEMENT' as const, label: '2. KQKD P&L (B02-DN)', icon: TrendingUp },
    { id: 'DEPRECIATION' as const, label: '3. Khấu Hao & Phân Bổ', icon: PieChart },
    { id: 'BALANCE_SHEET' as const, label: '4. B01-DN CĐKT', icon: Scale },
    { id: 'CASH_FLOW' as const, label: '5. B03-DN LCTT', icon: Banknote },
    { id: 'FINANCIAL_NOTES' as const, label: '6. B09-DN Thuyết Minh BCTC', icon: BookOpen },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <PageHeader
          icon={BarChart3}
          title="Báo Cáo Tài Chính Tổng Hợp (B01 • B02 • B03 • B09-DN)"
          subtitle="Bảng Cân Đối Kế Toán • Kết Quả Kinh Doanh • Lưu Chuyển Tiền Tệ • Thuyết Minh BCTC • Cân Đối Phát Sinh"
          badgeText="TT200 / TT133"
        />

        <SubTabNav
          tabs={subTabs}
          activeTab={activeSubTab}
          onChange={(tabId) => setActiveSubTab(tabId)}
        />
      </div>

      {activeSubTab === 'TRIAL_BALANCE' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm mã TK (111, 112, 131, 511...)"
                className="w-full sm:w-72"
              />
              <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 ${
                isBalanced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {isBalanced ? '✅ Cân Đối Nợ = Có' : '🚨 CẢNH BÁO LỆCH NỢ CÓ'}
              </span>
            </div>

            <button
              onClick={() => exportTransactionsToExcel(transactions, 'Bang_Can_Doi_Phat_Sinh_1xx_9xx')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Bảng Cân Đối (Excel)</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1100px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                  <tr>
                    <th className="p-2.5 w-20">Mã TK</th>
                    <th className="p-2.5">Tên Tài Khoản Kế Toán</th>
                    <th className="p-2.5 text-right bg-slate-200/50 dark:bg-slate-900/50">Phát Sinh Nợ (VNĐ)</th>
                    <th className="p-2.5 text-right bg-slate-200/50 dark:bg-slate-900/50">Phát Sinh Có (VNĐ)</th>
                    <th className="p-2.5 text-right">Dư Nợ Cuối Kỳ</th>
                    <th className="p-2.5 text-right">Dư Có Cuối Kỳ</th>
                    <th className="p-2.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredTrialBalance.map((item) => (
                    <tr key={item.accountCode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{item.accountCode}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{item.accountName}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-slate-50/50 dark:bg-slate-900/20 tabular-nums">
                        {item.periodDebit > 0 ? formatNumber(item.periodDebit) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-slate-50/50 dark:bg-slate-900/20 tabular-nums">
                        {item.periodCredit > 0 ? formatNumber(item.periodCredit) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold tabular-nums">
                        {item.closingDebit > 0 ? formatNumber(item.closingDebit) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold tabular-nums">
                        {item.closingCredit > 0 ? formatNumber(item.closingCredit) : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setSelectedAcc(item)}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold rounded-lg text-[11px] cursor-pointer"
                        >
                          Soi Chứng Từ 📜
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-950 font-extrabold border-t-2 border-slate-300 dark:border-slate-700 sticky bottom-0">
                  <tr>
                    <td colSpan={2} className="p-2.5 uppercase text-slate-900 dark:text-slate-100">TỔNG CỘNG PHÁT SINH:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
                      {formatNumber(totalPeriodDebit)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-rose-600 dark:text-rose-400 text-sm tabular-nums">
                      {formatNumber(totalPeriodCredit)}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'INCOME_STATEMENT' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Báo Cáo Kết Quả Hoạt Động Kinh Doanh (Mẫu B02-DN)</span>
              </h3>
              <button
                onClick={() => exportTransactionsToExcel(transactions, 'Bao_Cao_Ket_Qua_Kinh_Doanh_B02')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Báo Cáo P&L (Excel)</span>
              </button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs font-medium">
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">1. Doanh thu bán hàng và cung cấp dịch vụ (TK 511)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(incomeStatement.grossRevenue)} VNĐ</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">2. Giá vốn hàng bán (TK 632)</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">-{formatCurrency(incomeStatement.cogs)} VNĐ</span>
              </div>
              <div className="py-2.5 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 px-3 rounded-xl">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">3. LỢI NHUẬN GỘP BÁN HÀNG (1 - 2)</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm tabular-nums">{formatCurrency(incomeStatement.grossProfit)} VNĐ</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">4. Chi phí quản lý doanh nghiệp (TK 642)</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">-{formatCurrency(incomeStatement.adminExpense)} VNĐ</span>
              </div>
              <div className="py-2.5 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20 px-3 rounded-xl">
                <span className="font-extrabold text-indigo-700 dark:text-indigo-300">5. TỔNG LỢI NHUẬN KẾ TOÁN TRƯỚC THUẾ</span>
                <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-sm tabular-nums">{formatCurrency(incomeStatement.profitBeforeTax)} VNĐ</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">6. Chi phí thuế TNDN hiện hành (Tạm tính 20%)</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">-{formatCurrency(incomeStatement.citTaxExpense)} VNĐ</span>
              </div>
              <div className="py-3 flex items-center justify-between bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-4 rounded-xl shadow-sm">
                <span className="font-extrabold uppercase">7. LỢI NHUẬN SAU THUẾ TNDN (NET PROFIT)</span>
                <span className="font-mono font-extrabold text-base tabular-nums">{formatCurrency(incomeStatement.profitAfterTax)} VNĐ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'DEPRECIATION' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-600" />
              <span>Bảng Quản Lý Khấu Hao Tài Sản Cố Định (TK 211) & Phân Bổ CCDC (TK 242)</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Tên Tài Sản / Chi Phí 242</th>
                    <th className="p-2.5 text-center">Tài Khoản</th>
                    <th className="p-2.5 text-right">Nguyên Giá (VNĐ)</th>
                    <th className="p-2.5 text-center">Số Tháng PB</th>
                    <th className="p-2.5 text-right">Phân Bổ 1 Tháng (VNĐ)</th>
                    <th className="p-2.5 text-right">Giá Trị Còn Lại (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{asset.assetName}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{asset.accountCode}</td>
                      <td className="p-2.5 text-right font-mono font-bold tabular-nums">{formatNumber(asset.originalPrice)}</td>
                      <td className="p-2.5 text-center font-mono">{asset.usefulMonths} tháng</td>
                      <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {formatNumber(Math.round(asset.monthlyAmount))}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {formatNumber(Math.round(asset.remainingAmount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'BALANCE_SHEET' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-cyan-600" />
                <span>Bảng Cân Đối Kế Toán (Mẫu B01-DN)</span>
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                  balanceSheet.isBalanced
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {balanceSheet.isBalanced ? '✅ Cân Bằng TS = NV' : `🚨 Lệch ${formatCurrency(balanceSheet.balanceDifference)} VNĐ`}
                </span>
              </h3>
              <button
                onClick={() => exportTransactionsToExcel(transactions, 'Bang_Can_Doi_Ke_Toan_B01_DN')}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất B01-DN (Excel)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[520px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[800px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                  <tr>
                    <th className="p-2.5 w-16">Mã số</th>
                    <th className="p-2.5">Chỉ tiêu</th>
                    <th className="p-2.5 text-right">Số cuối kỳ (VNĐ)</th>
                    <th className="p-2.5 text-right">Số đầu năm (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {balanceSheet.assets.map((item, idx) => (
                    <tr key={`a-${idx}`} className={`${
                      item.isHeader ? 'bg-cyan-50 dark:bg-cyan-950/30' : ''
                    } ${item.isBold ? 'font-extrabold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400">{item.code}</td>
                      <td className={`p-2.5 ${item.isBold ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</td>
                      <td className={`p-2.5 text-right font-mono tabular-nums ${item.endOfPeriod < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {item.endOfPeriod !== 0 ? formatNumber(item.endOfPeriod) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-slate-500">
                        {item.beginOfYear !== 0 ? formatNumber(item.beginOfYear) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr><td colSpan={4} className="h-2 bg-slate-50 dark:bg-slate-950"></td></tr>
                  {balanceSheet.liabilitiesAndEquity.map((item, idx) => (
                    <tr key={`l-${idx}`} className={`${
                      item.isHeader ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                    } ${item.isBold ? 'font-extrabold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                      <td className="p-2.5 font-mono text-violet-600 dark:text-violet-400">{item.code}</td>
                      <td className={`p-2.5 ${item.isBold ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</td>
                      <td className="p-2.5 text-right font-mono tabular-nums">
                        {item.endOfPeriod !== 0 ? formatNumber(item.endOfPeriod) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-slate-500">
                        {item.beginOfYear !== 0 ? formatNumber(item.beginOfYear) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'CASH_FLOW' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-violet-600" />
                <span>Báo Cáo Lưu Chuyển Tiền Tệ (Mẫu B03-DN — Phương Pháp Gián Tiếp)</span>
                <span className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                  cashFlowStatement.isReconciled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {cashFlowStatement.isReconciled ? '✅ Khớp TK 111+112' : '⚠️ Lệch so với TK 111+112'}
                </span>
              </h3>
              <button
                onClick={() => exportTransactionsToExcel(transactions, 'Bao_Cao_Luu_Chuyen_Tien_Te_B03_DN')}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất B03-DN (Excel)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[520px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[700px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
                  <tr>
                    <th className="p-2.5 w-14">Mã</th>
                    <th className="p-2.5">Chỉ tiêu</th>
                    <th className="p-2.5 text-right">Kỳ này (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {cashFlowStatement.operatingItems.map((item, idx) => (
                    <tr key={`op-${idx}`} className={`${
                      item.isHeader ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''
                    } ${item.isBold ? 'font-extrabold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                      <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">{item.code}</td>
                      <td className={`p-2.5 ${item.isBold ? 'text-slate-900 dark:text-slate-100' : ''}`}>{item.label}</td>
                      <td className={`p-2.5 text-right font-mono tabular-nums ${item.currentPeriod < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {!item.isHeader ? formatNumber(item.currentPeriod) : ''}
                      </td>
                    </tr>
                  ))}
                  {cashFlowStatement.investingItems.map((item, idx) => (
                    <tr key={`inv-${idx}`} className={`${
                      item.isHeader ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                    } ${item.isBold ? 'font-extrabold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                      <td className="p-2.5 font-mono text-amber-600 dark:text-amber-400">{item.code}</td>
                      <td className={`p-2.5 ${item.isBold ? 'text-slate-900 dark:text-slate-100' : ''}`}>{item.label}</td>
                      <td className={`p-2.5 text-right font-mono tabular-nums ${item.currentPeriod < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {!item.isHeader ? formatNumber(item.currentPeriod) : ''}
                      </td>
                    </tr>
                  ))}
                  {cashFlowStatement.financingItems.map((item, idx) => (
                    <tr key={`fin-${idx}`} className={`${
                      item.isHeader ? 'bg-violet-50 dark:bg-violet-950/20' : ''
                    } ${item.isBold ? 'font-extrabold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                      <td className="p-2.5 font-mono text-violet-600 dark:text-violet-400">{item.code}</td>
                      <td className={`p-2.5 ${item.isBold ? 'text-slate-900 dark:text-slate-100' : ''}`}>{item.label}</td>
                      <td className={`p-2.5 text-right font-mono tabular-nums ${item.currentPeriod < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {!item.isHeader ? formatNumber(item.currentPeriod) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-950 font-extrabold border-t-2 border-slate-300 dark:border-slate-700 sticky bottom-0">
                  <tr>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-slate-900 dark:text-slate-100">Lưu chuyển tiền thuần trong kỳ (I+II+III)</td>
                    <td className={`p-2.5 text-right font-mono text-sm tabular-nums ${cashFlowStatement.netCashChange < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatNumber(cashFlowStatement.netCashChange)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">Tiền đầu kỳ</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{formatNumber(cashFlowStatement.cashBeginning)}</td>
                  </tr>
                  <tr className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                    <td className="p-2.5"></td>
                    <td className="p-2.5 uppercase">Tiền và tương đương tiền cuối kỳ</td>
                    <td className="p-2.5 text-right font-mono text-sm tabular-nums">{formatNumber(cashFlowStatement.cashEnding)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'FINANCIAL_NOTES' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-pink-600" />
                <span>Thuyết Minh Báo Cáo Tài Chính (Mẫu B09-DN)</span>
              </h3>
              <button
                onClick={() => exportTransactionsToExcel(transactions, 'Thuyet_Minh_BCTC_B09_DN')}
                className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất B09-DN (Excel)</span>
              </button>
            </div>

            <div className="space-y-4">
              {financialNotes.sections.map((section, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{section.title}</h4>
                    {section.isEditable && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Có thể sửa
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {section.content}
                    </pre>
                    {section.tableData && (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mt-2">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-slate-100 dark:bg-slate-950 font-bold">
                            <tr>
                              <th className="p-2 text-left">Chỉ tiêu</th>
                              <th className="p-2 text-right">Số cuối kỳ (VNĐ)</th>
                              <th className="p-2 text-right">Số đầu năm (VNĐ)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {section.tableData.map((row, rIdx) => (
                              <tr key={rIdx} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${rIdx === section.tableData!.length - 1 ? 'font-extrabold' : ''}`}>
                                <td className="p-2 text-slate-800 dark:text-slate-200">{row.label}</td>
                                <td className={`p-2 text-right font-mono tabular-nums ${row.endOfPeriod < 0 ? 'text-rose-600' : ''}`}>
                                  {row.endOfPeriod !== 0 ? formatNumber(row.endOfPeriod) : '-'}
                                </td>
                                <td className="p-2.5 text-right font-mono tabular-nums text-slate-500">
                                  {row.beginOfYear !== 0 ? formatNumber(row.beginOfYear) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
