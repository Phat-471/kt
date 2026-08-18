import Dexie, { type Table } from 'dexie';
import { TradeUnionTransaction, Client, UnionSignerSettings, UnionEmployee, TradeUnionContributionPeriod } from '../types/accounting';
import { DrawingItem, DrawingProject, DrawingCompany } from '../types/drawings';

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  clientId?: string;
}

export interface UnionOpeningBalance {
  year: number;
  cash: number;
  bank: number;
  notes?: string;
  updatedAt?: string;
}

export class UnionDatabase extends Dexie {
  unionTransactions!: Table<TradeUnionTransaction, string>;
  clients!: Table<Client, string>;
  unionSignerSettings!: Table<UnionSignerSettings, string>;
  unionEmployees!: Table<UnionEmployee, string>;
  unionContributionPeriods!: Table<TradeUnionContributionPeriod, string>;
  unionOpeningBalances!: Table<UnionOpeningBalance, number>;
  auditLogs!: Table<AuditLog, string>;
  
  // Phân hệ Quản Lý Bản Vẽ & Công Trình
  drawingProjects!: Table<DrawingProject, string>;
  drawings!: Table<DrawingItem, string>;
  drawingCompanies!: Table<DrawingCompany, string>;

  constructor() {
    super('AccoDesk_Union_DB');
    this.version(5).stores({
      unionTransactions: 'id, clientId, voucherType, voucherNo, date, category, paymentMethod',
      clients: 'id, name, taxCode',
      unionSignerSettings: 'id',
      unionEmployees: 'id, code, fullName, department',
      unionContributionPeriods: 'periodKey, year, periodType',
      unionOpeningBalances: 'year',
      auditLogs: 'id, timestamp, action, clientId',
      drawingProjects: 'id, projectCode, status',
      drawings: 'id, projectId, companyId, drawingNumber, discipline, stageType, issueNature, status',
      drawingCompanies: 'id, role',
    });
  }
}

export const db = new UnionDatabase();

export async function logAuditEvent(action: string, description: string, clientId?: string): Promise<void> {
  try {
    await db.auditLogs.add({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      description,
      timestamp: new Date().toISOString(),
      clientId,
    });
  } catch (e) {
    console.error('Audit log failed', e);
  }
}

// ==========================================
// SAO LƯU & KHÔI PHỤC DỮ LIỆU TOÀN DIỆN
// ==========================================

export interface UnionBackupPackage {
  version: number;
  exportedAt: string;
  transactions: TradeUnionTransaction[];
  employees: UnionEmployee[];
  signerSettings: UnionSignerSettings[];
  contributionPeriods: TradeUnionContributionPeriod[];
  openingBalances?: UnionOpeningBalance[];
}

