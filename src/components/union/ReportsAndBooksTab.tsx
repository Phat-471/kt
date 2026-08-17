import React, { useState } from 'react';
import { TradeUnionTransaction, TradeUnionSettlementB07Report } from '../../types/accounting';
import { Wallet, Landmark, Printer, FileText, ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface ReportsAndBooksTabProps {
  transactions: TradeUnionTransaction[];
  reportB07: TradeUnionSettlementB07Report;
  onPrintCashBook: () => void;
  onPrintBankBook: () => void;
  onPrintReportB07: () => void;
}

type SubBookMode = 'CASH_BOOK' | 'BANK_BOOK' | 'SETTLEMENT_B07';

export const ReportsAndBooksTab: React.FC<ReportsAndBooksTabProps> = ({
  transactions,
  reportB07,
  onPrintCashBook,
  onPrintBankBook,
  onPrintReportB07,
}) => {
  const [subMode, setSubMode] = useState<SubBookMode>('CASH_BOOK');

  const cashTransactions = transactions.filter(t => t.paymentMethod === 'CASH');
  const bankTransactions = transactions.filter(t => t.paymentMethod === 'BANK');

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

      {/* 1. SỔ QUỸ TIỀN MẶT */}
      {subMode === 'CASH_BOOK' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Tổng số phát sinh tiền mặt: <strong className="text-slate-900">{cashTransactions.length} chứng từ</strong>
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
                  <th className="p-2.5 w-32 text-right text-rose-700">Chi (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cashTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                      Chưa có chứng từ tiền mặt phát sinh.
                    </td>
                  </tr>
                ) : (
                  cashTransactions.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                        {t.voucherType === 'UNION_RECEIPT' ? formatNumber(t.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-rose-700">
                        {t.voucherType === 'UNION_PAYMENT' ? formatNumber(t.amount) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SỔ NGÂN HÀNG */}
      {subMode === 'BANK_BOOK' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Tổng số phát sinh ngân hàng: <strong className="text-slate-900">{bankTransactions.length} chứng từ</strong>
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
                  <th className="p-2.5 w-32 text-right border-r border-slate-200 text-emerald-700">Thu Gửi Vào (đ)</th>
                  <th className="p-2.5 w-32 text-right text-rose-700">Rút / Nộp Đi (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bankTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                      Chưa có giao dịch ngân hàng phát sinh.
                    </td>
                  </tr>
                ) : (
                  bankTransactions.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 text-center font-mono border-r border-slate-200">{t.date}</td>
                      <td className="p-2.5 text-center font-bold text-slate-900 border-r border-slate-200">{t.voucherNo}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-semibold text-slate-800">{t.reason}</div>
                        <div className="text-[11px] text-slate-500">Đối tượng: {t.personName}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                        {t.voucherType === 'UNION_RECEIPT' ? formatNumber(t.amount) : '-'}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-rose-700">
                        {t.voucherType === 'UNION_PAYMENT' ? formatNumber(t.amount) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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
