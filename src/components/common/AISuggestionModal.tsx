import React, { useState } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import { suggestAccountsByAI, AIAccountSuggestion } from '../../services/aiAccountSuggestionService';
import { auditCrossLogicConsistency, CrossLogicAuditSummary } from '../../services/crossLogicAuditService';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, X, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface AISuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: NormalizedTransaction[];
  onApplyAISuggestion?: (txId: string, debit: string, credit: string) => void;
}

export const AISuggestionModal: React.FC<AISuggestionModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onApplyAISuggestion,
}) => {
  if (!isOpen) return null;

  const [activeSubTab, setActiveSubTab] = useState<'SUGGEST' | 'CROSS_LOGIC'>('SUGGEST');
  const auditSummary: CrossLogicAuditSummary = auditCrossLogicConsistency(transactions);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <span>Trợ Lý AI Gợi Ý Định Khoản & Kiểm Trợ Logic Chéo</span>
                <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded-full text-white font-bold">
                  AI PRO
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Tự động gợi ý cặp TK Nợ/Có chuẩn Thông tư 200 & phát hiện 5 xung đột chéo</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2 bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 select-none">
          <button
            onClick={() => setActiveSubTab('SUGGEST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'SUGGEST'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Gợi Ý Định Khoản ({transactions.length} dòng)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('CROSS_LOGIC')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'CROSS_LOGIC'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Cảnh Báo Lệch Logic Chéo ({auditSummary.totalIssuesCount} phát hiện)</span>
          </button>
        </div>

        {/* Tab 1: AI Account Suggestion */}
        {activeSubTab === 'SUGGEST' && (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Trợ lý AI phân tích ngôn ngữ tự nhiên (NLP) trên Diễn Giải chứng từ để đề xuất Cặp Tài Khoản Nợ/Có có Điểm Tin Cậy cao nhất.</span>
            </div>

            <div className="space-y-2">
              {transactions.slice(0, 15).map((tx) => {
                const ai: AIAccountSuggestion = suggestAccountsByAI(tx.description, tx.partnerName, tx.amount);
                return (
                  <div key={tx.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-indigo-300 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{tx.description}</span>
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          AI Match {ai.confidenceScore}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Đối tác: <span className="font-semibold">{tx.partnerName || 'Chưa xác định'}</span> | Số tiền: <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">{tx.amount.toLocaleString()} VNĐ</span>
                      </p>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                        💡 Lý do AI: {ai.reasoning}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <div className="text-center px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200">
                        Nợ <span className="text-indigo-600 dark:text-indigo-400">{ai.debitAcc}</span> / Có <span className="text-emerald-600 dark:text-emerald-400">{ai.creditAcc}</span>
                      </div>

                      {onApplyAISuggestion && (
                        <button
                          onClick={() => onApplyAISuggestion(tx.id, ai.debitAcc, ai.creditAcc)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Áp Dụng ⚡</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Cross Logic Audit */}
        {activeSubTab === 'CROSS_LOGIC' && (
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {auditSummary.issues.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Hệ Thống Logic Kế Toán Đồng Bộ 100%!</h4>
                <p className="text-xs text-slate-500">Không phát hiện mâu thuẫn chéo giữa P&L, Thuế GTGT, Kho, Khấu hao TSCĐ và Công nợ.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditSummary.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-xl border shadow-sm ${
                      issue.severity === 'CRITICAL'
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-extrabold ${issue.severity === 'CRITICAL' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                            {issue.title}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${issue.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-amber-600'}`}>
                            {issue.severity === 'CRITICAL' ? 'NGHIÊM TRỌNG' : 'CẢNH BÁO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">{issue.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                          Lệch: {issue.varianceAmount.toLocaleString()} VNĐ
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-500">Module A:</span> {issue.moduleA} | <span className="font-semibold text-slate-500">Module B:</span> {issue.moduleB}
                      </div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
                        <span>👉 Khắc phục: {issue.recommendation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
