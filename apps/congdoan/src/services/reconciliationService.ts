import XLSX from 'xlsx-js-style';
import { DrawingItem, DrawingProject } from '../types/drawings';

export interface TimelineLogItem {
  id: string;
  date: string;                   // '2026-01-02', '2026-03-02'...
  drawingId: string;
  drawingNumber: string;          // 'KT-01', 'KC-02'...
  drawingTitle: string;           // 'Mặt Bằng Bố Trí Nội Thất Tầng 1'
  author: string;                 // 'KTS. Lê Hoàng Sỹ (Nhân viên A)'
  revisionNumber: string;         // 'Rev 00', 'Rev 01', 'Rev 02'
  actionType: 'NEW' | 'REVISION' | 'VARIATION';
  changeDescription: string;     // 'Phát hành đợt 1', 'Dời vách ngăn phòng khách'...
  faultParty: 'CLIENT_REQUEST' | 'INTERNAL_ERROR' | 'SITE_CONDITION' | 'NORMAL_NEW';
  faultPartyLabel: string;        // 'Khách đổi ý', 'Mình vẽ sai', 'Hiện trường', 'Bản gốc'
  handoverStatus: 'HANDED_OVER' | 'PENDING' | 'DISPUTED';
  handoverStatusLabel: string;   // 'Khách đã nhận', 'Chờ giao', 'Đang tranh chấp'
  variationAmount?: number;
}

export interface EmployeeProductivityStats {
  authorName: string;
  totalDrawings: number;          // Tổng số bản vẽ tham gia
  firstTimePassCount: number;     // Số bản vẽ đạt chuẩn lần đầu (không bị lỗi)
  clientRevisionCount: number;    // Số lần sửa do CĐT đổi ý (được tính phát sinh)
  internalErrorCount: number;     // Số lần sửa do mình vẽ sai kỹ thuật
  variationCount: number;         // Số bản vẽ phát sinh hiện trường
  qualityScore: number;           // Điểm chất lượng % (100% nếu 0 lỗi kỹ thuật)
}

/**
 * Trích xuất danh sách Nhật ký Dòng thời gian từ toàn bộ bản vẽ và các đợt revision
 */
