import React, { useState, useMemo } from 'react';
import { TradeUnionTransaction, TradeUnionVoucherType, TradeUnionCategory, Client, UnionSignerSettings } from '../../types/accounting';
import {
  Receipt,
  Printer,
  CheckSquare,
  Square,
  Calendar,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Wallet,
  Landmark,
  Tag,
  CalendarRange,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  X,
  ChevronDown
} from 'lucide-react';
import { SearchBar } from '../common/SearchBar';
import { formatNumber } from '../../utils/formatters';
import { getTradeUnionCategoryLabel, exportCustomVouchersToExcel } from '../../services/tradeUnionService';

interface VouchersTabProps {
  transactions: TradeUnionTransaction[];
  selectedMonth: number | 'ALL';
  onSelectMonth: (month: number | 'ALL') => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  voucherFilter: 'ALL' | 'RECEIPT' | 'PAYMENT';
  onVoucherFilterChange: (val: 'ALL' | 'RECEIPT' | 'PAYMENT') => void;
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  onOpenAddModal: (type: TradeUnionVoucherType) => void;
  onPrintSingle: (tx: TradeUnionTransaction) => void;
  onPrintBatchSelected: () => void;
  onPrintMonth: (month: number | 'ALL') => void;
  onDeleteSelected?: (ids?: string[]) => void;
  client?: Client | null;
  signerSettings?: UnionSignerSettings | null;
  selectedYear?: number;
}

type TimeFilterMode = 'MONTH' | 'QUARTER' | 'CUSTOM' | 'ALL';
type SortField = 'DATE' | 'VOUCHER_NO' | 'PERSON_NAME' | 'AMOUNT' | 'CATEGORY';
type SortOrder = 'ASC' | 'DESC';

interface TransactionRowProps {
  tx: TradeUnionTransaction;
  idx: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPrintSingle: (tx: TradeUnionTransaction) => void;
}

