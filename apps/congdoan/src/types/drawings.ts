// Định nghĩa Loại Bộ Môn Bản Vẽ
export type DrawingDiscipline = 'ALL' | 'ARCHITECTURE' | 'STRUCTURE' | 'MEP' | 'INTERIOR' | 'LANDSCAPE' | 'AS_BUILT';

// Định nghĩa Mục Đích / Giai Đoạn Bản Vẽ
export type DrawingStageType = 
  | 'ALL'
  | 'PERMIT'              // Bản vẽ xin phép xây dựng
  | 'CONCEPT_3D'          // Bản vẽ phối cảnh / ý tưởng 3D
  | 'CONSTRUCTION'        // Bản vẽ thiết kế kỹ thuật thi công
  | 'SHOP_DRAWING'        // Bản vẽ Shop Drawing chi tiết lắp đặt xưởng/công trường
  | 'VARIATION_SITE'      // Bản vẽ xử lý hiện trường / phát sinh thiết kế
  | 'AS_BUILT';           // Bản vẽ hoàn công

// Định nghĩa Tính Chất Phát Hành: Bản Mới vs Bản Sửa vs Bản Phát Sinh
export type DrawingIssueNature = 
  | 'ALL'
  | 'NEW_ISSUE'           // Bản vẽ mới phát hành lần đầu
  | 'REVISION_MODIFIED'   // Bản vẽ chỉnh sửa / cập nhật lại
  | 'VARIATION_ORDER'     // Bản vẽ phát sinh tăng/giảm khối lượng
  | 'REDLINE_MARKUP'      // Bản vẽ đánh dấu đỏ sửa tại công trường
  | 'AS_BUILT_FINAL';     // Bản vẽ hoàn công bàn giao

// Trạng thái phê duyệt
export type DrawingStatus = 
  | 'DRAFT'                       // Đang soạn thảo
  | 'PENDING_INVESTOR_APPROVAL'   // Chờ Chủ Đầu Tư duyệt
  | 'PENDING_CONSULTANT_APPROVAL' // Chờ Tư Vấn Giám Sát duyệt
  | 'APPROVED_FOR_CONSTRUCTION'   // Đã duyệt thi công (AFC)
  | 'OBSOLETE'                    // Đã hết hiệu lực (Đã có bản sửa thay thế)
  | 'REJECTED';                   // Bị từ chối / Phải sửa lại

// Đơn vị / Công ty liên quan đến bản vẽ
export interface DrawingCompany {
  id: string;
  name: string;
  shortName: string;
  role: 'MAIN_CONTRACTOR' | 'INVESTOR' | 'SUB_CONTRACTOR' | 'DESIGN_CONSULTANT' | 'SUPERVISION_CONSULTANT' | 'SUPPLIER';
  contactPerson?: string;
  phone?: string;
}

// Dự Án / Công Trình
export interface DrawingProject {
  id: string;
  projectCode: string;
  projectName: string;
  investorId: string;
  investorName: string;
  mainContractorId: string;
  mainContractorName: string;
  address: string;
  contractValue: number;
  startDate: string;
  expectedEndDate: string;
  status: 'DESIGNING' | 'CONSTRUCTING' | 'HANDOVER' | 'COMPLETED';
  leadArchitect: string;
  leadEngineer: string;
  drawingCount?: number;
}

// Lịch sử sửa đổi / Phiên bản
export interface DrawingRevision {
  id: string;
  drawingId: string;
  revisionNumber: string;         // 'Rev 00', 'Rev 01', 'Rev 02', 'Rev Final'
  issueNature: 'NEW_ISSUE' | 'REVISION_MODIFIED' | 'VARIATION_ORDER' | 'REDLINE_MARKUP' | 'AS_BUILT_FINAL';
  changeDate: string;
  changedBy: string;              // Tên KTS/Kỹ sư sửa
  issuingCompany: string;         // Cty phát hành bản sửa
  changeReasonCategory: 'INVESTOR_REQUEST' | 'SITE_CONFLICT' | 'COST_OPTIMIZATION' | 'REGULATORY_CHANGE' | 'ERROR_CORRECTION';
  changeDescription: string;     // Mô tả chi tiết lý do và nội dung sửa
  approvedBy?: string;            // Người phê duyệt bản sửa
  approvedDate?: string;
  fileUrl: string;
  fileSize?: string;
  isCurrent: boolean;
}

