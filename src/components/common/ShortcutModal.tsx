import React from 'react';
import { Command, Keyboard } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  const shortcutsList = [
    { key: 'Ctrl + F', desc: 'Tìm kiếm nhanh dữ liệu / hóa đơn' },
    { key: 'Ctrl + S', desc: 'Lưu hoặc Ghi sổ dữ liệu hiện tại' },
    { key: 'Ctrl + Shift + K', desc: 'Mở / Đóng bảng phím tắt này' },
    { key: 'Ctrl + Shift + L', desc: 'Xem Nhật ký thao tác (Audit Log)' },
    { key: 'Esc', desc: 'Đóng Modal hoặc hủy thao tác hiện tại' },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Phím Tắt Nhanh (Keyboard Shortcuts)"
      subtitle="Thao tác siêu tốc cho Kế toán viên"
      icon={Keyboard}
      maxWidth="md"
      footer={
        <div className="w-full flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Command className="w-3.5 h-3.5 text-slate-400" /> Nhấn Esc để đóng
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {shortcutsList.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 hover:border-brand-200 dark:hover:border-brand-900 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.desc}</span>
            <kbd className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-[11px] font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
              {item.key}
            </kbd>
          </div>
        ))}
      </div>
    </BaseModal>
  );
};
