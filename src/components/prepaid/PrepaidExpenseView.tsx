import React, { useState, useMemo } from 'react';
import { Client, NormalizedTransaction, PrepaidExpense } from '../../types/accounting';
import { db, logAuditEvent } from '../../services/storage';
import { 
  Calculator, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  Edit3, 
  Layers, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingDown,
  Building2,
  Sparkles,
  PieChart
} from 'lucide-react';
import { PageHeader, StatCard, SubTabNav, SearchBar, BaseModal, EmptyState, TabItem } from '../common';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import { 
  getCategoryLabel, 
  calculateMonthlyAllocation, 
  calculatePrepaidAllocationSchedule, 
  calculatePrepaidSummary, 
  generatePrepaidAllocationTransaction,
  exportPrepaidExpensesToExcel 
} from '../../services/prepaidExpenseService';

interface PrepaidExpenseViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
  prepaidExpenses?: PrepaidExpense[];
}

export const PrepaidExpenseView: React.FC<PrepaidExpenseViewProps> = ({
  activeClient,
  transactions,
  prepaidExpenses = [],
}) => {
  const currentYear = activeClient?.financialYear || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'LIST' | 'SCHEDULE' | 'AUTO_GEN'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrepaidExpense | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<PrepaidExpense>>({
    code: '',
    name: '',
    category: 'CCDC',
    originalAmount: 0,
    startDate: new Date().toISOString().slice(0, 10),
    allocationMonths: 12,
    expenseAccount: '6422',
    notes: '',
  });

  const [notification, setNotification] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Lọc theo từ khóa
  const filteredItems = useMemo(() => {
    return prepaidExpenses.filter(item => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.code.toLowerCase().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.expenseAccount.includes(term) ||
        getCategoryLabel(item.category).toLowerCase().includes(term)
      );
    });
  }, [prepaidExpenses, searchTerm]);

  // Thống kê tổng hợp
  const summary = useMemo(() => {
    return calculatePrepaidSummary(prepaidExpenses, selectedYear, selectedMonth);
  }, [prepaidExpenses, selectedYear, selectedMonth]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      code: `CCDC-${String(prepaidExpenses.length + 1).padStart(3, '0')}`,
      name: '',
      category: 'CCDC',
      originalAmount: 12000000,
      startDate: `${selectedYear}-01-01`,
      allocationMonths: 12,
      expenseAccount: '6422',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PrepaidExpense) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    if (!formData.code?.trim() || !formData.name?.trim() || !formData.originalAmount || formData.originalAmount <= 0) {
      setNotification({ message: 'Vui lòng nhập đầy đủ mã, tên CCDC và nguyên giá hợp lệ!', type: 'ERROR' });
      return;
    }

    try {
      const now = new Date().toISOString();
      const monthlyAmount = calculateMonthlyAllocation(formData.originalAmount, formData.allocationMonths || 12);

      if (editingItem) {
        const updated: PrepaidExpense = {
          ...editingItem,
          ...formData as PrepaidExpense,
          monthlyAmount,
          updatedAt: now,
        };
        await db.prepaidExpenses.put(updated);
        await logAuditEvent('EDIT_TX', 'Cập nhật CCDC TK 242', `Cập nhật CCDC ${updated.code} - ${updated.name}`, activeClient.id);
        setNotification({ message: `Đã cập nhật thành công CCDC ${updated.code}!`, type: 'SUCCESS' });
      } else {
        const newItem: PrepaidExpense = {
          id: `prepaid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          clientId: activeClient.id,
          code: formData.code!.trim(),
          name: formData.name!.trim(),
          category: formData.category || 'CCDC',
          originalAmount: Number(formData.originalAmount),
          startDate: formData.startDate || `${selectedYear}-01-01`,
          allocationMonths: Number(formData.allocationMonths) || 12,
          expenseAccount: formData.expenseAccount || '6422',
          monthlyAmount,
          notes: formData.notes || '',
          createdAt: now,
          updatedAt: now,
        };
        await db.prepaidExpenses.add(newItem);
        await logAuditEvent('EDIT_TX', 'Thêm mới CCDC TK 242', `Tạo mới CCDC ${newItem.code} - ${newItem.name} (${newItem.originalAmount.toLocaleString('vi-VN')} đ)`, activeClient.id);
        setNotification({ message: `Đã thêm mới CCDC ${newItem.code} vào sổ theo dõi 242!`, type: 'SUCCESS' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({ message: `Lỗi lưu dữ liệu: ${err.message}`, type: 'ERROR' });
    }
  };

  const handleDeleteItem = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa CCDC / Chi phí trả trước ${code} khỏi hệ thống?`)) return;
    try {
      await db.prepaidExpenses.delete(id);
      if (activeClient) {
        await logAuditEvent('EDIT_TX', 'Xóa CCDC TK 242', `Đã xóa CCDC mã ${code}`, activeClient.id);
      }
      setNotification({ message: `Đã xóa CCDC ${code} thành công!`, type: 'SUCCESS' });
    } catch (err: any) {
      setNotification({ message: `Lỗi xóa: ${err.message}`, type: 'ERROR' });
    }
  };

  // Tự động sinh bút toán phân bổ cho tháng đã chọn
  const handleAutoGenerateMonthlyTransactions = async () => {
    if (!activeClient) return;
    if (prepaidExpenses.length === 0) {
      setNotification({ message: 'Chưa có danh mục CCDC / Chi phí 242 nào để sinh bút toán!', type: 'ERROR' });
      return;
    }

    try {
      let createdCount = 0;
      for (const item of prepaidExpenses) {
        const schedules = calculatePrepaidAllocationSchedule(item, selectedYear, transactions);
        const currentSchedule = schedules.find(s => s.month === selectedMonth);

        // Nếu tháng này có số tiền phân bổ > 0 và chưa sinh bút toán
        if (currentSchedule && currentSchedule.amount > 0 && !currentSchedule.isAllocated) {
          const newTx = generatePrepaidAllocationTransaction(item, selectedMonth, selectedYear, activeClient.id);
          await db.transactions.add(newTx);
          createdCount++;
        }
      }

      if (createdCount > 0) {
        await logAuditEvent(
          'EDIT_TX',
          'Sinh bút toán phân bổ TK 242',
          `Đã sinh tự động ${createdCount} bút toán phân bổ chi phí trả trước Tháng ${selectedMonth}/${selectedYear}`,
          activeClient.id
        );
        setNotification({ 
          message: `Thành công! Đã tự động sinh ${createdCount} bút toán phân bổ (Nợ 642 / Có 242) cho Tháng ${selectedMonth}/${selectedYear}.`, 
          type: 'SUCCESS' 
        });
      } else {
        setNotification({ 
          message: `Các CCDC trong Tháng ${selectedMonth}/${selectedYear} đã được phân bổ đầy đủ từ trước. Không có bút toán mới nào cần sinh.`, 
          type: 'SUCCESS' 
        });
      }
    } catch (err: any) {
      setNotification({ message: `Lỗi sinh bút toán: ${err.message}`, type: 'ERROR' });
    }
  };

  const handleExportExcel = () => {
    if (prepaidExpenses.length === 0) {
      setNotification({ message: 'Không có dữ liệu để xuất Excel!', type: 'ERROR' });
      return;
    }
    exportPrepaidExpensesToExcel(prepaidExpenses, activeClient?.name || 'Doanh_Nghiep', selectedYear);
  };

  const tabs: TabItem<'LIST' | 'SCHEDULE' | 'AUTO_GEN'>[] = [
    { id: 'LIST', label: 'Danh Mục CCDC & Chi Phí 242', icon: Layers, count: prepaidExpenses.length },
    { id: 'SCHEDULE', label: 'Ma Trận Phân Bổ 12 Tháng', icon: Calendar },
    { id: 'AUTO_GEN', label: 'Tự Động Sinh Bút Toán Sổ Cái', icon: Sparkles },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        variant="gradient"
        icon={Calculator}
        title="Quản Lý & Phân Bổ Chi Phí Trả Trước (Tài Khoản 242)"
        subtitle={`Theo dõi công cụ dụng cụ, tiền thuê nhà/kho, phần mềm & tự động phân bổ hàng tháng chuẩn TT200${activeClient ? ` — ${activeClient.name}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel Bảng Phân Bổ</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm CCDC / Chi Phí 242</span>
            </button>
          </div>
        }
      />

      {notification && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border animate-fade-in ${
          notification.type === 'SUCCESS' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="TỔNG NGUYÊN GIÁ CCDC / 242"
          value={`${formatNumber(summary.totalOriginal)} đ`}
          subtext={`Tổng số: ${summary.itemCount} khoản chi phí`}
          variant="blue"
          icon={Layers}
        />
        <StatCard
          label="ĐÃ PHÂN BỔ LŨY KẾ"
          value={`${formatNumber(summary.totalAllocated)} đ`}
          subtext={`Tỷ lệ: ${summary.totalOriginal > 0 ? Math.round((summary.totalAllocated / summary.totalOriginal) * 100) : 0}% giá trị`}
          variant="emerald"
          icon={TrendingDown}
        />
        <StatCard
          label="GIÁ TRỊ CÒN LẠI CHƯA PHÂN BỔ"
          value={`${formatNumber(summary.totalRemaining)} đ`}
          subtext="Số dư Nợ cuối kỳ TK 242"
          variant="amber"
          icon={PieChart}
        />
        <StatCard
          label={`MỨC PHÂN BỔ THÁNG ${selectedMonth}/${selectedYear}`}
          value={`${formatNumber(summary.currentMonthAllocation)} đ`}
          subtext="Sẽ hạch toán Nợ 642 / Có 242"
          variant="purple"
          icon={Clock}
        />
      </div>

      {/* Sub Tab Navigation */}
      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: DANH MỤC CCDC & CHI PHÍ TRẢ TRƯỚC */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm theo mã CCDC, tên chi phí, TK..."
              className="w-72"
            />
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>Hiển thị: <strong className="text-slate-900 dark:text-slate-100">{filteredItems.length}</strong> / {prepaidExpenses.length} CCDC</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[950px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3 w-28">Mã CCDC</th>
                    <th className="p-3">Tên Chi Phí / Công Cụ</th>
                    <th className="p-3 w-36">Phân Loại</th>
                    <th className="p-3 w-24">Ngày Bắt Đầu</th>
                    <th className="p-3 text-center w-24">Thời Gian</th>
                    <th className="p-3 text-center w-20">TK Đích</th>
                    <th className="p-3 text-right w-32">Nguyên Giá (VND)</th>
                    <th className="p-3 text-right w-28">PB / Tháng</th>
                    <th className="p-3 w-32 text-center">Tiến Độ</th>
                    <th className="p-3 w-24 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredItems.map((item, index) => {
                    const schedules = calculatePrepaidAllocationSchedule(item, selectedYear, transactions);
                    const currentSchedule = schedules.find(s => s.month === selectedMonth);
                    const accumulated = currentSchedule ? currentSchedule.accumulatedAmount : 0;
                    const percent = item.originalAmount > 0 ? Math.min(100, Math.round((accumulated / item.originalAmount) * 100)) : 0;
                    const monthlyAmt = calculateMonthlyAllocation(item.originalAmount, item.allocationMonths);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">{item.code}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                          <div>{item.name}</div>
                          {item.notes && <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {getCategoryLabel(item.category)}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{item.startDate}</td>
                        <td className="p-3 text-center font-bold text-slate-700 dark:text-slate-300">{item.allocationMonths} tháng</td>
                        <td className="p-3 text-center font-mono font-extrabold text-brand-600 dark:text-brand-400">{item.expenseAccount}</td>
                        <td className="p-3 text-right font-extrabold tabular-num text-slate-900 dark:text-slate-100">{formatNumber(item.originalAmount)} đ</td>
                        <td className="p-3 text-right font-bold tabular-num text-purple-700 dark:text-purple-400">{formatNumber(monthlyAmt)} đ</td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{percent}%</span>
                              <span>{formatNumber(accumulated)} đ</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} 
                                style={{ width: `${percent}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                              title="Chỉnh sửa CCDC"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.code)}
                              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors"
                              title="Xóa CCDC"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-12">
                        <EmptyState
                          icon={Layers}
                          title="Chưa có danh mục Chi phí trả trước / CCDC"
                          description="Nhấn nút '+ Thêm CCDC / Chi Phí 242' ở góc trên để tạo mới hoặc bắt đầu theo dõi khấu hao phân bổ."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MA TRẬN LỊCH TRÌNH PHÂN BỔ 12 THÁNG */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span>Xem bảng phân bổ niên độ tài chính:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-slate-100 outline-none"
              >
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Đơn vị tính: <strong>Việt Nam Đồng (VND)</strong>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[1200px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-2.5 w-24 border-r border-slate-200 dark:border-slate-800">Mã CCDC</th>
                    <th className="p-2.5 border-r border-slate-200 dark:border-slate-800">Tên Chi Phí / CCDC</th>
                    <th className="p-2.5 text-right w-28 border-r border-slate-200 dark:border-slate-800">Nguyên Giá</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <th key={m} className="p-2 text-right w-20 border-r border-slate-200 dark:border-slate-800">T{m}</th>
                    ))}
                    <th className="p-2.5 text-right w-28 border-r border-slate-200 dark:border-slate-800">Tổng Năm</th>
                    <th className="p-2.5 text-right w-28">Còn Lại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {prepaidExpenses.map((item) => {
                    const schedules = calculatePrepaidAllocationSchedule(item, selectedYear, transactions);
                    const totalInYear = schedules.reduce((s, sch) => s + sch.amount, 0);
                    const remainingEndYear = schedules[11]?.remainingAmount || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800">{item.code}</td>
                        <td className="p-2.5 font-medium border-r border-slate-100 dark:border-slate-800">{item.name}</td>
                        <td className="p-2.5 text-right tabular-num font-bold border-r border-slate-100 dark:border-slate-800">{formatNumber(item.originalAmount)}</td>
                        {schedules.map(sch => (
                          <td 
                            key={sch.month} 
                            className={`p-2 text-right tabular-num border-r border-slate-100 dark:border-slate-800 ${
                              sch.amount > 0 ? 'font-bold text-purple-700 dark:text-purple-300 bg-purple-50/20 dark:bg-purple-950/10' : 'text-slate-300 dark:text-slate-600'
                            }`}
                          >
                            {sch.amount > 0 ? formatNumber(sch.amount) : '—'}
                          </td>
                        ))}
                        <td className="p-2.5 text-right tabular-num font-extrabold text-brand-600 dark:text-brand-400 border-r border-slate-100 dark:border-slate-800">{formatNumber(totalInYear)}</td>
                        <td className="p-2.5 text-right tabular-num font-extrabold text-amber-600 dark:text-amber-400">{formatNumber(remainingEndYear)}</td>
                      </tr>
                    );
                  })}
                  {prepaidExpenses.length === 0 && (
                    <tr>
                      <td colSpan={16} className="py-12 text-center text-slate-400">Chưa có dữ liệu phân bổ CCDC</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TỰ ĐỘNG SINH BÚT TOÁN PHÂN BỔ SỔ CÁI */}
      {activeTab === 'AUTO_GEN' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/30 rounded-2xl p-5 text-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Trình Sinh Bút Toán Hạch Toán Phân Bổ Định Kỳ (Nợ 642 / Có 242)</span>
                </h3>
                <p className="text-xs text-purple-200">
                  Hệ thống tự động tính số tiền trích phân bổ của từng CCDC và tạo chứng từ vào Sổ Nhật ký chung & Sổ cái.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                  <span>Kỳ hạch toán:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent font-bold text-amber-300 outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m} className="bg-slate-900 text-white">Tháng {m}/{selectedYear}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAutoGenerateMonthlyTransactions}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>1-Click Hạch Toán Tháng {selectedMonth}/{selectedYear}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Danh Sách Bút Toán Dự Kiến Sinh Trong Tháng {selectedMonth}/{selectedYear}
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Mã CCDC</th>
                    <th className="p-3">Nội Dung Bút Toán Hạch Toán</th>
                    <th className="p-3 font-mono text-center">TK Nợ</th>
                    <th className="p-3 font-mono text-center">TK Có</th>
                    <th className="p-3 text-right">Số Tiền Phân Bổ</th>
                    <th className="p-3 text-center">Trạng Thái Sổ Sách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {prepaidExpenses.map((item) => {
                    const schedules = calculatePrepaidAllocationSchedule(item, selectedYear, transactions);
                    const currentSchedule = schedules.find(s => s.month === selectedMonth);
                    const amount = currentSchedule?.amount || 0;
                    const isAllocated = currentSchedule?.isAllocated || false;

                    if (amount <= 0) return null;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">{item.code}</td>
                        <td className="p-3 font-medium">Phân bổ chi phí trả trước ({getCategoryLabel(item.category)}) T{selectedMonth}/{selectedYear} - {item.name}</td>
                        <td className="p-3 font-mono font-extrabold text-center text-brand-600 dark:text-brand-400">{item.expenseAccount}</td>
                        <td className="p-3 font-mono font-extrabold text-center text-amber-600 dark:text-amber-400">242</td>
                        <td className="p-3 text-right font-extrabold tabular-num text-purple-700 dark:text-purple-300">{formatNumber(amount)} đ</td>
                        <td className="p-3 text-center">
                          {isAllocated ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              ✓ ĐÃ HẠCH TOÁN
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              CHỜ HẠCH TOÁN
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA CCDC */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Chỉnh Sửa CCDC: ${editingItem.code}` : 'Thêm Mới CCDC / Chi Phí Trả Trước (TK 242)'}
        subtitle="Quản lý thời gian phân bổ và hạch toán tự động vào chi phí doanh nghiệp"
        icon={Calculator}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Mã CCDC / Chi Phí (*)</label>
              <input
                type="text"
                required
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="VD: CCDC-001, CP-THUE-VP"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Phân Loại Chi Phí</label>
              <select
                value={formData.category || 'CCDC'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="CCDC">Công cụ dụng cụ</option>
                <option value="RENT">Tiền thuê văn phòng / kho bãi</option>
                <option value="SOFTWARE">Phần mềm & Bản quyền</option>
                <option value="REPAIR">Sửa chữa lớn TSCĐ</option>
                <option value="INSURANCE">Bảo hiểm trả trước</option>
                <option value="OTHER">Chi phí trả trước khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tên Chi Phí / Tên CCDC (*)</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Bộ máy tính kế toán Dell Vostro, Tiền thuê văn phòng 12 tháng"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tổng Nguyên Giá (VND) (*)</label>
              <input
                type="number"
                required
                min={1000}
                value={formData.originalAmount || ''}
                onChange={(e) => setFormData({ ...formData, originalAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-right tabular-num"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Số Tháng Phân Bổ (*)</label>
              <input
                type="number"
                required
                min={1}
                max={36}
                value={formData.allocationMonths || 12}
                onChange={(e) => setFormData({ ...formData, allocationMonths: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none text-center"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">TK Chi Phí Đích</label>
              <select
                value={formData.expenseAccount || '6422'}
                onChange={(e) => setFormData({ ...formData, expenseAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="6422">6422 - Chi phí QLDN</option>
                <option value="641">641 - Chi phí Bán hàng</option>
                <option value="154">154 - Chi phí SXKD dở dang</option>
                <option value="627">627 - Chi phí Sản xuất chung</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Ngày Bắt Đầu Phân Bổ</label>
            <input
              type="date"
              value={formData.startDate || ''}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between">
            <span className="font-bold text-purple-900 dark:text-purple-300">Mức trích phân bổ ước tính hàng tháng:</span>
            <span className="text-sm font-black text-purple-700 dark:text-purple-400">
              {formatNumber(calculateMonthlyAllocation(Number(formData.originalAmount || 0), Number(formData.allocationMonths || 12)))} VNĐ / tháng
            </span>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Ghi Chú / Nơi Sử Dụng</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="VD: Phòng Kế Toán sử dụng, Hóa đơn số HD-00123"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold shadow-sm cursor-pointer transition-all active:scale-95"
            >
              {editingItem ? 'Lưu Thay Đổi' : 'Tạo CCDC Mới'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
