import React, { useState } from 'react';
import { NormalizedTransaction, ReconciliationPair, Client } from '../../types/accounting';
import { findMatchingSuggestions, SuggestionResult } from '../../services/matchingEngine';
import { exportReconciliationReportToExcel } from '../../services/excelService';
import { exportReconciliationPDF } from '../../services/pdfExporter';
import { GitCompare, CheckCircle2, ArrowRightLeft, Sparkles, XCircle, ShieldCheck, Download, Printer, FileText } from 'lucide-react';

interface ReconciliationWorkspaceProps {
  activeClient: Client | null;
  vouchers: NormalizedTransaction[];
  statements: NormalizedTransaction[];
  reconciliations: ReconciliationPair[];
  onConfirmMatch: (voucherId: string, statementId: string, matchScore: number, reasons: string[]) => void;
  onUnmatch: (pairId: string) => void;
  searchTerm?: string;
}

export const ReconciliationWorkspace: React.FC<ReconciliationWorkspaceProps> = ({
  activeClient,
  vouchers,
  statements,
  reconciliations,
  onConfirmMatch,
  onUnmatch,
  searchTerm = '',
}) => {
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'UNMATCHED' | 'MATCHED'>('ALL');
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'UNMATCHED' | 'MATCHED'>('ALL');

  const matchedVoucherIds = new Set(reconciliations.map(r => r.voucherId));
  const matchedStatementIds = new Set(reconciliations.map(r => r.statementId));

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

  const filteredVouchers = vouchers.filter(filterTransaction);
  const filteredStatements = statements.filter(filterTransaction);

  const displayedVouchers = filteredVouchers.filter(v => {
    const isMatched = matchedVoucherIds.has(v.id);
    if (voucherFilter === 'UNMATCHED') return !isMatched;
    if (voucherFilter === 'MATCHED') return isMatched;
    return true;
  });

  const displayedStatements = filteredStatements.filter(s => {
    const isMatched = matchedStatementIds.has(s.id);
    if (statementFilter === 'UNMATCHED') return !isMatched;
    if (statementFilter === 'MATCHED') return isMatched;
    return true;
  });

  const unmatchedVouchers = filteredVouchers.filter(v => !matchedVoucherIds.has(v.id));
  const unmatchedStatements = filteredStatements.filter(s => !matchedStatementIds.has(s.id));

  const runAutoMatchingEngine = () => {
    const results = findMatchingSuggestions(vouchers, statements, reconciliations);
    setSuggestions(results);
  };

  const handleManualPairing = () => {
    if (!selectedVoucherId || !selectedStatementId) return;
    const v = vouchers.find(x => x.id === selectedVoucherId);
    const s = statements.find(x => x.id === selectedStatementId);
    if (!v || !s) return;

    onConfirmMatch(v.id, s.id, 100, ['Ghép thủ công bởi kế toán viên']);
    setSelectedVoucherId(null);
    setSelectedStatementId(null);
  };

  const handleAcceptSuggestion = (sugg: SuggestionResult) => {
    onConfirmMatch(sugg.voucher.id, sugg.statement.id, sugg.matchScore, sugg.reasons);
    setSuggestions(suggestions.filter(x => x.voucher.id !== sugg.voucher.id && x.statement.id !== sugg.statement.id));
  };

  const handleExportExcelReport = () => {
    exportReconciliationReportToExcel(vouchers, statements, reconciliations, activeClient?.name || 'Cong_Ty');
  };

  const handlePrintPDFReport = () => {
    const matchedCount = reconciliations.length;
    const unmatchedVoucherCount = vouchers.length - matchedVoucherIds.size;
    const unmatchedStatementCount = statements.length - matchedStatementIds.size;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Đối Chiếu Chứng Từ - ${activeClient?.name || ''}</title>
  <style>
    body { font-family: 'Times New Roman', serif; padding: 20px; line-height: 1.4; color: #000; }
    h1 { text-align: center; text-transform: uppercase; font-size: 18px; margin-bottom: 5px; }
    .sub { text-align: center; font-style: italic; font-size: 12px; margin-bottom: 20px; }
    .summary-table, .detail-table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    .summary-table td, .summary-table th, .detail-table td, .detail-table th { border: 1px solid #000; padding: 6px 8px; text-align: left; }
    .summary-table th, .detail-table th { background: #f0f0f0; font-weight: bold; }
    .text-right { text-align: right; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>BÁO CÁO KẾT QUẢ ĐỐI CHIẾU THU CHI & SAO KÊ NGÂN HÀNG</h1>
  <div class="sub">Doanh nghiệp: ${activeClient?.name || ''} | MST: ${activeClient?.taxCode || ''} | Ngày lập báo cáo: ${new Date().toLocaleDateString('vi-VN')}</div>

  <h3>I. TỔNG HỢP KẾT QUẢ ĐỐI CHIẾU</h3>
  <table class="summary-table">
    <tr>
      <th>Chỉ tiêu</th>
      <th>Số lượng chứng từ</th>
      <th>Tổng số tiền phát sinh</th>
    </tr>
    <tr>
      <td>1. Cặp chứng từ đã đối chiếu khớp 100%</td>
      <td>${matchedCount} cặp</td>
      <td class="text-right">${reconciliations.reduce((sum, r) => {
        const v = vouchers.find(x => x.id === r.voucherId);
        return sum + (v?.amount || 0);
      }, 0).toLocaleString('vi-VN')} VNĐ</td>
    </tr>
    <tr>
      <td>2. Sổ thu chi chưa khớp sao kê ngân hàng</td>
      <td>${unmatchedVoucherCount} chứng từ</td>
      <td class="text-right">${vouchers.filter(v => !matchedVoucherIds.has(v.id)).reduce((sum, v) => sum + v.amount, 0).toLocaleString('vi-VN')} VNĐ</td>
    </tr>
    <tr>
      <td>3. Dòng sao kê ngân hàng chưa khớp sổ sách</td>
      <td>${unmatchedStatementCount} dòng</td>
      <td class="text-right">${statements.filter(s => !matchedStatementIds.has(s.id)).reduce((sum, s) => sum + s.amount, 0).toLocaleString('vi-VN')} VNĐ</td>
    </tr>
  </table>

  <h3>II. DANH SÁCH CẶP ĐÃ ĐỐI CHIẾU KHỚP (${matchedCount} cặp)</h3>
  <table class="detail-table">
    <thead>
      <tr>
        <th>STT</th>
        <th>Số CT Nội Bộ</th>
        <th>Ngày CT</th>
        <th class="text-right">Số tiền CT</th>
        <th>Diễn giải sao kê</th>
        <th class="text-right">Số tiền Sao Kê</th>
        <th>Điểm %</th>
      </tr>
    </thead>
    <tbody>
      ${reconciliations.map((r, idx) => {
        const v = vouchers.find(x => x.id === r.voucherId);
        const s = statements.find(x => x.id === r.statementId);
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${v?.voucherNo || ''}</td>
            <td>${v?.date || ''}</td>
            <td class="text-right">${(v?.amount || 0).toLocaleString('vi-VN')} đ</td>
            <td>${s?.description || ''}</td>
            <td class="text-right">${(s?.amount || 0).toLocaleString('vi-VN')} đ</td>
            <td>${r.matchScore}%</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 40px; text-align: center;">
    <div style="width: 45%;">
      <strong>KẾ TOÁN LẬP BÁO CÁO</strong><br>
      <i style="font-size: 11px;">(Ký, họ tên)</i>
    </div>
    <div style="width: 45%;">
      <strong>KẾ TOÁN TRƯỞNG / KẾ TOÁN DUYỆT</strong><br>
      <i style="font-size: 11px;">(Ký, họ tên)</i>
    </div>
  </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Đối Chiếu Song Song: Phiếu Thu/Chi vs Sao Kê Ngân Hàng</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Chỉ mang tính gợi ý. <strong>Kế toán viên duyệt và quyết định khớp cuối cùng.</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={runAutoMatchingEngine}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Tìm Gợi Ý Ghép Đôi Tự Động</span>
          </button>

          <button
            onClick={handleExportExcelReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            title="Xuất báo cáo đối chiếu chi tiết 3 Sheet ra Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => exportReconciliationPDF(activeClient, vouchers, statements, reconciliations)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            title="Xuất file PDF báo cáo đối chiếu"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Xuất PDF</span>
          </button>

          <button
            onClick={handlePrintPDFReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            title="In hoặc xuất báo cáo đối chiếu dạng PDF"
          >
            <Printer className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:to-indigo-950/40 border border-brand-200 dark:border-indigo-500/30 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Danh Sách Cặp Chứng Từ Đề Xuất Ghép ({suggestions.length} cặp)</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Xếp theo điểm tin cậy giảm dần</span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {suggestions.map((sugg, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-slate-700/80 hover:border-brand-500 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs transition-all shadow-sm"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <div className="text-[10px] text-brand-700 dark:text-brand-400 font-bold uppercase">PHIẾU THU/CHI NỘI BỘ</div>
                    <div className="font-bold text-slate-900 dark:text-slate-200">{sugg.voucher.voucherNo} | {sugg.voucher.date}</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-extrabold tabular-num">{sugg.voucher.amount.toLocaleString('vi-VN')} đ</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">{sugg.voucher.description}</div>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg">
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold uppercase">SAO KÊ NGÂN HÀNG</div>
                    <div className="font-bold text-slate-900 dark:text-slate-200">{sugg.statement.voucherNo || 'Sao kê'} | {sugg.statement.date}</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-extrabold tabular-num">{sugg.statement.amount.toLocaleString('vi-VN')} đ</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">{sugg.statement.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center min-w-[130px]">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      Điểm Khớp: {sugg.matchScore}%
                    </span>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[140px] truncate">{sugg.reasons.join(', ')}</div>
                  </div>

                  <button
                    onClick={() => handleAcceptSuggestion(sugg)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                  >
                    Duyệt Khớp
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-600 dark:bg-brand-400"></span>
              Sổ Thu/Chi Nội Bộ ({vouchers.length})
            </h3>
            
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setVoucherFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${voucherFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Tất cả ({filteredVouchers.length})
              </button>
              <button
                onClick={() => setVoucherFilter('UNMATCHED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${voucherFilter === 'UNMATCHED' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Chưa ghép ({unmatchedVouchers.length})
              </button>
              <button
                onClick={() => setVoucherFilter('MATCHED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${voucherFilter === 'MATCHED' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Đã ghép ({matchedVoucherIds.size})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[400px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Chọn</th>
                  <th className="p-2.5">Ngày</th>
                  <th className="p-2.5">Số CT</th>
                  <th className="p-2.5">Diễn giải</th>
                  <th className="p-2.5 text-right">Số tiền</th>
                  <th className="p-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {displayedVouchers.map((v) => {
                  const isMatched = matchedVoucherIds.has(v.id);
                  const isSelected = selectedVoucherId === v.id;
                  return (
                    <tr
                      key={v.id}
                      onClick={() => !isMatched && setSelectedVoucherId(v.id)}
                      className={`cursor-pointer transition-colors ${
                        isMatched
                          ? 'bg-slate-50 dark:bg-slate-950/50 opacity-60'
                          : isSelected
                          ? 'bg-brand-50 border-l-4 border-brand-600 dark:bg-brand-950/70 dark:border-brand-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-2.5">
                        <input
                          type="radio"
                          disabled={isMatched}
                          checked={isSelected}
                          onChange={() => setSelectedVoucherId(v.id)}
                          className="w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200">{v.date}</td>
                      <td className="p-2.5 text-brand-700 dark:text-brand-300 font-bold">{v.voucherNo}</td>
                      <td className="p-2.5 max-w-[140px] truncate">{v.description}</td>
                      <td className="p-2.5 text-right font-extrabold tabular-num text-slate-900 dark:text-slate-100">{v.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="p-2.5">
                        {isMatched ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                            Đã Khớp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Chờ Ghép
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-2">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              Dòng Sao Kê Ngân Hàng ({statements.length})
            </h3>
            
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
              <button
                onClick={() => setStatementFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${statementFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Tất cả ({filteredStatements.length})
              </button>
              <button
                onClick={() => setStatementFilter('UNMATCHED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${statementFilter === 'UNMATCHED' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Chưa ghép ({unmatchedStatements.length})
              </button>
              <button
                onClick={() => setStatementFilter('MATCHED')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${statementFilter === 'MATCHED' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                Đã ghép ({matchedStatementIds.size})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[400px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Chọn</th>
                  <th className="p-2.5">Ngày</th>
                  <th className="p-2.5">Số CT/HĐ</th>
                  <th className="p-2.5">Nội dung sao kê</th>
                  <th className="p-2.5 text-right">Số tiền</th>
                  <th className="p-2.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {displayedStatements.map((s) => {
                  const isMatched = matchedStatementIds.has(s.id);
                  const isSelected = selectedStatementId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => !isMatched && setSelectedStatementId(s.id)}
                      className={`cursor-pointer transition-colors ${
                        isMatched
                          ? 'bg-slate-50 dark:bg-slate-950/50 opacity-60'
                          : isSelected
                          ? 'bg-indigo-50 border-l-4 border-indigo-600 dark:bg-indigo-950/70 dark:border-indigo-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-2.5">
                        <input
                          type="radio"
                          disabled={isMatched}
                          checked={isSelected}
                          onChange={() => setSelectedStatementId(s.id)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-slate-200">{s.date}</td>
                      <td className="p-2.5 text-indigo-700 dark:text-indigo-300 font-bold">{s.voucherNo || '---'}</td>
                      <td className="p-2.5 max-w-[140px] truncate">{s.description}</td>
                      <td className="p-2.5 text-right font-extrabold tabular-num text-slate-900 dark:text-slate-100">{s.amount.toLocaleString('vi-VN')} đ</td>
                      <td className="p-2.5">
                        {isMatched ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                            Đã Khớp
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Chờ Ghép
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

      {selectedVoucherId && selectedStatementId && (
        <div className="bg-slate-900 dark:bg-slate-950 text-white border border-brand-500 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="text-xs text-slate-200">
            Đã chọn 1 Phiếu thu/chi và 1 Sao kê ngân hàng. Bấm nút bên cạnh để kế toán xác nhận khớp.
          </div>
          <button
            onClick={handleManualPairing}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Kế Toán Xác Nhận Khớp Chứng Từ</span>
          </button>
        </div>
      )}

      {reconciliations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Danh Sách Cặp Chứng Từ Đã Khớp Đối Chiếu ({reconciliations.length})</span>
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reconciliations.map((rec) => {
              const v = vouchers.find(x => x.id === rec.voucherId);
              const s = statements.find(x => x.id === rec.statementId);
              if (!v || !s) return null;
              return (
                <div
                  key={rec.id}
                  className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-brand-700 dark:text-brand-300">{v.voucherNo} ({v.amount.toLocaleString('vi-VN')} đ)</span>
                    <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">{s.voucherNo || 'Sao kê'} ({s.amount.toLocaleString('vi-VN')} đ)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">{new Date(rec.matchedAt).toLocaleString('vi-VN')}</span>
                    <button
                      onClick={() => onUnmatch(rec.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hủy khớp cặp này"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
