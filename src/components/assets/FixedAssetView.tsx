import React, { useState, useEffect, useMemo } from 'react';
import {
  FixedAsset, AssetGroup,
  ASSET_GROUP_DEFAULTS,
  calculateDepreciationSchedule,
  getTotalMonthlyDepreciation,
  getAllFixedAssets, saveFixedAsset, deleteFixedAsset,
} from '../../services/fixedAssetService';
import { Client } from '../../types/accounting';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PageHeader, SubTabNav, StatCard } from '../common';
import {
  Building2, Plus, Trash2, Edit3, X, Save,
  AlertTriangle, TrendingDown, BarChart3
} from 'lucide-react';

interface FixedAssetViewProps {
  activeClient: Client | null;
}

const DEPARTMENTS = ['Kế toán', 'Văn phòng', 'Hành chính', 'Kinh doanh', 'Sản xuất', 'Kỹ thuật', 'Ban giám đốc', 'Khác'];
const GROUPS = Object.entries(ASSET_GROUP_DEFAULTS) as [AssetGroup, typeof ASSET_GROUP_DEFAULTS[AssetGroup]][];

const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const emptyAsset = (): Omit<FixedAsset, 'id' | 'code'> => ({
  name: '',
  group: 'THIET_BI_DIEN_TU',
  department: 'Kế toán',
  purchaseDate: currentMonth + '-01',
  useDate: currentMonth + '-01',
  originalCost: 10_000_000,
  salvageValue: 0,
  usefulLifeMonths: ASSET_GROUP_DEFAULTS.THIET_BI_DIEN_TU.defaultYears * 12,
  accountDebit: '642',
  accountCredit: '214',
  accountAsset: '211',
  status: 'ACTIVE',
});

