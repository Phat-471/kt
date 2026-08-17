import React from 'react';
import { TradeUnionTransaction } from '../../types/accounting';
import { Wallet, Printer } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface CashAndBankBooksTabProps {
  transactions: TradeUnionTransaction[];
  onPrintCashBook: () => void;
  onPrintBankBook: () => void;
}

export const CashAndBankBooksTab: React.FC<CashAndBankBooksTabProps> = ({
  transactions,
  onPrintCashBook,
  onPrintBankBook,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Sổ Quỹ Tiền Mặt & Sổ Tiền Gửi Ngân Hàng</h3>
            <p className="text-xs text-slate-500">Sổ Quỹ Tiền Mặt (Mẫu S11H) và Sổ Tiền Gửi NH (Mẫu S12-H) theo Thông tư 107/2017/TT-BTC</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrintCashBook}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>In Sổ Tiền Mặt (S11H)</span>
          </button>
          <button
            onClick={onPrintBankBook}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>In Sổ Ngân Hàng (S12-H)</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] text-slate-500 font-bold border-b border-slate-200 uppercase">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-24">Ngày</th>
              <th className="p-3 w-28">Số Chứng Từ</th>
              <th className="p-3 w-24 text-center">Sổ Quỹ</th>
              <th className="p-3">Diễn Giải & Đối Tượng</th>
              <th className="p-3 w-32 text-right">Thu (đ)</th>
              <th className="p-3 w-32 text-right">Chi (đ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Chưa có phát sinh trong sổ quỹ.</td></tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-3 text-xs font-mono text-slate-600">{tx.date}</td>
                  <td className="p-3 font-bold font-mono text-slate-800">{tx.voucherNo}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      tx.paymentMethod === 'BANK' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tx.paymentMethod === 'BANK' ? 'Sổ NH' : 'Sổ TM'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">{tx.reason}</div>
                    <div className="text-slate-500">{tx.personName}</div>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-700 font-bold">{tx.voucherType === 'UNION_RECEIPT' ? formatNumber(tx.amount) : '-'}</td>
                  <td className="p-3 text-right font-mono text-rose-700 font-bold">{tx.voucherType === 'UNION_PAYMENT' ? formatNumber(tx.amount) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
