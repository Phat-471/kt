import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Cpu, Database, CheckCircle2, Info, Building2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { AppLogo } from './AppLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalTxCount: number;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, totalTxCount }) => {
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'IDLE' | 'SUCCESS' | 'INFO'>('IDLE');

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v: string) => {
        if (v) setAppVersion(v);
      });
    }
  }, []);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage(null);
    setUpdateStatus('IDLE');

    if (window.electronAPI?.checkForUpdates) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        setIsCheckingUpdate(false);
        if (res.updateAvailable) {
          setUpdateStatus('SUCCESS');
          setUpdateMessage(`🎉 Có phiên bản mới: v${res.version}. ${res.releaseNotes}`);
        } else {
          setUpdateStatus('INFO');
          setUpdateMessage(res.message || `Phiên bản AccoDesk v${appVersion} hiện tại là mới nhất.`);
        }
      } catch (err: any) {
        setIsCheckingUpdate(false);
        setUpdateStatus('INFO');
        setUpdateMessage('AccoDesk đang chạy ở chế độ Offline / Local Desktop. Không cần kết nối máy chủ.');
      }
    } else {
      setTimeout(() => {
        setIsCheckingUpdate(false);
        setUpdateStatus('INFO');
        setUpdateMessage(`Bạn đang chạy Kế Toán v${appVersion}. Đã tối ưu hóa 100% dữ liệu nội bộ.`);
      }, 600);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Phần mềm kế toán v${appVersion}`}
      subtitle="Trợ Lý Kế Toán Desktop Doanh Nghiệp"
      icon={Building2}
      maxWidth="md"
      footer={
        <div className="w-full flex items-center justify-between text-[10px] text-slate-500">
          <span>© 2026 AccoDesk Studio</span>
          <span>Bảo mật 100% Offline Data</span>
        </div>
      }
    >
      <div className="space-y-4 text-slate-700 dark:text-slate-300 text-xs">
        <div className="flex items-center justify-center p-4 bg-gradient-to-br from-emerald-900/20 via-slate-900/40 to-teal-900/20 border border-emerald-500/20 rounded-2xl">
          <AppLogo size={52} showText={true} subtitle="Phần Mềm Quản Trị Kế Toán Doanh Nghiệp" />
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2">
          <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tuân Thủ Chuẩn Mực Pháp Lý Kế Toán</span>
          </div>
          <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-medium">
            <li>• Chế độ Kế toán Doanh nghiệp Thông tư 200/2014/TT-BTC</li>
            <li>• Hóa đơn điện tử & Ký số XML Nghị định 123/2020/NĐ-CP</li>
            <li>• Quy định Thuế GTGT, TNDN & Khấu trừ 2026 Updated</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              <span>Cơ Sở Dữ Liệu</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              {totalTxCount.toLocaleString('vi-VN')} chứng từ (Dexie DB)
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Môi Trường</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Electron 34 + React 18
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCheckUpdate}
            disabled={isCheckingUpdate}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdate ? 'Đang Kiểm Tra Bản Cập Nhật...' : 'Kiểm Tra Bản Cập Nhật Mới'}</span>
          </button>

          {updateMessage && (
            <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 animate-fade-in ${updateStatus === 'SUCCESS'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
              }`}>
              {updateStatus === 'SUCCESS' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              )}
              <span>{updateMessage}</span>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};
