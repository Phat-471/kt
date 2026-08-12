import React from 'react';
import { Eye, Check, X, RotateCcw } from 'lucide-react';

export interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface ColumnVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  onChangeColumns: (cols: ColumnDef[]) => void;
  onReset: () => void;
}

export const ColumnVisibilityModal: React.FC<ColumnVisibilityModalProps> = ({
  isOpen,
  onClose,
  columns,
  onChangeColumns,
  onReset,
}) => {
  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    const updated = columns.map(col => {
      if (col.id === id && !col.required) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });
    onChangeColumns(updated);
  };

  const handleSelectAll = (visible: boolean) => {
    const updated = columns.map(col => ({
      ...col,
      visible: col.required ? true : visible,
    }));
    onChangeColumns(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Tùy Chỉnh Cột Hiển Thị</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Bật/tắt các cột để tối ưu không gian hiển thị bảng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectAll(true)}
              className="text-brand-600 dark:text-brand-400 font-bold hover:underline cursor-pointer"
            >
              Hiện tất cả
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => handleSelectAll(false)}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              Ẩn bớt
            </button>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Mặc định</span>
          </button>
        </div>

        {/* Column List */}
        <div className="p-5 max-h-[350px] overflow-y-auto space-y-2">
          {columns.map(col => (
            <label
              key={col.id}
              onClick={() => !col.required && toggleColumn(col.id)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                col.visible
                  ? 'bg-brand-50/60 border-brand-200 text-slate-900 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-slate-100 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800'
              } ${col.required ? 'opacity-75 cursor-not-allowed' : 'hover:border-brand-300'}`}
            >
              <span className="text-xs flex items-center gap-2">
                {col.label}
                {col.required && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-normal">
                    Bắt buộc
                  </span>
                )}
              </span>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                  col.visible
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-300 dark:border-slate-700'
                }`}
              >
                {col.visible && <Check className="w-3.5 h-3.5" />}
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all cursor-pointer"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
};
