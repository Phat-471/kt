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

export type TradeUnionVoucherType = 'UNION_RECEIPT' | 'UNION_PAYMENT';

export type TradeUnionCategory = 
  | 'KPCĐ_2_PERCENT'       // Kinh phí công đoàn 2% DN đóng
  | 'DOAN_PHI_1_PERCENT'   // Đoàn phí 1% đoàn viên đóng
  | 'KINH_PHI_CAP_TREN'    // CĐ cấp trên cấp về
  | 'HO_TRO_KHAC'          // DN hoặc nhà tài trợ hỗ trợ
  | 'THAM_HOI_OM_DAU'      // Chi thăm hỏi ốm đau, hiếu hỉ, trợ cấp khó khăn
  | 'QUA_LE_TET'           // Chi quà Tết, 8/3, 20/10, Trung thu, 1/6
  | 'HOAT_DONG_PHONG_TRAO' // Chi văn hóa, thể thao, tham quan, du lịch
  | 'KHEN_THUONG'          // Chi khen thưởng đoàn viên xuất sắc
  | 'NOP_CAP_TREN_25'      // Nộp 25% KPCĐ lên Công đoàn cấp trên
  | 'PHU_CAP_CAN_BO_CD'    // Phụ cấp cán bộ công đoàn & quản lý CĐ
  | 'CHI_KHAC';            // Chi khác

export interface TradeUnionTransaction {
  id: string;
  clientId: string;
  voucherType: TradeUnionVoucherType; // UNION_RECEIPT: Phiếu thu C40-HD | UNION_PAYMENT: Phiếu chi C41-HD
  voucherNo: string;                 // VD: PT-CĐ-2026-001 hoặc PC-CĐ-2026-001
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


