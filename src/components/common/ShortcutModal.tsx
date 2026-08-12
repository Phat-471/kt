import React from 'react';
import { Command, X, Keyboard } from 'lucide-react';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutsList = [
    { key: 'Ctrl + F', desc: 'Tìm kiếm nhanh dữ liệu / hóa đơn' },
    { key: 'Ctrl + S', desc: 'Lưu hoặc Ghi sổ dữ liệu hiện tại' },
    { key: 'Ctrl + Shift + K', desc: 'Mở / Đóng bảng phím tắt này' },
    { key: 'Ctrl + Shift + L', desc: 'Xem Nhật ký thao tác (Audit Log)' },
    { key: 'Esc', desc: 'Đóng Modal hoặc hủy thao tác hiện tại' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Phím Tắt Nhanh (Keyboard Shortcuts)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Thao tác siêu tốc cho Kế toán viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Command className="w-3.5 h-3.5 text-slate-400" /> Nhấn Esc để đóng
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-600 text-white font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
