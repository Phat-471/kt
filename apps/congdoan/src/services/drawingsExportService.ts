import XLSX from 'xlsx-js-style';
import { DrawingItem, DrawingProject } from '../types/drawings';

interface ExportDrawingsOptions {
  project: DrawingProject;
  drawings: DrawingItem[];
  filterDescription?: string;
  isAll?: boolean;
}

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

export const exportDrawingsToExcel = ({
  project,
  drawings,
  filterDescription,
  isAll = false
}: ExportDrawingsOptions) => {
  const wb = XLSX.utils.book_new();

  const newCount = drawings.filter(d => d.issueNature === 'NEW_ISSUE').length;
  const revCount = drawings.filter(d => d.issueNature === 'REVISION_MODIFIED').length;
  const varCount = drawings.filter(d => d.issueNature === 'VARIATION_ORDER').length;
  const totalVariation = drawings.reduce((sum, d) => sum + (d.variationAmount || 0), 0);

  const ws: any = {};

  // Dòng 1: Header Công Ty
  ws['A1'] = {
    v: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 2: Phân hệ
  ws['A2'] = {
    v: 'HỆ THỐNG QUẢN LÝ HỒ SƠ BẢN VẼ & TRUY XUẤT NGUỒN GỐC PHÁT SINH',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'DBEAFE' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 3: Tiêu đề
  ws['A3'] = {
    v: 'BẢNG DANH MỤC HỒ SƠ BẢN VẼ THIẾT KẾ & THI CÔNG CHI TIẾT',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 4: Phạm vi
  ws['A4'] = {
    v: isAll ? '● PHẠM VI: TOÀN BỘ HỒ SƠ BẢN VẼ DỰ ÁN' : `● PHẠM VI: THEO BỘ LỌC HIỆN HÀNH [${filterDescription || 'Tùy chọn'}]`,
    t: 's',
    s: {
      font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '475569' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Khối Thông Tin Dự Án (Dòng 6 -> 10)
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

  ws['A6'] = { v: 'THÔNG TIN DỰ ÁN / CÔNG TRÌNH', t: 's', s: infoStyleHeader };
  ws['F6'] = { v: 'THÔNG TIN QUẢN TRỊ & NHÂN SỰ', t: 's', s: infoStyleHeader };

  ws['A7'] = { v: '• Tên Dự Án:', t: 's', s: infoStyleLabel };
  ws['B7'] = { v: project.projectName, t: 's', s: infoStyleVal };
  ws['F7'] = { v: '• KTS Chủ Trì Thiết Kế:', t: 's', s: infoStyleLabel };
  ws['G7'] = { v: project.leadArchitect, t: 's', s: infoStyleVal };

  ws['A8'] = { v: '• Mã Công Trình:', t: 's', s: infoStyleLabel };
  ws['B8'] = { v: project.projectCode, t: 's', s: infoStyleVal };
  ws['F8'] = { v: '• Kỹ Sư Trưởng Kết Cấu:', t: 's', s: infoStyleLabel };
  ws['G8'] = { v: project.leadEngineer, t: 's', s: infoStyleVal };

  ws['A9'] = { v: '• Địa Điểm Xây Dựng:', t: 's', s: infoStyleLabel };
  ws['B9'] = { v: project.address, t: 's', s: infoStyleVal };
  ws['F9'] = { v: '• Tổng Thầu Thi Công:', t: 's', s: infoStyleLabel };
  ws['G9'] = { v: project.mainContractorName, t: 's', s: infoStyleVal };

  ws['A10'] = { v: '• Chủ Đầu Tư / TVGS:', t: 's', s: infoStyleLabel };
  ws['B10'] = { v: project.investorName, t: 's', s: infoStyleVal };
  ws['F10'] = { v: '• Ngày Xuất Danh Mục:', t: 's', s: infoStyleLabel };
  ws['G10'] = { v: new Date().toLocaleDateString('vi-VN'), t: 's', s: infoStyleVal };

  // Khối KPI Summary Cards (Dòng 12-13)
  ws['A12'] = {
    v: 'TỔNG QUAN KHỐI LƯỢNG HỒ SƠ BẢN VẼ TRONG BÁO CÁO:',
    t: 's',
    s: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } } }
  };

  const kpiBoxStyle = (bgColor: string, textColor: string) => ({
    font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: textColor } },
    fill: { fgColor: { rgb: bgColor } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
  });

  ws['A13'] = { v: `Tổng số bản vẽ\n${drawings.length} bản`, t: 's', s: kpiBoxStyle('EFF6FF', '1E40AF') };
  ws['D13'] = { v: `Bản vẽ mới (Rev 00)\n${newCount} bản`, t: 's', s: kpiBoxStyle('F0FDFA', '0E7490') };
  ws['G13'] = { v: `Bản vẽ sửa đổi\n${revCount} bản`, t: 's', s: kpiBoxStyle('FFFBEB', 'B45309') };
  ws['J13'] = { v: `Phát sinh hiện trường\n${varCount} bản`, t: 's', s: kpiBoxStyle('FEF2F2', 'B91C1C') };
  ws['M13'] = { v: `Tổng chi phí phát sinh\n${totalVariation.toLocaleString('vi-VN')} đ`, t: 's', s: kpiBoxStyle('FFF1F2', 'BE123C') };

  // Dòng 15: Header Cột
  const headers = [
    'STT',
    'Số Hiệu',
    'Tên / Tiêu Đề Bản Vẽ Chi Tiết',
    'Đơn Vị Phát Hành',
    'Bộ Môn',
    'Giai Đoạn',
    'Tính Chất',
    'Phiên Bản',
    'Khổ Giấy',
    'Tỉ Lệ',
    'Số Lần Sửa',
    'Tác Giả / KTS',
    'Người Duyệt',
    'Ngày Duyệt',
    'Phát Sinh (+VNĐ)',
    'Định Mức BOM',
    'Ghi Chú / Nhãn'
  ];

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];

  headers.forEach((col, idx) => {
    ws[`${colLetters[idx]}15`] = {
      v: col,
      t: 's',
      s: {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin
      }
    };
  });

  // Dòng Dữ Liệu (Dòng 16 trở đi)
  drawings.forEach((d, idx) => {
    const rowNum = 16 + idx;
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFF' : 'F8FAFC';

    const cellStyle = (align: 'left' | 'center' | 'right', isBold = false, textColor = '0F172A', customBg?: string) => ({
      font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: textColor } },
      fill: { fgColor: { rgb: customBg || bgRowColor } },
      alignment: { horizontal: align, vertical: 'center', wrapText: true },
      border: borderThin
    });

    let disciplineText = '🏛️ Kiến Trúc';
    if (d.discipline === 'STRUCTURE') disciplineText = '🏗️ Kết Cấu';
    else if (d.discipline === 'MEP') disciplineText = '⚡ Điện Nước';
    else if (d.discipline === 'INTERIOR') disciplineText = '🛋️ Nội Thất';
    else if (d.discipline === 'AS_BUILT') disciplineText = '📋 Hoàn Công';

    let stageText = 'Thiết Kế Thi Công';
    if (d.stageType === 'PERMIT') stageText = 'Xin Phép XD';
    else if (d.stageType === 'SHOP_DRAWING') stageText = 'Shop Gia Công';
    else if (d.stageType === 'VARIATION_SITE') stageText = 'Hiện Trường';
    else if (d.stageType === 'AS_BUILT') stageText = 'Hoàn Công';

    let natureText = 'Bản Mới (Rev 00)';
    let natureBg = 'ECFEFF';
    let natureTextCol = '0E7490';
    if (d.issueNature === 'REVISION_MODIFIED') {
      natureText = `Sửa Đổi (${d.currentRevision})`;
      natureBg = 'FEF3C7';
      natureTextCol = '92400E';
    } else if (d.issueNature === 'VARIATION_ORDER') {
      natureText = 'Phát Sinh Hiện Trường';
      natureBg = 'FFE4E6';
      natureTextCol = '9F1239';
    } else if (d.issueNature === 'REDLINE_MARKUP') {
      natureText = 'Redline Tại Chỗ';
      natureBg = 'FEE2E2';
      natureTextCol = '991B1B';
    } else if (d.issueNature === 'AS_BUILT_FINAL') {
      natureText = 'Hoàn Công Bàn Giao';
      natureBg = 'DCFCE7';
      natureTextCol = '166534';
    }

    ws[`A${rowNum}`] = { v: idx + 1, t: 'n', s: cellStyle('center', false, '64748B') };
    ws[`B${rowNum}`] = { v: d.drawingNumber, t: 's', s: cellStyle('center', true, '1D4ED8') };
    ws[`C${rowNum}`] = { v: d.title, t: 's', s: cellStyle('left', true, '0F172A') };
    ws[`D${rowNum}`] = { v: d.companyName, t: 's', s: cellStyle('left', false, '334155') };
    ws[`E${rowNum}`] = { v: disciplineText, t: 's', s: cellStyle('center', false, '0F172A') };
    ws[`F${rowNum}`] = { v: stageText, t: 's', s: cellStyle('center', false, '334155') };
    ws[`G${rowNum}`] = { v: natureText, t: 's', s: cellStyle('center', true, natureTextCol, natureBg) };
    ws[`H${rowNum}`] = { v: d.currentRevision, t: 's', s: cellStyle('center', true, '0F172A') };
    ws[`I${rowNum}`] = { v: d.sheetSize, t: 's', s: cellStyle('center', false, '334155') };
    ws[`J${rowNum}`] = { v: d.scale, t: 's', s: cellStyle('center', false, '64748B') };
    ws[`K${rowNum}`] = { v: d.revisions.length > 1 ? `${d.revisions.length - 1} lần` : 'Bản gốc', t: 's', s: cellStyle('center', false, '334155') };
    ws[`L${rowNum}`] = { v: d.author, t: 's', s: cellStyle('left', false, '0F172A') };
    ws[`M${rowNum}`] = { v: d.approver || 'Chờ duyệt', t: 's', s: cellStyle('left', false, '334155') };
    ws[`N${rowNum}`] = { v: d.approvedDate || '---', t: 's', s: cellStyle('center', false, '64748B') };
    ws[`O${rowNum}`] = { 
      v: d.variationAmount || 0, 
      t: 'n', 
      z: '#,##0 "đ"', 
      s: cellStyle('right', (d.variationAmount || 0) > 0, (d.variationAmount || 0) > 0 ? 'B91C1C' : '94A3B8') 
    };
    ws[`P${rowNum}`] = { v: d.costingLinkId || '---', t: 's', s: cellStyle('center', false, '4338CA') };
    ws[`Q${rowNum}`] = { v: d.tags.join(', '), t: 's', s: cellStyle('left', false, '64748B') };
  });

  // Dòng Tổng Cộng
  const totalRowNum = 16 + drawings.length;
  const totalStyle = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderMedium
  };

  colLetters.forEach(l => {
    ws[`${l}${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  });

  ws[`A${totalRowNum}`] = { v: 'TỔNG CỘNG', t: 's', s: totalStyle };
  ws[`B${totalRowNum}`] = { v: `${drawings.length} bản vẽ`, t: 's', s: totalStyle };
  ws[`O${totalRowNum}`] = { 
    v: totalVariation, 
    t: 'n', 
    z: '#,##0 "đ"', 
    s: { ...totalStyle, alignment: { horizontal: 'right', vertical: 'center' }, font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'B91C1C' } } } 
  };

  // Khung Chữ Ký (Dòng totalRowNum + 2 -> + 6)
  const sigStart = totalRowNum + 2;
  const sigStyleTitle = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  const sigStyleSub = {
    font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  const sigStyleName = {
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  ws[`B${sigStart}`] = { v: 'NGƯỜI LẬP BẢNG', t: 's', s: sigStyleTitle };
  ws[`B${sigStart + 1}`] = { v: '(Ký, ghi rõ họ tên)', t: 's', s: sigStyleSub };
  ws[`B${sigStart + 5}`] = { v: project.leadArchitect, t: 's', s: sigStyleName };

  ws[`G${sigStart}`] = { v: 'KTS CHỦ TRÌ THIẾT KẾ', t: 's', s: sigStyleTitle };
  ws[`G${sigStart + 1}`] = { v: '(Ký, ghi rõ họ tên)', t: 's', s: sigStyleSub };
  ws[`G${sigStart + 5}`] = { v: 'CÔNG TY TNHH HƯNG PHÁT', t: 's', s: sigStyleName };

  ws[`M${sigStart}`] = { v: 'ĐẠI DIỆN CHỦ ĐẦU TƯ / TVGS', t: 's', s: sigStyleTitle };
  ws[`M${sigStart + 1}`] = { v: '(Ký, đóng dấu xác nhận)', t: 's', s: sigStyleSub };
  ws[`M${sigStart + 5}`] = { v: project.investorName, t: 's', s: sigStyleName };

  ws['!ref'] = `A1:Q${sigStart + 6}`;

  // Độ rộng cột
  ws['!cols'] = [
    { wch: 6 },  // A: STT
    { wch: 15 }, // B: Số hiệu
    { wch: 42 }, // C: Tên bản vẽ
    { wch: 30 }, // D: Đơn vị
    { wch: 16 }, // E: Bộ môn
    { wch: 18 }, // F: Giai đoạn
    { wch: 24 }, // G: Tính chất
    { wch: 12 }, // H: Phiên bản
    { wch: 10 }, // I: Khổ
    { wch: 10 }, // J: Tỉ lệ
    { wch: 12 }, // K: Số lần sửa
    { wch: 22 }, // L: Tác giả
    { wch: 24 }, // M: Người duyệt
    { wch: 14 }, // N: Ngày duyệt
    { wch: 20 }, // O: Phát sinh
    { wch: 22 }, // P: Mã BOM
    { wch: 28 }, // Q: Ghi chú
  ];

  // Chiều cao dòng
  ws['!rows'] = [
    { hpt: 26 }, { hpt: 18 }, { hpt: 28 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 20 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 8 },
    { hpt: 18 }, { hpt: 32 }, { hpt: 8 },
    { hpt: 28 }
  ];

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 16 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 16 } },
    // Info block
    { s: { r: 5, c: 0 }, e: { r: 5, c: 4 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 16 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } },
    { s: { r: 6, c: 6 }, e: { r: 6, c: 16 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 4 } },
    { s: { r: 7, c: 6 }, e: { r: 7, c: 16 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 4 } },
    { s: { r: 8, c: 6 }, e: { r: 8, c: 16 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 4 } },
    { s: { r: 9, c: 6 }, e: { r: 9, c: 16 } },
    // KPI summary merges
    { s: { r: 11, c: 0 }, e: { r: 11, c: 16 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 2 } },
    { s: { r: 12, c: 3 }, e: { r: 12, c: 5 } },
    { s: { r: 12, c: 6 }, e: { r: 12, c: 8 } },
    { s: { r: 12, c: 9 }, e: { r: 12, c: 11 } },
    { s: { r: 12, c: 12 }, e: { r: 12, c: 16 } },
    // Total merge
    { s: { r: totalRowNum - 1, c: 0 }, e: { r: totalRowNum - 1, c: 1 } },
    // Signatures merges
    { s: { r: sigStart - 1, c: 1 }, e: { r: sigStart - 1, c: 3 } },
    { s: { r: sigStart, c: 1 }, e: { r: sigStart, c: 3 } },
    { s: { r: sigStart + 4, c: 1 }, e: { r: sigStart + 4, c: 3 } },
    { s: { r: sigStart - 1, c: 6 }, e: { r: sigStart - 1, c: 8 } },
    { s: { r: sigStart, c: 6 }, e: { r: sigStart, c: 8 } },
    { s: { r: sigStart + 4, c: 6 }, e: { r: sigStart + 4, c: 8 } },
    { s: { r: sigStart - 1, c: 12 }, e: { r: sigStart - 1, c: 15 } },
    { s: { r: sigStart, c: 12 }, e: { r: sigStart, c: 15 } },
    { s: { r: sigStart + 4, c: 12 }, e: { r: sigStart + 4, c: 15 } },
  ];

  // CỐ ĐỊNH DÒNG TIÊU ĐỀ TẠI DÒNG 15
  ws['!views'] = [
    { state: 'frozen', ySplit: 15, xSplit: 0, activeCell: 'A16' }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'DANH_MUC_BAN_VE');

  const fileName = `Danh_Muc_Ban_Ve_${project.projectCode}_${isAll ? 'Toan_Bo' : 'Theo_Loc'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
