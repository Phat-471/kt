import React, { useState } from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import {
  calculateInventoryCardReport,
  calculateCashAndBankLedger,
  calculatePartnerDebtReport,
  calculateTaxRiskSummary,
  InventoryCardItem,
  PartnerDebtItem,
} from '../../services/accountingCoreService';
import { exportTransactionsToExcel } from '../../services/excelService';
import { auditNonDeductibleExpenses } from '../../services/taxAuditService';
import { exportMasterAccountingZipPackage } from '../../services/masterZipExporter';
import {
  Calculator,
  Package,
  Wallet,
  Users,
  ShieldAlert,
  Download,
  Search,
  Layers,
  Building2,
  Archive,
} from 'lucide-react';

interface MasterAccountingHubProps {
  transactions: NormalizedTransaction[];
  activeClient?: Client | null;
}

export const MasterAccountingHub: React.FC<MasterAccountingHubProps> = ({ transactions, activeClient = null }) => {
  const [activeTab, setActiveTab] = useState<'TAX' | 'INVENTORY' | 'CASHFLOW' | 'DEBT'>('TAX');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerDebtItem | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<InventoryCardItem | null>(null);

  const taxSummary = calculateTaxRiskSummary(transactions);
  const citAudit = auditNonDeductibleExpenses(transactions);
  const inventoryList = calculateInventoryCardReport(transactions);
  const cashBankLedger = calculateCashAndBankLedger(transactions);
  const debtList = calculatePartnerDebtReport(transactions);

  const filteredInventory = inventoryList.filter(i =>
    !searchTerm || i.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDebt = debtList.filter(d =>
    !searchTerm || d.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) || (d.taxCode && d.taxCode.includes(searchTerm))
  );

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white px-4 py-3 rounded-2xl border border-brand-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Layers className="w-4 h-4 text-brand-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Trung Tâm Quản Trị Nghiệp Vụ Kế Toán Chuyên Sâu</h2>
            <p className="text-[11px] text-slate-300">Tối ưu 4 trụ cột: Kế Toán Thuế & Rủi Ro, Kho Hàng, Dòng Tiền Quỹ/NH, và Công Nợ 131/331</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMasterAccountingZipPackage(activeClient, transactions)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-400 hover:to-brand-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            title="Xuất đồng loạt tất cả file BCTC, Cân đối phát sinh, Kho, Công nợ ra 1 file Zip"
          >
            <Archive className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>1-Click Xuất Bộ Hồ Sơ Zip 📦</span>
          </button>

          <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0 text-xs font-bold gap-1 flex-wrap">
            <button
              onClick={() => setActiveTab('TAX')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TAX' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>1. Kế Toán Thuế</span>
            </button>

            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'INVENTORY' ? 'bg-amber-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>2. Kế Toán Kho</span>
            </button>

            <button
              onClick={() => setActiveTab('CASHFLOW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CASHFLOW' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>3. Thu Chi & Quỹ</span>
            </button>

            <button
              onClick={() => setActiveTab('DEBT')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DEBT' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>4. Quản Lý Công Nợ</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'TAX' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Chi Bị Loại Thuế TNDN [B4]</div>
              <div className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-0.5 tabular-nums">
                {citAudit.totalNonDeductibleAmount.toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-bold">
                Truy thu 20%: +{citAudit.totalCitTaxRisk.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Chi ≥ 5Tr Thiếu Hóa Đơn</div>
              <div className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-0.5 tabular-nums">
                {taxSummary.highExpenseNoInvoiceCount} đơn vị
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-bold">
                Rủi ro: {taxSummary.highExpenseNoInvoiceAmount.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Chi Tiền Mặt ≥ 20Tr</div>
              <div className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
                {taxSummary.cashOver20mCount} giao dịch
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold">
                Tổng: {taxSummary.cashOver20mAmount.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Thuế GTGT Mua Vào</div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                {taxSummary.inputVat.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>

            <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Thuế GTGT Nộp [40]</div>
              <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5 tabular-nums">
                {taxSummary.netVatPayable.toLocaleString('vi-VN')} VNĐ
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Danh Sách Cảnh Báo Rủi Ro Chi Tiết (Thiếu Hóa Đơn & Thanh Toán Tiền Mặt Mặt ≥20M)</span>
              </h3>
              <button
                onClick={() => exportTransactionsToExcel(transactions, 'Bao_Cao_Rui_Ro_Thue')}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Báo Cáo Rủi Ro (Excel)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[420px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1000px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Ngày CT</th>
                    <th className="p-2.5">Số CT</th>
                    <th className="p-2.5">Đối Tác</th>
                    <th className="p-2.5">Diễn Giải</th>
                    <th className="p-2.5 text-right">Số Tiền (VNĐ)</th>
                    <th className="p-2.5 text-center">Nợ / Có</th>
                    <th className="p-2.5 text-center">Cảnh Báo Rủi Ro Thuế</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {transactions
                    .filter(t => (t.amount >= 5000000 && !t.voucherNo) || (t.amount >= 20000000 && t.creditAcc.startsWith('111')))
                    .map(t => {
                      const isNoInvoice = t.amount >= 5000000 && !t.voucherNo;
                      const isCashOver20m = t.amount >= 20000000 && t.creditAcc.startsWith('111');
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono">{t.date}</td>
                          <td className="p-2.5 font-mono font-bold text-brand-600 dark:text-brand-400">{t.voucherNo || t.id.slice(0, 6)}</td>
                          <td className="p-2.5 font-bold">{t.partnerName || 'Chưa rõ đối tác'}</td>
                          <td className="p-2.5 max-w-[280px] truncate">{t.description}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                            {t.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="p-2.5 text-center font-mono text-[11px]">{t.debitAcc} / {t.creditAcc}</td>
                          <td className="p-2.5 text-center space-x-1">
                            {isNoInvoice && (
                              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                🚨 Thiếu Hóa Đơn (≥5M)
                              </span>
                            )}
                            {isCashOver20m && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                ⚠️ Chi Tiền Mặt (≥20M)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INVENTORY' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mặt hàng, vật tư..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              onClick={() => exportTransactionsToExcel(transactions, 'Bang_Can_Doi_Kho_Hang')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Bảng Nhập Xuất Tồn (Excel)</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Bảng Tổng Hợp Nhập - Xuất - Tồn Kho Vật Tư Hàng Hóa</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1000px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Tên Vật Tư / Hàng Hóa</th>
                    <th className="p-2.5 text-center">SL Nhập</th>
                    <th className="p-2.5 text-center">SL Xuất</th>
                    <th className="p-2.5 text-center">SL Tồn Cuối</th>
                    <th className="p-2.5 text-right">Tổng Tiền Nhập (VNĐ)</th>
                    <th className="p-2.5 text-right">Đơn Giá Bình Quân (VNĐ)</th>
                    <th className="p-2.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredInventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">{item.itemName}</td>
                      <td className="p-2.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{item.importedQty}</td>
                      <td className="p-2.5 text-center font-mono text-rose-600 dark:text-rose-400 font-bold">-{item.exportedQty}</td>
                      <td className="p-2.5 text-center font-mono font-extrabold">
                        <span className={`px-2 py-0.5 rounded ${item.isNegativeStock ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          {item.closingQty}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-brand-600 dark:text-brand-400 tabular-nums">
                        {item.totalImportAmount.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-500 tabular-nums">
                        {Math.round(item.avgPrice).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setSelectedInventory(item)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-bold rounded-lg text-[11px] cursor-pointer"
                        >
                          Xem Thẻ Kho 📜
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CASHFLOW' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Sổ Quỹ Tiền Mặt (TK 111)</h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Dư Quỹ: {cashBankLedger.cashBalance.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="text-slate-500 text-[11px] font-bold">Tổng Thu Tiền Mặt (Nợ 111)</div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    +{cashBankLedger.cashIn.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20">
                  <div className="text-slate-500 text-[11px] font-bold">Tổng Chi Tiền Mặt (Có 111)</div>
                  <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                    -{cashBankLedger.cashOut.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Sổ Tiền Gửi Ngân Hàng (TK 112)</h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Dư NH: {cashBankLedger.bankBalance.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="text-slate-500 text-[11px] font-bold">Tổng Báo Có NH (Nợ 112)</div>
                  <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    +{cashBankLedger.bankIn.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/20">
                  <div className="text-slate-500 text-[11px] font-bold">Tổng Báo Nợ NH (Có 112)</div>
                  <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                    -{cashBankLedger.bankOut.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DEBT' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm đối tác, mã số thuế..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <button
              onClick={() => exportTransactionsToExcel(transactions, 'Bao_Cao_Tong_Hop_Cong_No')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo Công Nợ (Excel)</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Bảng Tổng Hợp Công Nợ Phải Thu (TK 131) & Phải Trả (TK 331) Theo Đối Tác</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1100px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Tên Khách Hàng / Nhà Cung Cấp</th>
                    <th className="p-2.5 text-center">Phân Loại</th>
                    <th className="p-2.5 text-right">Phát Sinh Nợ (VNĐ)</th>
                    <th className="p-2.5 text-right">Đã Thanh Toán (VNĐ)</th>
                    <th className="p-2.5 text-right">Dư Nợ Cuối Kỳ (VNĐ)</th>
                    <th className="p-2.5 text-center">Phân Tích Tuổi Nợ (Quá Hạn)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {filteredDebt.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{d.partnerName}</div>
                        {d.taxCode && <div className="text-[10px] text-slate-400 font-mono">MST: {d.taxCode}</div>}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          d.type === 'RECEIVABLE_131' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {d.type === 'RECEIVABLE_131' ? 'Khách Hàng (131)' : 'Nhà Cung Cấp (331)'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold tabular-nums">
                        {d.increasedDebt.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {d.decreasedDebt.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {d.closingDebt.toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5 text-center space-x-1">
                        {d.overdueOver90 > 0 && (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">
                            🚨 Nợ Xấu &gt;90d
                          </span>
                        )}
                        {d.overdue31_90 > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px]">
                            ⚠️ Quá hạn 31-90d
                          </span>
                        )}
                        {d.currentDebt > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                            Trong hạn
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
      )}
    </div>
  );
};
