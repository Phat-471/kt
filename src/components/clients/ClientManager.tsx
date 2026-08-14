import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Client } from '../../types/accounting';
import { Building2, Plus, Edit2, Trash2, CheckCircle2, User, Phone, MapPin, Calendar, FileText } from 'lucide-react';

interface ClientManagerProps {
  clients: Client[];
  activeClient: Client | null;
  onSelectClient: (client: Client) => void;
  onAddClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({
  clients,
  activeClient,
  onSelectClient,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [financialYear, setFinancialYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingClient(null);
    setCode(`CTY-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setTaxCode('');
    setAddress('');
    setContactName('');
    setPhone('');
    setFinancialYear(2026);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setCode(c.code);
    setName(c.name);
    setTaxCode(c.taxCode);
    setAddress(c.address);
    setContactName(c.contactName || '');
    setPhone(c.phone || '');
    setFinancialYear(c.financialYear);
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !taxCode) return;

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        code,
        name,
        taxCode,
        address,
        contactName,
        phone,
        financialYear: Number(financialYear),
        notes,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddClient({
        code,
        name,
        taxCode,
        address,
        contactName,
        phone,
        financialYear: Number(financialYear),
        notes,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Quản Lý Danh Sách Khách Hàng / Job Kế Toán</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Quản lý tập trung các công ty dịch vụ kế toán. Dữ liệu chứng từ, sao kê và đối chiếu được lưu độc lập theo từng khách hàng.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Khách Hàng Mới</span>
        </button>
      </div>

      {/* Grid of Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {clients.map((c) => {
          const isSelected = activeClient?.id === c.id;
          return (
            <div
              key={c.id}
              className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between shadow-sm ${
                isSelected
                  ? 'bg-gradient-to-br from-brand-50/80 via-white to-white border-brand-300 dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900 dark:border-brand-500/50 shadow-md'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-400 border border-slate-200 dark:border-slate-700 mb-1.5">
                      Mã: {c.code}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">{c.name}</h3>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đang chọn
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 my-4 border-t border-b border-slate-100 dark:border-slate-800/80 py-3">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-300 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Mã Số Thuế: <strong className="text-slate-900 dark:text-slate-200">{c.taxCode}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Niên độ kế toán: <strong>{c.financialYear}</strong></span>
                  </div>
                  {c.contactName && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Liên hệ: {c.contactName} {c.phone && `(${c.phone})`}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{c.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  onClick={() => onSelectClient(c)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-100 text-brand-800 border border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 cursor-default border-brand-500/30'
                      : 'bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {isSelected ? 'Đang làm việc' : 'Chọn làm Job chính'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Sửa thông tin"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xoá khách hàng "${c.name}"?`)) {
                        onDeleteClient(c.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Xoá khách hàng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col animate-scale-up">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {editingClient ? 'Chỉnh Sửa Thông Tin Khách Hàng' : 'Thêm Khách Hàng / Job Mới'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Mã quản lý</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                    placeholder="VD: CTY-001"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Mã Số Thuế (MST)</label>
                  <input
                    type="text"
                    required
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                    placeholder="VD: 0101234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Tên Doanh Nghiệp / Khách Hàng</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                  placeholder="Công ty TNHH..."
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Địa chỉ trụ sở</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  placeholder="Địa chỉ công ty..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Người liên hệ</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                    placeholder="Tên kế toán trưởng..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                    placeholder="09xx..."
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Niên độ</label>
                  <input
                    type="number"
                    required
                    value={financialYear}
                    onChange={(e) => setFinancialYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-bold mb-1">Ghi chú công việc</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  placeholder="Ghi chú về gói dịch vụ, hạn nộp báo cáo..."
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 cursor-pointer"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
