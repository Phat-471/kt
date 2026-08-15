import React, { useState } from 'react';
import { Client } from '../../types/accounting';
import { Building2, Plus, Sparkles } from 'lucide-react';
import { db, logAuditEvent } from '../../services/storage';
import { BaseModal } from '../common';

interface QuickCreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (client: Client) => void;
}

export const QuickCreateClientModal: React.FC<QuickCreateClientModalProps> = ({
  isOpen,
  onClose,
  onClientCreated,
}) => {
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [address, setAddress] = useState('');
  const [accountingStandard, setAccountingStandard] = useState<'TT200' | 'TT133' | 'TT88_HKD'>('TT200');
  const [financialYear, setFinancialYear] = useState<number>(2026);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !taxCode.trim()) {
      alert('Vui lòng nhập Tên Doanh Nghiệp và Mã Số Thuế!');
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        code: `CTY-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim(),
        taxCode: taxCode.trim(),
        address: address.trim() || 'Việt Nam',
        financialYear: Number(financialYear),
        accountingStandard,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.clients.add(newClient);
      await logAuditEvent('CREATE_CLIENT', 'Tạo nhanh doanh nghiệp/job', `Đã tạo nhanh doanh nghiệp '${newClient.name}' (MST: ${newClient.taxCode})`, newClient.id);

      if (onClientCreated) {
        onClientCreated(newClient);
      }
      onClose();
    } catch (err: any) {
      alert('Lỗi tạo doanh nghiệp: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (presetName: string, presetMST: string, presetStandard: 'TT200' | 'TT133' | 'TT88_HKD') => {
    setName(presetName);
    setTaxCode(presetMST);
    setAccountingStandard(presetStandard);
    setAddress('Hà Nội, Việt Nam');
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Mới Khách Hàng / Job Kế Toán"
      subtitle="Khởi tạo hồ sơ công ty để nạp chứng từ và báo cáo tài chính"
      icon={Building2}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-500" /> Mẫu nhanh:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('Công ty TNHH Đầu Tư & Phát Triển An Phát', '0101234567', 'TT200')}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            🏢 An Phát (TT200)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('Công ty CP Thương Mại & Dịch Vụ Sao Việt', '0301234567', 'TT133')}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            🏬 Sao Việt (TT133)
          </button>
        </div>

        <form onSubmit={handleQuickCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên Doanh Nghiệp / Đơn Vị <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Công ty TNHH Giải Pháp Công Nghệ Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mã Số Thuế (MST) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: 0109988776"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chế Độ Kế Toán
              </label>
              <select
                value={accountingStandard}
                onChange={(e) => setAccountingStandard(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="TT200">Thông tư 200 (DN Lớn/Vừa)</option>
                <option value="TT133">Thông tư 133 (DN Nhỏ & Vừa)</option>
                <option value="TT88_HKD">Thông tư 88 (Hộ Kinh Doanh)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Địa Chỉ Trụ Sở
              </label>
              <input
                type="text"
                placeholder="VD: Quận Cầu Giấy, Hà Nội"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Niên Độ
              </label>
              <input
                type="number"
                value={financialYear}
                onChange={(e) => setFinancialYear(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo & Chọn Ngay</span>
            </button>
          </div>
        </form>
      </div>
    </BaseModal>
  );
};
