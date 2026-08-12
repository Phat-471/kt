import React, { useState } from 'react';
import { AdvancedFilterParams, NormalizedTransaction } from '../../types/accounting';
import { Search, Filter, RotateCcw, Calendar, Hash, DollarSign } from 'lucide-react';

interface AdvancedFilterBarProps {
  onFilterChange: (params: AdvancedFilterParams) => void;
  totalCount: number;
  filteredCount: number;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  onFilterChange,
  totalCount,
  filteredCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [account, setAccount] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [status, setStatus] = useState('ALL');

  const emitChange = (updated: Partial<AdvancedFilterParams>) => {
    const params: AdvancedFilterParams = {
      keyword: updated.keyword !== undefined ? updated.keyword : keyword,
      fromDate: updated.fromDate !== undefined ? updated.fromDate : fromDate,
      toDate: updated.toDate !== undefined ? updated.toDate : toDate,
      account: updated.account !== undefined ? updated.account : account,
      minAmount: updated.minAmount !== undefined ? updated.minAmount : minAmount,
      maxAmount: updated.maxAmount !== undefined ? updated.maxAmount : maxAmount,
      status: updated.status !== undefined ? updated.status : status,
    };
    onFilterChange(params);
  };

  const handleReset = () => {
    setKeyword('');
    setFromDate('');
    setToDate('');
    setAccount('');
    setMinAmount('');
    setMaxAmount('');
    setStatus('ALL');
    onFilterChange({
      keyword: '',
      fromDate: '',
      toDate: '',
      account: '',
      minAmount: '',
      maxAmount: '',
      status: 'ALL',
    });
  };

  const isFiltered = keyword || fromDate || toDate || account || minAmount || maxAmount || status !== 'ALL';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm text-xs">
      {/* Primary Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              emitChange({ keyword: e.target.value });
            }}
            placeholder="Tìm kiếm theo Số CT, Diễn giải, Tên đối tác, Mã số thuế, File nguồn..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
              isOpen || isFiltered
                ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/40'
                : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Bộ Lọc Nâng Cao</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-400 animate-pulse"></span>
            )}
          </button>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 pl-2 border-l border-slate-200 dark:border-slate-800">
            Hiển thị <strong className="text-brand-600 dark:text-brand-400 font-extrabold">{filteredCount}</strong> / {totalCount} dòng
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filters */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {/* Date Range */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Từ ngày:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                emitChange({ fromDate: e.target.value });
              }}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Đến ngày:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                emitChange({ toDate: e.target.value });
              }}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> TK Nợ / TK Có:
            </label>
            <input
              type="text"
              placeholder="VD: 111, 112, 131, 331..."
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                emitChange({ account: e.target.value });
              }}
              className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Khoảng số tiền (VNĐ):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="Từ..."
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  emitChange({ minAmount: e.target.value });
                }}
                className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold text-right"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Đến..."
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  emitChange({ maxAmount: e.target.value });
                }}
                className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold text-right"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function filterTransactionsHelper(
  transactions: NormalizedTransaction[],
  params: AdvancedFilterParams
): NormalizedTransaction[] {
  return transactions.filter((t) => {
    // Keyword match
    if (params.keyword) {
      const kw = params.keyword.toLowerCase().trim();
      const matchVoucher = t.voucherNo.toLowerCase().includes(kw);
      const matchDesc = t.description.toLowerCase().includes(kw);
      const matchPartner = t.partnerName.toLowerCase().includes(kw);
      const matchTax = t.partnerTaxCode.toLowerCase().includes(kw);
      const matchFile = t.sourceFileName.toLowerCase().includes(kw);
      if (!matchVoucher && !matchDesc && !matchPartner && !matchTax && !matchFile) {
        return false;
      }
    }

    // Date Range match
    if (params.fromDate && t.date < params.fromDate) return false;
    if (params.toDate && t.date > params.toDate) return false;

    // Account match
    if (params.account) {
      const accKw = params.account.trim().toLowerCase();
      const matchDebit = t.debitAcc.toLowerCase().includes(accKw);
      const matchCredit = t.creditAcc.toLowerCase().includes(accKw);
      if (!matchDebit && !matchCredit) return false;
    }

    // Amount Range match
    if (params.minAmount && t.amount < Number(params.minAmount)) return false;
    if (params.maxAmount && t.amount > Number(params.maxAmount)) return false;

    // Status match
    if (params.status && params.status !== 'ALL') {
      if (params.status === 'APPROVED' && !t.userApproved) return false;
      if (params.status === 'ERROR' && t.validationStatus !== 'ERROR') return false;
      if (params.status === 'WARNING' && t.validationStatus !== 'WARNING') return false;
    }

    return true;
  });
}
