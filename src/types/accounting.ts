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
