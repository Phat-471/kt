export interface Client {
  id: string;
  code: string;
  name: string;
  taxCode: string; // Mã số thuế
  address: string;
  contactName?: string;
  phone?: string;
  financialYear: number; // Niên độ kế toán (ví dụ: 2026)
  accountingStandard?: 'TT200' | 'TT133' | 'TT88_HKD';
  industryPreset?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'BANK_STMT' | 'DEBT' | 'GENERAL';

export interface ColumnMapping {
  dateCol: string;        // Ngày chứng từ
  voucherNoCol: string;   // Số chứng từ / Số HĐ
  descriptionCol: string; // Diễn giải / Nội dung
  debitAccCol: string;    // Tài khoản Nợ
  creditAccCol: string;   // Tài khoản Có
  amountCol: string;      // Số tiền
  partnerNameCol: string; // Tên đối tác / Người nộp-nhận
  partnerTaxCodeCol: string; // Mã số thuế đối tác
  bankAccCol?: string;    // Số tài khoản ngân hàng
  noteCol?: string;       // Ghi chú
}

export interface MappingTemplate {
  id: string;
  clientId?: string;      // Nếu null => Dùng chung cho tất cả khách hàng
  name: string;           // Tên mẫu (VD: "Sao kê Vietcombank", "Mẫu Bảng kê MISA")
  mapping: ColumnMapping;
  createdAt: string;
}

export type ValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'APPROVED';

export interface ValidationErrorItem {
  field: keyof ColumnMapping | string;
  code: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

export interface NormalizedTransaction {
  id: string;
  clientId: string;
  sourceFileName: string;
  importDate: string;
  type: TransactionType;

  // Normalized Fields
  date: string;              // YYYY-MM-DD
  voucherNo: string;        // Số chứng từ
  description: string;      // Diễn giải
  debitAcc: string;         // TK Nợ (VD: 111, 112, 131, 331, 642...)
  creditAcc: string;        // TK Có
  amount: number;           // Số tiền VND
  vatAmount?: number;       // Số tiền thuế GTGT
  partnerName: string;      // Đối tác
  partnerTaxCode: string;   // MST đối tác
  bankAcc?: string;         // Số TK Ngân hàng

  // Original raw row for auditing
  rawRow: Record<string, any>;

  // Validation
  validationStatus: ValidationStatus;
  errors: ValidationErrorItem[];
  userApproved: boolean;    // Kế toán đã duyệt
  userNotes?: string;

  // Reconciliation linkage
  reconciledId?: string;    // ID của dòng sao kê/công nợ đã khớp
  reconciledStatus?: 'NONE' | 'SUGGESTED' | 'MATCHED';
}

export interface ReconciliationPair {
  id: string;
  clientId: string;
  voucherId: string;        // ID của Phiếu Thu/Chi/Giao dịch nội bộ
  statementId: string;      // ID của Dòng Sao kê / Công nợ
  matchScore: number;       // Điểm tin cậy từ 0 -> 100%
  matchReasons: string[];   // Lý do gợi ý khớp (Số tiền trùng, Ngày khớp, Nội dung khớp...)
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  matchedAt: string;
  notes?: string;
}

export interface VoucherTemplateData {
  voucherType: 'PHIEU_THU' | 'PHIEU_CHI' | 'DE_NGHI_THANH_TOAN' | 'DOI_CHIEU_CONG_NO';
  title: string;
  companyName: string;
  companyAddress: string;
  companyTaxCode: string;
  voucherNo: string;
  dateStr: string;
  personName: string;
  address: string;
  reason: string;
  amount: number;
  amountInWords: string;
  attachedDocs: string;
  debitAcc: string;
  creditAcc: string;
}

export interface AuditLogItem {
  id: string;
  clientId?: string;
  timestamp: string;
  action: 'IMPORT_EXCEL' | 'EDIT_TX' | 'APPROVE_TX' | 'MATCH_PAIR' | 'UNMATCH_PAIR' | 'CREATE_CLIENT' | 'DELETE_CLIENT' | 'BACKUP_EXPORT' | 'RESTORE_DB';
  actionTitle: string;
  details: string;
  userName?: string;
}

export interface AdvancedFilterParams {
  keyword: string;
  fromDate: string;
  toDate: string;
  account: string;
  minAmount: string;
  maxAmount: string;
  status: string;
}

export interface PrepaidExpense {
  id: string;
  clientId: string;
  code: string;
  name: string;
  category: 'CCDC' | 'RENT' | 'SOFTWARE' | 'REPAIR' | 'INSURANCE' | 'OTHER';
  originalAmount: number;
  startDate: string;
  allocationMonths: number;
  expenseAccount: string;
  allocatedAmount?: number;
  remainingAmount?: number;
  monthlyAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrepaidAllocationSchedule {
  month: number;
  year: number;
  periodKey: string;
  amount: number;
  accumulatedAmount: number;
  remainingAmount: number;
  isAllocated: boolean;
  transactionId?: string;
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

export interface UnionSignerSettings {
  id: string;
  unitTitle: string;
  companyName: string;
  companyAddress: string;
  headOfUnitTitle: string;
  headOfUnitName: string;
  accountantName: string;
  preparerName: string;
  treasurerName: string;
  updatedAt?: string;
}

export interface UnionEmployee {
  id: string;
  code: string;
  fullName: string;
  department?: string;
  insuranceSalary?: number;
  isActive?: boolean;
}

export type TradeUnionVoucherType = 'UNION_RECEIPT' | 'UNION_PAYMENT';

export type TradeUnionCategory = 
  | 'KPCĐ_2_PERCENT'       // Kinh phí công đoàn 2% DN đóng
  | 'DOAN_PHI_1_PERCENT'   // Đoàn phí 1% (hoặc 0.5% theo QĐ 61/QĐ-TLĐ) đoàn viên đóng
  | 'KINH_PHI_CAP_TREN'    // CĐ cấp trên cấp về
  | 'HO_TRO_KHAC'          // DN hoặc nhà tài trợ hỗ trợ
  | 'THAM_HOI_OM_DAU'      // Chi thăm hỏi ốm đau, hiếu hỉ, trợ cấp khó khăn
  | 'QUA_LE_TET'           // Chi quà Tết, 8/3, 20/10, Trung thu, 1/6, 2/9, 30/4
  | 'HOAT_DONG_PHONG_TRAO' // Chi văn hóa, thể thao, tham quan, du lịch
  | 'KHEN_THUONG'          // Chi khen thưởng đoàn viên xuất sắc
  | 'NOP_CAP_TREN_25'      // Nộp KPCĐ/Đoàn phí lên Công đoàn cấp trên (25% KPCĐ, 30% ĐP)
  | 'PHU_CAP_CAN_BO_CD'    // Phụ cấp cán bộ công đoàn & quản lý CĐ
  | 'CHI_KHAC';            // Chi khác

export interface TradeUnionTransaction {
  id: string;
  clientId: string;
  voucherType: TradeUnionVoucherType; // UNION_RECEIPT: Phiếu thu C40-HD/C40-BB | UNION_PAYMENT: Phiếu chi C41-HD/C41-BB
  voucherNo: string;                 // VD: PT-CĐ-2026-001 hoặc PC-CĐ-2026-001 hoặc PC2025/01
  date: string;                      // YYYY-MM-DD
  category: TradeUnionCategory;
  personName: string;                // Người nộp / Người nhận tiền
  department?: string;               // Phòng ban / Tổ công đoàn
  reason: string;                    // Lý do thu / chi
  amount: number;                    // Số tiền (VND)
  paymentMethod: 'CASH' | 'BANK';    // Tiền mặt (1111) hoặc Chuyển khoản (1121)
  attachedDocs?: string;             // Chứng từ kèm theo (hóa đơn, danh sách nhận quà...)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}


/** Danh sách chi quà Lễ/Tết */
export interface TradeUnionEventGiftList {
  eventKey: string;                   // VD: "tet_duong_lich", "tet_nguyen_dan", "8_3", "30_04", "02_09", "trung_thu", "20_10"
  eventName: string;                  // VD: "Quà Tết Dương Lịch 2026", "Quà 8/3", "Quà Trung Thu"
  year: number;
  giftPerPerson: number;              // Số tiền quà / người
  totalPersons: number;
  totalAmount: number;
  beneficiaries: Array<{
    stt: number;
    fullName: string;
    department?: string;
    amount: number;
    signature?: string;
    notes?: string;
  }>;
  isSynced?: boolean;
}

/** Dòng chỉ tiêu Báo cáo Quyết toán B07-TLĐ */
export interface TradeUnionSettlementItemB07 {
  stt: string;                        // I, II, 2.1, 2.2, 3.1...
  content: string;                    // Tên chỉ tiêu
  code: number;                       // Mã số Mục lục TCCĐ (10, 21, 22, 23, 30, 31, 32, 33, 34, 38, 40...)
  plannedAmount?: number;             // Dự toán được giao
  settledAmount: number;              // Quyết toán năm (thực hiện)
  approvedAmount?: number;            // Cấp trên duyệt
}

/** Báo cáo Quyết toán B07-TLĐ hoàn chỉnh */
export interface TradeUnionSettlementB07Report {
  title: string;
  periodText: string;                 // VD: "Năm 2026" hoặc "Từ ngày 01/01/2026 đến 31/12/2026"
  clientName: string;
  clientAddress: string;
  decisionRef?: string;
  basicIndicators: {
    totalEmployeesKpcd: number;       // Số lao động đóng KPCĐ
    salaryFundKpcd: number;           // Quỹ lương đóng KPCĐ
    totalMembers: number;             // Số đoàn viên
    salaryFundDoanPhi: number;        // Quỹ lương đóng ĐPCĐ
    fullTimeCadres?: number;          // Số cán bộ CĐ chuyên trách
  };
  items: TradeUnionSettlementItemB07[];
  closingCash: number;                // Tồn quỹ tiền mặt cuối kỳ
  closingBank: number;                // Tồn tiền gửi NH cuối kỳ
}

/** Biên bản kiểm kê quỹ tiền mặt Công đoàn */
export interface TradeUnionCashCountSheet {
  year: number;
  countDate: string;
  boardMembers: Array<{ name: string; position: string }>;
  bookBalance: number;
  actualBalance: number;
  difference: number;
  denominations: Array<{ faceValue: number; count: number; total: number }>;
}



