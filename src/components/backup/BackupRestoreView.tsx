import React, { useState } from 'react';
import { exportFullDatabaseJSON, restoreFullDatabaseJSON } from '../../services/storage';
import { encryptBackupJSON, decryptBackupJSON } from '../../services/cryptoBackupService';
import { DatabaseBackup, Download, Upload, ShieldCheck, HardDriveDownload, Lock, KeyRound } from 'lucide-react';

interface BackupRestoreViewProps {
  onRefreshDatabase: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onRefreshDatabase }) => {
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [useEncryption, setUseEncryption] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');

  // Export Backup File
  const handleExportBackup = async () => {
    let jsonStr = await exportFullDatabaseJSON();

    if (useEncryption) {
      if (!password || password.length < 4) {
        alert('Vui lòng nhập mật khẩu mã hóa tối thiểu 4 ký tự!');
        return;
      }
      try {
        jsonStr = await encryptBackupJSON(jsonStr, password);
      } catch (err: any) {
        alert('Lỗi mã hóa dữ liệu: ' + err.message);
        return;
      }
    }

    const defaultFileName = `AccoDesk_Backup_${new Date().toISOString().slice(0, 10)}${useEncryption ? '_Encrypted' : ''}.accobak`;

    if ((window as any).electronAPI?.saveBackupDialog) {
      const res = await (window as any).electronAPI.saveBackupDialog(defaultFileName);
      if (!res.canceled && res.filePath) {
        const writeRes = await (window as any).electronAPI.writeFile(res.filePath, jsonStr);
        if (writeRes.success) {
          alert(`Đã sao lưu dữ liệu kế toán thành công ${useEncryption ? '(Đã mã hóa AES-256)' : ''}!`);
          return;
        }
      }
    }

    // Web Fallback Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle Restore File Select
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CẢNH BÁO: Thao tác khôi phục sẽ ghi đè dữ liệu hiện tại bằng tệp sao lưu. Bạn có chắc muốn tiếp tục?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      let content = evt.target?.result as string;
      if (content) {
        // Kiểm tra xem có phải nội dung đã mã hóa hay JSON thông thường
        if (!content.trim().startsWith('{')) {
          const pwd = prompt('Tệp sao lưu này đã được mã hóa AES-256. Vui lòng nhập mật khẩu giải mã:');
          if (!pwd) return;
          try {
            content = await decryptBackupJSON(content, pwd);
          } catch (err) {
            alert('Mật khẩu giải mã không chính xác hoặc tệp bị hỏng!');
            return;
          }
        }

        const res = await restoreFullDatabaseJSON(content);
        setRestoreStatus(res.message);
        if (res.success) {
          onRefreshDatabase();
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <DatabaseBackup className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Sao Lưu & Khôi Phục Dữ Liệu Offline</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Dữ liệu kế toán lưu trữ an toàn 100% trên đĩa cứng máy tính cá nhân. Thường xuyên sao lưu để phòng ngừa sự cố máy tính.
        </p>
      </div>

      {/* Grid 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">1. Xuất Bản Sao Lưu (.accobak)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tạo tệp sao lưu đóng gói toàn bộ danh sách khách hàng, cấu hình map cột, lịch sử giao dịch và đối chiếu sao kê ngân hàng.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useEncryption}
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Bảo vệ bằng mật khẩu (Mã hóa AES-256)</span>
              </label>

              {useEncryption && (
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu sao lưu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Tải Tệp Sao Lưu (.accobak) Về Máy</span>
          </button>
        </div>

        {/* Restore Backup Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">2. Khôi Phục Từ Tệp Sao Lưu</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tải lại toàn bộ dữ liệu làm việc từ tệp sao lưu `.accobak` hoặc `.json` đã xuất trước đó.
            </p>
          </div>

          <div>
            <label className="cursor-pointer w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95">
              <Upload className="w-4 h-4" />
              <span>Chọn Tệp Sao Lưu (.accobak) Để Phục Hồi</span>
              <input type="file" accept=".accobak, .json" onChange={handleRestoreFile} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Restore Status Alert */}
      {restoreStatus && (
        <div className="p-4 rounded-xl bg-brand-50 text-brand-900 border border-brand-200 dark:bg-slate-950 dark:border-brand-500/40 text-xs font-bold dark:text-brand-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{restoreStatus}</span>
        </div>
      )}

      {/* Danger Zone: Reset All Data */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <span>🗑 Xóa Sạch Dữ Liệu Thử Nghiệm (Reset DB Clean 100%)</span>
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            Xóa 100% tất cả chứng từ, khách hàng, sao kê và dữ liệu mẫu hiện có để đưa phần mềm về trạng thái mới tinh 100%.
          </p>
        </div>

        <button
          onClick={async () => {
            if (confirm('🚨 CẢNH BÁO NGUY HIỂM: Thao tác này sẽ XÓA SẠCH 100% tất cả chứng từ và dữ liệu hiện tại! Bạn có chắc chắn muốn xóa?')) {
              const { clearAllDatabaseData } = await import('../../services/storage');
              await clearAllDatabaseData();
              onRefreshDatabase();
              alert('Đã xóa sạch 100% dữ liệu thành công! Cơ sở dữ liệu hiện đã trống hoàn toàn.');
            }
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          Xóa Sạch Dữ Liệu Thử Nghiệm 🔥
        </button>
      </div>
    </div>
  );
};
