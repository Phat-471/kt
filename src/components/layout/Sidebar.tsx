import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FileSpreadsheet, 
  ShieldAlert, 
  GitCompare, 
  Printer, 
  DatabaseBackup,
  ShieldCheck,
  History,
  HelpCircle,
  Menu,
  Scale,
  Calculator,
  Layers,
  BarChart3,
  Lock,
  PieChart,
  Briefcase,
  BookOpenCheck,
  GitBranch,
  FilePenLine,
  BookMarked,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Star
} from 'lucide-react';
import { AppLogo } from '../common';

export type TabType = 
  | 'dashboard'
  | 'executive-analytics'
  | 'contract-costing'
  | 'data-version-history'
  | 'month-end-closing'
  | 'clients'
  | 'import'
  | 'validation'
  | 'reconciliation'
  | 'reports'
  | 'generator'
  | 'backup'
  | 'audit'
  | 'xml-import'
  | 'legal-search'
  | 'tax-reports'
  | 'master-accounting'
  | 'financial-reports'
  | 'correction-ledger'
  | 'accounting-ledger'
  | 'payroll'
  | 'fixed-assets'
  | 'prepaid-expenses'
  | 'trade-union'
  | 'etax'
  | 'trial-balance-pivot'
  | 'help';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  errorCount: number;
  unreconciledCount: number;
}

interface MenuItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
}

interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  errorCount,
  unreconciledCount 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  
  const [favorites, setFavorites] = useState<TabType[]>(() => {
    try {
      const saved = localStorage.getItem('accodesk_pinned_menu');
      return saved ? JSON.parse(saved) : ['dashboard', 'financial-reports', 'xml-import', 'validation'];
    } catch (e) {
      return ['dashboard', 'financial-reports', 'xml-import', 'validation'];
    }
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    favorites: true,
    step1_input: true,
    step2_process: true,
    step3_ledger: true,
    step4_specialized: true,
    step5_reports: true,
    step6_system: false,
  });

  const toggleFavorite = (e: React.MouseEvent, id: TabType) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem('accodesk_pinned_menu', JSON.stringify(next));
      return next;
    });
  };

  const allMenuItemsMap: Record<TabType, MenuItem> = {
    'dashboard': { id: 'dashboard', label: 'Tổng quan Dashboard', icon: LayoutDashboard },
    'executive-analytics': { id: 'executive-analytics', label: 'Phân Tích Quản Trị & BEP', icon: PieChart },
    'financial-reports': { id: 'financial-reports', label: 'Báo Cáo Tài Chính & B01-B09', icon: BarChart3 },
    'trial-balance-pivot': { id: 'trial-balance-pivot', label: 'Cân Đối Phát Sinh Pivot', icon: Scale },
    'xml-import': { id: 'xml-import', label: 'Đọc Hóa Đơn XML (TT78)', icon: FileSpreadsheet },
    'import': { id: 'import', label: 'Import & Ánh Xạ Excel', icon: FileSpreadsheet },
    'master-accounting': { id: 'master-accounting', label: 'Bộ 4 Nghiệp Vụ (Kho/Quỹ/Thuế/Nợ)', icon: Layers },
    'tax-reports': { id: 'tax-reports', label: 'Báo Cáo Thuế & Kho', icon: Calculator },
    'etax': { id: 'etax', label: 'Khai Thuế eTax (GTGT/TNDN/TNCN)', icon: FileSpreadsheet },
    'fixed-assets': { id: 'fixed-assets', label: 'Tài Sản Cố Định & Khấu Hao', icon: Building2 },
    'prepaid-expenses': { id: 'prepaid-expenses', label: 'Phân Bổ Chi Phí Trả Trước (242)', icon: Calculator },
    'trade-union': { id: 'trade-union', label: 'Tài Chính Công Đoàn (C40/C41)', icon: Users },
    'payroll': { id: 'payroll', label: 'Bảng Lương & BHXH', icon: Users },
    'contract-costing': { id: 'contract-costing', label: 'Giá Thành Hợp Đồng & Hoàn Thuế', icon: Briefcase },
    'accounting-ledger': { id: 'accounting-ledger', label: 'Sổ Kế Toán TT200 (Nhật Ký & Sổ Cái)', icon: BookMarked },
    'reports': { id: 'reports', label: 'Báo Cáo Đối Chiếu', icon: FileSpreadsheet },
    'validation': { 
      id: 'validation', 
      label: 'Kiểm lỗi Dữ liệu', 
      icon: ShieldAlert,
      badge: errorCount > 0 ? errorCount : undefined,
      badgeColor: 'bg-rose-500 text-white shadow-sm font-bold'
    },
    'reconciliation': { 
      id: 'reconciliation', 
      label: 'So sánh & Đối chiếu', 
      icon: GitCompare,
      badge: unreconciledCount > 0 ? unreconciledCount : undefined,
      badgeColor: 'bg-amber-500 text-white shadow-sm font-bold'
    },
    'correction-ledger': { id: 'correction-ledger', label: 'Bút Toán Điều Chỉnh (Ghi Đỏ)', icon: FilePenLine },
    'month-end-closing': { id: 'month-end-closing', label: 'Checklist Khóa Sổ Tháng', icon: Lock },
    'data-version-history': { id: 'data-version-history', label: 'Lịch Sử Snapshot & Time Machine', icon: GitBranch },
    'clients': { id: 'clients', label: 'Quản lý Doanh nghiệp/Job', icon: Building2 },
    'generator': { id: 'generator', label: 'Tạo Mẫu Chứng Từ & In', icon: Printer },
    'legal-search': { id: 'legal-search', label: 'Tra Cứu Luật Thuế & KT', icon: Scale },
    'audit': { id: 'audit', label: 'Audit Log Thao Tác', icon: History },
    'backup': { id: 'backup', label: 'Sao lưu & Khôi phục', icon: DatabaseBackup },
    'help': { id: 'help', label: 'Hướng dẫn sử dụng', icon: HelpCircle },
  };

  const menuGroups: MenuGroup[] = [
    {
      id: 'step1_input',
      title: '📥 1. KHỞI TẠO & NHẬP LIỆU',
      items: [
        allMenuItemsMap['clients'],
        allMenuItemsMap['import'],
        allMenuItemsMap['xml-import'],
      ],
    },
    {
      id: 'step2_process',
      title: '⚡ 2. XỬ LÝ & KIỂM LỖI',
      items: [
        allMenuItemsMap['validation'],
        allMenuItemsMap['reconciliation'],
        allMenuItemsMap['generator'],
      ],
    },
    {
      id: 'step3_ledger',
      title: '📜 3. SỔ SÁCH & PHÁT SINH',
      items: [
        allMenuItemsMap['accounting-ledger'],
        allMenuItemsMap['trial-balance-pivot'],
        allMenuItemsMap['master-accounting'],
      ],
    },
    {
      id: 'step4_specialized',
      title: '💼 4. NGHIỆP VỤ & KHÓA SỔ',
      items: [
        allMenuItemsMap['prepaid-expenses'],
        allMenuItemsMap['fixed-assets'],
        allMenuItemsMap['trade-union'],
        allMenuItemsMap['payroll'],
        allMenuItemsMap['contract-costing'],
        allMenuItemsMap['month-end-closing'],
      ],
    },
    {
      id: 'step5_reports',
      title: '📊 5. THUẾ & BÁO CÁO',
      items: [
        allMenuItemsMap['financial-reports'],
        allMenuItemsMap['etax'],
        allMenuItemsMap['tax-reports'],
        allMenuItemsMap['reports'],
        allMenuItemsMap['executive-analytics'],
        allMenuItemsMap['dashboard'],
      ],
    },
    {
      id: 'step6_system',
      title: '⚙️ 6. TIỆN ÍCH & HỆ THỐNG',
      items: [
        allMenuItemsMap['correction-ledger'],
        allMenuItemsMap['data-version-history'],
        allMenuItemsMap['legal-search'],
        allMenuItemsMap['help'],
        allMenuItemsMap['audit'],
        allMenuItemsMap['backup'],
      ],
    },
  ];

  useEffect(() => {
    for (const group of menuGroups) {
      if (group.items.some(item => item.id === activeTab)) {
        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
        break;
      }
    }
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isSearching = menuSearchTerm.trim().length > 0;
  
  const favoriteItems = favorites
    .map(id => allMenuItemsMap[id])
    .filter(Boolean)
    .filter(item => !isSearching || item.label.toLowerCase().includes(menuSearchTerm.toLowerCase()));

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(menuSearchTerm.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen justify-between select-none relative z-20 transition-all duration-300 ease-in-out flex-shrink-0`}>
      <div className="flex-1 flex flex-col min-h-0">
        <div className={`p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between'} shrink-0`}>
          <AppLogo 
            size={36} 
            showText={!isCollapsed} 
            subtitle="Hệ Thống Quản Trị Offline" 
          />
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                placeholder="Tìm nhanh tính năng (Lương, XML, BCTC...)"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-shadow"
              />
              {menuSearchTerm && (
                <button
                  onClick={() => setMenuSearchTerm('')}
                  className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        <nav className="p-2.5 space-y-3 flex-1 overflow-y-auto custom-scrollbar scrollbar-thin">
          {favoriteItems.length > 0 && (
            <div className="space-y-1 bg-amber-500/5 dark:bg-amber-500/10 p-2 rounded-2xl border border-amber-500/20">
              {!isCollapsed && (
                <button
                  onClick={() => !isSearching && toggleGroup('favorites')}
                  className="w-full flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider transition-colors cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>TÍNH NĂNG YÊU THÍCH ({favoriteItems.length})</span>
                  </span>
                  {!isSearching && (
                    expandedGroups['favorites'] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}

              {(isCollapsed || expandedGroups['favorites'] || isSearching) && (
                <div className="space-y-0.5">
                  {favoriteItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={`fav-${item.id}`}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                          isActive
                            ? 'bg-amber-500 text-white font-bold shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-slate-800/80'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'text-amber-500 group-hover:bg-amber-200/50 dark:group-hover:bg-slate-700'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge !== undefined && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor}`}>
                                {item.badge}
                              </span>
                            )}
                            <span 
                              onClick={(e) => toggleFavorite(e, item.id)}
                              className="p-1.5 hover:bg-amber-200/60 dark:hover:bg-slate-700 rounded-xl text-amber-500 hover:text-amber-600 transition-all cursor-pointer shrink-0 active:scale-95"
                              title="Bỏ ghim khỏi danh sách Yêu thích ⭐"
                            >
                              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {filteredGroups.map((group) => {
            const isExpanded = isSearching || expandedGroups[group.id];

            return (
              <div key={group.id} className="space-y-1">
                {!isCollapsed && (
                  <button
                    onClick={() => !isSearching && toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-wider transition-colors cursor-pointer select-none"
                  >
                    <span>{group.title}</span>
                    {!isSearching && (
                      isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                )}

                {(isCollapsed || isExpanded) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const isPinned = favorites.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                            isActive
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                              isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-800'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </div>

                          {!isCollapsed && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.badge !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor}`}>
                                  {item.badge}
                                </span>
                              )}
                              <span
                                onClick={(e) => toggleFavorite(e, item.id)}
                                className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 ${
                                  isPinned 
                                    ? 'text-amber-400 opacity-100 hover:bg-amber-100 dark:hover:bg-amber-950/60' 
                                    : 'text-slate-400 dark:text-slate-500 opacity-40 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800'
                                }`}
                                title={isPinned ? "Bỏ ghim khỏi Yêu thích ⭐" : "Ghim vào danh sách Yêu thích ⭐"}
                              >
                                <Star className={`w-4 h-4 ${isPinned ? 'fill-amber-400 text-amber-500' : 'text-slate-400 hover:text-amber-500'}`} />
                              </span>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                              )}
                            </div>
                          )}
                          {isCollapsed && item.badge !== undefined && (
                            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${item.badgeColor?.replace(' text-white', '')}`}></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredGroups.length === 0 && favoriteItems.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 space-y-1">
              <p>Không tìm thấy tính năng "{menuSearchTerm}"</p>
              <button
                onClick={() => setMenuSearchTerm('')}
                className="text-emerald-600 hover:underline font-bold text-[11px] cursor-pointer"
              >
                Xóa từ khóa
              </button>
            </div>
          )}
        </nav>
      </div>

      {!isCollapsed && (
        <div className="p-3 m-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5 shadow-sm shrink-0">
          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-300">
            <span className="flex items-center gap-1 text-[11px] text-slate-900 dark:text-slate-200 font-extrabold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Chế độ Offline
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              Lưu máy tính
            </span>
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-400 text-[10px]">
            Phần mềm đóng vai trò gợi ý. <strong className="text-amber-700 dark:text-amber-400 font-bold">Kế toán duyệt và quyết định cuối cùng.</strong>
          </p>
        </div>
      )}
    </aside>
  );
};
