import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Client, 
  TradeUnionTransaction, 
  TradeUnionVoucherType,
  TradeUnionContributionPeriod,
  TradeUnionEventGiftList,
  TradeUnionSettlementB07Report
} from '../../types/accounting';
import { db, logAuditEvent } from '../../services/storage';
import { 
  Users, 
  Plus, 
  Upload, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  Coins,
  Gift,
  Landmark,
  Wallet,
  Receipt,
  Calculator,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { PageHeader, StatCard, SubTabNav, BaseModal, TabItem } from '../common';
import { formatNumber } from '../../utils/formatters';
import { 
  calculateTradeUnionContribution,
  calculateTradeUnionSummary,
  generateUnionVoucherHTML,
  generateBatchUnionVouchersHTML,
  generateSettlementB07HTML,
  generateCashBookHTML,
  generateBankBookHTML,
  exportUnionFinancialReportToExcel,
  detectAndParseUnionExcel,
  syncContributionPeriodToTransactions,
  syncEventGiftToTransaction,
  computeSettlementReportB07
} from '../../services/tradeUnionService';

// Import 6 Module Tách Biệt Rõ Ràng
import { ContributionFeeTab } from './ContributionFeeTab';
import { EventGiftsTab } from './EventGiftsTab';
import { VouchersTab } from './VouchersTab';
import { CashAndBankBooksTab } from './CashAndBankBooksTab';
import { SettlementB07Tab } from './SettlementB07Tab';
import { UnionCalculatorTab } from './UnionCalculatorTab';

interface TradeUnionViewProps {
  activeClient: Client | null;
  unionTransactions?: TradeUnionTransaction[];
}

export type TradeUnionFeatureTab = 
  | 'CONTRIBUTIONS'  // 1. Bảng Trích Nộp KPCĐ & Đoàn Phí
  | 'EVENT_GIFTS'    // 2. Danh Sách Chi Quà Lễ Tết
  | 'VOUCHERS'       // 3. Lập & In Phiếu Thu/Chi (C40/C41)
  | 'CASH_BOOKS'     // 4. Sổ Quỹ Tiền Mặt & Sổ Tiền Gửi NH
  | 'SETTLEMENT_B07' // 5. Báo Cáo Quyết Toán B07-TLĐ
  | 'CALCULATOR';    // 6. Dự Toán & Cấu Hình Tỷ Lệ

export const TradeUnionView: React.FC<TradeUnionViewProps> = ({
  activeClient,
  unionTransactions = [],
}) => {
  const currentYear = activeClient?.financialYear || new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<TradeUnionFeatureTab>('CONTRIBUTIONS');

  // Truy vấn trực tiếp từ Dexie để bảo đảm dữ liệu luôn cập nhật tức thì (Reactive Realtime)
  const liveDbTransactions = useLiveQuery(
    () => {
      if (activeClient?.id) {
        return db.unionTransactions
          .filter(t => !t.clientId || t.clientId === activeClient.id || t.clientId === 'default-client')
          .toArray();
      }
      return db.unionTransactions.toArray();
    },
    [activeClient?.id]
  ) || [];

  // Kết hợp transactions từ props và trực tiếp từ DB
  const allTransactions = useMemo(() => {
    if (unionTransactions && unionTransactions.length > 0) return unionTransactions;
    return liveDbTransactions;
  }, [unionTransactions, liveDbTransactions]);

  // Checkbox chọn hàng loạt
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // State cho Bảng Trích Nộp (Tính năng 1)
  const [contributionPeriods, setContributionPeriods] = useState<TradeUnionContributionPeriod[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');

  // State cho Quà Lễ Tết (Tính năng 2)
  const [eventGifts, setEventGifts] = useState<TradeUnionEventGiftList[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string>('');

  // Modal Lập / Sửa Phiếu Đơn (Tính năng 3)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradeUnionTransaction | null>(null);
  const [modalType, setModalType] = useState<TradeUnionVoucherType>('UNION_RECEIPT');

  // Modal Import Excel Thông Minh
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    type: string;
    message: string;
    transactions: TradeUnionTransaction[];
    periods?: TradeUnionContributionPeriod[];
    eventGifts?: TradeUnionEventGiftList[];
    settlementReports?: TradeUnionSettlementB07Report[];
  } | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State cho tạo phiếu đơn
  const [formData, setFormData] = useState<Partial<TradeUnionTransaction>>({
    voucherType: 'UNION_RECEIPT',
    voucherNo: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'DOAN_PHI_1_PERCENT',
    personName: '',
    department: 'Ban Chấp Hành CĐCS',
    reason: '',
    amount: 1000000,
    paymentMethod: 'CASH',
    attachedDocs: '01',
    notes: '',
  });

  // State cho công cụ tính nhanh KPCĐ 2% & Đoàn phí
  const [grossPayroll, setGrossPayroll] = useState<number>(100000000);
  const [memberCount, setMemberCount] = useState<number>(15);
  const [avgSalary, setAvgSalary] = useState<number>(6000000);
  const [doanPhiRate, setDoanPhiRate] = useState<number>(0.005); // 0.5% hoặc 1%
  const [kpcdRetainedRate, setKpcdRetainedRate] = useState<number>(0.75); // 75%
  const [doanPhiRetainedRate, setDoanPhiRetainedRate] = useState<number>(0.70); // 70%

  // Lọc Theo Tháng
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'CASH' | 'BANK'>('ALL');
  const [notification, setNotification] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Lọc danh sách giao dịch
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (voucherFilter === 'RECEIPT' && tx.voucherType !== 'UNION_RECEIPT') return false;
      if (voucherFilter === 'PAYMENT' && tx.voucherType !== 'UNION_PAYMENT') return false;
      if (paymentMethodFilter === 'CASH' && tx.paymentMethod !== 'CASH') return false;
      if (paymentMethodFilter === 'BANK' && tx.paymentMethod !== 'BANK') return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        tx.voucherNo.toLowerCase().includes(term) ||
        tx.personName.toLowerCase().includes(term) ||
        tx.reason.toLowerCase().includes(term)
      );
    });
  }, [allTransactions, searchTerm, voucherFilter, paymentMethodFilter]);

  // Thống kê tổng hợp
  const summary = useMemo(() => {
    return calculateTradeUnionSummary(allTransactions);
  }, [allTransactions]);

  // Báo cáo Quyết toán B07-TLĐ
  const reportB07 = useMemo(() => {
    return computeSettlementReportB07(allTransactions, activeClient, selectedYear);
  }, [allTransactions, activeClient, selectedYear]);

  // Tính toán KPCĐ dự toán
  const budgetCalc = useMemo(() => {
    return calculateTradeUnionContribution(
      grossPayroll, 
      memberCount, 
      avgSalary, 
      doanPhiRate, 
      kpcdRetainedRate, 
      doanPhiRetainedRate
    );
  }, [grossPayroll, memberCount, avgSalary, doanPhiRate, kpcdRetainedRate, doanPhiRetainedRate]);

  // Chọn / bỏ chọn tất cả
  const isAllSelected = filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Mở modal tạo phiếu mới
  const handleOpenAddModal = (type: TradeUnionVoucherType) => {
    setModalType(type);
    setEditingItem(null);
    const dateStr = new Date().toISOString().slice(0, 10);
    const prefix = type === 'UNION_RECEIPT' ? 'PT' : 'PC';
    const nextSeq = allTransactions.filter(t => t.voucherType === type).length + 1;
    const defaultVoucherNo = `${prefix}${selectedYear}/${String(nextSeq).padStart(2, '0')}`;

    setFormData({
      voucherType: type,
      voucherNo: defaultVoucherNo,
      date: dateStr,
      category: type === 'UNION_RECEIPT' ? 'DOAN_PHI_1_PERCENT' : 'THAM_HOI_OM_DAU',
      personName: '',
      department: 'Ban Chấp Hành CĐCS',
      reason: type === 'UNION_RECEIPT' ? 'Thu đoàn phí công đoàn' : 'Chi chăm lo, thăm hỏi đoàn viên',
      amount: 500000,
      paymentMethod: 'CASH',
      attachedDocs: '01',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Lưu tạo mới / cập nhật phiếu
  const handleSaveTransaction = async () => {
    if (!formData.personName || !formData.reason || !formData.amount || formData.amount <= 0) {
      setNotification({ message: 'Vui lòng điền đầy đủ họ tên, lý do và số tiền hợp lệ!', type: 'ERROR' });
      return;
    }

    try {
      const now = new Date().toISOString();
      const clientId = activeClient?.id || 'default-client';

      if (editingItem) {
        const updatedItem: TradeUnionTransaction = {
          ...editingItem,
          ...formData as TradeUnionTransaction,
          updatedAt: now,
        };
        await db.unionTransactions.put(updatedItem);
        await logAuditEvent('EDIT_TX', 'Sửa chứng từ công đoàn', `Đã cập nhật ${updatedItem.voucherNo} - ${updatedItem.reason}`, clientId);
        setNotification({ message: `Cập nhật thành công chứng từ ${updatedItem.voucherNo}`, type: 'SUCCESS' });
      } else {
        const newItem: TradeUnionTransaction = {
          id: `union-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          clientId,
          voucherType: modalType,
          voucherNo: formData.voucherNo || `${modalType === 'UNION_RECEIPT' ? 'PT' : 'PC'}${selectedYear}/01`,
          date: formData.date || new Date().toISOString().slice(0, 10),
          category: formData.category || (modalType === 'UNION_RECEIPT' ? 'DOAN_PHI_1_PERCENT' : 'THAM_HOI_OM_DAU'),
          personName: formData.personName || '',
          department: formData.department || 'CĐCS',
          reason: formData.reason || '',
          amount: formData.amount || 0,
          paymentMethod: formData.paymentMethod || 'CASH',
          attachedDocs: formData.attachedDocs || '01',
          notes: formData.notes || '',
          createdAt: now,
          updatedAt: now,
        };
        await db.unionTransactions.add(newItem);
        await logAuditEvent('APPROVE_TX', 'Tạo chứng từ công đoàn', `Đã tạo ${newItem.voucherNo} số tiền ${newItem.amount.toLocaleString('vi-VN')} đ`, clientId);
        setNotification({ message: `Đã tạo thành công chứng từ ${newItem.voucherNo}`, type: 'SUCCESS' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setNotification({ message: `Lỗi khi lưu: ${err?.message || 'Không xác định'}`, type: 'ERROR' });
    }
  };

  // In đơn lẻ 1 phiếu
  const handlePrintSingleVoucher = (tx: TradeUnionTransaction) => {
    const html = generateUnionVoucherHTML(tx, activeClient);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // In hàng loạt các phiếu đã chọn
  const handlePrintBatchSelected = () => {
    const itemsToPrint = allTransactions.filter(t => selectedIds.includes(t.id));
    if (itemsToPrint.length === 0) {
      setNotification({ message: 'Vui lòng chọn ít nhất một chứng từ để in!', type: 'ERROR' });
      return;
    }
    const html = generateBatchUnionVouchersHTML(itemsToPrint, activeClient);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // In Sổ Quỹ Tiền Mặt (S11H / S12-H)
  const handlePrintCashBook = () => {
    const html = generateCashBookHTML(allTransactions, activeClient, selectedYear);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // In Sổ Tiền Gửi Ngân Hàng (S12-H)
  const handlePrintBankBook = () => {
    const html = generateBankBookHTML(allTransactions, activeClient, selectedYear);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // In Toàn Bộ Phiếu Của Tháng Đang Chọn
  const handlePrintMonth = (month: number | 'ALL') => {
    let itemsToPrint = allTransactions;
    if (month !== 'ALL') {
      itemsToPrint = allTransactions.filter(t => {
        const d = new Date(t.date);
        return (!isNaN(d.getMonth()) ? d.getMonth() + 1 : 1) === month;
      });
    }

    if (itemsToPrint.length === 0) {
      setNotification({ message: `Không có chứng từ nào ${month === 'ALL' ? 'trong năm' : `trong Tháng ${month}`} để in!`, type: 'ERROR' });
      return;
    }

    const html = generateBatchUnionVouchersHTML(itemsToPrint, activeClient);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} chứng từ đã chọn?`)) return;
    try {
      await db.unionTransactions.bulkDelete(selectedIds);
      setSelectedIds([]);
      setNotification({ message: `Đã xóa thành công ${selectedIds.length} chứng từ!`, type: 'SUCCESS' });
    } catch (err: any) {
      setNotification({ message: `Lỗi khi xóa: ${err?.message}`, type: 'ERROR' });
    }
  };

  // In Báo Cáo Quyết Toán B07-TLĐ
  const handlePrintB07Report = () => {
    const html = generateSettlementB07HTML(reportB07, activeClient);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  // Xử lý Import Excel Thông Minh (Tự động nhận diện cả 3 file)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (!buffer) return;

      try {
        const detected = detectAndParseUnionExcel(buffer, file.name, activeClient?.id || 'default-client');
        let message = '';
        if (detected.type === 'CONTRIBUTION_FILE') {
          message = `Đã nhận diện file Trích Nộp & Quà Lễ Tết (${detected.periods?.length || 0} kỳ trích nộp, ${detected.eventGifts?.length || 0} đợt quà lễ tết)`;
          if (detected.periods && detected.periods.length > 0) {
            setContributionPeriods(detected.periods);
            setSelectedPeriodKey(detected.periods[0].periodKey);
            setActiveTab('CONTRIBUTIONS');
          }
          if (detected.eventGifts && detected.eventGifts.length > 0) {
            setEventGifts(detected.eventGifts);
            setSelectedEventKey(detected.eventGifts[0].eventKey);
          }
        } else if (detected.type === 'SETTLEMENT_MASTER_FILE') {
          message = `Đã nhận diện File Sổ Sách & Báo Cáo Gốc (${detected.transactions.length} dòng phát sinh Sổ TM / Sổ NH, ${detected.settlementReports?.length || 0} kỳ quyết toán)`;
          setActiveTab('CASH_BOOKS');
        } else if (detected.type === 'VOUCHERS_JOURNAL_FILE') {
          message = `Đã nhận diện File Thu Chi (${detected.transactions.length} chứng từ từ DATA Thu & DATAchi)`;
          setActiveTab('VOUCHERS');
        } else {
          message = `Đã đọc ${detected.transactions.length} chứng từ từ file Excel`;
        }

        setImportResult({
          type: detected.type,
          message,
          transactions: detected.transactions,
          periods: detected.periods,
          eventGifts: detected.eventGifts,
          settlementReports: detected.settlementReports,
        });
        setIsImportModalOpen(true);
      } catch (err: any) {
        setNotification({ message: `Lỗi đọc file Excel: ${err?.message || 'Định dạng không hợp lệ'}`, type: 'ERROR' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Xác nhận lưu dữ liệu đã import vào Dexie DB
  const handleConfirmImport = async () => {
    if (!importResult) return;
    try {
      if (importResult.transactions && importResult.transactions.length > 0) {
        await db.unionTransactions.bulkAdd(importResult.transactions);
      }
      setIsImportModalOpen(false);
      setNotification({ message: `Đã nạp thành công dữ liệu từ file ${importFileName} vào hệ thống!`, type: 'SUCCESS' });
    } catch (err: any) {
      setNotification({ message: `Lỗi lưu dữ liệu: ${err?.message}`, type: 'ERROR' });
    }
  };

  // 1-Click Duyệt Bảng Trích Nộp & Đồng bộ sang Sổ Quỹ TM / Sổ NH
  const handleSyncPeriodToCashBook = async (period: TradeUnionContributionPeriod) => {
    try {
      const txs = syncContributionPeriodToTransactions(period, activeClient?.id || 'default-client');
      if (txs.length > 0) {
        await db.unionTransactions.bulkAdd(txs);
        setNotification({ 
          message: `Đã duyệt & sinh ${txs.length} chứng từ (Thu đoàn phí & Nộp cấp trên) từ ${period.periodLabel} vào Sổ Quỹ TM & NH!`, 
          type: 'SUCCESS' 
        });
      }
    } catch (err: any) {
      setNotification({ message: `Lỗi đồng bộ: ${err?.message}`, type: 'ERROR' });
    }
  };

  // 1-Click Duyệt Chi Quà Lễ Tết & Đồng bộ sang Sổ Quỹ TM
  const handleSyncEventGiftToCashBook = async (gift: TradeUnionEventGiftList) => {
    try {
      const tx = syncEventGiftToTransaction(gift, activeClient?.id || 'default-client');
      await db.unionTransactions.add(tx);
      setNotification({ 
        message: `Đã duyệt & sinh Phiếu Chi Quà ${gift.eventName} (${gift.totalAmount.toLocaleString('vi-VN')} đ) vào Sổ Quỹ Tiền Mặt!`, 
        type: 'SUCCESS' 
      });
    } catch (err: any) {
      setNotification({ message: `Lỗi đồng bộ: ${err?.message}`, type: 'ERROR' });
    }
  };

  // 6 Phân Hệ Tách Biệt Rõ Ràng
  const navTabs: TabItem[] = [
    { id: 'CONTRIBUTIONS', label: '1. Bảng Trích Nộp (KPCĐ 2% & Đoàn Phí)', icon: Coins },
    { id: 'EVENT_GIFTS', label: '2. Danh Sách Quà Lễ Tết', icon: Gift },
    { id: 'VOUCHERS', label: '3. Phiếu Thu / Chi (C40/C41)', icon: Receipt },
    { id: 'CASH_BOOKS', label: '4. Sổ Quỹ Tiền Mặt & Sổ NH', icon: Wallet },
    { id: 'SETTLEMENT_B07', label: '5. Quyết Toán B07-TLĐ', icon: Landmark },
    { id: 'CALCULATOR', label: '6. Dự Toán & Cấu Hình Tỷ Lệ', icon: Calculator },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Chuyên Biệt Cho Ứng Dụng Công Đoàn */}
      <PageHeader
        title="Ứng Dụng Kế Toán Công Đoàn Cơ Sở"
        badgeText="Chuẩn Mẫu C40/C41 & B07-TLĐ"
        subtitle={`Quản lý độc lập từng tính năng: Trích nộp 2% KPCĐ, Đoàn phí 0.5%/1%, Quà Lễ Tết, Sổ Quỹ TM (S11H), Sổ NH (S12-H) & Báo cáo quyết toán B07-TLĐ${activeClient ? ` — ${activeClient.name}` : ''}`}
        icon={Users}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileUpload} 
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium transition-all shadow-sm"
              title="Nhận diện tự động cả 3 file: Phi cong doan, BAO CAO QUYET TOAN, Thu chi"
            >
              <Upload className="w-4 h-4" />
              <span>Nạp File Excel</span>
            </button>

            <button
              onClick={() => exportUnionFinancialReportToExcel(allTransactions, activeClient, selectedYear)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Xuất Excel Đa Sheet</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('UNION_RECEIPT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Phiếu Thu (C40)</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('UNION_PAYMENT')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Phiếu Chi (C41)</span>
            </button>
          </div>
        }
      />

      {/* Thông báo Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-sm ${
          notification.type === 'SUCCESS' ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white text-xs">Đóng</button>
        </div>
      )}

      {/* 4 Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng Thu Quỹ CĐ"
          value={`${formatNumber(summary.totalReceipts)} đ`}
          subtext={`${summary.receiptCount} phiếu thu (Đoàn phí & KPCĐ)`}
          icon={ArrowUpRight}
          variant="emerald"
        />
        <StatCard
          label="Tổng Chi Hoạt Động"
          value={`${formatNumber(summary.totalPayments)} đ`}
          subtext={`${summary.paymentCount} phiếu chi (Quà, thăm hỏi, nộp cấp trên)`}
          icon={ArrowDownRight}
          variant="rose"
        />
        <StatCard
          label="Tồn Quỹ Tiền Mặt (TK 1111)"
          value={`${formatNumber(summary.cashBalance)} đ`}
          subtext="Sổ quỹ tiền mặt (Mẫu S11H / S12-H)"
          icon={Coins}
          variant="amber"
        />
        <StatCard
          label="Tồn Tiền Gửi NH (TK 1121)"
          value={`${formatNumber(summary.bankBalance)} đ`}
          subtext="Sổ tiền gửi ngân hàng (Mẫu S12-H)"
          icon={Landmark}
          variant="cyan"
        />
      </div>

      {/* Sub Tabs Navigation: Tách Riêng Từng Tính Năng Rõ Ràng */}
      <SubTabNav
        tabs={navTabs}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* TÍNH NĂNG 1: BẢNG TRÍCH NỘP */}
      {activeTab === 'CONTRIBUTIONS' && (
        <ContributionFeeTab
          periods={contributionPeriods}
          selectedPeriodKey={selectedPeriodKey}
          onSelectPeriodKey={setSelectedPeriodKey}
          onSavePeriod={(p) => {
            setContributionPeriods(prev => {
              const idx = prev.findIndex(item => item.periodKey === p.periodKey);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = p;
                return copy;
              }
              return [...prev, p];
            });
          }}
          onSyncPeriod={handleSyncPeriodToCashBook}
          onUploadClick={() => fileInputRef.current?.click()}
          employees={[]}
          activeClient={activeClient}
          selectedYear={selectedYear}
        />
      )}

      {/* TÍNH NĂNG 2: DANH SÁCH QUÀ LỄ TẾT */}
      {activeTab === 'EVENT_GIFTS' && (
        <EventGiftsTab
          eventGifts={eventGifts}
          selectedEventKey={selectedEventKey}
          onSelectEventKey={setSelectedEventKey}
          onSyncGift={handleSyncEventGiftToCashBook}
        />
      )}

      {/* TÍNH NĂNG 3: LẬP & IN PHIẾU THU CHI */}
      {activeTab === 'VOUCHERS' && (
        <VouchersTab
          transactions={allTransactions}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          voucherFilter={voucherFilter}
          onVoucherFilterChange={setVoucherFilter}
          selectedIds={selectedIds}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectOne={toggleSelectOne}
          onOpenAddModal={handleOpenAddModal}
          onPrintSingle={handlePrintSingleVoucher}
          onPrintBatchSelected={handlePrintBatchSelected}
          onPrintMonth={handlePrintMonth}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      {/* TÍNH NĂNG 4: SỔ QUỸ TIỀN MẶT & SỔ NGÂN HÀNG */}
      {activeTab === 'CASH_BOOKS' && (
        <CashAndBankBooksTab
          transactions={allTransactions}
          onPrintCashBook={handlePrintCashBook}
          onPrintBankBook={handlePrintBankBook}
        />
      )}

      {/* TÍNH NĂNG 5: BÁO CÁO QUYẾT TOÁN B07-TLĐ */}
      {activeTab === 'SETTLEMENT_B07' && (
        <SettlementB07Tab
          report={reportB07}
          onPrintReport={handlePrintB07Report}
        />
      )}

      {/* TÍNH NĂNG 6: DỰ TOÁN & CẤU HÌNH TỶ LỆ */}
      {activeTab === 'CALCULATOR' && (
        <UnionCalculatorTab
          grossPayroll={grossPayroll}
          onGrossPayrollChange={setGrossPayroll}
          memberCount={memberCount}
          onMemberCountChange={setMemberCount}
          avgSalary={avgSalary}
          onAvgSalaryChange={setAvgSalary}
          doanPhiRate={doanPhiRate}
          onDoanPhiRateChange={setDoanPhiRate}
          doanPhiRetainedRate={doanPhiRetainedRate}
          onDoanPhiRetainedRateChange={setDoanPhiRetainedRate}
          budgetCalc={budgetCalc}
        />
      )}

      {/* Modal Lập / Sửa Phiếu Đơn */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Chỉnh Sửa Chứng Từ: ${editingItem.voucherNo}` : modalType === 'UNION_RECEIPT' ? 'Lập Phiếu Thu Công Đoàn (Mẫu C40-BB)' : 'Lập Phiếu Chi Công Đoàn (Mẫu C41-BB)'}
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Số Chứng Từ (*)</label>
              <input
                type="text"
                value={formData.voucherNo || ''}
                onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Ngày Lập (*)</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Khoản Mục Công Đoàn (*)</label>
            <select
              value={formData.category || 'DOAN_PHI_1_PERCENT'}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
            >
              {modalType === 'UNION_RECEIPT' ? (
                <>
                  <option value="DOAN_PHI_1_PERCENT">Đoàn phí công đoàn (Đoàn viên đóng)</option>
                  <option value="KPCĐ_2_PERCENT">Kinh phí công đoàn 2% (DN trích nộp)</option>
                  <option value="KINH_PHI_CAP_TREN">Kinh phí CĐ cấp trên cấp về</option>
                  <option value="HO_TRO_KHAC">Hỗ trợ từ Doanh nghiệp & Tài trợ</option>
                </>
              ) : (
                <>
                  <option value="THAM_HOI_OM_DAU">Chi thăm hỏi ốm đau, hiếu hỉ, thai sản, sinh nhật</option>
                  <option value="QUA_LE_TET">Chi quà Tết, 8/3, 20/10, Trung thu, 2/9, 30/4</option>
                  <option value="HOAT_DONG_PHONG_TRAO">Chi văn nghệ, thể thao, hội thao, du lịch</option>
                  <option value="KHEN_THUONG">Chi khen thưởng đoàn viên xuất sắc</option>
                  <option value="NOP_CAP_TREN_25">Nộp KPCĐ/Đoàn phí lên Công đoàn cấp trên</option>
                  <option value="PHU_CAP_CAN_BO_CD">Phụ cấp cán bộ công đoàn & quản lý CĐ</option>
                  <option value="CHI_KHAC">Khoản chi công đoàn khác</option>
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">{modalType === 'UNION_RECEIPT' ? 'Họ Tên Người Nộp (*)' : 'Họ Tên Người Nhận (*)'}</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A..."
                value={formData.personName || ''}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Tổ Công Đoàn / Bộ Phận</label>
              <input
                type="text"
                placeholder="VD: Ban Chấp Hành CĐCS..."
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">Lý Do Thu / Chi (*)</label>
            <input
              type="text"
              placeholder="VD: Chi mừng sinh nhật đoàn viên..."
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Số Tiền (VND) (*)</label>
              <input
                type="number"
                value={formData.amount || 0}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono font-bold text-cyan-400"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Hình Thức Thanh Toán</label>
              <select
                value={formData.paymentMethod || 'CASH'}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="CASH">Tiền mặt tại quỹ (TK 1111 - Sổ TM)</option>
                <option value="BANK">Chuyển khoản (TK 1121 - Sổ NH)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleSaveTransaction}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold"
            >
              {editingItem ? 'Lưu Thay Đổi' : 'Tạo Phiếu'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* Modal Xem Trước Dữ Liệu Import Excel */}
      <BaseModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Kết Quả Đọc File Excel: ${importFileName}`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-4 bg-cyan-950/40 border border-cyan-800/50 rounded-xl text-cyan-300 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>{importResult?.message}</div>
          </div>

          {importResult?.transactions && importResult.transactions.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-slate-200">Xem trước 5 chứng từ đầu tiên:</div>
              <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-2">Số Phiếu</th>
                      <th className="p-2">Ngày</th>
                      <th className="p-2">Người Nộp/Nhận</th>
                      <th className="p-2">Lý Do</th>
                      <th className="p-2 text-right">Số Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {importResult.transactions.slice(0, 5).map((t, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono text-cyan-400">{t.voucherNo}</td>
                        <td className="p-2 font-mono">{t.date}</td>
                        <td className="p-2">{t.personName}</td>
                        <td className="p-2 line-clamp-1">{t.reason}</td>
                        <td className="p-2 text-right font-mono font-bold">{formatNumber(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
            >
              Đóng
            </button>
            <button
              onClick={handleConfirmImport}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
            >
              Lưu Vào Cơ Sở Dữ Liệu
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
