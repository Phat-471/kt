import React, { useState, useMemo } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import { Client } from '../../types/accounting';
import { BookOpen, Printer, Filter, ChevronDown, FileText, Search, FileDown } from 'lucide-react';
import {
  exportNhatKyChungPDF,
  exportSoCaiPDF,
  exportSoChiTietPDF,
} from '../../services/ledgerPdfExporter';
import { VirtualTable } from '../common/VirtualTable';

interface AccountingLedgerViewProps {
  transactions: NormalizedTransaction[];
  activeClient: Client | null;
}

import { generateSpecialJournal, SpecialJournalType } from '../../services/specialJournalsService';

type LedgerType = 'NHAT_KY_CHUNG' | 'SO_CAI' | 'SO_CHI_TIET' | 'NK_MUA_HANG' | 'NK_BAN_HANG' | 'NK_THU_TIEN' | 'NK_CHI_TIEN';

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
      if (t.debitAcc) accounts.add(t.debitAcc);
      if (t.creditAcc) accounts.add(t.creditAcc);
    });
    const accountList = Array.from(accounts).sort();

    return accountList.map(acc => {
      const rows = filtered.filter(t => t.debitAcc === acc || t.creditAcc === acc);
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

  const handleExportPDF = () => {
    const pdfOpts = {
      transactions: filtered,
      client: activeClient,
      period: (dateFrom || dateTo) ? { from: dateFrom || '2000-01-01', to: dateTo || '2099-12-31' } : undefined,
      filterAccount: accountFilter || undefined,
      preparedBy: '',
    };
    if (ledgerType === 'NHAT_KY_CHUNG') exportNhatKyChungPDF(pdfOpts);
    else if (ledgerType === 'SO_CAI') exportSoCaiPDF(pdfOpts);
    else exportSoChiTietPDF(pdfOpts);
  };

  const ledgerTabs: { key: LedgerType; label: string; desc: string }[] = [
    { key: 'NHAT_KY_CHUNG', label: 'Nhật Ký Chung', desc: 'Tất cả bút toán theo thứ tự thời gian (S03a)' },
    { key: 'SO_CAI', label: 'Sổ Cái TK', desc: 'Theo dõi theo từng tài khoản kế toán' },
    { key: 'SO_CHI_TIET', label: 'Sổ Chi Tiết', desc: 'Chi tiết 1 tài khoản + số dư luỹ kế' },
    { key: 'NK_MUA_HANG', label: 'NK Mua Hàng', desc: 'Sổ nhật ký mua hàng (S04a)' },
    { key: 'NK_BAN_HANG', label: 'NK Bán Hàng', desc: 'Sổ nhật ký bán hàng (S04b)' },
    { key: 'NK_THU_TIEN', label: 'NK Thu Tiền', desc: 'Sổ nhật ký thu tiền quỹ/NH (S04c)' },
    { key: 'NK_CHI_TIEN', label: 'NK Chi Tiền', desc: 'Sổ nhật ký chi tiền quỹ/NH (S04d)' },
  ];

  // Dữ liệu Sổ Nhật Ký Đặc Biệt
  const specialJournalSummary = useMemo(() => {
    let sjType: SpecialJournalType = 'PURCHASE';
    if (ledgerType === 'NK_MUA_HANG') sjType = 'PURCHASE';
    else if (ledgerType === 'NK_BAN_HANG') sjType = 'SALES';
    else if (ledgerType === 'NK_THU_TIEN') sjType = 'CASH_RECEIPT';
    else if (ledgerType === 'NK_CHI_TIEN') sjType = 'CASH_DISBURSEMENT';
    else return null;

    return generateSpecialJournal(filtered, sjType);
  }, [filtered, ledgerType]);

  const handleExportSpecialExcel = () => {
    if (!specialJournalSummary) return;
    import('../../services/specialJournalsService').then(mod => {
      mod.exportSpecialJournalToExcel(specialJournalSummary, activeClient?.name || 'Doanh_Nghiep');
    });
  };

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
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Xuất PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In Sổ
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Type Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ledgerTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setLedgerType(tab.key)}
            className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
              ledgerType === tab.key
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">{tab.label}</span>
              {ledgerType === tab.key && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{tab.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm số CT / nội dung..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs w-36 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Lọc TK (VD: 111, 642)..."
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs w-32 font-mono text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <span>Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
            />
            <span>Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-500">
          Hiển thị: <strong className="text-slate-900 dark:text-slate-100 font-bold">{filtered.length}</strong> / {transactions.length} chứng từ
        </div>
      </div>

      {/* === NHẬT KÝ CHUNG === */}
      {ledgerType === 'NHAT_KY_CHUNG' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 print:text-center">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">SỔ NHẬT KÝ CHUNG</p>
            <p className="text-[10px] text-slate-500">Theo TT 200/2014/TT-BTC — Đơn vị tiền tệ: VNĐ</p>
          </div>
          <VirtualTable
            data={generalJournalRows}
            height={520}
            estimateSize={44}
            header={
              <tr className="flex w-full">
                <th className="p-3 w-[100px] shrink-0">Ngày CT</th>
                <th className="p-3 w-[110px] shrink-0">Số CT</th>
                <th className="p-3 flex-1 min-w-[200px]">Diễn Giải</th>
                <th className="p-3 w-[90px] shrink-0 text-center">TK Nợ</th>
                <th className="p-3 w-[90px] shrink-0 text-center">TK Có</th>
                <th className="p-3 w-[140px] shrink-0 text-right">Số Tiền (đ)</th>
              </tr>
            }
            renderRow={(t) => (
              <>
                <td className="p-3 w-[100px] shrink-0 font-semibold text-slate-900 dark:text-slate-200 whitespace-nowrap">{t.date}</td>
                <td className="p-3 w-[110px] shrink-0 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">{t.voucherNo}</td>
                <td className="p-3 flex-1 min-w-[200px] truncate">{t.description}</td>
                <td className="p-3 w-[90px] shrink-0 text-center font-mono font-bold text-amber-700 dark:text-amber-400">{t.debitAcc || '—'}</td>
                <td className="p-3 w-[90px] shrink-0 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">{t.creditAcc || '—'}</td>
                <td className="p-3 w-[140px] shrink-0 text-right font-bold tabular-num text-slate-900 dark:text-slate-100">{t.amount.toLocaleString('vi-VN')}</td>
              </>
            )}
            footer={
              <tr className="flex w-full">
                <td className="p-3 flex-1 text-right text-slate-700 dark:text-slate-300 uppercase text-xs font-extrabold tracking-wider">CỘNG PHÁT SINH KỲ:</td>
                <td className="p-3 w-[140px] shrink-0 text-right text-emerald-700 dark:text-emerald-400 font-extrabold tabular-num">{totalAmount.toLocaleString('vi-VN')}</td>
              </tr>
            }
          />
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
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[650px]">
                    <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5">Ngày CT</th>
                        <th className="p-2.5">Số CT</th>
                        <th className="p-2.5">Diễn Giải</th>
                        <th className="p-2.5">TK Đối Ứng</th>
                        <th className="p-2.5 text-right">Phát Sinh Nợ</th>
                        <th className="p-2.5 text-right">Phát Sinh Có</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {group.rows.map(t => {
                        const isDebit = t.debitAcc === group.acc;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 whitespace-nowrap font-semibold">{t.date}</td>
                            <td className="p-2.5 text-emerald-700 dark:text-emerald-400 font-bold">{t.voucherNo}</td>
                            <td className="p-2.5 max-w-xs truncate">{t.description}</td>
                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                              {isDebit ? t.creditAcc : t.debitAcc}
                            </td>
                            <td className="p-2.5 text-right tabular-num font-bold text-amber-700 dark:text-amber-400">
                              {isDebit ? t.amount.toLocaleString('vi-VN') : '—'}
                            </td>
                            <td className="p-2.5 text-right tabular-num font-bold text-indigo-700 dark:text-indigo-400">
                              {!isDebit ? t.amount.toLocaleString('vi-VN') : '—'}
                            </td>
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
            <VirtualTable
              data={soChiTietRows}
              height={520}
              estimateSize={44}
              header={
                <tr className="flex w-full">
                  <th className="p-3 w-[100px] shrink-0">Ngày CT</th>
                  <th className="p-3 w-[110px] shrink-0">Số CT</th>
                  <th className="p-3 flex-1 min-w-[180px]">Diễn Giải</th>
                  <th className="p-3 w-[80px] shrink-0 text-center">Đối ứng</th>
                  <th className="p-3 w-[120px] shrink-0 text-right">PS Nợ</th>
                  <th className="p-3 w-[120px] shrink-0 text-right">PS Có</th>
                  <th className="p-3 w-[130px] shrink-0 text-right">Số Dư</th>
                </tr>
              }
              renderRow={(t) => (
                <>
                  <td className="p-3 w-[100px] shrink-0 whitespace-nowrap font-semibold">{t.date}</td>
                  <td className="p-3 w-[110px] shrink-0 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">{t.voucherNo}</td>
                  <td className="p-3 flex-1 min-w-[180px] truncate">{t.description}</td>
                  <td className="p-3 w-[80px] shrink-0 text-center font-mono text-amber-700 dark:text-amber-400">
                    {t.debit > 0 ? t.creditAcc : t.debitAcc}
                  </td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-bold text-amber-700 dark:text-amber-400">{t.debit > 0 ? t.debit.toLocaleString('vi-VN') : '—'}</td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-bold text-indigo-700 dark:text-indigo-400">{t.credit > 0 ? t.credit.toLocaleString('vi-VN') : '—'}</td>
                  <td className={`p-3 w-[130px] shrink-0 text-right tabular-num font-extrabold ${t.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {t.balance.toLocaleString('vi-VN')}
                  </td>
                </>
              )}
              footer={
                <tr className="flex w-full">
                  <td className="p-3 flex-1 text-right text-xs uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400">CỘNG:</td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-extrabold text-amber-700 dark:text-amber-400">
                    {soChiTietRows.reduce((s, r) => s + r.debit, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-extrabold text-indigo-700 dark:text-indigo-400">
                    {soChiTietRows.reduce((s, r) => s + r.credit, 0).toLocaleString('vi-VN')}
                  </td>
                  <td className={`p-3 w-[130px] shrink-0 text-right tabular-num font-extrabold ${(soChiTietRows.at(-1)?.balance ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {(soChiTietRows.at(-1)?.balance ?? 0).toLocaleString('vi-VN')}
                  </td>
                </tr>
              }
            />
          )}
        </div>
      )}

      {/* === SỔ NHẬT KÝ ĐẶC BIỆT (MUA HÀNG / BÁN HÀNG / THU TIỀN / CHI TIỀN) === */}
      {['NK_MUA_HANG', 'NK_BAN_HANG', 'NK_THU_TIEN', 'NK_CHI_TIEN'].includes(ledgerType) && specialJournalSummary && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                {specialJournalSummary.title}
              </p>
              <p className="text-[10px] text-slate-500">
                Chuẩn Thông tư 200/2014/TT-BTC — Tổng số: <strong>{specialJournalSummary.rows.length}</strong> chứng từ
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSpecialExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <FileDown className="w-3.5 h-3.5" /> Xuất Excel Sổ Này
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <VirtualTable
              data={specialJournalSummary.rows}
              height={500}
              estimateSize={44}
              header={
                <tr className="flex w-full">
                  <th className="p-3 w-[60px] shrink-0 text-center">STT</th>
                  <th className="p-3 w-[100px] shrink-0">Ngày CT</th>
                  <th className="p-3 w-[110px] shrink-0">Số CT</th>
                  <th className="p-3 flex-1 min-w-[180px]">Diễn Giải</th>
                  <th className="p-3 w-[80px] shrink-0 text-center">TK Nợ</th>
                  <th className="p-3 w-[80px] shrink-0 text-center">TK Có</th>
                  <th className="p-3 w-[140px] shrink-0">Đối Tác</th>
                  <th className="p-3 w-[120px] shrink-0 text-right">Tiền Chưa Thuế</th>
                  <th className="p-3 w-[110px] shrink-0 text-right">Thuế GTGT</th>
                  <th className="p-3 w-[130px] shrink-0 text-right">Tổng Thanh Toán</th>
                </tr>
              }
              renderRow={(r) => (
                <>
                  <td className="p-3 w-[60px] shrink-0 text-center font-mono text-slate-500">{r.stt}</td>
                  <td className="p-3 w-[100px] shrink-0 whitespace-nowrap font-semibold">{r.date}</td>
                  <td className="p-3 w-[110px] shrink-0 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">{r.voucherNo}</td>
                  <td className="p-3 flex-1 min-w-[180px] truncate">{r.description}</td>
                  <td className="p-3 w-[80px] shrink-0 text-center font-mono text-amber-700 dark:text-amber-400">{r.debitAcc || '—'}</td>
                  <td className="p-3 w-[80px] shrink-0 text-center font-mono text-indigo-700 dark:text-indigo-400">{r.creditAcc || '—'}</td>
                  <td className="p-3 w-[140px] shrink-0 truncate text-slate-600 dark:text-slate-400">{r.partnerName || '—'}</td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-bold text-slate-800 dark:text-slate-200">{r.amount.toLocaleString('vi-VN')}</td>
                  <td className="p-3 w-[110px] shrink-0 text-right tabular-num text-rose-600 dark:text-rose-400">{r.vatAmount > 0 ? r.vatAmount.toLocaleString('vi-VN') : '—'}</td>
                  <td className="p-3 w-[130px] shrink-0 text-right tabular-num font-extrabold text-emerald-700 dark:text-emerald-400">{r.totalAmount.toLocaleString('vi-VN')}</td>
                </>
              )}
              footer={
                <tr className="flex w-full">
                  <td className="p-3 flex-1 text-right text-xs uppercase font-extrabold tracking-wider text-slate-600 dark:text-slate-400">TỔNG CỘNG PHÁT SINH SỔ:</td>
                  <td className="p-3 w-[120px] shrink-0 text-right tabular-num font-extrabold text-slate-900 dark:text-slate-100">
                    {specialJournalSummary.totalAmount.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 w-[110px] shrink-0 text-right tabular-num font-extrabold text-rose-600 dark:text-rose-400">
                    {specialJournalSummary.totalVAT.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 w-[130px] shrink-0 text-right tabular-num font-extrabold text-emerald-700 dark:text-emerald-400">
                    {specialJournalSummary.grandTotal.toLocaleString('vi-VN')}
                  </td>
                </tr>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
