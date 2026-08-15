import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldCheck, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export type StatusType =
  | 'VALID'
  | 'WARNING'
  | 'ERROR'
  | 'INCOME'
  | 'EXPENSE'
  | 'APPROVED'
  | 'PENDING'
  | 'LOCKED'
  | 'ACTIVE';

export interface StatusBadgeProps {
  status: StatusType | string;
  customLabel?: string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  className = '',
  showIcon = true,
}) => {
  switch (status) {
    case 'VALID':
    case 'SUCCESS':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
          {customLabel || 'Hợp lệ'}
        </span>
      );
    case 'WARNING':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          {customLabel || 'Cảnh báo'}
        </span>
      );
    case 'ERROR':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${className}`}
        >
          {showIcon && <AlertCircle className="w-3 h-3 text-rose-500" />}
          {customLabel || 'Lỗi'}
        </span>
      );
    case 'INCOME':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
        >
          {showIcon && <ArrowDownLeft className="w-3 h-3 text-emerald-500" />}
          {customLabel || 'Thu / Có'}
        </span>
      );
    case 'EXPENSE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 ${className}`}
        >
          {showIcon && <ArrowUpRight className="w-3 h-3 text-rose-500" />}
          {customLabel || 'Chi / Nợ'}
        </span>
      );
    case 'APPROVED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 ${className}`}
        >
          {showIcon && <ShieldCheck className="w-3 h-3 text-blue-500" />}
          {customLabel || 'Đã duyệt'}
        </span>
      );
    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
        >
          {showIcon && <Clock className="w-3 h-3 text-slate-400" />}
          {customLabel || 'Chờ xử lý'}
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
        >
          {customLabel || status}
        </span>
      );
  }
};
