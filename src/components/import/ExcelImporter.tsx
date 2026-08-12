import React, { useState } from 'react';
import { Client, ColumnMapping, MappingTemplate, NormalizedTransaction, TransactionType } from '../../types/accounting';
import { parseExcelFile, normalizeExcelRows, ExcelSheetParseResult } from '../../services/excelService';
import { UploadCloud, FileSpreadsheet, Layers, ArrowRight, CheckCircle, Save, Table as TableIcon } from 'lucide-react';

interface ExcelImporterProps {
  activeClient: Client | null;
  mappingTemplates: MappingTemplate[];
  onSaveTransactions: (transactions: NormalizedTransaction[]) => void;
  onSaveTemplate: (template: Omit<MappingTemplate, 'id' | 'createdAt'>) => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  activeClient,
  mappingTemplates,
  onSaveTransactions,
  onSaveTemplate,
}) => {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ExcelSheetParseResult | null>(null);
  
  // Mapping options
  const [txType, setTxType] = useState<TransactionType>('GENERAL');
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: '',
    voucherNoCol: '',
    descriptionCol: '',
    debitAccCol: '',
    creditAccCol: '',
    amountCol: '',
    partnerNameCol: '',
    partnerTaxCodeCol: '',
    bankAccCol: '',
  });

  const [templateName, setTemplateName] = useState('');
  const [previewNormalized, setPreviewNormalized] = useState<NormalizedTransaction[]>([]);
  const [step, setStep] = useState<'UPLOAD' | 'MAP' | 'PREVIEW'>('UPLOAD');
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return !!localStorage.getItem('accodesk_excel_import_draft');
  });

  // Tự động lưu bản nháp Import vào localStorage khi đổi state
  React.useEffect(() => {
    if (fileName && parseResult && parseResult.rawRows.length > 0) {
      const draftData = {
        fileName,
        txType,
        mapping,
        step,
        selectedSheet: parseResult.selectedSheet,
        headers: parseResult.headers,
        rawRows: parseResult.rawRows.slice(0, 500), // lưu tối đa 500 dòng mẫu
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('accodesk_excel_import_draft', JSON.stringify(draftData));
      setHasDraft(true);
    }
  }, [fileName, txType, mapping, step, parseResult]);

  // Khôi phục bản nháp import dở dang
  const handleRestoreDraft = () => {
    const raw = localStorage.getItem('accodesk_excel_import_draft');
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      setFileName(draft.fileName || 'File_Excel_Nhap_Da_Luu.xlsx');
      setTxType(draft.txType || 'GENERAL');
      setMapping(draft.mapping);
      setParseResult({
        sheetNames: [draft.selectedSheet || 'Sheet1'],
        selectedSheet: draft.selectedSheet || 'Sheet1',
        headers: draft.headers || [],
        rawRows: draft.rawRows || [],
      });
      setStep(draft.step || 'MAP');
      alert(`Đã khôi phục thành công phiên làm việc dở dang của tệp '${draft.fileName}'!`);
    } catch (err) {
      alert('Không thể đọc bản nháp cũ!');
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('accodesk_excel_import_draft');
    setHasDraft(false);
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readSelectedFile(file);
  };

  const readSelectedFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        setFileBuffer(buffer);
        const result = parseExcelFile(buffer);
        setParseResult(result);
        autoDetectMapping(result.headers);
        setStep('MAP');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Auto detect columns by standard keywords
  const autoDetectMapping = (headers: string[]) => {
    const findCol = (keywords: string[]) => {
      return headers.find(h => keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))) || '';
    };

    setMapping({
      dateCol: findCol(['ngày', 'date', 'time', 'thời gian']),
      voucherNoCol: findCol(['số chứng từ', 'số ct', 'số hđ', 'số phiếu', 'voucher', 'invoice']),
      descriptionCol: findCol(['diễn giải', 'nội dung', 'lý do', 'description', 'ghi chú']),
      debitAccCol: findCol(['tk nợ', 'nợ', 'debit']),
      creditAccCol: findCol(['tk có', 'có', 'credit']),
      amountCol: findCol(['số tiền', 'tiền', 'giao dịch', 'amount', '발생금액']),
      partnerNameCol: findCol(['tên đối tác', 'đối tượng', 'người nộp', 'người nhận', 'khách hàng', 'đối ứng']),
      partnerTaxCodeCol: findCol(['mã số thuế', 'mst', 'tax code']),
      bankAccCol: findCol(['tài khoản', 'stk', 'số tk']),
    });
  };

  // Select Sheet
  const handleSheetChange = (sheetName: string) => {
    if (fileBuffer) {
      const result = parseExcelFile(fileBuffer, sheetName);
      setParseResult(result);
      autoDetectMapping(result.headers);
    }
  };

  // Load Template
  const handleSelectTemplate = (templateId: string) => {
    const tmpl = mappingTemplates.find(t => t.id === templateId);
    if (tmpl) {
      setMapping(tmpl.mapping);
    }
  };

  // Save Current Mapping as Template
  const handleSaveCurrentAsTemplate = () => {
    if (!templateName.trim()) {
      alert('Vui lòng nhập tên mẫu mapping!');
      return;
    }
    onSaveTemplate({
      name: templateName.trim(),
      mapping,
      clientId: activeClient?.id,
    });
    setTemplateName('');
    alert('Đã lưu mẫu ánh xạ cột thành công!');
  };

  // Generate Normalized Preview
  const handleGeneratePreview = () => {
    if (!activeClient) {
      alert('Vui lòng chọn Khách hàng/Job ở phía trên trước khi import!');
      return;
    }
    if (!parseResult || parseResult.rawRows.length === 0) return;

    const normalized = normalizeExcelRows(
      activeClient.id,
      fileName,
      parseResult.rawRows,
      mapping,
      txType
    );

    setPreviewNormalized(normalized);
    setStep('PREVIEW');
  };

  // Save to DB
  const handleConfirmImport = () => {
    if (previewNormalized.length === 0) return;
    onSaveTransactions(previewNormalized);
    alert(`Đã import thành công ${previewNormalized.length} dòng chứng từ vào hệ thống!`);
    handleClearDraft();
    setStep('UPLOAD');
    setFileBuffer(null);
    setParseResult(null);
    setPreviewNormalized([]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Step Stepper Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Import File Excel & Chuẩn Hoá Dữ Liệu</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Đọc file Excel (.xlsx, .xls, .csv), ánh xạ linh hoạt cột dữ liệu theo mẫu</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-3 py-1 rounded-lg font-bold ${step === 'UPLOAD' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            1. Tải File
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={`px-3 py-1 rounded-lg font-bold ${step === 'MAP' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            2. Map Cột
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className={`px-3 py-1 rounded-lg font-bold ${step === 'PREVIEW' ? 'bg-brand-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            3. Xử Lý & Nhập
          </span>
        </div>
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {step === 'UPLOAD' && (
        <div className="space-y-4">
          {hasDraft && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-500/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">Phát hiện phiên làm việc Import Excel chưa hoàn tất!</h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Hệ thống đã tự động lưu lại nháp tệp và cấu hình map cột khi bạn đổi tab. Bạn có muốn tiếp tục không?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestoreDraft}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
                >
                  Khôi Phục Nháp
                </button>
                <button
                  onClick={handleClearDraft}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Bỏ Qua
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-3xl p-12 text-center transition-all flex flex-col items-center justify-center gap-4 shadow-sm group">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">Kéo & Thả tệp Excel (.xlsx, .xls, .csv) vào đây</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hoặc bấm nút phía dưới để chọn tệp từ máy tính</p>
            </div>

            <label className="cursor-pointer px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95">
              <span>Chọn Tệp Excel Từ Máy Tính</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: MAP COLUMNS */}
      {step === 'MAP' && parseResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapping Controls Left */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Cấu Hình Ánh Xạ Cột (Column Mapping)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">File: <strong className="text-brand-600 dark:text-brand-400 font-bold">{fileName}</strong> ({parseResult.rawRows.length} dòng)</p>
              </div>

              {/* Sheet Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chọn Sheet:</span>
                <select
                  value={parseResult.selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-200"
                >
                  {parseResult.sheetNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Selector */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">Mẫu Map sẵn:</span>
                <select
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-200"
                >
                  <option value="">-- Chọn mẫu đã lưu --</option>
                  {mappingTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Type Select */}
              <div className="flex items-center gap-2">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Loại chứng từ:</span>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as TransactionType)}
                  className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-500/40 rounded-lg text-xs font-bold"
                >
                  <option value="GENERAL">Nhật ký chung / Khác</option>
                  <option value="INCOME">Phiếu Thu (Sổ tiền mặt/ngân hàng)</option>
                  <option value="EXPENSE">Phiếu Chi (Sổ tiền mặt/ngân hàng)</option>
                  <option value="BANK_STMT">Sao kê Ngân hàng</option>
                  <option value="DEBT">Bảng kê Công nợ đối tác</option>
                </select>
              </div>
            </div>

            {/* Column Mapping Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Ngày chứng từ (*)</label>
                <select
                  value={mapping.dateCol}
                  onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số chứng từ / Hóa đơn (*)</label>
                <select
                  value={mapping.voucherNoCol}
                  onChange={(e) => setMapping({ ...mapping, voucherNoCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Diễn giải / Nội dung giao dịch (*)</label>
                <select
                  value={mapping.descriptionCol}
                  onChange={(e) => setMapping({ ...mapping, descriptionCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số tiền giao dịch (VND) (*)</label>
                <select
                  value={mapping.amountCol}
                  onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Tài khoản Nợ</label>
                <select
                  value={mapping.debitAccCol}
                  onChange={(e) => setMapping({ ...mapping, debitAccCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Tài khoản Có</label>
                <select
                  value={mapping.creditAccCol}
                  onChange={(e) => setMapping({ ...mapping, creditAccCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Tên Đối Tác / Người nhận-nộp</label>
                <select
                  value={mapping.partnerNameCol}
                  onChange={(e) => setMapping({ ...mapping, partnerNameCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Mã Số Thuế Đối Tác</label>
                <select
                  value={mapping.partnerTaxCodeCol}
                  onChange={(e) => setMapping({ ...mapping, partnerTaxCodeCol: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Bỏ qua / Không chọn --</option>
                  {parseResult.headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Save Template Section */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nhập tên để lưu mẫu map (VD: Mẫu Sao kê Vietcombank)..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium"
              />
              <button
                type="button"
                onClick={handleSaveCurrentAsTemplate}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Lưu Mẫu Map</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setStep('UPLOAD')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Trở lại Tải File
              </button>
              <button
                onClick={handleGeneratePreview}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Tiếp Tục Xử Lý & Xem Trước</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Excel Live Sample Table Right */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-sm">
            <div>
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-300 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Xem Trước 5 Dòng Đầu Từ File Excel</span>
              </h4>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      {parseResult.headers.slice(0, 4).map(h => (
                        <th key={h} className="p-2 truncate max-w-[100px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {parseResult.rawRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {parseResult.headers.slice(0, 4).map(h => (
                          <td key={h} className="p-2 truncate max-w-[100px]">{String(row[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & CONFIRM IMPORT */}
      {step === 'PREVIEW' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Kết Quả Chuẩn Hoá Dữ Liệu ({previewNormalized.length} dòng chứng từ)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Các lỗi dữ liệu đã được hệ thống tự động kiểm tra và đánh nhãn bên dưới</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('MAP')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Chỉnh Sửa Map Cột
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Xác Nhận Lưu Vào Hệ Thống
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[450px]">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">STT</th>
                  <th className="p-3">Ngày CT</th>
                  <th className="p-3">Số CT</th>
                  <th className="p-3">Diễn giải</th>
                  <th className="p-3">TK Nợ</th>
                  <th className="p-3">TK Có</th>
                  <th className="p-3 text-right">Số tiền (VND)</th>
                  <th className="p-3">Đối tác / MST</th>
                  <th className="p-3">Trạng thái lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                {previewNormalized.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-200">{t.date || '---'}</td>
                    <td className="p-3 text-brand-700 dark:text-brand-300 font-bold">{t.voucherNo || '---'}</td>
                    <td className="p-3 max-w-xs truncate">{t.description || '---'}</td>
                    <td className="p-3 text-amber-700 dark:text-amber-300 font-mono font-bold">{t.debitAcc || '---'}</td>
                    <td className="p-3 text-emerald-700 dark:text-emerald-300 font-mono font-bold">{t.creditAcc || '---'}</td>
                    <td className="p-3 text-right font-extrabold tabular-num text-slate-900 dark:text-slate-100">{t.amount.toLocaleString('vi-VN')} đ</td>
                    <td className="p-3 text-slate-800 dark:text-slate-300">
                      <div className="font-bold">{t.partnerName || '---'}</div>
                      <div className="text-[10px] text-slate-500">{t.partnerTaxCode}</div>
                    </td>
                    <td className="p-3">
                      {t.validationStatus === 'ERROR' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/30">
                          Có Lỗi ({t.errors.length})
                        </span>
                      ) : t.validationStatus === 'WARNING' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30">
                          Cảnh Báo ({t.errors.length})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30">
                          Hợp Lệ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
