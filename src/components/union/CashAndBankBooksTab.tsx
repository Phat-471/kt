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
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/50">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Tính Năng 4: Sổ Quỹ Tiền Mặt & Sổ Tiền Gửi Ngân Hàng</h3>
            <p className="text-xs text-slate-400">Sổ Quỹ Tiền Mặt (Mẫu S11H/S12-H) & Sổ Tiền Gửi NH (Mẫu S12-H) theo TT 107/2017/TT-BTC</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrintCashBook}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>In Sổ Quỹ Tiền Mặt</span>
          </button>
          <button
            onClick={onPrintBankBook}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>In Sổ Tiền Gửi NH</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs text-slate-400 font-semibold">
            <tr>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-28">Ngày</th>
              <th className="p-3 w-32">Số Chứng Từ</th>
              <th className="p-3 w-28 text-center">Sổ Quỹ</th>
              <th className="p-3">Diễn Giải & Đối Tượng</th>
              <th className="p-3 w-32 text-right">Thu (VND)</th>
              <th className="p-3 w-32 text-right">Chi (VND)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {transactions.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">Chưa có phát sinh trong sổ quỹ.</td></tr>
            ) : (
              transactions.map((tx, idx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30">
                  <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-3 text-xs font-mono">{tx.date}</td>
                  <td className="p-3 font-semibold text-slate-200">{tx.voucherNo}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      tx.paymentMethod === 'BANK' ? 'bg-blue-900/60 text-blue-300 border border-blue-600' : 'bg-amber-900/60 text-amber-300 border border-amber-600'
                    }`}>
                      {tx.paymentMethod === 'BANK' ? 'Sổ NH' : 'Sổ TM'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-200">{tx.reason}</div>
                    <div className="text-xs text-slate-400">{tx.personName}</div>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400">{tx.voucherType === 'UNION_RECEIPT' ? formatNumber(tx.amount) : '-'}</td>
                  <td className="p-3 text-right font-mono text-rose-400">{tx.voucherType === 'UNION_PAYMENT' ? formatNumber(tx.amount) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
