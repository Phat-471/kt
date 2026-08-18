import * as XLSX from 'xlsx';
import { DrawingItem, DrawingProject } from '../types/drawings';

interface ExportDrawingsOptions {
  project: DrawingProject;
  drawings: DrawingItem[];
  filterDescription?: string;
  isAll?: boolean;
}

export const exportDrawingsToExcel = ({
  project,
  drawings,
  filterDescription,
  isAll = false
}: ExportDrawingsOptions) => {
  const wb = XLSX.utils.book_new();

  // Tiêu đề & Thông tin chung
  const headerData: any[][] = [
    ['CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT'],
    ['DANH MỤC HỒ SƠ BẢN VẼ THIẾT KẾ, BẢN SỬA ĐỔI & PHÁT SINH CÔNG TRÌNH'],
    [isAll ? '(Toàn Bộ Hồ Sơ Bản Vẽ Của Dự Án)' : `(Theo Bộ Lọc: ${filterDescription || 'Hiện Tại'})`],
    [],
    [`Dự Án / Công Trình:`, `${project.projectName} [Mã: ${project.projectCode}]`],
    [`Địa Điểm Xây Dựng:`, project.address],
    [`Chủ Đầu Tư:`, project.investorName],
    [`Tổng Thầu / Thiết Kế:`, project.mainContractorName],
    [`KTS Chủ Trì:`, project.leadArchitect, `KS Kết Cấu:`, project.leadEngineer],
    [`Ngày Xuất Danh Mục:`, new Date().toLocaleDateString('vi-VN')],
    [],
    // Tiêu đề cột dữ liệu (Dòng 12 - Index 11)
    [
      'STT',
      'Số Hiệu Bản Vẽ',
      'Tên / Tiêu Đề Bản Vẽ',
      'Đơn Vị Phát Hành',
      'Bộ Môn',
      'Giai Đoạn',
      'Tính Chất Bản Vẽ',
      'Phiên Bản',
      'Khổ Giấy',
      'Tỉ Lệ',
      'Số Lần Sửa',
      'Tác Giả / Chủ Trì',
      'Người Phê Duyệt',
      'Ngày Duyệt',
      'Giá Trị Phát Sinh (VNĐ)',
      'Định Mức BOM (TK 154)',
      'Ghi Chú'
    ]
  ];

  // Dữ liệu từng dòng
  const rowsData: any[][] = drawings.map((d, idx) => {
    let disciplineText = 'Chung';
    if (d.discipline === 'ARCHITECTURE') disciplineText = 'Kiến Trúc';
    else if (d.discipline === 'STRUCTURE') disciplineText = 'Kết Cấu';
    else if (d.discipline === 'MEP') disciplineText = 'Điện Nước (MEP)';
    else if (d.discipline === 'INTERIOR') disciplineText = 'Nội Thất';
    else if (d.discipline === 'AS_BUILT') disciplineText = 'Hoàn Công';

    let stageText = 'Thiết Kế Thi Công';
    if (d.stageType === 'PERMIT') stageText = 'Xin Phép XD';
    else if (d.stageType === 'SHOP_DRAWING') stageText = 'Shop Gia Công';
    else if (d.stageType === 'VARIATION_SITE') stageText = 'Xử Lý Hiện Trường';
    else if (d.stageType === 'AS_BUILT') stageText = 'Hoàn Công';

    let natureText = 'Bản Vẽ Mới';
    if (d.issueNature === 'REVISION_MODIFIED') natureText = 'Bản Sửa Đổi';
    else if (d.issueNature === 'VARIATION_ORDER') natureText = 'Phát Sinh Hiện Trường';
    else if (d.issueNature === 'REDLINE_MARKUP') natureText = 'Redline Tại Chỗ';
    else if (d.issueNature === 'AS_BUILT_FINAL') natureText = 'Hoàn Công Bàn Giao';

    return [
      idx + 1,
      d.drawingNumber,
      d.title,
      d.companyName,
      disciplineText,
      stageText,
      natureText,
      d.currentRevision,
      d.sheetSize,
      d.scale,
      d.revisions.length > 1 ? d.revisions.length - 1 : 0,
      d.author,
      d.approver || 'Chờ duyệt',
      d.approvedDate || '---',
      d.variationAmount || 0,
      d.costingLinkId || '---',
      d.tags.join(', ')
    ];
  });

  // Dòng Tổng Cộng
  const totalVariation = drawings.reduce((sum, d) => sum + (d.variationAmount || 0), 0);
  const totalRow = [
    'TỔNG CỘNG',
    `${drawings.length} bản vẽ`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalVariation,
    '',
    ''
  ];

  const fullSheetData = [...headerData, ...rowsData, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Cấu hình độ rộng các cột
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Số hiệu
    { wch: 45 }, // Tên bản vẽ
    { wch: 32 }, // Đơn vị phát hành
    { wch: 15 }, // Bộ môn
    { wch: 20 }, // Giai đoạn
    { wch: 22 }, // Tính chất
    { wch: 12 }, // Phiên bản
    { wch: 10 }, // Khổ giấy
    { wch: 10 }, // Tỉ lệ
    { wch: 12 }, // Số lần sửa
    { wch: 20 }, // Tác giả
    { wch: 24 }, // Người duyệt
    { wch: 14 }, // Ngày duyệt
    { wch: 22 }, // Giá trị phát sinh
    { wch: 22 }, // Mã định mức BOM
    { wch: 30 }, // Ghi chú
  ];

  // Merge tiêu đề
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } },
    { s: { r: headerData.length + rowsData.length, c: 0 }, e: { r: headerData.length + rowsData.length, c: 1 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'DANH_MUC_BAN_VE');

  const fileName = `Danh_Muc_Ban_Ve_${project.projectCode}_${isAll ? 'Toan_Bo' : 'Theo_Loc'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
