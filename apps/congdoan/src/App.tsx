import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TradeUnionTransaction,
  TradeUnionVoucherType,
  TradeUnionContributionPeriod,
  TradeUnionEventGiftList,
  TradeUnionSettlementB07Report,
  UnionSignerSettings,
  UnionEmployee
} from './types/accounting';
import { db, logAuditEvent, seedInitialUnionData, DEFAULT_SIGNER_SETTINGS } from './services/storage';
import {
  Users,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
  Coins,
  Gift,
  Landmark,
  Wallet,
  Receipt,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Settings,
  UserCheck,
  LifeBuoy,
  Sparkles,
  MessageSquare,
  Search,
  X,
  Compass
} from 'lucide-react';
import { DrawingsManagerView } from './components/drawings/DrawingsManagerView';
import { PageHeader, StatCard, SubTabNav, BaseModal, TabItem, FeedbackModal, UpdateCheckerModal } from './components/common';
import { formatNumber } from './utils/formatters';
import {
  calculateTradeUnionContribution,
  calculateTradeUnionSummary,
  generateUnionVoucherHTML,
  generateBatchUnionVouchersHTML,
  generateSettlementB07HTML,
  generateCashBookHTML,
  generateBankBookHTML,
  exportUnionFinancialReportToExcel,
  exportSingleExcelSheet,
  detectAndParseUnionExcel,
  syncContributionPeriodToTransactions,
  syncEventGiftToTransaction,
  computeSettlementReportB07
} from './services/tradeUnionService';

// Import 7 Phân Hệ
import {
  ContributionFeeTab,
  VouchersTab,
  ReportsAndBooksTab,
  SettingsTab
} from './components/union';

export type TradeUnionFeatureTab =
  | 'VOUCHERS'
  | 'CONTRIBUTIONS'
  | 'REPORTS_BOOKS'
  | 'SETTINGS';

