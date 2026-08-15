import React from 'react';
import { Client, NormalizedTransaction, ReconciliationPair } from '../../types/accounting';
import { FileSpreadsheet, Printer, Download } from 'lucide-react';
import { exportTransactionsToExcel } from '../../services/excelService';

interface ReportGeneratorViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
  reconciliations: ReconciliationPair[];
  searchTerm?: string;
}

export const ReportGeneratorView: React.FC<ReportGeneratorViewProps> = ({
  activeClient,
  transactions,
  reconciliations,
  searchTerm = '',
}) => {
  const filterTransaction = (t: NormalizedTransaction) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (t.voucherNo && t.voucherNo.toLowerCase().includes(term)) ||
      (t.partnerName && t.partnerName.toLowerCase().includes(term)) ||
      (t.description && t.description.toLowerCase().includes(term)) ||
      t.amount.toString().includes(term) ||
      (t.date && t.date.includes(term))
    );
  };

  const filteredReconciliations = reconciliations.filter(r => {
    if (!searchTerm) return true;
    const v = transactions.find(t => t.id === r.voucherId);
    const s = transactions.find(t => t.id === r.statementId);
    if (v && filterTransaction(v)) return true;
    if (s && filterTransaction(s)) return true;
    return false;
  });

  const totalTxs = transactions.length;
  const matchedTxs = filteredReconciliations.length;
  const errorTxs = transactions.filter(t => t.validationStatus === 'ERROR').length;
  const incomeTxs = transactions.filter(t => t.type === 'INCOME');
  const expenseTxs = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = expenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

  const handleExportExcel = () => {
    exportTransactionsToExcel(transactions, `Bao_Cao_Doi_Chieu_${activeClient?.taxCode || 'TatCa'}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Báo Cáo Đối Chiếu & Thống Kê</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tổng hợp dữ liệu đối chiếu, kết quả kiểm lỗi và chi tiết tài chính.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-slate-900/20 transition-all active:scale-95 shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo (PDF)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="printable-summary">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">TỔNG SỐ CHỨNG TỪ</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalTxs}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">ĐÃ KHỚP ĐỐI CHIẾU</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{matchedTxs}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">CHỨNG TỪ BỊ LỖI</div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{errorTxs}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1">TỔNG SỐ CẶP ĐÃ GHÉP</div>
          <div className="text-2xl font-extrabold text-brand-700 dark:text-brand-300">{reconciliations.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            Tổng Quan Tài Chính
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dotted border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">Tổng thu (Bán ra)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalIncome.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dotted border-slate-200 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">Tổng chi (Mua vào)</span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold">{totalExpense.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dotted border-slate-200 dark:border-slate-700">
              <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">Chênh lệch Thu - Chi</span>
              <span className="text-brand-600 dark:text-brand-400 font-extrabold">{(totalIncome - totalExpense).toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            Thông Tin Khách Hàng / Đơn Vị
          </h3>
          {activeClient ? (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tên đơn vị:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{activeClient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mã số thuế:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{activeClient.taxCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kỳ kế toán:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{activeClient.financialYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Địa chỉ:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 text-right w-1/2 truncate" title={activeClient.address}>{activeClient.address}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-sm italic">
              Chưa chọn khách hàng nào.
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
        <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
          <strong>Lưu ý in ấn:</strong> Khi nhấn "In Báo Cáo", trình duyệt sẽ mở hộp thoại in. Bạn có thể chọn máy in thực tế hoặc chọn "Save as PDF" để xuất ra file PDF. Vui lòng bật "Background graphics" (In hình nền) để giữ màu sắc của báo cáo.
        </p>
      </div>
    </div>
  );
};
