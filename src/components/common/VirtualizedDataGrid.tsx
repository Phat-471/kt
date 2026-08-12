import React, { useRef, useEffect, useState } from 'react';
import * as ReactWindow from 'react-window';

const List = (ReactWindow as any).FixedSizeList || (ReactWindow as any).default?.FixedSizeList || ReactWindow;

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(height);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setGridHeight(entry.contentRect.height - 40); // trừ chiều cao header 40px
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
        {emptyText}
      </div>
    );
  }

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`flex items-center border-b border-slate-100 dark:border-slate-800/60 px-3 text-xs transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 ${
          isEven ? 'bg-white dark:bg-slate-900/60' : 'bg-slate-50/60 dark:bg-slate-900/20'
        }`}
      >
        {columns.map((col, colIdx) => (
          <div
            key={colIdx}
            className={`truncate px-2 ${col.className || 'flex-1'}`}
            style={typeof col.width === 'number' ? { width: col.width, flexShrink: 0 } : undefined}
          >
            {col.render(item, index)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full h-full border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col">
      {/* Table Header */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 select-none shrink-0">
        {columns.map((col, colIdx) => (
          <div
            key={colIdx}
            className={`truncate px-2 uppercase tracking-wider ${col.className || 'flex-1'}`}
            style={typeof col.width === 'number' ? { width: col.width, flexShrink: 0 } : undefined}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Virtualized Rows List */}
      <div className="flex-1 w-full">
        <List
          height={Math.max(200, gridHeight)}
          itemCount={items.length}
          itemSize={rowHeight}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
