import * as XLSX from 'xlsx';
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
    // Duyệt qua từng đợt sửa đổi của bản vẽ
    draw.revisions.forEach((rev) => {
      let faultParty: TimelineLogItem['faultParty'] = 'NORMAL_NEW';
      let faultLabel = '🟢 Bản gốc phát hành';

      if (rev.revisionNumber === 'Rev 00') {
        if (draw.issueNature === 'VARIATION_ORDER') {
          faultParty = 'SITE_CONDITION';
          faultLabel = '⚡ Hiện trường phát sinh';
        } else {
          faultParty = 'NORMAL_NEW';
          faultLabel = '🆕 Bản mới phát hành';
        }
      } else {
        if (rev.changeReasonCategory === 'INVESTOR_REQUEST') {
          faultParty = 'CLIENT_REQUEST';
          faultLabel = '🟢 Khách yêu cầu đổi ý';
        } else if (rev.changeReasonCategory === 'ERROR_CORRECTION') {
          faultParty = 'INTERNAL_ERROR';
          faultLabel = '🔴 Lỗi kỹ thuật (Mình sai)';
        } else if (rev.changeReasonCategory === 'SITE_CONFLICT') {
          faultParty = 'SITE_CONDITION';
          faultLabel = '🟡 Xung đột hiện trường';
        } else {
          faultParty = 'CLIENT_REQUEST';
          faultLabel = '🟢 Điều chỉnh thiết kế';
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
        handoverStatusLabel: rev.approvedBy ? '✅ Khách đã nhận & duyệt' : '⏳ Chờ bàn giao / duyệt',
        variationAmount: draw.variationAmount,
      });
    });
  });

  // Sắp xếp nhật ký theo ngày mới nhất lên đầu (hoặc ngày tăng dần)
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
    
    // Điểm chất lượng: 100% - (tổng số lỗi sai * 15%)
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

/**
 * Xuất Bảng Đối Chiếu Số Liệu Khách Hàng ra File Excel Tinh Gọn
 */
export const exportReconciliationExcel = (
  project: DrawingProject,
  logs: TimelineLogItem[],
  employeeStats: EmployeeProductivityStats[]
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Bảng Nhật Ký Dòng Thời Gian & Đối Chiếu Khách Hàng
  const header: any[][] = [
    ['CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT'],
    ['BẢNG NHẬT KÝ PHÁT HÀNH, SỬA ĐỔI & ĐỐI CHIẾU HỒ SƠ BẢN VẼ'],
    ['(Dùng để đối chiếu khối lượng, nguyên nhân sửa đổi & phát sinh với Khách Hàng / CĐT)'],
    [],
    [`Dự Án / Công Trình:`, `${project.projectName} [Mã: ${project.projectCode}]`],
    [`Chủ Đầu Tư:`, project.investorName, `Tổng Thầu:`, project.mainContractorName],
    [`Ngày Xuất Báo Cáo:`, new Date().toLocaleDateString('vi-VN')],
    [],
    // Cột dữ liệu
    [
      'STT',
      'Ngày Tháng',
      'Số Hiệu',
      'Tên / Tiêu Đề Bản Vẽ',
      'Người Thực Hiện',
      'Phiên Bản',
      'Nội Dung / Lý Do Sửa Đổi',
      'Phân Định Trách Nhiệm (Khách hay Mình)',
      'Trạng Thái Bàn Giao & Phê Duyệt',
      'Phát Sinh (+VNĐ)'
    ]
  ];

  const rows: any[][] = logs.map((log, idx) => [
    idx + 1,
    log.date,
    log.drawingNumber,
    log.drawingTitle,
    log.author,
    log.revisionNumber,
    log.changeDescription,
    log.faultPartyLabel,
    log.handoverStatusLabel,
    log.variationAmount || 0
  ]);

  const totalVariation = logs.reduce((sum, l) => sum + (l.variationAmount || 0), 0);
  const totalRow = [
    'TỔNG CỘNG',
    '',
    `${logs.length} lượt phát hành/sửa`,
    '',
    '',
    '',
    '',
    '',
    '',
    totalVariation
  ];

  const ws1 = XLSX.utils.aoa_to_sheet([...header, ...rows, totalRow]);
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 40 },
    { wch: 22 },
    { wch: 12 },
    { wch: 45 },
    { wch: 28 },
    { wch: 26 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'NHAT_KY_DOI_CHIEU');

  // Sheet 2: Bảng Tổng Hợp Năng Suất Từng Nhân Viên
  const empHeader: any[][] = [
    ['BẢNG TỔNG HỢP NĂNG SUẤT & ĐÁNH GIÁ CHẤT LƯỢNG NHÂN VIÊN VẼ BẢN VẼ'],
    [],
    [
      'STT',
      'KTS / Kỹ Sư Thực Hiện',
      'Tổng Số Bản Vẽ',
      'Bản Vẽ Chuẩn Ngay Lần Đầu',
      'Số Lần Sửa Theo CĐT (Phát Sinh)',
      'Số Lần Vẽ Sai Kỹ Thuật (Mình Sai)',
      'Bản Vẽ Xử Lý Hiện Trường',
      'Điểm Đánh Giá Chất Lượng (%)'
    ]
  ];

  const empRows: any[][] = employeeStats.map((stat, idx) => [
    idx + 1,
    stat.authorName,
    stat.totalDrawings,
    stat.firstTimePassCount,
    stat.clientRevisionCount,
    stat.internalErrorCount,
    stat.variationCount,
    `${stat.qualityScore}%`
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet([...empHeader, ...empRows]);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 16 },
    { wch: 26 },
    { wch: 30 },
    { wch: 30 },
    { wch: 24 },
    { wch: 24 },
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
