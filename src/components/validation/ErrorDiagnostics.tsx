import React, { useState } from 'react';
import { NormalizedTransaction, ValidationStatus, AdvancedFilterParams } from '../../types/accounting';
import { validateTransaction } from '../../services/validationRules';
import { exportTransactionsToExcel } from '../../services/excelService';
import { exportValidationDiagnosticsPDF } from '../../services/pdfExporter';
import { AdvancedFilterBar, filterTransactionsHelper } from '../common/AdvancedFilterBar';
import { ColumnVisibilityModal, ColumnDef } from '../common/ColumnVisibilityModal';
import { ShieldAlert, CheckCircle2, AlertTriangle, Edit3, Download, CheckCheck, FileText, Eye, Check, SlidersHorizontal } from 'lucide-react';

interface ErrorDiagnosticsProps {
  transactions: NormalizedTransaction[];
  onUpdateTransaction: (tx: NormalizedTransaction) => void;
  onBatchApprove: (ids: string[]) => void;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'select', label: 'Duyệt', visible: true, required: true },
  { id: 'date', label: 'Ngày CT', visible: true },
  { id: 'voucherNo', label: 'Số CT', visible: true, required: true },
  { id: 'description', label: 'Diễn giải', visible: true },
  { id: 'debitAcc', label: 'TK Nợ', visible: true },
  { id: 'creditAcc', label: 'TK Có', visible: true },
  { id: 'amount', label: 'Số tiền (VND)', visible: true },
  { id: 'partner', label: 'Đối tác / MST', visible: true },
  { id: 'sourceFile', label: 'Tệp Nguồn Excel', visible: true },
  { id: 'errors', label: 'Chi tiết lỗi & Cảnh báo', visible: true, required: true },
  { id: 'actions', label: 'Thao tác', visible: true, required: true },
];

