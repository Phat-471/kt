import React, { useState, useMemo } from 'react';
import { TradeUnionTransaction, TradeUnionVoucherType, TradeUnionCategory } from '../../types/accounting';
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
  CalendarRange
} from 'lucide-react';
import { SearchBar } from '../common/SearchBar';
import { formatNumber } from '../../utils/formatters';
import { getTradeUnionCategoryLabel } from '../../services/tradeUnionService';

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
  onDeleteSelected?: () => void;
}

type TimeFilterMode = 'MONTH' | 'QUARTER' | 'CUSTOM' | 'ALL';

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

  // Dynamic available years from transactions
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

  // Filtered transactions list
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
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
    searchTerm
  ]);

  const summary = useMemo(() => {
    let thu = 0;
    let chi = 0;
    let countThu = 0;
    let countChi = 0;

    filteredList.forEach(t => {
      if (t.voucherType === 'UNION_RECEIPT') {
        thu += t.amount;
        countThu++;
      } else {
        chi += t.amount;
        countChi++;
      }
    });

    return { 
      thu, 
      chi, 
      countThu, 
      countChi, 
      total: filteredList.length,
      net: thu - chi
    };
  }, [filteredList]);

  const isAllSelected = filteredList.length > 0 && selectedIds.length === filteredList.length;

  return (
    <div className="space-y-4">
      {/* Thanh Tiêu Đề & Nút Tạo Phiếu */}
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
            <p className="text-xs text-slate-500">Tạo phiếu, lọc chi tiết theo năm/tháng/khoản mục và in ấn hàng loạt</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAddModal('UNION_RECEIPT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Thu</span>
          </button>
          <button
            onClick={() => onOpenAddModal('UNION_PAYMENT')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lập Phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* KHU VỰC BỘ LỌC ĐA CHIỀU (MULTI-DIMENSIONAL FILTERS) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3.5">
        {/* Hàng 1: Bộ Lọc Năm & Chọn Chế Độ Thời Gian */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lọc Năm */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600 font-bold" />
              <span className="font-bold text-slate-700">Năm:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-blue-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả năm</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            {/* Chuyển Đổi Chế Độ: Theo Tháng / Theo Quý / Khoảng Ngày */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => { setTimeMode('MONTH'); }}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  timeMode === 'MONTH' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Tháng
              </button>
              <button
                onClick={() => { setTimeMode('QUARTER'); }}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  timeMode === 'QUARTER' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Quý
              </button>
              <button
                onClick={() => { setTimeMode('CUSTOM'); }}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  timeMode === 'CUSTOM' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Khoảng Ngày
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút Thu/Mở Bộ Lọc Nâng Cao */}
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isAdvancedOpen || categoryFilter !== 'ALL' || paymentMethodFilter !== 'ALL' || amountRangeFilter !== 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bộ Lọc Nâng Cao</span>
              {(categoryFilter !== 'ALL' || paymentMethodFilter !== 'ALL' || amountRangeFilter !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              )}
            </button>

            {/* Nút Xóa / Đặt Lại Bộ Lọc */}
            {hasActiveFilter && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all"
                title="Xóa tất cả bộ lọc để xem toàn bộ"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Chi Tiết Thời Gian (Tháng / Quý / Khoảng Ngày) */}
        {timeMode === 'MONTH' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-xs">
            <button
              onClick={() => onSelectMonth('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedMonth === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Cả Năm ({transactions.filter(t => selectedYearFilter === 'ALL' || new Date(t.date).getFullYear() === selectedYearFilter).length})
            </button>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
              const countInMonth = transactions.filter(t => {
                const d = new Date(t.date);
                const matchY = selectedYearFilter === 'ALL' || d.getFullYear() === selectedYearFilter;
                const matchM = (!isNaN(d.getMonth()) ? d.getMonth() + 1 : 1) === m;
                return matchY && matchM;
              }).length;

              return (
                <button
                  key={m}
                  onClick={() => onSelectMonth(m)}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    selectedMonth === m
                      ? 'bg-blue-600 text-white shadow-sm'
                      : countInMonth > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  T{m} {countInMonth > 0 && <span className="text-[10px] ml-0.5 font-bold">({countInMonth})</span>}
                </button>
              );
            })}
          </div>
        )}

        {timeMode === 'QUARTER' && (
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => setSelectedQuarter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                selectedQuarter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Cả 4 Quý
            </button>
            {([1, 2, 3, 4] as const).map(q => {
              const countInQ = transactions.filter(t => {
                const d = new Date(t.date);
                const matchY = selectedYearFilter === 'ALL' || d.getFullYear() === selectedYearFilter;
                const m = !isNaN(d.getMonth()) ? d.getMonth() + 1 : 1;
                return matchY && Math.ceil(m / 3) === q;
              }).length;

              return (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                    selectedQuarter === q
                      ? 'bg-blue-600 text-white shadow-sm'
                      : countInQ > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                      : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  Quý {q} {countInQ > 0 && <span className="text-[10px] ml-1 font-bold">({countInQ} phiếu)</span>}
                </button>
              );
            })}
          </div>
        )}

        {timeMode === 'CUSTOM' && (
          <div className="flex items-center gap-3 flex-wrap text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Hàng 3: Tìm Kiếm, Loại Phiếu & Bộ Lọc Nâng Cao Mở Rộng */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              <SearchBar 
                value={searchTerm} 
                onChange={onSearchChange} 
                placeholder="Tìm kiếm theo số phiếu, tên người nộp/nhận, nội dung, tổ CĐ..." 
              />
            </div>

            {/* Lọc Loại Phiếu: Tất cả / Thu / Chi */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs flex-shrink-0">
              <button
                onClick={() => onVoucherFilterChange('ALL')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  voucherFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => onVoucherFilterChange('RECEIPT')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  voucherFilter === 'RECEIPT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thu (C40)
              </button>
              <button
                onClick={() => onVoucherFilterChange('PAYMENT')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  voucherFilter === 'PAYMENT' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
        </div>

        {/* Thanh Tổng Kết Dòng Tiền & Nút In */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3 flex-wrap font-medium">
            <span className="text-slate-600">
              Kết quả: <strong className="text-slate-900">{summary.total} phiếu</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Thu: {formatNumber(summary.thu)} đ ({summary.countThu})</span>
            </span>
            <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Chi: {formatNumber(summary.chi)} đ ({summary.countChi})</span>
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold ${summary.net >= 0 ? 'text-blue-700 bg-blue-50' : 'text-amber-700 bg-amber-50'}`}>
              Chênh lệch: {formatNumber(summary.net)} đ
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút In Toàn Bộ Danh Sách Đang Lọc */}
            <button
              onClick={() => onPrintMonth(selectedMonth)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Danh Sách ({filteredList.length} phiếu)</span>
            </button>

            {/* Nút In Các Phiếu Được Tích Chọn */}
            {selectedIds.length > 0 && (
              <button
                onClick={onPrintBatchSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Đã Chọn ({selectedIds.length})</span>
              </button>
            )}

            {selectedIds.length > 0 && onDeleteSelected && (
              <button
                onClick={onDeleteSelected}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Phiếu */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3 w-10 text-center">
                <button onClick={onToggleSelectAll} className="text-slate-400 hover:text-slate-700">
                  {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="p-3 w-12 text-center">STT</th>
              <th className="p-3 w-24">Ngày</th>
              <th className="p-3 w-28">Số Phiếu</th>
              <th className="p-3 w-28">Loại</th>
              <th className="p-3">Người Nộp / Nhận & Nội Dung</th>
              <th className="p-3 w-28 text-center">Hình Thức</th>
              <th className="p-3 w-32 text-right">Số Tiền (đ)</th>
              <th className="p-3 w-20 text-center">In</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-600">Không tìm thấy phiếu nào phù hợp với bộ lọc hiện tại.</p>
                    {hasActiveFilter && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs"
                      >
                        Đặt lại tất cả bộ lọc
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((tx, idx) => {
                const isReceipt = tx.voucherType === 'UNION_RECEIPT';
                const isSelected = selectedIds.includes(tx.id);
                return (
                  <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-3 text-center">
                      <button onClick={() => onToggleSelectOne(tx.id)} className="text-slate-400 hover:text-slate-700">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-600">{tx.date}</td>
                    <td className="p-3 font-bold font-mono text-blue-700">{tx.voucherNo}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        isReceipt 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isReceipt ? 'Thu (C40)' : 'Chi (C41)'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{tx.personName}</span>
                        {tx.department && <span className="text-[10px] text-slate-400 font-normal">({tx.department})</span>}
                      </div>
                      <div className="text-slate-500 line-clamp-1 mt-0.5">{tx.reason}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        tx.paymentMethod === 'BANK'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {tx.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Tiền mặt'}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-mono font-bold text-sm ${isReceipt ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatNumber(tx.amount)}
                    </td>
                    <td className="p-3 text-center">
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
