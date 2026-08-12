import React, { useState, useCallback } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, Save, X, Trash2, FolderOpen, FileText } from 'lucide-react';
import { NormalizedTransaction } from '../../types/accounting';
import { parseXMLInvoice } from '../../services/xmlInvoiceParser';
import { db } from '../../services/storage';

interface InvoiceXMLImporterProps {
  clientId: string;
  clientTaxCode: string;
}

interface ParsedInvoice {
  file: File;
  transaction: NormalizedTransaction | null;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
}

export function InvoiceXMLImporter({ clientId, clientTaxCode }: InvoiceXMLImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedInvoices, setParsedInvoices] = useState<ParsedInvoice[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: number, error: number, total: number } | null>(null);

  // XML Web Worker Progress State for >1000 files
  const [progressState, setProgressState] = useState<{
    current: number;
    total: number;
    successCount: number;
    errorCount: number;
    currentFileName: string;
    isPaused: boolean;
  }>({
    current: 0,
    total: 0,
    successCount: 0,
    errorCount: 0,
    currentFileName: '',
    isPaused: false,
  });

  const workerRef = React.useRef<Worker | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.xml') || name.endsWith('.pdf');
    });
    
    if (validFiles.length === 0) {
      alert('Vui lòng chọn file hoặc thư mục chứa hóa đơn điện tử (.xml, .pdf)');
      return;
    }

    // Nhóm file theo tên gốc (bỏ đuôi)
    const fileGroups: Record<string, { xml?: File, pdf?: File }> = {};
    for (const f of validFiles) {
      const name = f.name.toLowerCase();
      const baseName = name.replace(/\.(xml|pdf)$/, '');
      if (!fileGroups[baseName]) fileGroups[baseName] = {};
      if (name.endsWith('.xml')) fileGroups[baseName].xml = f;
      if (name.endsWith('.pdf')) fileGroups[baseName].pdf = f;
    }

    setIsProcessing(true);

    // Prepare data for worker
    const workerData = await Promise.all(
      Object.entries(fileGroups).map(async ([baseName, group]) => {
        let xmlText = null;
        if (group.xml) {
          xmlText = await group.xml.text();
        }
        return {
          xmlName: group.xml?.name,
          xmlText: xmlText,
          pdfName: group.pdf?.name,
          pdfPath: (group.pdf as any)?.path
        };
      })
    );

    setIsProcessing(true);
    setProgressState({
      current: 0,
      total: workerData.length,
      successCount: 0,
      errorCount: 0,
      currentFileName: '',
      isPaused: false,
    });

    // Load worker
    const InvoiceWorker = new Worker(new URL('../../workers/invoiceWorker.ts', import.meta.url), {
      type: 'module'
    });
    workerRef.current = InvoiceWorker;

    InvoiceWorker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        setProgressState(prev => ({
          ...prev,
          current: e.data.current,
          total: e.data.total,
          successCount: e.data.successCount,
          errorCount: e.data.errorCount,
          currentFileName: e.data.currentFileName || '',
        }));
      } else if (e.data.type === 'DONE' || e.data.type === 'CANCELLED') {
        const results = e.data.results || [];
        
        // Map results back to files
        const newInvoices: ParsedInvoice[] = results.map((res: any) => {
          const originalGroup = fileGroups[res.xmlName?.replace(/\.(xml|pdf)$/i, '') || res.pdfName?.replace(/\.(xml|pdf)$/i, '')];
          
          return {
            file: originalGroup?.xml || originalGroup?.pdf,
            transaction: res.transaction,
            status: res.status,
            errorMessage: res.errorMessage
          };
        });

        setParsedInvoices(prev => [...prev, ...newInvoices]);
        setIsProcessing(false);
        InvoiceWorker.terminate();
        workerRef.current = null;
      }
    };

    InvoiceWorker.postMessage({
      type: 'START',
      files: workerData,
      clientId,
      clientTaxCode
    });
  };

  const handlePauseWorker = () => {
    if (!workerRef.current) return;
    if (progressState.isPaused) {
      workerRef.current.postMessage({ type: 'RESUME' });
      setProgressState(prev => ({ ...prev, isPaused: false }));
    } else {
      workerRef.current.postMessage({ type: 'PAUSE' });
      setProgressState(prev => ({ ...prev, isPaused: true }));
    }
  };

  const handleCancelWorker = () => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'CANCEL' });
    setIsProcessing(false);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [clientId, clientTaxCode]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeInvoice = (index: number) => {
    setParsedInvoices(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setParsedInvoices([]);
  };

  const saveToDatabase = async () => {
    const validTransactions = parsedInvoices
      .filter(inv => inv.status === 'SUCCESS' && inv.transaction)
      .map(inv => inv.transaction as NormalizedTransaction);

    if (validTransactions.length === 0) return;

    setIsSaving(true);
    try {
      await db.transactions.bulkAdd(validTransactions);
      
      // Log audit
      if (db.auditLogs) {
        await db.auditLogs.add({
          id: crypto.randomUUID(),
          clientId,
          timestamp: new Date().toISOString(),
          action: 'IMPORT_EXCEL',
          actionTitle: 'Import Hóa Đơn XML',
          details: `Đã import thành công ${validTransactions.length} hóa đơn điện tử`,
          userName: 'Kế toán viên'
        });
      }

      const successCount = validTransactions.length;
      const errorCount = parsedInvoices.length - successCount;
      setSaveResult({ success: successCount, error: errorCount, total: parsedInvoices.length });
      
      // Auto hide after 5s
      setTimeout(() => setSaveResult(null), 5000);
      
      clearAll();
    } catch (error) {
      console.error('Lỗi khi lưu hóa đơn:', error);
      alert('Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = parsedInvoices.filter(i => i.status === 'SUCCESS').length;

  return (
    <div className="relative">
      {saveResult && (
        <div className="absolute top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 p-4 bg-white rounded-xl border border-emerald-200 shadow-xl shadow-emerald-500/10">
          <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Lưu thành công!</h4>
            <p className="text-sm text-slate-600 mt-0.5">
              Đã ghi sổ <strong className="text-emerald-600">{saveResult.success}</strong> hóa đơn hợp lệ.
              {saveResult.error > 0 && (
                <span className="text-rose-500 ml-1">Đã bỏ qua {saveResult.error} file lỗi.</span>
              )}
            </p>
          </div>
          <button onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-600" />
            Đọc Hóa Đơn Điện Tử (XML)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kéo thả các file hóa đơn XML chuẩn Tổng cục Thuế để tự động ghi sổ</p>
        </div>
        {parsedInvoices.length > 0 && (
          <div className="flex gap-2">
            <button 
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={saveToDatabase}
              disabled={validCount === 0 || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Đang lưu...' : `Lưu ${validCount} hóa đơn`}
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        {parsedInvoices.length === 0 ? (
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Kéo thả file XML hóa đơn vào đây</h3>
            <p className="text-slate-500 mb-6">hoặc chọn file từ máy tính của bạn</p>
            
            {isProcessing ? (
              <div className="max-w-md mx-auto space-y-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                    Đang xử lý XML song song Web Worker...
                  </span>
                  <span>{Math.round((progressState.current / (progressState.total || 1)) * 100)}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full transition-all duration-200"
                    style={{ width: `${Math.round((progressState.current / (progressState.total || 1)) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                  <span>Đã đọc: {progressState.current} / {progressState.total} file</span>
                  <span className="text-emerald-600 font-bold">Thành công: {progressState.successCount}</span>
                  <span className="text-rose-600 font-bold">Lỗi: {progressState.errorCount}</span>
                </div>

                <div className="text-[11px] text-slate-400 truncate italic">
                  Đang đọc: {progressState.currentFileName || 'Đang nạp tập tin...'}
                </div>

                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={handlePauseWorker}
                    className="px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    {progressState.isPaused ? '▶ Tiếp Tục' : '⏸ Tạm Dừng'}
                  </button>
                  <button
                    onClick={handleCancelWorker}
                    className="px-3 py-1 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    ⏹ Hủy Quét
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <FileCode className="w-5 h-5" />
                Chọn file XML
                <input 
                  type="file" 
                  multiple 
                  accept=".xml" 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
              </label>
              
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm">
                <FolderOpen className="w-5 h-5" />
                Quét Thư mục
                <input 
                  type="file" 
                  {...{ webkitdirectory: "", directory: "" } as any}
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
              </label>
            </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-slate-800">Danh sách hóa đơn đã đọc ({parsedInvoices.length})</h3>
              <div className="flex gap-3">
                <label className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  + Thêm file
                  <input 
                    type="file" 
                    multiple 
                    accept=".xml" 
                    className="hidden" 
                    onChange={handleFileSelect} 
                  />
                </label>
                <label className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  + Quét thư mục
                  <input 
                    type="file" 
                    {...{ webkitdirectory: "", directory: "" } as any}
                    className="hidden" 
                    onChange={handleFileSelect} 
                  />
                </label>
              </div>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Số HĐ</th>
                    <th className="px-4 py-3 font-medium">Ngày lập</th>
                    <th className="px-4 py-3 font-medium">Đối tác</th>
                    <th className="px-4 py-3 font-medium text-right">Tổng tiền</th>
                    <th className="px-4 py-3 font-medium text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedInvoices.map((inv, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        {inv.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-medium" title={inv.errorMessage}>
                            <AlertCircle className="w-3 h-3" /> Lỗi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800 max-w-[150px] truncate" title={inv.file.name}>
                        <div className="flex items-center gap-1.5">
                          {inv.file.name}
                          {inv.transaction?.rawRow?.hasPdf && (
                            <span title="Có đính kèm PDF" className="text-rose-500 bg-rose-50 p-1 rounded-md">
                              <FileText className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {inv.transaction?.voucherNo || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {inv.transaction?.date || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={inv.transaction?.partnerName}>
                        {inv.transaction?.partnerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium text-right">
                        {inv.transaction?.amount ? new Intl.NumberFormat('vi-VN').format(inv.transaction.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => removeInvoice(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa khỏi danh sách"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
