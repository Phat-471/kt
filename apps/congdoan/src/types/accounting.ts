export interface Client {
  id: string;
  name: string;
  taxCode: string;
  address: string;
  financialYear: number;
}

export interface UnionSignerSettings {
  id: string;
  unitTitle: string; // VD: CÔNG ĐOÀN CƠ SỞ
  companyName: string; // VD: CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT
  companyAddress: string; // VD: 153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM
  headOfUnitTitle: string; // VD: THỦ TRƯỞNG ĐƠN VỊ hoặc CHỦ TỊCH CĐCS
  headOfUnitName: string; // VD: Ngô Thị Bích Ngọc
  accountantName: string; // VD: Nguyễn Thị Cẩm Ly
  preparerName: string; // VD: Nguyễn Thị Cẩm Ly
  treasurerName: string; // VD: Bùi Xuân Mai Thảo
  updatedAt?: string;
}

export interface UnionEmployee {
  id: string;
  code: string; // VD: 123, NV01
  fullName: string; // VD: Nguyễn Văn A
  department?: string; // VD: Phân xưởng 1, Khối VP
  insuranceSalary?: number;
  isActive?: boolean;
}

export type TradeUnionVoucherType = 'UNION_RECEIPT' | 'UNION_PAYMENT';

export type TradeUnionCategory =
  | 'KPCĐ_2_PERCENT'
  | 'DOAN_PHI_1_PERCENT'
  | 'KINH_PHI_CAP_TREN'
  | 'HO_TRO_KHAC'
  | 'THAM_HOI_OM_DAU'
  | 'QUA_LE_TET'
  | 'HOAT_DONG_PHONG_TRAO'
  | 'KHEN_THUONG'
  | 'NOP_CAP_TREN_25'
  | 'PHU_CAP_CAN_BO_CD'
  | 'CHI_KHAC';

export interface TradeUnionTransaction {
  id: string;
  clientId?: string;
  voucherType: TradeUnionVoucherType;
  voucherNo: string;
  date: string;
  category: TradeUnionCategory;
  personName: string;
  department?: string;
  reason: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK';
  attachedDocs?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeUnionMemberContribution {
  stt: number;
  employeeId?: string;
  employeeCode?: string;
  fullName: string;
  insuranceSalary: number;
  status?: 'ACTIVE' | 'MATERNITY' | 'UNPAID_LEAVE' | 'RESIGNED';
  kpcdRetainedAmount: number; // 75% trên 2%
  kpcdSuperiorAmount: number; // 25% trên 2%
  doanPhiRetainedAmount: number; // 70% trên 0.5% (hoặc 1%)
  doanPhiSuperiorAmount: number; // 30% trên 0.5% (hoặc 1%)
  totalAmount: number;
  notes?: string;
}

export interface TradeUnionContributionPeriod {
  periodKey: string; // VD: "012026", "062026", "Q1.2026"
  periodLabel: string; // VD: "Tháng 06/2026", "Quý 01/2026"
  periodType?: 'MONTH' | 'QUARTER';
  year: number;
  month?: number;
  quarter?: number;
  totalEmployees: number;
  totalMembers: number;
  totalInsuranceSalary: number;
  totalKpcd: number; // 2%
  totalKpcdRetained: number; // 75%
  totalKpcdSuperior: number; // 25%
  totalDoanPhi: number; // 0.5%
  totalDoanPhiRetained: number; // 70%
  totalDoanPhiSuperior: number; // 30%
  netPayableToSuperior: number; // 25% KPCĐ + 30% ĐP
  reportDate?: string;
  preparerName?: string;
  members: TradeUnionMemberContribution[];
}

export interface TradeUnionMonthlyYearSummaryRow {
  monthNumber: number;
  monthLabel: string; // VD: "Tháng 1/2026"
  employeeCount: number;
  insuranceSalaryFund: number;
  kpcdTotal2Pct: number; // (4) = (3) x 2%
  kpcdRetained75Pct: number; // (5) = (4) x 75%
  kpcdPayable25Pct: number; // (6) = (4) - (5)
  doanPhiRetained70Pct: number; // (7) = (3) x 0.5% x 70%
  doanPhiPayable30Pct: number; // (8) = (3) x 0.5% x 30%
  totalContribution: number;
}

export interface TradeUnionYearSummaryTC {
  year: number;
  companyName: string;
  companyAddress: string;
  taxCode: string;
  monthlyRows: TradeUnionMonthlyYearSummaryRow[];
  totalEmployeeAverage: number;
  totalInsuranceSalaryFund: number;
  totalKpcd2Pct: number;
  totalKpcdRetained75Pct: number;
  totalKpcdPayable25Pct: number;
  totalDoanPhiRetained70Pct: number;
  totalDoanPhiPayable30Pct: number;
  grandTotalContribution: number;
}

export interface TradeUnionEventGiftBeneficiary {
  stt: number;
  fullName: string;
  department?: string;
  amount: number;
  signature?: string;
  notes?: string;
}

export interface TradeUnionEventGiftList {
  eventKey: string;
  eventName: string;
  year: number;
  giftPerPerson: number;
  totalPersons: number;
  totalAmount: number;
  beneficiaries: TradeUnionEventGiftBeneficiary[];
}

export interface TradeUnionSettlementItemB07 {
  stt: string;
  content: string;
  code: number;
  plannedAmount?: number;
  settledAmount: number;
  approvedAmount?: number;
}

export interface TradeUnionSettlementB07Report {
  title: string;
  periodText: string;
  clientName: string;
  clientAddress: string;
  basicIndicators: {
    totalEmployeesKpcd: number;
    salaryFundKpcd: number;
    totalMembers: number;
    salaryFundDoanPhi: number;
    fullTimeCadres?: number;
  };
  items: TradeUnionSettlementItemB07[];
  closingCash: number;
  closingBank: number;
}

export interface TradeUnionCashCountSheet {
  year: number;
  countDate: string;
  boardMembers: Array<{ name: string; position: string }>;
  bookBalance: number;
  actualBalance: number;
  difference: number;
  denominations: Array<{ faceValue: number; count: number; total: number }>;
}