export const extractTimelineLogs = (drawings: DrawingItem[]): TimelineLogItem[] => {
  const logs: TimelineLogItem[] = [];

  drawings.forEach((draw) => {
    draw.revisions.forEach((rev) => {
      let faultParty: TimelineLogItem['faultParty'] = 'NORMAL_NEW';
      let faultLabel = 'Bản gốc phát hành';

      if (rev.revisionNumber === 'Rev 00') {
        if (draw.issueNature === 'VARIATION_ORDER') {
          faultParty = 'SITE_CONDITION';
          faultLabel = 'Phát sinh hiện trường';
        } else {
          faultParty = 'NORMAL_NEW';
          faultLabel = 'Bản mới phát hành';
        }
      } else {
        if (rev.changeReasonCategory === 'INVESTOR_REQUEST') {
          faultParty = 'CLIENT_REQUEST';
          faultLabel = 'Khách yêu cầu đổi ý';
        } else if (rev.changeReasonCategory === 'ERROR_CORRECTION') {
          faultParty = 'INTERNAL_ERROR';
          faultLabel = 'Lỗi kỹ thuật (Mình sai)';
        } else if (rev.changeReasonCategory === 'SITE_CONFLICT') {
          faultParty = 'SITE_CONDITION';
          faultLabel = 'Xung đột hiện trường';
        } else {
          faultParty = 'CLIENT_REQUEST';
          faultLabel = 'Điều chỉnh thiết kế';
        }
      }

      logs.push({
        id: rev.id,
        date: rev.changeDate || '2026-01-01',
        drawingId: draw.id,
        drawingNumber: draw.drawingNumber,
        drawingTitle: draw.title,
        author: rev.changedBy || draw.author || 'Chưa gán',
        revisionNumber: rev.revisionNumber,
        actionType: rev.revisionNumber === 'Rev 00' ? (draw.issueNature === 'VARIATION_ORDER' ? 'VARIATION' : 'NEW') : 'REVISION',
        changeDescription: rev.changeDescription || 'Hiệu chỉnh bản vẽ',
        faultParty,
        faultPartyLabel: faultLabel,
        handoverStatus: rev.approvedBy ? 'HANDED_OVER' : 'PENDING',
        handoverStatusLabel: rev.approvedBy ? 'Đã duyệt' : 'Chờ duyệt',
        variationAmount: draw.variationAmount,
      });
    });
  });

  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Tính toán Thống kê Năng suất & Đánh giá Chất lượng Nhân viên
 */
export const calculateEmployeeStats = (logs: TimelineLogItem[]): EmployeeProductivityStats[] => {
  const map = new Map<string, {
    totalDrawingsSet: Set<string>;
    firstTimePassSet: Set<string>;
    clientRevisionCount: number;
    internalErrorCount: number;
    variationCount: number;
  }>();

  logs.forEach((log) => {
    const name = log.author || 'Chưa gán';
    if (!map.has(name)) {
      map.set(name, {
        totalDrawingsSet: new Set(),
        firstTimePassSet: new Set(),
        clientRevisionCount: 0,
        internalErrorCount: 0,
        variationCount: 0,
      });
    }

    const stat = map.get(name)!;
    stat.totalDrawingsSet.add(log.drawingNumber);

    if (log.actionType === 'NEW') {
      stat.firstTimePassSet.add(log.drawingNumber);
    }
    if (log.faultParty === 'CLIENT_REQUEST') {
      stat.clientRevisionCount++;
    } else if (log.faultParty === 'INTERNAL_ERROR') {
      stat.internalErrorCount++;
      stat.firstTimePassSet.delete(log.drawingNumber);
    } else if (log.faultParty === 'SITE_CONDITION') {
      stat.variationCount++;
    }
  });

  const result: EmployeeProductivityStats[] = [];

  map.forEach((value, authorName) => {
    const totalDrawings = value.totalDrawingsSet.size;
    const firstTimePassCount = value.firstTimePassSet.size;
    const errorCount = value.internalErrorCount;
    
    let qualityScore = 100 - (errorCount * 15);
    if (qualityScore < 0) qualityScore = 0;

    result.push({
      authorName,
      totalDrawings,
      firstTimePassCount,
      clientRevisionCount: value.clientRevisionCount,
      internalErrorCount: value.internalErrorCount,
      variationCount: value.variationCount,
      qualityScore,
    });
  });

  return result.sort((a, b) => b.totalDrawings - a.totalDrawings);
};

// Định nghĩa các bộ styles màu sắc chuẩn
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
 * Xuất Bảng Đối Chiếu Số Liệu Khách Hàng ra File Excel Đẹp & Cố Định Dòng (Freeze Panes)
 */
export const exportReconciliationExcel = (
  project: DrawingProject,
  logs: TimelineLogItem[],
  employeeStats: EmployeeProductivityStats[]
) => {
  const wb = XLSX.utils.book_new();

  const clientReqCount = logs.filter(l => l.faultParty === 'CLIENT_REQUEST').length;
  const internalErrCount = logs.filter(l => l.faultParty === 'INTERNAL_ERROR').length;
  const siteCondCount = logs.filter(l => l.faultParty === 'SITE_CONDITION').length;
  const totalVariation = logs.reduce((sum, l) => sum + (l.variationAmount || 0), 0);

  // =========================================================================
  // SHEET 1: NHẬT KÝ DÒNG THỜI GIAN & ĐỐI CHIẾU KHÁCH HÀNG
  // =========================================================================
  const ws1: any = {};

  // Dòng 1: Tên công ty
  ws1['A1'] = {
    v: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } }, // Xanh Navy đậm
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 2: Phân hệ
  ws1['A2'] = {
    v: 'HỆ THỐNG KIỂM TOÁN HỒ SƠ BẢN VẼ & TRUY XÉT TRÁCH NHIỆM SỬA ĐỔI VỚI KHÁCH HÀNG',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'DBEAFE' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 3: Tiêu đề bảng
  ws1['A3'] = {
    v: 'BẢNG ĐỐI CHIẾU NHẬT KÝ BẢN VẼ, NGUYÊN NHÂN HIỆU CHỈNH & PHÁT SINH',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  // Dòng 4: Chú thích pháp lý
  ws1['A4'] = {
    v: '(Căn cứ pháp lý xác định khối lượng thiết kế bàn giao & trách nhiệm chi phí phát sinh hai bên)',
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

  ws1['A6'] = { v: 'THÔNG TIN DỰ ÁN ĐỐI SOÁT', t: 's', s: infoStyleHeader };
  ws1['E6'] = { v: 'THÔNG TIN BÀN GIAO & PHÁP LÝ', t: 's', s: infoStyleHeader };

  ws1['A7'] = { v: '• Tên Dự Án:', t: 's', s: infoStyleLabel };
  ws1['B7'] = { v: project.projectName, t: 's', s: infoStyleVal };
  ws1['E7'] = { v: '• KTS Chủ Trì Hưng Phát:', t: 's', s: infoStyleLabel };
  ws1['F7'] = { v: project.leadArchitect, t: 's', s: infoStyleVal };

  ws1['A8'] = { v: '• Mã Công Trình:', t: 's', s: infoStyleLabel };
  ws1['B8'] = { v: project.projectCode, t: 's', s: infoStyleVal };
  ws1['E8'] = { v: '• Đại Diện Chủ Đầu Tư / TVGS:', t: 's', s: infoStyleLabel };
  ws1['F8'] = { v: project.investorName, t: 's', s: infoStyleVal };

  ws1['A9'] = { v: '• Địa Điểm Xây Dựng:', t: 's', s: infoStyleLabel };
  ws1['B9'] = { v: project.address, t: 's', s: infoStyleVal };
  ws1['E9'] = { v: '• Đơn Vị Phát Hành Chính:', t: 's', s: infoStyleLabel };
  ws1['F9'] = { v: project.mainContractorName, t: 's', s: infoStyleVal };

  ws1['A10'] = { v: '• Ngày Lập Đối Soát:', t: 's', s: infoStyleLabel };
  ws1['B10'] = { v: new Date().toLocaleDateString('vi-VN'), t: 's', s: infoStyleVal };
  ws1['E10'] = { v: '• Tình Trạng Hồ Sơ:', t: 's', s: infoStyleLabel };
  ws1['F10'] = { v: 'Đang Đối Soát & Chốt Khối Lượng', t: 's', s: infoStyleVal };

  // Khối KPI Summary Cards (Dòng 12-13)
  ws1['A12'] = {
    v: 'TỔNG HỢP NGUYÊN NHÂN SỬA ĐỔI & TRÁCH NHIỆM PHÁT SINH:',
    t: 's',
    s: { font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } } }
  };

  const kpiBoxStyle = (bgColor: string, textColor: string) => ({
    font: { name: 'Arial', sz: 9.5, bold: true, color: { rgb: textColor } },
    fill: { fgColor: { rgb: bgColor } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderThin
  });

  ws1['A13'] = { v: `Tổng lượt xử lý\n${logs.length} lượt`, t: 's', s: kpiBoxStyle('EFF6FF', '1E40AF') };
  ws1['C13'] = { v: `Khách đổi ý (Tính PS)\n${clientReqCount} đợt`, t: 's', s: kpiBoxStyle('F0FDF4', '15803D') };
  ws1['E13'] = { v: `Lỗi kỹ thuật (Mình sai)\n${internalErrCount} lỗi`, t: 's', s: kpiBoxStyle('FEF2F2', 'B91C1C') };
  ws1['G13'] = { v: `Hiện trường phát sinh\n${siteCondCount} đợt`, t: 's', s: kpiBoxStyle('FFFBEB', 'B45309') };
  ws1['I13'] = { v: `Tổng chi phí phát sinh\n${totalVariation.toLocaleString('vi-VN')} đ`, t: 's', s: kpiBoxStyle('FFF1F2', 'BE123C') };

  // Dòng 15: Header Cột Bảng Dữ Liệu
  const headerCols = [
    'STT',
    'Ngày Tháng',
    'Số Hiệu',
    'Tên / Tiêu Đề Bản Vẽ Chi Tiết',
    'Người Thực Hiện',
    'Phiên Bản',
    'Nội Dung / Lý Do Sửa Đổi Cụ Thể',
    'Phân Định Trách Nhiệm',
    'Tình Trạng',
    'Phát Sinh (+VNĐ)'
  ];

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  headerCols.forEach((colName, idx) => {
    ws1[`${colLetters[idx]}15`] = {
      v: colName,
      t: 's',
      s: {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } }, // Xanh dương đậm chuẩn
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin
      }
    };
  });

  // Dòng dữ liệu (Từ Dòng 16 trở đi)
  logs.forEach((log, idx) => {
    const rowNum = 16 + idx;
    const isEven = idx % 2 === 0;
    const bgRowColor = isEven ? 'FFFFFF' : 'F8FAFC'; // Kẻ sọc màu xen kẽ đẹp mắt

    // Style ô dữ liệu
    const cellStyle = (align: 'left' | 'center' | 'right', isBold = false, textColor = '0F172A', customBg?: string) => ({
      font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: textColor } },
      fill: { fgColor: { rgb: customBg || bgRowColor } },
      alignment: { horizontal: align, vertical: 'center', wrapText: true },
      border: borderThin
    });

    // Màu sắc theo phân định trách nhiệm
    let faultBg = 'F1F5F9';
    let faultText = '334155';
    if (log.faultParty === 'INTERNAL_ERROR') {
      faultBg = 'FEE2E2'; // Đỏ nhạt
      faultText = '991B1B'; // Đỏ đậm
    } else if (log.faultParty === 'CLIENT_REQUEST') {
      faultBg = 'DCFCE7'; // Xanh lá nhạt
      faultText = '166534'; // Xanh lá đậm
    } else if (log.faultParty === 'SITE_CONDITION') {
      faultBg = 'FEF3C7'; // Vàng nhạt
      faultText = '92400E';
    }

    ws1[`A${rowNum}`] = { v: idx + 1, t: 'n', s: cellStyle('center', false, '64748B') };
    ws1[`B${rowNum}`] = { v: log.date, t: 's', s: cellStyle('center', true, '1E293B') };
    ws1[`C${rowNum}`] = { v: log.drawingNumber, t: 's', s: cellStyle('center', true, '1D4ED8') };
    ws1[`D${rowNum}`] = { v: log.drawingTitle, t: 's', s: cellStyle('left', true, '0F172A') };
    ws1[`E${rowNum}`] = { v: log.author, t: 's', s: cellStyle('left', false, '334155') };
    ws1[`F${rowNum}`] = { v: log.revisionNumber, t: 's', s: cellStyle('center', true, '0F172A') };
    ws1[`G${rowNum}`] = { v: log.changeDescription, t: 's', s: cellStyle('left', false, '334155') };
    ws1[`H${rowNum}`] = { v: log.faultPartyLabel, t: 's', s: cellStyle('center', true, faultText, faultBg) };
    ws1[`I${rowNum}`] = { v: log.handoverStatusLabel, t: 's', s: cellStyle('center', false, log.handoverStatus === 'HANDED_OVER' ? '15803D' : 'B45309') };
    ws1[`J${rowNum}`] = { 
      v: log.variationAmount || 0, 
      t: 'n', 
      z: '#,##0 "đ"', 
      s: cellStyle('right', (log.variationAmount || 0) > 0, (log.variationAmount || 0) > 0 ? 'B91C1C' : '94A3B8') 
    };
  });

  // Dòng Tổng Cộng
  const totalRowNum = 16 + logs.length;
  const totalStyle = {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'FEF3C7' } }, // Nền vàng kem nổi bật
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderMedium
  };

  ws1[`A${totalRowNum}`] = { v: 'TỔNG CỘNG', t: 's', s: totalStyle };
  ws1[`B${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`C${totalRowNum}`] = { v: `${logs.length} lượt xử lý`, t: 's', s: totalStyle };
  ws1[`D${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`E${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`F${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`G${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`H${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`I${totalRowNum}`] = { v: '', t: 's', s: totalStyle };
  ws1[`J${totalRowNum}`] = { 
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

  ws1[`B${sigStart}`] = { v: 'ĐẠI DIỆN TỔNG THẦU HƯNG PHÁT', t: 's', s: sigStyleTitle };
  ws1[`B${sigStart + 1}`] = { v: '(Ký, ghi rõ họ tên và đóng dấu)', t: 's', s: sigStyleSub };
  ws1[`B${sigStart + 5}`] = { v: project.leadArchitect, t: 's', s: sigStyleName };

  ws1[`H${sigStart}`] = { v: 'ĐẠI DIỆN CHỦ ĐẦU TƯ / TVGS', t: 's', s: sigStyleTitle };
  ws1[`H${sigStart + 1}`] = { v: '(Ký, đóng dấu xác nhận khối lượng)', t: 's', s: sigStyleSub };
  ws1[`H${sigStart + 5}`] = { v: project.investorName, t: 's', s: sigStyleName };

  // Cấu hình phạm vi Range
  ws1['!ref'] = `A1:J${sigStart + 6}`;

  // Cấu hình độ rộng các cột (!cols)
  ws1['!cols'] = [
    { wch: 6 },  // A: STT
    { wch: 14 }, // B: Ngày tháng
    { wch: 16 }, // C: Số hiệu
    { wch: 42 }, // D: Tên bản vẽ
    { wch: 24 }, // E: Người vẽ
    { wch: 12 }, // F: Phiên bản
    { wch: 45 }, // G: Nội dung sửa
    { wch: 28 }, // H: Phân định
    { wch: 18 }, // I: Tình trạng
    { wch: 22 }, // J: Phát sinh VNĐ
  ];

  // Cấu hình chiều cao dòng (!rows)
  ws1['!rows'] = [
    { hpt: 26 }, // 1: Tên cty
    { hpt: 18 }, // 2: Phân hệ
    { hpt: 28 }, // 3: Tiêu đề
    { hpt: 18 }, // 4: Chú thích
    { hpt: 8 },  // 5: Trống
    { hpt: 20 }, // 6: Header info
    { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, { hpt: 18 }, // 7-10: Info
    { hpt: 8 },  // 11: Trống
    { hpt: 18 }, // 12: KPI Header
    { hpt: 32 }, // 13: KPI Cards
    { hpt: 8 },  // 14: Trống
    { hpt: 28 }, // 15: Header table (Cố định ở đây)
  ];

  // Merge ô Sheet 1
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    // Info block
    { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 9 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } },
    { s: { r: 6, c: 5 }, e: { r: 6, c: 9 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } },
    { s: { r: 7, c: 5 }, e: { r: 7, c: 9 } },
    { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } },
    { s: { r: 8, c: 5 }, e: { r: 8, c: 9 } },
    { s: { r: 9, c: 1 }, e: { r: 9, c: 3 } },
    { s: { r: 9, c: 5 }, e: { r: 9, c: 9 } },
    // KPI summary merges
    { s: { r: 11, c: 0 }, e: { r: 11, c: 9 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 1 } },
    { s: { r: 12, c: 2 }, e: { r: 12, c: 3 } },
    { s: { r: 12, c: 4 }, e: { r: 12, c: 5 } },
    { s: { r: 12, c: 6 }, e: { r: 12, c: 7 } },
    { s: { r: 12, c: 8 }, e: { r: 12, c: 9 } },
    // Total row merge
    { s: { r: totalRowNum - 1, c: 0 }, e: { r: totalRowNum - 1, c: 1 } },
    // Signatures merges
    { s: { r: sigStart - 1, c: 1 }, e: { r: sigStart - 1, c: 3 } },
    { s: { r: sigStart, c: 1 }, e: { r: sigStart, c: 3 } },
    { s: { r: sigStart + 4, c: 1 }, e: { r: sigStart + 4, c: 3 } },
    { s: { r: sigStart - 1, c: 7 }, e: { r: sigStart - 1, c: 9 } },
    { s: { r: sigStart, c: 7 }, e: { r: sigStart, c: 9 } },
    { s: { r: sigStart + 4, c: 7 }, e: { r: sigStart + 4, c: 9 } },
  ];

  // CỐ ĐỊNH DÒNG TIÊU ĐỀ (FREEZE PANES TẠI DÒNG 15)
  ws1['!views'] = [
    { state: 'frozen', ySplit: 15, xSplit: 0, activeCell: 'A16' }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'NHAT_KY_DOI_CHIEU');

  // =========================================================================
  // SHEET 2: TỔNG HỢP NĂNG SUẤT TỪNG NHÂN VIÊN (STYLING ĐẸP)
  // =========================================================================
  const ws2: any = {};

  ws2['A1'] = {
    v: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  ws2['A2'] = {
    v: 'BẢNG ĐÁNH GIÁ NĂNG SUẤT & TỶ LỆ CHUẨN XÁC CỦA NHÂN VIÊN THIẾT KẾ BẢN VẼ',
    t: 's',
    s: {
      font: { name: 'Arial', sz: 13, bold: true, color: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  ws2['A3'] = {
    v: `Dự Án: ${project.projectName} (${project.projectCode}) • Ngày đánh giá: ${new Date().toLocaleDateString('vi-VN')}`,
    t: 's',
    s: {
      font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '475569' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  };

  const empCols = [
    'STT',
    'KTS / Kỹ Sư Thực Hiện',
    'Tổng Số Bản Vẽ',
    'Bản Chuẩn Lần Đầu',
    'Sửa Theo CĐT (Phát Sinh)',
    'Vẽ Sai Kỹ Thuật (Lỗi Mình)',
    'Xử Lý Hiện Trường',
    'Điểm Chất Lượng (%)',
    'Xếp Loại Hiệu Suất'
  ];

  empCols.forEach((col, idx) => {
    ws2[`${colLetters[idx]}5`] = {
      v: col,
      t: 's',
      s: {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4338CA' } }, // Màu chàm Indigo sang trọng
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderThin
      }
    };
  });

  employeeStats.forEach((stat, idx) => {
    const rowNum = 6 + idx;
    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFF' : 'F8FAFC';

    let rank = 'Xuất Sắc (A)';
    let rankColor = '15803D';
    let rankBg = 'DCFCE7';
    if (stat.qualityScore < 70) {
      rank = 'Cần Cải Thiện (C)';
      rankColor = 'B91C1C';
      rankBg = 'FEE2E2';
    } else if (stat.qualityScore < 90) {
      rank = 'Tốt (B)';
      rankColor = 'B45309';
      rankBg = 'FEF3C7';
    }

    const cStyle = (align: 'left' | 'center' | 'right', isBold = false, color = '0F172A', customBg?: string) => ({
      font: { name: 'Arial', sz: 9.5, bold: isBold, color: { rgb: color } },
      fill: { fgColor: { rgb: customBg || bg } },
      alignment: { horizontal: align, vertical: 'center' },
      border: borderThin
    });

    ws2[`A${rowNum}`] = { v: idx + 1, t: 'n', s: cStyle('center', false, '64748B') };
    ws2[`B${rowNum}`] = { v: stat.authorName, t: 's', s: cStyle('left', true, '1E293B') };
    ws2[`C${rowNum}`] = { v: stat.totalDrawings, t: 'n', s: cStyle('center', true, '1D4ED8') };
    ws2[`D${rowNum}`] = { v: stat.firstTimePassCount, t: 'n', s: cStyle('center', true, '15803D') };
    ws2[`E${rowNum}`] = { v: stat.clientRevisionCount, t: 'n', s: cStyle('center', false, '334155') };
    ws2[`F${rowNum}`] = { v: stat.internalErrorCount, t: 'n', s: cStyle('center', stat.internalErrorCount > 0, stat.internalErrorCount > 0 ? 'B91C1C' : '94A3B8') };
    ws2[`G${rowNum}`] = { v: stat.variationCount, t: 'n', s: cStyle('center', false, '334155') };
    ws2[`H${rowNum}`] = { v: `${stat.qualityScore}%`, t: 's', s: cStyle('center', true, rankColor, rankBg) };
    ws2[`I${rowNum}`] = { v: rank, t: 's', s: cStyle('center', true, rankColor, rankBg) };
  });

  ws2['!ref'] = `A1:I${5 + employeeStats.length}`;
  ws2['!cols'] = [
    { wch: 6 },  // STT
    { wch: 28 }, // Tên NV
    { wch: 16 }, // Tổng bản
    { wch: 22 }, // Chuẩn lần đầu
    { wch: 26 }, // Sửa theo CĐT
    { wch: 26 }, // Vẽ sai
    { wch: 20 }, // Hiện trường
    { wch: 22 }, // Điểm %
    { wch: 22 }, // Xếp loại
  ];

  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
  ];

  // Freeze Panes tại dòng 5
  ws2['!views'] = [
    { state: 'frozen', ySplit: 5, xSplit: 0, activeCell: 'A6' }
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'NANG_SUAT_NHAN_VIEN');

  const fileName = `Doi_Chieu_Ban_Ve_${project.projectCode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Sinh HTML In / Lưu PDF Biên Bản Đối Soát Khách Hàng Khổ A4
 */
export const printReconciliationDoc = (
  project: DrawingProject,
  logs: TimelineLogItem[]
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đã chặn popup. Vui lòng cho phép popup để in biên bản.');
    return;
  }

  const rowsHtml = logs.map((log, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1;">
      <td style="text-align: center; padding: 6px 4px;">${idx + 1}</td>
      <td style="text-align: center; font-family: monospace; padding: 6px 4px;">${log.date}</td>
      <td style="font-family: monospace; font-weight: bold; padding: 6px 4px;">${log.drawingNumber}</td>
      <td style="padding: 6px 6px;">${log.drawingTitle}</td>
      <td style="text-align: center; font-weight: bold; padding: 6px 4px;">${log.revisionNumber}</td>
      <td style="padding: 6px 6px; font-size: 10pt;">${log.changeDescription}</td>
      <td style="padding: 6px 6px; font-weight: bold; font-size: 10pt; color: ${log.faultParty === 'INTERNAL_ERROR' ? '#b91c1c' : log.faultParty === 'CLIENT_REQUEST' ? '#15803d' : '#0369a1'};">
        ${log.faultPartyLabel}
      </td>
      <td style="text-align: center; font-size: 10pt; padding: 6px 4px;">${log.handoverStatusLabel}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>Biên Bản Đối Soát Hồ Sơ Bản Vẽ - ${project.projectCode}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 0; padding: 10px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 10px; }
        .company-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; }
        .title { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 10px 0 3px 0; }
        .subtitle { text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
        th { background: #f1f5f9; border: 1px solid #000; padding: 6px 4px; text-align: center; font-weight: bold; }
        td { border: 1px solid #000; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; page-break-inside: avoid; }
        .sig-block { width: 45%; }
        .sig-title { font-weight: bold; margin-bottom: 50px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 10px; text-align: right;">
        <button onclick="window.print()" style="padding: 6px 14px; background: #2563eb; color: #fff; font-weight: bold; border: none; border-radius: 4px; cursor: pointer;">🖨️ In Biên Bản / Lưu PDF</button>
      </div>

      <div class="header">
        <div>
          <div class="company-title">CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT</div>
          <div style="font-size: 9.5pt;">Dự Án: <strong>${project.projectName}</strong> (${project.projectCode})</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9.5pt;">Chủ Đầu Tư: <strong>${project.investorName}</strong></div>
          <div style="font-size: 9.5pt;">Ngày lập: ${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>

      <div class="title">BẢNG ĐỐI SOÁT NHẬT KÝ BẢN VẼ & TRUY XÉT LÝ DO SỬA ĐỔI</div>
      <div class="subtitle">(Căn cứ xác định khối lượng thiết kế bàn giao & trách nhiệm chi phí phát sinh)</div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">STT</th>
            <th style="width: 75px;">Ngày</th>
            <th style="width: 75px;">Số Hiệu</th>
            <th>Tên / Tiêu Đề Bản Vẽ</th>
            <th style="width: 60px;">Đợt</th>
            <th>Nội Dung / Lý Do Sửa Đổi</th>
            <th style="width: 140px;">Phân Định (Khách hay Mình)</th>
            <th style="width: 120px;">Tình Trạng</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN TỔNG THẦU HƯNG PHÁT<br/><span style="font-size: 9pt; font-weight: normal;">(Ký & ghi rõ họ tên)</span></div>
          <div style="font-weight: bold;">${project.leadArchitect}</div>
        </div>
        <div class="sig-block">
          <div class="sig-title">ĐẠI DIỆN CHỦ ĐẦU TƯ / TVGS<br/><span style="font-size: 9pt; font-weight: normal;">(Ký & ghi rõ họ tên)</span></div>
          <div style="font-weight: bold;">${project.investorName}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
