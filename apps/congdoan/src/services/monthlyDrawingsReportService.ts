import XLSX from 'xlsx-js-style';
import { 
  DrawingItem, 
  DrawingProject, 
  DrawingTransmittal, 
  MonthlyDrawingSummary 
} from '../types/drawings';

const borderThin = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const borderMedium = {
  top: { style: 'medium', color: { rgb: '1E3A8A' } },
  bottom: { style: 'medium', color: { rgb: '1E3A8A' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

/**
 * Tính toán số liệu tổng hợp báo cáo bản vẽ theo tháng
 */
export const calculateMonthlySummary = (
  drawings: DrawingItem[],
  transmittals: DrawingTransmittal[],
  year: number,
  month: number
): MonthlyDrawingSummary => {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`;

  const monthDrawings = drawings.filter(d => {
    const hasRevInMonth = d.revisions.some(r => r.changeDate && r.changeDate.startsWith(monthKey));
    const isCreatedInMonth = d.createdAt && d.createdAt.startsWith(monthKey);
    return hasRevInMonth || isCreatedInMonth;
  });

  const newIssuesCount = monthDrawings.filter(d => d.issueNature === 'NEW_ISSUE').length;
  const revisionsCount = monthDrawings.filter(d => d.issueNature === 'REVISION_MODIFIED').length;
  const variationOrdersCount = monthDrawings.filter(d => d.issueNature === 'VARIATION_ORDER' || d.isVariationOrder).length;
  const totalVariationAmount = monthDrawings.reduce((sum, d) => sum + (d.variationAmount || 0), 0);
  const pendingApprovalsCount = monthDrawings.filter(d => !d.approver || d.status.includes('PENDING')).length;

  const monthTransmittals = transmittals.filter(t => t.issueDate && t.issueDate.startsWith(monthKey));

  return {
    monthKey,
    monthLabel,
    totalDrawingsIssued: monthDrawings.length,
    newIssuesCount,
    revisionsCount,
    variationOrdersCount,
    totalVariationAmount,
    transmittalsCount: monthTransmittals.length,
    pendingApprovalsCount,
  };
};

/**
 * Xuất Báo Cáo Tiến Độ Bản Vẽ & Chi Phí Phát Sinh Tháng ra File Excel Đẹp & Cố Định Dòng
 */
export const exportMonthlyReportToExcel = (
  project: DrawingProject,
  summary: MonthlyDrawingSummary,
  drawingsInMonth: DrawingItem[],
  transmittalsInMonth: DrawingTransmittal[]
) => {
  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: BÁO CÁO TIẾN ĐỘ & BẢN VẼ THÁNG
  // =========================================================================
  const ws1: any = {};

  ws1['A1'] = {
    v: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  ws1['A2'] = {
    v: 'HỆ THỐNG QUẢN LÝ TIẾN ĐỘ THIẾT KẾ & KIỂM SOÁT PHÁT SINH DỰ ÁN',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'DBEAFE' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  ws1['A3'] = {
    v: `BÁO CÁO TỔNG HỢP HỒ SƠ BẢN VẼ & BIẾN ĐỘNG THIẾT KẾ - ${summary.monthLabel.toUpperCase()}`,
    t: 's',
    s: {
      font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Info Block
  const infoStyleHeader = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin
  };
  const infoStyleLabel = {
    font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: '334155' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin
  };
  const infoStyleVal = {
    font: { name: 'Arial', sz: 9.5, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin
  };

  ws1['A5'] = { v: 'THÔNG TIN DỰ ÁN BÁO CÁO', t: 's', s: infoStyleHeader };
  ws1['E5'] = { v: 'THÔNG TIN BÀN GIAO & NHÂN SỰ', t: 's', s: infoStyleHeader };

  ws1['A6'] = { v: '• Dự Án / Công Trình:', t: 's', s: infoStyleLabel };
  ws1['B6'] = { v: project.projectName, t: 's', s: infoStyleVal };
  ws1['E6'] = { v: '• KTS Chủ Trì Thiết Kế:', t: 's', s: infoStyleLabel };
  ws1['F6'] = { v: project.leadArchitect, t: 's', s: infoStyleVal };

  ws1['A7'] = { v: '• Mã Công Trình:', t: 's', s: infoStyleLabel };
  ws1['B7'] = { v: project.projectCode, t: 's', s: infoStyleVal };
  ws1['E7'] = { v: '• Kỹ Sư Trưởng Kết Cấu:', t: 's', s: infoStyleLabel };
  ws1['F7'] = { v: project.leadEngineer, t: 's', s: infoStyleVal };

  ws1['A8'] = { v: '• Địa Điểm Xây Dựng:', t: 's', s: infoStyleLabel };
  ws1['B8'] = { v: project.address, t: 's', s: infoStyleVal };
  ws1['E8'] = { v: '• Chủ Đầu Tư / TVGS:', t: 's', s: infoStyleLabel };
  ws1['F8'] = { v: project.investorName, t: 's', s: infoStyleVal };

  ws1['A9'] = { v: '• Tổng Thầu Thi Công:', t: 's', s: infoStyleLabel };
  ws1['B9'] = { v: project.mainContractorName, t: 's', s: infoStyleVal };
  ws1['E9'] = { v: '• Ngày Xuất Báo Cáo:', t: 's', s: infoStyleLabel };
  ws1['F9'] = { v: new Date().toLocaleDateString('vi-VN'), t: 's', s: infoStyleVal };

  // Phần I: Bảng chỉ số KPI
  ws1['A11'] = {
    v: 'I. BẢNG TỔNG HỢP CHỈ SỐ HOẠT ĐỘNG THIẾT KẾ TRONG THÁNG:',
    t: 's',
    s: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } } }
  };

  const kpiHeaders = ['STT', 'Chỉ Số Hoạt Động', 'Khối Lượng / Giá Trị', 'Đơn Vị', 'Diễn Giải Chi Tiết'];
  const kpiCols = ['A', 'B', 'D', 'F', 'H'];

  kpiHeaders.forEach((h, idx) => {
    ws1[`${kpiCols[idx]}12`] = {
      v: h,
      t: 's',
      s: {
        font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '475569' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: borderThin
      }
    };
  });

  const kpiData = [
    [1, 'Tổng số bản vẽ phát hành / xử lý trong tháng', summary.totalDrawingsIssued, 'Bản vẽ', 'Bao gồm cả bản vẽ mới và bản sửa đổi'],
    [2, 'Bản vẽ thiết kế mới phát hành (Rev 00)', summary.newIssuesCount, 'Bản vẽ', 'Hồ sơ thiết kế mới phát hành đợt 1'],
    [3, 'Bản vẽ sửa đổi hiệu chỉnh (Revisions)', summary.revisionsCount, 'Bản vẽ', 'Điều chỉnh theo ý CĐT & xử lý kỹ thuật'],
    [4, 'Bản vẽ phát sinh tăng/giảm khối lượng', summary.variationOrdersCount, 'Bản vẽ', 'Ảnh hưởng giá trị thanh quyết toán'],
    [5, 'Tổng giá trị phát sinh thiết kế tháng', summary.totalVariationAmount, 'VNĐ', 'Căn cứ theo dõi hạch toán TK 154 / TK 621'],
    [6, 'Số đợt bàn giao hồ sơ (Transmittals)', summary.transmittalsCount, 'Đợt', 'Đã lập biên bản giao nhận hồ sơ thi công'],
    [7, 'Hồ sơ đang chờ CĐT/TVGS ký phê duyệt', summary.pendingApprovalsCount, 'Bản vẽ', 'Cần đốc thúc ký duyệt AFC tại công trường'],
  ];

  kpiData.forEach((row, idx) => {
    const rNum = 13 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : 'F8FAFC';
    const cStyle = (align: 'left' | 'center' | 'right', isBold = false) => ({
      font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: bg } },
      alignment: { horizontal: align, vertical: 'center' },
      border: borderThin
    });

    ws1[`A${rNum}`] = { v: row[0], t: 'n', s: cStyle('center', false) };
    ws1[`B${rNum}`] = { v: row[1], t: 's', s: cStyle('left', true) };
    ws1[`D${rNum}`] = { 
      v: row[2], 
      t: typeof row[2] === 'number' ? 'n' : 's', 
      z: typeof row[2] === 'number' && row[3] === 'VNĐ' ? '#,##0 "đ"' : undefined,
      s: cStyle('center', true) 
    };
    ws1[`F${rNum}`] = { v: row[3], t: 's', s: cStyle('center', false) };
    ws1[`H${rNum}`] = { v: row[4], t: 's', s: cStyle('left', false) };
  });

  // Phần II: Bảng Danh Mục Bản Vẽ
  const startDrawingsSection = 21;
  ws1[`A${startDrawingsSection}`] = {
    v: 'II. DANH MỤC CHI TIẾT BẢN VẼ XỬ LÝ TRONG THÁNG:',
    t: 's',
    s: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } } }
  };

  const drawHeaders = [
    'STT',
    'Số Hiệu',
    'Tên / Tiêu Đề Bản Vẽ Chi Tiết',
    'Đơn Vị Phát Hành',
    'Bộ Môn',
    'Giai Đoạn',
    'Tính Chất',
    'Phiên Bản',
    'Khổ',
    'Người Vẽ',
    'Người Duyệt',
    'Phát Sinh (+VNĐ)',
    'Nội Dung Hiệu Chỉnh Gần Nhất'
  ];
  const drawColLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

  const drawHeaderRow = startDrawingsSection + 1;
  drawHeaders.forEach((h, idx) => {
    ws1[`${drawColLetters[idx]}${drawHeaderRow}`] = {
      v: h,
      t: 's',
      s: {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin
      }
    };
  });

  drawingsInMonth.forEach((d, idx) => {
    const rNum = drawHeaderRow + 1 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : 'F8FAFC';
    const latestRev = d.revisions[d.revisions.length - 1];

    const cellStyle = (align: 'left' | 'center' | 'right', isBold = false, color = '0F172A', customBg?: string) => ({
      font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: color } },
      fill: { fgColor: { rgb: customBg || bg } },
      alignment: { horizontal: align, vertical: 'center', wrapText: true },
      border: borderThin
    });

    let discText = '🏛️ Kiến Trúc';
    if (d.discipline === 'STRUCTURE') discText = '🏗️ Kết Cấu';
    else if (d.discipline === 'MEP') discText = '⚡ Điện Nước';
    else if (d.discipline === 'AS_BUILT') discText = '📋 Hoàn Công';

    ws1[`A${rNum}`] = { v: idx + 1, t: 'n', s: cellStyle('center', false, '64748B') };
    ws1[`B${rNum}`] = { v: d.drawingNumber, t: 's', s: cellStyle('center', true, '1D4ED8') };
    ws1[`C${rNum}`] = { v: d.title, t: 's', s: cellStyle('left', true, '0F172A') };
    ws1[`D${rNum}`] = { v: d.companyName, t: 's', s: cellStyle('left', false, '334155') };
    ws1[`E${rNum}`] = { v: discText, t: 's', s: cellStyle('center', false, '0F172A') };
    ws1[`F${rNum}`] = { v: d.stageType, t: 's', s: cellStyle('center', false, '334155') };
    ws1[`G${rNum}`] = { v: d.currentRevision, t: 's', s: cellStyle('center', true, '0F172A') };
    ws1[`H${rNum}`] = { v: d.sheetSize, t: 's', s: cellStyle('center', false, '334155') };
    ws1[`I${rNum}`] = { v: d.scale, t: 's', s: cellStyle('center', false, '64748B') };
    ws1[`J${rNum}`] = { v: d.author, t: 's', s: cellStyle('left', false, '0F172A') };
    ws1[`K${rNum}`] = { v: d.approver || 'Chờ duyệt', t: 's', s: cellStyle('left', false, '334155') };
    ws1[`L${rNum}`] = { 
      v: d.variationAmount || 0, 
      t: 'n', 
      z: '#,##0 "đ"', 
      s: cellStyle('right', (d.variationAmount || 0) > 0, (d.variationAmount || 0) > 0 ? 'B91C1C' : '94A3B8') 
    };
    ws1[`M${rNum}`] = { v: latestRev ? latestRev.changeDescription : 'Phát hành đợt 1', t: 's', s: cellStyle('left', false, '334155') };
  });

  // Dòng Tổng Cộng
  const totalRowNum = drawHeaderRow + 1 + drawingsInMonth.length;
  const totalStyle = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderMedium
  };

  drawColLetters.forEach(l => {
    ws1[`${l}${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  });

  ws1[`A${totalRowNum}`] = { v: 'TỔNG CỘNG', t: 's', s: totalStyle };
  ws1[`B${totalRowNum}`] = { v: `${drawingsInMonth.length} bản vẽ`, t: 's', s: totalStyle };
  ws1[`L${totalRowNum}`] = { 
    v: summary.totalVariationAmount, 
    t: 'n', 
    z: '#,##0 "đ"', 
    s: { ...totalStyle, alignment: { horizontal: 'right', vertical: 'center' }, font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'B91C1C' } } } 
  };

  // Khung Chữ Ký
  const sigStart = totalRowNum + 2;
  const sigStyleTitle = { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } }, alignment: { horizontal: 'center', vertical: 'center' } };
  const sigStyleSub = { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center', vertical: 'center' } };
  const sigStyleName = { font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center', vertical: 'center' } };

  ws1[`B${sigStart}`] = { v: 'NGƯỜI LẬP BÁO CÁO', t: 's', s: sigStyleTitle };
  ws1[`B${sigStart + 1}`] = { v: '(Ký, ghi rõ họ tên)', t: 's', s: sigStyleSub };
  ws1[`B${sigStart + 5}`] = { v: project.leadArchitect, t: 's', s: sigStyleName };

  ws1[`G${sigStart}`] = { v: 'KTS CHỦ TRÌ THIẾT KẾ', t: 's', s: sigStyleTitle };
  ws1[`G${sigStart + 1}`] = { v: '(Ký, ghi rõ họ tên)', t: 's', s: sigStyleSub };
  ws1[`G${sigStart + 5}`] = { v: 'CÔNG TY TNHH HƯNG PHÁT', t: 's', s: sigStyleName };

  ws1[`K${sigStart}`] = { v: 'ĐẠI DIỆN CHỦ ĐẦU TƯ / TVGS', t: 's', s: sigStyleTitle };
  ws1[`K${sigStart + 1}`] = { v: '(Ký, đóng dấu xác nhận)', t: 's', s: sigStyleSub };
  ws1[`K${sigStart + 5}`] = { v: project.investorName, t: 's', s: sigStyleName };

  ws1['!ref'] = `A1:M${sigStart + 6}`;
  ws1['!cols'] = [
    { wch: 6 },  // A: STT
    { wch: 15 }, // B: Số hiệu
    { wch: 42 }, // C: Tên bản vẽ
    { wch: 28 }, // D: Đơn vị
    { wch: 16 }, // E: Bộ môn
    { wch: 18 }, // F: Giai đoạn
    { wch: 12 }, // G: Phiên bản
    { wch: 10 }, // H: Khổ
    { wch: 10 }, // I: Tỉ lệ
    { wch: 20 }, // J: Người vẽ
    { wch: 22 }, // K: Người duyệt
    { wch: 20 }, // L: Phát sinh
    { wch: 45 }, // M: Nội dung hiệu chỉnh
  ];

  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },
    // Info merges
    { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 12 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 12 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: 12 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } },
    { s: { r: 7, c: 5 }, e: { r: 7, c: 12 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } },
    { s: { r: 8, c: 5 }, e: { r: 8, c: 12 } },
    // KPI block merges
    { s: { r: 10, c: 0 }, e: { r: 10, c: 12 } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 2 } },
    { s: { r: 11, c: 3 }, e: { r: 11, c: 4 } },
    { s: { r: 11, c: 5 }, e: { r: 11, c: 6 } },
    { s: { r: 11, c: 7 }, e: { r: 11, c: 12 } },
    ...kpiData.map((_, idx) => ({ s: { r: 12 + idx, c: 1 }, e: { r: 12 + idx, c: 2 } })),
    ...kpiData.map((_, idx) => ({ s: { r: 12 + idx, c: 3 }, e: { r: 12 + idx, c: 4 } })),
    ...kpiData.map((_, idx) => ({ s: { r: 12 + idx, c: 5 }, e: { r: 12 + idx, c: 6 } })),
    ...kpiData.map((_, idx) => ({ s: { r: 12 + idx, c: 7 }, e: { r: 12 + idx, c: 12 } })),
    // Section II header merge
    { s: { r: startDrawingsSection - 1, c: 0 }, e: { r: startDrawingsSection - 1, c: 12 } },
    // Total merge
    { s: { r: totalRowNum - 1, c: 0 }, e: { r: totalRowNum - 1, c: 1 } },
    // Signatures merges
    { s: { r: sigStart - 1, c: 1 }, e: { r: sigStart - 1, c: 3 } },
    { s: { r: sigStart, c: 1 }, e: { r: sigStart, c: 3 } },
    { s: { r: sigStart + 4, c: 1 }, e: { r: sigStart + 4, c: 3 } },
    { s: { r: sigStart - 1, c: 6 }, e: { r: sigStart - 1, c: 8 } },
    { s: { r: sigStart, c: 6 }, e: { r: sigStart, c: 8 } },
    { s: { r: sigStart + 4, c: 6 }, e: { r: sigStart + 4, c: 8 } },
    { s: { r: sigStart - 1, c: 10 }, e: { r: sigStart - 1, c: 12 } },
    { s: { r: sigStart, c: 10 }, e: { r: sigStart, c: 12 } },
    { s: { r: sigStart + 4, c: 10 }, e: { r: sigStart + 4, c: 12 } },
  ];

  // CỐ ĐỊNH DÒNG TIÊU ĐỀ BẢNG TẠI DÒNG drawHeaderRow
  ws1['!views'] = [
    { state: 'frozen', ySplit: drawHeaderRow, xSplit: 0, activeCell: `A${drawHeaderRow + 1}` }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, `BAO_CAO_${summary.monthKey}`);

  // Sheet 2: Danh Sách Biên Bản Bàn Giao
  if (transmittalsInMonth.length > 0) {
    const ws2: any = {};
    ws2['A1'] = {
      v: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
      t: 's',
      s: { font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center', vertical: 'center' } }
    };
    ws2['A2'] = {
      v: `DANH SÁCH BIÊN BẢN BÀN GIAO HỒ SƠ BẢN VẼ - ${summary.monthLabel.toUpperCase()}`,
      t: 's',
      s: { font: { name: 'Arial', sz: 13, bold: true, color: { rgb: '1E3A8A' } }, alignment: { horizontal: 'center', vertical: 'center' } }
    };
    ws2['A3'] = {
      v: `Dự Án: ${project.projectName} (${project.projectCode})`,
      t: 's',
      s: { font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '475569' } }, alignment: { horizontal: 'center', vertical: 'center' } }
    };

    const transCols = ['STT', 'Số Biên Bản', 'Ngày Bàn Giao', 'Đơn Vị Bàn Giao', 'Người Giao', 'Đơn Vị Nhận', 'Người Nhận', 'Mục Đích Phát Hành', 'Số Bản Vẽ Giao', 'Trạng Thái', 'Ghi Chú Đợt Giao'];
    const transColLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    transCols.forEach((col, idx) => {
      ws2[`${transColLetters[idx]}5`] = {
        v: col,
        t: 's',
        s: {
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4338CA' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          border: borderThin
        }
      };
    });

    transmittalsInMonth.forEach((t, idx) => {
      const rNum = 6 + idx;
      const isEven = idx % 2 === 0;
      const bg = isEven ? 'FFFFFF' : 'F8FAFC';
      const cStyle = (align: 'left' | 'center' | 'right', isBold = false) => ({
        font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: '0F172A' } },
        fill: { fgColor: { rgb: bg } },
        alignment: { horizontal: align, vertical: 'center' },
        border: borderThin
      });

      ws2[`A${rNum}`] = { v: idx + 1, t: 'n', s: cStyle('center', false) };
      ws2[`B${rNum}`] = { v: t.transmittalNo, t: 's', s: cStyle('center', true) };
      ws2[`C${rNum}`] = { v: t.issueDate, t: 's', s: cStyle('center', false) };
      ws2[`D${rNum}`] = { v: t.senderCompany, t: 's', s: cStyle('left', false) };
      ws2[`E${rNum}`] = { v: t.senderPerson, t: 's', s: cStyle('left', false) };
      ws2[`F${rNum}`] = { v: t.recipientCompany, t: 's', s: cStyle('left', false) };
      ws2[`G${rNum}`] = { v: t.recipientPerson, t: 's', s: cStyle('left', false) };
      ws2[`H${rNum}`] = { v: t.purpose === 'FOR_CONSTRUCTION' ? '🏗️ Thi Công (AFC)' : t.purpose === 'FOR_APPROVAL' ? '📋 Phê Duyệt' : '🔍 Tham Khảo', t: 's', s: cStyle('center', false) };
      ws2[`I${rNum}`] = { v: `${t.drawingItems.length} bản vẽ`, t: 's', s: cStyle('center', true) };
      ws2[`J${rNum}`] = { v: t.status === 'CONFIRMED' ? '✅ Đã Ký Nhận' : '⏳ Chờ Xác Nhận', t: 's', s: cStyle('center', true) };
      ws2[`K${rNum}`] = { v: t.notes || '---', t: 's', s: cStyle('left', false) };
    });

    ws2['!ref'] = `A1:K${5 + transmittalsInMonth.length}`;
    ws2['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 32 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 32 }
    ];
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    ];
    ws2['!views'] = [
      { state: 'frozen', ySplit: 5, xSplit: 0, activeCell: 'A6' }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'BIEN_BAN_BAN_GIAO');
  }

  const fileName = `Bao_Cao_Ban_Ve_${summary.monthKey}_${project.projectCode}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Sinh HTML In / Lưu PDF Biên Bản Bàn Giao Hồ Sơ Bản Vẽ (Transmittal Form A4)
 */
export const printTransmittalForm = (
  transmittal: DrawingTransmittal,
  project: DrawingProject
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đã chặn popup. Vui lòng cho phép mở popup để in biên bản.');
    return;
  }

  const itemsHtml = transmittal.drawingItems.map((item, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="text-align: center; padding: 6px 8px;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold; padding: 6px 8px;">${item.drawingNumber}</td>
      <td style="padding: 6px 8px;">${item.title}</td>
      <td style="text-align: center; font-weight: bold; padding: 6px 8px;">${item.revision}</td>
      <td style="text-align: center; padding: 6px 8px;">${item.sheetSize}</td>
      <td style="text-align: center; font-weight: bold; padding: 6px 8px;">${item.copiesCount} bản</td>
      <td style="text-align: center; padding: 6px 8px;">${item.hasSoftCopy ? 'CAD + PDF' : 'Bản in'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>Biên Bản Giao Nhận Hồ Sơ Bản Vẽ - ${transmittal.transmittalNo}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm; }
        body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.4; color: #000; margin: 0; padding: 10px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
        .company-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
        .trans-no { font-family: monospace; font-size: 11pt; font-weight: bold; }
        .title { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
        .subtitle { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 15px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; }
        th { background: #f1f5f9; border: 1px solid #000; padding: 6px 8px; text-align: center; }
        td { border: 1px solid #000; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        .sig-block { width: 45%; }
        .sig-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: #fff; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">🖨️ In Biên Bản / Lưu PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="company-title">CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT</div>
          <div style="font-size: 10pt;">Địa chỉ: 153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM</div>
        </div>
        <div style="text-align: right;">
          <div class="trans-no">Số: ${transmittal.transmittalNo}</div>
          <div style="font-size: 10pt;">Ngày: ${transmittal.issueDate}</div>
        </div>
      </div>

      <div class="title">BIÊN BẢN BÀN GIAO HỒ SƠ BẢN VẼ</div>
      <div class="subtitle">(V/v: Phát hành hồ sơ thiết kế, bản vẽ thi công & bản vẽ sửa đổi)</div>

      <div class="info-grid">
        <div>
          <div><strong>Công Trình:</strong> ${project.projectName}</div>
          <div><strong>Mã Dự Án:</strong> ${project.projectCode}</div>
          <div><strong>Địa Điểm:</strong> ${project.address}</div>
        </div>
        <div>
          <div><strong>Bên Giao (Phát Hành):</strong> ${transmittal.senderCompany} (${transmittal.senderPerson})</div>
          <div><strong>Bên Nhận:</strong> ${transmittal.recipientCompany} (${transmittal.recipientPerson})</div>
          <div><strong>Mục Đích:</strong> ${transmittal.purpose === 'FOR_CONSTRUCTION' ? 'Triển khai thi công tại công trường' : 'Trình duyệt / Thẩm tra'}</div>
        </div>
      </div>

      <div style="font-weight: bold; margin-bottom: 5px;">DANH MỤC HỒ SƠ BẢN VẼ BÀN GIAO:</div>
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">STT</th>
            <th style="width: 100px;">Số Hiệu</th>
            <th>Tên / Tiêu Đề Bản Vẽ</th>
            <th style="width: 70px;">Phiên Bản</th>
            <th style="width: 60px;">Khổ</th>
            <th style="width: 80px;">Số Bản In</th>
            <th style="width: 90px;">Định Dạng</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      ${transmittal.notes ? `<div style="margin-top: 10px; font-style: italic;"><strong>Ghi chú:</strong> ${transmittal.notes}</div>` : ''}

      <div style="margin-top: 15px; font-size: 10.5pt;">
        <em>Hai bên xác nhận đã bàn giao đầy đủ số lượng và chất lượng các hồ sơ bản vẽ kỹ thuật nêu trên. Bản vẽ này là căn cứ pháp lý kỹ thuật cao nhất tại hiện trường.</em>
      </div>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN BÊN GIAO<br/><span style="font-size: 10pt; font-weight: normal;">(Ký, ghi rõ họ tên & đóng dấu)</span></div>
          <div style="font-weight: bold;">${transmittal.senderPerson}</div>
        </div>
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN BÊN NHẬN<br/><span style="font-size: 10pt; font-weight: normal;">(Ký và ghi rõ họ tên)</span></div>
          <div style="font-weight: bold;">${transmittal.recipientPerson}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
