import React, { useState, useMemo } from 'react';
import { Client, NormalizedTransaction } from '../../types/accounting';
import {
  generateGTGTXML,
  generatePITXML,
  downloadXML,
  txsToVATRows,
  VATRow,
} from '../../services/eTaxXMLGenerator';
import { getAllEmployees, calculatePayrollSummary } from '../../services/payrollService';
import { FileCode, Download, CheckCircle2, AlertCircle, FileText, Layers } from 'lucide-react';

interface ETaxViewProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
}

export const ETaxView: React.FC<ETaxViewProps> = ({ activeClient, transactions }) => {
  const [activeTab, setActiveTab] = useState<'GTGT' | 'TNCN'>('GTGT');

  // State cho 01/GTGT
  const [yearGTGT, setYearGTGT] = useState<number>(2026);
  const [quarterGTGT, setQuarterGTGT] = useState<1 | 2 | 3 | 4>(3);
  const [prevCarryover, setPrevCarryover] = useState<number>(0);
  const [vatRate, setVatRate] = useState<0 | 5 | 8 | 10>(10);

  // State cho 05/KK-TNCN
  const [taxYearPIT, setTaxYearPIT] = useState<number>(2026);

  // Lọc dữ liệu mua vào / bán ra theo quý
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

  // XML 05/KK-TNCN Generated preview
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

  const handleExportGTGT = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất XML!');
      return;
    }
    const filename = `01_GTGT_${activeClient.taxCode}_${yearGTGT}Q${quarterGTGT}.xml`;
    downloadXML(gtgtXmlContent, filename);
  };

  const handleExportPIT = () => {
    if (!activeClient) {
      alert('Vui lòng chọn doanh nghiệp trước khi xuất XML!');
      return;
    }
    const filename = `05_KK_TNCN_${activeClient.taxCode}_${taxYearPIT}.xml`;
    downloadXML(pitXmlContent, filename);
  };

  const fmt = (n: number) => n.toLocaleString('vi-VN');

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
              <h2 className="text-sm font-extrabold text-white">Khai Thuế 電子 (eTax XML)</h2>
              <p className="text-[11px] text-blue-300 mt-0.5">
                Xuất file XML chuẩn Tổng Cục Thuế — Tờ khai 01/GTGT (TT80/2021) & 05/KK-TNCN (TT111/2013)
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
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'GTGT'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" /> Tờ Khai 01/GTGT (Thuế GTGT Quý)
        </button>
        <button
          onClick={() => setActiveTab('TNCN')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TNCN'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" /> Tờ Khai 05/KK-TNCN (Quyết Toán TNCN)
        </button>
      </div>

      {/* Tab 1: 01/GTGT */}
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
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Thuế GTGT Khấu Trừ Kỳ Trước</label>
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
                <span className="text-[10px] text-slate-500 block">Tổng Thuế GTGT Đầu Ra</span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{fmt(outputVATRows.reduce((s, r) => s + r.vatAmount, 0))} đ</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 block">Thuế Khấu Trừ Kỳ Này</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{fmt(inputVATRows.reduce((s, r) => s + r.vatAmount, 0) + prevCarryover)} đ</span>
              </div>
            </div>

            <button
              onClick={handleExportGTGT}
              disabled={!activeClient}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Xuất File XML 01/GTGT
            </button>
          </div>

          {/* XML Preview */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-[11px] overflow-x-auto max-h-[350px]">
            <div className="text-slate-500 text-[10px] uppercase mb-2 font-sans font-bold">Xem Trước Nội Dung XML (01/GTGT)</div>
            <pre>{gtgtXmlContent || '// Chưa chọn doanh nghiệp'}</pre>
          </div>
        </div>
      )}

      {/* Tab 2: 05/KK-TNCN */}
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Xuất File XML 05/KK-TNCN
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
