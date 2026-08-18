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
  costingLinkId?: string;         // Liên kết định mức BOM / TK 154
  isVariationOrder?: boolean;     // Có làm thay đổi giá trị hợp đồng/phát sinh chi phí không
  variationAmount?: number;       // Giá trị phát sinh (+/- VND)
  createdAt: string;
  updatedAt: string;
}