export const ErrorDiagnostics: React.FC<ErrorDiagnosticsProps> = ({
  transactions,
  onUpdateTransaction,
  onBatchApprove,
}) => {
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedTransaction>>({});
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [density, setDensity] = useState<'NORMAL' | 'COMPACT'>('NORMAL');

  // Load column preference from localStorage
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    const saved = localStorage.getItem('accodesk_cols_error_diag');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_COLUMNS;
  });

  const handleSaveColumns = (newCols: ColumnDef[]) => {
    setColumns(newCols);
    localStorage.setItem('accodesk_cols_error_diag', JSON.stringify(newCols));
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.removeItem('accodesk_cols_error_diag');
  };

  const isColVisible = (id: string) => {
    const col = columns.find(c => c.id === id);
    return col ? col.visible : true;
  };

  const [advancedParams, setAdvancedParams] = useState<AdvancedFilterParams>({
    keyword: '',
    fromDate: '',
    toDate: '',
    account: '',
    minAmount: '',
    maxAmount: '',
    status: 'ALL',
  });

  // Filtered List combining Status pills + Advanced Filter Bar
  const searchFiltered = filterTransactionsHelper(transactions, advancedParams);
  const filteredTxs = searchFiltered.filter((t) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'APPROVED') return t.userApproved;
    return t.validationStatus === filterStatus;
  });

  const errorCount = transactions.filter(t => t.validationStatus === 'ERROR').length;
  const warningCount = transactions.filter(t => t.validationStatus === 'WARNING').length;
  const approvedCount = transactions.filter(t => t.userApproved).length;

  const startEdit = (t: NormalizedTransaction) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    const current = transactions.find(t => t.id === editingId);
    if (!current) return;

    const updatedTx: NormalizedTransaction = {
      ...current,
      ...editForm,
      amount: Number(editForm.amount || 0),
    } as NormalizedTransaction;

    // Re-run validation rule with cross-file check
    const res = validateTransaction(updatedTx, transactions);
    updatedTx.errors = res.errors;
    updatedTx.validationStatus = res.status;

    onUpdateTransaction(updatedTx);
    setEditingId(null);
  };

  const handleApproveSingle = (t: NormalizedTransaction) => {
    const updated = { ...t, userApproved: !t.userApproved };
    onUpdateTransaction(updated);
  };

  const handleApproveAllFiltered = () => {
    const unapprovedIds = filteredTxs.filter(t => !t.userApproved).map(t => t.id);
    if (unapprovedIds.length === 0) {
      alert('Tất cả chứng từ trên màn hình đã được duyệt!');
      return;
    }
    if (confirm(`Xác nhận phê duyệt hàng loạt ${unapprovedIds.length} dòng chứng từ trên màn hình?`)) {
      onBatchApprove(unapprovedIds);
    }
  };

  const cellPadding = density === 'COMPACT' ? 'p-1.5' : 'p-3';

  return (
    <div className="p-4 space-y-4">
      {/* Header Stat Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">CÓ LỖI CẦN SỬA</div>
            <div className="text-base font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">{errorCount} dòng</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">CẢNH BÁO CHÚ Ý</div>
            <div className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">{warningCount} dòng</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">KẾ TOÁN ĐÃ DUYỆT</div>
            <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">{approvedCount} dòng</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar Component */}
      <AdvancedFilterBar
        onFilterChange={(params) => setAdvancedParams(params)}
        totalCount={transactions.length}
        filteredCount={filteredTxs.length}
      />

      {/* Main Error Inspection Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-3 shadow-sm">
        {/* Status Pill Filters and Export Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">Lọc lỗi:</span>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Tất cả ({transactions.length})
            </button>
            <button
              onClick={() => setFilterStatus('ERROR')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterStatus === 'ERROR' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 dark:bg-slate-800 dark:text-rose-400 hover:bg-rose-100'
              }`}
            >
              Lỗi ({errorCount})
            </button>
            <button
              onClick={() => setFilterStatus('WARNING')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterStatus === 'WARNING' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-700 dark:bg-slate-800 dark:text-amber-400 hover:bg-amber-100'
              }`}
            >
              Cảnh báo ({warningCount})
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                filterStatus === 'APPROVED' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-400 hover:bg-emerald-100'
              }`}
            >
              Đã duyệt ({approvedCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Density Switcher */}
            <button
              onClick={() => setDensity(density === 'NORMAL' ? 'COMPACT' : 'NORMAL')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Thay đổi khoảng cách dòng (Vừa vặn / Thu gọn)"
            >
              <SlidersHorizontal className="w-3 h-3 text-brand-600 dark:text-brand-400" />
              <span>{density === 'NORMAL' ? 'Dòng vừa' : 'Dòng gọn'}</span>
            </button>

            {/* Column Visibility Button */}
            <button
              onClick={() => setIsColumnModalOpen(true)}
              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:hover:bg-brand-500/30 dark:text-brand-300 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-brand-200 dark:border-brand-500/30 cursor-pointer"
            >
              <Eye className="w-3 h-3" />
              <span>Tùy Chỉnh Cột</span>
            </button>

            <button
              onClick={handleApproveAllFiltered}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Duyệt Màn Hình</span>
            </button>

            <button
              onClick={() => exportTransactionsToExcel(transactions, 'Bao_Cao_Kiem_Loi_Ke_Toan')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-3 h-3 text-brand-600 dark:text-brand-400" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() => exportValidationDiagnosticsPDF(null, transactions)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <FileText className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Xuất PDF</span>
            </button>
          </div>
        </div>

        {/* Data Grid with Sticky Columns & Max Dynamic Viewport Height */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[calc(100vh-210px)] scrollbar-thin">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1300px] border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
              <tr>
                {isColVisible('select') && (
                  <th className={`w-12 ${cellPadding} sticky left-0 z-30 bg-slate-100 dark:bg-slate-950 shadow-r border-r border-slate-200 dark:border-slate-800 text-center`}>
                    Duyệt
                  </th>
                )}
                {isColVisible('date') && <th className={`w-28 ${cellPadding}`}>Ngày CT</th>}
                {isColVisible('voucherNo') && (
                  <th className={`w-32 ${cellPadding} sticky left-12 z-30 bg-slate-100 dark:bg-slate-950 shadow-r border-r border-slate-200 dark:border-slate-800`}>
                    Số CT
                  </th>
                )}
                {isColVisible('description') && <th className={`min-w-[280px] ${cellPadding}`}>Diễn giải</th>}
                {isColVisible('debitAcc') && <th className={`w-20 ${cellPadding}`}>TK Nợ</th>}
                {isColVisible('creditAcc') && <th className={`w-20 ${cellPadding}`}>TK Có</th>}
                {isColVisible('amount') && <th className={`w-36 ${cellPadding} text-right`}>Số tiền (VND)</th>}
                {isColVisible('partner') && <th className={`min-w-[200px] ${cellPadding}`}>Đối tác / MST</th>}
                {isColVisible('sourceFile') && <th className={`min-w-[160px] ${cellPadding}`}>Tệp Nguồn Excel</th>}
                {isColVisible('errors') && <th className={`min-w-[320px] ${cellPadding}`}>Chi tiết lỗi & Cảnh báo</th>}
                {isColVisible('actions') && (
                  <th className={`w-24 ${cellPadding} text-center sticky right-0 z-30 bg-slate-100 dark:bg-slate-950 shadow-l border-l border-slate-200 dark:border-slate-800`}>
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredTxs.map((t) => {
                const isEditing = editingId === t.id;
                const rowBg = t.userApproved
                  ? 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20'
                  : t.validationStatus === 'ERROR'
                  ? 'bg-rose-50/60 hover:bg-rose-100/60 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
                  : t.validationStatus === 'WARNING'
                  ? 'bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40';

                return (
                  <tr key={t.id} className={`transition-colors ${rowBg}`}>
                    {/* Sticky Select Col */}
                    {isColVisible('select') && (
                      <td className={`${cellPadding} sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-center shadow-r`}>
                        <input
                          type="checkbox"
                          checked={t.userApproved}
                          onChange={() => handleApproveSingle(t)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Date Col */}
                    {isColVisible('date') && (
                      <td className={`${cellPadding} font-bold text-slate-900 dark:text-slate-200`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.date || ''}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          t.date || <span className="text-rose-600 font-bold italic">Trống</span>
                        )}
                      </td>
                    )}

                    {/* Sticky VoucherNo Col */}
                    {isColVisible('voucherNo') && (
                      <td className={`${cellPadding} text-brand-700 dark:text-brand-300 font-bold sticky left-12 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-r`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.voucherNo || ''}
                            onChange={(e) => setEditForm({ ...editForm, voucherNo: e.target.value })}
                            className="w-full px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          t.voucherNo || <span className="text-rose-600 font-bold italic">Trống</span>
                        )}
                      </td>
                    )}

                    {/* Description Col */}
                    {isColVisible('description') && (
                      <td className={`${cellPadding} font-medium`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          t.description || <span className="text-slate-400 italic">Chưa ghi</span>
                        )}
                      </td>
                    )}

                    {/* Debit Acc Col */}
                    {isColVisible('debitAcc') && (
                      <td className={`${cellPadding} font-mono text-amber-700 dark:text-amber-300 font-bold`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.debitAcc || ''}
                            onChange={(e) => setEditForm({ ...editForm, debitAcc: e.target.value })}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          t.debitAcc || <span className="text-rose-600 italic">---</span>
                        )}
                      </td>
                    )}

                    {/* Credit Acc Col */}
                    {isColVisible('creditAcc') && (
                      <td className={`${cellPadding} font-mono text-emerald-700 dark:text-emerald-300 font-bold`}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.creditAcc || ''}
                            onChange={(e) => setEditForm({ ...editForm, creditAcc: e.target.value })}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                          />
                        ) : (
                          t.creditAcc || <span className="text-rose-600 italic">---</span>
                        )}
                      </td>
                    )}

                    {/* Amount Col */}
                    {isColVisible('amount') && (
                      <td className={`${cellPadding} text-right font-extrabold tabular-num text-slate-900 dark:text-slate-100`}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.amount || 0}
                            onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                            className="w-28 px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white text-right font-bold"
                          />
                        ) : (
                          `${t.amount.toLocaleString('vi-VN')} đ`
                        )}
                      </td>
                    )}

                    {/* Partner Col */}
                    {isColVisible('partner') && (
                      <td className={`${cellPadding} text-slate-800 dark:text-slate-300 font-medium`}>
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="Tên đối tác"
                              value={editForm.partnerName || ''}
                              onChange={(e) => setEditForm({ ...editForm, partnerName: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                            />
                            <input
                              type="text"
                              placeholder="Mã số thuế"
                              value={editForm.partnerTaxCode || ''}
                              onChange={(e) => setEditForm({ ...editForm, partnerTaxCode: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white font-bold"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold">{t.partnerName || '---'}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">MST: {t.partnerTaxCode || '---'}</div>
                          </div>
                        )}
                      </td>
                    )}

                    {/* Source File Col */}
                    {isColVisible('sourceFile') && (
                      <td className={`${cellPadding} text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[180px]`}>
                        {t.sourceFileName}
                      </td>
                    )}

                    {/* Error & Warnings Col */}
                    {isColVisible('errors') && (
                      <td className={`${cellPadding}`}>
                        {t.errors.length > 0 ? (
                          <div className="space-y-1">
                            {t.errors.map((err, i) => (
                              <div
                                key={i}
                                className={`text-[11px] font-bold flex items-start gap-1.5 ${
                                  err.severity === 'ERROR'
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                <span className="mt-0.5">•</span>
                                <span>{err.message}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Hợp lệ 100%</span>
                          </span>
                        )}
                      </td>
                    )}

                    {/* Sticky Actions Col */}
                    {isColVisible('actions') && (
                      <td className={`${cellPadding} text-center sticky right-0 z-10 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-l`}>
                        {isEditing ? (
                          <button
                            onClick={saveEdit}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded shadow cursor-pointer transition-all active:scale-95"
                          >
                            Lưu
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(t)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg transition-colors cursor-pointer"
                            title="Sửa nhanh chứng từ này"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Visibility Picker Modal */}
      <ColumnVisibilityModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columns={columns}
        onChangeColumns={handleSaveColumns}
        onReset={handleResetColumns}
      />
    </div>
  );
};
