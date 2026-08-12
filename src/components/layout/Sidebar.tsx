import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FileSpreadsheet, 
  ShieldAlert, 
  GitCompare, 
  Printer, 
  DatabaseBackup,
  Sparkles,
  ShieldCheck,
  History,
  HelpCircle,
  Menu,
  Scale,
  Calculator,
  Layers,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Lock,
  PieChart,
  Briefcase
} from 'lucide-react';

export type TabType = 
  | 'dashboard'
  | 'executive-analytics'
  | 'contract-costing'
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
  | 'help';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  errorCount: number;
  unreconciledCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  errorCount,
  unreconciledCount 
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const menuItems = [
    { id: 'dashboard' as TabType, label: 'Tổng quan Dashboard', icon: LayoutDashboard },
    { id: 'executive-analytics' as TabType, label: 'Phân Tích Quản Trị & BEP', icon: PieChart, badge: 'AI 360', badgeColor: 'bg-purple-600 text-white' },
    { id: 'contract-costing' as TabType, label: 'Giá Thành Hợp Đồng & Hoàn Thuế', icon: Briefcase, badge: 'COSTING', badgeColor: 'bg-indigo-600 text-white' },
    { id: 'month-end-closing' as TabType, label: 'Checklist Khóa Sổ Tháng', icon: Lock, badge: 'NEW', badgeColor: 'bg-emerald-600 text-white' },
    { id: 'financial-reports' as TabType, label: 'Báo Cáo Tài Chính & Pivot', icon: BarChart3, badge: 'HOT', badgeColor: 'bg-indigo-600 text-white' },
    { id: 'master-accounting' as TabType, label: 'Bộ 4 Nghiệp Vụ Kế Toán', icon: Layers, badge: 'PRO', badgeColor: 'bg-amber-500 text-white' },
    { id: 'clients' as TabType, label: 'Quản lý Khách/Job', icon: Building2 },
    { id: 'import' as TabType, label: 'Import & Map Excel', icon: FileSpreadsheet },
    { 
      id: 'validation' as TabType, 
      label: 'Kiểm lỗi Dữ liệu', 
      icon: ShieldAlert,
      badge: errorCount > 0 ? errorCount : undefined,
      badgeColor: 'bg-rose-500 text-white shadow'
    },
    { 
      id: 'reconciliation' as TabType, 
      label: 'So sánh & Đối chiếu', 
      icon: GitCompare,
      badge: unreconciledCount > 0 ? unreconciledCount : undefined,
      badgeColor: 'bg-amber-500 text-white shadow'
    },
    { id: 'reports' as TabType, label: 'Báo Cáo Đối Chiếu', icon: FileSpreadsheet },
    { id: 'tax-reports' as TabType, label: 'Báo Cáo Thuế & Kho', icon: Calculator },
    { id: 'generator' as TabType, label: 'Tạo Mẫu Chứng Từ', icon: Printer },
    { id: 'xml-import' as TabType, label: 'Đọc Hóa Đơn XML', icon: FileSpreadsheet },
    { id: 'legal-search' as TabType, label: 'Tra Cứu Luật & Thuế', icon: Scale },
    { id: 'audit' as TabType, label: 'Audit Log Thao Tác', icon: History },
    { id: 'backup' as TabType, label: 'Sao lưu & Khôi phục', icon: DatabaseBackup },
    { id: 'help' as TabType, label: 'Hướng dẫn sử dụng', icon: HelpCircle },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none relative z-20 transition-all duration-300 ease-in-out flex-shrink-0`}>
      <div>
        {/* Brand App Header */}
        <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3.5 ${isCollapsed ? 'hidden' : 'flex'}`}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 ring-1 ring-white/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Kế Toán</h1>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Phần Mềm Kế Toán Offline</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title={isCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-800'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400"></span>
                    )}
                  </div>
                )}
                {isCollapsed && item.badge !== undefined && (
                  <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${item.badgeColor.replace(' text-white', '')}`}></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Principle Disclaimer Box */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-2 shadow-sm">
          <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-300">
            <span className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-200 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Chế độ Offline
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              Lưu máy tính
            </span>
          </div>
          <p className="leading-relaxed text-slate-600 dark:text-slate-400">
            Phần mềm đóng vai trò gợi ý. <strong className="text-amber-700 dark:text-amber-400 font-bold">Kế toán duyệt và quyết định cuối cùng.</strong>
          </p>
        </div>
      )}
    </aside>
  );
};
