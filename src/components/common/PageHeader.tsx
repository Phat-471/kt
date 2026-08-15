import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Client } from '../../types/accounting';

export interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badgeText?: string;
  activeClient?: Client | null;
  actions?: ReactNode;
  variant?: 'gradient' | 'card';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  badgeText,
  activeClient,
  actions,
  variant = 'card',
  className = '',
}) => {
  if (variant === 'gradient') {
    return (
      <div
        className={`bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 text-white px-5 py-4 rounded-2xl border border-blue-500/20 shadow-sm ${className}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-blue-200" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-extrabold text-white leading-snug">{title}</h2>
                {badgeText && (
                  <span className="text-[10px] bg-white/20 text-blue-100 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                    {badgeText}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-[11px] text-blue-200/80 mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-start lg:justify-end">
            {activeClient && (
              <div className="text-left lg:text-right mr-1 hidden sm:block">
                <span className="text-xs font-bold text-blue-100 block truncate max-w-[200px]">{activeClient.name}</span>
                <span className="text-[10px] text-blue-300 font-mono">MST: {activeClient.taxCode}</span>
              </div>
            )}
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug">{title}</h2>
              {badgeText && (
                <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-start lg:justify-end">
          {activeClient && (
            <div className="text-left lg:text-right mr-1 hidden sm:block">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                {activeClient.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                MST: {activeClient.taxCode}
              </span>
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};
