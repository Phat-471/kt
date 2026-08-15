import React, { useState, useEffect } from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import {
  createDataSnapshot,
  getSavedDataSnapshots,
  compareDataSnapshots,
  DataSnapshotVersion,
} from '../../services/dataVersioningService';
import { createAdjustmentEntry } from '../../services/adjustmentEntryService';
import { detectDataAnomalies, DataAnomalyIssue } from '../../services/aiAnomalyDetector';
import {
  History,
  GitBranch,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DataVersionHistoryViewProps {
  transactions: NormalizedTransaction[];
  activeClient?: Client | null;
  onUpdateTransactions?: (updated: NormalizedTransaction[]) => void;
}

export const DataVersionHistoryView: React.FC<DataVersionHistoryViewProps> = ({
  transactions,
  activeClient,
  onUpdateTransactions,
}) => {
  const [snapshots, setSnapshots] = useState<DataSnapshotVersion[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DataSnapshotVersion | null>(null);
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  const [anomalies, setAnomalies] = useState<DataAnomalyIssue[]>([]);
  const [activeTab, setActiveTab] = useState<'VERSIONS' | 'ANOMALIES'>('ANOMALIES');

  useEffect(() => {
    setSnapshots(getSavedDataSnapshots());
    setAnomalies(detectDataAnomalies(transactions));
  }, [transactions]);

  const handleCreateSnapshot = () => {
    if (!snapshotNameInput.trim()) return;
    const newSnapshot = createDataSnapshot(snapshotNameInput.trim(), transactions);
    setSnapshots(getSavedDataSnapshots());
    setSelectedSnapshot(newSnapshot);
    setSnapshotNameInput('');
  };

  const handleApplyAdjustmentFix = (anomaly: DataAnomalyIssue) => {
    const targetTx = transactions.find(t => t.id === anomaly.transactionId);
    if (!targetTx) return;

    const result = createAdjustmentEntry(targetTx, targetTx.amount / 10, undefined, 'RED_NEGATIVE_REVERSAL');
    const updated = [...transactions, result.adjustedTransaction];

    if (onUpdateTransactions) {
      onUpdateTransactions(updated);
    }
    setAnomalies(detectDataAnomalies(updated));
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
              <span>Quản Lý Lịch Sử Version Dữ Liệu & Khắc Phục Sai Lệch</span>
              <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full text-white font-bold">
                VERSION 2.0
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeClient ? activeClient.name : 'Doanh Nghiệp Kế Toán Pro'} | Lập bút toán điều chỉnh & Time Machine khôi phục dữ liệu gốc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ANOMALIES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ANOMALIES'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Phát Hiện Sai Lệch ({anomalies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('VERSIONS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'VERSIONS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lịch Sử Snapshot ({snapshots.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'ANOMALIES' && (
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  AI Trợ Lý Quét Tự Động {anomalies.length} Điểm Bất Thường Trên Dữ Liệu Đã Nhập
                </h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Hệ thống tự động phát hiện số tiền đột biến, gõ thừa số 0 hoặc ngược chiều Nợ/Có để lập Bút Toán Điều Chỉnh chuẩn kế toán.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {anomalies.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                Dữ liệu sạch 100%! Không phát hiện bất kỳ chứng từ nhập sai số tiền hay sai quy tắc kế toán nào.
              </div>
            ) : (
              anomalies.map((anom) => (
                <div key={anom.id} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                        {anom.severity}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{anom.title}</span>
                      <span className="text-[11px] text-slate-500">Mã CT: <span className="font-bold">{anom.voucherNo}</span></span>
                    </div>

                    <button
                      onClick={() => handleApplyAdjustmentFix(anom)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Lập Bút Toán Điều Chỉnh (Ghi Đỏ)</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{anom.description}</p>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    👉 Khắc phục đề xuất: {anom.suggestedFix}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'VERSIONS' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 flex-1">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <input
                type="text"
                value={snapshotNameInput}
                onChange={(e) => setSnapshotNameInput(e.target.value)}
                placeholder="Nhập tên phiên bản Snapshot (VD: Chốt số khóa sổ Tháng 08/2026)..."
                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs outline-none text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              onClick={handleCreateSnapshot}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Snapshot Mới</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {snapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Chưa có phiên bản Snapshot nào được lưu. Hãy bấm "Tạo Snapshot Mới" để ghi lại trạng thái dữ liệu trước khi chỉnh sửa.
              </div>
            ) : (
              snapshots.map((snap) => (
                <div key={snap.versionId} className="p-3.5 space-y-1 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{snap.versionName}</span>
                      <span className="text-[10px] text-slate-400">({snap.createdAt} bởi {snap.createdBy})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSnapshot(snap)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        So Sánh Diff
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-4 pt-0.5">
                    <span>Số lượng dòng: <strong className="text-slate-700 dark:text-slate-300">{snap.totalTransactions}</strong></span>
                    <span>Doanh thu: <strong className="text-emerald-600">{snap.totalRevenue.toLocaleString()} VNĐ</strong></span>
                    <span>Chi phí: <strong className="text-rose-600">{snap.totalExpense.toLocaleString()} VNĐ</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedSnapshot && (
            <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-500" />
                <span>Kết Quả So Sánh Diff Với {selectedSnapshot.versionName}</span>
              </h4>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Tổng số dòng thay đổi: <strong>{compareDataSnapshots(selectedSnapshot, transactions).totalChanges}</strong> chứng từ so với phiên bản hiện tại.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
