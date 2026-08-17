import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'emerald' | 'rose' | 'amber' | 'cyan' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'blue',
}) => {
  const variantStyles = {
    emerald: {
      card: 'bg-emerald-50/50 border-emerald-200/80',
      iconBox: 'bg-emerald-100 text-emerald-700',
      text: 'text-emerald-700',
    },
    rose: {
      card: 'bg-rose-50/50 border-rose-200/80',
      iconBox: 'bg-rose-100 text-rose-700',
      text: 'text-rose-700',
    },
    amber: {
      card: 'bg-amber-50/50 border-amber-200/80',
      iconBox: 'bg-amber-100 text-amber-700',
      text: 'text-amber-800',
    },
    cyan: {
      card: 'bg-sky-50/50 border-sky-200/80',
      iconBox: 'bg-sky-100 text-sky-700',
      text: 'text-sky-800',
    },
    blue: {
      card: 'bg-blue-50/50 border-blue-200/80',
      iconBox: 'bg-blue-100 text-blue-700',
      text: 'text-blue-800',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`p-4 rounded-xl border ${style.card} bg-white shadow-sm transition-all hover:shadow`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${style.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className={`text-xl font-bold ${style.text} mt-2 font-mono tracking-tight`}>
        {value}
      </div>
      {subtext && <div className="text-[11px] text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
};
