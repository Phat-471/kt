import React from 'react';
import { Eye, Maximize2, Minimize2, Building2 } from 'lucide-react';
import { Client } from '../../types/accounting';

interface MiniFloatingToolbarProps {
  activeClient: Client | null;
  onShowHeader: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
}

export const MiniFloatingToolbar: React.FC<MiniFloatingToolbarProps> = ({
  activeClient,
  onShowHeader,
  isZenMode,
  onToggleZenMode,
}) => {
  return (
    <div className="fixed top-2 right-4 z-40 bg-slate-900/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-xl flex items-center gap-2.5 text-xs animate-fade-in select-none">
      <div className="flex items-center gap-1.5 font-bold text-slate-200 pr-2 border-r border-slate-700">
        <Building2 className="w-3.5 h-3.5 text-amber-400" />
        <span className="truncate max-w-[150px]">{activeClient ? activeClient.name : 'Chưa chọn'}</span>
      </div>

      <button
        onClick={onShowHeader}
        className="flex items-center gap-1 text-slate-300 hover:text-white font-bold cursor-pointer transition-colors"
        title="Hiện lại Header đỉnh đầu (Ctrl+Shift+F)"
      >
        <Eye className="w-3.5 h-3.5 text-brand-400" />
        <span>Hiện Header</span>
      </button>

      <span className="text-slate-600">|</span>

      <button
        onClick={onToggleZenMode}
        className="flex items-center gap-1 text-slate-300 hover:text-amber-300 font-bold cursor-pointer transition-colors"
        title={isZenMode ? "Thoát chế độ Zen Mode toàn màn hình" : "Bật chế độ Zen Mode (Ẩn cả Sidebar)"}
      >
        {isZenMode ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
        <span>{isZenMode ? 'Thoát Zen Mode' : 'Zen Mode'}</span>
      </button>
    </div>
  );
};
