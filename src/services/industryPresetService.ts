export type IndustryPresetType = 
  | 'COMMERCE'      // Thương mại
  | 'SERVICE'       // Dịch vụ
  | 'CONSTRUCTION'  // Xây dựng
  | 'MANUFACTURING' // Sản xuất nhỏ
  | 'AGENCY'        // Agency / Phần mềm
  | 'HOUSEHOLD';    // Hộ kinh doanh nâng cấp lên DN

export interface IndustryRule {
  presetType: IndustryPresetType;
  title: string;
  description: string;
  primaryAccounts: string[];
  trackByContract: boolean;    // Theo dõi theo hợp đồng (Dịch vụ / Agency)
  trackByConstruction: boolean;// Theo dõi theo công trình (Xây dựng)
  trackByProductCost: boolean; // Theo dõi định mức giá thành sản phẩm (Sản xuất)
  trackInventory: boolean;     // Quản lý kho hàng vật tư
  defaultTaxRate: number;      // Mức thuế GTGT phổ biến
  recommendedReports: string[];
}

export const INDUSTRY_PRESETS: Record<IndustryPresetType, IndustryRule> = {
  COMMERCE: {
    presetType: 'COMMERCE',
    title: '🏬 Thương Mại & Bán Sỉ/Lẻ',
    description: 'Tối ưu theo dõi Nhập - Xuất - Tồn Kho, Giá vốn bình quân, Công nợ khách hàng (131) và Nhà cung cấp (331).',
    primaryAccounts: ['156', '5111', '632', '131', '331'],
    trackByContract: false,
    trackByConstruction: false,
    trackByProductCost: false,
    trackInventory: true,
    defaultTaxRate: 10,
    recommendedReports: ['Bảng Nhập Xuất Tồn', 'Thẻ Kho Chi Tiết', 'Công Nợ 131/331'],
  },
  SERVICE: {
    presetType: 'SERVICE',
    title: '🛠 Dịch Vụ & Tư Vấn',
    description: 'Tối ưu quản lý Doanh thu & Chi phí theo từng Hợp đồng, Chi phí nhân công trực tiếp.',
    primaryAccounts: ['5113', '632', '131', '642'],
    trackByContract: true,
    trackByConstruction: false,
    trackByProductCost: false,
    trackInventory: false,
    defaultTaxRate: 8,
    recommendedReports: ['Doanh Thu Theo Hợp Đồng', 'P&L Dịch Vụ', 'Công Nợ 131'],
  },
  CONSTRUCTION: {
    presetType: 'CONSTRUCTION',
    title: '🏗 Xây Dựng & Lắp Đặt',
    description: 'Tập hợp chi phí theo từng Công trình/Hạng mục (TK 1541-1543), theo dõi nghiệm thu giai đoạn.',
    primaryAccounts: ['154', '621', '622', '627', '5112'],
    trackByContract: true,
    trackByConstruction: true,
    trackByProductCost: false,
    trackInventory: true,
    defaultTaxRate: 10,
    recommendedReports: ['Báo Cáo Giá Thành Công Trình', 'Sổ Chi Tiết TK 154', 'Nghiệm Thu Công Trình'],
  },
  MANUFACTURING: {
    presetType: 'MANUFACTURING',
    title: '🏭 Sản Xuất Nhỏ & Chế Biến',
    description: 'Quản lý Định mức Nguyên vật liệu (152), Chi phí sản xuất chung (627) và Giá thành Thành phẩm (155).',
    primaryAccounts: ['152', '155', '154', '621', '622', '627'],
    trackByContract: false,
    trackByConstruction: false,
    trackByProductCost: true,
    trackInventory: true,
    defaultTaxRate: 10,
    recommendedReports: ['Bảng Tính Giá Thành Thành Phẩm', 'Bảng Thẻ Kho Nguyên Vật Liệu', 'Lệch Định Mức NVL'],
  },
  AGENCY: {
    presetType: 'AGENCY',
    title: '💻 Agency, Phần Mềm & Công Nghệ',
    description: 'Phân bổ chi phí Nhân công/Freelancer theo Dự án (Project), theo dõi chi phí Cloud Server.',
    primaryAccounts: ['5113', '642', '622', '131'],
    trackByContract: true,
    trackByConstruction: false,
    trackByProductCost: false,
    trackInventory: false,
    defaultTaxRate: 10,
    recommendedReports: ['Lợi Nhuận Theo Dự Án', 'Phân Bổ Chi Phí Nhân Công', 'Aging Debt 131'],
  },
  HOUSEHOLD: {
    presetType: 'HOUSEHOLD',
    title: '🏪 Hộ Kinh Doanh Nâng Cấp Lên Doanh Nghiệp',
    description: 'Áp dụng quy chuẩn Thông tư 88/2021/TT-BTC, chuẩn hóa 7 sổ kế toán đơn giản.',
    primaryAccounts: ['111', '112', '156', '511'],
    trackByContract: false,
    trackByConstruction: false,
    trackByProductCost: false,
    trackInventory: true,
    defaultTaxRate: 1.5,
    recommendedReports: ['Sổ Chi Tiết Doanh Thu TT88', 'Sổ Chi Tiết Vật Tư TT88', 'Bảng Thuế HKD'],
  },
};

export const getIndustryRule = (presetType: IndustryPresetType): IndustryRule => {
  return INDUSTRY_PRESETS[presetType] || INDUSTRY_PRESETS.COMMERCE;
};
