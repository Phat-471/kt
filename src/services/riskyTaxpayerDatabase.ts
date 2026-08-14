/**
 * Risky Taxpayer Database — Cơ Sở Dữ Liệu Doanh Nghiệp Rủi Ro & Tạm Ngừng Hoạt Động
 * Cập nhật theo Thông báo của Cơ quan Thuế / Tổng Cục Thuế Việt Nam
 */

export interface RiskyTaxpayerInfo {
  taxCode: string;
  name: string;
  status: 'SUSPENDED' | 'CLOSED_WITH_TAX_DEBT' | 'HIGH_RISK_INVOICE' | 'RUNAWAY';
  reason: string;
  announcementDate: string;
  announcementRef?: string;
}

// Danh sách mẫu một số MST rủi ro/bỏ trốn/ngừng hoạt động công bố bởi Cơ quan Thuế
export const RISKY_TAXPAYERS_DATABASE: Record<string, RiskyTaxpayerInfo> = {
  '0109999888': {
    taxCode: '0109999888',
    name: 'Công ty TNHH Đầu tư Thương mại Ma Trận Việt',
    status: 'RUNAWAY',
    reason: 'Doanh nghiệp bỏ trốn khỏi địa chỉ kinh doanh, mua bán hóa đơn bất hợp pháp',
    announcementDate: '2025-11-15',
    announcementRef: 'TB 10294/TB-CTHN',
  },
  '0312344321': {
    taxCode: '0312344321',
    name: 'Công ty CP Xuất Nhập Khẩu Toàn Cầu Ảo',
    status: 'CLOSED_WITH_TAX_DEBT',
    reason: 'Ngừng hoạt động nhưng chưa hoàn thành thủ tục đóng mã số thuế và nợ thuế',
    announcementDate: '2026-01-20',
    announcementRef: 'TB 452/TB-CTHCM',
  },
  '0108888777': {
    taxCode: '0108888777',
    name: 'Công ty TNHH Dịch Vụ Tổng Hợp Nam Sơn',
    status: 'HIGH_RISK_INVOICE',
    reason: 'Thuộc danh sách 524 Doanh nghiệp rủi ro cao về hóa đơn điện tử theo Tổng Cục Thuế',
    announcementDate: '2025-06-10',
    announcementRef: 'Công văn 1798/TCT-TTKT',
  },
  '3700123999': {
    taxCode: '3700123999',
    name: 'Công ty TNHH Sản Xuất Gỗ Tân Phát',
    status: 'SUSPENDED',
    reason: 'Tạm ngừng kinh doanh có thời hạn theo đăng ký kinh doanh',
    announcementDate: '2026-02-01',
    announcementRef: 'TB 89/TB-DKKD',
  },
};

/**
 * Kiểm tra xem Mã số thuế có nằm trong danh sách rủi ro / bỏ trốn / tạm ngừng hoạt động hay không
 */
export function checkRiskyTaxpayer(taxCode: string): RiskyTaxpayerInfo | null {
  if (!taxCode) return null;
  const cleanMst = taxCode.trim().replace(/[^0-9]/g, '');
  return RISKY_TAXPAYERS_DATABASE[cleanMst] || null;
}