// Chi tiết Bản Vẽ
export interface DrawingItem {
  id: string;
  projectId: string;
  companyId: string;              // Cty phát hành bản vẽ
  companyName: string;            // Tên đơn vị (Hưng Phát, Thầu nhôm kính, CĐT...)
  drawingNumber: string;          // 'KT-01', 'KC-04', 'MEP-02', 'SHOP-NK-01'
  title: string;                  // 'Mặt Bằng Bố Trí Thép Sàn Tầng 2'
  discipline: DrawingDiscipline;  // Kiến trúc / Kết cấu / MEP...
  stageType: DrawingStageType;    // Xin phép / Thi công / Shop / Hoàn công
  issueNature: 'NEW_ISSUE' | 'REVISION_MODIFIED' | 'VARIATION_ORDER' | 'REDLINE_MARKUP' | 'AS_BUILT_FINAL';
  scale: string;                  // '1/100', '1/50', '1/25'
  sheetSize: string;              // 'A0', 'A1', 'A2', 'A3'
  currentRevision: string;        // 'Rev 02'
  status: DrawingStatus;
  author: string;                 // Tác giả bản vẽ
  approver?: string;              // Người duyệt
  approvedDate?: string;
  fileUrl: string;
  previewUrl?: string;
  tags: string[];
  revisions: DrawingRevision[];
  costingLinkId?: string;         // Liên kết định mức BOM chi phí (TK 154 / TK 621)
  isVariationOrder?: boolean;     // Có làm thay đổi giá trị hợp đồng không
  variationAmount?: number;       // Giá trị phát sinh (+/- VNĐ)
  createdAt: string;
  updatedAt: string;
}

// Biên bản Giao Nhận / Bàn Giao Hồ Sơ Bản Vẽ (Transmittal Form)
export interface DrawingTransmittal {
  id: string;
  transmittalNo: string;          // Số phiếu: 'TR-2026-08-01'
  projectId: string;
  projectName: string;
  senderCompany: string;          // Bên giao: 'Cty Hưng Phát'
  senderPerson: string;           // Người giao: 'KTS. Lê Hoàng Sỹ'
  recipientCompany: string;       // Bên nhận: 'Ban QLDA / TVGS Sài Gòn / Thầu Nhôm Kính'
  recipientPerson: string;        // Người nhận: 'KS. Trương Hoàng Nam'
  issueDate: string;              // Ngày giao: '2026-08-18'
  purpose: 'FOR_APPROVAL' | 'FOR_CONSTRUCTION' | 'FOR_INFORMATION' | 'FOR_REVIEW';
  drawingItems: {
    drawingId: string;
    drawingNumber: string;
    title: string;
    revision: string;
    sheetSize: string;
    copiesCount: number;          // Số lượng bản in giấy (A1/A2)
    hasSoftCopy: boolean;         // Kèm file mềm CAD/PDF
  }[];
  notes?: string;
  status: 'PENDING_ACK' | 'CONFIRMED';
  confirmedAt?: string;
}

// Thống Kê & Báo Cáo Tháng
export interface MonthlyDrawingSummary {
  monthKey: string;               // '2026-08'
  monthLabel: string;             // 'Tháng 08/2026'
  totalDrawingsIssued: number;    // Tổng bản vẽ phát hành trong tháng
  newIssuesCount: number;         // Số bản vẽ mới
  revisionsCount: number;         // Số bản vẽ hiệu chỉnh
  variationOrdersCount: number;   // Số bản vẽ phát sinh
  totalVariationAmount: number;   // Tổng tiền phát sinh trong tháng
  transmittalsCount: number;      // Số đợt bàn giao hồ sơ
  pendingApprovalsCount: number;  // Số bản vẽ đang chờ duyệt
}

// Trạng thái phê duyệt Đợt Phát Sinh (VO)
export type VariationOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'BILLED' | 'REJECTED';

// Chi tiết từng bản vẽ / hạng mục trong đợt phát sinh
export interface VariationItemLink {
  drawingId: string;
  drawingNumber: string;
  title: string;
  revision: string;
  nature: string;
  description: string;
  amount: number;
}

// Đợt Phát Sinh Khối Lượng / Thiết Kế (Variation Order - VO)
export interface DrawingVariationOrder {
  id: string;
  voNumber: string;               // 'VO-HP01-001', 'VO-HP01-002'
  projectId: string;
  projectName: string;
  title: string;                  // 'Xử lý xung đột địa chất móng trục 3 & bổ sung dầm D2A'
  issueDate: string;              // '2026-08-18'
  requestedBy: 'INVESTOR' | 'SUPERVISION' | 'MAIN_CONTRACTOR' | 'SITE_CONDITION';
  legalBasis: string;             // 'Văn bản số 12/CV-CĐT ngày 10/08/2026 & Biên bản hiện trường'
  reasonCategory: 'CLIENT_REQUEST' | 'SITE_CONFLICT' | 'TECHNICAL_OPTIMIZATION' | 'SAFETY_REGULATION';
  items: VariationItemLink[];
  totalAmount: number;            // Tổng tiền phát sinh trước thuế (VNĐ)
  vatRate: number;                // 8 hoặc 10%
  vatAmount: number;
  totalWithVat: number;           // Tổng tiền bao gồm thuế
  timeExtensionDays: number;      // Gia hạn tiến độ thi công (ngày)
  status: VariationOrderStatus;
  signedByInvestor?: string;      // Đại diện CĐT ký
  signedByConsultant?: string;    // Tư vấn giám sát ký
  signedByContractor?: string;    // Nhà thầu Hưng Phát ký
  approvedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

