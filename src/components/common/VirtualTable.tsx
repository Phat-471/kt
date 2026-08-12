import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualTableProps<T> {
  data: T[];
  height?: number;
  estimateSize?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  header: React.ReactNode;
  footer?: React.ReactNode;
  emptyState?: React.ReactNode;
}

export function VirtualTable<T>({
  data,
  height = 520,
  estimateSize = 44,
  renderRow,
  header,
  footer,
  emptyState,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={parentRef}
      style={{ height: `${height}px` }}
      className="overflow-auto relative w-full border-t border-slate-200 dark:border-slate-800"
    >
      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[700px] border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
          {header}
        </thead>
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="divide-y divide-slate-100 dark:divide-slate-800/60"
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const item = data[virtualRow.index];
            return (
              <tr
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex w-full items-center ${
                  virtualRow.index % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/10'
                }`}
              >
                {renderRow(item, virtualRow.index)}
              </tr>
            );
          })}
        </tbody>
        {footer && (
          <tfoot className="bg-slate-100 dark:bg-slate-800 font-extrabold border-t-2 border-slate-300 dark:border-slate-600 sticky bottom-0 z-20 shadow-sm">
            {footer}
          </tfoot>
        )}
      </table>
    </div>
  );
}
