import React, { useState } from 'react';
import { AuditLogItem } from '../../types/accounting';
import { History, Search, Filter, Clock, UserCheck, Trash2 } from 'lucide-react';
import { db } from '../../services/storage';

interface AuditLogViewProps {
  logs: AuditLogItem[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [keyword, setKeyword] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (keyword) {
      const kw = keyword.toLowerCase();
      const matchTitle = log.actionTitle.toLowerCase().includes(kw);
      const matchDetails = log.details.toLowerCase().includes(kw);
      if (!matchTitle && !matchDetails) return false;
    }
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredLogs.map(log => log.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} nhật ký đã chọn?`)) return;
    
    setIsDeleting(true);
    try {
      await db.auditLogs.bulkDelete(selectedIds);
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete logs:', error);
      alert('Có lỗi xảy ra khi xóa log.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (logs.length === 0) return;
    if (!window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa TOÀN BỘ ${logs.length} nhật ký hệ thống? Hành động này không thể hoàn tác!`)) return;
    
    setIsDeleting(true);
    try {
      await db.auditLogs.clear();
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to clear all logs:', error);
      alert('Có lỗi xảy ra khi xóa toàn bộ log.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Nhật Ký Thao Tác Hệ Thống (Audit Log)</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Ghi lại toàn bộ lịch sử nạp dữ liệu, sửa dòng chứng từ, đối chiếu sao kê và sao lưu CSDL trên máy tính.
          </p>
        </div>
        <span className="px-3 py-1 bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/30 rounded-xl text-xs font-bold shrink-0">
          Tổng log: {logs.length} bản ghi
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm trong nhật ký thao tác..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-bold"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="IMPORT_EXCEL">Import Excel</option>
              <option value="EDIT_TX">Chỉnh sửa chứng từ</option>
              <option value="APPROVE_TX">Duyệt chứng từ</option>
              <option value="MATCH_PAIR">Ghép đối chiếu</option>
              <option value="UNMATCH_PAIR">Hủy đối chiếu</option>
              <option value="CREATE_CLIENT">Tạo khách hàng</option>
              <option value="BACKUP_EXPORT">Sao lưu CSDL</option>
              <option value="RESTORE_DB">Khôi phục CSDL</option>
            </select>
          </div>
        </div>
        
        {(selectedIds.length > 0 || logs.length > 0) && (
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <span className="text-brand-600 dark:text-brand-400 font-medium text-xs">
                  Đã chọn {selectedIds.length} bản ghi
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-3 py-1.5 flex items-center gap-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa đã chọn
                </button>
              )}
              {logs.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa tất cả log
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredLogs.length > 0 && selectedIds.length === filteredLogs.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Tên thao tác</th>
                <th className="p-3">Chi tiết nội dung log</th>
                <th className="p-3">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr 
                  key={log.id} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-default ${selectedIds.includes(log.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).tagName !== 'INPUT') {
                      handleSelectOne(log.id);
                    }
                  }}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={() => handleSelectOne(log.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{log.actionTitle}</td>
                  <td className="p-3 max-w-md truncate">{log.details}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{log.userName || 'Kế toán viên'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
