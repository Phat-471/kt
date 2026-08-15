import React, { useState, useMemo } from 'react';
import { Client, TradeUnionTransaction, TradeUnionCategory, TradeUnionVoucherType } from '../../types/accounting';
import { db, logAuditEvent } from '../../services/storage';
import { 
  Users, 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  Edit3, 
  Calendar, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Calculator,
  Coins,
  Building,
  HeartHandshake,
  Gift,
  Award,
  Landmark
} from 'lucide-react';
import { PageHeader, StatCard, SubTabNav, SearchBar, BaseModal, EmptyState, TabItem } from '../common';
import { formatNumber } from '../../utils/formatters';
import { 
  getTradeUnionCategoryLabel, 
  getTradeUnionAccounts,
  calculateTradeUnionContribution,
  calculateTradeUnionSummary,
  generateUnionVoucherHTML,
  exportUnionFinancialReportToExcel
} from '../../services/tradeUnionService';

interface TradeUnionViewProps {
  activeClient: Client | null;
  unionTransactions?: TradeUnionTransaction[];
}

export const TradeUnionView: React.FC<TradeUnionViewProps> = ({
  activeClient,
  unionTransactions = [],
}) => {
  const currentYear = activeClient?.financialYear || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<'JOURNAL' | 'BUDGET_ESTIMATE' | 'REPORT_B07'>('JOURNAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');

  // Modal Lập Phiếu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradeUnionTransaction | null>(null);
  const [modalType, setModalType] = useState<TradeUnionVoucherType>('UNION_RECEIPT');

  // Preview / Print Modal
  const [previewTx, setPreviewTx] = useState<TradeUnionTransaction | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<TradeUnionTransaction>>({
    voucherType: 'UNION_RECEIPT',
    voucherNo: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'KPCĐ_2_PERCENT',
    personName: '',
    department: 'Ban Chấp Hành CĐCS',
    reason: '',
    amount: 1000000,
    paymentMethod: 'CASH',
    attachedDocs: '01',
    notes: '',
  });

  // State cho công cụ tính nhanh KPCĐ 2%
  const [grossPayroll, setGrossPayroll] = useState<number>(100000000); // 100 triệu
  const [memberCount, setMemberCount] = useState<number>(15);
  const [avgSalary, setAvgSalary] = useState<number>(8000000);

  const [notification, setNotification] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Lọc danh sách giao dịch
  const filteredTransactions = useMemo(() => {
    return unionTransactions.filter(tx => {
      if (voucherFilter === 'RECEIPT' && tx.voucherType !== 'UNION_RECEIPT') return false;
      if (voucherFilter === 'PAYMENT' && tx.voucherType !== 'UNION_PAYMENT') return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        tx.voucherNo.toLowerCase().includes(term) ||
        tx.personName.toLowerCase().includes(term) ||
        tx.reason.toLowerCase().includes(term) ||
        getTradeUnionCategoryLabel(tx.category).toLowerCase().includes(term)
      );
    });
  }, [unionTransactions, searchTerm, voucherFilter]);

  // Thống kê tổng hợp
  const summary = useMemo(() => {
    return calculateTradeUnionSummary(unionTransactions);
  }, [unionTransactions]);

  // Tính toán KPCĐ dự toán
  const budgetCalc = useMemo(() => {
    return calculateTradeUnionContribution(grossPayroll, memberCount, avgSalary);
  }, [grossPayroll, memberCount, avgSalary]);

  const handleOpenCreateModal = (type: TradeUnionVoucherType) => {
    setEditingItem(null);
    setModalType(type);
    const prefix = type === 'UNION_RECEIPT' ? 'PT-CĐ' : 'PC-CĐ';
    const nextNum = unionTransactions.filter(t => t.voucherType === type).length + 1;
    
    setFormData({
      voucherType: type,
      voucherNo: `${prefix}-${selectedYear}-${String(nextNum).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      category: type === 'UNION_RECEIPT' ? 'KPCĐ_2_PERCENT' : 'THAM_HOI_OM_DAU',
      personName: type === 'UNION_RECEIPT' ? 'Đại diện Doanh nghiệp' : 'Đoàn viên công đoàn',
      department: 'Ban Chấp Hành CĐCS',
      reason: type === 'UNION_RECEIPT' ? 'Nộp kinh phí công đoàn 2% theo quỹ lương' : 'Chi thăm hỏi ốm đau đoàn viên',
      amount: type === 'UNION_RECEIPT' ? 2000000 : 500000,
      paymentMethod: 'CASH',
      attachedDocs: '01',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: TradeUnionTransaction) => {
    setEditingItem(tx);
    setModalType(tx.voucherType);
    setFormData({ ...tx });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    if (!formData.voucherNo?.trim() || !formData.personName?.trim() || !formData.amount || formData.amount <= 0) {
      setNotification({ message: 'Vui lòng điền đầy đủ số chứng từ, họ tên và số tiền hợp lệ!', type: 'ERROR' });
      return;
    }

    try {
      const now = new Date().toISOString();
      if (editingItem) {
        const updated: TradeUnionTransaction = {
          ...editingItem,
          ...formData as TradeUnionTransaction,
          voucherType: modalType,
          updatedAt: now,
        };
        await db.unionTransactions.put(updated);
        await logAuditEvent('EDIT_TX', 'Cập nhật Phiếu Công Đoàn', `Đã cập nhật ${updated.voucherNo} (${formatNumber(updated.amount)} đ)`, activeClient.id);
        setNotification({ message: `Đã cập nhật thành công chứng từ ${updated.voucherNo}!`, type: 'SUCCESS' });
      } else {
        const newItem: TradeUnionTransaction = {
          id: `union-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          clientId: activeClient.id,
          voucherType: modalType,
          voucherNo: formData.voucherNo!.trim(),
          date: formData.date || new Date().toISOString().slice(0, 10),
          category: formData.category || (modalType === 'UNION_RECEIPT' ? 'KPCĐ_2_PERCENT' : 'THAM_HOI_OM_DAU'),
          personName: formData.personName!.trim(),
          department: formData.department || 'Ban Chấp Hành CĐCS',
          reason: formData.reason || '',
          amount: Number(formData.amount),
          paymentMethod: formData.paymentMethod || 'CASH',
          attachedDocs: formData.attachedDocs || '01',
          notes: formData.notes || '',
          createdAt: now,
          updatedAt: now,
        };
        await db.unionTransactions.add(newItem);
        await logAuditEvent('EDIT_TX', 'Lập Phiếu Công Đoàn', `Tạo mới ${newItem.voucherNo} - ${newItem.reason} (${formatNumber(newItem.amount)} đ)`, activeClient.id);
        setNotification({ message: `Đã lưu thành công ${modalType === 'UNION_RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi'} ${newItem.voucherNo}!`, type: 'SUCCESS' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({ message: `Lỗi lưu chứng từ: ${err.message}`, type: 'ERROR' });
    }
  };

  const handleDeleteTransaction = async (id: string, voucherNo: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chứng từ công đoàn ${voucherNo}?`)) return;
    try {
      await db.unionTransactions.delete(id);
      if (activeClient) {
        await logAuditEvent('EDIT_TX', 'Xóa Chứng Từ Công Đoàn', `Đã xóa chứng từ ${voucherNo}`, activeClient.id);
      }
      setNotification({ message: `Đã xóa chứng từ ${voucherNo} thành công!`, type: 'SUCCESS' });
    } catch (err: any) {
      setNotification({ message: `Lỗi xóa: ${err.message}`, type: 'ERROR' });
    }
  };

  const handlePrintVoucher = (tx: TradeUnionTransaction) => {
    const html = generateUnionVoucherHTML(tx, activeClient);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  const handleExportExcel = () => {
    if (unionTransactions.length === 0) {
      setNotification({ message: 'Không có dữ liệu để xuất báo cáo Excel!', type: 'ERROR' });
      return;
    }
    exportUnionFinancialReportToExcel(unionTransactions, activeClient, selectedYear);
  };

  const handleQuickCreateBudgetReceipts = async () => {
    if (!activeClient) return;
    try {
      const now = new Date().toISOString();
      const dateStr = new Date().toISOString().slice(0, 10);
      
      // Tạo phiếu thu KPCĐ 2%
      const receipt1: TradeUnionTransaction = {
        id: `union-${Date.now()}-1`,
        clientId: activeClient.id,
        voucherType: 'UNION_RECEIPT',
        voucherNo: `PT-KPCĐ-${selectedYear}-${String(unionTransactions.length + 1).padStart(3, '0')}`,
        date: dateStr,
        category: 'KPCĐ_2_PERCENT',
        personName: 'Đại diện Doanh Nghiệp',
        department: 'Phòng Kế Toán / Nhân Sự',
        reason: `Trích nộp Kinh phí công đoàn 2% theo quỹ lương Tháng (${formatNumber(budgetCalc.payrollGrossInsurance)} đ)`,
        amount: budgetCalc.kpcdTotal,
        paymentMethod: 'BANK',
        attachedDocs: 'Bảng lương tháng',
        notes: `75% giữ lại CĐCS: ${formatNumber(budgetCalc.kpcdRetained)} đ; 25% nộp cấp trên: ${formatNumber(budgetCalc.kpcdPaySuperior)} đ`,
        createdAt: now,
        updatedAt: now,
      };

      // Tạo phiếu thu Đoàn phí 1% nếu có
      const receipt2: TradeUnionTransaction = {
        id: `union-${Date.now()}-2`,
        clientId: activeClient.id,
        voucherType: 'UNION_RECEIPT',
        voucherNo: `PT-ĐPCĐ-${selectedYear}-${String(unionTransactions.length + 2).padStart(3, '0')}`,
        date: dateStr,
        category: 'DOAN_PHI_1_PERCENT',
        personName: `Đại diện ${budgetCalc.unionMembersCount} đoàn viên công đoàn`,
        department: 'Ban Chấp Hành CĐCS',
        reason: `Thu đoàn phí công đoàn 1% tháng của ${budgetCalc.unionMembersCount} đoàn viên`,
        amount: budgetCalc.doanPhiTotal,
        paymentMethod: 'CASH',
        attachedDocs: 'Danh sách thu đoàn phí',
        notes: 'Đoàn phí 1% lương đoàn viên',
        createdAt: now,
        updatedAt: now,
      };

      await db.unionTransactions.bulkAdd([receipt1, receipt2]);
      await logAuditEvent('EDIT_TX', 'Sinh Phiếu Thu KPCĐ Tự Động', `Sinh 2 phiếu thu KPCĐ 2% (${formatNumber(budgetCalc.kpcdTotal)} đ) và Đoàn phí (${formatNumber(budgetCalc.doanPhiTotal)} đ)`, activeClient.id);
      
      setNotification({ 
        message: `Đã tự động tạo 2 phiếu thu KPCĐ (${formatNumber(budgetCalc.kpcdTotal)} đ) và Đoàn phí (${formatNumber(budgetCalc.doanPhiTotal)} đ) thành công!`, 
        type: 'SUCCESS' 
      });
      setActiveTab('JOURNAL');
    } catch (err: any) {
      setNotification({ message: `Lỗi tạo phiếu thu tự động: ${err.message}`, type: 'ERROR' });
    }
  };

  const tabs: TabItem<'JOURNAL' | 'BUDGET_ESTIMATE' | 'REPORT_B07'>[] = [
    { id: 'JOURNAL', label: 'Sổ Quỹ Thu - Chi Công Đoàn', icon: Wallet, count: unionTransactions.length },
    { id: 'BUDGET_ESTIMATE', label: 'Dự Toán KPCĐ (2%) & Đoàn Phí (1%)', icon: Calculator },
    { id: 'REPORT_B07', label: 'Quyết Toán Tài Chính CĐ (Mẫu B07-CĐ)', icon: FileSpreadsheet },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        variant="gradient"
        icon={Users}
        title="Kế Toán & Thu Chi Tài Chính Công Đoàn Cơ Sở"
        subtitle={`Quản lý kinh phí công đoàn 2%, đoàn phí 1%, lập & in phiếu thu C40-HD, phiếu chi C41-HD chuẩn Tổng LĐLĐ VN${activeClient ? ` — ${activeClient.name}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel B07-CĐ</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal('UNION_RECEIPT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lập Phiếu Thu (C40-HD)</span>
            </button>
            <button
              onClick={() => handleOpenCreateModal('UNION_PAYMENT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lập Phiếu Chi (C41-HD)</span>
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
          label="TỔNG THU QUỸ CÔNG ĐOÀN"
          value={`${formatNumber(summary.totalReceipts)} đ`}
          subtext={`${summary.receiptCount} phiếu thu (KPCĐ 2% & Đoàn phí)`}
          variant="emerald"
          icon={ArrowUpRight}
        />
        <StatCard
          label="TỔNG CHI HOẠT ĐỘNG CÔNG ĐOÀN"
          value={`${formatNumber(summary.totalPayments)} đ`}
          subtext={`${summary.paymentCount} phiếu chi (Thăm hỏi, quà tết, CĐ)`}
          variant="rose"
          icon={ArrowDownRight}
        />
        <StatCard
          label="SỐ DƯ QUỸ CÔNG ĐOÀN CÒN LẠI"
          value={`${formatNumber(summary.netBalance)} đ`}
          subtext={`TM: ${formatNumber(summary.cashBalance)} đ | TGNH: ${formatNumber(summary.bankBalance)} đ`}
          variant="blue"
          icon={Wallet}
        />
        <StatCard
          label="DỰ TOÁN KPCĐ 2% DOANH NGHIỆP"
          value={`${formatNumber(budgetCalc.kpcdTotal)} đ`}
          subtext={`Để lại CĐCS: ${formatNumber(budgetCalc.kpcdRetained)} đ (75%)`}
          variant="purple"
          icon={Landmark}
        />
      </div>

      {/* Sub Tab Navigation */}
      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: SỔ QUỸ THU - CHI CÔNG ĐOÀN */}
      {activeTab === 'JOURNAL' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm số phiếu, họ tên, lý do..."
                className="w-72"
              />
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setVoucherFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${voucherFilter === 'ALL' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                >
                  Tất cả ({unionTransactions.length})
                </button>
                <button
                  onClick={() => setVoucherFilter('RECEIPT')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${voucherFilter === 'RECEIPT' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600'}`}
                >
                  Phiếu Thu ({summary.receiptCount})
                </button>
                <button
                  onClick={() => setVoucherFilter('PAYMENT')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${voucherFilter === 'PAYMENT' ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-600'}`}
                >
                  Phiếu Chi ({summary.paymentCount})
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Hiển thị: <strong className="text-slate-900 dark:text-slate-100">{filteredTransactions.length}</strong> chứng từ
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[1000px] border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3 w-28">Loại Phiếu</th>
                    <th className="p-3 w-32">Số Chứng Từ</th>
                    <th className="p-3 w-24">Ngày Lập</th>
                    <th className="p-3">Khoản Mục Thu / Chi</th>
                    <th className="p-3">Người Nộp / Nhận</th>
                    <th className="p-3 text-center w-24">TK Hạch Toán</th>
                    <th className="p-3 text-right w-32">Số Tiền Thu</th>
                    <th className="p-3 text-right w-32">Số Tiền Chi</th>
                    <th className="p-3 text-center w-28">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTransactions.map((tx, index) => {
                    const isReceipt = tx.voucherType === 'UNION_RECEIPT';
                    const accs = getTradeUnionAccounts(tx.category, tx.voucherType, tx.paymentMethod);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                        <td className="p-3">
                          {isReceipt ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-max">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>Phiếu Thu</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1 w-max">
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              <span>Phiếu Chi</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-brand-600 dark:text-brand-400">{tx.voucherNo}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{tx.date}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{getTradeUnionCategoryLabel(tx.category)}</div>
                          <div className="text-[11px] text-slate-400">{tx.reason}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{tx.personName}</div>
                          {tx.department && <div className="text-[10px] text-slate-400">{tx.department}</div>}
                        </td>
                        <td className="p-3 text-center font-mono text-[11px]">
                          <span className="text-emerald-600 font-bold">N{accs.debitAcc}</span> / <span className="text-amber-600 font-bold">C{accs.creditAcc}</span>
                        </td>
                        <td className="p-3 text-right font-extrabold tabular-num text-emerald-600">
                          {isReceipt ? `${formatNumber(tx.amount)} đ` : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold tabular-num text-rose-600">
                          {!isReceipt ? `${formatNumber(tx.amount)} đ` : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintVoucher(tx)}
                              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg text-emerald-600 hover:text-emerald-800 transition-colors"
                              title="In Phiếu Thu / Chi A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                              title="Chỉnh sửa chứng từ"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(tx.id, tx.voucherNo)}
                              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors"
                              title="Xóa chứng từ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12">
                        <EmptyState
                          icon={Users}
                          title="Chưa có chứng từ Thu - Chi Công Đoàn"
                          description="Nhấn nút '+ Lập Phiếu Thu (C40-HD)' hoặc '+ Lập Phiếu Chi (C41-HD)' ở góc trên để tạo mới hoặc sử dụng tab Dự toán để sinh tự động."
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

      {/* TAB 2: DỰ TOÁN KPCĐ 2% & ĐOÀN PHÍ 1% */}
      {activeTab === 'BUDGET_ESTIMATE' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 rounded-2xl p-5 text-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-300" />
                  <span>Công Cụ Dự Toán & Tính Trích Nộp Kinh Phí Công Đoàn (2%) và Đoàn Phí (1%)</span>
                </h3>
                <p className="text-xs text-emerald-200">
                  Căn cứ Luật Công đoàn & Nghị định 191/2013/NĐ-CP: Doanh nghiệp đóng 2% trên quỹ lương BHXH; Công đoàn cơ sở được giữ lại 75% để chi tiêu hoạt động.
                </p>
              </div>

              <button
                onClick={handleQuickCreateBudgetReceipts}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
              >
                <Coins className="w-4 h-4 text-amber-200" />
                <span>1-Click Sinh 2 Phiếu Thu KPCĐ & Đoàn Phí</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">Tổng Quỹ Lương Đóng BHXH (VND)</label>
                <input
                  type="number"
                  step={1000000}
                  value={grossPayroll}
                  onChange={(e) => setGrossPayroll(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">Số Lượng Đoàn Viên Công Đoàn</label>
                <input
                  type="number"
                  min={0}
                  value={memberCount}
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 mb-1">Mức Lương Bình Quân Đoàn Viên (VND)</label>
                <input
                  type="number"
                  step={500000}
                  value={avgSalary}
                  onChange={(e) => setAvgSalary(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl font-bold text-white outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>1. TỔNG KPCĐ 2% (DN ĐÓNG)</span>
                <Building className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-lg font-black text-brand-600 dark:text-brand-400 tabular-num">
                {formatNumber(budgetCalc.kpcdTotal)} đ
              </div>
              <p className="text-[11px] text-slate-400">2% trên quỹ lương {formatNumber(grossPayroll)} đ</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                <span>2. CĐCS ĐƯỢC GIỮ LẠI (75%)</span>
                <HeartHandshake className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-num">
                {formatNumber(budgetCalc.kpcdRetained)} đ
              </div>
              <p className="text-[11px] text-slate-400">Ngân sách chăm lo tại doanh nghiệp</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-600 font-bold">
                <span>3. NỘP CĐ CẤP TRÊN (25%)</span>
                <Landmark className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-num">
                {formatNumber(budgetCalc.kpcdPaySuperior)} đ
              </div>
              <p className="text-[11px] text-slate-400">Nộp LĐLĐ quận/huyện quản lý</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-purple-600 font-bold">
                <span>4. ĐOÀN PHÍ 1% (ĐOÀN VIÊN)</span>
                <Coins className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400 tabular-num">
                {formatNumber(budgetCalc.doanPhiTotal)} đ
              </div>
              <p className="text-[11px] text-slate-400">{memberCount} đoàn viên x 1% lương</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BÁO CÁO QUYẾT TOÁN THU CHI TÀI CHÍNH CÔNG ĐOÀN (B07-CĐ) */}
      {activeTab === 'REPORT_B07' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="text-center space-y-1">
              <div className="text-xs font-bold uppercase text-slate-500">CÔNG ĐOÀN VIỆT NAM — {activeClient?.name || 'CÔNG ĐOÀN CƠ SỞ'}</div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase">
                BÁO CÁO QUYẾT TOÁN THU - CHI TÀI CHÍNH CÔNG ĐOÀN (MẪU SỐ B07-CĐ)
              </h3>
              <div className="text-xs italic text-slate-500">Niên độ tài chính năm {selectedYear}</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Nội Dung Chỉ Tiêu Quyết Toán</th>
                    <th className="p-3 text-right w-44">Số Tiền (VND)</th>
                    <th className="p-3 text-right w-32">Tỷ Trọng (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* PHẦN I: THU */}
                  <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-extrabold text-emerald-900 dark:text-emerald-200">
                    <td className="p-3">I. TỔNG CÁC KHOẢN THU TÀI CHÍNH CÔNG ĐOÀN</td>
                    <td className="p-3 text-right tabular-num">{formatNumber(summary.totalReceipts)} đ</td>
                    <td className="p-3 text-right">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">1. Kinh phí công đoàn 2% do DN trích nộp</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.receiptsByCategory['KPCĐ_2_PERCENT'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalReceipts > 0 ? ((summary.receiptsByCategory['KPCĐ_2_PERCENT'] || 0) / summary.totalReceipts * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">2. Đoàn phí công đoàn 1% do đoàn viên đóng</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.receiptsByCategory['DOAN_PHI_1_PERCENT'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalReceipts > 0 ? ((summary.receiptsByCategory['DOAN_PHI_1_PERCENT'] || 0) / summary.totalReceipts * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">3. Kinh phí CĐ cấp trên cấp về</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.receiptsByCategory['KINH_PHI_CAP_TREN'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalReceipts > 0 ? ((summary.receiptsByCategory['KINH_PHI_CAP_TREN'] || 0) / summary.totalReceipts * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">4. Hỗ trợ từ Doanh nghiệp & Tài trợ khác</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.receiptsByCategory['HO_TRO_KHAC'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalReceipts > 0 ? ((summary.receiptsByCategory['HO_TRO_KHAC'] || 0) / summary.totalReceipts * 100).toFixed(1) : 0}%</td>
                  </tr>

                  {/* PHẦN II: CHI */}
                  <tr className="bg-rose-50/50 dark:bg-rose-950/20 font-extrabold text-rose-900 dark:text-rose-200">
                    <td className="p-3">II. TỔNG CÁC KHOẢN CHI HOẠT ĐỘNG CÔNG ĐOÀN</td>
                    <td className="p-3 text-right tabular-num">{formatNumber(summary.totalPayments)} đ</td>
                    <td className="p-3 text-right">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">1. Chi thăm hỏi ốm đau, hiếu hỉ, thai sản, trợ cấp</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['THAM_HOI_OM_DAU'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['THAM_HOI_OM_DAU'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">2. Chi quà Tết, 8/3, 20/10, Trung thu, 1/6</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['QUA_LE_TET'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['QUA_LE_TET'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">3. Chi văn nghệ, thể thao, du lịch, phong trào</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['HOAT_DONG_PHONG_TRAO'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['HOAT_DONG_PHONG_TRAO'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">4. Chi khen thưởng đoàn viên xuất sắc</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['KHEN_THUONG'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['KHEN_THUONG'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">5. Chi nộp 25% KPCĐ lên Công đoàn cấp trên</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['NOP_CAP_TREN_25'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['NOP_CAP_TREN_25'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">6. Phụ cấp cán bộ công đoàn & quản lý CĐ</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['PHU_CAP_CAN_BO_CD'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['PHU_CAP_CAN_BO_CD'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8">7. Các khoản chi khác</td>
                    <td className="p-2.5 text-right tabular-num font-semibold">{formatNumber(summary.paymentsByCategory['CHI_KHAC'] || 0)} đ</td>
                    <td className="p-2.5 text-right text-slate-400">{summary.totalPayments > 0 ? ((summary.paymentsByCategory['CHI_KHAC'] || 0) / summary.totalPayments * 100).toFixed(1) : 0}%</td>
                  </tr>

                  {/* PHẦN III: SỐ DƯ */}
                  <tr className="bg-brand-50/50 dark:bg-brand-950/20 font-black text-brand-900 dark:text-brand-200">
                    <td className="p-3">III. SỐ DƯ QUỸ CÔNG ĐOÀN CÒN LẠI CUỐI KỲ (I - II)</td>
                    <td className="p-3 text-right tabular-num text-sm">{formatNumber(summary.netBalance)} đ</td>
                    <td className="p-3 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8 text-slate-600 dark:text-slate-400">  - Tiền mặt tại quỹ CĐ (TK 1111)</td>
                    <td className="p-2.5 text-right tabular-num">{formatNumber(summary.cashBalance)} đ</td>
                    <td className="p-2.5 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 pl-8 text-slate-600 dark:text-slate-400">  - Tiền gửi ngân hàng CĐ (TK 1121)</td>
                    <td className="p-2.5 text-right tabular-num">{formatNumber(summary.bankBalance)} đ</td>
                    <td className="p-2.5 text-right">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LẬP PHIẾU THU / PHIẾU CHI CÔNG ĐOÀN */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Chỉnh Sửa Chứng Từ: ${editingItem.voucherNo}` : modalType === 'UNION_RECEIPT' ? 'Lập Phiếu Thu Công Đoàn (Mẫu C40-HD)' : 'Lập Phiếu Chi Công Đoàn (Mẫu C41-HD)'}
        subtitle="Ban hành theo Quyết định số 1908/QĐ-TLĐ của Tổng Liên đoàn Lao động Việt Nam"
        icon={modalType === 'UNION_RECEIPT' ? ArrowUpRight : ArrowDownRight}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Số Chứng Từ (*)</label>
              <input
                type="text"
                required
                value={formData.voucherNo || ''}
                onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                placeholder="VD: PT-CĐ-2026-001"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Ngày Lập Chứng Từ (*)</label>
              <input
                type="date"
                required
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Khoản Mục Thu / Chi (*)</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TradeUnionCategory })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none"
              >
                {modalType === 'UNION_RECEIPT' ? (
                  <>
                    <option value="KPCĐ_2_PERCENT">Kinh phí công đoàn 2% (DN đóng)</option>
                    <option value="DOAN_PHI_1_PERCENT">Đoàn phí công đoàn 1% (Đoàn viên đóng)</option>
                    <option value="KINH_PHI_CAP_TREN">Kinh phí CĐ cấp trên cấp về</option>
                    <option value="HO_TRO_KHAC">Hỗ trợ từ Doanh nghiệp & Tài trợ</option>
                  </>
                ) : (
                  <>
                    <option value="THAM_HOI_OM_DAU">Chi thăm hỏi ốm đau, hiếu hỉ, thai sản</option>
                    <option value="QUA_LE_TET">Chi quà Tết, 8/3, 20/10, Trung thu, 1/6</option>
                    <option value="HOAT_DONG_PHONG_TRAO">Chi văn nghệ, thể thao, hội thao, du lịch</option>
                    <option value="KHEN_THUONG">Chi khen thưởng đoàn viên xuất sắc</option>
                    <option value="NOP_CAP_TREN_25">Nộp 25% KPCĐ lên Công đoàn cấp trên</option>
                    <option value="PHU_CAP_CAN_BO_CD">Phụ cấp cán bộ công đoàn & quản lý CĐ</option>
                    <option value="CHI_KHAC">Khoản chi công đoàn khác</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Hình Thức Thanh Toán</label>
              <select
                value={formData.paymentMethod || 'CASH'}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="CASH">Tiền mặt tại quỹ (TK 1111)</option>
                <option value="BANK">Chuyển khoản Ngân hàng (TK 1121)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                {modalType === 'UNION_RECEIPT' ? 'Họ và tên người nộp (*)' : 'Họ và tên người nhận (*)'}
              </label>
              <input
                type="text"
                required
                value={formData.personName || ''}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                placeholder="VD: Nguyễn Văn An, Đại diện Công ty"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bộ Phận / Tổ Công Đoàn</label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="VD: Tổ CĐ Văn Phòng, Phòng Kế Toán"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Lý Do Thu / Chi (*)</label>
            <input
              type="text"
              required
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="VD: Chi tiền thăm hỏi thai sản chị Nguyễn Thị Mai, Chi quà tết Nguyên Đán..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Số Tiền (VND) (*)</label>
              <input
                type="number"
                required
                min={1000}
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 text-right tabular-num text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Số Chứng Từ Gốc Kèm Theo</label>
              <input
                type="text"
                value={formData.attachedDocs || '01'}
                onChange={(e) => setFormData({ ...formData, attachedDocs: e.target.value })}
                placeholder="VD: 01, Hóa đơn VAT, Giấy viện phí..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Ghi Chú</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ghi chú thêm về quyết định phê duyệt hoặc danh sách người nhận..."
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
              className={`px-5 py-2 text-white rounded-xl font-extrabold shadow-sm cursor-pointer transition-all active:scale-95 ${
                modalType === 'UNION_RECEIPT' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {editingItem ? 'Lưu Thay Đổi' : modalType === 'UNION_RECEIPT' ? 'Tạo Phiếu Thu C40-HD' : 'Tạo Phiếu Chi C41-HD'}
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};
