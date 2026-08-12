import React, { useState } from 'react';
import { UserRole, getRoleLabel } from '../../services/rolePermissionService';
import { IndustryPresetType, getIndustryRule } from '../../services/industryPresetService';
import { ShieldCheck, ChevronDown, Building, Lock } from 'lucide-react';

interface RolePermissionBadgeProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  currentIndustry: IndustryPresetType;
  onChangeIndustry: (industry: IndustryPresetType) => void;
}

export const RolePermissionBadge: React.FC<RolePermissionBadgeProps> = ({
  currentRole,
  onChangeRole,
  currentIndustry,
  onChangeIndustry,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const industryRule = getIndustryRule(currentIndustry);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
        title="Phân quyền vai trò & Quy chuẩn ngành nghề"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
        <span className="truncate max-w-[130px]">{getRoleLabel(currentRole).split(' ')[1]}</span>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
          {industryRule.title.split(' ')[0]}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-3 backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div>
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-500" />
              <span>Phân Quyền Vai Trò Người Dùng</span>
            </div>
            <div className="space-y-1">
              {(['ADMIN', 'CHIEF_ACCOUNTANT', 'ACCOUNTANT', 'VIEWER', 'AUDITOR'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onChangeRole(r);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                    currentRole === r
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{getRoleLabel(r)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Building className="w-3 h-3 text-amber-500" />
              <span>Preset Ngành Nghề Kinh Doanh</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['COMMERCE', 'SERVICE', 'CONSTRUCTION', 'MANUFACTURING', 'AGENCY', 'HOUSEHOLD'] as IndustryPresetType[]).map((ind) => (
                <button
                  key={ind}
                  onClick={() => {
                    onChangeIndustry(ind);
                    setIsOpen(false);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold text-left cursor-pointer transition-colors truncate ${
                    currentIndustry === ind
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {getIndustryRule(ind).title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
