/**
 * Fixed Asset Service — Quản Lý Tài Sản Cố Định & Khấu Hao
 * Chuẩn: TT45/2013/TT-BTC (Khung thời gian khấu hao), TT200/2014
 * Phương pháp: Đường thẳng (Straight-line)
 * Bút toán khấu hao: Nợ 214 / Có 211
 */

// ============================================================
// TYPES
// ============================================================

export type AssetGroup =
  | 'NHADAT_NHAXA'        // Nhà đất, nhà xưởng (10-50 năm)
  | 'MAY_MOC'             // Máy móc, thiết bị (5-12 năm)
  | 'PHUONG_TIEN'         // Phương tiện vận tải (6-10 năm)
  | 'THIET_BI_QUAN_LY'   // Thiết bị quản lý, VP (3-8 năm)
  | 'THIET_BI_DIEN_TU'   // Máy tính, thiết bị điện tử (3-5 năm)
  | 'TAI_SAN_KHAC';       // Tài sản khác (4-25 năm)

export interface FixedAsset {
  id: string;
  code: string;               // Mã TSCĐ (VD: TSCĐ-001)
  name: string;               // Tên tài sản
  group: AssetGroup;          // Nhóm TSCĐ
  department: string;         // Bộ phận sử dụng
  description?: string;       // Mô tả
  purchaseDate: string;       // Ngày mua (YYYY-MM-DD)
  useDate: string;            // Ngày đưa vào sử dụng (YYYY-MM-DD)
  originalCost: number;       // Nguyên giá (đ)
  salvageValue: number;       // Giá trị thu hồi ước tính (đ)
  usefulLifeMonths: number;   // Thời gian khấu hao (tháng)
  accountDebit: string;       // TK Chi phí KH (VD: 627, 641, 642...)
  accountCredit: string;      // TK KHTSCĐ (VD: 214)
  accountAsset: string;       // TK Nguyên giá (VD: 211)
  status: 'ACTIVE' | 'RETIRED' | 'SOLD' | 'DISPOSED';
  retireDate?: string;        // Ngày thanh lý/nhượng bán
  notes?: string;
}

export interface MonthlyDepreciation {
  month: string;              // 'YYYY-MM'
  monthlyAmount: number;      // Số tiền KH tháng
  accumulatedDepreciation: number; // Khấu hao lũy kế đến cuối tháng
  bookValue: number;          // Giá trị còn lại = Nguyên giá - KH lũy kế
  isFullyDepreciated: boolean;
  accountingEntry: { debitAcc: string; creditAcc: string; amount: number; description: string };
}

export interface DepreciationSchedule {
  asset: FixedAsset;
  monthlyAmount: number;      // Số tiền KH/tháng
  annualAmount: number;       // Số tiền KH/năm
  depreciationRate: number;   // Tỷ lệ KH (%/năm)
  totalMonths: number;
  completionDate: string;     // Ngày kết thúc KH
  schedule: MonthlyDepreciation[];
  totalDepreciation: number;  // Tổng KH = Nguyên giá - Giá trị thu hồi
}

// ============================================================
// KHUNG THỜI GIAN KHẤU HAO TT45/2013
// ============================================================

export const ASSET_GROUP_DEFAULTS: Record<AssetGroup, { minYears: number; maxYears: number; defaultYears: number; label: string }> = {
  NHADAT_NHAXA:       { minYears: 10, maxYears: 50, defaultYears: 25, label: 'Nhà đất, Nhà xưởng' },
  MAY_MOC:            { minYears: 5,  maxYears: 12, defaultYears: 8,  label: 'Máy móc, Thiết bị' },
  PHUONG_TIEN:        { minYears: 6,  maxYears: 10, defaultYears: 8,  label: 'Phương tiện vận tải' },
  THIET_BI_QUAN_LY:  { minYears: 3,  maxYears: 8,  defaultYears: 5,  label: 'Thiết bị quản lý, VP' },
  THIET_BI_DIEN_TU:  { minYears: 3,  maxYears: 5,  defaultYears: 3,  label: 'Máy tính, Thiết bị điện tử' },
  TAI_SAN_KHAC:       { minYears: 4,  maxYears: 25, defaultYears: 10, label: 'Tài sản khác' },
};

// ============================================================
// CORE CALCULATION — Phương pháp Đường Thẳng
// ============================================================

