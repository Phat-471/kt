import React, { useState, useMemo } from 'react';
import { TradeUnionTransaction, TradeUnionSettlementB07Report } from '../../types/accounting';
import { Wallet, Landmark, Printer, FileText, ArrowDownRight, ArrowUpRight, Coins, Calendar, Filter } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface ReportsAndBooksTabProps {
  transactions: TradeUnionTransaction[];
  reportB07: TradeUnionSettlementB07Report;
  onPrintCashBook: () => void;
  onPrintBankBook: () => void;
  onPrintReportB07: () => void;
}

type SubBookMode = 'CASH_BOOK' | 'BANK_BOOK' | 'SETTLEMENT_B07';
type PeriodFilterType = 'ALL' | 'H1' | 'H2' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const ReportsAndBooksTab: React.FC<ReportsAndBooksTabProps> = ({
  transactions,
  reportB07,
  onPrintCashBook,
  onPrintBankBook,
  onPrintReportB07,
}) => {
  const [subMode, setSubMode] = useState<SubBookMode>('CASH_BOOK');
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('ALL');

  // Dynamic available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025, 2024, 2023]);
    transactions.forEach(t => {
      if (t.date) {
        const y = new Date(t.date).getFullYear();
        if (!isNaN(y) && y >= 2020 && y <= 2030) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions]);

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

  return (
    <div className="space-y-4">
      {/* Header & Sub-Tab Switcher */}
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

        {/* 3 Nút Chọn Phân Hệ Sổ Sách / Báo Cáo */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto">
          <button
            onClick={() => setSubMode('CASH_BOOK')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'CASH_BOOK' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>1. Sổ Tiền Mặt (S11H)</span>
          </button>
          <button
            onClick={() => setSubMode('BANK_BOOK')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'BANK_BOOK' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>2. Sổ Ngân Hàng (S12-H)</span>
          </button>
          <button
            onClick={() => setSubMode('SETTLEMENT_B07')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'SETTLEMENT_B07' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Quyết Toán (B07-TLĐ)</span>
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
              onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-blue-800 focus:outline-none"
            >
              <option value="ALL">Tất cả năm</option>
              {availableYears.map(y => (
                <option key={y} value={y}>Năm {y}</option>
              ))}
            </select>
          </div>

          {/* Lọc Kỳ */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-bold text-slate-700">Kỳ Báo Cáo:</span>
            <select
              value={periodFilter}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'ALL' || v === 'H1' || v === 'H2' || v === 'Q1' || v === 'Q2' || v === 'Q3' || v === 'Q4') {
                  setPeriodFilter(v);
                } else {
                  setPeriodFilter(Number(v) as any);
                }
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-semibold text-slate-900 focus:outline-none"
            >
              <option value="ALL">Cả Năm (12 Tháng)</option>
              <option value="H1">6 Tháng Đầu Năm (H1: T1 - T6)</option>
              <option value="H2">6 Tháng Cuối Năm (H2: T7 - T12)</option>
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
        <div className="flex items-center gap-3 font-semibold text-slate-600">
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
            <button
              onClick={onPrintCashBook}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Sổ Quỹ Tiền Mặt (S11H)</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-center">
                <tr>
                  <th className="p-2.5 w-12 border-r border-slate-200">STT</th>
                  <th className="p-2.5 w-24 border-r border-slate-200">Ngày</th>
                  <th className="p-2.5 w-28 border-r border-slate-200">Số Phiếu</th>
                  <th className="p-2.5 text-left border-r border-slate-200">Diễn Giải & Đối Tượng</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-emerald-700">Thu (đ)</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-rose-700">Chi (đ)</th>
                  <th className="p-2.5 w-32 text-right text-slate-900 bg-amber-50/50">Tồn Quỹ (đ)</th>
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
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                        {t.thu > 0 ? formatNumber(t.thu) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">
                        {t.chi > 0 ? formatNumber(t.chi) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-amber-50/30">
                        {formatNumber(t.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {cashRowsWithBalance.rows.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2.5 text-right text-slate-700 uppercase">Tổng Cộng Phát Sinh & Tồn Quỹ:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-700">{formatNumber(cashRowsWithBalance.totalThu)}</td>
                    <td className="p-2.5 text-right font-mono text-rose-700">{formatNumber(cashRowsWithBalance.totalChi)}</td>
                    <td className="p-2.5 text-right font-mono text-slate-900 bg-amber-100/50">{formatNumber(cashRowsWithBalance.closingBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 2. SỔ NGÂN HÀNG */}
      {subMode === 'BANK_BOOK' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-slate-500">
              Tổng số phát sinh ngân hàng: <strong className="text-slate-900">{bankRowsWithBalance.rows.length} chứng từ</strong>
            </div>
            <button
              onClick={onPrintBankBook}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Sổ Tiền Gửi NH (S12-H)</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-center">
                <tr>
                  <th className="p-2.5 w-12 border-r border-slate-200">STT</th>
                  <th className="p-2.5 w-24 border-r border-slate-200">Ngày</th>
                  <th className="p-2.5 w-28 border-r border-slate-200">Số Chứng Từ</th>
                  <th className="p-2.5 text-left border-r border-slate-200">Diễn Giải & Đối Tượng</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-emerald-700">Gửi Vào / Thu (đ)</th>
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-rose-700">Rút / Nộp Đi (đ)</th>
                  <th className="p-2.5 w-32 text-right text-slate-900 bg-blue-50/50">Số Dư Còn Lại (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bankRowsWithBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Không có giao dịch ngân hàng phát sinh trong kỳ đang chọn.
                    </td>
                  </tr>
                ) : (
                  bankRowsWithBalance.rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{t.stt}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                        {t.thu > 0 ? formatNumber(t.thu) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">
                        {t.chi > 0 ? formatNumber(t.chi) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-blue-50/30">
                        {formatNumber(t.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {bankRowsWithBalance.rows.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2.5 text-right text-slate-700 uppercase">Tổng Cộng Giao Dịch & Số Dư Cuối:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-700">{formatNumber(bankRowsWithBalance.totalThu)}</td>
                    <td className="p-2.5 text-right font-mono text-rose-700">{formatNumber(bankRowsWithBalance.totalChi)}</td>
                    <td className="p-2.5 text-right font-mono text-slate-900 bg-blue-100/50">{formatNumber(bankRowsWithBalance.closingBalance)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 3. BÁO CÁO QUYẾT TOÁN B07-TLĐ */}
      {subMode === 'SETTLEMENT_B07' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Tổng hợp 14 chỉ tiêu theo Quyết định số 1912/QĐ-TLĐ & Hướng dẫn 47/HD-TLĐ
            </div>
            <button
              onClick={onPrintReportB07}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo Quyết Toán (B07-TLĐ)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-100">
            <div>- Số LĐ đóng KPCĐ: <strong className="text-slate-900">{reportB07.basicIndicators.totalEmployeesKpcd} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-900">{formatNumber(reportB07.basicIndicators.salaryFundKpcd)} đ</strong></div>
            <div>- Số đoàn viên đóng ĐPCĐ: <strong className="text-slate-900">{reportB07.basicIndicators.totalMembers} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-900">{formatNumber(reportB07.basicIndicators.salaryFundDoanPhi)} đ</strong></div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-2.5 w-12 text-center border-r border-slate-200">TT</th>
                  <th className="p-2.5 border-r border-slate-200">Nội Dung Chỉ Tiêu</th>
                  <th className="p-2.5 w-28 text-center border-r border-slate-200">Mã Mục Lục</th>
                  <th className="p-2.5 w-40 text-right">Quyết Toán Năm (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportB07.items.map((it, idx) => {
                  const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
                  return (
                    <tr key={idx} className={isMajor ? 'bg-amber-50/60 font-bold text-slate-900' : 'hover:bg-slate-50/60'}>
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{it.stt}</td>
                      <td className="p-2.5 border-r border-slate-200">{it.content}</td>
                      <td className="p-2.5 text-center text-slate-500 font-mono border-r border-slate-200">{it.code}</td>
                      <td className="p-2.5 text-right font-mono text-slate-900 font-bold">{formatNumber(it.settledAmount)}</td>
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
