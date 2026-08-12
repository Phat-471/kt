import React, { useState, useEffect } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import {
  CorrectionEntry,
  getAllCorrectionEntries,
  createReverseEntry,
  approveCorrectionEntry,
  rejectCorrectionEntry,
  getCorrectionStats,
} from '../../services/correctionEntryService';
import {
  FilePenLine, RotateCcw, CheckCircle2, XCircle, Clock,
  AlertTriangle, ChevronDown, ChevronUp, PlusCircle, Info
} from 'lucide-react';

interface CorrectionLedgerViewProps {
  transactions: NormalizedTransaction[];
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const CorrectionLedgerView: React.FC<CorrectionLedgerViewProps> = ({ transactions }) => {
  const [entries, setEntries] = useState<CorrectionEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [selectedTxId, setSelectedTxId] = useState('');
  const [reason, setReason] = useState('');
  const [correctedBy, setCorrectedBy] = useState('Kế toán viên');
  const [repDebit, setRepDebit] = useState('');
  const [repCredit, setRepCredit] = useState('');
  const [repAmount, setRepAmount] = useState('');

  const refresh = () => setEntries(getAllCorrectionEntries());

  useEffect(() => {
    refresh();
  }, []);

  const stats = getCorrectionStats();

  const selectedTx = transactions.find(t => t.id === selectedTxId);

  const filtered = entries.filter(e => filterStatus === 'ALL' || e.status === filterStatus);

  const handleCreate = () => {
    if (!selectedTx || !reason.trim() || !correctedBy.trim()) {
      alert('Vui lòng chọn chứng từ, nhập lý do điều chỉnh và người lập phiếu!');
      return;
    }
    createReverseEntry(
      selectedTx, reason, correctedBy,
      repDebit || undefined, repCredit || undefined,
      repAmount ? Number(repAmount) : undefined,
    );
    refresh();
    setShowCreateForm(false);
    setSelectedTxId(''); setReason(''); setRepDebit(''); setRepCredit(''); setRepAmount('');
    alert('✅ Đã tạo phiếu điều chỉnh thành công! Chờ phê duyệt.');
  };

  const handleApprove = (id: string) => {
    approveCorrectionEntry(id, 'Kế toán trưởng');
    refresh();
  };

  const handleReject = (id: string) => {
    rejectCorrectionEntry(id);
    refresh();
  };

  const statusConfig: Record<FilterStatus, { label: string; color: string }> = {
    ALL: { label: 'Tất cả', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    PENDING: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    REJECTED: { label: 'Từ chối', color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-indigo-900 text-white px-5 py-4 rounded-2xl border border-indigo-500/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FilePenLine className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Sổ Bút Toán Điều Chỉnh & Đảo Bút Toán</h2>
              <p className="text-[11px] text-indigo-300 mt-0.5">
                Nguyên tắc: Không xóa chứng từ gốc — chỉ lập bút toán âm đảo ngược (TT200/2014)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Tạo Phiếu Điều Chỉnh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              filterStatus === s
                ? 'border-indigo-400 shadow-md ring-2 ring-indigo-300/40'
                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            } bg-white dark:bg-slate-900`}
          >
            <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${statusConfig[s].color}`}>
              {statusConfig[s].label}
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {s === 'ALL' ? stats.total : s === 'PENDING' ? stats.pending : s === 'APPROVED' ? stats.approved : stats.rejected}
            </div>
          </button>
        ))}
      </div>

      {/* Principle Alert */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/20 rounded-xl">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800 dark:text-blue-300">
          <strong>Nguyên tắc điều chỉnh TT200:</strong> Khi phát hiện sai sót sau khi đã ghi sổ, kế toán lập <strong>bút toán đảo (số âm)</strong> để triệt tiêu bút toán sai, sau đó lập bút toán đúng. Dữ liệu gốc luôn được giữ nguyên để đảm bảo tính toàn vẹn sổ sách.
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 space-y-4 shadow-md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            Lập Phiếu Đảo Bút Toán
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chọn Chứng Từ Cần Điều Chỉnh <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTxId}
                onChange={e => setSelectedTxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">-- Chọn chứng từ --</option>
                {transactions.slice(0, 100).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.voucherNo} | {t.date} | {t.description.slice(0, 50)} | {t.amount.toLocaleString('vi-VN')} đ
                  </option>
                ))}
              </select>
            </div>

            {selectedTx && (
              <div className="sm:col-span-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs">
                <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">📌 Bút toán GỐC (sẽ bị đảo ngược):</p>
                <p className="text-slate-700 dark:text-slate-300">
                  Nợ <strong>{selectedTx.debitAcc}</strong> / Có <strong>{selectedTx.creditAcc}</strong> |
                  Số tiền: <strong>{selectedTx.amount.toLocaleString('vi-VN')} đ</strong>
                </p>
                <p className="text-slate-500 mt-1">→ Đảo: Nợ {selectedTx.creditAcc} / Có {selectedTx.debitAcc} | Số tiền: <strong className="text-rose-600">-{selectedTx.amount.toLocaleString('vi-VN')} đ</strong></p>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lý Do Điều Chỉnh <span className="text-rose-500">*</span>
              </label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="VD: Sai tài khoản ghi nợ, cần chuyển từ TK 642 sang TK 641..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Người Lập Phiếu <span className="text-rose-500">*</span></label>
              <input
                value={correctedBy}
                onChange={e => setCorrectedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-4">
              <Info className="w-3.5 h-3.5" />
              Bút toán thay thế (tùy chọn):
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">TK Nợ Đúng</label>
              <input value={repDebit} onChange={e => setRepDebit(e.target.value)} placeholder="VD: 641" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">TK Có Đúng</label>
              <input value={repCredit} onChange={e => setRepCredit(e.target.value)} placeholder="VD: 112" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Số Tiền Đúng (đ)</label>
              <input value={repAmount} onChange={e => setRepAmount(e.target.value)} type="number" placeholder="VD: 5000000" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              Lập Phiếu Điều Chỉnh
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Danh Sách Phiếu Điều Chỉnh ({filtered.length})
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-600 text-sm">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Chưa có phiếu điều chỉnh nào.</p>
            <p className="text-xs mt-1">Nhấn "Tạo Phiếu Điều Chỉnh" để bắt đầu.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.map(entry => (
              <div key={entry.id} className="px-5 py-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.status === 'APPROVED'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      : entry.status === 'REJECTED'
                        ? <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        : <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Đảo bút toán: <span className="text-indigo-600 dark:text-indigo-400">{entry.originalVoucherNo}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{entry.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      entry.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                        : entry.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                    }`}>
                      {entry.status === 'APPROVED' ? 'Đã duyệt' : entry.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                    {expandedId === entry.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedId === entry.id && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-500/20">
                        <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">Bút toán ĐẢO (Âm)</p>
                        <p className="text-slate-700 dark:text-slate-300 font-mono">
                          Nợ {entry.reverseEntry.debitAcc} / Có {entry.reverseEntry.creditAcc}
                        </p>
                        <p className="text-rose-600 dark:text-rose-400 font-bold mt-1">
                          {entry.reverseEntry.amount.toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                      {entry.replacementEntry && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                          <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">Bút toán ĐÚNG (Thay thế)</p>
                          <p className="text-slate-700 dark:text-slate-300 font-mono">
                            Nợ {entry.replacementEntry.debitAcc} / Có {entry.replacementEntry.creditAcc}
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                            +{entry.replacementEntry.amount.toLocaleString('vi-VN')} đ
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                      <p>Người lập: <strong className="text-slate-700 dark:text-slate-300">{entry.correctedBy}</strong> | Ngày lập: {new Date(entry.correctedAt).toLocaleDateString('vi-VN')}</p>
                      {entry.approvedBy && <p>Người duyệt: <strong className="text-slate-700 dark:text-slate-300">{entry.approvedBy}</strong> | {new Date(entry.approvedAt!).toLocaleDateString('vi-VN')}</p>}
                    </div>

                    {entry.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(entry.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Phê Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(entry.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-lg transition-all active:scale-95"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ Chối
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning footer */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Lưu ý pháp lý:</strong> Theo TT200/2014, khi sửa sai chứng từ kế toán sau khi đã ghi sổ, phải lập bút toán điều chỉnh có chữ ký của người lập, người kiểm tra và kế toán trưởng. Không được xóa, tẩy xóa hoặc làm thay đổi chứng từ gốc.
        </span>
      </div>
    </div>
  );
};
