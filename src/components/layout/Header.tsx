import React, { useState, useEffect } from 'react';
import { Client } from '../../types/accounting';
import { Building2, ChevronDown, Calendar, HardDriveUpload, CheckCircle2, Moon, Sun, Keyboard, EyeOff, Sparkles, KeyRound, Info, Plus } from 'lucide-react';
import { RolePermissionBadge } from '../common/RolePermissionBadge';
import { UserRole } from '../../services/rolePermissionService';
import { IndustryPresetType } from '../../services/industryPresetService';
import { QuickCreateClientModal } from '../clients/QuickCreateClientModal';

interface HeaderProps {
  clients: Client[];
  activeClient: Client | null;
  onSelectClient: (client: Client) => void;
  onQuickBackup: () => void;
  onOpenShortcuts?: () => void;
  onToggleHideHeader?: () => void;
  onOpenAIModal?: () => void;
  onOpenDigitalSignModal?: () => void;
  onOpenAbout?: () => void;
  isHeaderHidden?: boolean;
  totalTxCount: number;
  globalSearchTerm?: string;
  onSearchChange?: (term: string) => void;
  currentRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  currentIndustry?: IndustryPresetType;
  onChangeIndustry?: (industry: IndustryPresetType) => void;
}

export const Header: React.FC<HeaderProps> = ({
  clients,
  activeClient,
  onSelectClient,
  onQuickBackup,
  onOpenShortcuts,
  onToggleHideHeader,
  onOpenAIModal,
  onOpenDigitalSignModal,
  onOpenAbout,
  isHeaderHidden,
  totalTxCount,
  globalSearchTerm = '',
  onSearchChange,
  currentRole,
  onChangeRole,
  currentIndustry,
  onChangeIndustry,
}) => {
  const [isDark, setIsDark] = useState(false); // Default to Light Mode
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
  const clientMenuRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close client dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientMenuRef.current && !clientMenuRef.current.contains(e.target as Node)) {
        setIsClientMenuOpen(false);
      }
    };
    if (isClientMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientMenuOpen]);

  useEffect(() => {
    // Sync initial theme class
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <header className="h-12 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between select-none backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
      {/* Active Client Selector Dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={clientMenuRef}>
          <button
            type="button"
            onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}
            className="flex items-center gap-2.5 px-3 py-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg cursor-pointer transition-all duration-200 shadow-sm"
          >
            <div className="w-6 h-6 rounded bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="truncate max-w-[220px]">{activeClient ? activeClient.name : 'Chưa chọn khách hàng'}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isClientMenuOpen ? 'rotate-180 text-brand-600' : ''}`} />
              </div>
            </div>
          </button>

          {/* Client Selection Dropdown Menu */}
          {isClientMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                <span>Danh Sách Doanh Nghiệp ({clients.length})</span>
              </div>

              {clients.length === 0 ? (
                <div className="py-4 px-3 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có doanh nghiệp nào được tạo.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsClientMenuOpen(false);
                      setIsQuickCreateOpen(true);
                    }}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Tạo Doanh Nghiệp Ngay
                  </button>
                </div>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectClient(c);
                          setIsClientMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          activeClient?.id === c.id
                            ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200 dark:bg-brand-600/20 dark:text-brand-300 dark:border-brand-500/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-200">{c.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MST: {c.taxCode} | Niên độ {c.financialYear}</div>
                        </div>
                        {activeClient?.id === c.id && <CheckCircle2 className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientMenuOpen(false);
                        setIsQuickCreateOpen(true);
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950/40 text-brand-600 dark:text-brand-400 hover:text-brand-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Thêm Doanh Nghiệp / Job Mới
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Financial Year Badge */}
        {activeClient && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Niên độ: <strong className="text-slate-900 dark:text-slate-100 font-bold">{activeClient.financialYear}</strong></span>
          </div>
        )}
      </div>

      {/* Global Search Bar */}
      {onSearchChange && (
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={globalSearchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm chứng từ, đối tác, số tiền..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500/50 outline-none transition-shadow"
            />
          </div>
        </div>
      )}

      {/* Right Action Bar */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* AI Assistant Button */}
        {onOpenAIModal && (
          <button
            onClick={onOpenAIModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Mở Trợ Lý AI Gợi Ý Định Khoản & Kiểm Tra Logic Chéo"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Trợ Lý</span>
          </button>
        )}

        {/* Digital Sign Invoice Button */}
        {onOpenDigitalSignModal && (
          <button
            onClick={onOpenDigitalSignModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer shrink-0"
            title="Ký Số Hóa Đơn Điện Tử XML chuẩn NĐ 123/2020"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ký Số HĐ</span>
          </button>
        )}

        {/* Role Permission & Industry Preset Badge */}
        {currentRole && onChangeRole && currentIndustry && onChangeIndustry && (
          <RolePermissionBadge
            currentRole={currentRole}
            onChangeRole={onChangeRole}
            currentIndustry={currentIndustry}
            onChangeIndustry={onChangeIndustry}
          />
        )}

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title={isDark ? 'Đang ở giao diện Tối. Bấm để chuyển sang Sáng' : 'Đang ở giao diện Sáng. Bấm để chuyển sang Tối'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        <div className="text-right hidden xl:block border-l border-slate-200 dark:border-slate-800 pl-2">
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Chứng từ: <span className="font-bold tabular-num text-brand-600 dark:text-brand-400">{totalTxCount}</span> dòng
          </div>
        </div>

        {/* Toggle Hide Header Button */}
        {onToggleHideHeader && (
          <button
            onClick={onToggleHideHeader}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Ẩn Header đỉnh đầu để mở rộng tối đa diện tích bảng (Ctrl+Shift+F)"
          >
            <EyeOff className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </button>
        )}

        {/* Keyboard Shortcut Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Xem bảng phím tắt (Ctrl+Shift+K)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* About App & Update Check Button */}
        {onOpenAbout && (
          <button
            onClick={onOpenAbout}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Giới thiệu AccoDesk & Kiểm tra cập nhật"
          >
            <Info className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onQuickBackup}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          <HardDriveUpload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Sao Lưu</span>
        </button>
      </div>

      {/* Quick Create Client Modal */}
      <QuickCreateClientModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onClientCreated={(newClient) => {
          onSelectClient(newClient);
        }}
      />
    </header>
  );
};
