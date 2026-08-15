import React, { useState } from 'react';
import { LEGAL_DOCUMENTS, TAX_DEADLINES, ACCOUNT_GUIDES, LegalDocument, AccountGuide } from '../../services/legalDatabase';
import { Scale, Search, Clock, BookOpen, FileText, ChevronRight, CheckCircle2, Bookmark } from 'lucide-react';

export const LegalKnowledgeBaseView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'ACCOUNTS' | 'DEADLINES'>('DOCUMENTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(LEGAL_DOCUMENTS[0]);
  const [selectedAccount, setSelectedAccount] = useState<AccountGuide | null>(ACCOUNT_GUIDES[0]);

  const filteredDocs = LEGAL_DOCUMENTS.filter(doc => {
    const matchCat = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchSearch = !searchTerm || (
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.keyPoints.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchCat && matchSearch;
  });

  const filteredAccounts = ACCOUNT_GUIDES.filter(acc => {
    return !searchTerm || (
      acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.commonPairs.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const getDaysRemaining = (deadlineStr: string) => {
    const deadlineDate = new Date(deadlineStr).getTime();
    const today = new Date().getTime();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 text-white px-4 py-3 rounded-2xl border border-indigo-500/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Tra Cứu Luật Kế Toán & Văn Bản Thuế Mới Nhất 2026</h2>
            <p className="text-[11px] text-slate-300">Luật Kế toán 88, NĐ 125 xử phạt thuế, TT 80 quản lý thuế, NĐ 123 hóa đơn điện tử & TT 200/133 — Offline 100%</p>
          </div>
        </div>

        <div className="flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shrink-0 relative z-10 text-xs font-bold">
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DOCUMENTS' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Văn Bản Luật ({LEGAL_DOCUMENTS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ACCOUNTS' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Định Khoản TK</span>
          </button>
          <button
            onClick={() => setActiveTab('DEADLINES')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DEADLINES' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lịch Nộp Báo Cáo</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={
              activeTab === 'DOCUMENTS'
                ? 'Tìm kiếm văn bản luật, số hiệu nghị định, từ khóa (VD: thuế 8%, hóa đơn sai sót, TT200)...'
                : activeTab === 'ACCOUNTS'
                ? 'Nhập mã tài khoản hoặc tên tài khoản (VD: 111, Tiền gửi ngân hàng, 131)...'
                : 'Tìm kiếm lịch nộp báo cáo...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        {activeTab === 'DOCUMENTS' && (
          <div className="flex items-center gap-2 text-xs overflow-x-auto w-full md:w-auto">
            <span className="text-slate-400 font-bold whitespace-nowrap">Danh mục:</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedCategory('THUE_GTGT')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'THUE_GTGT' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Thuế GTGT (8%)
            </button>
            <button
              onClick={() => setSelectedCategory('HOA_DON')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'HOA_DON' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Hóa đơn NĐ123
            </button>
            <button
              onClick={() => setSelectedCategory('PHAT_HANH_CHINH')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === 'PHAT_HANH_CHINH' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Xử Phạt NĐ125
            </button>
          </div>
        )}
      </div>

      {activeTab === 'DOCUMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-brand-50/70 border-brand-300 dark:bg-brand-500/10 dark:border-brand-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300">
                      {doc.code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Hiệu lực: {doc.effectiveDate}</span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-relaxed">
                    {doc.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-normal">
                    {doc.summary}
                  </p>
                </div>
              );
            })}
          </div>

          {selectedDoc && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-2">
                <div className="inline-block text-xs font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300">
                  {selectedDoc.code}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedDoc.title}
                </h3>
                <p className="text-xs text-slate-500">Hiệu lực áp dụng: <strong className="text-slate-700 dark:text-slate-300">{selectedDoc.effectiveDate}</strong></p>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span>Các Điểm Trọng Tâm Kế Toán Cần Lưu Ý</span>
                </h4>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {selectedDoc.keyPoints.map((pt, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Tóm Tắt Chi Tiết Nội Dung</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {selectedDoc.content}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ACCOUNTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {filteredAccounts.map((acc) => {
              const isSelected = selectedAccount?.code === acc.code;
              return (
                <div
                  key={acc.code}
                  onClick={() => setSelectedAccount(acc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-brand-50/70 border-brand-300 dark:bg-brand-500/10 dark:border-brand-500/40 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-sm flex items-center justify-center font-mono">
                      {acc.code}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{acc.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Loại: {acc.type}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              );
            })}
          </div>

          {selectedAccount && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-extrabold text-lg flex items-center justify-center font-mono shadow">
                  {selectedAccount.code}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{selectedAccount.name}</h3>
                  <p className="text-xs text-slate-500">{selectedAccount.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/30 space-y-1">
                  <span className="font-bold text-amber-800 dark:text-amber-300 uppercase">BÊN NỢ (DEBIT)</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAccount.debitRules}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/30 space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase">BÊN CÓ (CREDIT)</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAccount.creditRules}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Các Bút Toán Hạch Toán Đối Ứng Phổ Biến</h4>
                <div className="space-y-2">
                  {selectedAccount.commonPairs.map((pair, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] flex items-center justify-center font-sans font-extrabold">{idx + 1}</span>
                      <span>{pair}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'DEADLINES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TAX_DEADLINES.map((dl) => {
            const daysLeft = getDaysRemaining(dl.deadline);
            const isUrgent = daysLeft >= 0 && daysLeft <= 15;
            const isPassed = daysLeft < 0;

            return (
              <div
                key={dl.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                      {dl.type}
                    </span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        isPassed
                          ? 'bg-slate-100 text-slate-500'
                          : isUrgent
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isPassed ? 'Đã qua hạn' : `Còn ${daysLeft} ngày`}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">{dl.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{dl.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Hạn chót:</span>
                  <strong className="text-brand-600 dark:text-brand-400 font-bold">{dl.deadline}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
