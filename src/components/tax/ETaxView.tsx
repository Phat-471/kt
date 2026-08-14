import React, { useState, useMemo } from 'react';
import { Client, NormalizedTransaction } from '../../types/accounting';
import {
  generateGTGTXML,
  generatePITXML,
  generateTNDNXML,
  downloadXML,
  txsToVATRows,
  VATRow,
} from '../../services/eTaxXMLGenerator';
import {
  exportVATAnnexesToExcel,
  exportTNDNExcel,
} from '../../services/excelService';
import { getAllEmployees, calculatePayrollSummary } from '../../services/payrollService';
import { auditNonDeductibleExpenses, NonDeductibleExpenseItem } from '../../services/taxAuditService';
import { db, logAuditEvent } from '../../services/storage';
import {
  FileCode,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Building2,
  FileSpreadsheet,
  Calculator,
  ShieldAlert,
  Edit3,
  X,
  CreditCard,
  Receipt,
} from 'lucide-react';

interface ETaxViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
}

export const ETaxView: React.FC<ETaxViewProps> = ({ activeClient, transactions }) => {
  const [activeTab, setActiveTab] = useState<'GTGT' | 'TNCN' | 'TNDN'>('GTGT');
  const [isB4ModalOpen, setIsB4ModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<{ id: string; voucherNo: string; creditAcc: string } | null>(null);

  // State cho 01/GTGT
  const [yearGTGT, setYearGTGT] = useState<number>(2026);
  const [quarterGTGT, setQuarterGTGT] = useState<1 | 2 | 3 | 4>(3);
  const [prevCarryover, setPrevCarryover] = useState<number>(0);
  const [vatRate, setVatRate] = useState<0 | 5 | 8 | 10>(10);

  // State cho 05/KK-TNCN
  const [taxYearPIT, setTaxYearPIT] = useState<number>(2026);

  // State cho 01/TNDN (Tạm tính quý)
  const [yearTNDN, setYearTNDN] = useState<number>(2026);
  const [quarterTNDN, setQuarterTNDN] = useState<1 | 2 | 3 | 4>(3);
  const [taxRateTNDN, setTaxRateTNDN] = useState<number>(20);
  const [taxLossCarryforward, setTaxLossCarryforward] = useState<number>(0);
  const [taxExemptIncome, setTaxExemptIncome] = useState<number>(0);
  const [taxPrepaid, setTaxPrepaid] = useState<number>(0);

  // ==========================================
  // LOGIC GTGT
  // ==========================================
  const filteredTxsGTGT = useMemo(() => {
    const fromMonth = (quarterGTGT - 1) * 3 + 1;
    const toMonth = quarterGTGT * 3;
    const fromDate = `${yearGTGT}-${String(fromMonth).padStart(2, '0')}-01`;
    const toDate = `${yearGTGT}-${String(toMonth).padStart(2, '0')}-31`;

    return transactions.filter(t => t.date >= fromDate && t.date <= toDate);
  }, [transactions, yearGTGT, quarterGTGT]);

  const outputVATRows: VATRow[] = useMemo(() => {
    return txsToVATRows(filteredTxsGTGT, 'OUTPUT', vatRate);
  }, [filteredTxsGTGT, vatRate]);

  const inputVATRows: VATRow[] = useMemo(() => {
    return txsToVATRows(filteredTxsGTGT, 'INPUT', vatRate);
  }, [filteredTxsGTGT, vatRate]);

  // XML 01/GTGT Generated preview
  const gtgtXmlContent = useMemo(() => {
    if (!activeClient) return '';
    return generateGTGTXML({
      client: activeClient,
      taxPeriod: { year: yearGTGT, quarter: quarterGTGT },
      outputRows: outputVATRows,
      inputRows: inputVATRows,
      prevCreditCarryover: prevCarryover,
    });
  }, [activeClient, yearGTGT, quarterGTGT, outputVATRows, inputVATRows, prevCarryover]);

  const handleExportGTGT = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất XML!');
      return;
    }
    const filename = `01_GTGT_${activeClient.taxCode}_${yearGTGT}Q${quarterGTGT}.xml`;
    downloadXML(gtgtXmlContent, filename);
  };

  const handleExportGTGTExcel = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất Excel!');
      return;
    }
    exportVATAnnexesToExcel({
      client: activeClient,
      taxPeriod: { year: yearGTGT, quarter: quarterGTGT },
      outputRows: outputVATRows,
      inputRows: inputVATRows,
    });
  };

  // ==========================================
  // LOGIC TNCN
  // ==========================================
  const pitXmlContent = useMemo(() => {
    if (!activeClient) return '';
    const employees = getAllEmployees();
    const summary = calculatePayrollSummary(employees, `07/${taxYearPIT}`, activeClient.id);
    return generatePITXML({
      client: activeClient,
      taxYear: taxYearPIT,
      payrollSummary: summary,
    });
  }, [activeClient, taxYearPIT]);

  const handleExportPIT = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất XML!');
      return;
    }
    const filename = `05_KK_TNCN_${activeClient.taxCode}_${taxYearPIT}.xml`;
    downloadXML(pitXmlContent, filename);
  };

  // ==========================================
  // LOGIC TNDN TẠM TÍNH QUÝ (01/TNDN)
  // ==========================================
  const filteredTxsTNDN = useMemo(() => {
    const fromMonth = (quarterTNDN - 1) * 3 + 1;
    const toMonth = quarterTNDN * 3;
    const fromDate = `${yearTNDN}-${String(fromMonth).padStart(2, '0')}-01`;
    const toDate = `${yearTNDN}-${String(toMonth).padStart(2, '0')}-31`;

    return transactions.filter(t => t.date >= fromDate && t.date <= toDate);
  }, [transactions, yearTNDN, quarterTNDN]);

  // Tập hợp doanh thu & chi phí phát sinh
  const tndnStats = useMemo(() => {
    let rev = 0;
    let exp = 0;

    filteredTxsTNDN.forEach(t => {
      // Doanh thu: TK 511, 711 hoặc TYPE INCOME
      if (t.creditAcc?.startsWith('511') || t.creditAcc?.startsWith('711') || t.type === 'INCOME') {
        rev += t.amount;
      }
      // Chi phí: TK 632, 641, 642, 635, 811 hoặc TYPE EXPENSE
      else if (
        t.debitAcc?.startsWith('632') ||
        t.debitAcc?.startsWith('641') ||
        t.debitAcc?.startsWith('642') ||
        t.debitAcc?.startsWith('635') ||
        t.debitAcc?.startsWith('811') ||
        t.type === 'EXPENSE'
      ) {
        exp += t.amount;
      }
    });

    // Bóc tách tự động chi phí không được trừ theo luật thuế TNDN (B4)
    const auditRes = auditNonDeductibleExpenses(filteredTxsTNDN);
    const nonDeductible = auditRes.totalNonDeductibleAmount;

    const profit = rev - exp;
    const taxableIncome = profit + nonDeductible - taxExemptIncome;
    const assessableIncome = Math.max(0, taxableIncome - taxLossCarryforward);
    const taxIncurred = Math.round(assessableIncome * (taxRateTNDN / 100));
    const taxPayable = Math.max(0, taxIncurred - taxPrepaid);

    return {
      revenue: rev,
      expenses: exp,
      profit,
      nonDeductible,
      taxableIncome,
      assessableIncome,
      taxIncurred,
      taxPayable,
    };
  }, [filteredTxsTNDN, taxExemptIncome, taxLossCarryforward, taxRateTNDN, taxPrepaid]);

  // XML 01/TNDN Generated preview
  const tndnXmlContent = useMemo(() => {
    if (!activeClient) return '';
    return generateTNDNXML({
      client: activeClient,
      taxPeriod: { year: yearTNDN, quarter: quarterTNDN },
      revenue: tndnStats.revenue,
      expenses: tndnStats.expenses,
      accountingProfit: tndnStats.profit,
      nonDeductibleExpenses: tndnStats.nonDeductible,
      taxExemptIncome,
      taxLossCarryforward,
      taxRate: taxRateTNDN,
      taxPrepaid,
    });
  }, [
    activeClient,
    yearTNDN,
    quarterTNDN,
    tndnStats,
    taxExemptIncome,
    taxLossCarryforward,
    taxRateTNDN,
    taxPrepaid,
  ]);

  const handleExportTNDNXML = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất XML!');
      return;
    }
    const filename = `01_TNDN_${activeClient.taxCode}_${yearTNDN}Q${quarterTNDN}.xml`;
    downloadXML(tndnXmlContent, filename);
  };

  const handleExportTNDNExcel = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất Excel!');
      return;
    }
    exportTNDNExcel({
      client: activeClient,
      taxPeriod: { year: yearTNDN, quarter: quarterTNDN },
      revenue: tndnStats.revenue,
      expenses: tndnStats.expenses,
      accountingProfit: tndnStats.profit,
      nonDeductibleExpenses: tndnStats.nonDeductible,
      taxExemptIncome,
      taxLossCarryforward,
      taxRate: taxRateTNDN,
      taxPrepaid,
    });
  };

  const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');

  return (
    <div className="p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white px-5 py-4 rounded-2xl border border-blue-500/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">Khai Thuế Điện Tử (eTax XML & HTKK)</h2>
              <p className="text-[11px] text-blue-300 mt-0.5">
                Xuất file XML & Excel chuẩn Tổng Cục Thuế — Mẫu 01/GTGT, 01/TNDN (TT80/2021) & 05/KK-TNCN
              </p>
            </div>
          </div>
          {activeClient && (
            <div className="text-right">
              <span className="text-xs font-bold text-blue-200 block">{activeClient.name}</span>
              <span className="text-[10px] text-blue-300 font-mono">MST: {activeClient.taxCode}</span>
            </div>
          )}
        </div>
      </div>

      {!activeClient && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Vui lòng chọn doanh nghiệp hoạt động từ thanh tiêu đề hoặc Quản lý Khách hàng trước khi tạo tờ khai XML.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('GTGT')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'GTGT'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" /> Tờ Khai 01/GTGT (Thuế GTGT Quý)
        </button>
        <button
          onClick={() => setActiveTab('TNDN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TNDN'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" /> Tờ Khai 01/TNDN (Tạm Tính TNDN Quý)
        </button>
        <button
          onClick={() => setActiveTab('TNCN')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TNCN'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" /> Tờ Khai 05/KK-TNCN (Quyết Toán TNCN)
        </button>
      </div>

      {/* ==========================================
          TAB 1: 01/GTGT
          ========================================== */}
      {activeTab === 'GTGT' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cấu Hình Kỳ Kê Khai Thuế GTGT</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Năm Kê Khai</label>
                <input
                  type="number"
                  value={yearGTGT}
                  onChange={e => setYearGTGT(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Quý Kê Khai</label>
                <select
                  value={quarterGTGT}
                  onChange={e => setQuarterGTGT(Number(e.target.value) as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>Quý I (Tháng 1 - 3)</option>
                  <option value={2}>Quý II (Tháng 4 - 6)</option>
                  <option value={3}>Quý III (Tháng 7 - 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - 12)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thuế GTGT Khấu Trừ Kỳ Trước [22]</label>
                <input
                  type="number"
                  value={prevCarryover}
                  onChange={e => setPrevCarryover(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thuế Suất Áp Dụng Mẫu</label>
                <select
                  value={vatRate}
                  onChange={e => setVatRate(Number(e.target.value) as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={10}>10% (Thông thường)</option>
                  <option value={8}>8% (Giảm thuế)</option>
                  <option value={5}>5%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">HĐ Mua Vào (01-2)</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{inputVATRows.length} hóa đơn</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">HĐ Bán Ra (01-1)</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{outputVATRows.length} hóa đơn</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Tổng Thuế GTGT Đầu Ra [28]</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{fmt(outputVATRows.reduce((s, r) => s + r.vatAmount, 0))} đ</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Thuế Khấu Trừ Kỳ Này [36]</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{fmt(inputVATRows.reduce((s, r) => s + r.vatAmount, 0) + prevCarryover)} đ</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleExportGTGT}
                disabled={!activeClient}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Xuất File XML 01/GTGT (eTax)
              </button>
              <button
                onClick={handleExportGTGTExcel}
                disabled={!activeClient}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel Bảng Kê (PL 01-1 & 01-2)
              </button>
            </div>
          </div>

          {/* XML Preview */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (01/GTGT)</div>
            <pre>{gtgtXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: 01/TNDN (TẠM TÍNH QUÝ)
          ========================================== */}
      {activeTab === 'TNDN' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cấu Hình Tờ Khai Thuế TNDN Tạm Tính Quý (Mẫu 01/TNDN)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Năm Tính Thuế</label>
                <input
                  type="number"
                  value={yearTNDN}
                  onChange={e => setYearTNDN(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Quý Tạm Tính</label>
                <select
                  value={quarterTNDN}
                  onChange={e => setQuarterTNDN(Number(e.target.value) as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>Quý I (Tháng 1 - 3)</option>
                  <option value={2}>Quý II (Tháng 4 - 6)</option>
                  <option value={3}>Quý III (Tháng 7 - 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - 12)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thuế Suất TNDN [29]</label>
                <select
                  value={taxRateTNDN}
                  onChange={e => setTaxRateTNDN(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={20}>20% (Tiêu chuẩn)</option>
                  <option value={17}>17% (Ưu đãi)</option>
                  <option value={15}>15% (Ưu đãi)</option>
                  <option value={10}>10% (Ưu đãi đặc biệt)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Lỗ Kỳ Trước Chuyển Sang [27]</label>
                <input
                  type="number"
                  value={taxLossCarryforward}
                  onChange={e => setTaxLossCarryforward(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thu Nhập Miễn Thuế [25]</label>
                <input
                  type="number"
                  value={taxExemptIncome}
                  onChange={e => setTaxExemptIncome(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thuế TNDN Đã Nộp Các Kỳ [31]</label>
                <input
                  type="number"
                  value={taxPrepaid}
                  onChange={e => setTaxPrepaid(Number(e.target.value))}
                  className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Bảng tổng hợp chỉ tiêu 01/TNDN */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Doanh Thu [21]</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmt(tndnStats.revenue)} đ</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Chi Phí [22]</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{fmt(tndnStats.expenses)} đ</span>
              </div>
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Chi Phí Loại Trừ [24]</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block mt-0.5">{fmt(tndnStats.nonDeductible)} đ</span>
                </div>
                <button
                  onClick={() => setIsB4ModalOpen(true)}
                  className="mt-1 text-[10px] bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Edit3 className="w-2.5 h-2.5" /> Chi tiết & Sửa [B4]
                </button>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Thu Nhập Tính Thuế [28]</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{fmt(tndnStats.assessableIncome)} đ</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">Thuế Còn Phải Nộp [32]</span>
                <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">{fmt(tndnStats.taxPayable)} đ</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleExportTNDNXML}
                disabled={!activeClient}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" /> Xuất File XML 01/TNDN (eTax)
              </button>
              <button
                onClick={handleExportTNDNExcel}
                disabled={!activeClient}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel Tờ Khai 01/TNDN
              </button>
            </div>
          </div>

          {/* XML Preview */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (01/TNDN)</div>
            <pre>{tndnXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DRILL-DOWN CHI TIẾT CHI PHÍ THUẾ TNDN BỊ LOẠI [B4] */}
      {/* ======================================================== */}
      {isB4ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Bóc Tách Chi Phí Bị Loại Thuế TNDN — Chỉ Tiêu [24]/[B4]
                  </h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Quý {quarterTNDN}/{yearTNDN} — Tổng chi phí bị loại: <strong>{fmt(tndnStats.nonDeductible)} VNĐ</strong> (Nguy cơ truy thu 20%: <strong>{fmt(tndnStats.nonDeductible * 0.2)} VNĐ</strong>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsB4ModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {auditNonDeductibleExpenses(filteredTxsTNDN).items.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Không có chi phí nào bị loại!</p>
                  <p className="text-xs text-slate-500 mt-1">Tất cả chứng từ chi phí trong kỳ đều hợp lệ theo quy định Luật Thuế TNDN.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {auditNonDeductibleExpenses(filteredTxsTNDN).items.map((item) => (
                    <div key={item.id} className="p-4 space-y-3 bg-white dark:bg-slate-900/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{item.voucherNo}</span>
                            <span className="text-[11px] text-slate-500">{item.date}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                              {item.reasonCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">⚠️ {item.reasonText}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block tabular-nums">
                            {fmt(item.amount)} VNĐ
                          </span>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            Truy thu: +{fmt(item.citTaxLossRisk)} VNĐ
                          </span>
                        </div>
                      </div>

                      {/* Quick Edit Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <button
                          onClick={async () => {
                            const newVoucher = prompt('Nhập Số Hóa Đơn / Số Chứng Từ Bổ Sung:', item.voucherNo === 'THIẾU CT' ? 'HD-' : item.voucherNo);
                            if (newVoucher && newVoucher.trim()) {
                              const tx = await db.transactions.get(item.id);
                              if (tx) {
                                tx.voucherNo = newVoucher.trim();
                                await db.transactions.put(tx);
                                await logAuditEvent('EDIT_TX', 'Bổ sung số HĐ [B4]', `Đã cập nhật số hóa đơn '${newVoucher}' cho chứng từ ID ${item.id}`, activeClient?.id);
                              }
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Bổ sung Số HĐ
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm('Chuyển hình thức thanh toán sang Ủy nhiệm chi / Chuyển khoản (TK 1121)?')) {
                              const tx = await db.transactions.get(item.id);
                              if (tx) {
                                tx.creditAcc = '1121';
                                await db.transactions.put(tx);
                                await logAuditEvent('EDIT_TX', 'Chuyển thanh toán CK [B4]', `Đã chuyển hình thức chi từ tiền mặt sang chuyển khoản TK 1121 cho chứng từ '${item.voucherNo}'`, activeClient?.id);
                              }
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Chuyển sang TK 112 (Chuyển khoản)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsB4ModalOpen(false)}
                className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                Đóng & Cập Nhật Tờ Khai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: 05/KK-TNCN
          ========================================== */}
      {activeTab === 'TNCN' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Cấu Hình Quyết Toán Thuế TNCN (Năm)</h3>
            <div className="w-full sm:w-1/4">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Năm Quyết Toán</label>
              <input
                type="number"
                value={taxYearPIT}
                onChange={e => setTaxYearPIT(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              onClick={handleExportPIT}
              disabled={!activeClient}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Xuất File XML 05/KK-TNCN (eTax)
            </button>
          </div>

          {/* XML Preview */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (05/KK-TNCN)</div>
            <pre>{pitXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