export default function App() {
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [activeTab, setActiveTab] = useState<TradeUnionFeatureTab>('VOUCHERS');

  // Vouchers state
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    seedInitialUnionData();
  }, []);

  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const [activeClientId, setActiveClientId] = useState<string>('cong-doan-cs-01');
  const activeClient = useMemo(() => {
    return clients.find(c => c.id === activeClientId) || clients[0] || null;
  }, [clients, activeClientId]);

  // Live Query Settings & Employees
  const liveSignerSettings = useLiveQuery(() => db.unionSignerSettings.toCollection().first());
  const signerSettings: UnionSignerSettings = liveSignerSettings || DEFAULT_SIGNER_SETTINGS;

  const employees: UnionEmployee[] = useLiveQuery(() => db.unionEmployees.toArray()) || [];

  // Live Query Transactions
  const liveDbTransactions = useLiveQuery(() => db.unionTransactions.toArray()) || [];
  const allTransactions = liveDbTransactions;

  // Live Query Contribution Periods
  const liveDbContributionPeriods = useLiveQuery(() => db.unionContributionPeriods.toArray()) || [];
  const [contributionPeriods, setContributionPeriods] = useState<TradeUnionContributionPeriod[]>([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('062026');

  const allPeriods = useMemo(() => {
    const map = new Map<string, TradeUnionContributionPeriod>();
    liveDbContributionPeriods.forEach(p => map.set(p.periodKey, p));
    contributionPeriods.forEach(p => map.set(p.periodKey, p));
    return Array.from(map.values());
  }, [liveDbContributionPeriods, contributionPeriods]);

  const handleSavePeriod = async (period: TradeUnionContributionPeriod) => {
    await db.unionContributionPeriods.put(period);
    setContributionPeriods(prev => {
      const idx = prev.findIndex(p => p.periodKey === period.periodKey);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = period;
        return copy;
      }
      return [...prev, period];
    });
  };

  const [eventGifts, setEventGifts] = useState<TradeUnionEventGiftList[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TradeUnionTransaction | null>(null);
  const [modalType, setModalType] = useState<TradeUnionVoucherType>('UNION_RECEIPT');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'UNION_ACCOUNTING' | 'BLUEPRINT_MANAGER'>('UNION_ACCOUNTING');

  // Quick Employee Search in Voucher Modal
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

  const filteredModalEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const q = employeeSearchQuery.toLowerCase().trim();
    return employees.filter(e => 
      e.code.toLowerCase().includes(q) || 
      e.fullName.toLowerCase().includes(q) || 
      (e.department || '').toLowerCase().includes(q)
    );
  }, [employees, employeeSearchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onNavigate((tab: TradeUnionFeatureTab) => {
        setActiveTab(tab);
      });
      (window as any).electronAPI.onOpenModal((modal: 'UPDATE' | 'FEEDBACK') => {
        if (modal === 'UPDATE') setIsUpdateModalOpen(true);
        if (modal === 'FEEDBACK') setIsFeedbackModalOpen(true);
      });
    }

    // Bộ phím tắt tiện ích toàn hệ thống
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bấm ESC: Đóng modal
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsExportModalOpen(false);
        setIsImportModalOpen(false);
        setIsUpdateModalOpen(false);
        setIsFeedbackModalOpen(false);
      }
      // F2 hoặc Ctrl + N: Lập Phiếu Thu
      if (e.key === 'F2' || (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        handleOpenAddModal('UNION_RECEIPT');
      }
      // F3 hoặc Ctrl + Shift + N: Lập Phiếu Chi
      if (e.key === 'F3' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        handleOpenAddModal('UNION_PAYMENT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Form State
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

  const [baseReasonText, setBaseReasonText] = useState<string>('');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('');

  // Budget Calculator State
  const [grossPayroll, setGrossPayroll] = useState<number>(100000000);
  const [memberCount, setMemberCount] = useState<number>(15);
  const [avgSalary, setAvgSalary] = useState<number>(6000000);
  const [doanPhiRate, setDoanPhiRate] = useState<number>(0.005);
  const [kpcdRetainedRate, setKpcdRetainedRate] = useState<number>(0.75);
  const [doanPhiRetainedRate, setDoanPhiRetainedRate] = useState<number>(0.70);

  const [notification, setNotification] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  // Lấy danh sách số dư đầu kỳ từ Dexie DB
  const liveOpeningBalances = useLiveQuery(() => db.unionOpeningBalances.toArray(), []);

  // Tổng hợp số dư đầu kỳ (Ưu tiên Dexie DB -> LocalStorage -> Giá trị mặc định)
  const openingBalances = useMemo<{ [year: number]: { cash: number; bank: number } }>(() => {
    const result: { [year: number]: { cash: number; bank: number } } = {
      2023: { cash: 15594300, bank: 26460 },
      2024: { cash: 11149200, bank: 26510 },
      2025: { cash: 2309760, bank: 4041874 },
      2026: { cash: 438010, bank: 123430 },
    };
    if (liveOpeningBalances && liveOpeningBalances.length > 0) {
      liveOpeningBalances.forEach(item => {
        result[item.year] = { cash: item.cash, bank: item.bank };
      });
      return result;
    }
    try {
      const saved = localStorage.getItem('ACCODESK_UNION_OPENING_BALANCES');
      if (saved) return { ...result, ...JSON.parse(saved) };
    } catch (e) {}
    return result;
  }, [liveOpeningBalances]);

  const currentOpeningCash = openingBalances[selectedYear]?.cash ?? 438010;
  const currentOpeningBank = openingBalances[selectedYear]?.bank ?? 123430;

  // Lọc chứng từ theo năm đang chọn cho 4 thẻ thống kê đầu trang
  const currentYearTransactions = useMemo(() => {
    const list = allTransactions.filter(t => {
      const y = new Date(t.date).getFullYear();
      return y === selectedYear;
    });
    return list.length > 0 ? list : allTransactions;
  }, [allTransactions, selectedYear]);

  // Summaries
  const summary = useMemo(() => {
    return calculateTradeUnionSummary(currentYearTransactions, currentOpeningCash, currentOpeningBank);
  }, [currentYearTransactions, currentOpeningCash, currentOpeningBank]);
  const reportB07 = useMemo(() => computeSettlementReportB07(allTransactions, activeClient, selectedYear), [allTransactions, activeClient, selectedYear]);
  const budgetCalc = useMemo(() => {
    return calculateTradeUnionContribution(grossPayroll, memberCount, avgSalary, doanPhiRate, kpcdRetainedRate, doanPhiRetainedRate);
  }, [grossPayroll, memberCount, avgSalary, doanPhiRate, kpcdRetainedRate, doanPhiRetainedRate]);

  const toggleSelectAll = () => {
    if (selectedIds.length === allTransactions.length && allTransactions.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allTransactions.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleOpenAddModal = (type: TradeUnionVoucherType) => {
    setEditingItem(null);
    setModalType(type);
    setSelectedEmployeeCode('');
    setEmployeeSearchQuery('');
    const m = selectedMonth !== 'ALL' ? selectedMonth : (new Date().getMonth() + 1);
    const dateStr = `${selectedYear}-${String(m).padStart(2, '0')}-15`;
    const prefix = type === 'UNION_RECEIPT' ? 'PT' : 'PC';
    const nextSeq = allTransactions.filter(t => t.voucherType === type).length + 1;
    const defaultVoucherNo = `${prefix}${selectedYear}/${String(nextSeq).padStart(2, '0')}`;
    const initialReason = type === 'UNION_RECEIPT' ? `Thu đoàn phí công đoàn tháng ${m}` : `Chi chăm lo, thăm hỏi đoàn viên`;

    setBaseReasonText(initialReason);
    setFormData({
      voucherType: type,
      voucherNo: defaultVoucherNo,
      date: dateStr,
      category: type === 'UNION_RECEIPT' ? 'DOAN_PHI_1_PERCENT' : 'THAM_HOI_OM_DAU',
      personName: '',
      department: 'Ban Chấp Hành CĐCS',
      reason: initialReason,
      amount: type === 'UNION_RECEIPT' ? 943355 : 300000,
      paymentMethod: 'CASH',
      attachedDocs: '01',
      notes: `Tháng ${m}/${selectedYear}`,
    });
    setIsModalOpen(true);
  };

  // Chọn nhanh nhân viên
  const handleSelectEmployee = (empCode: string) => {
    setSelectedEmployeeCode(empCode);
    if (!empCode) return;

    const emp = employees.find(e => e.code === empCode);
    if (!emp) return;

    let updatedReason = formData.reason || baseReasonText;
    if (modalType === 'UNION_PAYMENT') {
      const base = baseReasonText || 'Chi chăm lo, thăm hỏi đoàn viên';
      updatedReason = `${base} ${emp.fullName} (${emp.code})`;
    }

    setFormData({
      ...formData,
      personName: emp.fullName,
      department: emp.department || formData.department,
      reason: updatedReason,
    });
  };

  const handleSaveTransaction = async () => {
    if (!formData.personName || !formData.reason || !formData.amount || formData.amount <= 0) {
      setNotification({ message: 'Vui lòng nhập họ tên, lý do và số tiền hợp lệ!', type: 'ERROR' });
      return;
    }

    try {
      const now = new Date().toISOString();
      const clientId = activeClient?.id || 'cong-doan-cs-01';

      if (editingItem) {
        const updatedItem: TradeUnionTransaction = {
          ...editingItem,
          ...formData as TradeUnionTransaction,
          updatedAt: now,
        };
        await db.unionTransactions.put(updatedItem);
        await logAuditEvent('EDIT_TX', `Sửa ${updatedItem.voucherNo}`, clientId);
        setNotification({ message: `Cập nhật thành công ${updatedItem.voucherNo}`, type: 'SUCCESS' });
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
        await logAuditEvent('APPROVE_TX', `Tạo ${newItem.voucherNo}`, clientId);
        setNotification({ message: `Đã tạo phiếu ${newItem.voucherNo}`, type: 'SUCCESS' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setNotification({ message: `Lỗi: ${err?.message}`, type: 'ERROR' });
    }
  };

  const handleDeleteSelected = async (targetIds?: string[]) => {
    const idsToDelete = targetIds && targetIds.length > 0 ? targetIds : selectedIds;
    if (idsToDelete.length === 0) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${idsToDelete.length} chứng từ đã chọn?`)) return;
    try {
      await db.unionTransactions.bulkDelete(idsToDelete);
      setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      setNotification({ message: `Đã xóa ${idsToDelete.length} chứng từ thành công!`, type: 'SUCCESS' });
    } catch (err: any) {
      setNotification({ message: `Lỗi khi xóa: ${err?.message}`, type: 'ERROR' });
    }
  };

  const handlePrintSingleVoucher = (tx: TradeUnionTransaction) => {
    const html = generateUnionVoucherHTML(tx, activeClient, signerSettings);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

  const handlePrintBatchSelected = () => {
    const itemsToPrint = allTransactions.filter(t => selectedIds.includes(t.id));
    if (itemsToPrint.length === 0) {
      setNotification({ message: 'Vui lòng tích chọn chứng từ để in!', type: 'ERROR' });
      return;
    }
    const html = generateBatchUnionVouchersHTML(itemsToPrint, activeClient, signerSettings);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

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

    const html = generateBatchUnionVouchersHTML(itemsToPrint, activeClient, signerSettings);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
  };

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

  // Signer & Employee Handlers
  const handleSaveSigners = async (settings: UnionSignerSettings) => {
    await db.unionSignerSettings.put(settings);
    setNotification({ message: 'Đã lưu thông tin người ký cố định!', type: 'SUCCESS' });
  };

  const handleAddEmployee = async (emp: Omit<UnionEmployee, 'id'>) => {
    const newEmp: UnionEmployee = {
      ...emp,
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    await db.unionEmployees.add(newEmp);
    setNotification({ message: `Đã thêm nhân viên ${newEmp.fullName} (${newEmp.code})!`, type: 'SUCCESS' });
  };

  const handleDeleteEmployee = async (id: string) => {
    await db.unionEmployees.delete(id);
    setNotification({ message: 'Đã xóa nhân viên khỏi danh sách!', type: 'SUCCESS' });
  };

  const handleUpdateEmployee = async (emp: UnionEmployee) => {
    await db.unionEmployees.put(emp);
    setNotification({ message: `Đã cập nhật thông tin nhân viên ${emp.fullName} (Mã: ${emp.code})!`, type: 'SUCCESS' });
  };

  const handleSaveOpeningBalance = async (year: number, cash: number, bank: number) => {
    await db.unionOpeningBalances.put({
      year,
      cash,
      bank,
      updatedAt: new Date().toISOString(),
    });
    try {
      const saved = localStorage.getItem('ACCODESK_UNION_OPENING_BALANCES');
      const current = saved ? JSON.parse(saved) : {};
      current[year] = { cash, bank };
      localStorage.setItem('ACCODESK_UNION_OPENING_BALANCES', JSON.stringify(current));
    } catch (e) {}
    setNotification({ message: `Đã lưu số dư đầu kỳ năm ${year} (TM: ${formatNumber(cash)} đ, NH: ${formatNumber(bank)} đ)!`, type: 'SUCCESS' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (!buffer) return;

      try {
        const detected = detectAndParseUnionExcel(buffer, file.name, activeClient?.id || 'cong-doan-cs-01');
        let message = '';
        if (detected.type === 'VOUCHERS_JOURNAL_FILE') {
          message = `Đã đọc ${detected.transactions.length} chứng từ từ file Thu chi`;
          setActiveTab('VOUCHERS');
        } else if (detected.type === 'CONTRIBUTION_FILE') {
          message = `Đã đọc ${detected.periods?.length || 0} kỳ trích nộp & ${detected.eventGifts?.length || 0} đợt quà`;
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
          message = `Đã đọc ${detected.transactions.length} dòng Sổ TM/NH`;
          setActiveTab('REPORTS_BOOKS');
        }

        setImportResult({
          type: detected.type,
          message: message || `Đã đọc ${detected.transactions.length} chứng từ`,
          transactions: detected.transactions,
          periods: detected.periods,
          eventGifts: detected.eventGifts,
          settlementReports: detected.settlementReports,
        });
        setIsImportModalOpen(true);
      } catch (err: any) {
        setNotification({ message: `Lỗi đọc file: ${err?.message || 'Định dạng không hợp lệ'}`, type: 'ERROR' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (!importResult) return;
    try {
      const summaryParts: string[] = [];

      // 1. Lưu chứng từ (Dọn dẹp các chứng từ thuộc các năm trong file import để loại bỏ triệt để chứng từ rác cũ)
      if (importResult.transactions && importResult.transactions.length > 0) {
        const importedYears = Array.from(new Set(
          importResult.transactions.map(t => {
            const y = new Date(t.date).getFullYear();
            return !isNaN(y) ? y : null;
          }).filter((y): y is number => y !== null)
        ));

        // Lấy tất cả giao dịch hiện có để lọc bỏ các giao dịch cũ thuộc những năm được import lại
        const allExisting = await db.unionTransactions.toArray();
        const idsToDelete = allExisting
          .filter(t => {
            const y = new Date(t.date).getFullYear();
            return importedYears.includes(y);
          })
          .map(t => t.id);

        if (idsToDelete.length > 0) {
          await db.unionTransactions.bulkDelete(idsToDelete);
        }

        await db.unionTransactions.bulkPut(importResult.transactions);
        summaryParts.push(`${importResult.transactions.length} chứng từ (đã làm sạch dữ liệu cũ năm ${importedYears.join(', ')})`);
      }

      // 2. Lưu bảng trích nộp tháng/quý
      if (importResult.periods && importResult.periods.length > 0) {
        await db.unionContributionPeriods.bulkPut(importResult.periods);
        setContributionPeriods(importResult.periods);
        summaryParts.push(`${importResult.periods.length} bảng trích nộp`);

        // Tự động đồng bộ thêm danh sách nhân viên mới vào danh bạ
        const existingEmpMap = new Map((await db.unionEmployees.toArray()).map(e => [e.fullName.toLowerCase().trim(), e]));
        const newEmps: UnionEmployee[] = [];
        let empIdx = (await db.unionEmployees.count()) + 1;

        for (const period of importResult.periods) {
          for (const m of period.members) {
            const nameKey = m.fullName.toLowerCase().trim();
            if (nameKey && !existingEmpMap.has(nameKey)) {
              const newE: UnionEmployee = {
                id: `emp-import-${Date.now()}-${empIdx}`,
                code: String(empIdx).padStart(2, '0'),
                fullName: m.fullName,
                department: 'CĐCS',
                insuranceSalary: m.insuranceSalary,
                isActive: true,
              };
              newEmps.push(newE);
              existingEmpMap.set(nameKey, newE);
              empIdx++;
            }
          }
        }

        if (newEmps.length > 0) {
          await db.unionEmployees.bulkPut(newEmps);
          summaryParts.push(`${newEmps.length} nhân viên`);
        }
      }

      // 3. Cập nhật danh sách quà
      if (importResult.eventGifts && importResult.eventGifts.length > 0) {
        setEventGifts(importResult.eventGifts);
        summaryParts.push(`${importResult.eventGifts.length} đợt quà lễ/Tết`);
      }

      setIsImportModalOpen(false);
      setNotification({
        message: `Đã nạp thành công: ${summaryParts.join(', ')} từ file ${importFileName}!`,
        type: 'SUCCESS'
      });
    } catch (err: any) {
      setNotification({ message: `Lỗi lưu dữ liệu: ${err?.message}`, type: 'ERROR' });
    }
  };

  const handleSyncPeriodToCashBook = async (period: TradeUnionContributionPeriod) => {
    try {
      const txs = syncContributionPeriodToTransactions(period, activeClient?.id || 'cong-doan-cs-01');
      if (txs.length > 0) {
        await db.unionTransactions.bulkAdd(txs);
        setNotification({
          message: `Đã sinh ${txs.length} chứng từ từ ${period.periodLabel} vào Sổ Quỹ!`,
          type: 'SUCCESS'
        });
      }
    } catch (err: any) {
      setNotification({ message: `Lỗi: ${err?.message}`, type: 'ERROR' });
    }
  };

  const handleSyncEventGiftToCashBook = async (gift: TradeUnionEventGiftList) => {
    try {
      const tx = syncEventGiftToTransaction(gift, activeClient?.id || 'cong-doan-cs-01');
      await db.unionTransactions.add(tx);
      setNotification({
        message: `Đã sinh Phiếu Chi Quà ${gift.eventName} (${formatNumber(gift.totalAmount)} đ)!`,
        type: 'SUCCESS'
      });
    } catch (err: any) {
      setNotification({ message: `Lỗi: ${err?.message}`, type: 'ERROR' });
    }
  };

  const navTabs: TabItem[] = [
    { id: 'VOUCHERS', label: '1. Phiếu Thu / Chi (C40 & C41)', icon: Receipt },
    { id: 'CONTRIBUTIONS', label: '2. Trích Nộp KPCĐ (2%) & Đoàn Phí', icon: Coins },
    { id: 'REPORTS_BOOKS', label: '3. Sổ Quỹ & Báo Cáo Quyết Toán (B07)', icon: Landmark },
    { id: 'SETTINGS', label: '4. Cài Đặt & Nhân Viên', icon: Settings },
  ];

  // Nếu người dùng chọn chuyển sang Phân Hệ Quản Lý Bản Vẽ Công Trình (Demo)
  if (activeWorkspace === 'BLUEPRINT_MANAGER') {
    return <DrawingsManagerView onBackToAccounting={() => setActiveWorkspace('UNION_ACCOUNTING')} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-blue-500/20 border border-slate-200 bg-white flex items-center justify-center p-0.5">
            <img src="./logo.png" alt="Logo Kế Toán Công Đoàn" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>KẾ TOÁN TÀI CHÍNH CÔNG ĐOÀN</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                BẢN CHUẨN
              </span>
            </div>
            <div className="text-xs text-slate-500">Mẫu biểu C40-BB, C41-BB & Báo cáo B07-TLĐ</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Kiểm Tra Cập Nhật */}
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Kiểm tra phiên bản & Cập nhật phần mềm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>v1.3.0 (Cập Nhật)</span>
          </button>

          {/* Nút Chuyển Sang Phân Hệ Bản Vẽ (Demo) */}
          <button
            onClick={() => setActiveWorkspace('BLUEPRINT_MANAGER')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
            title="Mở phân hệ Quản Lý Bản Vẽ & Hồ Sơ Công Trình (Demo)"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>📐 Bản Vẽ (Demo)</span>
          </button>

          {/* Nút Báo Cáo Lỗi & Hỗ Trợ Trực Tiếp */}
          <button
            onClick={() => setIsFeedbackModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Gửi báo cáo sự cố hoặc liên hệ hỗ trợ kỹ thuật trực tiếp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>Báo Lỗi / Hỗ Trợ</span>
          </button>

          {/* Thông tin đơn vị */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-700">{signerSettings.companyName || activeClient?.name || 'CĐCS Hưng Phát'}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-6 space-y-5 max-w-7xl w-full mx-auto">
        <PageHeader
          title="Quản Lý Tài Chính Công Đoàn"
          badgeText={`Năm ${selectedYear}`}
          subtitle={`Đơn vị: ${signerSettings.companyName || activeClient?.name || 'CĐCS Hưng Phát'}`}
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
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Nạp Excel</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('UNION_RECEIPT')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Phiếu Thu</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('UNION_PAYMENT')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Phiếu Chi</span>
              </button>
            </div>
          }
        />

        {notification && (
          <div className={`p-3.5 rounded-xl flex items-center justify-between text-xs font-medium shadow-sm ${notification.type === 'SUCCESS' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">Đóng</button>
          </div>
        )}

        {/* 4 Thẻ Thống Kê */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Tổng Thu Quỹ"
            value={`${formatNumber(summary.totalReceipts)} đ`}
            subtext={`${summary.receiptCount} phiếu thu`}
            icon={ArrowUpRight}
            variant="emerald"
          />
          <StatCard
            label="Tổng Chi Hoạt Động"
            value={`${formatNumber(summary.totalPayments)} đ`}
            subtext={`${summary.paymentCount} phiếu chi`}
            icon={ArrowDownRight}
            variant="rose"
          />
          <StatCard
            label="Tồn Quỹ Tiền Mặt"
            value={`${formatNumber(summary.cashBalance)} đ`}
            subtext={`Đầu kỳ: ${formatNumber(currentOpeningCash)} đ | Sổ S11H`}
            icon={Coins}
            variant="amber"
          />
          <StatCard
            label="Tồn Tiền Gửi NH"
            value={`${formatNumber(summary.bankBalance)} đ`}
            subtext={`Đầu kỳ: ${formatNumber(currentOpeningBank)} đ | Sổ S12-H`}
            icon={Landmark}
            variant="blue"
          />
        </div>

        {/* Thanh Chọn Phân Hệ Cố Định Khi Scroll */}
        <div className="sticky top-[61px] z-30 bg-slate-100/95 backdrop-blur-md py-2 -my-2 transition-all shadow-xs">
          <SubTabNav
            tabs={navTabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as any)}
          />
        </div>

        {/* 4 Phân Hệ Tinh Gọn */}
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
            client={activeClient}
            signerSettings={signerSettings}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === 'CONTRIBUTIONS' && (
          <ContributionFeeTab
            periods={allPeriods}
            selectedPeriodKey={selectedPeriodKey}
            onSelectPeriodKey={setSelectedPeriodKey}
            onSavePeriod={handleSavePeriod}
            onSyncPeriod={handleSyncPeriodToCashBook}
            onUploadClick={() => fileInputRef.current?.click()}
            employees={employees}
            signerSettings={signerSettings}
            activeClient={activeClient}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === 'REPORTS_BOOKS' && (
          <ReportsAndBooksTab
            transactions={allTransactions}
            reportB07={reportB07}
            onPrintCashBook={handlePrintCashBook}
            onPrintBankBook={handlePrintBankBook}
            onPrintReportB07={handlePrintB07Report}
            client={activeClient}
            signerSettings={signerSettings}
            selectedYear={selectedYear}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsTab
            signerSettings={signerSettings}
            onSaveSignerSettings={handleSaveSigners}
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            openingBalances={openingBalances}
            onSaveOpeningBalance={handleSaveOpeningBalance}
          />
        )}

        {/* Modal Tùy Chọn Xuất Excel */}
        <BaseModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="Tùy Chọn Xuất Báo Cáo Excel"
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500 mb-2">
              Chọn định dạng bảng tính Excel bạn muốn xuất. File được căn chỉnh độ rộng cột, định dạng số tiền chuẩn xác và có sẵn chữ ký kế toán:
            </p>

            {/* Tùy chọn 1: Trọn bộ sổ sách */}
            <div
              onClick={() => {
                exportUnionFinancialReportToExcel(allTransactions, activeClient, selectedYear, signerSettings);
                setIsExportModalOpen(false);
              }}
              className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <span>Trọn Bộ Sổ Sách (Full 4 Sheet)</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">Khuyên dùng</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Bao gồm: Danh sách Thu Chi, Sổ Quỹ TM (S11H), Sổ NH (S12-H) và Quyết Toán B07-TLĐ.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Tùy chọn 2: Danh sách phiếu thu chi */}
            <div
              onClick={() => {
                exportSingleExcelSheet('VOUCHERS', allTransactions, activeClient, selectedYear, selectedMonth, signerSettings);
                setIsExportModalOpen(false);
              }}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Danh Sách Phiếu Thu / Chi {selectedMonth !== 'ALL' ? `(Tháng ${selectedMonth})` : '(Cả Năm)'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Xuất bảng kê chi tiết toàn bộ chứng từ theo tháng hoặc cả năm.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Tùy chọn 3: Sổ Quỹ Tiền Mặt */}
            <div
              onClick={() => {
                exportSingleExcelSheet('CASH_BOOK', allTransactions, activeClient, selectedYear, undefined, signerSettings);
                setIsExportModalOpen(false);
              }}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Sổ Quỹ Tiền Mặt (Mẫu S11H)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sổ chi tiết thu - chi tiền mặt TK 1111 và tính số dư tồn quỹ liên tục.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Tùy chọn 4: Sổ Ngân Hàng */}
            <div
              onClick={() => {
                exportSingleExcelSheet('BANK_BOOK', allTransactions, activeClient, selectedYear, undefined, signerSettings);
                setIsExportModalOpen(false);
              }}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Sổ Tiền Gửi Ngân Hàng (Mẫu S12-H)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sổ chi tiết gửi vào - rút ra TK 1121 và số dư tài khoản ngân hàng.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Tùy chọn 5: Báo Cáo Quyết Toán B07-TLĐ */}
            <div
              onClick={() => {
                exportSingleExcelSheet('SETTLEMENT_B07', allTransactions, activeClient, selectedYear, undefined, signerSettings);
                setIsExportModalOpen(false);
              }}
              className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Báo Cáo Quyết Toán Tài Chính (Mẫu B07-TLĐ)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Bảng tổng hợp thu chi theo mục lục Tổng Liên đoàn để nộp cấp trên.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </BaseModal>

        {/* Modal Lập Phiếu Thu / Chi */}
        <BaseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? `Chỉnh Sửa: ${editingItem.voucherNo}` : modalType === 'UNION_RECEIPT' ? 'Lập Phiếu Thu (Mẫu C40-BB)' : 'Lập Phiếu Chi (Mẫu C41-BB)'}
        >
          <div className="space-y-3.5 text-xs">
            {/* Tích chọn nhân viên nhanh kèm ô tìm kiếm theo mã */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-700 font-bold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Chọn Nhanh Đoàn Viên / Nhân Viên:</span>
                </label>
                <span className="text-[10px] text-blue-600">Tự điền tên & ghép mã vào nội dung</span>
              </div>

              {/* Ô Tìm Kiếm Nhanh Theo Mã NV hoặc Tên */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={employeeSearchQuery}
                  onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  placeholder="🔍 Nhập mã NV (ví dụ: 01, 15) hoặc tên để tìm nhanh..."
                  className="w-full bg-white border border-blue-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                />
                {employeeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEmployeeSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown danh sách đã lọc */}
              <select
                value={selectedEmployeeCode}
                onChange={(e) => handleSelectEmployee(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
              >
                <option value="">
                  {filteredModalEmployees.length === 0 
                    ? '-- Không tìm thấy nhân viên phù hợp --' 
                    : `-- Bấm để chọn nhân viên (${filteredModalEmployees.length} kết quả) --`}
                </option>
                {filteredModalEmployees.map(emp => (
                  <option key={emp.id} value={emp.code}>
                    [Mã: {emp.code}] {emp.fullName} - {emp.department || 'CĐCS'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Số Phiếu (*)</label>
                <input
                  type="text"
                  value={formData.voucherNo || ''}
                  onChange={(e) => setFormData({ ...formData, voucherNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Ngày Lập (*)</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Khoản Mục (*)</label>
              <select
                value={formData.category || 'DOAN_PHI_1_PERCENT'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {modalType === 'UNION_RECEIPT' ? (
                  <>
                    <option value="DOAN_PHI_1_PERCENT">Đoàn phí công đoàn (Đoàn viên đóng)</option>
                    <option value="KPCĐ_2_PERCENT">Kinh phí công đoàn 2% (DN trích nộp)</option>
                    <option value="KINH_PHI_CAP_TREN">Kinh phí CĐ cấp trên cấp về / Rút NH</option>
                    <option value="HO_TRO_KHAC">Hỗ trợ từ Doanh nghiệp & Tài trợ</option>
                  </>
                ) : (
                  <>
                    <option value="THAM_HOI_OM_DAU">Chi thăm hỏi ốm đau, hiếu hỉ, sinh nhật</option>
                    <option value="QUA_LE_TET">Chi quà Tết, 8/3, 20/10, Trung thu, 2/9, 30/4</option>
                    <option value="HOAT_DONG_PHONG_TRAO">Chi văn nghệ, thể thao, hội thao, du lịch</option>
                    <option value="KHEN_THUONG">Chi khen thưởng đoàn viên xuất sắc</option>
                    <option value="NOP_CAP_TREN_25">Nộp KPCĐ/Đoàn phí lên Công đoàn cấp trên</option>
                    <option value="PHU_CAP_CAN_BO_CD">Phụ cấp cán bộ công đoàn & quản lý CĐ</option>
                    <option value="CHI_KHAC">Chi văn phòng phẩm, hoạt động khác</option>
                  </>
                )}
              </select>
            </div>

            {/* Ô Tìm Kiếm Nhanh Theo Mã / Tên Nhân Viên */}
            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 space-y-1.5">
              <label className="block text-blue-900 font-bold text-xs flex items-center justify-between">
                <span>🔍 Tìm nhanh theo Mã / Tên Đoàn Viên:</span>
                {employees.length > 0 && (
                  <span className="text-[11px] font-normal text-blue-600">({employees.length} nhân viên trong danh bạ)</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Gõ mã nhân viên (01, 02...) hoặc họ tên để tự động điền..."
                  value={employeeSearchQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setEmployeeSearchQuery(q);
                    const found = employees.find(
                      emp => emp.code?.toLowerCase() === q.trim().toLowerCase() ||
                             emp.fullName?.toLowerCase().includes(q.trim().toLowerCase())
                    );
                    if (found) {
                      setFormData(prev => ({
                        ...prev,
                        personName: found.fullName,
                        department: found.department || 'Đoàn viên CĐCS',
                        reason: modalType === 'UNION_PAYMENT' && (!prev.reason || prev.reason.includes('Chi mừng'))
                          ? `Chi mừng sinh nhật đoàn viên ${found.fullName}`
                          : prev.reason
                      }));
                    }
                  }}
                  className="flex-1 bg-white border border-blue-300 rounded-md px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {employees.length > 0 && (
                  <select
                    value={selectedEmployeeCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedEmployeeCode(code);
                      const found = employees.find(emp => emp.code === code);
                      if (found) {
                        setEmployeeSearchQuery(found.fullName);
                        setFormData(prev => ({
                          ...prev,
                          personName: found.fullName,
                          department: found.department || 'Đoàn viên CĐCS',
                          reason: modalType === 'UNION_PAYMENT' && (!prev.reason || prev.reason.includes('Chi mừng'))
                            ? `Chi mừng sinh nhật đoàn viên ${found.fullName}`
                            : prev.reason
                        }));
                      }
                    }}
                    className="max-w-[180px] bg-white border border-blue-300 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Chọn danh bạ --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.code}>
                        {emp.code} - {emp.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">{modalType === 'UNION_RECEIPT' ? 'Người Nộp (*)' : 'Người Nhận (*)'}</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A..."
                  value={formData.personName || ''}
                  onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Bộ Phận / Tổ CĐ</label>
                <input
                  type="text"
                  placeholder="VD: Ban Chấp Hành CĐCS..."
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nội Dung / Lý Do (*)</label>
              <input
                type="text"
                placeholder="VD: Chi chăm lo, thăm hỏi đoàn viên Nguyễn Văn A (123)..."
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Số Tiền (đ) (*)</label>
                <input
                  type="number"
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-blue-700 font-mono font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Hình Thức</label>
                <select
                  value={formData.paymentMethod || 'CASH'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="CASH">Tiền mặt (Sổ TM - TK 1111)</option>
                  <option value="BANK">Chuyển khoản (Sổ NH - TK 1121)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveTransaction}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                {editingItem ? 'Lưu Thay Đổi' : 'Tạo Phiếu'}
              </button>
            </div>
          </div>
        </BaseModal>

        {/* Modal Xem Trước File Import */}
        <BaseModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title={`Đã Đọc File: ${importFileName}`}
        >
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="font-semibold">{importResult?.message}</div>
            </div>

            {/* Preview Phiếu Thu / Chi */}
            {importResult?.transactions && importResult.transactions.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Xem trước 5 phiếu đầu tiên ({importResult.transactions.length} chứng từ):</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-52">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">Số Phiếu</th>
                        <th className="p-2">Ngày</th>
                        <th className="p-2">Người Nộp/Nhận</th>
                        <th className="p-2">Nội Dung</th>
                        <th className="p-2 text-right">Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResult.transactions.slice(0, 5).map((t, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono font-bold text-blue-700">{t.voucherNo}</td>
                          <td className="p-2 font-mono text-slate-600">{t.date}</td>
                          <td className="p-2 font-semibold">{t.personName}</td>
                          <td className="p-2 text-slate-500 line-clamp-1">{t.reason}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{formatNumber(t.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preview Bảng Trích Nộp Tháng */}
            {importResult?.periods && importResult.periods.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Các kỳ trích nộp đã nhận diện ({importResult.periods.length} kỳ):</div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-44">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">Kỳ / Sheet</th>
                        <th className="p-2 text-center">Số Đoàn Viên</th>
                        <th className="p-2 text-right">Quỹ Lương BHXH</th>
                        <th className="p-2 text-right">KPCĐ (75% giữ lại)</th>
                        <th className="p-2 text-right">Đoàn Phí (70% giữ)</th>
                        <th className="p-2 text-right">Nộp Cấp Trên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResult.periods.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-blue-700">{p.periodLabel || p.periodKey}</td>
                          <td className="p-2 text-center font-semibold">{p.totalMembers || p.members?.length || 0}</td>
                          <td className="p-2 text-right font-mono">{formatNumber(p.totalInsuranceSalary)} đ</td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-semibold">{formatNumber(p.totalKpcdRetained)} đ</td>
                          <td className="p-2 text-right font-mono text-emerald-700 font-semibold">{formatNumber(p.totalDoanPhiRetained)} đ</td>
                          <td className="p-2 text-right font-mono text-rose-700 font-semibold">{formatNumber(p.netPayableToSuperior)} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Preview Danh Sách Chi Quà Lễ Tết */}
            {importResult?.eventGifts && importResult.eventGifts.length > 0 && (
              <div className="space-y-1.5">
                <div className="font-bold text-slate-700">Các đợt quà lễ / Tết nhận diện ({importResult.eventGifts.length} sự kiện):</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {importResult.eventGifts.map((eg, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{eg.eventName}</div>
                        <div className="text-[11px] text-slate-500">{eg.totalPersons} người x {formatNumber(eg.giftPerPerson)} đ</div>
                      </div>
                      <div className="font-mono font-bold text-rose-700 text-xs">
                        {formatNumber(eg.totalAmount)} đ
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Lưu Vào Dữ Liệu
              </button>
            </div>
          </div>
        </BaseModal>

        {/* Modal Báo Cáo Lỗi & Hỗ Trợ Kỹ Thuật */}
        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />

        {/* Modal Kiểm Tra Phiên Bản & Cập Nhật */}
        <UpdateCheckerModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      </main>
    </div>
  );
}
