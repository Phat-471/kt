import React, { useState, useRef } from 'react';
import { UnionSignerSettings, UnionEmployee } from '../../types/accounting';
import { Settings, Save, Plus, Trash2, Users, FileSignature, CheckCircle2, Database, Download, UploadCloud, AlertCircle } from 'lucide-react';
import { exportUnionBackupJSON, importUnionBackupJSON } from '../../services/storage';

interface SettingsTabProps {
  signerSettings: UnionSignerSettings;
  onSaveSignerSettings: (settings: UnionSignerSettings) => Promise<void>;
  employees: UnionEmployee[];
  onAddEmployee: (emp: Omit<UnionEmployee, 'id'>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  signerSettings,
  onSaveSignerSettings,
  employees,
  onAddEmployee,
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

  // New Employee state
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('');

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
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Người lập</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Thủ Quỹ Công Đoàn
              </label>
              <input
                type="text"
                value={formData.treasurerName}
                onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="VD: Bùi Xuân Mai Thảo"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Vị trí: Thủ quỹ</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cài Đặt In Ấn</span>
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
              <p className="text-xs text-slate-500">Giúp tích chọn nhanh họ tên khi lập Phiếu Thu / Phiếu Chi và tự động điền mã</p>
            </div>
          </div>
        </div>

        {/* Form Thêm Nhanh Nhân Viên */}
        <form onSubmit={handleCreateEmployee} className="flex items-end gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex-wrap text-xs">
          <div className="w-24">
            <label className="block text-slate-600 font-semibold mb-1">Mã NV (*)</label>
            <input
              type="text"
              value={newEmpCode}
              onChange={(e) => setNewEmpCode(e.target.value)}
              placeholder="VD: 123"
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
            className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-sm h-[32px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </form>

        {/* Bảng Danh Sách Nhân Viên */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center">STT</th>
                <th className="p-2.5 w-24">Mã NV</th>
                <th className="p-2.5">Họ & Tên Nhân Viên</th>
                <th className="p-2.5">Bộ Phận / Tổ CĐ</th>
                <th className="p-2.5 w-20 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400">
                    Chưa có nhân viên nào trong danh sách.
                  </td>
                </tr>
              ) : (
                employees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700">{emp.code}</td>
                    <td className="p-2.5 font-bold text-slate-900">{emp.fullName}</td>
                    <td className="p-2.5 text-slate-500">{emp.department || 'CĐCS'}</td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => onDeleteEmployee(emp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Xóa nhân viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. SAO LƯU & DI CHUYỂN DỮ LIỆU SANG MÁY KHÁC */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Sao Lưu & Di Chuyển Dữ Liệu Sang Máy Khác</h3>
              <p className="text-xs text-slate-500">Xuất file sao lưu chứa toàn bộ chứng từ thu chi, bảng trích nộp tháng và danh mục nhân sự để mang sang máy tính khác sử dụng</p>
            </div>
          </div>
        </div>

        {backupStatus && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${
            backupStatus.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {backupStatus.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{backupStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Nút 1: Xuất file sao lưu */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>1. Xuất File Sao Lưu (.JSON)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tải về 1 file sao lưu duy nhất chứa toàn bộ: Phiếu thu/chi, Bảng trích nộp 12 tháng, Danh sách nhân viên và Cài đặt người ký.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Tải File Sao Lưu Về Máy</span>
            </button>
          </div>

          {/* Nút 2: Khôi phục từ file sao lưu */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>2. Khôi Phục Dữ Liệu Từ File Đã Lưu</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Khi mở ứng dụng trên máy tính mới, chọn file sao lưu đã tải ở máy cũ để nạp lại toàn bộ dữ liệu chỉ trong 1 giây.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={backupFileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImportBackup}
              />
              <button
                onClick={() => backupFileInputRef.current?.click()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Chọn File Sao Lưu Để Phục Hồi</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
