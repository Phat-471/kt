import React, { useState, useMemo } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import { Client } from '../../types/accounting';
import { BookOpen, Printer, Filter, ChevronDown, FileText, Search } from 'lucide-react';

interface AccountingLedgerViewProps {
  transactions: NormalizedTransaction[];
  activeClient: Client | null;
}

type LedgerType = 'NHAT_KY_CHUNG' | 'SO_CAI' | 'SO_CHI_TIET';

export const AccountingLedgerView: React.FC<AccountingLedgerViewProps> = ({
  transactions,
  activeClient,
}) => {
  const [ledgerType, setLedgerType] = useState<LedgerType>('NHAT_KY_CHUNG');
  const [accountFilter, setAccountFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchDate = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      const matchAcc = !accountFilter || t.debitAcc?.startsWith(accountFilter) || t.creditAcc?.startsWith(accountFilter);
      const matchSearch = !searchTerm ||
        t.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDate && matchAcc && matchSearch;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, dateFrom, dateTo, accountFilter, searchTerm]);

  // Nhật ký chung: tất cả bút toán theo ngày
  const generalJournalRows = useMemo(() => filtered, [filtered]);

  // Sổ cái: nhóm theo tài khoản, tính số dư lũy kế
  const soCaiData = useMemo(() => {
    const accounts = new Set<string>();
    filtered.forEach(t => {
      if (t.debitAcc) accounts.add(t.debitAcc.slice(0, 3));
      if (t.creditAcc) accounts.add(t.creditAcc.slice(0, 3));
    });

    return Array.from(accounts).sort().map(acc => {
      const rows = filtered.filter(t =>
        t.debitAcc?.startsWith(acc) || t.creditAcc?.startsWith(acc)
      );
      const totalDebit = rows.filter(t => t.debitAcc?.startsWith(acc)).reduce((s, t) => s + t.amount, 0);
      const totalCredit = rows.filter(t => t.creditAcc?.startsWith(acc)).reduce((s, t) => s + t.amount, 0);
      return { acc, rows, totalDebit, totalCredit, balance: totalDebit - totalCredit };
    }).filter(g => !accountFilter || g.acc.startsWith(accountFilter));
  }, [filtered, accountFilter]);

  // Sổ chi tiết: chỉ 1 tài khoản, tính số dư dòng
  const soChiTietRows = useMemo(() => {
    if (!accountFilter) return [];
    let runningBalance = 0;
    return filtered
      .filter(t => t.debitAcc?.startsWith(accountFilter) || t.creditAcc?.startsWith(accountFilter))
      .map(t => {
        const isDebit = t.debitAcc?.startsWith(accountFilter);
        const debit = isDebit ? t.amount : 0;
        const credit = !isDebit ? t.amount : 0;
        runningBalance += debit - credit;
        return { ...t, debit, credit, balance: runningBalance };
      });
  }, [filtered, accountFilter]);

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  const ledgerTabs: { key: LedgerType; label: string; desc: string }[] = [
    { key: 'NHAT_KY_CHUNG', label: 'Nhật Ký Chung', desc: 'Tất cả bút toán theo thứ tự thời gian' },
    { key: 'SO_CAI', label: 'Sổ Cái TK', desc: 'Theo dõi theo từng tài khoản kế toán' },
    { key: 'SO_CHI_TIET', label: 'Sổ Chi Tiết', desc: 'Chi tiết 1 tài khoản + số dư luỹ kế' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-900 text-white px-5 py-4 rounded-2xl border border-emerald-500/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Sổ Kế Toán Chuẩn Thông Tư 200</h2>
              <p className="text-[11px] text-emerald-300 mt-0.5">
                {activeClient ? `Công ty: ${activeClient.name} — MST: ${activeClient.taxCode}` : 'Chưa chọn doanh nghiệp'}
              </p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all active:scale-95 print:hidden"
          >
            <Printer className="w-4 h-4" />
            In Sổ
          </button>
        </div>
      </div>

      {/* Ledger Type Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ledgerTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setLedgerType(tab.key)}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
              ledgerType === tab.key
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-300/40'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className={`w-4 h-4 ${ledgerType === tab.key ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className={`text-xs font-bold ${ledgerType === tab.key ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                {tab.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4" /> Lọc:
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Từ ngày</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Đến ngày</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Mã TK</label>
            <input type="text" value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
              placeholder="VD: 111, 112, 131..."
              className="w-28 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] text-slate-500 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Số CT, diễn giải..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-4">
            <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span> chứng từ |
            Tổng: <span className="font-bold text-emerald-700 dark:text-emerald-400">{totalAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* === NHẬT KÝ CHUNG === */}
      {ledgerType === 'NHAT_KY_CHUNG' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Ledger Header - Print Friendly */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 print:text-center">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SỔ NHẬT KÝ CHUNG</p>
            <p className="text-[10px] text-slate-500">Theo TT 200/2014/TT-BTC — Đơn vị tiền tệ: VNĐ</p>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[700px]">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3 w-[90px]">Ngày CT</th>
                  <th className="p-3 w-[90px]">Số CT</th>
                  <th className="p-3">Diễn Giải</th>
                  <th className="p-3 w-[70px]">TK Nợ</th>
                  <th className="p-3 w-[70px]">TK Có</th>
                  <th className="p-3 text-right w-[130px]">Số Tiền (đ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {generalJournalRows.map((t, i) => (
                  <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/10'}`}>
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-200 whitespace-nowrap">{t.date}</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-400 font-bold">{t.voucherNo}</td>
                    <td className="p-3 max-w-xs">{t.description}</td>
                    <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">{t.debitAcc || '—'}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">{t.creditAcc || '—'}</td>
                    <td className="p-3 text-right font-bold tabular-num text-slate-900 dark:text-slate-100">{t.amount.toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold border-t-2 border-slate-300 dark:border-slate-600">
                  <td colSpan={5} className="p-3 text-right text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">CỘNG PHÁT SINH KỲ:</td>
                  <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 tabular-num">{totalAmount.toLocaleString('vi-VN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === SỔ CÁI === */}
      {ledgerType === 'SO_CAI' && (
        <div className="space-y-4">
          {soCaiData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Không có dữ liệu. Nhập mã tài khoản vào ô lọc hoặc bỏ trống để xem tất cả.</p>
            </div>
          ) : (
            soCaiData.map(group => (
              <div key={group.acc} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">TÀI KHOẢN {group.acc}</p>
                    <p className="text-[10px] text-slate-500">{group.rows.length} dòng phát sinh</p>
                  </div>
                  <div className="text-xs text-right">
                    <p className="text-slate-500">Nợ: <strong className="text-amber-700 dark:text-amber-400">{group.totalDebit.toLocaleString('vi-VN')}</strong></p>
                    <p className="text-slate-500">Có: <strong className="text-indigo-700 dark:text-indigo-400">{group.totalCredit.toLocaleString('vi-VN')}</strong></p>
                    <p className={`font-extrabold ${group.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      Dư: {group.balance.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[280px]">
                  <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2">Ngày</th><th className="p-2">Số CT</th><th className="p-2">Diễn Giải</th>
                        <th className="p-2 text-right">PS Nợ</th><th className="p-2 text-right">PS Có</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {group.rows.map(t => {
                        const isDebit = t.debitAcc?.startsWith(group.acc);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 whitespace-nowrap">{t.date}</td>
                            <td className="p-2 text-emerald-700 dark:text-emerald-400 font-bold">{t.voucherNo}</td>
                            <td className="p-2 max-w-xs truncate">{t.description}</td>
                            <td className="p-2 text-right tabular-num font-bold text-amber-700 dark:text-amber-400">{isDebit ? t.amount.toLocaleString('vi-VN') : '—'}</td>
                            <td className="p-2 text-right tabular-num font-bold text-indigo-700 dark:text-indigo-400">{!isDebit ? t.amount.toLocaleString('vi-VN') : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* === SỔ CHI TIẾT === */}
      {ledgerType === 'SO_CHI_TIET' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                SỔ CHI TIẾT TK {accountFilter || '(Chưa chọn)'}
              </p>
              <p className="text-[10px] text-slate-500">Thể hiện số dư lũy kế từng dòng phát sinh</p>
            </div>
          </div>
          {!accountFilter ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <ChevronDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Vui lòng nhập <strong>Mã TK</strong> vào ô lọc phía trên để xem sổ chi tiết.</p>
              <p className="text-xs mt-1">VD: 112, 131, 331...</p>
            </div>
          ) : soChiTietRows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Không có phát sinh cho TK {accountFilter}</div>
          ) : (
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[720px]">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-3">Ngày CT</th>
                    <th className="p-3">Số CT</th>
                    <th className="p-3">Diễn Giải</th>
                    <th className="p-3">Đối ứng</th>
                    <th className="p-3 text-right">PS Nợ</th>
                    <th className="p-3 text-right">PS Có</th>
                    <th className="p-3 text-right">Số Dư</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {soChiTietRows.map((t, i) => (
                    <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/10'}`}>
                      <td className="p-3 whitespace-nowrap font-semibold">{t.date}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400 font-bold">{t.voucherNo}</td>
                      <td className="p-3 max-w-xs truncate">{t.description}</td>
                      <td className="p-3 font-mono text-amber-700 dark:text-amber-400">
                        {t.debit > 0 ? t.creditAcc : t.debitAcc}
                      </td>
                      <td className="p-3 text-right tabular-num font-bold text-amber-700 dark:text-amber-400">{t.debit > 0 ? t.debit.toLocaleString('vi-VN') : '—'}</td>
                      <td className="p-3 text-right tabular-num font-bold text-indigo-700 dark:text-indigo-400">{t.credit > 0 ? t.credit.toLocaleString('vi-VN') : '—'}</td>
                      <td className={`p-3 text-right tabular-num font-extrabold ${t.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {t.balance.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={4} className="p-3 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">CỘNG:</td>
                    <td className="p-3 text-right tabular-num text-amber-700 dark:text-amber-400">
                      {soChiTietRows.reduce((s, r) => s + r.debit, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right tabular-num text-indigo-700 dark:text-indigo-400">
                      {soChiTietRows.reduce((s, r) => s + r.credit, 0).toLocaleString('vi-VN')}
                    </td>
                    <td className={`p-3 text-right tabular-num ${soChiTietRows.at(-1)?.balance ?? 0 >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                      {(soChiTietRows.at(-1)?.balance ?? 0).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
