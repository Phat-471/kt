import React, { useMemo } from 'react';
import { TradeUnionTransaction, TradeUnionVoucherType } from '../../types/accounting';
import { Receipt, Printer, CheckSquare, Square, Calendar, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SearchBar } from '../common/SearchBar';
import { formatNumber } from '../../utils/formatters';

interface VouchersTabProps {
  transactions: TradeUnionTransaction[];
  selectedMonth: number | 'ALL';
  onSelectMonth: (month: number | 'ALL') => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  voucherFilter: 'ALL' | 'RECEIPT' | 'PAYMENT';
  onVoucherFilterChange: (val: 'ALL' | 'RECEIPT' | 'PAYMENT') => void;
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  onOpenAddModal: (type: TradeUnionVoucherType) => void;
  onPrintSingle: (tx: TradeUnionTransaction) => void;
  onPrintBatchSelected: () => void;
  onPrintMonth: (month: number | 'ALL') => void;
  onDeleteSelected?: () => void;
}

export const VouchersTab: React.FC<VouchersTabProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  searchTerm,
  onSearchChange,
  voucherFilter,
  onVoucherFilterChange,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  onOpenAddModal,
  onPrintSingle,
  onPrintBatchSelected,
  onPrintMonth,
  onDeleteSelected,
}) => {
  const monthFilteredList = useMemo(() => {
    return transactions.filter(t => {
      if (selectedMonth !== 'ALL') {
        const d = new Date(t.date);
        const m = !isNaN(d.getMonth()) ? d.getMonth() + 1 : 1;
        if (m !== selectedMonth) return false;
      }
      if (voucherFilter === 'RECEIPT' && t.voucherType !== 'UNION_RECEIPT') return false;
      if (voucherFilter === 'PAYMENT' && t.voucherType !== 'UNION_PAYMENT') return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          t.voucherNo.toLowerCase().includes(term) ||
          t.personName.toLowerCase().includes(term) ||
          t.reason.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [transactions, selectedMonth, voucherFilter, searchTerm]);

  const monthSummary = useMemo(() => {
    let thu = 0;
    let chi = 0;
    let countThu = 0;
    let countChi = 0;

    monthFilteredList.forEach(t => {
      if (t.voucherType === 'UNION_RECEIPT') {
        thu += t.amount;
        countThu++;
      } else {
        chi += t.amount;
        countChi++;
      }
    });

    return { thu, chi, countThu, countChi, total: monthFilteredList.length };
  }, [monthFilteredList]);

  const isAllSelected = monthFilteredList.length > 0 && selectedIds.length === monthFilteredList.length;

  return (
    <div className="space-y-4">
      {/* Thanh Tiêu Đề & Nút Tạo Phiếu */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Phiếu Thu (C40) & Phiếu Chi (C41)</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Mẫu TT 107
              </span>
            </h2>
            <p className="text-xs text-slate-500">Tạo phiếu, chọn tháng để in hoặc tích chọn in nhiều phiếu cùng lúc</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAddModal('UNION_RECEIPT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Thu</span>
          </button>
          <button
            onClick={() => onOpenAddModal('UNION_PAYMENT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* Thanh Chọn Tháng */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>XEM THEO THÁNG:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => onSelectMonth('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Cả Năm ({transactions.length})
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
              const countInMonth = transactions.filter(t => {
                const d = new Date(t.date);
                return (!isNaN(d.getMonth()) ? d.getMonth() + 1 : 1) === m;
              }).length;

              return (
                <button
                  key={m}
                  onClick={() => onSelectMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedMonth === m
                      ? 'bg-blue-600 text-white shadow-sm'
                      : countInMonth > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  T{m} {countInMonth > 0 && <span className="text-[10px] ml-0.5 font-bold">({countInMonth})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thống kê nhanh & Nút In ấn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap font-medium">
            <span className="text-slate-600">
              Đang xem: <strong className="text-slate-900">{selectedMonth === 'ALL' ? 'Tất cả 12 tháng' : `Tháng ${selectedMonth}`}</strong> ({monthSummary.total} phiếu)
            </span>
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Thu: {formatNumber(monthSummary.thu)} đ ({monthSummary.countThu})</span>
            </span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Chi: {formatNumber(monthSummary.chi)} đ ({monthSummary.countChi})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút In Theo Tháng */}
            <button
              onClick={() => onPrintMonth(selectedMonth)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {selectedMonth === 'ALL' ? `In Cả Năm (${monthFilteredList.length} phiếu)` : `In Tháng ${selectedMonth} (${monthFilteredList.length} phiếu)`}
              </span>
            </button>

            {/* Nút In Các Phiếu Được Tích Chọn */}
            {selectedIds.length > 0 && (
              <button
                onClick={onPrintBatchSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Đã Chọn ({selectedIds.length})</span>
              </button>
            )}

            {selectedIds.length > 0 && onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tìm Kiếm & Lọc Loại Phiếu */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-wrap">
        <SearchBar value={searchTerm} onChange={onSearchChange} placeholder="Tìm số phiếu, họ tên người nộp/nhận, nội dung..." />
        
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => onVoucherFilterChange('ALL')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              voucherFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => onVoucherFilterChange('RECEIPT')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              voucherFilter === 'RECEIPT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phiếu Thu
          </button>
          <button
            onClick={() => onVoucherFilterChange('PAYMENT')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              voucherFilter === 'PAYMENT' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phiếu Chi
          </button>
        </div>
      </div>

      {/* Bảng Danh Sách Phiếu */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-10 text-center">
                <button onClick={onToggleSelectAll} className="text-slate-400 hover:text-slate-700">
                  {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-24">Ngày</th>
              <th className="p-3 w-28">Số Phiếu</th>
              <th className="p-3 w-28">Loại</th>
              <th className="p-3">Người Nộp / Nhận & Nội Dung</th>
              <th className="p-3 w-32 text-right">Số Tiền (đ)</th>
              <th className="p-3 w-20 text-center">In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monthFilteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Chưa có phiếu nào {selectedMonth !== 'ALL' ? `trong Tháng ${selectedMonth}` : ''}.
                </td>
              </tr>
            ) : (
              monthFilteredList.map((tx, idx) => {
                const isReceipt = tx.voucherType === 'UNION_RECEIPT';
                const isSelected = selectedIds.includes(tx.id);
                return (
                  <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-3 text-center">
                      <button onClick={() => onToggleSelectOne(tx.id)} className="text-slate-400 hover:text-slate-700">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-600">{tx.date}</td>
                    <td className="p-3 font-bold font-mono text-blue-700">{tx.voucherNo}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        isReceipt 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isReceipt ? 'Thu (C40)' : 'Chi (C41)'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{tx.personName}</div>
                      <div className="text-slate-500 line-clamp-1 mt-0.5">{tx.reason}</div>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold text-sm ${isReceipt ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onPrintSingle(tx)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all border border-blue-200"
                        title="In phiếu này"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
