import React, { useState } from 'react';
import { Client, NormalizedTransaction } from '../../types/accounting';
import { exportTransactionsToExcel } from '../../services/excelService';
import { AlertOctagon, Calculator, PackageCheck, Scale, Download, ShieldAlert, CheckCircle2, ArrowUpRight, ArrowDownRight, FileText, Search } from 'lucide-react';

interface TaxAndInventoryReportViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
}

export const TaxAndInventoryReportView: React.FC<TaxAndInventoryReportViewProps> = ({
  activeClient,
  transactions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'HIGH_EXPENSES' | 'TAX_REPORT' | 'INVENTORY' | 'CASHFLOW'>('HIGH_EXPENSES');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter Khoản Chi >= 5.000.000 VNĐ Không có Hóa Đơn
  const highExpensesNoInvoice = transactions.filter(t => {
    if (t.type !== 'EXPENSE' || t.amount < 5000000) return false;
    const hasVoucherNo = t.voucherNo && t.voucherNo.trim().length > 0 && !t.voucherNo.toLowerCase().includes('trống');
    const hasInvoiceDetail = t.rawRow && (t.rawRow['Số hóa đơn'] || t.rawRow['SoHD'] || t.rawRow['Mẫu số'] || t.sourceFileName.endsWith('.xml'));
    return !hasVoucherNo && !hasInvoiceDetail;
  });

  const totalHighExpenseAmount = highExpensesNoInvoice.reduce((sum, t) => sum + t.amount, 0);

  // 2. Calculations for VAT Tax Report (01/GTGT)
  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  const vatIncomeTotal = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const vatIncomeTaxEst = Math.round(vatIncomeTotal * 0.1); // Ước tính 10%
  const vatExpenseTotal = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const vatExpenseTaxEst = Math.round(vatExpenseTotal * 0.1);

  const netVatPayable = Math.max(0, vatIncomeTaxEst - vatExpenseTaxEst);

  // 3. Inventory Data Aggregation (From transactions description or rawRow)
  const inventoryItems = transactions.reduce((acc, t) => {
    const itemName = t.description || 'Hàng hóa / Vật tư chung';
    if (!acc[itemName]) {
      acc[itemName] = { name: itemName, importedQty: 0, exportedQty: 0, totalAmount: 0 };
    }
    if (t.type === 'INCOME' || t.creditAcc.startsWith('156') || t.debitAcc.startsWith('156')) {
      acc[itemName].importedQty += 1;
    } else {
      acc[itemName].exportedQty += 1;
    }
    acc[itemName].totalAmount += t.amount;
    return acc;
  }, {} as Record<string, { name: string; importedQty: number; exportedQty: number; totalAmount: number }>);

  const inventoryList = Object.values(inventoryItems);

  // Filter list by search term
  const filteredHighExpenses = highExpensesNoInvoice.filter(t => 
    !searchTerm || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.amount.toString().includes(searchTerm)
  );

  return (
    <div className="p-4 space-y-4">
      {/* Compact Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-brand-950 text-white px-4 py-3 rounded-2xl border border-rose-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Kiểm Soát Thu Chi & Báo Cáo Thuế GTGT / Kho Hàng</h2>
            <p className="text-[11px] text-slate-300">Kiểm soát chi ≥ 5tr thiếu hóa đơn (rủi ro loại thuế TNDN), Tờ khai 01/GTGT, Nhập-Xuất-Tồn Kho</p>
          </div>
        </div>

        {/* Sub Tabs */}
        <div className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0 text-xs font-bold flex-wrap">
          <button
            onClick={() => setActiveSubTab('HIGH_EXPENSES')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'HIGH_EXPENSES' ? 'bg-rose-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Chi ≥ 5Tr Thiếu HĐ ({highExpensesNoInvoice.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('TAX_REPORT')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'TAX_REPORT' ? 'bg-brand-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Tờ Khai Thuế 01/GTGT</span>
          </button>
          <button
            onClick={() => setActiveSubTab('INVENTORY')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'INVENTORY' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Cân Đối Kho Hàng</span>
          </button>
          <button
            onClick={() => setActiveSubTab('CASHFLOW')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CASHFLOW' ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Cân Đối Thu Chi Quỹ/NH</span>
          </button>
        </div>
      </div>

      {/* SUB TAB 1: HIGH EXPENSE NO INVOICE CONTROL */}
      {activeSubTab === 'HIGH_EXPENSES' && (
        <div className="space-y-5">
          {/* Risk Alert Card */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-500/40 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
                  CẢNH BÁO: Phát hiện {highExpensesNoInvoice.length} khoản chi ≥ 5.000.000 VNĐ KHÔNG CÓ HÓA ĐƠN!
                </h3>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                  Theo Luật Thuế TNDN, các khoản chi trên 5 triệu đồng (hoặc 20tr thanh toán chuyển khoản) nếu thiếu Hóa đơn GTGT hoặc chứng từ hợp pháp sẽ <strong className="underline">BỊ LOẠI KHỎI CHI PHÍ HỢP LÝ</strong> khi quyết toán thuế.
                </p>
                <div className="text-xs font-extrabold text-rose-900 dark:text-rose-100 mt-2">
                  Rủi ro tổng số tiền chi phí có thể bị cơ quan thuế truy thu: <span className="text-base font-black text-rose-700 dark:text-rose-300">{totalHighExpenseAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => exportTransactionsToExcel(highExpensesNoInvoice, 'Danh_Sach_Chi_Tren_5Tr_Thieu_Hoa_Don')}
              className="px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow flex items-center gap-2 shrink-0 cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo Rủi Ro (Excel)</span>
            </button>
          </div>

          {/* Table Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Danh Sách Chi Tiết Khoản Chi ≥ 5 Triệu Cần Bổ Sung Hóa Đơn</span>
              </h3>

              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Lọc từ khóa, tên đối tác..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[420px]">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Ngày Chi</th>
                    <th className="p-3">Số CT Sổ Sách</th>
                    <th className="p-3">Diễn giải / Nội dung chi</th>
                    <th className="p-3 font-mono">TK Nợ/Có</th>
                    <th className="p-3 text-right">Số tiền Chi (VND)</th>
                    <th className="p-3">Đối tác nộp/nhận</th>
                    <th className="p-3 text-center">Trạng thái Hóa Đơn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {filteredHighExpenses.map((t) => (
                    <tr key={t.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-200">{t.date}</td>
                      <td className="p-3 font-mono text-brand-700 dark:text-brand-300 font-bold">{t.voucherNo || 'Trống'}</td>
                      <td className="p-3 max-w-xs font-medium">{t.description}</td>
                      <td className="p-3 font-mono text-amber-700 dark:text-amber-300 font-bold">{t.debitAcc} / {t.creditAcc}</td>
                      <td className="p-3 text-right font-extrabold tabular-num text-rose-600 dark:text-rose-400">{t.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="p-3">{t.partnerName || 'Chưa ghi tên đối tác'}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40 animate-pulse">
                          THIẾU HÓA ĐƠN
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredHighExpenses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        Tuyệt vời! Không phát hiện khoản chi ≥ 5 triệu nào bị thiếu hóa đơn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: VAT TAX REPORT 01/GTGT */}
      {activeSubTab === 'TAX_REPORT' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Tờ Khai Thuế Giá Trị Gia Tăng (Mẫu 01/GTGT)
              </h3>
              <p className="text-xs text-slate-500">Doanh nghiệp: {activeClient?.name || '---'} | MST: {activeClient?.taxCode || '---'}</p>
            </div>
            <button
              onClick={() => exportTransactionsToExcel(transactions, 'Bang_Ke_Thue_GTGT_01_GTGT')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Bảng Kê HTKK (Excel)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500">TỔNG DOANH THU BÁN RA [26-32]</span>
              <div className="text-lg font-extrabold text-emerald-600">{vatIncomeTotal.toLocaleString('vi-VN')} đ</div>
              <span className="text-[10px] text-slate-400">Thuế GTGT bán ra ước tính: {vatIncomeTaxEst.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500">TỔNG CHI PHÍ MUA VÀO [23-25]</span>
              <div className="text-lg font-extrabold text-rose-600">{vatExpenseTotal.toLocaleString('vi-VN')} đ</div>
              <span className="text-[10px] text-slate-400">Thuế GTGT mua vào khấu trừ: {vatExpenseTaxEst.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-500/30 space-y-1">
              <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300">THUẾ GTGT PHẢI NỘP TRONG KỲ [40]</span>
              <div className="text-xl font-black text-brand-700 dark:text-brand-300">{netVatPayable.toLocaleString('vi-VN')} đ</div>
              <span className="text-[10px] text-brand-600/80">Ước tính theo phát sinh sổ sách</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: INVENTORY BALANCE */}
      {activeSubTab === 'INVENTORY' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <span>Bảng Cân Đối Nhập - Xuất - Tồn Kho Hàng Hóa / Vật Tư</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[450px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Tên Vật Tư / Hàng Hóa</th>
                  <th className="p-3 text-center">Số Lượt Nhập</th>
                  <th className="p-3 text-center">Số Lượt Xuất</th>
                  <th className="p-3 text-right">Tổng Số Tiền Phát Sinh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {inventoryList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-200">{item.name}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{item.importedQty}</td>
                    <td className="p-3 text-center font-bold text-rose-600">{item.exportedQty}</td>
                    <td className="p-3 text-right font-bold tabular-num text-slate-900 dark:text-slate-100">{item.totalAmount.toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 4: CASHFLOW BALANCE */}
      {activeSubTab === 'CASHFLOW' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <span>Bảng Cân Đối Quỹ Tiền Mặt (TK 111) & Tiền Gửi Ngân Hàng (TK 112)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
                <span>TỔNG PHÁT SINH THU (NỢ 111 / NỢ 112)</span>
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">{vatIncomeTotal.toLocaleString('vi-VN')} VNĐ</div>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">Tổng các khoản thu tiền mặt và tiền gửi ngân hàng trong niên độ</p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-300">
                <span>TỔNG PHÁT SINH CHI (CÓ 111 / CÓ 112)</span>
                <ArrowDownRight className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">{vatExpenseTotal.toLocaleString('vi-VN')} VNĐ</div>
              <p className="text-xs text-rose-800/80 dark:text-rose-300/80">Tổng các khoản chi tiền mặt và rút tiền gửi ngân hàng trong niên độ</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