export function calculateDepreciationSchedule(asset: FixedAsset): DepreciationSchedule {
  const depreciableAmount = asset.originalCost - asset.salvageValue;
  const monthlyAmount = Math.round(depreciableAmount / asset.usefulLifeMonths);
  const annualAmount = monthlyAmount * 12;
  const depreciationRate = Number(((annualAmount / asset.originalCost) * 100).toFixed(2));

  // Tính ngày kết thúc khấu hao
  const useDate = new Date(asset.useDate);
  const endDate = new Date(useDate);
  endDate.setMonth(endDate.getMonth() + asset.usefulLifeMonths);
  const completionDate = endDate.toISOString().slice(0, 10);

  // Sinh bảng khấu hao từng tháng
  const schedule: MonthlyDepreciation[] = [];
  let accumulated = 0;
  let currentDate = new Date(useDate.getFullYear(), useDate.getMonth(), 1);

  for (let i = 0; i < asset.usefulLifeMonths; i++) {
    const remaining = depreciableAmount - accumulated;
    // Tháng cuối: lấy số dư còn lại để tránh sai lệch làm tròn
    const thisMonth = i === asset.usefulLifeMonths - 1
      ? Math.max(0, remaining)
      : Math.min(monthlyAmount, remaining);

    accumulated += thisMonth;

    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    schedule.push({
      month: monthStr,
      monthlyAmount: thisMonth,
      accumulatedDepreciation: accumulated,
      bookValue: asset.originalCost - accumulated,
      isFullyDepreciated: accumulated >= depreciableAmount,
      accountingEntry: {
        debitAcc: asset.accountDebit,
        creditAcc: asset.accountCredit,
        amount: thisMonth,
        description: `Khấu hao TSCĐ tháng ${monthStr}: ${asset.name} (${asset.code})`,
      },
    });

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return {
    asset,
    monthlyAmount,
    annualAmount,
    depreciationRate,
    totalMonths: asset.usefulLifeMonths,
    completionDate,
    schedule,
    totalDepreciation: depreciableAmount,
  };
}

/** Lấy số tiền khấu hao của một tháng cụ thể (YYYY-MM) */
export function getMonthlyDepreciation(asset: FixedAsset, month: string): number {
  if (asset.status !== 'ACTIVE') return 0;
  const schedule = calculateDepreciationSchedule(asset);
  const row = schedule.schedule.find(r => r.month === month);
  return row?.monthlyAmount || 0;
}

/** Tổng khấu hao tất cả TSCĐ trong một tháng */
export function getTotalMonthlyDepreciation(assets: FixedAsset[], month: string): {
  total: number;
  byDepartment: Record<string, number>;
  entries: Array<{ assetCode: string; assetName: string; department: string; amount: number }>;
} {
  const entries: Array<{ assetCode: string; assetName: string; department: string; amount: number }> = [];
  const byDepartment: Record<string, number> = {};

  for (const asset of assets.filter(a => a.status === 'ACTIVE')) {
    const amt = getMonthlyDepreciation(asset, month);
    if (amt > 0) {
      entries.push({ assetCode: asset.code, assetName: asset.name, department: asset.department, amount: amt });
      byDepartment[asset.department] = (byDepartment[asset.department] || 0) + amt;
    }
  }

  return { total: entries.reduce((s, e) => s + e.amount, 0), byDepartment, entries };
}

// ============================================================
// STORAGE (localStorage / in-memory fallback)
// ============================================================

const FA_KEY = 'accodesk_fixed_assets';

const _memStore: FixedAsset[] = [
  // TSCĐ mẫu
  {
    id: 'fa-001', code: 'TSCĐ-001', name: 'Xe ô tô Ford Transit 16 chỗ',
    group: 'PHUONG_TIEN', department: 'Hành chính', description: 'Biển số 51G-12345',
    purchaseDate: '2022-01-15', useDate: '2022-02-01',
    originalCost: 800_000_000, salvageValue: 50_000_000, usefulLifeMonths: 96,
    accountDebit: '642', accountCredit: '214', accountAsset: '211',
    status: 'ACTIVE',
  },
  {
    id: 'fa-002', code: 'TSCĐ-002', name: 'Máy tính xách tay Dell Latitude 15',
    group: 'THIET_BI_DIEN_TU', department: 'Kế toán', description: 'SN: DL2024001',
    purchaseDate: '2024-03-01', useDate: '2024-03-01',
    originalCost: 28_000_000, salvageValue: 0, usefulLifeMonths: 36,
    accountDebit: '642', accountCredit: '214', accountAsset: '211',
    status: 'ACTIVE',
  },
  {
    id: 'fa-003', code: 'TSCĐ-003', name: 'Máy điều hòa Daikin 18000 BTU',
    group: 'THIET_BI_QUAN_LY', department: 'Văn phòng', description: '2 chiếc',
    purchaseDate: '2023-06-01', useDate: '2023-06-15',
    originalCost: 45_000_000, salvageValue: 5_000_000, usefulLifeMonths: 60,
    accountDebit: '642', accountCredit: '214', accountAsset: '211',
    status: 'ACTIVE',
  },
];

export function getAllFixedAssets(): FixedAsset[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [..._memStore];
    const raw = localStorage.getItem(FA_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(FA_KEY, JSON.stringify(_memStore));
    return [..._memStore];
  } catch { return [..._memStore]; }
}

export function saveFixedAsset(asset: FixedAsset): void {
  const all = getAllFixedAssets();
  const idx = all.findIndex(a => a.id === asset.id);
  if (idx >= 0) all[idx] = asset;
  else all.push(asset);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(FA_KEY, JSON.stringify(all));
  } else { _memStore.length = 0; _memStore.push(...all); }
}

export function deleteFixedAsset(id: string): void {
  const all = getAllFixedAssets().filter(a => a.id !== id);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(FA_KEY, JSON.stringify(all));
  } else { _memStore.length = 0; _memStore.push(...all); }
}