export const FixedAssetView: React.FC<FixedAssetViewProps> = ({ activeClient }) => {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [activeTab, setActiveTab] = useState<'DANH_SACH' | 'BANG_KH' | 'CHI_TIET'>('DANH_SACH');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [newAsset, setNewAsset] = useState<Omit<FixedAsset, 'id' | 'code'>>(emptyAsset());
  const [viewMonth, setViewMonth] = useState(currentMonth);

  const refresh = () => setAssets(getAllFixedAssets());
  useEffect(() => { refresh(); }, []);

  const monthlyResult = useMemo(() =>
    getTotalMonthlyDepreciation(assets, viewMonth), [assets, viewMonth]);

  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const selectedSchedule = useMemo(() =>
    selectedAsset ? calculateDepreciationSchedule(selectedAsset) : null,
    [selectedAsset]);

  const handleSaveNew = () => {
    if (!newAsset.name.trim()) { alert('Vui lòng nhập tên tài sản!'); return; }
    const code = `TSCĐ-${String(assets.length + 1).padStart(3, '0')}`;
    saveFixedAsset({ ...newAsset, id: `fa-${Date.now()}`, code });
    refresh();
    setShowAddForm(false);
    setNewAsset(emptyAsset());
  };

  const handleSaveEdit = () => {
    if (!editingAsset) return;
    saveFixedAsset(editingAsset);
    refresh();
    setEditingAsset(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Xóa tài sản này?')) return;
    deleteFixedAsset(id);
    refresh();
    if (selectedAssetId === id) setSelectedAssetId(null);
  };

  const totalOriginalCost = assets.reduce((s, a) => s + a.originalCost, 0);
  const activeAssets = assets.filter(a => a.status === 'ACTIVE');

  const getDepreciatedMonths = (a: FixedAsset) => {
    const use = new Date(a.useDate);
    const now2 = new Date();
    return Math.min(
      Math.max(0, (now2.getFullYear() - use.getFullYear()) * 12 + now2.getMonth() - use.getMonth()),
      a.usefulLifeMonths,
    );
  };

  const getProgressPct = (a: FixedAsset) => Math.min(100, Math.round((getDepreciatedMonths(a) / a.usefulLifeMonths) * 100));

  const tabs = [
    { id: 'DANH_SACH' as const, label: 'Danh Sách TSCĐ', icon: Building2, count: assets.length },
    { id: 'BANG_KH' as const, label: 'Bảng Khấu Hao Tháng', icon: TrendingDown },
    { id: 'CHI_TIET' as const, label: 'Chi Tiết KH', icon: BarChart3 },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        icon={Building2}
        title="Tài Sản Cố Định & Khấu Hao"
        subtitle={`Phương pháp đường thẳng — TT45/2013 & TT200/2014${activeClient ? ` — ${activeClient.name}` : ''}`}
        variant="gradient"
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-blue-950 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm TSCĐ
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Tổng TSCĐ"
          value={`${assets.length} tài sản`}
          variant="amber"
          compact
        />
        <StatCard
          label="Đang sử dụng"
          value={`${activeAssets.length} tài sản`}
          variant="emerald"
          compact
        />
        <StatCard
          label="Tổng nguyên giá"
          value={`${formatCurrency(totalOriginalCost)} đ`}
          variant="slate"
          compact
        />
        <StatCard
          label={`KH tháng ${viewMonth.slice(5)}/${viewMonth.slice(0, 4)}`}
          value={`${formatCurrency(monthlyResult.total)} đ`}
          variant="rose"
          compact
        />
      </div>

      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t)}
      />

      {activeTab === 'DANH_SACH' && (
        <div className="space-y-3">
          {showAddForm && (
            <AssetForm
              asset={newAsset as FixedAsset}
              onChange={(f, v) => setNewAsset(prev => ({ ...prev, [f]: v }))}
              onSave={handleSaveNew}
              onCancel={() => { setShowAddForm(false); setNewAsset(emptyAsset()); }}
              isNew
            />
          )}

          {assets.length === 0 && !showAddForm && (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có TSCĐ. Nhấn "Thêm TSCĐ" để bắt đầu.</p>
            </div>
          )}

          {assets.map(asset => {
            const pct = getProgressPct(asset);
            const isEditing = editingAsset?.id === asset.id;
            const sch = calculateDepreciationSchedule(asset);

            return (
              <div key={asset.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                {isEditing ? (
                  <div className="p-4">
                    <AssetForm
                      asset={editingAsset!}
                      onChange={(f, v) => setEditingAsset(prev => prev ? { ...prev, [f]: v } : prev)}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingAsset(null)}
                    />
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">{asset.code}</span>
                          <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{asset.name}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            asset.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                          }`}>{asset.status === 'ACTIVE' ? '✓ Đang dùng' : asset.status}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {ASSET_GROUP_DEFAULTS[asset.group].label} · {asset.department} · Đưa vào dùng: {asset.useDate}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                          <div>
                            <p className="text-slate-400 text-[10px]">Nguyên giá</p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(asset.originalCost)} đ</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">KH/tháng</p>
                            <p className="font-bold text-rose-700 dark:text-rose-400">{formatCurrency(sch.monthlyAmount)} đ</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">Tỷ lệ KH/năm</p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{sch.depreciationRate}%</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-[10px]">Kết thúc KH</p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{sch.completionDate}</p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Đã khấu hao {pct}% ({getDepreciatedMonths(asset)}/{asset.usefulLifeMonths} tháng)</span>
                            <span>Còn lại: {formatCurrency(asset.originalCost - sch.schedule.slice(0, getDepreciatedMonths(asset)).reduce((s, r) => s + r.monthlyAmount, 0))} đ</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-slate-400' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setSelectedAssetId(asset.id); setActiveTab('CHI_TIET'); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                          title="Xem lịch KH"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingAsset(asset)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(asset.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'BANG_KH' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tháng:</label>
            <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <span className="text-xs text-slate-500">Tổng KH tháng này: <strong className="text-rose-700 dark:text-rose-400">{formatCurrency(monthlyResult.total)} đ</strong></span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">BẢNG PHÂN BỔ KHẤU HAO TSCĐ THÁNG {viewMonth}</p>
              <p className="text-[10px] text-slate-500">Hạch toán: Nợ TK Chi Phí / Có TK 214 (KHTSCĐ)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[600px]">
                <thead className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Mã TSCĐ</th>
                    <th className="px-4 py-3">Tên Tài Sản</th>
                    <th className="px-4 py-3">Bộ Phận</th>
                    <th className="px-4 py-3 text-center">Nợ TK</th>
                    <th className="px-4 py-3 text-center">Có TK</th>
                    <th className="px-4 py-3 text-right">Số Tiền KH (đ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monthlyResult.entries.map((e, i) => {
                    const asset = assets.find(a => a.code === e.assetCode);
                    return (
                      <tr key={i} className={`hover:bg-amber-50/20 dark:hover:bg-amber-900/10 ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                        <td className="px-4 py-2 font-mono text-amber-700 dark:text-amber-400 font-bold">{e.assetCode}</td>
                        <td className="px-4 py-2 text-slate-900 dark:text-slate-100">{e.assetName}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]">{e.department}</span>
                        </td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-amber-700 dark:text-amber-400">{asset?.accountDebit}</td>
                        <td className="px-4 py-2 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">{asset?.accountCredit}</td>
                        <td className="px-4 py-2 text-right tabular-num font-bold text-rose-700 dark:text-rose-400">{formatCurrency(e.amount)}</td>
                      </tr>
                    );
                  })}
                  {monthlyResult.entries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        Không có khấu hao trong tháng {viewMonth}
                      </td>
                    </tr>
                  )}
                  {monthlyResult.entries.length > 0 && (
                    <tr className="bg-amber-50 dark:bg-amber-900/20 font-extrabold border-t-2 border-amber-200 dark:border-amber-500/30">
                      <td colSpan={5} className="px-4 py-3 text-xs uppercase text-amber-800 dark:text-amber-300">CỘNG KHẤU HAO THÁNG</td>
                      <td className="px-4 py-3 text-right tabular-num text-rose-700 dark:text-rose-400">{formatCurrency(monthlyResult.total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {Object.keys(monthlyResult.byDepartment).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(monthlyResult.byDepartment).map(([dept, amt]) => (
                <div key={dept} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{dept}</p>
                  <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400 tabular-num">{formatCurrency(amt)} đ</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'CHI_TIET' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Chọn TSCĐ:</label>
            <select value={selectedAssetId || ''} onChange={e => setSelectedAssetId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="">-- Chọn tài sản --</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>

          {selectedSchedule && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Nguyên giá"
                  value={`${formatCurrency(selectedSchedule.asset.originalCost)} đ`}
                  variant="slate"
                  compact
                />
                <StatCard
                  label="KH/tháng"
                  value={`${formatCurrency(selectedSchedule.monthlyAmount)} đ`}
                  variant="rose"
                  compact
                />
                <StatCard
                  label="Tỷ lệ KH/năm"
                  value={`${selectedSchedule.depreciationRate}%`}
                  variant="amber"
                  compact
                />
                <StatCard
                  label="Thời gian KH"
                  value={`${selectedSchedule.asset.usefulLifeMonths} tháng`}
                  variant="blue"
                  compact
                />
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">BẢNG TÍNH KHẤU HAO: {selectedSchedule.asset.name}</p>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2">Tháng</th>
                        <th className="px-4 py-2 text-right">KH Tháng (đ)</th>
                        <th className="px-4 py-2 text-right">KH Lũy Kế (đ)</th>
                        <th className="px-4 py-2 text-right">Giá Trị Còn Lại (đ)</th>
                        <th className="px-4 py-2">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {selectedSchedule.schedule.map((row, i) => (
                        <tr key={i} className={`hover:bg-amber-50/20 ${row.month === currentMonth ? 'bg-amber-50/50 dark:bg-amber-900/10 font-bold' : ''}`}>
                          <td className="px-4 py-1.5 tabular-num">
                            {row.month}
                            {row.month === currentMonth && <span className="ml-1 text-[10px] text-amber-700 dark:text-amber-400">(tháng này)</span>}
                          </td>
                          <td className="px-4 py-1.5 text-right tabular-num text-rose-700 dark:text-rose-400">{formatCurrency(row.monthlyAmount)}</td>
                          <td className="px-4 py-1.5 text-right tabular-num text-amber-700 dark:text-amber-400">{formatCurrency(row.accumulatedDepreciation)}</td>
                          <td className="px-4 py-1.5 text-right tabular-num text-emerald-700 dark:text-emerald-400">{formatCurrency(row.bookValue)}</td>
                          <td className="px-4 py-1.5">
                            {row.isFullyDepreciated
                              ? <span className="text-[10px] text-slate-400">Hết KH</span>
                              : <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (row.accumulatedDepreciation / selectedSchedule.totalDepreciation) * 100)}%` }} /></div>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!selectedAssetId && (
            <div className="py-12 text-center text-slate-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Chọn TSCĐ để xem lịch khấu hao chi tiết</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Lưu ý TT45/2013:</strong> Thời gian KH tối thiểu: Nhà xưởng 10 năm | Máy móc 5 năm | PTĐB 6 năm | TBQL 3 năm | Máy tính 3 năm. Doanh nghiệp cần đăng ký với cơ quan thuế khi thay đổi phương pháp KH.
        </span>
      </div>
    </div>
  );
};

const AssetForm: React.FC<{
  asset: FixedAsset;
  onChange: (field: keyof FixedAsset, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}> = ({ asset, onChange, onSave, onCancel, isNew }) => {
  const defaultGroup = ASSET_GROUP_DEFAULTS[asset.group];

  return (
    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-extrabold text-amber-800 dark:text-amber-300">{isNew ? '➕ Thêm TSCĐ Mới' : '✏️ Cập Nhật TSCĐ'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Tên Tài Sản *</label>
          <input type="text" value={asset.name} onChange={e => onChange('name', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nhóm TSCĐ</label>
          <select value={asset.group} onChange={e => {
            const g = e.target.value as AssetGroup;
            onChange('group', g);
            onChange('usefulLifeMonths', ASSET_GROUP_DEFAULTS[g].defaultYears * 12);
          }} className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {GROUPS.map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Bộ Phận</label>
          <select value={asset.department} onChange={e => onChange('department', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400">
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        {[
          { label: 'Ngày mua', field: 'purchaseDate', type: 'date' },
          { label: 'Ngày đưa vào dùng', field: 'useDate', type: 'date' },
        ].map(f => (
          <div key={f.field}>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">{f.label}</label>
            <input type={f.type} value={String((asset as any)[f.field])} onChange={e => onChange(f.field as keyof FixedAsset, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Nguyên Giá (đ) *</label>
          <input type="number" min={0} step={1000000} value={asset.originalCost} onChange={e => onChange('originalCost', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Giá Trị Thu Hồi (đ)</label>
          <input type="number" min={0} step={1000000} value={asset.salvageValue} onChange={e => onChange('salvageValue', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            Thời gian KH (tháng) <span className="text-amber-600">TT45: {defaultGroup.minYears*12}–{defaultGroup.maxYears*12}T</span>
          </label>
          <input type="number" min={defaultGroup.minYears * 12} max={defaultGroup.maxYears * 12} value={asset.usefulLifeMonths} onChange={e => onChange('usefulLifeMonths', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">TK Chi Phí KH (Nợ)</label>
          <input type="text" value={asset.accountDebit} onChange={e => onChange('accountDebit', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer">
          <Save className="w-3.5 h-3.5" /> {isNew ? 'Thêm TSCĐ' : 'Lưu'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer">
          <X className="w-3.5 h-3.5" /> Hủy
        </button>
      </div>
    </div>
  );
};
