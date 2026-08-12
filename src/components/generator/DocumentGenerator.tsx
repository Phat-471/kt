import React, { useState, useEffect } from 'react';
import { Client, NormalizedTransaction, VoucherTemplateData } from '../../types/accounting';
import { numberToVietnameseWords, generateVoucherHTML } from '../../services/documentGenerator';
import { Printer, Eye, Save, RotateCcw, Check } from 'lucide-react';

interface DocumentGeneratorProps {
  activeClient: Client | null;
  transactions: NormalizedTransaction[];
}

const DRAFT_KEY = 'accodesk_voucher_draft';

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  activeClient,
  transactions,
}) => {
  const [voucherType, setVoucherType] = useState<'PHIEU_THU' | 'PHIEU_CHI' | 'DE_NGHI_THANH_TOAN' | 'DOI_CHIEU_CONG_NO'>('PHIEU_THU');
  const [selectedTxId, setSelectedTxId] = useState<string>('');

  // Form states
  const [voucherNo, setVoucherNo] = useState('PT-2026-001');
  const [dateStr, setDateStr] = useState('Ngày 10 tháng 08 năm 2026');
  const [personName, setPersonName] = useState('Nguyễn Văn An');
  const [address, setAddress] = useState('Số 45 Lê Duẩn, Q.1, TPHCM');
  const [reason, setReason] = useState('Thu tiền bán hàng đợt 1');
  const [amount, setAmount] = useState<number>(15000000);
  const [amountInWords, setAmountInWords] = useState('');
  const [debitAcc, setDebitAcc] = useState('1111');
  const [creditAcc, setCreditAcc] = useState('131');
  const [attachedDocs, setAttachedDocs] = useState('01');
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.voucherType) setVoucherType(draft.voucherType);
        if (draft.voucherNo) setVoucherNo(draft.voucherNo);
        if (draft.dateStr) setDateStr(draft.dateStr);
        if (draft.personName) setPersonName(draft.personName);
        if (draft.address) setAddress(draft.address);
        if (draft.reason) setReason(draft.reason);
        if (typeof draft.amount === 'number') setAmount(draft.amount);
        if (draft.debitAcc) setDebitAcc(draft.debitAcc);
        if (draft.creditAcc) setCreditAcc(draft.creditAcc);
        if (draft.attachedDocs) setAttachedDocs(draft.attachedDocs);
      }
    } catch (e) {
      console.warn('Cannot load draft from localStorage', e);
    }
  }, []);

  // Save draft whenever inputs change
  useEffect(() => {
    try {
      const draft = {
        voucherType,
        voucherNo,
        dateStr,
        personName,
        address,
        reason,
        amount,
        debitAcc,
        creditAcc,
        attachedDocs,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setIsDraftSaved(true);
      const timer = setTimeout(() => setIsDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Cannot save draft to localStorage', e);
    }
  }, [voucherType, voucherNo, dateStr, personName, address, reason, amount, debitAcc, creditAcc, attachedDocs]);

  const handleResetDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setVoucherNo('PT-2026-001');
    setDateStr('Ngày 10 tháng 08 năm 2026');
    setPersonName('Nguyễn Văn An');
    setAddress('Số 45 Lê Duẩn, Q.1, TPHCM');
    setReason('Thu tiền bán hàng đợt 1');
    setAmount(15000000);
    setDebitAcc('1111');
    setCreditAcc('131');
    setAttachedDocs('01');
    setSelectedTxId('');
  };

  // Auto populate from selected transaction
  useEffect(() => {
    if (selectedTxId) {
      const tx = transactions.find(t => t.id === selectedTxId);
      if (tx) {
        setVoucherNo(tx.voucherNo || 'PT-2026-001');
        setDateStr(`Ngày ${tx.date ? tx.date.split('-')[2] : '10'} tháng ${tx.date ? tx.date.split('-')[1] : '08'} năm ${tx.date ? tx.date.split('-')[0] : '2026'}`);
        setPersonName(tx.partnerName || 'Nguyễn Văn An');
        setReason(tx.description || 'Thu tiền thanh toán');
        setAmount(tx.amount || 0);
        setDebitAcc(tx.debitAcc || '1111');
        setCreditAcc(tx.creditAcc || '131');
        if (tx.type === 'INCOME') setVoucherType('PHIEU_THU');
        else if (tx.type === 'EXPENSE') setVoucherType('PHIEU_CHI');
      }
    }
  }, [selectedTxId, transactions]);

  // Update words on amount change
  useEffect(() => {
    setAmountInWords(numberToVietnameseWords(amount));
  }, [amount]);

  const templateData: VoucherTemplateData = {
    voucherType,
    title: voucherType === 'PHIEU_THU' ? 'PHIẾU THU' : voucherType === 'PHIEU_CHI' ? 'PHIẾU CHI' : 'GIẤY ĐỀ NGHỊ THANH TOÁN',
    companyName: activeClient?.name || 'CÔNG TY TNHH Á CHÂU',
    companyAddress: activeClient?.address || 'Hà Nội',
    companyTaxCode: activeClient?.taxCode || '0101234567',
    voucherNo,
    dateStr,
    personName,
    address,
    reason,
    amount,
    amountInWords,
    attachedDocs,
    debitAcc,
    creditAcc,
  };

  const handlePrint = () => {
    const htmlContent = generateVoucherHTML(templateData);
    // Dùng Blob với encoding UTF-8 tường minh để tránh lỗi vỡ tiếng Việt khi in
    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
          // Giải phóng bộ nhớ sau khi in xong
          URL.revokeObjectURL(blobUrl);
        }, 300);
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Tạo Mẫu Chứng Từ & Văn Bản Kế Toán Tự Động</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>Tự động điền dữ liệu, chuyển đổi số tiền thành chữ Tiếng Việt chuẩn Thông tư 200/2014/TT-BTC.</span>
            {isDraftSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                <Check className="w-3 h-3" /> Đã tự động lưu nháp
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDraft}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all active:scale-95 shrink-0 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Xóa bản nháp hiện tại và đặt lại thông tin mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt Lại Nháp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Chứng Từ (Print / PDF)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs Left */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 text-xs shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm">Thích Ứng Thông Tin Chứng Từ</h3>
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Save className="w-3 h-3 text-brand-500" /> Tự động lưu
            </span>
          </div>

          {/* Quick Transaction Picker */}
          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Nạp dữ liệu từ dòng giao dịch đã có:</label>
            <select
              value={selectedTxId}
              onChange={(e) => setSelectedTxId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-200 font-medium"
            >
              <option value="">-- Chọn chứng từ trong sổ --</option>
              {transactions.slice(0, 30).map(t => (
                <option key={t.id} value={t.id}>{t.voucherNo} | {t.date} | {t.amount.toLocaleString('vi-VN')} đ | {t.partnerName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Loại Mẫu Văn Bản</label>
            <select
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value as any)}
              className="w-full px-3 py-2 bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-500/40 rounded-xl font-bold"
            >
              <option value="PHIEU_THU">Phiếu Thu (Mẫu 01-TT)</option>
              <option value="PHIEU_CHI">Phiếu Chi (Mẫu 02-TT)</option>
              <option value="DE_NGHI_THANH_TOAN">Giấy Đề Nghị Thanh Toán</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số chứng từ</label>
              <input
                type="text"
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Ngày lập phiếu</label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Họ tên người {voucherType === 'PHIEU_THU' ? 'nộp tiền' : 'nhận tiền'}</label>
            <input
              type="text"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Địa chỉ</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Lý do {voucherType === 'PHIEU_THU' ? 'nộp' : 'chi'}</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            ></textarea>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số tiền (VND)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-brand-700 dark:text-brand-300 font-extrabold text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Kèm chứng từ</label>
              <input
                type="text"
                value={attachedDocs}
                onChange={(e) => setAttachedDocs(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số tiền bằng chữ (Tự động)</label>
            <div className="p-3 bg-emerald-50 dark:bg-slate-950 border border-emerald-200 dark:border-slate-800 rounded-xl text-emerald-800 dark:text-emerald-400 font-extrabold italic text-xs">
              {amountInWords}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">TK Nợ</label>
              <input
                type="text"
                value={debitAcc}
                onChange={(e) => setDebitAcc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">TK Có</label>
              <input
                type="text"
                value={creditAcc}
                onChange={(e) => setCreditAcc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Paper Document Preview Right */}
        <div className="lg:col-span-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-400 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Xem Trước Bản In Chứng Từ Kế Toán (Màu Giấy Trắng)
            </span>
            <span className="text-[11px] text-slate-500">Khổ giấy A5/A4 Ngang - Chuẩn BTC</span>
          </div>

          {/* Paper View Container */}
          <div className="bg-white text-slate-900 rounded-xl p-8 shadow-xl font-serif text-sm leading-relaxed overflow-y-auto max-h-[600px] border border-slate-200 select-text">
            <div className="flex justify-between items-start mb-4 text-xs border-b border-slate-200 pb-3">
              <div>
                <div className="font-bold uppercase text-slate-900">{templateData.companyName}</div>
                <div>Địa chỉ: {templateData.companyAddress}</div>
                <div>MST: {templateData.companyTaxCode}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">Mẫu số {voucherType === 'PHIEU_THU' ? '01' : '02'} - TT</div>
                <div className="italic text-[10px] text-slate-600">(Thông tư 200/2014/TT-BTC)</div>
                <div className="mt-1 font-mono">Nợ: {debitAcc} | Có: {creditAcc}</div>
              </div>
            </div>

            <div className="text-center my-6">
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">{templateData.title}</h2>
              <div className="italic text-xs text-slate-600">{dateStr}</div>
              <div className="text-xs font-bold mt-1">Số: {voucherNo}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Họ và tên người {voucherType === 'PHIEU_THU' ? 'nộp' : 'nhận'} tiền:</span>
                <span className="font-bold text-slate-900">{personName}</span>
              </div>
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Địa chỉ:</span>
                <span>{address}</span>
              </div>
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Lý do {voucherType === 'PHIEU_THU' ? 'nộp' : 'chi'}:</span>
                <span>{reason}</span>
              </div>
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Số tiền:</span>
                <span className="font-bold text-base text-slate-900">{amount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Viết bằng chữ:</span>
                <span className="font-bold italic text-slate-900">{amountInWords}</span>
              </div>
              <div className="flex border-b border-dotted border-slate-400 pb-1">
                <span className="w-48 font-medium">Kèm theo:</span>
                <span>{attachedDocs} chứng từ gốc</span>
              </div>
            </div>

            <div className="grid grid-cols-5 text-center text-xs mt-10 font-sans">
              <div>
                <div className="font-bold">Giám đốc</div>
                <div className="italic text-[10px] text-slate-500">(Ký, đóng dấu)</div>
              </div>
              <div>
                <div className="font-bold">Kế toán trưởng</div>
                <div className="italic text-[10px] text-slate-500">(Ký, họ tên)</div>
              </div>
              <div>
                <div className="font-bold">Người lập phiếu</div>
                <div className="italic text-[10px] text-slate-500">(Ký, họ tên)</div>
              </div>
              <div>
                <div className="font-bold">Người {voucherType === 'PHIEU_THU' ? 'nộp' : 'nhận'} tiền</div>
                <div className="italic text-[10px] text-slate-500">(Ký, họ tên)</div>
              </div>
              <div>
                <div className="font-bold">Thủ quỹ</div>
                <div className="italic text-[10px] text-slate-500">(Ký, họ tên)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
