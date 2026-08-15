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
import { auditNonDeductibleExpenses } from '../../services/taxAuditService';
import { db, logAuditEvent } from '../../services/storage';
import { formatCurrency } from '../../utils/formatters';
import { PageHeader, SubTabNav, StatCard, BaseModal } from '../common';
import {
  FileCode,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
  Edit3,
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

  const [yearGTGT, setYearGTGT] = useState<number>(2026);
  const [quarterGTGT, setQuarterGTGT] = useState<1 | 2 | 3 | 4>(3);
  const [prevCarryover, setPrevCarryover] = useState<number>(0);
  const [vatRate, setVatRate] = useState<0 | 5 | 8 | 10>(10);

  const [taxYearPIT, setTaxYearPIT] = useState<number>(2026);

  const [yearTNDN, setYearTNDN] = useState<number>(2026);
  const [quarterTNDN, setQuarterTNDN] = useState<1 | 2 | 3 | 4>(3);
  const [taxRateTNDN, setTaxRateTNDN] = useState<number>(20);
  const [taxLossCarryforward, setTaxLossCarryforward] = useState<number>(0);
  const [taxExemptIncome, setTaxExemptIncome] = useState<number>(0);
  const [taxPrepaid, setTaxPrepaid] = useState<number>(0);

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

  const filteredTxsTNDN = useMemo(() => {
    const fromMonth = (quarterTNDN - 1) * 3 + 1;
    const toMonth = quarterTNDN * 3;
    const fromDate = `${yearTNDN}-${String(fromMonth).padStart(2, '0')}-01`;
    const toDate = `${yearTNDN}-${String(toMonth).padStart(2, '0')}-31`;

    return transactions.filter(t => t.date >= fromDate && t.date <= toDate);
  }, [transactions, yearTNDN, quarterTNDN]);

  const tndnStats = useMemo(() => {
    let rev = 0;
    let exp = 0;

    filteredTxsTNDN.forEach(t => {
      if (t.creditAcc?.startsWith('511') || t.creditAcc?.startsWith('711') || t.type === 'INCOME') {
        rev += t.amount;
      }
      if (
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

    const profit = rev - exp;
    const nonDeductibleAudit = auditNonDeductibleExpenses(filteredTxsTNDN);
    const nonDeductible = nonDeductibleAudit.totalNonDeductibleAmount;
    const assessableIncome = Math.max(0, profit + nonDeductible - taxExemptIncome - taxLossCarryforward);
    const taxIncurred = Math.round(assessableIncome * (taxRateTNDN / 100));
    const taxPayable = Math.max(0, taxIncurred - taxPrepaid);

    return {
      revenue: rev,
      expenses: exp,
      profit,
      nonDeductible,
      assessableIncome,
      taxIncurred,
      taxPayable,
    };
  }, [filteredTxsTNDN, taxExemptIncome, taxLossCarryforward, taxRateTNDN, taxPrepaid]);

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

  const tabs = [
    { id: 'GTGT' as const, label: 'Tờ Khai 01/GTGT (Thuế GTGT Quý)', icon: Layers },
    { id: 'TNDN' as const, label: 'Tờ Khai 01/TNDN (Tạm Tính TNDN Quý)', icon: Building2 },
    { id: 'TNCN' as const, label: 'Tờ Khai 05/KK-TNCN (Quyết Toán TNCN)', icon: FileText },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        icon={FileCode}
        title="Khai Thuế Điện Tử (eTax XML & HTKK)"
        subtitle="Xuất file XML & Excel chuẩn Tổng Cục Thuế — Mẫu 01/GTGT, 01/TNDN (TT80/2021) & 05/KK-TNCN"
        activeClient={activeClient}
        variant="gradient"
      />

      {!activeClient && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Vui lòng chọn doanh nghiệp hoạt động từ thanh tiêu đề hoặc Quản lý Khách hàng trước khi tạo tờ khai XML.</span>
        </div>
      )}

      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id)}
        variant="underline"
      />

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
              <StatCard
                label="HĐ Mua Vào (01-2)"
                value={`${inputVATRows.length} hóa đơn`}
                variant="purple"
                compact
              />
              <StatCard
                label="HĐ Bán Ra (01-1)"
                value={`${outputVATRows.length} hóa đơn`}
                variant="emerald"
                compact
              />
              <StatCard
                label="Tổng Thuế GTGT Đầu Ra [28]"
                value={`${formatCurrency(outputVATRows.reduce((s, r) => s + r.vatAmount, 0))} đ`}
                variant="rose"
                compact
              />
              <StatCard
                label="Thuế Khấu Trừ Kỳ Này [36]"
                value={`${formatCurrency(inputVATRows.reduce((s, r) => s + r.vatAmount, 0) + prevCarryover)} đ`}
                variant="blue"
                compact
              />
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

          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (01/GTGT)</div>
            <pre>{gtgtXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}

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

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <StatCard
                label="Doanh Thu [21]"
                value={`${formatCurrency(tndnStats.revenue)} đ`}
                variant="emerald"
                compact
              />
              <StatCard
                label="Chi Phí [22]"
                value={`${formatCurrency(tndnStats.expenses)} đ`}
                variant="rose"
                compact
              />
              <StatCard
                label="Chi Phí Loại Trừ [24]"
                value={`${formatCurrency(tndnStats.nonDeductible)} đ`}
                variant="amber"
                icon={ShieldAlert}
                compact
                badge={
                  <button
                    onClick={() => setIsB4ModalOpen(true)}
                    className="text-[10px] bg-amber-200/80 hover:bg-amber-300 text-amber-900 font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit3 className="w-2.5 h-2.5" /> Sửa [B4]
                  </button>
                }
              />
              <StatCard
                label="Thu Nhập Tính Thuế [28]"
                value={`${formatCurrency(tndnStats.assessableIncome)} đ`}
                variant="blue"
                compact
              />
              <StatCard
                label="Thuế Còn Phải Nộp [32]"
                value={`${formatCurrency(tndnStats.taxPayable)} đ`}
                variant="purple"
                compact
              />
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

          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (01/TNDN)</div>
            <pre>{tndnXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}

      <BaseModal
        isOpen={isB4ModalOpen}
        onClose={() => setIsB4ModalOpen(false)}
        title="Bóc Tách Chi Phí Bị Loại Thuế TNDN — Chỉ Tiêu [24]/[B4]"
        subtitle={`Quý ${quarterTNDN}/${yearTNDN} — Tổng chi phí bị loại: ${formatCurrency(tndnStats.nonDeductible)} VNĐ (Nguy cơ truy thu 20%: ${formatCurrency(tndnStats.nonDeductible * 0.2)} VNĐ)`}
        icon={ShieldAlert}
        maxWidth="4xl"
        footer={
          <button
            onClick={() => setIsB4ModalOpen(false)}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
          >
            Đóng & Cập Nhật Tờ Khai
          </button>
        }
      >
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
                      {formatCurrency(item.amount)} VNĐ
                    </span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                      Truy thu: +{formatCurrency(item.citTaxLossRisk)} VNĐ
                    </span>
                  </div>
                </div>

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
      </BaseModal>

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

          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (05/KK-TNCN)</div>
            <pre>{pitXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
