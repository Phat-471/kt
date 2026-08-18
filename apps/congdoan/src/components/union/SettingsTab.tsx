import React, { useState, useRef, useMemo } from 'react';
import { UnionSignerSettings, UnionEmployee } from '../../types/accounting';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Users, 
  FileSignature, 
  CheckCircle2, 
  Database, 
  Download, 
  UploadCloud, 
  AlertCircle,
  Pencil,
  Check,
  X,
  Search,
  Coins,
  Landmark
} from 'lucide-react';
import { exportUnionBackupJSON, importUnionBackupJSON, UnionOpeningBalance } from '../../services/storage';
import { formatNumber } from '../../utils/formatters';

interface SettingsTabProps {
  signerSettings: UnionSignerSettings;
  onSaveSignerSettings: (settings: UnionSignerSettings) => Promise<void>;
  employees: UnionEmployee[];
  onAddEmployee: (emp: Omit<UnionEmployee, 'id'>) => Promise<void>;
  onUpdateEmployee?: (emp: UnionEmployee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  openingBalances?: { [year: number]: { cash: number; bank: number } };
  onSaveOpeningBalance?: (year: number, cash: number, bank: number) => Promise<void>;
}

interface OpeningBalancesTableProps {
  openingBalances?: { [year: number]: { cash: number; bank: number } };
  onSaveOpeningBalance?: (year: number, cash: number, bank: number) => Promise<void>;
}

const OpeningBalancesTable: React.FC<OpeningBalancesTableProps> = ({
  openingBalances = {},
  onSaveOpeningBalance
}) => {
  const years = useMemo(() => {
    const list = Object.keys(openingBalances).map(Number).sort((a, b) => a - b);
    if (!list.includes(2023)) list.unshift(2023);
    if (!list.includes(2024)) list.push(2024);
    if (!list.includes(2025)) list.push(2025);
    if (!list.includes(2026)) list.push(2026);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [openingBalances]);

  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [cashVal, setCashVal] = useState<number>(0);
  const [bankVal, setBankVal] = useState<number>(0);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Thêm năm mới
  const [newYear, setNewYear] = useState<number>(2027);
  const [newCash, setNewCash] = useState<number>(0);
  const [newBank, setNewBank] = useState<number>(0);
  const [isAddingYear, setIsAddingYear] = useState<boolean>(false);

  const handleStartEdit = (y: number) => {
    setEditingYear(y);
    setCashVal(openingBalances[y]?.cash || 0);
    setBankVal(openingBalances[y]?.bank || 0);
  };

  const handleSave = async (y: number) => {
    if (onSaveOpeningBalance) {
      await onSaveOpeningBalance(y, cashVal, bankVal);
      setSaveSuccess(`Đã lưu số dư đầu kỳ năm ${y}!`);
      setTimeout(() => setSaveSuccess(null), 2500);
    }
    setEditingYear(null);
  };

  const handleAddYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear || newYear < 2000) return;
    if (onSaveOpeningBalance) {
      await onSaveOpeningBalance(newYear, newCash, newBank);
      setSaveSuccess(`Đã thêm số dư đầu kỳ năm ${newYear}!`);
      setTimeout(() => setSaveSuccess(null), 2500);
    }
    setIsAddingYear(false);
    setNewYear(prev => prev + 1);
    setNewCash(0);
    setNewBank(0);
  };

