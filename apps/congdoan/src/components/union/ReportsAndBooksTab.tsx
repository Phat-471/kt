import React, { useState, useMemo } from 'react';
import { TradeUnionTransaction, TradeUnionSettlementB07Report, Client, UnionSignerSettings } from '../../types/accounting';
import { 
  Wallet, 
  Landmark, 
  Printer, 
  FileText, 
  ArrowDownRight, 
  ArrowUpRight, 
  Coins, 
  Calendar, 
  Filter, 
  FileSpreadsheet, 
  Download 
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { exportSingleExcelSheet, exportUnionFinancialReportToExcel } from '../../services/tradeUnionService';

interface ReportsAndBooksTabProps {
  transactions: TradeUnionTransaction[];
  reportB07: TradeUnionSettlementB07Report;
  onPrintCashBook: () => void;
  onPrintBankBook: () => void;
  onPrintReportB07: () => void;
  client?: Client | null;
  signerSettings?: UnionSignerSettings | null;
  selectedYear?: number;
}

type SubBookMode = 'CASH_BOOK' | 'BANK_BOOK' | 'SETTLEMENT_B07';
type PeriodFilterType = 'ALL' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const ReportsAndBooksTab: React.FC<ReportsAndBooksTabProps> = ({
  transactions,
  reportB07,
  onPrintCashBook,
  onPrintBankBook,
  onPrintReportB07,
  client,
  signerSettings,
  selectedYear: initialYear = 2026,
}) => {
  const [subMode, setSubMode] = useState<SubBookMode>('CASH_BOOK');
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(initialYear || 'ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('ALL');

  // Dynamic available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025, 2024, 2023, initialYear]);
    transactions.forEach(t => {
      if (t.date) {
        const y = new Date(t.date).getFullYear();
        if (!isNaN(y) && y >= 2020 && y <= 2030) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, initialYear]);

  // Filter transactions by selected year and period
  const filterTransactions = (txList: TradeUnionTransaction[]) => {
    return txList.filter(t => {
      const d = new Date(t.date);
      const tYear = !isNaN(d.getFullYear()) ? d.getFullYear() : 2025;
      const tMonth = !isNaN(d.getMonth()) ? d.getMonth() + 1 : 1;

      if (selectedYear !== 'ALL' && tYear !== selectedYear) return false;

      if (periodFilter === 'ALL') return true;
      if (periodFilter === 'H1') return tMonth <= 6;
      if (periodFilter === 'H2') return tMonth >= 7;
      if (periodFilter === 'Q1') return tMonth <= 3;
      if (periodFilter === 'Q2') return tMonth >= 4 && tMonth <= 6;
      if (periodFilter === 'Q3') return tMonth >= 7 && tMonth <= 9;
      if (periodFilter === 'Q4') return tMonth >= 10;
      if (typeof periodFilter === 'number') return tMonth === periodFilter;

      return true;
    });
  };

  const cashTransactions = useMemo(() => {
    const rawCash = transactions.filter(t => t.paymentMethod === 'CASH');
    return filterTransactions(rawCash);
  }, [transactions, selectedYear, periodFilter]);

  const bankTransactions = useMemo(() => {
    const rawBank = transactions.filter(t => t.paymentMethod === 'BANK');
    return filterTransactions(rawBank);
  }, [transactions, selectedYear, periodFilter]);

  // Running balance for Cash
  const cashRowsWithBalance = useMemo(() => {
    let running = 0;
    let totalThu = 0;
    let totalChi = 0;

    const rows = cashTransactions.map((t, idx) => {
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        running += t.amount;
        totalThu += t.amount;
      } else {
        running -= t.amount;
        totalChi += t.amount;
      }
      return {
        ...t,
        stt: idx + 1,
        thu: isThu ? t.amount : 0,
        chi: !isThu ? t.amount : 0,
        balance: running
      };
    });

    return { rows, totalThu, totalChi, closingBalance: running };
  }, [cashTransactions]);

  // Running balance for Bank
  const bankRowsWithBalance = useMemo(() => {
    let running = 0;
    let totalThu = 0;
    let totalChi = 0;

    const rows = bankTransactions.map((t, idx) => {
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        running += t.amount;
        totalThu += t.amount;
      } else {
        running -= t.amount;
        totalChi += t.amount;
      }
      return {
        ...t,
        stt: idx + 1,
        thu: isThu ? t.amount : 0,
        chi: !isThu ? t.amount : 0,
        balance: running
      };
    });

    return { rows, totalThu, totalChi, closingBalance: running };
  }, [bankTransactions]);

  const effectiveYear = typeof selectedYear === 'number' ? selectedYear : initialYear;

  // Export handlers
  const handleExportCashBookExcel = () => {
    exportSingleExcelSheet('CASH_BOOK', cashTransactions, client || null, effectiveYear, undefined, signerSettings || null);
  };

  const handleExportBankBookExcel = () => {
    exportSingleExcelSheet('BANK_BOOK', bankTransactions, client || null, effectiveYear, undefined, signerSettings || null);
  };

  const handleExportSettlementExcel = () => {
    exportSingleExcelSheet('SETTLEMENT_B07', transactions, client || null, effectiveYear, undefined, signerSettings || null);
  };

  const handleExportFullWorkbookExcel = () => {
    exportUnionFinancialReportToExcel(transactions, client || null, effectiveYear, signerSettings || null);
  };

  return (
    <div className="space-y-4">
      {/* THANH ĐIỀU HƯỚNG PHÂN HỆ SỔ SÁCH & BÁO CÁO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 flex-shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Sổ Sách & Báo Cáo Quyết Toán Tài Chính Công Đoàn</h3>
            <p className="text-xs text-slate-500">Sổ Quỹ Tiền Mặt (S11H), Sổ Ngân Hàng (S12-H) và Báo Cáo Quyết Toán (B07-TLĐ)</p>
          </div>
        </div>

        {/* 3 Nút Chọn Phân Hệ Sổ Sách / Báo Cáo & Nút Xuất Trọn Bộ */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSubMode('CASH_BOOK')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subMode === 'CASH_BOOK' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>1. Sổ Tiền Mặt (S11H)</span>
            </button>
            <button
              onClick={() => setSubMode('BANK_BOOK')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subMode === 'BANK_BOOK' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>2. Sổ Ngân Hàng (S12-H)</span>
            </button>
            <button
              onClick={() => setSubMode('SETTLEMENT_B07')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                subMode === 'SETTLEMENT_B07' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>3. Quyết Toán (B07-TLĐ)</span>
            </button>
          </div>

          <button
            onClick={handleExportFullWorkbookExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap"
            title="Xuất 1 file Excel chứa tất cả các Sheet (Thu Chi, S11H, S12-H, B07-TLĐ)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Trọn Bộ Sổ Sách Excel</span>
          </button>
        </div>
      </div>

      {/* THANH BỘ LỌC THỜI GIAN DÙNG CHUNG CHO SỔ SÁCH */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Lọc Năm */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-blue-600 font-bold" />
            <span className="font-bold text-slate-700">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === 'ALL' ? 'ALL' : Number(val));
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả năm</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {/* Lọc Kỳ / Tháng / Quý */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-blue-600 font-bold" />
            <span className="font-bold text-slate-700">Kỳ Báo Cáo:</span>
            <select
              value={periodFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'ALL' || val === 'H1' || val === 'H2' || val === 'Q1' || val === 'Q2' || val === 'Q3' || val === 'Q4') {
                  setPeriodFilter(val as any);
                } else {
                  setPeriodFilter(Number(val) as any);
                }
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Cả Năm</option>
              <option value="H1">6 Tháng Đầu Năm (T1 - T6)</option>
              <option value="H2">6 Tháng Cuối Năm (T7 - T12)</option>
              <option value="Q1">Quý 1 (Tháng 1 - 3)</option>
              <option value="Q2">Quý 2 (Tháng 4 - 6)</option>
              <option value="Q3">Quý 3 (Tháng 7 - 9)</option>
              <option value="Q4">Quý 4 (Tháng 10 - 12)</option>
              <optgroup label="Từng Tháng">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex items-center gap-3 font-semibold text-slate-600 flex-wrap">
          {subMode === 'CASH_BOOK' && (
            <>
              <span>Thu: <strong className="text-emerald-700">{formatNumber(cashRowsWithBalance.totalThu)} đ</strong></span>
              <span>Chi: <strong className="text-rose-700">{formatNumber(cashRowsWithBalance.totalChi)} đ</strong></span>
              <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-900">
                Tồn quỹ: <strong>{formatNumber(cashRowsWithBalance.closingBalance)} đ</strong>
              </span>
            </>
          )}
          {subMode === 'BANK_BOOK' && (
            <>
              <span>Gửi vào: <strong className="text-emerald-700">{formatNumber(bankRowsWithBalance.totalThu)} đ</strong></span>
              <span>Rút/Nộp: <strong className="text-rose-700">{formatNumber(bankRowsWithBalance.totalChi)} đ</strong></span>
              <span className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-blue-900">
                Số dư NH: <strong>{formatNumber(bankRowsWithBalance.closingBalance)} đ</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* 1. SỔ QUỸ TIỀN MẶT */}
      {subMode === 'CASH_BOOK' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-500">
              Tổng số phát sinh tiền mặt: <strong className="text-slate-900">{cashRowsWithBalance.rows.length} chứng từ</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCashBookExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel S11H</span>
              </button>
              <button
                onClick={onPrintCashBook}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>In Sổ Quỹ Tiền Mặt (S11H)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 text-center shadow-sm">
                <tr>
                  <th className="p-2.5 w-12 border-r border-slate-200 bg-slate-100">STT</th>
                  <th className="p-2.5 w-24 border-r border-slate-200 bg-slate-100">Ngày</th>
                  <th className="p-2.5 w-28 border-r border-slate-200 bg-slate-100">Số Phiếu</th>
                  <th className="p-2.5 text-left border-r border-slate-200 bg-slate-100">Diễn Giải & Đối Tượng</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-emerald-700 bg-slate-100">Thu (đ)</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-rose-700 bg-slate-100">Chi (đ)</th>
                  <th className="p-2.5 w-32 text-right text-slate-900 bg-amber-100/80">Tồn Quỹ (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cashRowsWithBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Không có chứng từ tiền mặt phát sinh trong kỳ đang chọn.
                    </td>
                  </tr>
                ) : (
                  cashRowsWithBalance.rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{t.stt}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200 whitespace-nowrap">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {t.thu > 0 ? formatNumber(t.thu) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {t.chi > 0 ? formatNumber(t.chi) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-amber-50/30 whitespace-nowrap">
                        {formatNumber(t.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-2.5 text-right uppercase border-r border-slate-200">Tổng cộng phát sinh:</td>
                  <td className="p-2.5 text-right font-mono text-emerald-700 border-r border-slate-200 whitespace-nowrap">
                    {formatNumber(cashRowsWithBalance.totalThu)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono text-rose-700 border-r border-slate-200 whitespace-nowrap">
                    {formatNumber(cashRowsWithBalance.totalChi)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono bg-amber-100/50 text-amber-900 whitespace-nowrap">
                    {formatNumber(cashRowsWithBalance.closingBalance)} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. SỔ TIỀN GỬI NGÂN HÀNG */}
      {subMode === 'BANK_BOOK' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-500">
              Tổng số phát sinh ngân hàng: <strong className="text-slate-900">{bankRowsWithBalance.rows.length} giao dịch</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportBankBookExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel S12-H</span>
              </button>
              <button
                onClick={onPrintBankBook}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>In Sổ Ngân Hàng (S12-H)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm text-slate-700 font-bold border-b border-slate-200 text-center shadow-sm">
                <tr>
                  <th className="p-2.5 w-12 border-r border-slate-200 bg-slate-100">STT</th>
                  <th className="p-2.5 w-24 border-r border-slate-200 bg-slate-100">Ngày</th>
                  <th className="p-2.5 w-28 border-r border-slate-200 bg-slate-100">Số Phiếu / UNC</th>
                  <th className="p-2.5 text-left border-r border-slate-200 bg-slate-100">Nội Dung Giao Dịch & Đối Tượng</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-emerald-700 bg-slate-100">Gửi Vào (đ)</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-rose-700 bg-slate-100">Rút Ra (đ)</th>
                  <th className="p-2.5 w-32 text-right text-slate-900 bg-blue-100/80">Số Dư NH (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bankRowsWithBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Không có chứng từ ngân hàng phát sinh trong kỳ đang chọn.
                    </td>
                  </tr>
                ) : (
                  bankRowsWithBalance.rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{t.stt}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200 whitespace-nowrap">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {t.thu > 0 ? formatNumber(t.thu) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-700 font-semibold border-r border-slate-200 whitespace-nowrap">
                        {t.chi > 0 ? formatNumber(t.chi) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-blue-50/30 whitespace-nowrap">
                        {formatNumber(t.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="p-2.5 text-right uppercase border-r border-slate-200">Tổng cộng phát sinh:</td>
                  <td className="p-2.5 text-right font-mono text-emerald-700 border-r border-slate-200 whitespace-nowrap">
                    {formatNumber(bankRowsWithBalance.totalThu)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono text-rose-700 border-r border-slate-200 whitespace-nowrap">
                    {formatNumber(bankRowsWithBalance.totalChi)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono bg-blue-100/50 text-blue-900 whitespace-nowrap">
                    {formatNumber(bankRowsWithBalance.closingBalance)} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 3. BÁO CÁO QUYẾT TOÁN B07-TLĐ */}
      {subMode === 'SETTLEMENT_B07' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Báo Cáo Quyết Toán Thu, Chi Tài Chính Công Đoàn</h4>
              <p className="text-xs text-slate-500">Mẫu số B07-TLĐ ban hành kèm theo Quyết định Tổng Liên đoàn Lao động VN</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSettlementExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel B07-TLĐ</span>
              </button>
              <button
                onClick={onPrintReportB07}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>In Báo Cáo Quyết Toán (B07)</span>
              </button>
            </div>
          </div>

          {/* Các chỉ tiêu cơ bản */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Số lao động đóng KPCĐ:</div>
              <div className="font-bold text-slate-900 text-sm">{reportB07.basicIndicators.totalEmployeesKpcd} người</div>
            </div>
            <div>
              <div className="text-slate-500">Quỹ lương đóng KPCĐ:</div>
              <div className="font-bold text-slate-900 text-sm font-mono">{formatNumber(reportB07.basicIndicators.salaryFundKpcd)} đ</div>
            </div>
            <div>
              <div className="text-slate-500">Số đoàn viên đóng Đoàn phí:</div>
              <div className="font-bold text-slate-900 text-sm">{reportB07.basicIndicators.totalMembers} người</div>
            </div>
            <div>
              <div className="text-slate-500">Quỹ lương đóng Đoàn phí:</div>
              <div className="font-bold text-slate-900 text-sm font-mono">{formatNumber(reportB07.basicIndicators.salaryFundDoanPhi)} đ</div>
            </div>
          </div>

          {/* Bảng Quyết Toán B07 */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-center">
                <tr>
                  <th className="p-2.5 w-12 border-r border-slate-200">TT</th>
                  <th className="p-2.5 text-left border-r border-slate-200">Nội Dung Chỉ Tiêu</th>
                  <th className="p-2.5 w-24 border-r border-slate-200">Mã Mục Lục</th>
                  <th className="p-2.5 w-36 text-right border-r border-slate-200">Dự Toán (đ)</th>
                  <th className="p-2.5 w-36 text-right border-r border-slate-200 bg-emerald-50/50 text-emerald-900">Quyết Toán (đ)</th>
                  <th className="p-2.5 w-36 text-right">Cấp Trên Duyệt (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportB07.items.map((item, idx) => {
                  const isMajor = item.stt === 'I' || item.stt === 'II' || item.stt === 'III' || item.stt === 'IV';
                  return (
                    <tr key={idx} className={isMajor ? 'bg-slate-100/70 font-bold text-slate-900' : 'hover:bg-slate-50'}>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{item.stt}</td>
                      <td className={`p-2.5 border-r border-slate-200 ${isMajor ? 'font-bold uppercase text-slate-900' : 'pl-6 text-slate-700'}`}>
                        {item.content}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold border-r border-slate-200 text-slate-600">{item.code}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{item.plannedAmount && item.plannedAmount > 0 ? formatNumber(item.plannedAmount) : '-'}</td>
                      <td className={`p-2.5 text-right font-mono border-r border-slate-200 ${isMajor ? 'font-bold text-emerald-800 bg-emerald-50/30' : 'text-slate-800'}`}>
                        {item.settledAmount > 0 ? formatNumber(item.settledAmount) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-400">{item.approvedAmount && item.approvedAmount > 0 ? formatNumber(item.approvedAmount) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
