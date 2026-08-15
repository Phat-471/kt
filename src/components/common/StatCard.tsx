import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type StatCardVariant = 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: StatCardVariant;
  badge?: ReactNode;
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

const variantStyles: Record<
  StatCardVariant,
  { bg: string; border: string; text: string; iconBg: string; iconColor: string }
> = {
  blue: {
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-900/50',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-900/50',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    bg: 'bg-rose-50/50 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-900/50',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  purple: {
    bg: 'bg-purple-50/50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-900/50',
    text: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  cyan: {
    bg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    border: 'border-cyan-200 dark:border-cyan-900/50',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/50',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  slate: {
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-900 dark:text-slate-100',
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-600 dark:text-slate-400',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'slate',
  badge,
  onClick,
  className = '',
  compact = false,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border ${styles.bg} ${styles.border} ${
        compact ? 'p-3' : 'p-4'
      } shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div
            className={`w-7 h-7 rounded-lg ${styles.iconBg} ${styles.iconColor} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={`text-base font-extrabold ${styles.text} tracking-tight truncate`}>
          {value}
        </span>
        {badge}
      </div>

      {subtext && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};