const TransactionRow = React.memo<TransactionRowProps>(({
  tx,
  idx,
  isSelected,
  onToggleSelect,
  onPrintSingle,
}) => {
  const isReceipt = tx.voucherType === 'UNION_RECEIPT';
  return (
    <tr className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
      <td className="p-3 text-center">
        <button onClick={() => onToggleSelect(tx.id)} className="text-slate-400 hover:text-slate-700">
          {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
        </button>
      </td>
      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
      <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{tx.date}</td>
      <td className="p-3 font-bold font-mono text-blue-700 whitespace-nowrap">{tx.voucherNo}</td>
      <td className="p-3 whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
            isReceipt
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {isReceipt ? 'Thu (C40)' : 'Chi (C41)'}
        </span>
      </td>
      <td className="p-3">
        <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
          <span>{tx.personName}</span>
          {tx.department && <span className="text-[10px] text-slate-400 font-normal">({tx.department})</span>}
          <span className="text-[10px] text-slate-400 px-1.5 py-0.2 bg-slate-100 rounded">
            {getTradeUnionCategoryLabel(tx.category)}
          </span>
        </div>
        <div className="text-slate-500 line-clamp-1 mt-0.5">{tx.reason}</div>
      </td>
      <td className="p-3 text-center whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
            tx.paymentMethod === 'BANK'
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {tx.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Tiền mặt'}
        </span>
      </td>
      <td className={`p-3 text-right font-mono font-bold text-sm whitespace-nowrap ${isReceipt ? 'text-emerald-700' : 'text-rose-700'}`}>
        {formatNumber(tx.amount)}
      </td>
      <td className="p-3 text-center whitespace-nowrap">
        <button
          onClick={() => onPrintSingle(tx)}
          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-all border border-blue-200"
          title="In phiếu này"
        >
          <Printer className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
});

export const VouchersTab: React.FC<VouchersTabProps> = ({
  transactions,
  selectedMonth,
  onSelectMonth,
  searchTerm,
  onSearchChange,
  voucherFilter,
  onVoucherFilterChange,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  onOpenAddModal,
  onPrintSingle,
  onPrintBatchSelected,
  onPrintMonth,
  onDeleteSelected,
  client,
  signerSettings,
  selectedYear = 2026,
}) => {
  // Advanced Filter States
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'ALL'>('ALL');
  const [timeMode, setTimeMode] = useState<TimeFilterMode>('MONTH');
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4 | 'ALL'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'CASH' | 'BANK'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TradeUnionCategory>('ALL');
  const [amountRangeFilter, setAmountRangeFilter] = useState<'ALL' | 'UNDER_500K' | '500K_2M' | '2M_5M' | 'OVER_5M'>('ALL');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Sorting States
  const [sortField, setSortField] = useState<SortField>('DATE');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  // Export Excel Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Pagination States
  const [pageSize, setPageSize] = useState<number | 'ALL'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dynamic available years from transactions
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([2026, 2025, 2024, 2023, selectedYear]);
    transactions.forEach(t => {
      if (t.date) {
        const y = new Date(t.date).getFullYear();
        if (!isNaN(y) && y >= 2020 && y <= 2030) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, selectedYear]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setSelectedYearFilter('ALL');
    setTimeMode('MONTH');
    onSelectMonth('ALL');
    setSelectedQuarter('ALL');
    setStartDate('');
    setEndDate('');
    onVoucherFilterChange('ALL');
    setPaymentMethodFilter('ALL');
    setCategoryFilter('ALL');
    setAmountRangeFilter('ALL');
    onSearchChange('');
    setSortField('DATE');
    setSortOrder('DESC');
  };

  const hasActiveFilter =
    selectedYearFilter !== 'ALL' ||
    selectedMonth !== 'ALL' ||
    selectedQuarter !== 'ALL' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    voucherFilter !== 'ALL' ||
    paymentMethodFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    amountRangeFilter !== 'ALL' ||
    Boolean(searchTerm);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder(field === 'DATE' || field === 'AMOUNT' ? 'DESC' : 'ASC');
    }
  };

  // Filtered & Sorted transactions list
  const sortedList = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      const tYear = !isNaN(d.getFullYear()) ? d.getFullYear() : 2025;
      const tMonth = !isNaN(d.getMonth()) ? d.getMonth() + 1 : 1;
      const tQuarter = Math.ceil(tMonth / 3);

      // 1. Lọc theo Năm
      if (selectedYearFilter !== 'ALL' && tYear !== selectedYearFilter) {
        return false;
      }

      // 2. Lọc theo Kỳ (Tháng, Quý, Khoảng ngày)
      if (timeMode === 'MONTH') {
        if (selectedMonth !== 'ALL' && tMonth !== selectedMonth) return false;
      } else if (timeMode === 'QUARTER') {
        if (selectedQuarter !== 'ALL' && tQuarter !== selectedQuarter) return false;
      } else if (timeMode === 'CUSTOM') {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
      }

      // 3. Lọc theo Loại phiếu (Thu / Chi)
      if (voucherFilter === 'RECEIPT' && t.voucherType !== 'UNION_RECEIPT') return false;
      if (voucherFilter === 'PAYMENT' && t.voucherType !== 'UNION_PAYMENT') return false;

      // 4. Lọc theo Hình thức thanh toán (Tiền mặt / Ngân hàng)
      if (paymentMethodFilter === 'CASH' && t.paymentMethod !== 'CASH') return false;
      if (paymentMethodFilter === 'BANK' && t.paymentMethod !== 'BANK') return false;

      // 5. Lọc theo Khoản mục
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

      // 6. Lọc theo Khoảng số tiền
      if (amountRangeFilter === 'UNDER_500K' && t.amount >= 500000) return false;
      if (amountRangeFilter === '500K_2M' && (t.amount < 500000 || t.amount > 2000000)) return false;
      if (amountRangeFilter === '2M_5M' && (t.amount < 2000000 || t.amount > 5000000)) return false;
      if (amountRangeFilter === 'OVER_5M' && t.amount <= 5000000) return false;

      // 7. Tìm kiếm theo từ khóa
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        const matchesNo = t.voucherNo.toLowerCase().includes(term);
        const matchesName = t.personName.toLowerCase().includes(term);
        const matchesReason = t.reason.toLowerCase().includes(term);
        const matchesDept = (t.department || '').toLowerCase().includes(term);
        if (!matchesNo && !matchesName && !matchesReason && !matchesDept) return false;
      }

      return true;
    });

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'DATE') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'VOUCHER_NO') {
        comparison = a.voucherNo.localeCompare(b.voucherNo, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'PERSON_NAME') {
        comparison = a.personName.localeCompare(b.personName, 'vi');
      } else if (sortField === 'AMOUNT') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'CATEGORY') {
        comparison = a.category.localeCompare(b.category);
      }

      return sortOrder === 'ASC' ? comparison : -comparison;
    });
  }, [
    transactions,
    selectedYearFilter,
    timeMode,
    selectedMonth,
    selectedQuarter,
    startDate,
    endDate,
    voucherFilter,
    paymentMethodFilter,
    categoryFilter,
    amountRangeFilter,
    searchTerm,
    sortField,
    sortOrder
  ]);

  // Reset về trang 1 khi danh sách hoặc bộ lọc thay đổi
  const totalPages = useMemo(() => {
    if (pageSize === 'ALL' || sortedList.length === 0) return 1;
    return Math.ceil(sortedList.length / pageSize);
  }, [sortedList.length, pageSize]);

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedList = useMemo(() => {
    if (pageSize === 'ALL') return sortedList;
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, safeCurrentPage, pageSize]);

  // Lấy số dư đầu kỳ từ LocalStorage
  const openingBalances = useMemo<{ [year: number]: { cash: number; bank: number } }>(() => {
    try {
      const saved = localStorage.getItem('ACCODESK_UNION_OPENING_BALANCES');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      2023: { cash: 15594300, bank: 26460 },
      2024: { cash: 11149200, bank: 26510 },
      2025: { cash: 2309760, bank: 4041874 },
      2026: { cash: 438010, bank: 123430 },
    };
  }, []);

  const activeYear = selectedYearFilter !== 'ALL' ? selectedYearFilter : selectedYear;
  const currentOpening = useMemo(() => {
    const ob = openingBalances[activeYear] || { cash: 0, bank: 0 };
    if (paymentMethodFilter === 'CASH') return ob.cash;
    if (paymentMethodFilter === 'BANK') return ob.bank;
    return ob.cash + ob.bank;
  }, [openingBalances, activeYear, paymentMethodFilter]);

  const summary = useMemo(() => {
    let thu = 0;
    let chi = 0;
    let countThu = 0;
    let countChi = 0;

    sortedList.forEach(t => {
      if (t.voucherType === 'UNION_RECEIPT') {
        thu += t.amount;
        countThu++;
      } else {
        chi += t.amount;
        countChi++;
      }
    });

    const net = thu - chi;
    const closingBalance = currentOpening + net;

    return {
      opening: currentOpening,
      thu,
      chi,
      countThu,
      countChi,
      total: sortedList.length,
      net,
      closingBalance,
    };
  }, [sortedList, currentOpening]);

  // Danh sách ID của các chứng từ đang hiển thị mà được chọn
  const visibleSelectedIds = useMemo(() => {
    const visibleSet = new Set(sortedList.map(t => t.id));
    return selectedIds.filter(id => visibleSet.has(id));
  }, [sortedList, selectedIds]);

  const isAllSelected = sortedList.length > 0 && visibleSelectedIds.length === sortedList.length;

  const handleToggleSelectAllVisible = () => {
    if (sortedList.length === 0) return;
    if (isAllSelected) {
      // Bỏ chọn tất cả các phiếu đang hiển thị
      const visibleSet = new Set(sortedList.map(t => t.id));
      const remaining = selectedIds.filter(id => !visibleSet.has(id));
      sortedList.forEach(t => {
        if (selectedIds.includes(t.id)) onToggleSelectOne(t.id);
      });
    } else {
      // Chọn tất cả các phiếu đang hiển thị
      sortedList.forEach(t => {
        if (!selectedIds.includes(t.id)) onToggleSelectOne(t.id);
      });
    }
  };

  // Render Sort Indicator Icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors inline-block ml-1" />;
    }
    return sortOrder === 'ASC' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline-block ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 inline-block ml-1" />
    );
  };

  // Export handlers
  const handleExportExcel = (mode: 'ALL' | 'YEAR' | 'PERIOD' | 'CURRENT_VIEW' | 'SELECTED') => {
    const exportYear = selectedYearFilter !== 'ALL' ? selectedYearFilter : selectedYear;

    let exportData: TradeUnionTransaction[] = [];
    let exportTitle = '';
    let exportSubtitle = '';
    let exportFileName = '';

    if (mode === 'ALL') {
      exportData = transactions;
      exportTitle = `BẢNG KÊ TOÀN BỘ CHỨNG TỪ THU - CHI CÔNG ĐOÀN`;
      exportSubtitle = `(Tổng cộng: ${transactions.length} chứng từ trong hệ thống)`;
      exportFileName = `Danh_Sach_Tat_Ca_Thu_Chi_${selectedYear}.xlsx`;
    } else if (mode === 'YEAR') {
      exportData = transactions.filter(t => {
        const y = new Date(t.date).getFullYear();
        return y === exportYear;
      });
      exportTitle = `BẢNG KÊ CHỨNG TỪ THU - CHI CÔNG ĐOÀN NĂM ${exportYear}`;
      exportSubtitle = `(Tổng số: ${exportData.length} chứng từ năm ${exportYear})`;
      exportFileName = `Danh_Sach_Thu_Chi_Nam_${exportYear}.xlsx`;
    } else if (mode === 'PERIOD') {
      if (timeMode === 'MONTH' && selectedMonth !== 'ALL') {
        exportData = transactions.filter(t => {
          const d = new Date(t.date);
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          return m === selectedMonth && (selectedYearFilter === 'ALL' || y === selectedYearFilter);
        });
        exportTitle = `BẢNG KÊ CHỨNG TỪ THU - CHI CÔNG ĐOÀN THÁNG ${selectedMonth}/${exportYear}`;
        exportSubtitle = `(Tổng số: ${exportData.length} chứng từ tháng ${selectedMonth})`;
        exportFileName = `Danh_Sach_Thu_Chi_Thang_${selectedMonth}_${exportYear}.xlsx`;
      } else if (timeMode === 'QUARTER' && selectedQuarter !== 'ALL') {
        exportData = transactions.filter(t => {
          const d = new Date(t.date);
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const y = d.getFullYear();
          return q === selectedQuarter && (selectedYearFilter === 'ALL' || y === selectedYearFilter);
        });
        exportTitle = `BẢNG KÊ CHỨNG TỪ THU - CHI CÔNG ĐOÀN QUÝ ${selectedQuarter}/${exportYear}`;
        exportSubtitle = `(Tổng số: ${exportData.length} chứng từ Quý ${selectedQuarter})`;
        exportFileName = `Danh_Sach_Thu_Chi_Quy_${selectedQuarter}_${exportYear}.xlsx`;
      } else {
        exportData = sortedList;
        exportTitle = `BẢNG KÊ CHỨNG TỪ THU - CHI CÔNG ĐOÀN NĂM ${exportYear}`;
        exportSubtitle = `(Tổng số: ${exportData.length} chứng từ)`;
        exportFileName = `Danh_Sach_Thu_Chi_${exportYear}.xlsx`;
      }
    } else if (mode === 'CURRENT_VIEW') {
      exportData = sortedList;
      exportTitle = `BẢNG KÊ CHỨNG TỪ THU - CHI THEO BỘ LỌC ĐANG XEM`;
      exportSubtitle = `(Số lượng: ${sortedList.length} chứng từ phù hợp)`;
      exportFileName = `Danh_Sach_Thu_Chi_Dang_Loc_${exportYear}.xlsx`;
    } else if (mode === 'SELECTED') {
      exportData = transactions.filter(t => selectedIds.includes(t.id));
      exportTitle = `BẢNG KÊ CÁC CHỨNG TỪ THU - CHI ĐÃ CHỌN`;
      exportSubtitle = `(Tổng số: ${exportData.length} chứng từ được đánh dấu)`;
      exportFileName = `Danh_Sach_Thu_Chi_Da_Chon_${exportYear}.xlsx`;
    }

    if (exportData.length === 0) {
      alert('Không có chứng từ nào để xuất Excel theo lựa chọn này!');
      return;
    }

    exportCustomVouchersToExcel({
      title: exportTitle,
      subtitle: exportSubtitle,
      transactions: exportData,
      client: client || null,
      year: exportYear,
      signers: signerSettings || null,
      fileName: exportFileName
    });

    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Thanh Tiêu Đề & Nút Thao Tác */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Phiếu Thu (C40) & Phiếu Chi (C41)</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                Mẫu TT 107
              </span>
            </h2>
            <p className="text-xs text-slate-500">Tạo phiếu, sắp xếp, lọc đa chiều theo năm/tháng/khoản mục và xuất Excel / In ấn chuyên nghiệp</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Nút Xuất Excel */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Mở bảng tùy chọn xuất Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel</span>
            <ChevronDown className="w-3 h-3 text-emerald-600" />
          </button>

          <button
            onClick={() => onOpenAddModal('UNION_RECEIPT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Thu</span>
          </button>

          <button
            onClick={() => onOpenAddModal('UNION_PAYMENT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* Bộ Lọc Đa Chiều & Thanh Sắp Xếp */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
        {/* Hàng 1: Lọc Năm & Chọn Chế Độ Kỳ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lọc Theo Năm */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Năm:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYearFilter(val === 'ALL' ? 'ALL' : Number(val));
                }}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả năm</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            {/* Chuyển Chế Độ Thời Gian (Tháng / Quý / Khoảng ngày) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setTimeMode('MONTH')}
                className={`px-2.5 py-1 rounded-md transition-all ${timeMode === 'MONTH' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Theo Tháng
              </button>
              <button
                onClick={() => setTimeMode('QUARTER')}
                className={`px-2.5 py-1 rounded-md transition-all ${timeMode === 'QUARTER' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Theo Quý
              </button>
              <button
                onClick={() => setTimeMode('CUSTOM')}
                className={`px-2.5 py-1 rounded-md transition-all ${timeMode === 'CUSTOM' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Khoảng Ngày
              </button>
            </div>
          </div>

          {/* Sắp Xếp Nhanh & Nút Bộ Lọc Nâng Cao */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Sort Selector */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-700 hidden sm:inline">Sắp xếp:</span>
              <select
                value={`${sortField}_${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split('_');
                  setSortField(f as SortField);
                  setSortOrder(o as SortOrder);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="DATE_DESC">📅 Ngày: Mới nhất trước</option>
                <option value="DATE_ASC">📅 Ngày: Cũ nhất trước</option>
                <option value="AMOUNT_DESC">💰 Số tiền: Lớn đến nhỏ</option>
                <option value="AMOUNT_ASC">💰 Số tiền: Nhỏ đến lớn</option>
                <option value="VOUCHER_NO_ASC">🔢 Số phiếu: A - Z</option>
                <option value="PERSON_NAME_ASC">👤 Người nộp / nhận: A - Z</option>
              </select>
            </div>

            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isAdvancedOpen || paymentMethodFilter !== 'ALL' || categoryFilter !== 'ALL' || amountRangeFilter !== 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bộ Lọc Nâng Cao</span>
              {(paymentMethodFilter !== 'ALL' || categoryFilter !== 'ALL' || amountRangeFilter !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>

            {hasActiveFilter && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-medium transition-all"
                title="Xóa tất cả các điều kiện lọc và đặt lại mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Thanh Chọn Kỳ Chi Tiết */}
        {timeMode === 'MONTH' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => onSelectMonth('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${selectedMonth === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              Cả Năm ({transactions.filter(t => selectedYearFilter === 'ALL' || new Date(t.date).getFullYear() === selectedYearFilter).length})
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
              const countInMonth = transactions.filter(t => {
                const d = new Date(t.date);
                const matchM = (d.getMonth() + 1) === m;
                const matchY = selectedYearFilter === 'ALL' || d.getFullYear() === selectedYearFilter;
                return matchM && matchY;
              }).length;

              return (
                <button
                  key={m}
                  onClick={() => onSelectMonth(m)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${selectedMonth === m
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <span>T{m}</span>
                  {countInMonth > 0 && (
                    <span className={`text-[10px] px-1 py-0.2 rounded-full ${selectedMonth === m ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                      {countInMonth}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {timeMode === 'QUARTER' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setSelectedQuarter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${selectedQuarter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
            >
              Tất Cả Quý
            </button>
            {[1, 2, 3, 4].map(q => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${selectedQuarter === q ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
              >
                Quý {q} (Tháng {q * 3 - 2} - {q * 3})
              </button>
            ))}
          </div>
        )}

        {timeMode === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs flex-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <CalendarRange className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="font-semibold text-slate-700">Đến ngày:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Hàng 3: Tìm Kiếm Từ Khóa & Phân Loại Thu / Chi */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <SearchBar
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Tìm kiếm theo số phiếu, tên người nộp/nhận, nội dung, tổ CĐ..."
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => onVoucherFilterChange('ALL')}
              className={`px-3 py-1 rounded font-semibold transition-all ${voucherFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => onVoucherFilterChange('RECEIPT')}
              className={`px-3 py-1 rounded font-semibold transition-all ${voucherFilter === 'RECEIPT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Thu (C40)
            </button>
            <button
              onClick={() => onVoucherFilterChange('PAYMENT')}
              className={`px-3 py-1 rounded font-semibold transition-all ${voucherFilter === 'PAYMENT' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Chi (C41)
            </button>
          </div>
        </div>

        {/* Panel Nâng Cao: Hình Thức, Khoản Mục, Mức Tiền */}
        {isAdvancedOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs animate-in fade-in duration-200">
            {/* Lọc Hình Thức Thanh Toán */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>Hình Thức / Tài Khoản:</span>
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">-- Tất cả hình thức --</option>
                <option value="CASH">Tiền mặt (TK 1111 - Sổ TM)</option>
                <option value="BANK">Chuyển khoản (TK 1121 - Sổ NH)</option>
              </select>
            </div>

            {/* Lọc Khoản Mục Kế Toán */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Khoản Mục Thu / Chi:</span>
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">-- Tất cả khoản mục --</option>
                <option value="DOAN_PHI_1_PERCENT">Đoàn phí công đoàn</option>
                <option value="KPCĐ_2_PERCENT">Kinh phí công đoàn 2%</option>
                <option value="KINH_PHI_CAP_TREN">Kinh phí cấp trên / Rút NH</option>
                <option value="QUA_LE_TET">Chi quà lễ / Tết</option>
                <option value="THAM_HOI_OM_DAU">Thăm hỏi sinh nhật / ốm đau</option>
                <option value="HOAT_DONG_PHONG_TRAO">Phong trào, thể thao, văn nghệ</option>
                <option value="KHEN_THUONG">Khen thưởng đoàn viên</option>
                <option value="NOP_CAP_TREN_25">Nộp cấp trên (25% / 30%)</option>
                <option value="PHU_CAP_CAN_BO_CD">Phụ cấp cán bộ CĐ</option>
                <option value="CHI_KHAC">Chi văn phòng phẩm, khác</option>
              </select>
            </div>

            {/* Lọc Theo Khoảng Số Tiền */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Khoảng Số Tiền (VNĐ):
              </label>
              <select
                value={amountRangeFilter}
                onChange={(e) => setAmountRangeFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">-- Tất cả số tiền --</option>
                <option value="UNDER_500K">Dưới 500.000 đ</option>
                <option value="500K_2M">Từ 500.000 đ đến 2.000.000 đ</option>
                <option value="2M_5M">Từ 2.000.000 đ đến 5.000.000 đ</option>
                <option value="OVER_5M">Trên 5.000.000 đ</option>
              </select>
            </div>
          </div>
        )}

        {/* Thanh Tổng Kết Dòng Tiền & Nút In */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap font-medium">
            <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
              Kết quả: <strong className="text-slate-900">{summary.total} phiếu</strong>
            </span>

            {summary.opening > 0 && (
              <span className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-semibold" title="Số dư đầu kỳ của tài khoản và năm đang lọc">
                <span>Đầu kỳ:</span>
                <strong className="font-mono text-slate-900">{formatNumber(summary.opening)} đ</strong>
              </span>
            )}

            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Thu: {formatNumber(summary.thu)} đ ({summary.countThu})</span>
            </span>

            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Chi: {formatNumber(summary.chi)} đ ({summary.countChi})</span>
            </span>

            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold ${
              paymentMethodFilter === 'BANK'
                ? 'text-blue-800 bg-blue-50 border-blue-200'
                : 'text-amber-900 bg-amber-50 border-amber-300'
            }`} title="Số dư cuối kỳ = Số dư đầu kỳ + Tổng Thu - Tổng Chi">
              <span>{paymentMethodFilter === 'BANK' ? 'Số Dư Cuối NH:' : 'Tồn Quỹ Cuối Kỳ:'}</span>
              <strong className="font-mono text-sm">{formatNumber(summary.closingBalance)} đ</strong>
              {summary.opening > 0 && (
                <span className="text-[10px] font-normal text-slate-500">
                  (Thu-Chi: {summary.net >= 0 ? '+' : ''}{formatNumber(summary.net)} đ)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút In Toàn Bộ Danh Sách Đang Lọc */}
            <button
              onClick={() => onPrintMonth(selectedMonth)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Danh Sách ({sortedList.length} phiếu)</span>
            </button>

            {/* Nút In Các Phiếu Được Tích Chọn */}
            {visibleSelectedIds.length > 0 && (
              <button
                onClick={onPrintBatchSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Đã Chọn ({visibleSelectedIds.length})</span>
              </button>
            )}

            {visibleSelectedIds.length > 0 && onDeleteSelected && (
              <button
                onClick={() => onDeleteSelected(visibleSelectedIds)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ({visibleSelectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Phiếu Có Sticky Header & Sắp Xếp Tương Tác */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200 shadow-sm">
              <tr>
                <th className="p-3 w-10 text-center bg-slate-100">
                  <button onClick={handleToggleSelectAllVisible} className="text-slate-400 hover:text-slate-700" title="Chọn tất cả phiếu đang lọc">
                    {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-3 w-12 text-center bg-slate-100">STT</th>

                {/* Cột Ngày - Cho Phép Sắp Xếp */}
                <th
                  onClick={() => handleSort('DATE')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-200/80 transition-colors select-none group bg-slate-100"
                  title="Nhấp để sắp xếp theo Ngày lập"
                >
                  <div className="flex items-center justify-between">
                    <span>Ngày</span>
                    {renderSortIcon('DATE')}
                  </div>
                </th>

                {/* Cột Số Phiếu - Cho Phép Sắp Xếp */}
                <th
                  onClick={() => handleSort('VOUCHER_NO')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-200/80 transition-colors select-none group bg-slate-100"
                  title="Nhấp để sắp xếp theo Số phiếu"
                >
                  <div className="flex items-center justify-between">
                    <span>Số Phiếu</span>
                    {renderSortIcon('VOUCHER_NO')}
                  </div>
                </th>

                {/* Cột Loại Phiếu */}
                <th className="p-3 w-28 bg-slate-100">Loại</th>

                {/* Cột Người Nộp / Nhận - Cho Phép Sắp Xếp */}
                <th
                  onClick={() => handleSort('PERSON_NAME')}
                  className="p-3 cursor-pointer hover:bg-slate-200/80 transition-colors select-none group bg-slate-100"
                  title="Nhấp để sắp xếp theo Tên người nộp/nhận"
                >
                  <div className="flex items-center justify-between">
                    <span>Người Nộp / Nhận & Nội Dung</span>
                    {renderSortIcon('PERSON_NAME')}
                  </div>
                </th>

                {/* Cột Hình Thức */}
                <th className="p-3 w-28 text-center bg-slate-100">Hình Thức</th>

                {/* Cột Số Tiền - Cho Phép Sắp Xếp */}
                <th
                  onClick={() => handleSort('AMOUNT')}
                  className="p-3 w-36 text-right cursor-pointer hover:bg-slate-200/80 transition-colors select-none group bg-slate-100"
                  title="Nhấp để sắp xếp theo Số tiền"
                >
                  <div className="flex items-center justify-end">
                    <span>Số Tiền (đ)</span>
                    {renderSortIcon('AMOUNT')}
                  </div>
                </th>

                <th className="p-3 w-20 text-center bg-slate-100">In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-9 h-9 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">Không tìm thấy phiếu nào phù hợp với bộ lọc hiện tại.</p>
                      {hasActiveFilter && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs shadow-sm"
                        >
                          Đặt lại tất cả bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((tx, idx) => {
                  const globalIdx = pageSize === 'ALL' ? idx : (safeCurrentPage - 1) * pageSize + idx;
                  return (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      idx={globalIdx}
                      isSelected={selectedIds.includes(tx.id)}
                      onToggleSelect={onToggleSelectOne}
                      onPrintSingle={onPrintSingle}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Điều Khiển Phân Trang Siêu Nhẹ & Tinh Tế */}
        {sortedList.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Hiển thị số dòng hiện tại */}
            <div className="text-slate-600 flex items-center gap-2">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-900 font-mono">
                  {pageSize === 'ALL' ? `1 - ${sortedList.length}` : `${(safeCurrentPage - 1) * pageSize + 1} - ${Math.min(safeCurrentPage * pageSize, sortedList.length)}`}
                </strong>{' '}
                trong tổng số <strong className="text-slate-900 font-mono">{sortedList.length}</strong> phiếu
              </span>

              {/* Bộ chọn số dòng / trang */}
              <div className="flex items-center gap-1 ml-2">
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">Mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value="ALL">Tất cả</option>
                </select>
              </div>
            </div>

            {/* Các Nút Điều Hướng Trang */}
            {pageSize !== 'ALL' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-xs"
                  title="Trang đầu"
                >
                  ««
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-xs"
                  title="Trang trước"
                >
                  ‹ Trước
                </button>

                {/* Các số trang xung quanh trang hiện tại */}
                <div className="flex items-center gap-1 mx-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prevP = arr[idx - 1];
                      const hasGap = prevP && p - prevP > 1;
                      return (
                        <React.Fragment key={p}>
                          {hasGap && <span className="px-1 text-slate-400">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded font-bold transition-all shadow-xs text-xs flex items-center justify-center ${
                              safeCurrentPage === p
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-xs"
                  title="Trang tiếp theo"
                >
                  Tiếp ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-all shadow-xs"
                  title="Trang cuối"
                >
                  »»
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Xuất Excel Đa Tùy Chọn */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Xuất Excel Phiếu Thu & Chi</h3>
                  <p className="text-xs text-slate-500">Định dạng bảng chuẩn, kẻ viền ô, format tiền tệ & chữ ký</p>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Tùy chọn 1: Xuất Tất Cả */}
              <button
                onClick={() => handleExportExcel('ALL')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>📄 Xuất Toàn Bộ Chứng Từ Trong CSDL</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Xuất tất cả {transactions.length} phiếu thu chi không lọc</div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              {/* Tùy chọn 2: Xuất Theo Năm */}
              <button
                onClick={() => handleExportExcel('YEAR')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>📅 Xuất Theo Năm {selectedYearFilter !== 'ALL' ? selectedYearFilter : selectedYear}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chỉ xuất các phiếu phát sinh trong năm {selectedYearFilter !== 'ALL' ? selectedYearFilter : selectedYear}</div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              {/* Tùy chọn 3: Xuất Theo Tháng / Quý */}
              <button
                onClick={() => handleExportExcel('PERIOD')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>🗓️ Xuất Theo Kỳ Lọc ({timeMode === 'MONTH' ? (selectedMonth === 'ALL' ? 'Cả năm' : `Tháng ${selectedMonth}`) : `Quý ${selectedQuarter}`})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Xuất đúng kỳ kế toán đang được chọn trên thanh lọc</div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              {/* Tùy chọn 4: Xuất Danh Sách Đang Xem */}
              <button
                onClick={() => handleExportExcel('CURRENT_VIEW')}
                className="w-full text-left p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                    <span>🔍 Xuất Danh Sách Đang Hiển Thị ({sortedList.length} phiếu)</span>
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">Xuất chính xác theo các điều kiện lọc và thứ tự sắp xếp hiện tại</div>
                </div>
                <Download className="w-4 h-4 text-blue-600 group-hover:text-blue-800" />
              </button>

              {/* Tùy chọn 5: Xuất Các Phiếu Đã Chọn (Checkbox) */}
              <button
                disabled={selectedIds.length === 0}
                onClick={() => handleExportExcel('SELECTED')}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${selectedIds.length > 0
                    ? 'border-amber-200 bg-amber-50/40 hover:border-amber-500 hover:bg-amber-50'
                    : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                  }`}
              >
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>☑️ Xuất Các Phiếu Đã Tích Chọn ({selectedIds.length} phiếu)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedIds.length > 0 ? 'Xuất các dòng bạn đã tích chọn checkbox ở bảng' : 'Chưa có phiếu nào được tích chọn'}
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