  return (
    <div className="space-y-4">
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <th className="p-2.5 font-bold text-center w-24">Niên Độ (Năm)</th>
              <th className="p-2.5 font-bold text-right">Tồn Tiền Mặt Đầu Kỳ (S11-H)</th>
              <th className="p-2.5 font-bold text-right">Tồn Ngân Hàng Đầu Kỳ (S12-H)</th>
              <th className="p-2.5 font-bold text-right">Tổng Quỹ Đầu Kỳ</th>
              <th className="p-2.5 font-bold text-center w-28">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {years.map(y => {
              const current = openingBalances[y] || { cash: 0, bank: 0 };
              const isEditing = editingYear === y;

              if (isEditing) {
                return (
                  <tr key={y} className="bg-amber-50/50">
                    <td className="p-2.5 text-center font-bold font-mono text-slate-800">{y}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={cashVal}
                        onChange={(e) => setCashVal(Number(e.target.value) || 0)}
                        className="w-full p-1.5 border border-amber-300 rounded font-mono font-bold text-right text-xs bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={bankVal}
                        onChange={(e) => setBankVal(Number(e.target.value) || 0)}
                        className="w-full p-1.5 border border-amber-300 rounded font-mono font-bold text-right text-xs bg-white focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-slate-700">
                      {formatNumber(cashVal + bankVal)} đ
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSave(y)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                        <button
                          onClick={() => setEditingYear(null)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={y} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 text-center font-bold font-mono text-blue-700 bg-blue-50/30">{y}</td>
                  <td className="p-2.5 text-right font-mono font-semibold text-amber-800">
                    {formatNumber(current.cash)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold text-sky-800">
                    {formatNumber(current.bank)} đ
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {formatNumber((current.cash || 0) + (current.bank || 0))} đ
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleStartEdit(y)}
                      className="px-2.5 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Sửa</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Thêm niên độ mới */}
      {!isAddingYear ? (
        <button
          onClick={() => setIsAddingYear(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm Số Dư Cho Năm Mới</span>
        </button>
      ) : (
        <form onSubmit={handleAddYearSubmit} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2 text-xs">
          <div className="font-bold text-amber-900">Thêm Số Dư Đầu Kỳ Cho Năm Mới:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Năm:</label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value) || 2027)}
                className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tồn Tiền Mặt Đầu Kỳ (đ):</label>
              <input
                type="number"
                value={newCash}
                onChange={(e) => setNewCash(Number(e.target.value) || 0)}
                className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tồn Ngân Hàng Đầu Kỳ (đ):</label>
              <input
                type="number"
                value={newBank}
                onChange={(e) => setNewBank(Number(e.target.value) || 0)}
                className="w-full p-1.5 border border-slate-300 rounded font-mono font-bold bg-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm"
            >
              Lưu Năm {newYear}
            </button>
            <button
              type="button"
              onClick={() => setIsAddingYear(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  signerSettings,
  onSaveSignerSettings,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  openingBalances,
  onSaveOpeningBalance,
}) => {
  const [formData, setFormData] = useState<UnionSignerSettings>(signerSettings);
  const [isSaved, setIsSaved] = useState(false);
  const [backupStatus, setBackupStatus] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' } | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    try {
      await exportUnionBackupJSON();
      setBackupStatus({ message: 'Đã xuất file sao lưu thành công! Hãy lưu file này vào USB/Google Drive để mang sang máy khác.', type: 'SUCCESS' });
    } catch (e: any) {
      setBackupStatus({ message: `Lỗi xuất file: ${e?.message}`, type: 'ERROR' });
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await importUnionBackupJSON(file);
    if (res.success) {
      setBackupStatus({ message: res.message, type: 'SUCCESS' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setBackupStatus({ message: res.message, type: 'ERROR' });
    }
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };

  // Add Employee Form State
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');

  // Edit Employee State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editEmpCode, setEditEmpCode] = useState('');
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpDept, setEditEmpDept] = useState('');

  // Search Employee Filter
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(e => 
      e.code.toLowerCase().includes(q) || 
      e.fullName.toLowerCase().includes(q) || 
      (e.department || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const handleSaveSigners = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSignerSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpCode || !newEmpName) return;
    await onAddEmployee({
      code: newEmpCode.trim(),
      fullName: newEmpName.trim(),
      department: newEmpDept.trim() || 'CĐCS',
      isActive: true,
    });
    setNewEmpCode('');
    setNewEmpName('');
    setNewEmpDept('');
  };

  const handleStartEdit = (emp: UnionEmployee) => {
    setEditingEmpId(emp.id);
    setEditEmpCode(emp.code);
    setEditEmpName(emp.fullName);
    setEditEmpDept(emp.department || 'CĐCS');
  };

  const handleCancelEdit = () => {
    setEditingEmpId(null);
    setEditEmpCode('');
    setEditEmpName('');
    setEditEmpDept('');
  };

  const handleSaveEdit = async () => {
    if (!editingEmpId || !editEmpCode.trim() || !editEmpName.trim()) return;
    if (onUpdateEmployee) {
      await onUpdateEmployee({
        id: editingEmpId,
        code: editEmpCode.trim(),
        fullName: editEmpName.trim(),
        department: editEmpDept.trim() || 'CĐCS',
        isActive: true,
      });
    }
    handleCancelEdit();
  };

  return (
    <div className="space-y-6">
      {/* 1. CÀI ĐẶT THÔNG TIN IN ẤN CỐ ĐỊNH */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cài Đặt Thông Tin & Người Ký In Phiếu</h3>
              <p className="text-xs text-slate-500">Các thông tin này sẽ hiển thị tự động trên Phiếu Thu (C40-BB), Phiếu Chi (C41-BB) và Sổ Quỹ</p>
            </div>
          </div>

          {isSaved && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã lưu thành công!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSigners} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên Cơ Quan / Đơn Vị (*)</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Địa Chỉ Đơn Vị</label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: 153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Thủ Trưởng / Chủ Tịch CĐCS
              </label>
              <input
                type="text"
                value={formData.headOfUnitName}
                onChange={(e) => setFormData({ ...formData, headOfUnitName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: Ngô Thị Bích Ngọc"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Thủ trưởng đơn vị</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kế Toán Công Đoàn
              </label>
              <input
                type="text"
                value={formData.accountantName}
                onChange={(e) => setFormData({ ...formData, accountantName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: Nguyễn Thị Cẩm Ly"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Kế toán</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Người Lập Biểu
              </label>
              <input
                type="text"
                value={formData.preparerName}
                onChange={(e) => setFormData({ ...formData, preparerName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: Nguyễn Thị Cẩm Ly"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Người lập phiếu</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Thủ Quỹ
              </label>
              <input
                type="text"
                value={formData.treasurerName}
                onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: Lê Thị Lan"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Thủ quỹ</span>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt Người Ký</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. QUẢN LÝ DANH SÁCH NHÂN VIÊN / ĐOÀN VIÊN */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Danh Sách Nhân Viên / Đoàn Viên ({employees.length} người)</h3>
              <p className="text-xs text-slate-500">Giúp tích chọn nhanh họ tên khi lập Phiếu Thu / Phiếu Chi, tìm theo mã và chỉnh sửa tiện lợi</p>
            </div>
          </div>

          {/* Ô Tìm Kiếm Nhanh Nhân Viên Trong Danh Sách */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã, tên, tổ CĐ..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Form Thêm Nhanh Nhân Viên */}
        <form onSubmit={handleCreateEmployee} className="flex items-end gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex-wrap text-xs">
          <div className="w-28">
            <label className="block text-slate-600 font-semibold mb-1">Mã NV (*)</label>
            <input
              type="text"
              value={newEmpCode}
              onChange={(e) => setNewEmpCode(e.target.value)}
              placeholder="VD: 01, 35"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-600 font-semibold mb-1">Họ & Tên (*)</label>
            <input
              type="text"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-slate-600 font-semibold mb-1">Bộ Phận / Tổ CĐ</label>
            <input
              type="text"
              value={newEmpDept}
              onChange={(e) => setNewEmpDept(e.target.value)}
              placeholder="VD: Phân xưởng 1"
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm h-[32px] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Nhân Viên</span>
          </button>
        </form>

        {/* Bảng Danh Sách Nhân Viên Có Chức Năng SỬA & XÓA */}
        <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center bg-slate-100">STT</th>
                <th className="p-2.5 w-28 bg-slate-100">Mã NV</th>
                <th className="p-2.5 bg-slate-100">Họ & Tên Nhân Viên</th>
                <th className="p-2.5 bg-slate-100">Bộ Phận / Tổ CĐ</th>
                <th className="p-2.5 w-28 text-center bg-slate-100">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    {searchQuery ? 'Không tìm thấy nhân viên phù hợp với từ khóa.' : 'Chưa có nhân viên nào trong danh sách.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const isEditing = editingEmpId === emp.id;

                  if (isEditing) {
                    return (
                      <tr key={emp.id} className="bg-amber-50/70 border-2 border-amber-300">
                        <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editEmpCode}
                            onChange={(e) => setEditEmpCode(e.target.value)}
                            className="w-full bg-white border border-amber-400 rounded px-2 py-1 font-mono font-bold text-blue-700 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editEmpName}
                            onChange={(e) => setEditEmpName(e.target.value)}
                            className="w-full bg-white border border-amber-400 rounded px-2 py-1 font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editEmpDept}
                            onChange={(e) => setEditEmpDept(e.target.value)}
                            className="w-full bg-white border border-amber-400 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={handleSaveEdit}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px] shadow-sm transition-all"
                              title="Lưu thay đổi"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Lưu</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-blue-700">{emp.code}</td>
                      <td className="p-2.5 font-bold text-slate-900">{emp.fullName}</td>
                      <td className="p-2.5 text-slate-500">{emp.department || 'CĐCS'}</td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(emp)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-all"
                            title="Sửa thông tin nhân viên"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteEmployee(emp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="Xóa nhân viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. CÀI ĐẶT SỐ DƯ ĐẦU KỲ TỪNG NĂM */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cài Đặt Số Dư Quỹ Đầu Kỳ Từng Năm</h3>
              <p className="text-xs text-slate-500">Quản lý số dư tồn Tiền mặt (S11-H) và Tiền gửi Ngân hàng (S12-H) chuyển từ năm trước sang</p>
            </div>
          </div>
        </div>

        <OpeningBalancesTable
          openingBalances={openingBalances}
          onSaveOpeningBalance={onSaveOpeningBalance}
        />
      </div>

      {/* 4. SAO LƯU & DI CHUYỂN DỮ LIỆU SANG MÁY KHÁC */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Sao Lưu & Chuyển Dữ Liệu Sang Máy Khác</h3>
              <p className="text-xs text-slate-500">Xuất toàn bộ cơ sở dữ liệu nội bộ ra file JSON hoặc nhập file dữ liệu từ máy tính khác</p>
            </div>
          </div>
        </div>

        {backupStatus && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${
            backupStatus.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {backupStatus.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{backupStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>1. Xuất Bản Sao Lưu (.json)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Tải toàn bộ chứng từ thu chi, bảng trích nộp, thông tin đơn vị và nhân viên về máy để cất giữ an toàn.
            </p>
            <button
              onClick={handleExportBackup}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất File Sao Lưu CSDL</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>2. Khôi Phục Dữ Liệu Từ File (.json)</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Nhập file sao lưu đã xuất từ máy khác để tiếp tục làm việc trên máy tính này.
            </p>
            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Chọn File Sao Lưu Để Nạp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
