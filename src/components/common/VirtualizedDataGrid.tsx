import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface ColumnDef<T> {
  header: string | React.ReactNode;
  width?: number | string; // flex width or fixed px
  className?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface VirtualizedDataGridProps<T> {
  items: T[];
  columns: ColumnDef<T>[];
  rowHeight?: number;
  height?: number;
  emptyText?: string;
  keyExtractor: (item: T, index: number) => string;
}

export function VirtualizedDataGrid<T>({
  items,
  columns,
  rowHeight = 44,
  height = 500,
  emptyText = 'Không có dữ liệu hiển thị',
  keyExtractor,
}: VirtualizedDataGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  return (
    <div className="w-full flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 select-none z-10 shrink-0">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={`truncate px-2 ${col.className || ''}`}
            style={{
              flex: typeof col.width === 'number' ? `0 0 ${col.width}px` : (col.width || 1),
              maxWidth: typeof col.width === 'number' ? `${col.width}px` : undefined,
            }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div
          className="flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 py-12"
          style={{ height }}
        >
          {emptyText}
        </div>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto scrollbar-thin"
          style={{ height }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = items[virtualRow.index];
              const isEven = virtualRow.index % 2 === 0;

              return (
                <div
                  key={keyExtractor(item, virtualRow.index)}
                  className={`flex items-center px-4 border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-xs text-slate-700 dark:text-slate-300 ${
                    isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-950/30'
                  }`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <div
                      key={colIdx}
                      className={`truncate px-2 ${col.className || ''}`}
                      style={{
                        flex: typeof col.width === 'number' ? `0 0 ${col.width}px` : (col.width || 1),
                        maxWidth: typeof col.width === 'number' ? `${col.width}px` : undefined,
                      }}
                    >
                      {col.render(item, virtualRow.index)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