export async function exportUnionBackupJSON(): Promise<void> {
  const transactions = await db.unionTransactions.toArray();
  const employees = await db.unionEmployees.toArray();
  const signerSettings = await db.unionSignerSettings.toArray();
  const contributionPeriods = await db.unionContributionPeriods.toArray();
  const openingBalances = await db.unionOpeningBalances.toArray();

  const backupPkg: UnionBackupPackage = {
    version: 4,
    exportedAt: new Date().toISOString(),
    transactions,
    employees,
    signerSettings,
    contributionPeriods,
    openingBalances,
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPkg, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `SaoLuu_KeToan_CongDoan_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export async function importUnionBackupJSON(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const pkg: UnionBackupPackage = JSON.parse(text);

    if (!pkg.transactions || !Array.isArray(pkg.transactions)) {
      throw new Error('Định dạng file sao lưu không hợp lệ.');
    }

    await db.transaction('rw', [db.unionTransactions, db.unionEmployees, db.unionSignerSettings, db.unionContributionPeriods, db.unionOpeningBalances], async () => {
      if (pkg.transactions.length > 0) {
        await db.unionTransactions.clear();
        await db.unionTransactions.bulkPut(pkg.transactions);
      }
      if (pkg.employees && pkg.employees.length > 0) {
        await db.unionEmployees.clear();
        await db.unionEmployees.bulkPut(pkg.employees);
      }
      if (pkg.signerSettings && pkg.signerSettings.length > 0) {
        await db.unionSignerSettings.clear();
        await db.unionSignerSettings.bulkPut(pkg.signerSettings);
      }
      if (pkg.contributionPeriods && pkg.contributionPeriods.length > 0) {
        await db.unionContributionPeriods.clear();
        await db.unionContributionPeriods.bulkPut(pkg.contributionPeriods);
      }
      if (pkg.openingBalances && pkg.openingBalances.length > 0) {
        await db.unionOpeningBalances.clear();
        await db.unionOpeningBalances.bulkPut(pkg.openingBalances);
      }
    });

    return { 
      success: true, 
      message: `Khôi phục thành công: ${pkg.transactions.length} phiếu thu/chi, ${pkg.employees?.length || 0} nhân viên, ${pkg.contributionPeriods?.length || 0} bảng trích nộp tháng, ${pkg.openingBalances?.length || 0} số dư đầu kỳ!` 
    };
  } catch (err: any) {
    return { success: false, message: `Lỗi khôi phục: ${err?.message || 'File lỗi'}` };
  }
}

export const DEFAULT_OPENING_BALANCES: UnionOpeningBalance[] = [
  { year: 2023, cash: 15594300, bank: 26460, notes: 'Số dư đầu kỳ gốc năm 2023', updatedAt: new Date().toISOString() },
  { year: 2024, cash: 11149200, bank: 26510, notes: 'Số dư đầu kỳ năm 2024', updatedAt: new Date().toISOString() },
  { year: 2025, cash: 2309760, bank: 4041874, notes: 'Số dư đầu kỳ năm 2025', updatedAt: new Date().toISOString() },
  { year: 2026, cash: 438010, bank: 123430, notes: 'Số dư đầu kỳ năm 2026', updatedAt: new Date().toISOString() },
];

export const DEFAULT_SIGNER_SETTINGS: UnionSignerSettings = {
  id: 'default-signer-settings',
  unitTitle: 'CÔNG ĐOÀN CƠ SỞ',
  companyName: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
  companyAddress: '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM',
  headOfUnitTitle: 'THỦ TRƯỞNG ĐƠN VỊ',
  headOfUnitName: 'Ngô Thị Bích Ngọc',
  accountantName: 'Nguyễn Thị Cẩm Ly',
  preparerName: 'Nguyễn Thị Cẩm Ly',
  treasurerName: 'Bùi Xuân Mai Thảo',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_EMPLOYEES: UnionEmployee[] = [
  { id: 'emp-01', code: '01', fullName: 'Trần Minh Thắng', department: 'Sản xuất', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-02', code: '02', fullName: 'Lê Hoàng Sỹ', department: 'Sản xuất', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-03', code: '03', fullName: 'Dương Hồng Loan', department: 'Kinh doanh', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-04', code: '04', fullName: 'Lê Chí Thân', department: 'Kỹ thuật', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-05', code: '05', fullName: 'Nguyễn Văn Hây', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-06', code: '06', fullName: 'Võ Huy Phong', department: 'Kỹ thuật', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-07', code: '07', fullName: 'Nguyễn Bá Thành', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-08', code: '08', fullName: 'Vòng Và Tuấn', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-09', code: '09', fullName: 'Nguyễn Nguyên Hùng', department: 'Kỹ thuật', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-10', code: '10', fullName: 'Trần Thị Ngọc Dung', department: 'Hành chính', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-11', code: '11', fullName: 'Cao Đình Dương', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-12', code: '12', fullName: 'Thái Trung Dũng', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-13', code: '13', fullName: 'Trần Văn Hiếu', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-14', code: '14', fullName: 'Nguyễn Thị Nhung', department: 'Hành chính', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-15', code: '15', fullName: 'Võ Thị Mộng Thúy', department: 'Kế toán', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-16', code: '16', fullName: 'Lê Văn Điền', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-17', code: '17', fullName: 'Nguyễn Luân Anh Vũ', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-18', code: '18', fullName: 'Liên San', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-19', code: '19', fullName: 'Nguyễn Thị Ngọc Trinh', department: 'Hành chính', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-20', code: '20', fullName: 'Ngô Thị Bích Ngọc', department: 'Ban Giám Đốc', insuranceSalary: 15000000, isActive: true },
  { id: 'emp-21', code: '21', fullName: 'Ngô Tiến Đạt', department: 'Kỹ thuật', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-22', code: '22', fullName: 'Nguyễn Quốc Đạt', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-23', code: '23', fullName: 'Tô Thị Ngọc Yến', department: 'Kế toán', insuranceSalary: 5310000, isActive: true },
  { id: 'emp-24', code: '24', fullName: 'Nguyễn Kiên Hải', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-25', code: '25', fullName: 'Trần Thuận Châu', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-26', code: '26', fullName: 'Phạm Tuấn Anh', department: 'Kỹ thuật', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-27', code: '27', fullName: 'Nguyễn Bá Quản', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-28', code: '28', fullName: 'Sử Ngọc Quế', department: 'Sản xuất', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-29', code: '29', fullName: 'Ngô Thị Tuyết', department: 'Kinh doanh', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-30', code: '30', fullName: 'Nguyễn Trương Vũ', department: 'Ban Giám Đốc', insuranceSalary: 20000000, isActive: true },
  { id: 'emp-31', code: '31', fullName: 'Lê Thị Thu Thảo', department: 'Hành chính', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-32', code: '32', fullName: 'Lâm Nhật Quang', department: 'Thi công', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-33', code: '33', fullName: 'Nguyễn Thị Cẩm Ly', department: 'Kế toán CĐCS', insuranceSalary: 5700000, isActive: true },
  { id: 'emp-34', code: '34', fullName: 'Bùi Xuân Mai Thảo', department: 'Thủ quỹ CĐCS', insuranceSalary: 5700000, isActive: true },
];

export async function seedInitialUnionData(): Promise<void> {
  const count = await db.clients.count();
  if (count === 0) {
    await db.clients.add({
      id: 'cong-doan-cs-01',
      name: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
      taxCode: '0309178743',
      address: '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM',
      financialYear: 2026,
    });
  }

  const signerCount = await db.unionSignerSettings.count();
  if (signerCount === 0) {
    await db.unionSignerSettings.add(DEFAULT_SIGNER_SETTINGS);
  }

  const empCount = await db.unionEmployees.count();
  if (empCount === 0) {
    await db.unionEmployees.bulkAdd(DEFAULT_EMPLOYEES);
  }

  const obCount = await db.unionOpeningBalances.count();
  if (obCount === 0) {
    await db.unionOpeningBalances.bulkAdd(DEFAULT_OPENING_BALANCES);
  }

  // Seed dữ liệu ban đầu cho Phân hệ Bản Vẽ
  await seedInitialDrawingsData();
}

export async function seedInitialDrawingsData(): Promise<void> {
  const { MOCK_PROJECTS, MOCK_COMPANIES, MOCK_DRAWINGS } = await import('./mockDrawingsData');
  
  const projCount = await db.drawingProjects.count();
  if (projCount === 0) {
    await db.drawingProjects.bulkAdd(MOCK_PROJECTS);
  }

  const compCount = await db.drawingCompanies.count();
  if (compCount === 0) {
    await db.drawingCompanies.bulkAdd(MOCK_COMPANIES);
  }

  const drawCount = await db.drawings.count();
  if (drawCount === 0) {
    await db.drawings.bulkAdd(MOCK_DRAWINGS);
  }
}


