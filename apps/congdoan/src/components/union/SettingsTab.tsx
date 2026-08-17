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
  Search
} from 'lucide-react';
import { exportUnionBackupJSON, importUnionBackupJSON } from '../../services/storage';

interface SettingsTabProps {
  signerSettings: UnionSignerSettings;
  onSaveSignerSettings: (settings: UnionSignerSettings) => Promise<void>;
  employees: UnionEmployee[];
  onAddEmployee: (emp: Omit<UnionEmployee, 'id'>) => Promise<void>;
  onUpdateEmployee?: (emp: UnionEmployee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  signerSettings,
  onSaveSignerSettings,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
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

      {/* 3. SAO LƯU & DI CHUYỂN DỮ LIỆU SANG MÁY KHÁC */}
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
