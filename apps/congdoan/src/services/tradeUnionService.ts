import {
  TradeUnionTransaction,
  TradeUnionCategory,
  TradeUnionVoucherType,
  Client,
  TradeUnionMemberContribution,
  TradeUnionContributionPeriod,
  TradeUnionMonthlyYearSummaryRow,
  TradeUnionYearSummaryTC,
  TradeUnionEventGiftList,
  TradeUnionSettlementB07Report,
  TradeUnionSettlementItemB07,
  TradeUnionCashCountSheet,
  UnionSignerSettings
} from '../types/accounting';
import { numberToVietnameseWords } from './documentGenerator';
import { formatNumber } from '../utils/formatters';
import XLSX from 'xlsx-js-style';

export function getTradeUnionCategoryLabel(category: TradeUnionCategory): string {
  switch (category) {
    case 'KPCĐ_2_PERCENT':
      return 'Kinh phí công đoàn 2% (DN trích nộp)';
    case 'DOAN_PHI_1_PERCENT':
      return 'Đoàn phí công đoàn (Đoàn viên đóng)';
    case 'KINH_PHI_CAP_TREN':
      return 'Kinh phí CĐ cấp trên cấp về / Rút NH';
    case 'HO_TRO_KHAC':
      return 'Hỗ trợ từ Doanh nghiệp & Tài trợ';
    case 'THAM_HOI_OM_DAU':
      return 'Chi thăm hỏi ốm đau, hiếu hỉ, thai sản, sinh nhật';
    case 'QUA_LE_TET':
      return 'Chi quà Tết, 8/3, 20/10, Trung thu, 2/9, 30/4';
    case 'HOAT_DONG_PHONG_TRAO':
      return 'Chi văn nghệ, thể thao, hội thao, du lịch';
    case 'KHEN_THUONG':
      return 'Chi khen thưởng đoàn viên xuất sắc';
    case 'NOP_CAP_TREN_25':
      return 'Nộp KPCĐ/Đoàn phí lên CĐ cấp trên';
    case 'PHU_CAP_CAN_BO_CD':
      return 'Phụ cấp cán bộ công đoàn & quản lý CĐ';
    case 'CHI_KHAC':
    default:
      return 'Chi văn phòng phẩm, hoạt động khác';
  }
}

export function getTradeUnionAccounts(
  category: TradeUnionCategory,
  voucherType: TradeUnionVoucherType,
  paymentMethod: 'CASH' | 'BANK' = 'CASH'
): { debitAcc: string; creditAcc: string } {
  const fundAcc = paymentMethod === 'BANK' ? '1121' : '1111';

  if (voucherType === 'UNION_RECEIPT') {
    switch (category) {
      case 'KPCĐ_2_PERCENT':
      case 'DOAN_PHI_1_PERCENT':
        return { debitAcc: fundAcc, creditAcc: '3382' };
      case 'KINH_PHI_CAP_TREN':
      case 'HO_TRO_KHAC':
      default:
        return { debitAcc: fundAcc, creditAcc: '511' };
    }
  } else {
    switch (category) {
      case 'NOP_CAP_TREN_25':
        return { debitAcc: '3382', creditAcc: fundAcc };
      case 'THAM_HOI_OM_DAU':
      case 'QUA_LE_TET':
      case 'HOAT_DONG_PHONG_TRAO':
      case 'KHEN_THUONG':
      case 'PHU_CAP_CAN_BO_CD':
      case 'CHI_KHAC':
      default:
        return { debitAcc: '6422', creditAcc: fundAcc };
    }
  }
}

function nfc(str: string | undefined | null): string {
  if (!str) return '';
  return String(str).normalize('NFC').trim();
}

export function excelSerialDateToYYYYMMDD(serial: any): string {
  if (!serial) return new Date().toISOString().slice(0, 10);
  if (typeof serial === 'string') {
    const s = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  const num = Number(serial);
  if (!isNaN(num) && num > 30000 && num < 70000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function calculateTradeUnionContribution(
  payrollGrossInsurance: number,
  unionMembersCount: number = 0,
  avgMemberSalary: number = 0,
  doanPhiRate: number = 0.005,
  kpcdRetainedRate: number = 0.75,
  doanPhiRetainedRate: number = 0.70
) {
  const kpcdTotal = Math.round(payrollGrossInsurance * 0.02);
  const kpcdRetained = Math.round(kpcdTotal * kpcdRetainedRate);
  const kpcdPaySuperior = kpcdTotal - kpcdRetained;

  const baseDoanPhiPerPerson = Math.min(Math.round(avgMemberSalary * doanPhiRate), 234000);
  const doanPhiTotal = unionMembersCount * baseDoanPhiPerPerson;
  const doanPhiRetained = Math.round(doanPhiTotal * doanPhiRetainedRate);
  const doanPhiPaySuperior = doanPhiTotal - doanPhiRetained;

  const totalUnionBudget = kpcdRetained + doanPhiRetained;
  const totalPayableSuperior = kpcdPaySuperior + doanPhiPaySuperior;

  return {
    payrollGrossInsurance,
    unionMembersCount,
    kpcdTotal,
    kpcdRetained,
    kpcdPaySuperior,
    doanPhiTotal,
    doanPhiRetained,
    doanPhiPaySuperior,
    totalUnionBudget,
    totalPayableSuperior,
  };
}

export function calculateTradeUnionSummary(
  transactions: TradeUnionTransaction[],
  openingCash: number = 0,
  openingBank: number = 0
) {
  let totalReceipts = 0;
  let totalPayments = 0;
  let cashBalance = openingCash;
  let bankBalance = openingBank;

  const receiptsByCategory: Partial<Record<TradeUnionCategory, number>> = {};
  const paymentsByCategory: Partial<Record<TradeUnionCategory, number>> = {};

  transactions.forEach(tx => {
    if (tx.voucherType === 'UNION_RECEIPT') {
      totalReceipts += tx.amount;
      receiptsByCategory[tx.category] = (receiptsByCategory[tx.category] || 0) + tx.amount;
      if (tx.paymentMethod === 'BANK') bankBalance += tx.amount;
      else cashBalance += tx.amount;
    } else {
      totalPayments += tx.amount;
      paymentsByCategory[tx.category] = (paymentsByCategory[tx.category] || 0) + tx.amount;
      if (tx.paymentMethod === 'BANK') bankBalance -= tx.amount;
      else cashBalance -= tx.amount;
    }
  });

  const netBalance = totalReceipts - totalPayments;

  return {
    totalReceipts,
    totalPayments,
    netBalance,
    cashBalance,
    bankBalance,
    openingCash,
    openingBank,
    receiptCount: transactions.filter(t => t.voucherType === 'UNION_RECEIPT').length,
    paymentCount: transactions.filter(t => t.voucherType === 'UNION_PAYMENT').length,
    receiptsByCategory,
    paymentsByCategory,
  };
}

// =========================================================================
// 1. PARSER FILE "Thu chi 2025.xls"
// =========================================================================

export function parseThuChiVoucherWorkbook(
  fileBuffer: ArrayBuffer | Buffer,
  clientId: string = 'cong-doan-cs-01',
  defaultYear: number = 2025
): TradeUnionTransaction[] {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const transactions: TradeUnionTransaction[] = [];
  const now = new Date().toISOString();

  // 1. Đọc sheet DATAchi
  const sheetChiName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'DATACHI') || 'DATAchi ';
  const wsChi = wb.Sheets[sheetChiName];
  if (wsChi) {
    const rawRows: any[][] = XLSX.utils.sheet_to_json(wsChi, { header: 1 });
    let currentMonth = 1;

    for (let r = 3; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      if (row[8] && !isNaN(Number(row[8]))) {
        currentMonth = Number(row[8]);
      }

      const no = Number(row[0]);
      const dateRaw = row[1];
      const voucherNo = String(row[2] || '').trim();
      const personName = String(row[3] || '').trim();
      const reason = String(row[4] || '').trim();
      const amount = Number(String(row[5] || 0).replace(/[^0-9.-]+/g, '')) || 0;

      if (isNaN(no) || amount <= 0 || !personName || !voucherNo.toUpperCase().startsWith('PC')) continue;

      let date = excelSerialDateToYYYYMMDD(dateRaw);
      if (!dateRaw || typeof dateRaw !== 'number') {
        date = `${defaultYear}-${String(currentMonth).padStart(2, '0')}-15`;
      }

      let category: TradeUnionCategory = 'THAM_HOI_OM_DAU';
      const rUp = reason.toUpperCase();
      if (rUp.includes('SINH NHẬT') || rUp.includes('ỐM ĐAU') || rUp.includes('HIẾU HỈ') || rUp.includes('THAI SẢN')) category = 'THAM_HOI_OM_DAU';
      else if (rUp.includes('QUÀ') || rUp.includes('TẾT') || rUp.includes('8/3') || rUp.includes('08/03') || rUp.includes('20/10') || rUp.includes('TRUNG THU') || rUp.includes('30/04') || rUp.includes('01/05') || rUp.includes('02/09')) category = 'QUA_LE_TET';
      else if (rUp.includes('VĂN NGHỆ') || rUp.includes('THỂ THAO') || rUp.includes('DU LỊCH') || rUp.includes('PHONG TRÀO')) category = 'HOAT_DONG_PHONG_TRAO';
      else if (rUp.includes('KHEN THƯỞNG')) category = 'KHEN_THUONG';
      else if (rUp.includes('PHỤ CẤP') || rUp.includes('CÁN BỘ')) category = 'PHU_CAP_CAN_BO_CD';
      else if (rUp.includes('NỘP') || rUp.includes('25%') || rUp.includes('CẤP TRÊN')) category = 'NOP_CAP_TREN_25';
      else category = 'CHI_KHAC';

      transactions.push({
        id: `pc-${defaultYear}-${voucherNo}-${no}`,
        clientId,
        voucherType: 'UNION_PAYMENT',
        voucherNo: voucherNo || `PC${defaultYear}/${String(no).padStart(2, '0')}`,
        date,
        category,
        personName: nfc(personName),
        department: 'Ban Chấp Hành CĐCS',
        reason: nfc(reason),
        amount,
        paymentMethod: 'CASH',
        attachedDocs: '01',
        notes: `Tháng ${currentMonth}/${defaultYear}`,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 2. Đọc sheet DATA Thu
  const sheetThuName = wb.SheetNames.find(s => s.trim().toUpperCase() === 'DATA THU') || 'DATA Thu';
  const wsThu = wb.Sheets[sheetThuName];
  if (wsThu) {
    const rawRows: any[][] = XLSX.utils.sheet_to_json(wsThu, { header: 1 });
    let currentMonth = 1;
    let currentYearDate = `${defaultYear}-01-01`;

    for (let r = 3; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      if (row[1] && typeof row[1] === 'number' && row[1] > 40000) {
        currentYearDate = excelSerialDateToYYYYMMDD(row[1]);
        const dObj = new Date(currentYearDate);
        if (!isNaN(dObj.getTime())) {
          currentMonth = dObj.getMonth() + 1;
        }
      }

      const no = Number(row[0]);
      const dayVal = Number(row[1]);
      const personName = String(row[2] || '').trim();
      const reason = String(row[3] || '').trim();
      const amount = Number(String(row[4] || 0).replace(/[^0-9.-]+/g, '')) || 0;
      const monthStr = String(row[7] || currentMonth);
      const voucherNo = String(row[8] || '').trim();

      if (isNaN(no) || amount <= 0 || !personName || !voucherNo.toUpperCase().startsWith('PT')) continue;

      let date = currentYearDate;
      if (!isNaN(dayVal) && dayVal >= 1 && dayVal <= 31) {
        const m = Number(monthStr) || currentMonth;
        date = `${defaultYear}-${String(m).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
      }

      let category: TradeUnionCategory = 'DOAN_PHI_1_PERCENT';
      if (reason.toUpperCase().includes('KPCĐ') || reason.toUpperCase().includes('2%')) category = 'KPCĐ_2_PERCENT';
      else if (reason.toUpperCase().includes('RÚT TIỀN') || reason.toUpperCase().includes('NGÂN HÀNG') || reason.toUpperCase().includes('CẤP TRÊN')) category = 'KINH_PHI_CAP_TREN';
      else if (reason.toUpperCase().includes('HỖ TRỢ') || reason.toUpperCase().includes('TÀI TRỢ')) category = 'HO_TRO_KHAC';

      transactions.push({
        id: `pt-${defaultYear}-${voucherNo}-${no}`,
        clientId,
        voucherType: 'UNION_RECEIPT',
        voucherNo: voucherNo || `PT${defaultYear}/${String(no).padStart(2, '0')}`,
        date,
        category,
        personName: nfc(personName),
        department: 'Ban Chấp Hành CĐCS',
        reason: nfc(reason),
        amount,
        paymentMethod: 'CASH',
        attachedDocs: '01',
        notes: `Tháng ${monthStr}/${defaultYear}`,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return transactions;
}

// =========================================================================
// 2. PARSER FILE "Phi cong doan 2026.xlsx"
// =========================================================================

export function parsePhiCongDoanWorkbook(
  fileBuffer: ArrayBuffer | Buffer,
  defaultYear: number = 2026
): {
  periods: TradeUnionContributionPeriod[];
  eventGifts: TradeUnionEventGiftList[];
} {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const periods: TradeUnionContributionPeriod[] = [];
  const eventGifts: TradeUnionEventGiftList[] = [];

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const sNameLower = sheetName.toLowerCase().trim();

    if (
      sNameLower.includes('tết') ||
      sNameLower.includes('tet') ||
      sNameLower.includes('8.3') ||
      sNameLower.includes('30-04') ||
      sNameLower.includes('02-09') ||
      sNameLower.includes('trung thu') ||
      sNameLower.includes('20.10')
    ) {
      const beneficiaries: Array<{ stt: number; fullName: string; department?: string; amount: number; signature?: string; notes?: string }> = [];
      let giftPerPerson = 0;

      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (row && row.some(cell => String(cell).toUpperCase().includes('STT') || String(cell).toUpperCase().includes('HỌ & TÊN') || String(cell).toUpperCase().includes('HỌ VÀ TÊN'))) {
          headerRowIndex = r;
          break;
        }
      }

      const startIdx = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;

      for (let r = startIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;
        const stt = Number(row[0]);
        const name = String(row[1] || '').trim();
        if (isNaN(stt) || !name || name.toUpperCase().includes('TỔNG CỘNG') || name.toUpperCase().includes('NGƯỜI LẬP')) continue;

        const amount = Number(String(row[2] || row[3] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        if (amount > 0 && giftPerPerson === 0) giftPerPerson = amount;

        beneficiaries.push({
          stt,
          fullName: nfc(name),
          department: row[3] && typeof row[3] === 'string' && isNaN(Number(row[3])) ? nfc(row[3]) : 'Đoàn viên CĐCS',
          amount: amount || giftPerPerson || 300000,
          notes: row[4] ? nfc(String(row[4])) : '',
        });
      }

      const totalAmount = beneficiaries.reduce((sum, b) => sum + b.amount, 0);

      eventGifts.push({
        eventKey: sheetName.replace(/\s+/g, '_').toLowerCase(),
        eventName: sheetName,
        year: defaultYear,
        giftPerPerson: giftPerPerson || 300000,
        totalPersons: beneficiaries.length,
        totalAmount,
        beneficiaries,
      });
    } else if (
      /^\d{5,6}$/.test(sheetName) ||
      sheetName.toUpperCase().startsWith('Q') ||
      sheetName.trim().toUpperCase() === 'TC'
    ) {
      const members: TradeUnionMemberContribution[] = [];
      let startRow = 6;
      for (let r = 0; r < Math.min(10, rawRows.length); r++) {
        const row = rawRows[r];
        if (row && row.some(cell => String(cell).toUpperCase().includes('STT'))) {
          startRow = r + 2;
          break;
        }
      }

      for (let r = startRow; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;
        const stt = Number(row[0]);
        const fullName = String(row[1] || '').trim();
        if (isNaN(stt) || !fullName || fullName.toUpperCase().includes('TỔNG CỘNG') || fullName.toUpperCase().includes('NGƯỜI LẬP')) continue;

        const insuranceSalary = Number(String(row[2] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const kpcdRetainedAmount = Number(String(row[3] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const kpcdSuperiorAmount = Number(String(row[4] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const doanPhiRetainedAmount = Number(String(row[5] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const doanPhiSuperiorAmount = Number(String(row[6] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const totalAmount = Number(String(row[7] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const notes = row[8] ? nfc(String(row[8])) : '';

        members.push({
          stt,
          fullName: nfc(fullName),
          insuranceSalary,
          kpcdRetainedAmount: kpcdRetainedAmount || Math.round(insuranceSalary * 0.02 * 0.75),
          kpcdSuperiorAmount: kpcdSuperiorAmount || Math.round(insuranceSalary * 0.02 * 0.25),
          doanPhiRetainedAmount: doanPhiRetainedAmount || Math.round(insuranceSalary * 0.005 * 0.7),
          doanPhiSuperiorAmount: doanPhiSuperiorAmount || Math.round(insuranceSalary * 0.005 * 0.3),
          totalAmount: totalAmount || (kpcdRetainedAmount + kpcdSuperiorAmount + doanPhiRetainedAmount + doanPhiSuperiorAmount),
          notes,
        });
      }

      const totalInsuranceSalary = members.reduce((sum, m) => sum + m.insuranceSalary, 0);
      const totalKpcdRetained = members.reduce((sum, m) => sum + m.kpcdRetainedAmount, 0);
      const totalKpcdSuperior = members.reduce((sum, m) => sum + m.kpcdSuperiorAmount, 0);
      const totalDoanPhiRetained = members.reduce((sum, m) => sum + m.doanPhiRetainedAmount, 0);
      const totalDoanPhiSuperior = members.reduce((sum, m) => sum + m.doanPhiSuperiorAmount, 0);
      const totalKpcd = totalKpcdRetained + totalKpcdSuperior;
      const totalDoanPhi = totalDoanPhiRetained + totalDoanPhiSuperior;
      const netPayableToSuperior = totalKpcdSuperior + totalDoanPhiSuperior;

      let periodLabel = sheetName;
      if (sheetName.toUpperCase() === 'TC') periodLabel = `Tổng Hợp Năm ${defaultYear}`;
      else if (sheetName.toUpperCase().startsWith('Q')) periodLabel = `Quý ${sheetName.replace(/[^0-9]/g, '')}/${defaultYear}`;
      else if (/^\d{5,6}$/.test(sheetName)) {
        const m = sheetName.slice(0, 2).replace(/^0+/, '');
        periodLabel = `Tháng ${m.padStart(2, '0')}/${defaultYear}`;
      }

      periods.push({
        periodKey: sheetName,
        periodLabel,
        year: defaultYear,
        totalEmployees: members.length,
        totalMembers: members.length,
        totalInsuranceSalary,
        totalKpcd,
        totalKpcdRetained,
        totalKpcdSuperior,
        totalDoanPhi,
        totalDoanPhiRetained,
        totalDoanPhiSuperior,
        netPayableToSuperior,
        members,
      });
    }
  });

  return { periods, eventGifts };
}

// =========================================================================
// 3. PARSER FILE "BAO CAO QUYET TOAN NAM 2026.xlsx"
// =========================================================================

export function parseBaoCaoQuyetToanWorkbook(
  fileBuffer: ArrayBuffer | Buffer,
  clientId: string = 'cong-doan-cs-01'
): {
  transactions: TradeUnionTransaction[];
  settlementReports: TradeUnionSettlementB07Report[];
  cashCountSheets: TradeUnionCashCountSheet[];
} {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const transactions: TradeUnionTransaction[] = [];
  const settlementReports: TradeUnionSettlementB07Report[] = [];
  const cashCountSheets: TradeUnionCashCountSheet[] = [];

  const now = new Date().toISOString();

  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const sNameNorm = sheetName.toUpperCase().trim();

    // -------------------------------------------------------------
    // 1. XỬ LÝ SỔ QUỸ TIỀN MẶT (S11-H)
    // -------------------------------------------------------------
    if (sNameNorm.includes('SỔ TM') || sNameNorm.includes('SO TM') || sNameNorm.includes('TIỀN MẶT')) {
      let soDuDauKyRow = -1;
      let reasonCol = 4;
      let dateCol = 0;
      let vThuCol = 2;
      let vChiCol = 3;
      let thuAmountCol = 5;
      let chiAmountCol = 6;

      // Quét tìm dòng "Số dư đầu kỳ" & xác định cấu trúc cột
      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const row = rawRows[r];
        if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').toUpperCase().trim();
          if (val === 'DIỄN GIẢI' || val === 'NỘI DUNG') {
            reasonCol = c;
            if (reasonCol === 4) {
              vThuCol = 2;
              vChiCol = 3;
              thuAmountCol = 5;
              chiAmountCol = 6;
            } else if (reasonCol === 3) {
              vThuCol = 1;
              vChiCol = 2;
              thuAmountCol = 4;
              chiAmountCol = 5;
            }
          }
        }
        if (row.some(c => String(c).includes('Số dư đầu kỳ'))) {
          soDuDauKyRow = r;
          break;
        }
      }

      const startIdx = soDuDauKyRow !== -1 ? soDuDauKyRow + 1 : 10;
      let countThu = 0;
      let countChi = 0;

      for (let r = startIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const reason = String(row[reasonCol] || '').trim();
        const rUp = reason.toUpperCase();
        if (
          !reason ||
          rUp.includes('SỐ DƯ ĐẦU KỲ') ||
          rUp.includes('CỘNG PHÁT SINH') ||
          rUp.includes('SỐ DƯ CUỐI KỲ') ||
          rUp.includes('CỘNG :') ||
          rUp.includes('TỔNG CỘNG') ||
          rUp.includes('NGƯỜI GHI SỔ') ||
          rUp.includes('TM. BAN CHẤP HÀNH') ||
          rUp.includes('PHỤ TRÁCH KẾ TOÁN') ||
          rUp.includes('CHỦ TỊCH')
        ) {
          continue;
        }

        const dateRaw = row[dateCol] || row[dateCol + 1];
        const date = excelSerialDateToYYYYMMDD(dateRaw);
        const year = date.slice(0, 4);

        const vThu = String(row[vThuCol] || '').trim();
        const vChi = String(row[vChiCol] || '').trim();

        const rawThu = row[thuAmountCol];
        const rawChi = row[chiAmountCol];

        const thuAmount = (rawThu !== undefined && rawThu !== null && String(rawThu).trim() !== '')
          ? Number(String(rawThu).replace(/[^0-9.-]+/g, '')) || 0
          : 0;
        const chiAmount = (rawChi !== undefined && rawChi !== null && String(rawChi).trim() !== '')
          ? Number(String(rawChi).replace(/[^0-9.-]+/g, '')) || 0
          : 0;

        // Nghiệp vụ THU TIỀN MẶT
        if (thuAmount > 0) {
          countThu++;
          const voucherNo = vThu && (vThu.toUpperCase().startsWith('PT') || vThu.toUpperCase().startsWith('P-'))
            ? vThu
            : `PT${year}/${String(countThu).padStart(2, '0')}`;

          let category: TradeUnionCategory = 'DOAN_PHI_1_PERCENT';
          if (rUp.includes('KPCĐ') || rUp.includes('2%')) category = 'KPCĐ_2_PERCENT';
          else if (rUp.includes('CẤP TRÊN') || rUp.includes('KINH PHÍ CẤP') || rUp.includes('RÚT TIỀN')) category = 'KINH_PHI_CAP_TREN';
          else if (rUp.includes('HỖ TRỢ') || rUp.includes('TÀI TRỢ') || rUp.includes('KHEN THƯỞNG')) category = 'HO_TRO_KHAC';

          let personName = 'Đoàn viên công đoàn';
          if (rUp.includes('RÚT TIỀN')) personName = 'Thủ quỹ rút từ NH';
          else if (reason.includes('đoàn viên')) {
            const splitted = reason.split(/đoàn viên/i)[1]?.split(/[\(\,\.]/)[0]?.trim();
            if (splitted) personName = splitted;
          }

          transactions.push({
            id: `tm-thu-${year}-${voucherNo.replace(/[^a-zA-Z0-9]/g, '_')}-${countThu}`,
            clientId,
            voucherType: 'UNION_RECEIPT',
            voucherNo,
            date,
            category,
            personName: nfc(personName),
            department: 'CĐCS',
            reason: nfc(reason),
            amount: thuAmount,
            paymentMethod: 'CASH',
            attachedDocs: '01',
            notes: `Trích xuất từ ${sheetName}`,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Nghiệp vụ CHI TIỀN MẶT
        if (chiAmount > 0) {
          countChi++;
          const voucherNo = vChi && (vChi.toUpperCase().startsWith('PC') || vChi.toUpperCase().startsWith('P-'))
            ? vChi
            : `PC${year}/${String(countChi).padStart(2, '0')}`;

          let category: TradeUnionCategory = 'THAM_HOI_OM_DAU';
          if (rUp.includes('SINH NHẬT') || rUp.includes('ỐM ĐAU') || rUp.includes('HIẾU HỈ') || rUp.includes('THAI SẢN') || rUp.includes('THĂM HỎI') || rUp.includes('SINH CON')) category = 'THAM_HOI_OM_DAU';
          else if (rUp.includes('TẾT') || rUp.includes('8/3') || rUp.includes('08/03') || rUp.includes('20/10') || rUp.includes('TRUNG THU') || rUp.includes('2/9') || rUp.includes('02/09') || rUp.includes('30/4') || rUp.includes('01/05') || rUp.includes('QUÀ')) category = 'QUA_LE_TET';
          else if (rUp.includes('VĂN NGHỆ') || rUp.includes('THỂ THAO') || rUp.includes('PHONG TRÀO') || rUp.includes('DU LỊCH')) category = 'HOAT_DONG_PHONG_TRAO';
          else if (rUp.includes('KHEN THƯỞNG')) category = 'KHEN_THUONG';
          else if (rUp.includes('PHỤ CẤP') || rUp.includes('CÁN BỘ')) category = 'PHU_CAP_CAN_BO_CD';
          else if (rUp.includes('NỘP') || rUp.includes('25%') || rUp.includes('CẤP TRÊN')) category = 'NOP_CAP_TREN_25';
          else category = 'CHI_KHAC';

          let personName = 'Người nhận tiền';
          if (reason.includes('đoàn viên')) {
            const splitted = reason.split(/đoàn viên/i)[1]?.split(/[\(\,\.]/)[0]?.trim();
            if (splitted) personName = splitted;
          }

          transactions.push({
            id: `tm-chi-${year}-${voucherNo.replace(/[^a-zA-Z0-9]/g, '_')}-${countChi}`,
            clientId,
            voucherType: 'UNION_PAYMENT',
            voucherNo,
            date,
            category,
            personName: nfc(personName),
            department: 'CĐCS',
            reason: nfc(reason),
            amount: chiAmount,
            paymentMethod: 'CASH',
            attachedDocs: '01',
            notes: `Trích xuất từ ${sheetName}`,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 2. XỬ LÝ SỔ TIỀN GỬI NGÂN HÀNG (S12-H)
    // -------------------------------------------------------------
    else if (sNameNorm.includes('SỔ NH') || sNameNorm.includes('SO NH') || sNameNorm.includes('NGÂN HÀNG')) {
      let soDuDauKyRow = -1;
      const vNoCol = 1;
      const dateCol = 2;
      const reasonCol = 3;
      const thuAmountCol = 6;
      const chiAmountCol = 7;

      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const row = rawRows[r];
        if (row && row.some(c => String(c).includes('Số dư đầu kỳ'))) {
          soDuDauKyRow = r;
          break;
        }
      }

      const startIdx = soDuDauKyRow !== -1 ? soDuDauKyRow + 1 : 13;
      let countThu = 0;
      let countChi = 0;

      for (let r = startIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const reason = String(row[reasonCol] || '').trim();
        const rUp = reason.toUpperCase();
        if (
          !reason ||
          rUp.includes('SỐ DƯ ĐẦU KỲ') ||
          rUp.includes('CỘNG PHÁT SINH') ||
          rUp.includes('SỐ DƯ CUỐI KỲ') ||
          rUp.includes('CỘNG :') ||
          rUp.includes('TỔNG CỘNG') ||
          rUp.includes('NGƯỜI LẬP') ||
          rUp.includes('PHỤ TRÁCH KẾ TOÁN') ||
          rUp.includes('CHỦ TÀI KHOẢN') ||
          rUp.includes('SỔ NÀY CÓ') ||
          rUp.includes('NGÀY MỞ SỔ')
        ) {
          continue;
        }

        const dateRaw = row[dateCol] || row[0];
        const date = excelSerialDateToYYYYMMDD(dateRaw);
        const year = date.slice(0, 4);
        const vNo = String(row[vNoCol] || '').trim();

        const rawThu = row[thuAmountCol];
        const rawChi = row[chiAmountCol];

        const thuAmount = (rawThu !== undefined && rawThu !== null && String(rawThu).trim() !== '')
          ? Number(String(rawThu).replace(/[^0-9.-]+/g, '')) || 0
          : 0;
        const chiAmount = (rawChi !== undefined && rawChi !== null && String(rawChi).trim() !== '')
          ? Number(String(rawChi).replace(/[^0-9.-]+/g, '')) || 0
          : 0;

        // Nghiệp vụ THU / TIỀN VÀO NGÂN HÀNG (Giấy Báo Có)
        if (thuAmount > 0) {
          countThu++;
          const voucherNo = vNo || `BC${year}/${String(countThu).padStart(2, '0')}`;
          let category: TradeUnionCategory = 'KINH_PHI_CAP_TREN';
          if (rUp.includes('LÃI') || rUp.includes('TIỀN GỬI')) category = 'HO_TRO_KHAC';
          else if (rUp.includes('KPCĐ') || rUp.includes('75%')) category = 'KINH_PHI_CAP_TREN';
          else if (rUp.includes('NỘP TIỀN MẶT')) category = 'HO_TRO_KHAC';

          transactions.push({
            id: `nh-thu-${year}-${voucherNo.replace(/[^a-zA-Z0-9]/g, '_')}-${countThu}`,
            clientId,
            voucherType: 'UNION_RECEIPT',
            voucherNo,
            date,
            category,
            personName: 'Ngân hàng TMCP / Cấp trên cấp',
            department: 'Ngân hàng',
            reason: nfc(reason),
            amount: thuAmount,
            paymentMethod: 'BANK',
            attachedDocs: '01 Giấy báo Có',
            notes: `Trích xuất từ ${sheetName}`,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Nghiệp vụ CHI / TIỀN RA TỪ NGÂN HÀNG (Ủy Nhiệm Chi / Rút tiền)
        if (chiAmount > 0) {
          countChi++;
          const voucherNo = vNo || `UNC${year}/${String(countChi).padStart(2, '0')}`;
          let category: TradeUnionCategory = 'CHI_KHAC';
          if (rUp.includes('NỘP') && (rUp.includes('ĐPCĐ') || rUp.includes('KPCĐ') || rUp.includes('CẤP TRÊN'))) {
            category = 'NOP_CAP_TREN_25';
          } else if (rUp.includes('RÚT TIỀN')) {
            category = 'CHI_KHAC';
          } else if (rUp.includes('PHÍ DỊCH VỤ') || rUp.includes('VAT')) {
            category = 'CHI_KHAC';
          }

          transactions.push({
            id: `nh-chi-${year}-${voucherNo.replace(/[^a-zA-Z0-9]/g, '_')}-${countChi}`,
            clientId,
            voucherType: 'UNION_PAYMENT',
            voucherNo,
            date,
            category,
            personName: rUp.includes('RÚT TIỀN') ? 'Thủ quỹ rút nhập quỹ TM' : 'Ngân hàng / Liên đoàn',
            department: 'Ngân hàng',
            reason: nfc(reason),
            amount: chiAmount,
            paymentMethod: 'BANK',
            attachedDocs: '01 Ủy nhiệm chi',
            notes: `Trích xuất từ ${sheetName}`,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 3. XỬ LÝ BÁO CÁO QUYẾT TOÁN THU CHI (B07-TLĐ)
    // -------------------------------------------------------------
    else if (sNameNorm.includes('BCQT') || sNameNorm.includes('QUYẾT TOÁN')) {
      const items: TradeUnionSettlementItemB07[] = [];
      let totalEmployeesKpcd = 0;
      let salaryFundKpcd = 0;
      let totalMembers = 0;
      let salaryFundDoanPhi = 0;

      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;
        const rowText = row.map(c => String(c)).join(' ');

        if (rowText.includes('Số lao động Đóng KPCĐ')) {
          const numMatch = rowText.match(/(\d+)\s*người/);
          if (numMatch) totalEmployeesKpcd = Number(numMatch[1]);
          const salaryMatch = row.find(c => typeof c === 'number' && c > 1000000);
          if (salaryMatch) salaryFundKpcd = Number(salaryMatch);
        }
        if (rowText.includes('Số đoàn viên')) {
          const numMatch = rowText.match(/(\d+)\s*người/);
          if (numMatch) totalMembers = Number(numMatch[1]);
          const salaryMatch = row.find(c => typeof c === 'number' && c > 1000000);
          if (salaryMatch) salaryFundDoanPhi = Number(salaryMatch);
        }

        const stt = String(row[0] || '').trim();
        const content = String(row[1] || '').trim();
        const code = Number(row[2]);
        const settledAmount = Number(String(row[4] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const plannedAmount = Number(String(row[3] || 0).replace(/[^0-9.-]+/g, '')) || 0;

        if (content && !isNaN(code)) {
          items.push({
            stt,
            content: nfc(content),
            code,
            plannedAmount: plannedAmount || undefined,
            settledAmount,
          });
        }
      }

      settlementReports.push({
        title: 'BÁO CÁO QUYẾT TOÁN THU, CHI TÀI CHÍNH CÔNG ĐOÀN',
        periodText: sheetName,
        clientName: 'CÔNG ĐOÀN CƠ SỞ CTY TNHH TKXD & TM HƯNG PHÁT',
        clientAddress: '153G Lũy Bán Bích, Phường Phú Thạnh, TP. HCM',
        basicIndicators: {
          totalEmployeesKpcd: totalEmployeesKpcd || 48,
          salaryFundKpcd: salaryFundKpcd || 264220000,
          totalMembers: totalMembers || 48,
          salaryFundDoanPhi: salaryFundDoanPhi || 264220000,
        },
        items,
        closingCash: 0,
        closingBank: 0,
      });
    }

    // -------------------------------------------------------------
    // 4. XỬ LÝ BIÊN BẢN KIỂM KÊ TIỀN MẶT (C34-HD)
    // -------------------------------------------------------------
    else if (sNameNorm.includes('KIEM KE') || sNameNorm.includes('KIỂM KÊ')) {
      const denominations: Array<{ faceValue: number; count: number; total: number }> = [];
      let totalActual = 0;
      let bookBalance = 0;

      for (let r = 8; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;
        const text = String(row[1] || '');

        if (String(row[0] || '').includes('I') && text.includes('theo')) {
          bookBalance = Number(String(row[3] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        }

        const faceValMatch = text.match(/([\d\.]+)\s*đ/);
        const faceVal = faceValMatch ? Number(faceValMatch[1].replace(/\./g, '')) : Number(String(row[1] || 0).replace(/[^0-9.-]+/g, ''));
        const count = Number(String(row[2] || 0).replace(/[^0-9.-]+/g, ''));
        const total = Number(String(row[3] || (faceVal * count)).replace(/[^0-9.-]+/g, ''));

        if (faceVal > 0 && count > 0) {
          denominations.push({ faceValue: faceVal, count, total: total || (faceVal * count) });
          totalActual += (total || (faceVal * count));
        }
      }

      cashCountSheets.push({
        year: sNameNorm.includes('2026') ? 2026 : 2025,
        countDate: sNameNorm.includes('2026') ? '2026-06-30' : '2025-12-31',
        boardMembers: [
          { name: 'Ngô Thị Bích Ngọc', position: 'Chủ tịch CĐCS Trưởng Ban' },
          { name: 'Nguyễn Thị Cẩm Ly', position: 'Kế toán Ủy viên' },
          { name: 'Võ Thị Mộng Thúy', position: 'Thủ quỹ' },
        ],
        bookBalance: bookBalance || totalActual,
        actualBalance: totalActual,
        difference: (bookBalance || totalActual) - totalActual,
        denominations,
      });
    }
  });

  return { transactions, settlementReports, cashCountSheets };
}

// =========================================================================
// 4. SMART MULTI-FILE DETECTOR
// =========================================================================

export function detectAndParseUnionExcel(
  fileBuffer: ArrayBuffer | Buffer,
  fileName: string,
  clientId: string = 'cong-doan-cs-01'
): {
  type: 'CONTRIBUTION_FILE' | 'SETTLEMENT_MASTER_FILE' | 'VOUCHERS_JOURNAL_FILE' | 'FLAT_TEMPLATE';
  transactions: TradeUnionTransaction[];
  periods?: TradeUnionContributionPeriod[];
  eventGifts?: TradeUnionEventGiftList[];
  settlementReports?: TradeUnionSettlementB07Report[];
  cashCountSheets?: TradeUnionCashCountSheet[];
} {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames.map(s => s.trim().toUpperCase());

  if (sheetNames.includes('DATACHI') || sheetNames.includes('DATA THU')) {
    const transactions = parseThuChiVoucherWorkbook(fileBuffer, clientId);
    return {
      type: 'VOUCHERS_JOURNAL_FILE',
      transactions,
    };
  }

  if (sheetNames.some(s => s.startsWith('BCQT') || s.startsWith('SỔ TM') || s.startsWith('SO TM') || s.startsWith('SỔ NH'))) {
    const { transactions, settlementReports, cashCountSheets } = parseBaoCaoQuyetToanWorkbook(fileBuffer, clientId);
    return {
      type: 'SETTLEMENT_MASTER_FILE',
      transactions,
      settlementReports,
      cashCountSheets,
    };
  }

  if (sheetNames.includes('TC') || sheetNames.some(s => /^\d{5,6}$/.test(s) || s.startsWith('Q1') || s.includes('TẾT') || s.includes('8.3'))) {
    const { periods, eventGifts } = parsePhiCongDoanWorkbook(fileBuffer);
    return {
      type: 'CONTRIBUTION_FILE',
      transactions: [],
      periods,
      eventGifts,
    };
  }

  return {
    type: 'FLAT_TEMPLATE',
    transactions: [],
  };
}

export function syncContributionPeriodToTransactions(
  period: TradeUnionContributionPeriod,
  clientId: string
): TradeUnionTransaction[] {
  const now = new Date().toISOString();
  const txs: TradeUnionTransaction[] = [];
  const year = period.year;

  let dateStr = `${year}-03-31`;
  if (/^\d{5,6}$/.test(period.periodKey)) {
    const m = Number(period.periodKey.slice(0, 2));
    const lastDay = new Date(year, m, 0).getDate();
    dateStr = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  if (period.totalDoanPhi > 0) {
    txs.push({
      id: `sync-dp-${period.periodKey}-${Date.now()}`,
      clientId,
      voucherType: 'UNION_RECEIPT',
      voucherNo: `PT-ĐP-${period.periodKey}`,
      date: dateStr,
      category: 'DOAN_PHI_1_PERCENT',
      personName: `Đại diện ${period.totalMembers} đoàn viên`,
      department: 'Ban Chấp Hành CĐCS',
      reason: `Thu đoàn phí công đoàn (${period.periodLabel})`,
      amount: period.totalDoanPhiRetained || period.totalDoanPhi,
      paymentMethod: 'CASH',
      attachedDocs: `Bảng trích nộp ${period.periodLabel}`,
      notes: `Tự động sinh từ bảng trích nộp ${period.periodKey} (70% CĐCS giữ)`,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (period.netPayableToSuperior > 0) {
    txs.push({
      id: `sync-superior-${period.periodKey}-${Date.now()}`,
      clientId,
      voucherType: 'UNION_PAYMENT',
      voucherNo: `UNC-LĐ-${period.periodKey}`,
      date: dateStr,
      category: 'NOP_CAP_TREN_25',
      personName: 'Liên đoàn Lao động Quận/Huyện',
      department: 'Kế toán CĐCS',
      reason: `Nộp KPCĐ (25%) và Đoàn phí (30%) lên cấp trên (${period.periodLabel})`,
      amount: period.netPayableToSuperior,
      paymentMethod: 'BANK',
      attachedDocs: 'Giấy nộp tiền LĐLĐ',
      notes: `Tự động sinh từ bảng trích nộp ${period.periodKey}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  return txs;
}

export function syncEventGiftToTransaction(
  eventGift: TradeUnionEventGiftList,
  clientId: string
): TradeUnionTransaction {
  const now = new Date().toISOString();
  return {
    id: `sync-gift-${eventGift.eventKey}-${Date.now()}`,
    clientId,
    voucherType: 'UNION_PAYMENT',
    voucherNo: `PC-QUÀ-${eventGift.eventKey.toUpperCase().slice(0, 10)}`,
    date: `${eventGift.year}-01-01`,
    category: 'QUA_LE_TET',
    personName: `Đại diện ${eventGift.totalPersons} đoàn viên`,
    department: 'Ban Chấp Hành CĐCS',
    reason: `Chi tiền ${eventGift.eventName} (${eventGift.totalPersons} người x ${eventGift.giftPerPerson.toLocaleString('vi-VN')} đ)`,
    amount: eventGift.totalAmount,
    paymentMethod: 'CASH',
    attachedDocs: `Danh sách ký nhận quà ${eventGift.eventName}`,
    notes: `Tự động sinh từ danh sách sự kiện ${eventGift.eventName}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function computeSettlementReportB07(
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number,
  basicInfo?: {
    totalEmployeesKpcd: number;
    salaryFundKpcd: number;
    totalMembers: number;
    salaryFundDoanPhi: number;
    fullTimeCadres?: number;
  }
): TradeUnionSettlementB07Report {
  const yearTxs = transactions.filter(t => {
    const tYear = new Date(t.date).getFullYear();
    return tYear === year;
  });

  const summary = calculateTradeUnionSummary(yearTxs);

  const doanPhiThu = summary.receiptsByCategory['DOAN_PHI_1_PERCENT'] || 0;
  const kpcdThu = summary.receiptsByCategory['KPCĐ_2_PERCENT'] || 0;
  const capTrenCap = summary.receiptsByCategory['KINH_PHI_CAP_TREN'] || 0;
  const hoTroKhac = summary.receiptsByCategory['HO_TRO_KHAC'] || 0;
  const totalThu = summary.totalReceipts;

  const chiPhongTrao = summary.paymentsByCategory['HOAT_DONG_PHONG_TRAO'] || 0;
  const chiThamHoi = summary.paymentsByCategory['THAM_HOI_OM_DAU'] || 0;
  const chiQuaLeTet = summary.paymentsByCategory['QUA_LE_TET'] || 0;
  const chiKhenThuong = summary.paymentsByCategory['KHEN_THUONG'] || 0;
  const chiPhuCap = summary.paymentsByCategory['PHU_CAP_CAN_BO_CD'] || 0;
  const chiNopCapTren = summary.paymentsByCategory['NOP_CAP_TREN_25'] || 0;
  const chiKhac = summary.paymentsByCategory['CHI_KHAC'] || 0;
  const totalChi = summary.totalPayments;

  const items: TradeUnionSettlementItemB07[] = [
    { stt: 'I', content: 'TÍCH LŨY TÀI CHÍNH ĐẦU KỲ', code: 10, settledAmount: 0 },
    { stt: 'II', content: 'PHẦN THU', code: 20, settledAmount: totalThu },
    { stt: '2.1', content: 'Đoàn phí công đoàn', code: 22, settledAmount: doanPhiThu },
    { stt: '2.2', content: 'Kinh phí công đoàn', code: 23, settledAmount: kpcdThu },
    { stt: '2.3', content: 'Thu tài chính công đoàn cấp trên cấp', code: 24, settledAmount: capTrenCap },
    { stt: '2.4', content: 'Thu tài chính công đoàn khác', code: 28, settledAmount: hoTroKhac },
    { stt: 'III', content: 'PHẦN CHI', code: 30, settledAmount: totalChi },
    { stt: '3.1', content: 'Chi trực tiếp chăm lo, bảo vệ đoàn viên (thăm hỏi, quà lễ tết)', code: 31, settledAmount: chiThamHoi + chiQuaLeTet },
    { stt: '3.2', content: 'Chi tuyên truyền, hoạt động phong trào văn hóa thể thao', code: 32, settledAmount: chiPhongTrao },
    { stt: '3.3', content: 'Chi phụ cấp cán bộ công đoàn & quản lý CĐ', code: 33, settledAmount: chiPhuCap },
    { stt: '3.4', content: 'Chi khen thưởng đoàn viên', code: 34, settledAmount: chiKhenThuong },
    { stt: '3.5', content: 'Chi nộp nghĩa vụ tài chính lên Công đoàn cấp trên', code: 38, settledAmount: chiNopCapTren },
    { stt: '3.6', content: 'Chi khác', code: 40, settledAmount: chiKhac },
    { stt: 'IV', content: 'TÍCH LŨY TÀI CHÍNH CUỐI KỲ (Tồn quỹ)', code: 50, settledAmount: summary.netBalance },
  ];

  return {
    title: 'BÁO CÁO QUYẾT TOÁN THU, CHI TÀI CHÍNH CÔNG ĐOÀN',
    periodText: `Năm ${year}`,
    clientName: client?.name || 'CÔNG ĐOÀN CƠ SỞ',
    clientAddress: client?.address || '',
    basicIndicators: basicInfo || {
      totalEmployeesKpcd: 15,
      salaryFundKpcd: 100000000,
      totalMembers: 15,
      salaryFundDoanPhi: 100000000,
      fullTimeCadres: 0,
    },
    items,
    closingCash: summary.cashBalance,
    closingBank: summary.bankBalance,
  };
}

// =========================================================================
// 5. BỘ SINH MẪU IN HTML CHUẨN IN ẤN (C40-BB / C41-BB)
// =========================================================================

export function generateUnionVoucherHTML(
  tx: TradeUnionTransaction,
  client: Client | null,
  signers?: UnionSignerSettings | null
): string {
  const isReceipt = tx.voucherType === 'UNION_RECEIPT';
  const voucherTitle = isReceipt ? 'PHIẾU THU CÔNG ĐOÀN' : 'PHIẾU CHI CÔNG ĐOÀN';
  const formCode = isReceipt ? 'Mẫu số: C40-BB' : 'Mẫu số: C41-BB';
  const accounts = getTradeUnionAccounts(tx.category, tx.voucherType, tx.paymentMethod);

  const unitTitle = signers?.unitTitle || 'CÔNG ĐOÀN CƠ SỞ';
  const clientName = signers?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const clientAddress = signers?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';

  const headTitle = signers?.headOfUnitTitle || 'THỦ TRƯỞNG ĐƠN VỊ';
  const headName = signers?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const accountantName = signers?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const preparerName = signers?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const treasurerName = signers?.treasurerName || 'Bùi Xuân Mai Thảo';

  const dateObj = new Date(tx.date);
  const day = isNaN(dateObj.getDate()) ? 15 : dateObj.getDate();
  const month = isNaN(dateObj.getMonth()) ? 1 : dateObj.getMonth() + 1;
  const year = isNaN(dateObj.getFullYear()) ? 2025 : dateObj.getFullYear();
  const dateString = `Ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;

  const amountInWords = numberToVietnameseWords(tx.amount);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${voucherTitle} - ${tx.voucherNo}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12.5pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 10px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .header-table td {
      vertical-align: top;
    }
    .union-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .company-title {
      font-weight: bold;
      font-size: 11pt;
    }
    .form-code {
      text-align: right;
      font-size: 10pt;
    }
    .title-section {
      text-align: center;
      margin: 15px 0 10px 0;
    }
    .main-title {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 0;
      text-transform: uppercase;
    }
    .voucher-date {
      font-style: italic;
      font-size: 11.5pt;
      margin-top: 4px;
    }
    .voucher-no {
      text-align: center;
      font-size: 11.5pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .acc-box {
      text-align: right;
      font-size: 11pt;
      margin-top: -35px;
      margin-bottom: 15px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .content-table td {
      padding: 5px 0;
      vertical-align: top;
    }
    .label {
      width: 220px;
      white-space: nowrap;
    }
    .amount-highlight {
      font-weight: bold;
      font-size: 13.5pt;
    }
    .receipt-ack {
      margin: 15px 0 5px 0;
      font-size: 11.5pt;
      padding-left: 20px;
    }
    .signatures-top-table, .signatures-bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .signatures-top-table td, .signatures-bottom-table td {
      text-align: center;
      vertical-align: top;
      font-size: 11pt;
    }
    .sign-role {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .sign-note {
      font-style: italic;
      font-size: 9.5pt;
      color: #333;
    }
    .sign-space {
      height: 55px;
    }
    .sign-name {
      font-weight: bold;
      font-size: 11.5pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="width: 60%;">
        <div class="union-title">${nfc(unitTitle)}</div>
        <div class="company-title">${nfc(clientName)}</div>
        <div style="font-size: 10pt;">Địa chỉ: ${nfc(clientAddress)}</div>
      </td>
      <td style="width: 40%;" class="form-code">
        <strong>${formCode}</strong><br>
        <em>(Ban hành kèm theo TT 107/2017/TT-BTC)</em><br>
        <span style="font-size: 9.5pt; color: #555;">Quyển số: 01/${year}</span>
      </td>
    </tr>
  </table>

  <div class="title-section">
    <h1 class="main-title">${voucherTitle}</h1>
    <div class="voucher-date">${dateString}</div>
    <div class="voucher-no">Số: ${nfc(tx.voucherNo)}</div>
  </div>

  <div class="acc-box">
    <div>Nợ: <strong>${accounts.debitAcc}</strong></div>
    <div>Có: <strong>${accounts.creditAcc}</strong></div>
  </div>

  <table class="content-table">
    <tr>
      <td class="label">${isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}</td>
      <td style="font-weight: bold; font-size: 13pt;">${nfc(tx.personName)}</td>
    </tr>
    <tr>
      <td class="label">Địa chỉ / Bộ phận:</td>
      <td>${nfc(tx.department || clientAddress)}</td>
    </tr>
    <tr>
      <td class="label">${isReceipt ? 'Lý do nộp:' : 'Nội dung chi:'}</td>
      <td>${nfc(tx.reason)}</td>
    </tr>
    <tr>
      <td class="label">Số tiền:</td>
      <td class="amount-highlight">${tx.amount.toLocaleString('vi-VN')} VNĐ</td>
    </tr>
    <tr>
      <td class="label">(Viết bằng chữ):</td>
      <td style="font-style: italic; font-weight: 600;">${amountInWords}</td>
    </tr>
    <tr>
      <td class="label">Kèm theo:</td>
      <td>${nfc(tx.attachedDocs || '01')} chứng từ gốc hợp lệ</td>
    </tr>
  </table>

  <!-- Hàng Ký 1: THỦ TRƯỞNG ĐƠN VỊ - KẾ TOÁN - NGƯỜI LẬP -->
  <table class="signatures-top-table">
    <tr>
      <td style="width: 33.3%;">
        <div class="sign-role">${nfc(headTitle)}</div>
        <div class="sign-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(headName)}</div>
      </td>
      <td style="width: 33.3%;">
        <div class="sign-role">KẾ TOÁN</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(accountantName)}</div>
      </td>
      <td style="width: 33.3%;">
        <div class="sign-role">NGƯỜI LẬP</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(preparerName)}</div>
      </td>
    </tr>
  </table>

  <!-- Dòng xác nhận nhận tiền -->
  <div class="receipt-ack">
    <div>Đã nhận đủ số tiền: <strong>${tx.amount.toLocaleString('vi-VN')} đồng</strong></div>
    <div><em>(Viết Bằng Chữ): ${amountInWords}</em></div>
  </div>

  <!-- Hàng Ký 2: NGƯỜI NỘP/NHẬN - THỦ QUÝ -->
  <table class="signatures-bottom-table">
    <tr>
      <td style="width: 50%;">
        <div class="sign-role">${isReceipt ? 'NGƯỜI NỘP' : 'NGƯỜI NHẬN'}</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(tx.personName)}</div>
      </td>
      <td style="width: 50%;">
        <div style="font-style: italic; font-size: 10.5pt; margin-bottom: 2px;">${dateString}</div>
        <div class="sign-role">THỦ QUỸ</div>
        <div class="sign-note">(Ký, họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-name">${nfc(treasurerName)}</div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateBatchUnionVouchersHTML(
  transactions: TradeUnionTransaction[],
  client: Client | null,
  signers?: UnionSignerSettings | null
): string {
  const unitTitle = signers?.unitTitle || 'CÔNG ĐOÀN CƠ SỞ';
  const clientName = signers?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const clientAddress = signers?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';

  const headTitle = signers?.headOfUnitTitle || 'THỦ TRƯỞNG ĐƠN VỊ';
  const headName = signers?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const accountantName = signers?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const preparerName = signers?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const treasurerName = signers?.treasurerName || 'Bùi Xuân Mai Thảo';

  const vouchersContent = transactions.map((tx, idx) => {
    const isReceipt = tx.voucherType === 'UNION_RECEIPT';
    const voucherTitle = isReceipt ? 'PHIẾU THU CÔNG ĐOÀN' : 'PHIẾU CHI CÔNG ĐOÀN';
    const formCode = isReceipt ? 'Mẫu số: C40-BB' : 'Mẫu số: C41-BB';
    const accounts = getTradeUnionAccounts(tx.category, tx.voucherType, tx.paymentMethod);

    const dateObj = new Date(tx.date);
    const day = isNaN(dateObj.getDate()) ? 15 : dateObj.getDate();
    const month = isNaN(dateObj.getMonth()) ? 1 : dateObj.getMonth() + 1;
    const year = isNaN(dateObj.getFullYear()) ? 2025 : dateObj.getFullYear();
    const dateString = `Ngày ${day < 10 ? '0' + day : day} tháng ${month < 10 ? '0' + month : month} năm ${year}`;
    const amountInWords = numberToVietnameseWords(tx.amount);

    return `
      <div class="voucher-page ${idx < transactions.length - 1 ? 'page-break' : ''}">
        <table class="header-table">
          <tr>
            <td style="width: 60%;">
              <div class="union-title">${nfc(unitTitle)}</div>
              <div class="company-title">${nfc(clientName)}</div>
              <div style="font-size: 10pt;">Địa chỉ: ${nfc(clientAddress)}</div>
            </td>
            <td style="width: 40%;" class="form-code">
              <strong>${formCode}</strong><br>
              <em>(Ban hành kèm theo TT 107/2017/TT-BTC)</em><br>
              <span style="font-size: 9.5pt; color: #555;">Quyển số: 01/${year}</span>
            </td>
          </tr>
        </table>

        <div class="title-section">
          <h1 class="main-title">${voucherTitle}</h1>
          <div class="voucher-date">${dateString}</div>
          <div class="voucher-no">Số: ${nfc(tx.voucherNo)}</div>
        </div>

        <div class="acc-box">
          <div>Nợ: <strong>${accounts.debitAcc}</strong></div>
          <div>Có: <strong>${accounts.creditAcc}</strong></div>
        </div>

        <table class="content-table">
          <tr>
            <td class="label">${isReceipt ? 'Họ và tên người nộp tiền:' : 'Họ và tên người nhận tiền:'}</td>
            <td style="font-weight: bold; font-size: 13pt;">${nfc(tx.personName)}</td>
          </tr>
          <tr>
            <td class="label">Địa chỉ / Bộ phận:</td>
            <td>${nfc(tx.department || clientAddress)}</td>
          </tr>
          <tr>
            <td class="label">${isReceipt ? 'Lý do nộp:' : 'Nội dung chi:'}</td>
            <td>${nfc(tx.reason)}</td>
          </tr>
          <tr>
            <td class="label">Số tiền:</td>
            <td class="amount-highlight">${tx.amount.toLocaleString('vi-VN')} VNĐ</td>
          </tr>
          <tr>
            <td class="label">(Viết bằng chữ):</td>
            <td style="font-style: italic; font-weight: 600;">${amountInWords}</td>
          </tr>
          <tr>
            <td class="label">Kèm theo:</td>
            <td>${nfc(tx.attachedDocs || '01')} chứng từ gốc hợp lệ</td>
          </tr>
        </table>

        <!-- Hàng Ký 1: THỦ TRƯỞNG ĐƠN VỊ - KẾ TOÁN - NGƯỜI LẬP -->
        <table class="signatures-top-table">
          <tr>
            <td style="width: 33.3%;">
              <div class="sign-role">${nfc(headTitle)}</div>
              <div class="sign-note">(Ký, họ tên, đóng dấu)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${nfc(headName)}</div>
            </td>
            <td style="width: 33.3%;">
              <div class="sign-role">KẾ TOÁN</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${nfc(accountantName)}</div>
            </td>
            <td style="width: 33.3%;">
              <div class="sign-role">NGƯỜI LẬP</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${nfc(preparerName)}</div>
            </td>
          </tr>
        </table>

        <!-- Dòng xác nhận nhận tiền -->
        <div class="receipt-ack">
          <div>Đã nhận đủ số tiền: <strong>${tx.amount.toLocaleString('vi-VN')} đồng</strong></div>
          <div><em>(Viết Bằng Chữ): ${amountInWords}</em></div>
        </div>

        <!-- Hàng Ký 2: NGƯỜI NỘP/NHẬN - THỦ QUÝ -->
        <table class="signatures-bottom-table">
          <tr>
            <td style="width: 50%;">
              <div class="sign-role">${isReceipt ? 'NGƯỜI NỘP' : 'NGƯỜI NHẬN'}</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${nfc(tx.personName)}</div>
            </td>
            <td style="width: 50%;">
              <div style="font-style: italic; font-size: 10.5pt; margin-bottom: 2px;">${dateString}</div>
              <div class="sign-role">THỦ QUỸ</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div class="sign-name">${nfc(treasurerName)}</div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>In Hàng Loạt Phiếu Công Đoàn (${transactions.length} chứng từ)</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 20mm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12.5pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .voucher-page {
      padding: 15px 0;
      box-sizing: border-box;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .header-table td {
      vertical-align: top;
    }
    .union-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .company-title {
      font-weight: bold;
      font-size: 11pt;
    }
    .form-code {
      text-align: right;
      font-size: 10pt;
    }
    .title-section {
      text-align: center;
      margin: 15px 0 10px 0;
    }
    .main-title {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: 1px;
      margin: 0;
      text-transform: uppercase;
    }
    .voucher-date {
      font-style: italic;
      font-size: 11.5pt;
      margin-top: 4px;
    }
    .voucher-no {
      text-align: center;
      font-size: 11.5pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .acc-box {
      text-align: right;
      font-size: 11pt;
      margin-top: -35px;
      margin-bottom: 15px;
    }
    .content-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .content-table td {
      padding: 5px 0;
      vertical-align: top;
    }
    .label {
      width: 220px;
      white-space: nowrap;
    }
    .amount-highlight {
      font-weight: bold;
      font-size: 13.5pt;
    }
    .receipt-ack {
      margin: 15px 0 5px 0;
      font-size: 11.5pt;
      padding-left: 20px;
    }
    .signatures-top-table, .signatures-bottom-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .signatures-top-table td, .signatures-bottom-table td {
      text-align: center;
      vertical-align: top;
      font-size: 11pt;
    }
    .sign-role {
      font-weight: bold;
      margin-bottom: 3px;
    }
    .sign-note {
      font-style: italic;
      font-size: 9.5pt;
      color: #333;
    }
    .sign-space {
      height: 55px;
    }
    .sign-name {
      font-weight: bold;
      font-size: 11.5pt;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
      .page-break { page-break-after: always; break-after: page; }
    }
  </style>
</head>
<body>
  ${vouchersContent}
</body>
</html>
  `;
}

export function generateSettlementB07HTML(report: TradeUnionSettlementB07Report, client: Client | null): string {
  const clientName = client?.name || report.clientName;
  const clientAddress = client?.address || report.clientAddress;

  const rowsHTML = report.items.map(it => {
    const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
    return `
      <tr style="${isMajor ? 'font-weight: bold; background-color: #f5f5f5;' : ''}">
        <td style="text-align: center;">${it.stt}</td>
        <td>${it.content}</td>
        <td style="text-align: center;">${it.code}</td>
        <td style="text-align: right;">${it.plannedAmount ? it.plannedAmount.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right; font-weight: ${isMajor ? 'bold' : 'normal'};">${it.settledAmount.toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">${it.approvedAmount ? it.approvedAmount.toLocaleString('vi-VN') : ''}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Quyết Toán Tài Chính Công Đoàn B07-TLĐ</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; line-height: 1.3; }
    table { width: 100%; border-collapse: collapse; }
    .report-table th, .report-table td { border: 1px solid #333; padding: 5px; font-size: 11pt; }
    .report-table th { background: #eee; text-align: center; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td style="width: 60%; vertical-align: top;">
        <div style="font-weight: bold; text-transform: uppercase;">LIÊN ĐOÀN LAO ĐỘNG QUẬN / HUYỆN</div>
        <div style="font-weight: bold;">CÔNG ĐOÀN CƠ SỞ: ${nfc(clientName)}</div>
        <div>Địa chỉ: ${nfc(clientAddress)}</div>
      </td>
      <td style="width: 40%; text-align: right; vertical-align: top;">
        <strong>Mẫu: B07-TLĐ</strong><br>
        <em>(Ban hành kèm theo Hướng dẫn 47/HD-TLĐ<br>của Tổng Liên đoàn Lao động VN)</em>
      </td>
    </tr>
  </table>

  <div style="text-align: center; margin: 15px 0;">
    <h2 style="margin: 0; text-transform: uppercase; font-size: 15pt;">${report.title}</h2>
    <div><strong>${report.periodText}</strong></div>
  </div>

  <div style="margin-bottom: 10px; font-size: 11pt;">
    <strong>A- CÁC CHỈ TIÊU CƠ BẢN:</strong><br>
    - Số lao động đóng KPCĐ: <strong>${report.basicIndicators.totalEmployeesKpcd}</strong> người &nbsp;|&nbsp; Quỹ lương đóng KPCĐ: <strong>${report.basicIndicators.salaryFundKpcd.toLocaleString('vi-VN')}</strong> đồng<br>
    - Số đoàn viên đóng ĐPCĐ: <strong>${report.basicIndicators.totalMembers}</strong> người &nbsp;|&nbsp; Quỹ lương đóng ĐPCĐ: <strong>${report.basicIndicators.salaryFundDoanPhi.toLocaleString('vi-VN')}</strong> đồng
  </div>

  <div style="margin-bottom: 5px;"><strong>B- CÁC CHỈ TIÊU THU CHI TÀI CHÍNH CÔNG ĐOÀN:</strong> <span style="float: right; font-style: italic;">Đơn vị tính: đồng</span></div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 40px;">TT</th>
        <th>NỘI DUNG</th>
        <th style="width: 80px;">Mã Mục Lục</th>
        <th style="width: 110px;">Dự toán giao</th>
        <th style="width: 110px;">Quyết toán năm</th>
        <th style="width: 110px;">Cấp trên duyệt</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>

  <div style="margin-top: 15px; font-weight: bold;">
    * Số dư quỹ cuối kỳ: Tiền mặt tại quỹ: ${report.closingCash.toLocaleString('vi-VN')} đ &nbsp;|&nbsp; Tiền gửi Ngân hàng: ${report.closingBank.toLocaleString('vi-VN')} đ
  </div>

  <table style="margin-top: 25px; page-break-inside: avoid;">
    <tr>
      <td style="text-align: center; width: 33%;">
        <strong>NGƯỜI LẬP BIỂU</strong><br>
        <em>(Ký, họ tên)</em><br><br><br><br>
        ....................................
      </td>
      <td style="text-align: center; width: 33%;">
        <strong>KẾ TOÁN CÔNG ĐOÀN</strong><br>
        <em>(Ký, họ tên)</em><br><br><br><br>
        ....................................
      </td>
      <td style="text-align: center; width: 34%;">
        <strong>TM. BAN CHẤP HÀNH CĐCS<br>CHỦ TỊCH</strong><br>
        <em>(Ký, họ tên, đóng dấu)</em><br><br><br><br>
        ....................................
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateCashBookHTML(transactions: TradeUnionTransaction[], client: Client | null, year: number): string {
  const clientName = client?.name || 'CÔNG ĐOÀN CƠ SỞ';
  const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');

  let runningBalance = 0;
  const rowsHTML = cashTxs.map((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) runningBalance += t.amount;
    else runningBalance -= t.amount;

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center;">${t.date}</td>
        <td style="text-align: center;">${isThu ? t.voucherNo : ''}</td>
        <td style="text-align: center;">${!isThu ? t.voucherNo : ''}</td>
        <td>${t.reason} (${t.personName})</td>
        <td style="text-align: right;">${isThu ? t.amount.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right;">${!isThu ? t.amount.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right; font-weight: bold;">${runningBalance.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Sổ Quỹ Tiền Mặt Công Đoàn Năm ${year}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 5px; }
    th { background: #eee; text-align: center; }
  </style>
</head>
<body>
  <table>
    <tr style="border: none;">
      <td style="border: none; width: 60%;">
        <strong>CÔNG ĐOÀN CƠ SỞ: ${nfc(clientName)}</strong>
      </td>
      <td style="border: none; width: 40%; text-align: right;">
        <strong>Mẫu số S11H / S12-H</strong><br>
        (Ban hành theo TT 107/2017/TT-BTC)
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin: 15px 0;">
    <h2 style="margin: 0; text-transform: uppercase;">SỔ QUỸ TIỀN MẶT CÔNG ĐOÀN</h2>
    <div>NĂM ${year}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th style="width: 85px;">Ngày tháng</th>
        <th style="width: 95px;">Số Phiếu Thu</th>
        <th style="width: 95px;">Số Phiếu Chi</th>
        <th>Diễn giải</th>
        <th style="width: 105px;">Thu</th>
        <th style="width: 105px;">Chi</th>
        <th style="width: 110px;">Tồn quỹ</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>
  `;
}

export function generateBankBookHTML(transactions: TradeUnionTransaction[], client: Client | null, year: number): string {
  const clientName = client?.name || 'CÔNG ĐOÀN CƠ SỞ';
  const bankTxs = transactions.filter(t => t.paymentMethod === 'BANK');

  let runningBalance = 0;
  const rowsHTML = bankTxs.map((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) runningBalance += t.amount;
    else runningBalance -= t.amount;

    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center;">${t.date}</td>
        <td style="text-align: center;">${t.voucherNo}</td>
        <td>${t.reason} (${t.personName})</td>
        <td style="text-align: right;">${isThu ? t.amount.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right;">${!isThu ? t.amount.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right; font-weight: bold;">${runningBalance.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Sổ Tiền Gửi Ngân Hàng Công Đoàn Năm ${year}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 5px; }
    th { background: #eee; text-align: center; }
  </style>
</head>
<body>
  <table>
    <tr style="border: none;">
      <td style="border: none; width: 60%;">
        <strong>CÔNG ĐOÀN CƠ SỞ: ${nfc(clientName)}</strong>
      </td>
      <td style="border: none; width: 40%; text-align: right;">
        <strong>Mẫu số S12-H</strong><br>
        (Ban hành theo TT 107/2017/TT-BTC)
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin: 15px 0;">
    <h2 style="margin: 0; text-transform: uppercase;">SỔ TIỀN GỬI NGÂN HÀNG CÔNG ĐOÀN</h2>
    <div>NĂM ${year}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 35px;">STT</th>
        <th style="width: 85px;">Ngày tháng</th>
        <th style="width: 120px;">Số Chứng Từ / UNC</th>
        <th>Diễn giải</th>
        <th style="width: 110px;">Thu (Gửi vào)</th>
        <th style="width: 110px;">Chi (Rút ra)</th>
        <th style="width: 120px;">Số Dư</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>
  `;
}

// =========================================================================
// 6. XUẤT EXCEL CAO CẤP (ĐỊNH DẠNG ĐẸP, ĐA SHEET, MÀU SẮC, VIỀN Ô, CHỮ KÝ)
// =========================================================================

// Bảng màu & Style chuẩn Doanh nghiệp / Kế toán
const EXCEL_STYLES = {
  fontName: 'Segoe UI',

  // Tiêu đề đơn vị
  companyTitle: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { vertical: 'center' }
  },
  companyAddress: {
    font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '64748B' } },
    alignment: { vertical: 'center' }
  },
  formCode: {
    font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'right', vertical: 'center' }
  },
  formSubCode: {
    font: { name: 'Segoe UI', sz: 8.5, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'right', vertical: 'center' }
  },

  // Banner tiêu đề chính của biểu mẫu
  mainTitleBanner: {
    font: { name: 'Segoe UI', sz: 14, bold: true, color: { rgb: '1E3A8A' } },
    fill: { fgColor: { rgb: 'EFF6FF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'BFDBFE' } },
      bottom: { style: 'medium', color: { rgb: '2563EB' } },
      left: { style: 'thin', color: { rgb: 'BFDBFE' } },
      right: { style: 'thin', color: { rgb: 'BFDBFE' } }
    }
  },

  subTitle: {
    font: { name: 'Segoe UI', sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },

  // Tiêu đề bảng (Header)
  tableHeader: {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '93C5FD' } },
      bottom: { style: 'medium', color: { rgb: '1D4ED8' } },
      left: { style: 'thin', color: { rgb: '93C5FD' } },
      right: { style: 'thin', color: { rgb: '93C5FD' } }
    }
  },

  tableHeaderTeal: {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0F766E' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '99F6E4' } },
      bottom: { style: 'medium', color: { rgb: '0D9488' } },
      left: { style: 'thin', color: { rgb: '99F6E4' } },
      right: { style: 'thin', color: { rgb: '99F6E4' } }
    }
  },

  // Dòng dữ liệu chẵn / lẻ
  dataCellCenter: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  dataCellLeft: (isOdd: boolean, isBold: boolean = false) => ({
    font: { name: 'Segoe UI', sz: 10, bold: isBold, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  dataVoucherCode: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1D4ED8' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  dataAmountThu: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '047857' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  dataAmountChi: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  dataAmountNeutral: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    }
  }),

  // Dòng Tổng Cộng Phát Sinh
  totalRowLabel: {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'double', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },
  totalRowAmountThu: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '047857' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'double', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },
  totalRowAmountChi: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'double', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },
  totalRowEmpty: {
    fill: { fgColor: { rgb: 'FEF3C7' } },
    border: {
      top: { style: 'thin', color: { rgb: 'F59E0B' } },
      bottom: { style: 'double', color: { rgb: 'B45309' } },
      left: { style: 'thin', color: { rgb: 'FDE68A' } },
      right: { style: 'thin', color: { rgb: 'FDE68A' } }
    }
  },

  // Dòng Tồn Quỹ Cuối Kỳ
  balanceRowLabel: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '86EFAC' } },
      bottom: { style: 'double', color: { rgb: '16A34A' } },
      left: { style: 'thin', color: { rgb: 'BBF7D0' } },
      right: { style: 'thin', color: { rgb: 'BBF7D0' } }
    }
  },
  balanceRowAmount: {
    font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '86EFAC' } },
      bottom: { style: 'double', color: { rgb: '16A34A' } },
      left: { style: 'thin', color: { rgb: 'BBF7D0' } },
      right: { style: 'thin', color: { rgb: 'BBF7D0' } }
    }
  },
  balanceRowEmpty: {
    fill: { fgColor: { rgb: 'DCFCE7' } },
    border: {
      top: { style: 'thin', color: { rgb: '86EFAC' } },
      bottom: { style: 'double', color: { rgb: '16A34A' } },
      left: { style: 'thin', color: { rgb: 'BBF7D0' } },
      right: { style: 'thin', color: { rgb: 'BBF7D0' } }
    }
  },

  // Khối chữ ký
  signRole: {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  signNote: {
    font: { name: 'Segoe UI', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  signName: {
    font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },

  // B07 Chỉ tiêu lớn
  b07MajorRow: {
    font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    border: {
      top: { style: 'thin', color: { rgb: 'A0AEC0' } },
      bottom: { style: 'thin', color: { rgb: 'A0AEC0' } },
      left: { style: 'thin', color: { rgb: 'A0AEC0' } },
      right: { style: 'thin', color: { rgb: 'A0AEC0' } }
    },
    alignment: { vertical: 'center' }
  }
};

function getCellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

// =========================================================================
// CÁC ĐỊNH DẠNG STYLE EXCEL CHUẨN FORM TT107 & HÌNH ẢNH THỰC TẾ
// =========================================================================

const BORDER_ALL_THIN = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
};

const BORDER_TOTAL_DOUBLE = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'double', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } }
};

const TNR_FONT = 'Times New Roman';

export const EXCEL_FORM_STYLES = {
  headerOrgLeft: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  headerOrgSubLeft: {
    font: { name: TNR_FONT, sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  headerFormCodeRight: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  headerFormCircularRight: {
    font: { name: TNR_FONT, sz: 9, italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  mainTitle: {
    font: { name: TNR_FONT, sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  mainTitleYear: {
    font: { name: TNR_FONT, sz: 12, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  tableHeaderBox: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: BORDER_ALL_THIN
  },
  colSymbolBox: {
    font: { name: TNR_FONT, sz: 9.5, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_ALL_THIN
  },
  dataCenter: {
    font: { name: TNR_FONT, sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_ALL_THIN
  },
  dataLeft: {
    font: { name: TNR_FONT, sz: 10, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: BORDER_ALL_THIN
  },
  dataNumber: {
    font: { name: TNR_FONT, sz: 10, color: { rgb: '000000' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BORDER_ALL_THIN
  },
  // Ô THU TIỀN MẶT NỀN VÀNG SÁNG NHƯ HÌNH 1
  dataNumberThuYellow: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'FFFF00' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BORDER_ALL_THIN
  },
  totalRowCenter: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: BORDER_TOTAL_DOUBLE
  },
  totalRowNumber: {
    font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: BORDER_TOTAL_DOUBLE
  },
  infoPageNote: {
    font: { name: TNR_FONT, sz: 9.5, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  signDateRight: {
    font: { name: TNR_FONT, sz: 10, italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  signTitle: {
    font: { name: TNR_FONT, sz: 10.5, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  signSub: {
    font: { name: TNR_FONT, sz: 9, italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  signName: {
    font: { name: TNR_FONT, sz: 10.5, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  }
};

/**
 * Xuất Trọn Bộ 5 Sheet Sổ Sách Tài Chính Chuẩn TT107 & Hình Mẫu Người Dùng Cung Cấp
 */
export function exportUnionFinancialReportToExcel(
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number,
  signers?: UnionSignerSettings | null
): void {
  const wb = XLSX.utils.book_new();
  const superiorUnion = 'LIÊN ĐOÀN LAO ĐỘNG TP HỒ CHÍ MINH';
  const companyName = signers?.companyName || client?.name || 'CTY TNHH TKXD & TM Hưng Phát';
  const headName = (signers?.headOfUnitName || 'NGÔ THỊ BÍCH NGỌC').toUpperCase();
  const accountantName = (signers?.accountantName || 'NGUYỄN THỊ CẨM LY').toUpperCase();
  const preparerName = (signers?.preparerName || 'NGUYỄN THỊ CẨM LY').toUpperCase();
  const treasurerName = (signers?.treasurerName || 'VÕ THỊ MỘNG THÚY').toUpperCase();

  // Lấy số dư đầu kỳ từ localStorage hoặc mặc định
  let openingCash = 438010;
  let openingBank = 123430;
  try {
    const saved = localStorage.getItem('ACCODESK_UNION_OPENING_BALANCES');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[year]) {
        if (typeof parsed[year].cash === 'number') openingCash = parsed[year].cash;
        if (typeof parsed[year].bank === 'number') openingBank = parsed[year].bank;
      }
    }
  } catch (e) {}

  // =========================================================================
  // SHEET 1: SỔ QUỸ TIỀN MẶT NĂM 2026 (MẪU S11H - CHUẨN HÌNH 1 & HÌNH 3)
  // =========================================================================
  const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');
  const ws1: any = {};

  // Header cơ quan & mẫu số
  ws1['A1'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
  ws1['A2'] = { v: `Công đoàn cơ sở: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

  ws1['G1'] = { v: 'Mẫu số S11H', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };
  ws1['G2'] = { v: '(Ban hành kèm theo Thông tư số 107/2017/TT-BTC', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };
  ws1['G3'] = { v: 'ngày 10/10/2017 của Bộ Tài chính)', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

  // Tiêu đề Sổ Quỹ
  ws1['E4'] = { v: 'SỔ QUỸ TIỀN MẶT', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
  ws1['E5'] = { v: `NĂM ${year}`, t: 's', s: EXCEL_FORM_STYLES.mainTitleYear };

  // Header Bảng (Dòng 7 & 8)
  ws1['A7'] = { v: 'Ngày tháng\nghi sổ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['B7'] = { v: 'Ngày tháng\nchứng từ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['C7'] = { v: 'SỐ HIỆU CHỨNG TỪ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['C8'] = { v: 'Thu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['D8'] = { v: 'Chi', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['E7'] = { v: 'DIỄN GIẢI', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['F7'] = { v: 'SỐ TIỀN', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['F8'] = { v: 'Thu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['G8'] = { v: 'Chi', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['H8'] = { v: 'Tồn quỹ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws1['I7'] = { v: 'Ghi chú', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

  // Dòng 9: Ký hiệu số cột
  ws1['A9'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['B9'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['C9'] = { v: 'C', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['D9'] = { v: 'D', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['E9'] = { v: 'E', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['F9'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['G9'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['H9'] = { v: '3', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws1['I9'] = { v: 'G', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

  // Dòng 10: Số dư đầu kỳ
  ws1['A10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws1['B10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws1['C10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws1['D10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws1['E10'] = { v: 'Số dư đầu kỳ', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws1['F10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
  ws1['G10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
  ws1['H10'] = { v: openingCash, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws1['I10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };

  let curCash = openingCash;
  let totalCashThu = 0;
  let totalCashChi = 0;

  cashTxs.forEach((t, idx) => {
    const rNum = 11 + idx;
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) {
      curCash += t.amount;
      totalCashThu += t.amount;
    } else {
      curCash -= t.amount;
      totalCashChi += t.amount;
    }

    ws1[`A${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1[`B${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1[`C${rNum}`] = { v: isThu ? t.voucherNo : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1[`D${rNum}`] = { v: !isThu ? t.voucherNo : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1[`E${rNum}`] = { v: t.reason, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
    ws1[`F${rNum}`] = isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumberThuYellow } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws1[`G${rNum}`] = !isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws1[`H${rNum}`] = { v: curCash, t: 'n', s: EXCEL_FORM_STYLES.dataNumber };
    ws1[`I${rNum}`] = { v: t.attachedDocs ? `Kèm ${t.attachedDocs}` : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  });

  const totalRow1 = 11 + cashTxs.length;
  ws1[`A${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`B${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`C${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`D${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`E${totalRow1}`] = { v: 'Cộng :', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`F${totalRow1}`] = { v: totalCashThu, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`G${totalRow1}`] = { v: totalCashChi, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`H${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`I${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

  const finalBalRow1 = totalRow1 + 1;
  ws1[`A${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`B${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`C${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`D${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`E${finalBalRow1}`] = { v: 'Số dư cuối kỳ', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws1[`F${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`G${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`H${finalBalRow1}`] = { v: curCash, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws1[`I${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

  // Thông tin mở sổ & chữ ký
  const noteRow1 = finalBalRow1 + 1;
  ws1[`A${noteRow1}`] = { v: '- Sổ này có 01 trang', t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
  ws1[`A${noteRow1 + 1}`] = { v: `- Ngày mở sổ: 01/01/${year}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };

  ws1[`G${noteRow1 + 2}`] = { v: `Ngày 31 tháng 12 năm ${year}`, t: 's', s: EXCEL_FORM_STYLES.signDateRight };

  const sigRow1 = noteRow1 + 3;
  ws1[`B${sigRow1}`] = { v: 'Người lập sổ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws1[`B${sigRow1 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws1[`B${sigRow1 + 6}`] = { v: preparerName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws1[`E${sigRow1}`] = { v: 'Phụ trách kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws1[`E${sigRow1 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws1[`E${sigRow1 + 6}`] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws1[`G${sigRow1}`] = { v: 'Chủ Tài Khoản', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws1[`G${sigRow1 + 1}`] = { v: '(Ký, họ tên, đóng dấu)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws1[`G${sigRow1 + 6}`] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws1['!ref'] = `A1:I${sigRow1 + 7}`;
  ws1['!cols'] = [
    { wch: 13 }, // A: Ngày ghi sổ
    { wch: 13 }, // B: Ngày chứng từ
    { wch: 14 }, // C: Thu
    { wch: 14 }, // D: Chi
    { wch: 48 }, // E: Diễn giải
    { wch: 16 }, // F: Số tiền Thu
    { wch: 16 }, // G: Số tiền Chi
    { wch: 16 }, // H: Tồn quỹ
    { wch: 12 }  // I: Ghi chú
  ];

  ws1['!merges'] = [
    // Header merges
    { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 6 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
    // Table Header 2-level merges
    { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, // A7:A8
    { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, // B7:B8
    { s: { r: 6, c: 2 }, e: { r: 6, c: 3 } }, // C7:D7 (SỐ HIỆU CHỨNG TỪ)
    { s: { r: 6, c: 4 }, e: { r: 7, c: 4 } }, // E7:E8 (DIỄN GIẢI)
    { s: { r: 6, c: 5 }, e: { r: 6, c: 7 } }, // F7:H7 (SỐ TIỀN)
    { s: { r: 6, c: 8 }, e: { r: 7, c: 8 } }, // I7:I8 (Ghi chú)
    // Chữ ký merges
    { s: { r: noteRow1 + 1, c: 6 }, e: { r: noteRow1 + 1, c: 8 } },
    { s: { r: sigRow1 - 1, c: 6 }, e: { r: sigRow1 - 1, c: 8 } },
    { s: { r: sigRow1, c: 6 }, e: { r: sigRow1, c: 8 } },
    { s: { r: sigRow1 + 5, c: 6 }, e: { r: sigRow1 + 5, c: 8 } },
  ];

  // Freeze Panes tại dòng 9 (Cố định Header bảng)
  ws1['!views'] = [{ state: 'frozen', ySplit: 9, xSplit: 0, activeCell: 'A10' }];

  XLSX.utils.book_append_sheet(wb, ws1, 'SO_TM_2026');

  // =========================================================================
  // SHEET 2: SỔ TIỀN GỬI NGÂN HÀNG (MẪU S12-H - CHUẨN HÌNH 2 & HÌNH 3)
  // =========================================================================
  const bankTxs = transactions.filter(t => t.paymentMethod === 'BANK');
  const ws2: any = {};

  ws2['A1'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
  ws2['A2'] = { v: `Công đoàn cơ sở: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

  ws2['G1'] = { v: 'Mẫu số S12-H', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };
  ws2['G2'] = { v: '(Ban hành kèm theo Thông tư số 107/2017/TT-BTC', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };
  ws2['G3'] = { v: 'ngày 10/10/2017 của Bộ Tài chính)', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

  ws2['D5'] = { v: 'SỔ TIỀN GỬI NGÂN HÀNG', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
  ws2['D6'] = { v: `Từ ngày 01/01/${year} đến ngày 31/12/${year}`, t: 's', s: EXCEL_FORM_STYLES.mainTitleYear };

  // Header Bảng (Dòng 11 & 12)
  ws2['A11'] = { v: 'Ngày tháng\nghi sổ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['B11'] = { v: 'Chứng từ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['B12'] = { v: 'Số hiệu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['C12'] = { v: 'Ngày tháng', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['D11'] = { v: 'DIỄN GIẢI', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['E11'] = { v: 'SỐ TIỀN', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['E12'] = { v: 'Thu (gửi vào)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['F12'] = { v: 'Chi (rút ra)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['G12'] = { v: 'Còn lại', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws2['H11'] = { v: 'Ghi chú', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

  // Dòng 13: Ký hiệu cột
  ws2['A13'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['B13'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['C13'] = { v: 'C', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['D13'] = { v: 'D', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['E13'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['F13'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['G13'] = { v: '3', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws2['H13'] = { v: 'E', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

  // Dòng 14: Số dư đầu kỳ
  ws2['A14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws2['B14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws2['C14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws2['D14'] = { v: 'Số dư đầu kỳ', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws2['E14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
  ws2['F14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
  ws2['G14'] = { v: openingBank, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws2['H14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };

  let curBank = openingBank;
  let totalBankThu = 0;
  let totalBankChi = 0;

  bankTxs.forEach((t, idx) => {
    const rNum = 15 + idx;
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) {
      curBank += t.amount;
      totalBankThu += t.amount;
    } else {
      curBank -= t.amount;
      totalBankChi += t.amount;
    }

    ws2[`A${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2[`B${rNum}`] = { v: t.voucherNo, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2[`C${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2[`D${rNum}`] = { v: t.reason, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
    ws2[`E${rNum}`] = isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws2[`F${rNum}`] = !isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws2[`G${rNum}`] = { v: curBank, t: 'n', s: EXCEL_FORM_STYLES.dataNumber };
    ws2[`H${rNum}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  });

  const totalRow2 = 15 + bankTxs.length;
  ws2[`A${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`B${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`C${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`D${totalRow2}`] = { v: 'Cộng :', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`E${totalRow2}`] = { v: totalBankThu, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`F${totalRow2}`] = { v: totalBankChi, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`G${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`H${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

  const finalBalRow2 = totalRow2 + 1;
  ws2[`A${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`B${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`C${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`D${finalBalRow2}`] = { v: 'Số dư cuối kỳ', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
  ws2[`E${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`F${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`G${finalBalRow2}`] = { v: curBank, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
  ws2[`H${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

  const noteRow2 = finalBalRow2 + 1;
  ws2[`A${noteRow2}`] = { v: '- Sổ này có 01 trang', t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
  ws2[`A${noteRow2 + 1}`] = { v: `- Ngày mở sổ: 01/01/${year}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };

  ws2['G' + (noteRow2 + 2)] = { v: `Ngày 31 tháng 12 năm ${year}`, t: 's', s: EXCEL_FORM_STYLES.signDateRight };

  const sigRow2 = noteRow2 + 3;
  ws2[`B${sigRow2}`] = { v: 'Người lập sổ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws2[`B${sigRow2 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws2[`B${sigRow2 + 6}`] = { v: preparerName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws2[`D${sigRow2}`] = { v: 'Phụ trách kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws2[`D${sigRow2 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws2[`D${sigRow2 + 6}`] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws2[`G${sigRow2}`] = { v: 'Chủ Tài Khoản', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws2[`G${sigRow2 + 1}`] = { v: '(Ký, họ tên, đóng dấu)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws2[`G${sigRow2 + 6}`] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws2['!ref'] = `A1:H${sigRow2 + 7}`;
  ws2['!cols'] = [
    { wch: 13 }, // A: Ngày ghi sổ
    { wch: 14 }, // B: Số hiệu
    { wch: 13 }, // C: Ngày CT
    { wch: 48 }, // D: Diễn giải
    { wch: 16 }, // E: Thu
    { wch: 16 }, // F: Chi
    { wch: 16 }, // G: Còn lại
    { wch: 12 }  // H: Ghi chú
  ];

  ws2['!merges'] = [
    { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
    { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } }, // A11:A12
    { s: { r: 10, c: 1 }, e: { r: 10, c: 2 } }, // B11:C11 (Chứng từ)
    { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } }, // D11:D12 (DIỄN GIẢI)
    { s: { r: 10, c: 4 }, e: { r: 10, c: 6 } }, // E11:G11 (SỐ TIỀN)
    { s: { r: 10, c: 7 }, e: { r: 11, c: 7 } }, // H11:H12 (Ghi chú)
    { s: { r: noteRow2 + 1, c: 6 }, e: { r: noteRow2 + 1, c: 7 } },
    { s: { r: sigRow2 - 1, c: 6 }, e: { r: sigRow2 - 1, c: 7 } },
    { s: { r: sigRow2, c: 6 }, e: { r: sigRow2, c: 7 } },
    { s: { r: sigRow2 + 5, c: 6 }, e: { r: sigRow2 + 5, c: 7 } },
  ];

  ws2['!views'] = [{ state: 'frozen', ySplit: 13, xSplit: 0, activeCell: 'A14' }];

  XLSX.utils.book_append_sheet(wb, ws2, 'SO_NH_2026');

  // =========================================================================
  // SHEET 3: BẢNG KIỂM KÊ TIỀN MẶT NĂM 2026 (MẪU C34-HD - CHUẨN HÌNH 4)
  // =========================================================================
  const ws3: any = {};

  ws3['A2'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
  ws3['A3'] = { v: `CĐCS: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['D2'] = { v: 'Mẫu số C34-HD', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };

  ws3['B5'] = { v: 'BIÊN BẢN KIỂM KÊ QUỸ TIỀN MẶT', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
  ws3['A7'] = { v: `Hôm nay, ngày 31 tháng 12 năm ${year}, vào hồi 13 giờ 30 phút.`, t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

  ws3['A9'] = { v: 'Ban kiểm kê bao gồm:', t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
  ws3['A10'] = { v: `Ông/Bà: ${headName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['C10'] = { v: 'Chủ tịch CĐCS Trưởng Ban', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['A11'] = { v: `Ông/Bà: ${accountantName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['C11'] = { v: 'Kế toán Ủy viên', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['A12'] = { v: `Ông/Bà: ${treasurerName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
  ws3['C12'] = { v: 'Thủ quỹ', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

  // Bảng chi tiết kiểm kê
  ws3['A14'] = { v: 'STT', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws3['B14'] = { v: 'Diễn giải', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws3['C14'] = { v: 'Số lượng (tờ)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
  ws3['D14'] = { v: 'Số tiền', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

  ws3['A15'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws3['B15'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws3['C15'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
  ws3['D15'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

  // Tính phân rã mệnh giá tiền mặt từ số tồn cuối kỳ curCash
  let remaining = curCash;
  const count500k = Math.floor(remaining / 500000); remaining %= 500000;
  const count200k = Math.floor(remaining / 200000); remaining %= 200000;
  const count100k = Math.floor(remaining / 100000); remaining %= 100000;
  const count50k = Math.floor(remaining / 50000); remaining %= 50000;
  const count20k = Math.floor(remaining / 20000); remaining %= 20000;
  const count10k = Math.floor(remaining / 10000); remaining %= 10000;
  const count5k = Math.floor(remaining / 5000); remaining %= 5000;
  const count2k = Math.floor(remaining / 2000); remaining %= 2000;
  const count1k = Math.floor(remaining / 1000); remaining %= 1000;
  const count500 = Math.floor(remaining / 500); remaining %= 500;
  const actualCountTotal = curCash - remaining;

  ws3['A16'] = { v: 'I', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['B16'] = { v: 'Số dư theo sổ quỹ', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['C16'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws3['D16'] = { v: curCash, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

  ws3['A17'] = { v: 'II', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['B17'] = { v: 'Số kiểm kê thực tế', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['C17'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws3['D17'] = { v: actualCountTotal, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

  const denominations = [
    { stt: 1, label: '- Loại 500.000đ', qty: count500k, val: 500000 },
    { stt: 2, label: '- Loại 200.000đ', qty: count200k, val: 200000 },
    { stt: 3, label: '- Loại 100.000đ', qty: count100k, val: 100000 },
    { stt: 4, label: '- Loại 50.000đ', qty: count50k, val: 50000 },
    { stt: 5, label: '- Loại 20.000đ', qty: count20k, val: 20000 },
    { stt: 6, label: '- Loại 10.000đ', qty: count10k, val: 10000 },
    { stt: 7, label: '- Loại 5.000đ', qty: count5k, val: 5000 },
    { stt: 8, label: '- Loại 2.000đ', qty: count2k, val: 2000 },
    { stt: 9, label: '- Loại 1.000đ', qty: count1k, val: 1000 },
    { stt: 10, label: '- Loại 500đ', qty: count500, val: 500 },
  ];

  denominations.forEach((d, idx) => {
    const rNum = 18 + idx;
    ws3[`A${rNum}`] = { v: d.stt, t: 'n', s: EXCEL_FORM_STYLES.dataCenter };
    ws3[`B${rNum}`] = { v: d.label, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
    ws3[`C${rNum}`] = { v: d.qty > 0 ? d.qty : '', t: d.qty > 0 ? 'n' : 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3[`D${rNum}`] = { v: d.qty > 0 ? d.qty * d.val : '', t: d.qty > 0 ? 'n' : 's', s: EXCEL_FORM_STYLES.dataNumber };
  });

  ws3['A28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws3['B28'] = { v: '- ...', t: 's', s: EXCEL_FORM_STYLES.dataLeft };
  ws3['C28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws3['D28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };

  const diff = actualCountTotal - curCash;
  ws3['A29'] = { v: 'III', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['B29'] = { v: 'Chênh lệch:', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
  ws3['C29'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
  ws3['D29'] = { v: diff, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

  ws3['A30'] = { v: `- Lý do: ${diff === 0 ? 'Khớp đúng: 0đ' : diff < 0 ? `Thiếu: ${Math.abs(diff)}đ` : `Thừa: ${diff}đ`}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
  ws3['A31'] = { v: `- Kết luận sau khi kiểm quỹ: số tiền mặt kiểm tra ${diff === 0 ? 'khớp đúng 100%' : `thừa (thiếu) ${diff}đ`} so với sổ sách do làm tròn số lẻ trong quá trình thu, chi.`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };

  ws3['A33'] = { v: 'Kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws3['A34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws3['A37'] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws3['C33'] = { v: 'Thủ quỹ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws3['C34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws3['C37'] = { v: treasurerName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws3['D33'] = { v: 'Người chịu trách nhiệm\nkiểm kê quỹ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
  ws3['D34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
  ws3['D37'] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

  ws3['!ref'] = 'A1:D38';
  ws3['!cols'] = [
    { wch: 8 },  // STT
    { wch: 38 }, // Diễn giải
    { wch: 18 }, // Số lượng tờ
    { wch: 22 }  // Số tiền
  ];

  ws3['!merges'] = [
    { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } }, // B5:D5
    { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }, // A7:D7
    { s: { r: 29, c: 0 }, e: { r: 29, c: 3 } }, // A30:D30
    { s: { r: 30, c: 0 }, e: { r: 30, c: 3 } }, // A31:D31
  ];

  XLSX.utils.book_append_sheet(wb, ws3, 'BANG_KIEM_KE_TIEN_MAT');

  // =========================================================================
  // SHEET 4: BÁO CÁO QUYẾT TOÁN TÀI CHÍNH CÔNG ĐOÀN (MẪU B07-TLĐ)
  // =========================================================================
  const reportB07 = computeSettlementReportB07(transactions, client, year);
  const ws4Data: any[] = [
    [superiorUnion, '', '', '', '', 'Mẫu số: B07-TLĐ'],
    [`Công đoàn cơ sở: ${companyName}`, '', '', '', '', '(Ban hành theo HD số 47/HD-TLĐ)'],
    ['', '', '', '', '', ''],
    [`BÁO CÁO QUYẾT TOÁN THU, CHI TÀI CHÍNH CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['A. CÁC CHỈ TIÊU CƠ BẢN:', '', '', '', '', ''],
    ['- Số lao động đóng KPCĐ:', `${reportB07.basicIndicators.totalEmployeesKpcd} người`, '', 'Quỹ lương đóng KPCĐ:', reportB07.basicIndicators.salaryFundKpcd, ''],
    ['- Số đoàn viên đóng ĐPCĐ:', `${reportB07.basicIndicators.totalMembers} người`, '', 'Quỹ lương đóng ĐPCĐ:', reportB07.basicIndicators.salaryFundDoanPhi, ''],
    ['', '', '', '', '', ''],
    ['B. CÁC CHỈ TIÊU THU CHI TÀI CHÍNH CÔNG ĐOÀN:', '', '', '', '', ''],
    ['TT', 'Nội Dung Chỉ Tiêu', 'Mã Mục Lục', 'Dự Toán Giao (VNĐ)', 'Quyết Toán Năm (VNĐ)', 'Cấp Trên Duyệt (VNĐ)']
  ];

  const startIdx4 = ws4Data.length;
  reportB07.items.forEach(it => {
    ws4Data.push([
      it.stt,
      it.content,
      it.code,
      it.plannedAmount || '',
      it.settledAmount,
      it.approvedAmount || ''
    ]);
  });

  ws4Data.push(['', '', '', '', '', '']);
  ws4Data.push(['* Tồn quỹ cuối kỳ:', `Tiền mặt: ${reportB07.closingCash.toLocaleString('vi-VN')} đ | Tiền gửi NH: ${reportB07.closingBank.toLocaleString('vi-VN')} đ`, '', '', '', '']);
  ws4Data.push(['', '', '', '', '', '']);

  const signRowStart4 = ws4Data.length;
  ws4Data.push(['', 'NGƯỜI LẬP BIỂU', '', 'KẾ TOÁN CÔNG ĐOÀN', '', 'CHỦ TỊCH CĐCS']);
  ws4Data.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '(Ký, họ tên, đóng dấu)']);
  ws4Data.push(['', '', '', '', '', '']);
  ws4Data.push(['', '', '', '', '', '']);
  ws4Data.push(['', preparerName, '', accountantName, '', headName]);

  const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
  ws4['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 5 } }
  ];
  ws4['!cols'] = [
    { wch: 8 },
    { wch: 55 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 }
  ];

  if (ws4['A1']) ws4['A1'].s = EXCEL_FORM_STYLES.headerOrgLeft;
  if (ws4['A2']) ws4['A2'].s = EXCEL_FORM_STYLES.headerOrgSubLeft;
  if (ws4['F1']) ws4['F1'].s = EXCEL_FORM_STYLES.headerFormCodeRight;
  if (ws4['F2']) ws4['F2'].s = EXCEL_FORM_STYLES.headerFormCircularRight;
  if (ws4['A4']) ws4['A4'].s = EXCEL_FORM_STYLES.mainTitle;

  for (let c = 0; c <= 5; c++) {
    const ref = getCellAddress(10, c);
    if (ws4[ref]) ws4[ref].s = EXCEL_FORM_STYLES.tableHeaderBox;
  }

  for (let i = 0; i < reportB07.items.length; i++) {
    const r = startIdx4 + i;
    const it = reportB07.items[i];
    const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';

    for (let c = 0; c <= 5; c++) {
      const ref = getCellAddress(r, c);
      if (!ws4[ref]) continue;
      if (isMajor) {
        ws4[ref].s = {
          font: { name: TNR_FONT, sz: 10.5, bold: true, color: { rgb: '000000' } },
          border: BORDER_ALL_THIN,
          alignment: { vertical: 'center', horizontal: c === 4 ? 'right' : c === 0 || c === 2 ? 'center' : 'left' }
        };
      } else {
        if (c === 0 || c === 2) ws4[ref].s = EXCEL_FORM_STYLES.dataCenter;
        else if (c === 1) ws4[ref].s = EXCEL_FORM_STYLES.dataLeft;
        else ws4[ref].s = EXCEL_FORM_STYLES.dataNumber;
      }
    }
  }

  if (ws4[getCellAddress(signRowStart4, 1)]) ws4[getCellAddress(signRowStart4, 1)].s = EXCEL_FORM_STYLES.signTitle;
  if (ws4[getCellAddress(signRowStart4, 3)]) ws4[getCellAddress(signRowStart4, 3)].s = EXCEL_FORM_STYLES.signTitle;
  if (ws4[getCellAddress(signRowStart4, 5)]) ws4[getCellAddress(signRowStart4, 5)].s = EXCEL_FORM_STYLES.signTitle;

  if (ws4[getCellAddress(signRowStart4 + 1, 1)]) ws4[getCellAddress(signRowStart4 + 1, 1)].s = EXCEL_FORM_STYLES.signSub;
  if (ws4[getCellAddress(signRowStart4 + 1, 3)]) ws4[getCellAddress(signRowStart4 + 1, 3)].s = EXCEL_FORM_STYLES.signSub;
  if (ws4[getCellAddress(signRowStart4 + 1, 5)]) ws4[getCellAddress(signRowStart4 + 1, 5)].s = EXCEL_FORM_STYLES.signSub;

  if (ws4[getCellAddress(signRowStart4 + 4, 1)]) ws4[getCellAddress(signRowStart4 + 4, 1)].s = EXCEL_FORM_STYLES.signName;
  if (ws4[getCellAddress(signRowStart4 + 4, 3)]) ws4[getCellAddress(signRowStart4 + 4, 3)].s = EXCEL_FORM_STYLES.signName;
  if (ws4[getCellAddress(signRowStart4 + 4, 5)]) ws4[getCellAddress(signRowStart4 + 4, 5)].s = EXCEL_FORM_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws4, 'QUYET_TOAN_B07_TLD');

  // Ghi file Excel
  const safeName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  XLSX.writeFile(wb, `So_Sach_Cong_Doan_${safeName}_${year}.xlsx`);
}

export function exportSingleExcelSheet(
  type: 'VOUCHERS' | 'CASH_BOOK' | 'BANK_BOOK' | 'SETTLEMENT_B07' | 'CASH_COUNT',
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number,
  filterMonth?: number | 'ALL',
  signers?: UnionSignerSettings | null
): void {
  const superiorUnion = 'LIÊN ĐOÀN LAO ĐỘNG TP HỒ CHÍ MINH';
  const companyName = signers?.companyName || client?.name || 'CTY TNHH TKXD & TM Hưng Phát';
  const headName = (signers?.headOfUnitName || 'NGÔ THỊ BÍCH NGỌC').toUpperCase();
  const accountantName = (signers?.accountantName || 'NGUYỄN THỊ CẨM LY').toUpperCase();
  const preparerName = (signers?.preparerName || 'NGUYỄN THỊ CẨM LY').toUpperCase();
  const treasurerName = (signers?.treasurerName || 'VÕ THỊ MỘNG THÚY').toUpperCase();
  const safeName = companyName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

  let openingCash = 438010;
  let openingBank = 123430;
  try {
    const saved = localStorage.getItem('ACCODESK_UNION_OPENING_BALANCES');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[year]) {
        if (typeof parsed[year].cash === 'number') openingCash = parsed[year].cash;
        if (typeof parsed[year].bank === 'number') openingBank = parsed[year].bank;
      }
    }
  } catch (e) {}

  if (type === 'CASH_BOOK') {
    const wb = XLSX.utils.book_new();
    const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');
    const ws1: any = {};

    ws1['A1'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
    ws1['A2'] = { v: `Công đoàn cơ sở: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

    ws1['G1'] = { v: 'Mẫu số S11H', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };
    ws1['G2'] = { v: '(Ban hành kèm theo Thông tư số 107/2017/TT-BTC', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };
    ws1['G3'] = { v: 'ngày 10/10/2017 của Bộ Tài chính)', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

    ws1['E4'] = { v: 'SỔ QUỸ TIỀN MẶT', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
    ws1['E5'] = { v: `NĂM ${year}`, t: 's', s: EXCEL_FORM_STYLES.mainTitleYear };

    ws1['A7'] = { v: 'Ngày tháng\nghi sổ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['B7'] = { v: 'Ngày tháng\nchứng từ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['C7'] = { v: 'SỐ HIỆU CHỨNG TỪ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['C8'] = { v: 'Thu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['D8'] = { v: 'Chi', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['E7'] = { v: 'DIỄN GIẢI', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['F7'] = { v: 'SỐ TIỀN', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['F8'] = { v: 'Thu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['G8'] = { v: 'Chi', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['H8'] = { v: 'Tồn quỹ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws1['I7'] = { v: 'Ghi chú', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

    ws1['A9'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['B9'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['C9'] = { v: 'C', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['D9'] = { v: 'D', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['E9'] = { v: 'E', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['F9'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['G9'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['H9'] = { v: '3', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws1['I9'] = { v: 'G', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

    ws1['A10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1['B10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1['C10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1['D10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws1['E10'] = { v: 'Số dư đầu kỳ', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws1['F10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws1['G10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws1['H10'] = { v: openingCash, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws1['I10'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };

    let curCash = openingCash;
    let totalCashThu = 0;
    let totalCashChi = 0;

    cashTxs.forEach((t, idx) => {
      const rNum = 11 + idx;
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        curCash += t.amount;
        totalCashThu += t.amount;
      } else {
        curCash -= t.amount;
        totalCashChi += t.amount;
      }

      ws1[`A${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws1[`B${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws1[`C${rNum}`] = { v: isThu ? t.voucherNo : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws1[`D${rNum}`] = { v: !isThu ? t.voucherNo : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws1[`E${rNum}`] = { v: t.reason, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
      ws1[`F${rNum}`] = isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumberThuYellow } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
      ws1[`G${rNum}`] = !isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
      ws1[`H${rNum}`] = { v: curCash, t: 'n', s: EXCEL_FORM_STYLES.dataNumber };
      ws1[`I${rNum}`] = { v: t.attachedDocs ? `Kèm ${t.attachedDocs}` : '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    });

    const totalRow1 = 11 + cashTxs.length;
    ws1[`A${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`B${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`C${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`D${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`E${totalRow1}`] = { v: 'Cộng :', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`F${totalRow1}`] = { v: totalCashThu, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`G${totalRow1}`] = { v: totalCashChi, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`H${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`I${totalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

    const finalBalRow1 = totalRow1 + 1;
    ws1[`A${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`B${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`C${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`D${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`E${finalBalRow1}`] = { v: 'Số dư cuối kỳ', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws1[`F${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`G${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`H${finalBalRow1}`] = { v: curCash, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws1[`I${finalBalRow1}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

    const noteRow1 = finalBalRow1 + 1;
    ws1[`A${noteRow1}`] = { v: '- Sổ này có 01 trang', t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
    ws1[`A${noteRow1 + 1}`] = { v: `- Ngày mở sổ: 01/01/${year}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
    ws1[`G${noteRow1 + 2}`] = { v: `Ngày 31 tháng 12 năm ${year}`, t: 's', s: EXCEL_FORM_STYLES.signDateRight };

    const sigRow1 = noteRow1 + 3;
    ws1[`B${sigRow1}`] = { v: 'Người lập sổ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws1[`B${sigRow1 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws1[`B${sigRow1 + 6}`] = { v: preparerName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws1[`E${sigRow1}`] = { v: 'Phụ trách kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws1[`E${sigRow1 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws1[`E${sigRow1 + 6}`] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws1[`G${sigRow1}`] = { v: 'Chủ Tài Khoản', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws1[`G${sigRow1 + 1}`] = { v: '(Ký, họ tên, đóng dấu)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws1[`G${sigRow1 + 6}`] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws1['!ref'] = `A1:I${sigRow1 + 7}`;
    ws1['!cols'] = [
      { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 14 },
      { wch: 48 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }
    ];
    ws1['!merges'] = [
      { s: { r: 0, c: 6 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 8 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } },
      { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } },
      { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } },
      { s: { r: 6, c: 2 }, e: { r: 6, c: 3 } },
      { s: { r: 6, c: 4 }, e: { r: 7, c: 4 } },
      { s: { r: 6, c: 5 }, e: { r: 6, c: 7 } },
      { s: { r: 6, c: 8 }, e: { r: 7, c: 8 } },
      { s: { r: noteRow1 + 1, c: 6 }, e: { r: noteRow1 + 1, c: 8 } },
      { s: { r: sigRow1 - 1, c: 6 }, e: { r: sigRow1 - 1, c: 8 } },
      { s: { r: sigRow1, c: 6 }, e: { r: sigRow1, c: 8 } },
      { s: { r: sigRow1 + 5, c: 6 }, e: { r: sigRow1 + 5, c: 8 } },
    ];
    ws1['!views'] = [{ state: 'frozen', ySplit: 9, xSplit: 0, activeCell: 'A10' }];

    XLSX.utils.book_append_sheet(wb, ws1, 'SO_TM_2026');
    XLSX.writeFile(wb, `So_Quy_Tien_Mat_S11H_${safeName}_${year}.xlsx`);
  } else if (type === 'BANK_BOOK') {
    const wb = XLSX.utils.book_new();
    const bankTxs = transactions.filter(t => t.paymentMethod === 'BANK');
    const ws2: any = {};

    ws2['A1'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
    ws2['A2'] = { v: `Công đoàn cơ sở: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

    ws2['G1'] = { v: 'Mẫu số S12-H', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };
    ws2['G2'] = { v: '(Ban hành kèm theo Thông tư số 107/2017/TT-BTC', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };
    ws2['G3'] = { v: 'ngày 10/10/2017 của Bộ Tài chính)', t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

    ws2['D5'] = { v: 'SỔ TIỀN GỬI NGÂN HÀNG', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
    ws2['D6'] = { v: `Từ ngày 01/01/${year} đến ngày 31/12/${year}`, t: 's', s: EXCEL_FORM_STYLES.mainTitleYear };

    ws2['A11'] = { v: 'Ngày tháng\nghi sổ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['B11'] = { v: 'Chứng từ', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['B12'] = { v: 'Số hiệu', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['C12'] = { v: 'Ngày tháng', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['D11'] = { v: 'DIỄN GIẢI', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['E11'] = { v: 'SỐ TIỀN', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['E12'] = { v: 'Thu (gửi vào)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['F12'] = { v: 'Chi (rút ra)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['G12'] = { v: 'Còn lại', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws2['H11'] = { v: 'Ghi chú', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

    ws2['A13'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['B13'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['C13'] = { v: 'C', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['D13'] = { v: 'D', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['E13'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['F13'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['G13'] = { v: '3', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws2['H13'] = { v: 'E', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

    ws2['A14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2['B14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2['C14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws2['D14'] = { v: 'Số dư đầu kỳ', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws2['E14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws2['F14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
    ws2['G14'] = { v: openingBank, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws2['H14'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };

    let curBank = openingBank;
    let totalBankThu = 0;
    let totalBankChi = 0;

    bankTxs.forEach((t, idx) => {
      const rNum = 15 + idx;
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        curBank += t.amount;
        totalBankThu += t.amount;
      } else {
        curBank -= t.amount;
        totalBankChi += t.amount;
      }

      ws2[`A${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws2[`B${rNum}`] = { v: t.voucherNo, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws2[`C${rNum}`] = { v: t.date, t: 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws2[`D${rNum}`] = { v: t.reason, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
      ws2[`E${rNum}`] = isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
      ws2[`F${rNum}`] = !isThu ? { v: t.amount, t: 'n', s: EXCEL_FORM_STYLES.dataNumber } : { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };
      ws2[`G${rNum}`] = { v: curBank, t: 'n', s: EXCEL_FORM_STYLES.dataNumber };
      ws2[`H${rNum}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    });

    const totalRow2 = 15 + bankTxs.length;
    ws2[`A${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`B${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`C${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`D${totalRow2}`] = { v: 'Cộng :', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`E${totalRow2}`] = { v: totalBankThu, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`F${totalRow2}`] = { v: totalBankChi, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`G${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`H${totalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

    const finalBalRow2 = totalRow2 + 1;
    ws2[`A${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`B${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`C${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`D${finalBalRow2}`] = { v: 'Số dư cuối kỳ', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };
    ws2[`E${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`F${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`G${finalBalRow2}`] = { v: curBank, t: 'n', s: EXCEL_FORM_STYLES.totalRowNumber };
    ws2[`H${finalBalRow2}`] = { v: '', t: 's', s: EXCEL_FORM_STYLES.totalRowCenter };

    const noteRow2 = finalBalRow2 + 1;
    ws2[`A${noteRow2}`] = { v: '- Sổ này có 01 trang', t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
    ws2[`A${noteRow2 + 1}`] = { v: `- Ngày mở sổ: 01/01/${year}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
    ws2['G' + (noteRow2 + 2)] = { v: `Ngày 31 tháng 12 năm ${year}`, t: 's', s: EXCEL_FORM_STYLES.signDateRight };

    const sigRow2 = noteRow2 + 3;
    ws2[`B${sigRow2}`] = { v: 'Người lập sổ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws2[`B${sigRow2 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws2[`B${sigRow2 + 6}`] = { v: preparerName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws2[`D${sigRow2}`] = { v: 'Phụ trách kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws2[`D${sigRow2 + 1}`] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws2[`D${sigRow2 + 6}`] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws2[`G${sigRow2}`] = { v: 'Chủ Tài Khoản', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws2[`G${sigRow2 + 1}`] = { v: '(Ký, họ tên, đóng dấu)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws2[`G${sigRow2 + 6}`] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws2['!ref'] = `A1:H${sigRow2 + 7}`;
    ws2['!cols'] = [
      { wch: 13 }, { wch: 14 }, { wch: 13 }, { wch: 48 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }
    ];
    ws2['!merges'] = [
      { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },
      { s: { r: 10, c: 1 }, e: { r: 10, c: 2 } },
      { s: { r: 10, c: 3 }, e: { r: 11, c: 3 } },
      { s: { r: 10, c: 4 }, e: { r: 10, c: 6 } },
      { s: { r: 10, c: 7 }, e: { r: 11, c: 7 } },
      { s: { r: noteRow2 + 1, c: 6 }, e: { r: noteRow2 + 1, c: 7 } },
      { s: { r: sigRow2 - 1, c: 6 }, e: { r: sigRow2 - 1, c: 7 } },
      { s: { r: sigRow2, c: 6 }, e: { r: sigRow2, c: 7 } },
      { s: { r: sigRow2 + 5, c: 6 }, e: { r: sigRow2 + 5, c: 7 } },
    ];
    ws2['!views'] = [{ state: 'frozen', ySplit: 13, xSplit: 0, activeCell: 'A14' }];

    XLSX.utils.book_append_sheet(wb, ws2, 'SO_NH_2026');
    XLSX.writeFile(wb, `So_Tien_Gui_NH_S12H_${safeName}_${year}.xlsx`);
  } else if (type === 'CASH_COUNT') {
    const wb = XLSX.utils.book_new();
    const ws3: any = {};
    const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');
    let curCash = openingCash;
    cashTxs.forEach(t => {
      if (t.voucherType === 'UNION_RECEIPT') curCash += t.amount;
      else curCash -= t.amount;
    });

    ws3['A2'] = { v: superiorUnion, t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
    ws3['A3'] = { v: `CĐCS: ${companyName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['D2'] = { v: 'Mẫu số C34-HD', t: 's', s: EXCEL_FORM_STYLES.headerFormCodeRight };

    ws3['B5'] = { v: 'BIÊN BẢN KIỂM KÊ QUỸ TIỀN MẶT', t: 's', s: EXCEL_FORM_STYLES.mainTitle };
    ws3['A7'] = { v: `Hôm nay, ngày 31 tháng 12 năm ${year}, vào hồi 13 giờ 30 phút.`, t: 's', s: EXCEL_FORM_STYLES.headerFormCircularRight };

    ws3['A9'] = { v: 'Ban kiểm kê bao gồm:', t: 's', s: EXCEL_FORM_STYLES.headerOrgLeft };
    ws3['A10'] = { v: `Ông/Bà: ${headName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['C10'] = { v: 'Chủ tịch CĐCS Trưởng Ban', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['A11'] = { v: `Ông/Bà: ${accountantName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['C11'] = { v: 'Kế toán Ủy viên', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['A12'] = { v: `Ông/Bà: ${treasurerName}`, t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };
    ws3['C12'] = { v: 'Thủ quỹ', t: 's', s: EXCEL_FORM_STYLES.headerOrgSubLeft };

    ws3['A14'] = { v: 'STT', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws3['B14'] = { v: 'Diễn giải', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws3['C14'] = { v: 'Số lượng (tờ)', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };
    ws3['D14'] = { v: 'Số tiền', t: 's', s: EXCEL_FORM_STYLES.tableHeaderBox };

    ws3['A15'] = { v: 'A', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws3['B15'] = { v: 'B', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws3['C15'] = { v: '1', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };
    ws3['D15'] = { v: '2', t: 's', s: EXCEL_FORM_STYLES.colSymbolBox };

    let remaining = curCash;
    const count500k = Math.floor(remaining / 500000); remaining %= 500000;
    const count200k = Math.floor(remaining / 200000); remaining %= 200000;
    const count100k = Math.floor(remaining / 100000); remaining %= 100000;
    const count50k = Math.floor(remaining / 50000); remaining %= 50000;
    const count20k = Math.floor(remaining / 20000); remaining %= 20000;
    const count10k = Math.floor(remaining / 10000); remaining %= 10000;
    const count5k = Math.floor(remaining / 5000); remaining %= 5000;
    const count2k = Math.floor(remaining / 2000); remaining %= 2000;
    const count1k = Math.floor(remaining / 1000); remaining %= 1000;
    const count500 = Math.floor(remaining / 500); remaining %= 500;
    const actualCountTotal = curCash - remaining;

    ws3['A16'] = { v: 'I', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['B16'] = { v: 'Số dư theo sổ quỹ', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['C16'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3['D16'] = { v: curCash, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

    ws3['A17'] = { v: 'II', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['B17'] = { v: 'Số kiểm kê thực tế', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['C17'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3['D17'] = { v: actualCountTotal, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

    const denominations = [
      { stt: 1, label: '- Loại 500.000đ', qty: count500k, val: 500000 },
      { stt: 2, label: '- Loại 200.000đ', qty: count200k, val: 200000 },
      { stt: 3, label: '- Loại 100.000đ', qty: count100k, val: 100000 },
      { stt: 4, label: '- Loại 50.000đ', qty: count50k, val: 50000 },
      { stt: 5, label: '- Loại 20.000đ', qty: count20k, val: 20000 },
      { stt: 6, label: '- Loại 10.000đ', qty: count10k, val: 10000 },
      { stt: 7, label: '- Loại 5.000đ', qty: count5k, val: 5000 },
      { stt: 8, label: '- Loại 2.000đ', qty: count2k, val: 2000 },
      { stt: 9, label: '- Loại 1.000đ', qty: count1k, val: 1000 },
      { stt: 10, label: '- Loại 500đ', qty: count500, val: 500 },
    ];

    denominations.forEach((d, idx) => {
      const rNum = 18 + idx;
      ws3[`A${rNum}`] = { v: d.stt, t: 'n', s: EXCEL_FORM_STYLES.dataCenter };
      ws3[`B${rNum}`] = { v: d.label, t: 's', s: EXCEL_FORM_STYLES.dataLeft };
      ws3[`C${rNum}`] = { v: d.qty > 0 ? d.qty : '', t: d.qty > 0 ? 'n' : 's', s: EXCEL_FORM_STYLES.dataCenter };
      ws3[`D${rNum}`] = { v: d.qty > 0 ? d.qty * d.val : '', t: d.qty > 0 ? 'n' : 's', s: EXCEL_FORM_STYLES.dataNumber };
    });

    ws3['A28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3['B28'] = { v: '- ...', t: 's', s: EXCEL_FORM_STYLES.dataLeft };
    ws3['C28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3['D28'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataNumber };

    const diff = actualCountTotal - curCash;
    ws3['A29'] = { v: 'III', t: 's', s: { ...EXCEL_FORM_STYLES.dataCenter, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['B29'] = { v: 'Chênh lệch:', t: 's', s: { ...EXCEL_FORM_STYLES.dataLeft, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };
    ws3['C29'] = { v: '', t: 's', s: EXCEL_FORM_STYLES.dataCenter };
    ws3['D29'] = { v: diff, t: 'n', s: { ...EXCEL_FORM_STYLES.dataNumber, font: { name: TNR_FONT, sz: 10, bold: true, color: { rgb: '000000' } } } };

    ws3['A30'] = { v: `- Lý do: ${diff === 0 ? 'Khớp đúng: 0đ' : diff < 0 ? `Thiếu: ${Math.abs(diff)}đ` : `Thừa: ${diff}đ`}`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };
    ws3['A31'] = { v: `- Kết luận sau khi kiểm quỹ: số tiền mặt kiểm tra ${diff === 0 ? 'khớp đúng 100%' : `thừa (thiếu) ${diff}đ`} so với sổ sách do làm tròn số lẻ trong quá trình thu, chi.`, t: 's', s: EXCEL_FORM_STYLES.infoPageNote };

    ws3['A33'] = { v: 'Kế toán', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws3['A34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws3['A37'] = { v: accountantName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws3['C33'] = { v: 'Thủ quỹ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws3['C34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws3['C37'] = { v: treasurerName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws3['D33'] = { v: 'Người chịu trách nhiệm\nkiểm kê quỹ', t: 's', s: EXCEL_FORM_STYLES.signTitle };
    ws3['D34'] = { v: '(Ký, họ tên)', t: 's', s: EXCEL_FORM_STYLES.signSub };
    ws3['D37'] = { v: headName, t: 's', s: EXCEL_FORM_STYLES.signName };

    ws3['!ref'] = 'A1:D38';
    ws3['!cols'] = [{ wch: 8 }, { wch: 38 }, { wch: 18 }, { wch: 22 }];
    ws3['!merges'] = [
      { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } },
      { s: { r: 29, c: 0 }, e: { r: 29, c: 3 } },
      { s: { r: 30, c: 0 }, e: { r: 30, c: 3 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws3, 'BANG_KIEM_KE_TIEN_MAT');
    XLSX.writeFile(wb, `Bien_Ban_Kiem_Ke_Quy_TM_${safeName}_${year}.xlsx`);
  } else if (type === 'VOUCHERS') {
    const wb = XLSX.utils.book_new();
    let filteredTxs = transactions;
    if (filterMonth && filterMonth !== 'ALL') {
      filteredTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return (!isNaN(d.getMonth()) ? d.getMonth() + 1 : 1) === filterMonth;
      });
    }

    const titleMonth = filterMonth && filterMonth !== 'ALL' ? `THÁNG ${filterMonth}/${year}` : `NĂM ${year}`;
    const wsData: any[] = [
      [superiorUnion, '', '', '', '', '', '', '', '', '', ''],
      [`Công đoàn cơ sở: ${companyName}`, '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      [`BẢNG KÊ DANH SÁCH CHỨNG TỪ THU - CHI CÔNG ĐOÀN ${titleMonth}`, '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['STT', 'Ngày Lập', 'Số Phiếu', 'Loại Phiếu', 'Khoản Mục', 'Họ Tên Đối Tác', 'Nội Dung Diễn Giải', 'Hình Thức', 'Số Tiền Thu (VNĐ)', 'Số Tiền Chi (VNĐ)', 'Kèm Theo']
    ];

    let totalThu = 0;
    let totalChi = 0;
    const startRow = 6;

    filteredTxs.forEach((t, idx) => {
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) totalThu += t.amount;
      else totalChi += t.amount;

      wsData.push([
        idx + 1,
        t.date,
        t.voucherNo,
        isThu ? 'Phiếu Thu (C40)' : 'Phiếu Chi (C41)',
        getTradeUnionCategoryLabel(t.category),
        t.personName,
        t.reason,
        t.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Tiền mặt',
        isThu ? t.amount : 0,
        !isThu ? t.amount : 0,
        t.attachedDocs || '01'
      ]);
    });

    const totalRowIdx = wsData.length;
    wsData.push(['', '', '', '', '', '', 'TỔNG CỘNG PHÁT SINH:', '', totalThu, totalChi, '']);
    const balanceRowIdx = wsData.length;
    wsData.push(['', '', '', '', '', '', 'TỒN QUỸ CÒN LẠI:', '', totalThu - totalChi, '', '']);
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);

    const signRowStart = wsData.length;
    wsData.push(['', 'NGƯỜI LẬP BIỂU', '', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', '', 'CHỦ TỊCH CĐCS', '', '']);
    wsData.push(['', '(Ký, họ tên)', '', '', '(Ký, họ tên)', '', '', '', '(Ký, họ tên, đóng dấu)', '', '']);
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
    wsData.push(['', preparerName, '', '', accountantName, '', '', '', headName, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } }
    ];
    ws['!cols'] = [
      { wch: 6 }, { wch: 13 }, { wch: 15 }, { wch: 16 }, { wch: 32 },
      { wch: 24 }, { wch: 42 }, { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
    ];

    if (ws['A1']) ws['A1'].s = EXCEL_FORM_STYLES.headerOrgLeft;
    if (ws['A2']) ws['A2'].s = EXCEL_FORM_STYLES.headerOrgSubLeft;
    if (ws['A4']) ws['A4'].s = EXCEL_FORM_STYLES.mainTitle;

    for (let c = 0; c <= 10; c++) {
      const ref = getCellAddress(5, c);
      if (ws[ref]) ws[ref].s = EXCEL_FORM_STYLES.tableHeaderBox;
    }

    for (let i = 0; i < filteredTxs.length; i++) {
      const r = startRow + i;
      if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_FORM_STYLES.dataCenter;
      if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_FORM_STYLES.dataCenter;
      if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_FORM_STYLES.dataCenter;
      if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_FORM_STYLES.dataCenter;
      if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_FORM_STYLES.dataLeft;
      if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_FORM_STYLES.dataLeft;
      if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_FORM_STYLES.dataLeft;
      if (ws[getCellAddress(r, 7)]) ws[getCellAddress(r, 7)].s = EXCEL_FORM_STYLES.dataCenter;
      if (ws[getCellAddress(r, 8)]) ws[getCellAddress(r, 8)].s = EXCEL_FORM_STYLES.dataNumber;
      if (ws[getCellAddress(r, 9)]) ws[getCellAddress(r, 9)].s = EXCEL_FORM_STYLES.dataNumber;
      if (ws[getCellAddress(r, 10)]) ws[getCellAddress(r, 10)].s = EXCEL_FORM_STYLES.dataCenter;
    }

    for (let c = 0; c <= 10; c++) {
      const ref = getCellAddress(totalRowIdx, c);
      if (c === 6) { if (ws[ref]) ws[ref].s = EXCEL_FORM_STYLES.totalRowCenter; }
      else if (c === 8 || c === 9) { if (ws[ref]) ws[ref].s = EXCEL_FORM_STYLES.totalRowNumber; }
      else { if (ws[ref]) ws[ref].s = EXCEL_FORM_STYLES.totalRowCenter; }

      const refB = getCellAddress(balanceRowIdx, c);
      if (c === 6) { if (ws[refB]) ws[refB].s = EXCEL_FORM_STYLES.totalRowCenter; }
      else if (c === 8) { if (ws[refB]) ws[refB].s = EXCEL_FORM_STYLES.totalRowNumber; }
      else { if (ws[refB]) ws[refB].s = EXCEL_FORM_STYLES.totalRowCenter; }
    }

    if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_FORM_STYLES.signTitle;
    if (ws[getCellAddress(signRowStart, 4)]) ws[getCellAddress(signRowStart, 4)].s = EXCEL_FORM_STYLES.signTitle;
    if (ws[getCellAddress(signRowStart, 8)]) ws[getCellAddress(signRowStart, 8)].s = EXCEL_FORM_STYLES.signTitle;

    if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_FORM_STYLES.signSub;
    if (ws[getCellAddress(signRowStart + 1, 4)]) ws[getCellAddress(signRowStart + 1, 4)].s = EXCEL_FORM_STYLES.signSub;
    if (ws[getCellAddress(signRowStart + 1, 8)]) ws[getCellAddress(signRowStart + 1, 8)].s = EXCEL_FORM_STYLES.signSub;

    if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_FORM_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 4)]) ws[getCellAddress(signRowStart + 4, 4)].s = EXCEL_FORM_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 8)]) ws[getCellAddress(signRowStart + 4, 8)].s = EXCEL_FORM_STYLES.signName;

    XLSX.utils.book_append_sheet(wb, ws, 'DANH_SACH_THU_CHI');
    XLSX.writeFile(wb, `Danh_Sach_Thu_Chi_${safeName}_${year}${filterMonth && filterMonth !== 'ALL' ? `_T${filterMonth}` : ''}.xlsx`);
  } else if (type === 'SETTLEMENT_B07') {
    const wb = XLSX.utils.book_new();
    const reportB07 = computeSettlementReportB07(transactions, client, year);
    const wsData: any[] = [
      [superiorUnion, '', '', '', '', 'Mẫu số: B07-TLĐ'],
      [`Công đoàn cơ sở: ${companyName}`, '', '', '', '', '(Theo Hướng dẫn 47/HD-TLĐ)'],
      ['', '', '', '', '', ''],
      [`BÁO CÁO QUYẾT TOÁN THU, CHI TÀI CHÍNH CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['A. CÁC CHỈ TIÊU CƠ BẢN:', '', '', '', '', ''],
      ['- Số lao động đóng KPCĐ:', `${reportB07.basicIndicators.totalEmployeesKpcd} người`, '', 'Quỹ lương đóng KPCĐ:', reportB07.basicIndicators.salaryFundKpcd, ''],
      ['- Số đoàn viên đóng ĐPCĐ:', `${reportB07.basicIndicators.totalMembers} người`, '', 'Quỹ lương đóng ĐPCĐ:', reportB07.basicIndicators.salaryFundDoanPhi, ''],
      ['', '', '', '', '', ''],
      ['B. CÁC CHỈ TIÊU THU CHI TÀI CHÍNH CÔNG ĐOÀN:', '', '', '', '', ''],
      ['TT', 'Nội Dung Chỉ Tiêu', 'Mã Mục Lục', 'Dự Toán Giao (VNĐ)', 'Quyết Toán Năm (VNĐ)', 'Cấp Trên Duyệt (VNĐ)']
    ];

    const startIdx = wsData.length;
    reportB07.items.forEach(it => {
      wsData.push([
        it.stt,
        it.content,
        it.code,
        it.plannedAmount || '',
        it.settledAmount,
        it.approvedAmount || ''
      ]);
    });

    wsData.push(['', '', '', '', '', '']);
    wsData.push(['* Tồn quỹ cuối kỳ:', `Tiền mặt: ${reportB07.closingCash.toLocaleString('vi-VN')} đ | Tiền gửi NH: ${reportB07.closingBank.toLocaleString('vi-VN')} đ`, '', '', '', '']);
    wsData.push(['', '', '', '', '', '']);

    const signRowStart = wsData.length;
    wsData.push(['', 'NGƯỜI LẬP BIỂU', '', 'KẾ TOÁN CÔNG ĐOÀN', '', 'CHỦ TỊCH CĐCS']);
    wsData.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '(Ký, họ tên, đóng dấu)']);
    wsData.push(['', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '']);
    wsData.push(['', preparerName, '', accountantName, '', headName]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
      { s: { r: 9, c: 0 }, e: { r: 9, c: 5 } }
    ];
    ws['!cols'] = [
      { wch: 8 }, { wch: 55 }, { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 22 }
    ];

    if (ws['A1']) ws['A1'].s = EXCEL_FORM_STYLES.headerOrgLeft;
    if (ws['A2']) ws['A2'].s = EXCEL_FORM_STYLES.headerOrgSubLeft;
    if (ws['F1']) ws['F1'].s = EXCEL_FORM_STYLES.headerFormCodeRight;
    if (ws['F2']) ws['F2'].s = EXCEL_FORM_STYLES.headerFormCircularRight;
    if (ws['A4']) ws['A4'].s = EXCEL_FORM_STYLES.mainTitle;

    for (let c = 0; c <= 5; c++) {
      const ref = getCellAddress(10, c);
      if (ws[ref]) ws[ref].s = EXCEL_FORM_STYLES.tableHeaderBox;
    }

    for (let i = 0; i < reportB07.items.length; i++) {
      const r = startIdx + i;
      const it = reportB07.items[i];
      const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';

      for (let c = 0; c <= 5; c++) {
        const ref = getCellAddress(r, c);
        if (!ws[ref]) continue;
        if (isMajor) {
          ws[ref].s = {
            font: { name: TNR_FONT, sz: 10.5, bold: true, color: { rgb: '000000' } },
            border: BORDER_ALL_THIN,
            alignment: { vertical: 'center', horizontal: c === 4 ? 'right' : c === 0 || c === 2 ? 'center' : 'left' }
          };
        } else {
          if (c === 0 || c === 2) ws[ref].s = EXCEL_FORM_STYLES.dataCenter;
          else if (c === 1) ws[ref].s = EXCEL_FORM_STYLES.dataLeft;
          else ws[ref].s = EXCEL_FORM_STYLES.dataNumber;
        }
      }
    }

    if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_FORM_STYLES.signTitle;
    if (ws[getCellAddress(signRowStart, 3)]) ws[getCellAddress(signRowStart, 3)].s = EXCEL_FORM_STYLES.signTitle;
    if (ws[getCellAddress(signRowStart, 5)]) ws[getCellAddress(signRowStart, 5)].s = EXCEL_FORM_STYLES.signTitle;

    if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_FORM_STYLES.signSub;
    if (ws[getCellAddress(signRowStart + 1, 3)]) ws[getCellAddress(signRowStart + 1, 3)].s = EXCEL_FORM_STYLES.signSub;
    if (ws[getCellAddress(signRowStart + 1, 5)]) ws[getCellAddress(signRowStart + 1, 5)].s = EXCEL_FORM_STYLES.signSub;

    if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_FORM_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 3)]) ws[getCellAddress(signRowStart + 4, 3)].s = EXCEL_FORM_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 5)]) ws[getCellAddress(signRowStart + 4, 5)].s = EXCEL_FORM_STYLES.signName;

    XLSX.utils.book_append_sheet(wb, ws, 'QUYET_TOAN_B07_TLD');
    XLSX.writeFile(wb, `Bao_Cao_Quyet_Toan_B07_${safeName}_${year}.xlsx`);
  }
}

export function exportCustomVouchersToExcel(params: {
  title?: string;
  subtitle?: string;
  transactions: TradeUnionTransaction[];
  client: Client | null;
  year: number;
  signers?: UnionSignerSettings | null;
  fileName?: string;
}): void {
  const { title, subtitle, transactions, client, year, signers, fileName } = params;
  const wb = XLSX.utils.book_new();
  const unitTitle = signers?.unitTitle || 'CÔNG ĐOÀN CƠ SỞ';
  const clientName = signers?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const clientAddress = signers?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';
  const headName = signers?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const accountantName = signers?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const preparerName = signers?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const safeName = clientName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

  const mainTitle = title || `BẢNG KÊ DANH SÁCH CHỨNG TỪ THU - CHI CÔNG ĐOÀN NĂM ${year}`;

  const wsData: any[] = [
    [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', '', '', '', '', ''],
    [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [mainTitle, '', '', '', '', '', '', '', '', '', ''],
    [subtitle || `(Tổng số: ${transactions.length} chứng từ)`, '', '', '', '', '', '', '', '', '', ''],
    ['STT', 'Ngày Lập', 'Số Phiếu', 'Loại Phiếu', 'Khoản Mục Kế Toán', 'Người Nộp / Nhận Tiền', 'Nội Dung Diễn Giải Chi Tiết', 'Hình Thức', 'Số Tiền Thu (VNĐ)', 'Số Tiền Chi (VNĐ)', 'Kèm Theo']
  ];

  let totalThu = 0;
  let totalChi = 0;
  const startRow = 6;

  transactions.forEach((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) totalThu += t.amount;
    else totalChi += t.amount;

    wsData.push([
      idx + 1,
      t.date,
      t.voucherNo,
      isThu ? 'Phiếu Thu (C40)' : 'Phiếu Chi (C41)',
      getTradeUnionCategoryLabel(t.category),
      t.personName,
      t.reason,
      t.paymentMethod === 'BANK' ? 'Ngân hàng' : 'Tiền mặt',
      isThu ? t.amount : 0,
      !isThu ? t.amount : 0,
      t.attachedDocs || '01'
    ]);
  });

  const totalRowIdx = wsData.length;
  wsData.push(['', '', '', '', '', '', 'TỔNG CỘNG PHÁT SINH:', '', totalThu, totalChi, '']);
  const balanceRowIdx = wsData.length;
  wsData.push(['', '', '', '', '', '', 'Còn DÒNG TIỀN (THU - CHI):', '', totalThu - totalChi, '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '']);

  const signRowStart = wsData.length;
  wsData.push(['', 'NGƯỜI LẬP BIỂU', '', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', '', 'CHỦ TỊCH CĐCS', '', '']);
  wsData.push(['', '(Ký, họ tên)', '', '', '(Ký, họ tên)', '', '', '', '(Ký, họ tên, đóng dấu)', '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '', '', '']);
  wsData.push(['', preparerName, '', '', accountantName, '', '', '', headName, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } }
  ];
  ws['!cols'] = [
    { wch: 6 }, { wch: 13 }, { wch: 15 }, { wch: 16 }, { wch: 32 },
    { wch: 25 }, { wch: 45 }, { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
  ];

  // Styles
  if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;
  if (ws['A5']) ws['A5'].s = EXCEL_STYLES.subTitle;

  for (let c = 0; c <= 10; c++) {
    const ref = getCellAddress(5, c);
    if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < transactions.length; i++) {
    const r = startRow + i;
    const isOdd = i % 2 === 1;
    if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
    if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_STYLES.dataCellLeft(isOdd, true);
    if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws[getCellAddress(r, 7)]) ws[getCellAddress(r, 7)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 8)]) ws[getCellAddress(r, 8)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws[getCellAddress(r, 9)]) ws[getCellAddress(r, 9)].s = EXCEL_STYLES.dataAmountChi(isOdd);
    if (ws[getCellAddress(r, 10)]) ws[getCellAddress(r, 10)].s = EXCEL_STYLES.dataCellCenter(isOdd);
  }

  for (let c = 0; c <= 10; c++) {
    const ref = getCellAddress(totalRowIdx, c);
    if (c === 6) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c === 8) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountThu; }
    else if (c === 9) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountChi; }
    else { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowEmpty; }

    const refB = getCellAddress(balanceRowIdx, c);
    if (c === 6) { if (ws[refB]) ws[refB].s = EXCEL_STYLES.balanceRowLabel; }
    else if (c === 8) { if (ws[refB]) ws[refB].s = EXCEL_STYLES.balanceRowAmount; }
    else { if (ws[refB]) ws[refB].s = EXCEL_STYLES.balanceRowEmpty; }
  }

  // Chữ ký
  if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_STYLES.signRole;
  if (ws[getCellAddress(signRowStart, 4)]) ws[getCellAddress(signRowStart, 4)].s = EXCEL_STYLES.signRole;
  if (ws[getCellAddress(signRowStart, 8)]) ws[getCellAddress(signRowStart, 8)].s = EXCEL_STYLES.signRole;

  if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws[getCellAddress(signRowStart + 1, 4)]) ws[getCellAddress(signRowStart + 1, 4)].s = EXCEL_STYLES.signNote;
  if (ws[getCellAddress(signRowStart + 1, 8)]) ws[getCellAddress(signRowStart + 1, 8)].s = EXCEL_STYLES.signNote;

  if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws[getCellAddress(signRowStart + 4, 4)]) ws[getCellAddress(signRowStart + 4, 4)].s = EXCEL_STYLES.signName;
  if (ws[getCellAddress(signRowStart + 4, 8)]) ws[getCellAddress(signRowStart + 4, 8)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws, 'DANH_SACH_THU_CHI');
  const targetFileName = fileName || `Danh_Sach_Thu_Chi_${safeName}_${year}.xlsx`;
  XLSX.writeFile(wb, targetFileName);
}

// =========================================================================
// 8. CÁC HÀM XỬ LÝ BIẾN ĐỘNG THÁNG, QUÝ & TỔNG HỢP NĂM (SHEET TC)
// =========================================================================

/**
 * Tính toán chi tiết trích nộp cho 1 thành viên theo lương và trạng thái (Đi làm, Thai sản, Nghỉ việc)
 */
export function recalculateMemberContribution(
  m: Partial<TradeUnionMemberContribution> & { fullName: string; insuranceSalary?: number },
  doanPhiRate: number = 0.005,
  doanPhiRetainedRate: number = 0.70
): TradeUnionMemberContribution {
  const status = m.status || 'ACTIVE';
  const stt = m.stt || 1;
  const fullName = (m.fullName || '').trim();
  const employeeId = m.employeeId;
  const employeeCode = m.employeeCode;

  if (status === 'MATERNITY') {
    return {
      stt,
      employeeId,
      employeeCode,
      fullName,
      insuranceSalary: 0,
      status: 'MATERNITY',
      kpcdRetainedAmount: 0,
      kpcdSuperiorAmount: 0,
      doanPhiRetainedAmount: 0,
      doanPhiSuperiorAmount: 0,
      totalAmount: 0,
      notes: m.notes?.trim() || 'Nghỉ thai sản',
    };
  }

  if (status === 'UNPAID_LEAVE') {
    return {
      stt,
      employeeId,
      employeeCode,
      fullName,
      insuranceSalary: 0,
      status: 'UNPAID_LEAVE',
      kpcdRetainedAmount: 0,
      kpcdSuperiorAmount: 0,
      doanPhiRetainedAmount: 0,
      doanPhiSuperiorAmount: 0,
      totalAmount: 0,
      notes: m.notes?.trim() || 'Nghỉ không lương',
    };
  }

  if (status === 'RESIGNED') {
    return {
      stt,
      employeeId,
      employeeCode,
      fullName,
      insuranceSalary: 0,
      status: 'RESIGNED',
      kpcdRetainedAmount: 0,
      kpcdSuperiorAmount: 0,
      doanPhiRetainedAmount: 0,
      doanPhiSuperiorAmount: 0,
      totalAmount: 0,
      notes: m.notes?.trim() || 'Đã thôi việc',
    };
  }

  const salary = Math.max(0, Number(m.insuranceSalary) || 0);
  const kpcdRetainedAmount = Math.round(salary * 0.02 * 0.75);
  const kpcdSuperiorAmount = Math.round(salary * 0.02 * 0.25);
  const doanPhiRetainedAmount = Math.round(salary * doanPhiRate * doanPhiRetainedRate);
  const doanPhiSuperiorAmount = Math.round(salary * doanPhiRate * (1 - doanPhiRetainedRate));
  const totalAmount = kpcdRetainedAmount + kpcdSuperiorAmount + doanPhiRetainedAmount + doanPhiSuperiorAmount;

  return {
    stt,
    employeeId,
    employeeCode,
    fullName,
    insuranceSalary: salary,
    status: 'ACTIVE',
    kpcdRetainedAmount,
    kpcdSuperiorAmount,
    doanPhiRetainedAmount,
    doanPhiSuperiorAmount,
    totalAmount,
    notes: m.notes || '',
  };
}

/**
 * Tính toán lại toàn bộ kỳ trích nộp tháng
 */
export function recalculateContributionPeriod(
  period: Partial<TradeUnionContributionPeriod> & { periodKey: string; periodLabel: string; year: number; members: TradeUnionMemberContribution[] },
  doanPhiRate: number = 0.005,
  doanPhiRetainedRate: number = 0.70
): TradeUnionContributionPeriod {
  const members = (period.members || []).map((m, idx) => ({
    ...recalculateMemberContribution(m, doanPhiRate, doanPhiRetainedRate),
    stt: idx + 1,
  }));

  const activeEmployees = members.filter(m => m.status !== 'RESIGNED');
  const activeMembers = members.filter(m => m.status === 'ACTIVE' && m.insuranceSalary > 0);

  const totalInsuranceSalary = members.reduce((sum, m) => sum + m.insuranceSalary, 0);
  const totalKpcdRetained = members.reduce((sum, m) => sum + m.kpcdRetainedAmount, 0);
  const totalKpcdSuperior = members.reduce((sum, m) => sum + m.kpcdSuperiorAmount, 0);
  const totalKpcd = totalKpcdRetained + totalKpcdSuperior;

  const totalDoanPhiRetained = members.reduce((sum, m) => sum + m.doanPhiRetainedAmount, 0);
  const totalDoanPhiSuperior = members.reduce((sum, m) => sum + m.doanPhiSuperiorAmount, 0);
  const totalDoanPhi = totalDoanPhiRetained + totalDoanPhiSuperior;

  const netPayableToSuperior = totalKpcdSuperior + totalDoanPhiSuperior;

  return {
    periodKey: period.periodKey,
    periodLabel: period.periodLabel,
    periodType: period.periodType || 'MONTH',
    year: period.year,
    month: period.month,
    quarter: period.quarter,
    totalEmployees: activeEmployees.length,
    totalMembers: activeMembers.length,
    totalInsuranceSalary,
    totalKpcd,
    totalKpcdRetained,
    totalKpcdSuperior,
    totalDoanPhi,
    totalDoanPhiRetained,
    totalDoanPhiSuperior,
    netPayableToSuperior,
    reportDate: period.reportDate,
    preparerName: period.preparerName,
    members,
  };
}

/**
 * Tự động tạo kỳ Quý (Q1, Q2, Q3, Q4) từ 3 tháng tương ứng
 */
export function generateQuarterlyContributionPeriod(
  quarter: 1 | 2 | 3 | 4,
  year: number,
  monthlyPeriods: TradeUnionContributionPeriod[],
  doanPhiRate: number = 0.005,
  doanPhiRetainedRate: number = 0.70
): TradeUnionContributionPeriod {
  const startMonth = (quarter - 1) * 3 + 1;
  const targetMonths = [startMonth, startMonth + 1, startMonth + 2];

  // Tìm 3 tháng trong danh sách
  const matchingMonths = targetMonths.map(m => {
    const key = `${String(m).padStart(2, '0')}${year}`;
    return monthlyPeriods.find(p => p.periodKey === key || p.month === m);
  }).filter(Boolean) as TradeUnionContributionPeriod[];

  // Gộp danh sách nhân viên từ các tháng
  const memberMap = new Map<string, TradeUnionMemberContribution>();

  matchingMonths.forEach(mPeriod => {
    mPeriod.members.forEach(m => {
      const key = m.fullName.trim();
      const existing = memberMap.get(key);
      if (!existing) {
        memberMap.set(key, { ...m });
      } else {
        existing.insuranceSalary += m.insuranceSalary;
        existing.kpcdRetainedAmount += m.kpcdRetainedAmount;
        existing.kpcdSuperiorAmount += m.kpcdSuperiorAmount;
        existing.doanPhiRetainedAmount += m.doanPhiRetainedAmount;
        existing.doanPhiSuperiorAmount += m.doanPhiSuperiorAmount;
        existing.totalAmount += m.totalAmount;
        if (m.notes && !existing.notes?.includes(m.notes)) {
          existing.notes = existing.notes ? `${existing.notes}, ${m.notes}` : m.notes;
        }
      }
    });
  });

  const members = Array.from(memberMap.values()).map((m, idx) => ({ ...m, stt: idx + 1 }));

  return recalculateContributionPeriod({
    periodKey: `Q${quarter}.${year}`,
    periodLabel: `Quý 0${quarter} năm ${year}`,
    periodType: 'QUARTER',
    year,
    quarter,
    members,
  }, doanPhiRate, doanPhiRetainedRate);
}

/**
 * Tự động tổng hợp 12 tháng cả năm (Sheet TC - BẢNG TÍNH KINH PHÍ, ĐOÀN PHÍ CÔNG ĐOÀN)
 */
export function generateYearSummaryTC(
  year: number,
  monthlyPeriods: TradeUnionContributionPeriod[],
  client?: Client
): TradeUnionYearSummaryTC {
  const monthlyRows: TradeUnionMonthlyYearSummaryRow[] = [];

  for (let m = 1; m <= 12; m++) {
    const key = `${String(m).padStart(2, '0')}${year}`;
    const period = monthlyPeriods.find(p => p.periodKey === key || (p.month === m && p.year === year));

    if (period) {
      monthlyRows.push({
        monthNumber: m,
        monthLabel: `Tháng ${m}/${year}`,
        employeeCount: period.totalEmployees,
        insuranceSalaryFund: period.totalInsuranceSalary,
        kpcdTotal2Pct: period.totalKpcd,
        kpcdRetained75Pct: period.totalKpcdRetained,
        kpcdPayable25Pct: period.totalKpcdSuperior,
        doanPhiRetained70Pct: period.totalDoanPhiRetained,
        doanPhiPayable30Pct: period.totalDoanPhiSuperior,
        totalContribution: period.totalKpcd + period.totalDoanPhi,
      });
    } else {
      monthlyRows.push({
        monthNumber: m,
        monthLabel: `Tháng ${m}/${year}`,
        employeeCount: 0,
        insuranceSalaryFund: 0,
        kpcdTotal2Pct: 0,
        kpcdRetained75Pct: 0,
        kpcdPayable25Pct: 0,
        doanPhiRetained70Pct: 0,
        doanPhiPayable30Pct: 0,
        totalContribution: 0,
      });
    }
  }

  const validMonths = monthlyRows.filter(r => r.employeeCount > 0);
  const totalEmployeeAverage = validMonths.length > 0
    ? Math.round(validMonths.reduce((sum, r) => sum + r.employeeCount, 0) / validMonths.length)
    : 0;

  const totalInsuranceSalaryFund = monthlyRows.reduce((sum, r) => sum + r.insuranceSalaryFund, 0);
  const totalKpcd2Pct = monthlyRows.reduce((sum, r) => sum + r.kpcdTotal2Pct, 0);
  const totalKpcdRetained75Pct = monthlyRows.reduce((sum, r) => sum + r.kpcdRetained75Pct, 0);
  const totalKpcdPayable25Pct = monthlyRows.reduce((sum, r) => sum + r.kpcdPayable25Pct, 0);
  const totalDoanPhiRetained70Pct = monthlyRows.reduce((sum, r) => sum + r.doanPhiRetained70Pct, 0);
  const totalDoanPhiPayable30Pct = monthlyRows.reduce((sum, r) => sum + r.doanPhiPayable30Pct, 0);
  const grandTotalContribution = monthlyRows.reduce((sum, r) => sum + r.totalContribution, 0);

  return {
    year,
    companyName: client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    companyAddress: client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM',
    taxCode: client?.taxCode || '0309178743',
    monthlyRows,
    totalEmployeeAverage,
    totalInsuranceSalaryFund,
    totalKpcd2Pct,
    totalKpcdRetained75Pct,
    totalKpcdPayable25Pct,
    totalDoanPhiRetained70Pct,
    totalDoanPhiPayable30Pct,
    grandTotalContribution,
  };
}

/**
 * Sinh HTML In Bảng Trích Nộp Tháng / Quý chuẩn A4
 */
export function generateContributionReportHTML(
  period: TradeUnionContributionPeriod,
  signerSettings?: UnionSignerSettings,
  client?: Client
): string {
  const companyName = signerSettings?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const preparer = signerSettings?.preparerName || period.preparerName || 'Nguyễn Thị Cẩm Ly';
  const isQuarter = period.periodType === 'QUARTER';
  const title = isQuarter
    ? `DANH SÁCH TRÍCH NỘP PHÍ CÔNG ĐOÀN ${period.periodLabel.toUpperCase()}`
    : `DANH SÁCH TRÍCH NỘP PHÍ CÔNG ĐOÀN ${period.periodLabel.toUpperCase()}`;

  const rows = period.members.map((m, idx) => `
    <tr>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 5px;">${idx + 1}</td>
      <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: 600;">${m.fullName}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace;">${formatNumber(m.insuranceSalary)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; color: #047857;">${formatNumber(m.kpcdRetainedAmount)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; color: #64748b;">${formatNumber(m.kpcdSuperiorAmount)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; color: #047857;">${formatNumber(m.doanPhiRetainedAmount)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; color: #64748b;">${formatNumber(m.doanPhiSuperiorAmount)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 5px 8px; font-family: monospace; font-weight: bold;">${formatNumber(m.totalAmount)}</td>
      <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-style: italic; color: #64748b;">${m.notes || ''}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm 15mm; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #0f172a; margin: 0; padding: 15px; }
      .header-table { width: 100%; margin-bottom: 12px; }
      .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 10px 0 4px; text-transform: uppercase; color: #1e3a8a; }
      .sub-title { text-align: center; font-size: 9.5pt; font-style: italic; color: #b91c1c; margin-bottom: 12px; }
      .data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      .data-table th { border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 6px 4px; font-size: 10pt; font-weight: bold; text-align: center; }
      .total-row td { border: 1px solid #94a3b8; background-color: #fef3c7; font-weight: bold; padding: 6px 8px; }
      .red-total-row td { border: none; font-weight: bold; color: #b91c1c; padding: 4px 8px; }
      .signature-block { width: 100%; margin-top: 20px; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td style="font-weight: bold; font-size: 11pt; color: #1e3a8a;">${companyName.toUpperCase()}</td>
        <td style="text-align: right; font-size: 9.5pt; color: #b91c1c; font-style: italic;">
          Theo QĐ 61/QĐ-TLĐ (Đoàn phí 0.5% từ 01/07/2025)
        </td>
      </tr>
    </table>

    <div class="title">${title}</div>

    <table class="data-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 35px;">STT</th>
          <th rowspan="2" style="width: 180px;">Họ & Tên</th>
          <th rowspan="2" style="width: 100px;">Mức Lương Đóng</th>
          <th colspan="2">Trích Đóng 2% KPCĐ</th>
          <th colspan="2">Trích Đóng 0.5% Đoàn Phí</th>
          <th rowspan="2" style="width: 100px;">Tổng Cộng</th>
          <th rowspan="2" style="width: 120px;">Ghi Chú</th>
        </tr>
        <tr>
          <th style="width: 95px;">CĐ Cty giữ 75%</th>
          <th style="width: 95px;">LĐ VN giữ 25%</th>
          <th style="width: 95px;">CĐ Cty giữ 70%</th>
          <th style="width: 95px;">LĐ QTP giữ 30%</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2" style="text-align: center;">TỔNG CỘNG</td>
          <td style="text-align: right; font-family: monospace;">${formatNumber(period.totalInsuranceSalary)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${formatNumber(period.totalKpcdRetained)}</td>
          <td style="text-align: right; font-family: monospace; color: #64748b;">${formatNumber(period.totalKpcdSuperior)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${formatNumber(period.totalDoanPhiRetained)}</td>
          <td style="text-align: right; font-family: monospace; color: #64748b;">${formatNumber(period.totalDoanPhiSuperior)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 11pt;">${formatNumber(period.totalInsuranceSalary > 0 ? Math.round(period.totalInsuranceSalary * 0.025) : 0)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <table style="width: 100%; margin-top: 4px;">
      <tr>
        <td style="width: 250px;"></td>
        <td style="text-align: center; color: #b91c1c; font-weight: bold; font-size: 11pt;">
          Tổng 2% KPCĐ: ${formatNumber(period.totalKpcd)} đ
        </td>
        <td style="width: 250px;"></td>
      </tr>
    </table>

    <table class="signature-block">
      <tr>
        <td style="width: 50%;"></td>
        <td style="width: 50%; text-align: center;">
          <div style="font-style: italic; font-size: 10pt; margin-bottom: 5px;">
            ${period.reportDate ? period.reportDate : `Ngày 01 tháng ${String(period.month || 1).padStart(2, '0')} năm ${period.year}`}
          </div>
          <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">Người Lập</div>
          <div style="font-style: italic; font-size: 9.5pt; color: #64748b; margin-bottom: 50px;">(Ký, họ tên)</div>
          <div style="font-weight: bold; font-size: 11pt;">${preparer}</div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Sinh HTML In Bảng Tổng Hợp Cả Năm (Sheet TC)
 */
export function generateYearSummaryTCHTML(
  summary: TradeUnionYearSummaryTC,
  signerSettings?: UnionSignerSettings
): string {
  const accountant = signerSettings?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const headName = signerSettings?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const preparer = signerSettings?.preparerName || 'Nguyễn Thị Cẩm Ly';

  const rows = summary.monthlyRows.map(r => `
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600;">${r.monthLabel}</td>
      <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${r.employeeCount || '-'}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace;">${formatNumber(r.insuranceSalaryFund)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace;">${formatNumber(r.kpcdTotal2Pct)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; color: #047857;">${formatNumber(r.kpcdRetained75Pct)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; color: #b91c1c;">${formatNumber(r.kpcdPayable25Pct)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; color: #047857;">${formatNumber(r.doanPhiRetained70Pct)}</td>
      <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; color: #b91c1c;">${formatNumber(r.doanPhiPayable30Pct)}</td>
    </tr>
  `).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>BẢNG TÍNH KINH PHÍ, ĐOÀN PHÍ CÔNG ĐOÀN NĂM ${summary.year}</title>
    <style>
      @page { size: A4 landscape; margin: 12mm 15mm; }
      body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #0f172a; margin: 0; padding: 15px; }
      .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 12px 0 16px; text-transform: uppercase; color: #1e3a8a; }
      .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      .data-table th { border: 1px solid #94a3b8; background-color: #f1f5f9; padding: 6px 4px; font-size: 10pt; font-weight: bold; text-align: center; }
      .total-row td { border: 1px solid #94a3b8; background-color: #fef3c7; font-weight: bold; padding: 6px 8px; }
      .signature-block { width: 100%; margin-top: 25px; page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <div>
      <div style="font-weight: bold; font-size: 11pt; color: #1e3a8a;">${summary.companyName.toUpperCase()}</div>
      <div style="font-size: 9.5pt; color: #475569; font-style: italic;">Địa chỉ: ${summary.companyAddress}</div>
      <div style="font-size: 9.5pt; color: #475569;">Mã Số Thuế: ${summary.taxCode}</div>
    </div>

    <div class="title">BẢNG TÍNH KINH PHÍ, ĐOÀN PHÍ CÔNG ĐOÀN NĂM ${summary.year}</div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 120px;">Tháng/Năm Phát Sinh<br><span style="font-weight: normal; font-size: 8.5pt;">(1)</span></th>
          <th style="width: 70px;">Số Lao Động<br><span style="font-weight: normal; font-size: 8.5pt;">(2)</span></th>
          <th style="width: 120px;">Quỹ Lương Nộp BHXH<br><span style="font-weight: normal; font-size: 8.5pt;">(3)</span></th>
          <th style="width: 110px;">Nộp 2% KPCĐ<br><span style="font-weight: normal; font-size: 8.5pt;">(4) = (3) x 2%</span></th>
          <th style="width: 110px;">Nhận 75% KPCĐ<br><span style="font-weight: normal; font-size: 8.5pt;">(5) = (4) x 75%</span></th>
          <th style="width: 110px;">Thực Đóng (25%)<br><span style="font-weight: normal; font-size: 8.5pt;">(6) = (4) - (5)</span></th>
          <th style="width: 115px;">CĐ Cty Giữ 70% ĐP<br><span style="font-weight: normal; font-size: 8.5pt;">(7) = (3) x 0.5% x 70%</span></th>
          <th style="width: 115px;">Nộp 30% ĐP (0.5%)<br><span style="font-weight: normal; font-size: 8.5pt;">(8) = (3) x 0.5% x 30%</span></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td style="text-align: center;">TỔNG CỘNG</td>
          <td style="text-align: center;">${summary.totalEmployeeAverage || '-'}</td>
          <td style="text-align: right; font-family: monospace;">${formatNumber(summary.totalInsuranceSalaryFund)}</td>
          <td style="text-align: right; font-family: monospace;">${formatNumber(summary.totalKpcd2Pct)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${formatNumber(summary.totalKpcdRetained75Pct)}</td>
          <td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatNumber(summary.totalKpcdPayable25Pct)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${formatNumber(summary.totalDoanPhiRetained70Pct)}</td>
          <td style="text-align: right; font-family: monospace; color: #b91c1c;">${formatNumber(summary.totalDoanPhiPayable30Pct)}</td>
        </tr>
      </tbody>
    </table>

    <table class="signature-block">
      <tr>
        <td style="width: 33%; text-align: center;">
          <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">Người Lập Biểu</div>
          <div style="font-style: italic; font-size: 9.5pt; color: #64748b; margin-bottom: 50px;">(Ký, họ tên)</div>
          <div style="font-weight: bold; font-size: 11pt;">${preparer}</div>
        </td>
        <td style="width: 33%; text-align: center;">
          <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">Kế Toán Công Đoàn</div>
          <div style="font-style: italic; font-size: 9.5pt; color: #64748b; margin-bottom: 50px;">(Ký, họ tên)</div>
          <div style="font-weight: bold; font-size: 11pt;">${accountant}</div>
        </td>
        <td style="width: 34%; text-align: center;">
          <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">Chủ Tịch CĐCS</div>
          <div style="font-style: italic; font-size: 9.5pt; color: #64748b; margin-bottom: 50px;">(Ký, họ tên, đóng dấu)</div>
          <div style="font-weight: bold; font-size: 11pt;">${headName}</div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

/**
 * Xuất Bảng Trích Nộp Tháng / Quý ra Excel trang trí đẹp
 */
export function exportContributionPeriodToExcel(
  period: TradeUnionContributionPeriod,
  client?: Client,
  signerSettings?: UnionSignerSettings
) {
  const wb = XLSX.utils.book_new();
  const companyName = signerSettings?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const companyAddress = signerSettings?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';
  const preparerName = signerSettings?.preparerName || period.preparerName || 'Nguyễn Thị Cẩm Ly';
  const isQuarter = period.periodType === 'QUARTER';
  const sheetTitle = isQuarter
    ? `DANH SÁCH TRÍCH NỘP PHÍ CÔNG ĐOÀN ${period.periodLabel.toUpperCase()}`
    : `DANH SÁCH TRÍCH NỘP PHÍ CÔNG ĐOÀN ${period.periodLabel.toUpperCase()}`;

  const wsData: any[][] = [
    [companyName, '', '', '', '', '', '', '', ''],
    [companyAddress, '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    [sheetTitle, '', '', '', '', '', '', '', ''],
    ['Theo Quyết định số 61/QĐ-TLĐ ngày 29/07/2025. Mức đóng đoàn phí là 0.5% có hiệu lực từ 01/07/2025', '', '', '', '', '', '', '', ''],
    ['STT', 'Họ & Tên', 'Mức Lương Đóng', 'Trích Đóng 2% KPCĐ', '', 'Trích Đóng 0.5% Đoàn Phí', '', 'Tổng Cộng', 'Ghi Chú'],
    ['', '', '', 'CĐ Cty giữ 75%', 'LĐ VN giữ 25%', 'CĐ Cty giữ 70%', 'LĐ QTP giữ 30%', '', '']
  ];

  const startRow = 7;
  period.members.forEach((m, idx) => {
    wsData.push([
      idx + 1,
      m.fullName,
      m.insuranceSalary,
      m.kpcdRetainedAmount,
      m.kpcdSuperiorAmount,
      m.doanPhiRetainedAmount,
      m.doanPhiSuperiorAmount,
      m.totalAmount,
      m.notes || ''
    ]);
  });

  const totalRowIdx = wsData.length;
  wsData.push([
    '', 'TỔNG CỘNG',
    period.totalInsuranceSalary,
    period.totalKpcdRetained,
    period.totalKpcdSuperior,
    period.totalDoanPhiRetained,
    period.totalDoanPhiSuperior,
    period.totalInsuranceSalary > 0 ? Math.round(period.totalInsuranceSalary * 0.025) : 0,
    ''
  ]);

  const redRowIdx = wsData.length;
  wsData.push(['', '', '', `Tổng 2% KPCĐ: ${formatNumber(period.totalKpcd)} đ`, '', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '']);

  const signRowStart = wsData.length;
  wsData.push(['', '', '', '', period.reportDate ? period.reportDate : `Ngày 01 tháng ${String(period.month || 1).padStart(2, '0')} năm ${period.year}`, '', '', '', '']);
  wsData.push(['', '', '', '', 'NGƯỜI LẬP BIỂU', '', '', '', '']);
  wsData.push(['', '', '', '', '(Ký, họ tên)', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '', '', '']);
  wsData.push(['', '', '', '', preparerName, '', '', '', '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } },
    { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } },
    { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } },
    { s: { r: 5, c: 7 }, e: { r: 6, c: 7 } },
    { s: { r: 5, c: 8 }, e: { r: 6, c: 8 } },
    { s: { r: redRowIdx, c: 3 }, e: { r: redRowIdx, c: 4 } },
  ];

  ws['!cols'] = [
    { wch: 6 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 }
  ];

  if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;
  if (ws['A5']) ws['A5'].s = { font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: 'B91C1C' } }, alignment: { horizontal: 'center' } };

  for (let c = 0; c <= 8; c++) {
    const ref1 = getCellAddress(5, c);
    const ref2 = getCellAddress(6, c);
    if (ws[ref1]) ws[ref1].s = EXCEL_STYLES.tableHeader;
    if (ws[ref2]) ws[ref2].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < period.members.length; i++) {
    const r = startRow + i;
    const isOdd = i % 2 === 1;
    if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellLeft(isOdd, true);
    if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    if (ws[getCellAddress(r, 7)]) ws[getCellAddress(r, 7)].s = { ...EXCEL_STYLES.dataAmountNeutral(isOdd), font: { name: 'Segoe UI', sz: 10, bold: true } };
    if (ws[getCellAddress(r, 8)]) ws[getCellAddress(r, 8)].s = EXCEL_STYLES.dataCellLeft(isOdd);
  }

  for (let c = 0; c <= 8; c++) {
    const ref = getCellAddress(totalRowIdx, c);
    if (c === 1) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c >= 2 && c <= 7) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountThu; }
    else { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowEmpty; }
  }

  const redCell = ws[getCellAddress(redRowIdx, 3)];
  if (redCell) {
    redCell.s = {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'B91C1C' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  if (ws[getCellAddress(signRowStart + 1, 4)]) ws[getCellAddress(signRowStart + 1, 4)].s = EXCEL_STYLES.signRole;
  if (ws[getCellAddress(signRowStart + 2, 4)]) ws[getCellAddress(signRowStart + 2, 4)].s = EXCEL_STYLES.signNote;
  if (ws[getCellAddress(signRowStart + 5, 4)]) ws[getCellAddress(signRowStart + 5, 4)].s = EXCEL_STYLES.signName;

  const sheetSafeName = period.periodKey.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, sheetSafeName);
  XLSX.writeFile(wb, `Trich_Nop_Phi_Cong_Doan_${sheetSafeName}.xlsx`);
}

/**
 * Xuất Bảng Tổng Hợp Cả Năm (Sheet TC) ra Excel
 */
export function exportYearSummaryTCToExcel(
  summary: TradeUnionYearSummaryTC,
  client?: Client,
  signerSettings?: UnionSignerSettings
) {
  const wb = XLSX.utils.book_new();
  const companyName = summary.companyName;
  const companyAddress = summary.companyAddress;
  const preparerName = signerSettings?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const accountantName = signerSettings?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const headName = signerSettings?.headOfUnitName || 'Ngô Thị Bích Ngọc';

  const wsData: any[][] = [
    [companyName, '', '', '', '', '', '', ''],
    [`Địa Chỉ: ${companyAddress}`, '', '', '', '', '', '', ''],
    [`Mã Số Thuế: ${summary.taxCode}`, '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    [`BẢNG TÍNH KINH PHÍ, ĐOÀN PHÍ CÔNG ĐOÀN NĂM ${summary.year}`, '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    [
      'Tháng/ Năm Phát Sinh\n(1)',
      'Số Lao Động\n(2)',
      'Quỹ lương làm căn cứ nộp BHXH\n(3)',
      'Nộp 2% Kinh Phí Công Đoàn\n(4)=(3) x 2%',
      'Nhận 75% KPCĐ trên 2% đã nộp\n(5)=(4) x 75%',
      'Thực đóng\n(6)=(4) - (5)',
      'Công đoàn Cty giữ 70% Đoàn phí\n(7)=(3) x 0.5% x 70%',
      'Nộp 30% của 0.5% Đoàn Phí\n(8)=(3) x 0.5% x 30%'
    ]
  ];

  const startRow = 7;
  summary.monthlyRows.forEach(r => {
    wsData.push([
      r.monthLabel,
      r.employeeCount || '',
      r.insuranceSalaryFund,
      r.kpcdTotal2Pct,
      r.kpcdRetained75Pct,
      r.kpcdPayable25Pct,
      r.doanPhiRetained70Pct,
      r.doanPhiPayable30Pct
    ]);
  });

  const totalRowIdx = wsData.length;
  wsData.push([
    'TỔNG CỘNG',
    summary.totalEmployeeAverage || '',
    summary.totalInsuranceSalaryFund,
    summary.totalKpcd2Pct,
    summary.totalKpcdRetained75Pct,
    summary.totalKpcdPayable25Pct,
    summary.totalDoanPhiRetained70Pct,
    summary.totalDoanPhiPayable30Pct
  ]);

  wsData.push(['', '', '', '', '', '', '', '']);
  const signRowStart = wsData.length;
  wsData.push(['', 'NGƯỜI LẬP BIỂU', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', 'CHỦ TỊCH CĐCS', '']);
  wsData.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '', '(Ký, họ tên, đóng dấu)', '']);
  wsData.push(['', '', '', '', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '', '']);
  wsData.push(['', preparerName, '', accountantName, '', '', headName, '']);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } },
  ];

  ws['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 24 },
    { wch: 20 }, { wch: 25 }, { wch: 24 }
  ];

  if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws['A3']) ws['A3'].s = EXCEL_STYLES.companyAddress;
  if (ws['A5']) ws['A5'].s = EXCEL_STYLES.mainTitleBanner;

  for (let c = 0; c <= 7; c++) {
    const ref = getCellAddress(6, c);
    if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < summary.monthlyRows.length; i++) {
    const r = startRow + i;
    const isOdd = i % 2 === 1;
    if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellLeft(isOdd, true);
    if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountChi(isOdd);
    if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws[getCellAddress(r, 7)]) ws[getCellAddress(r, 7)].s = EXCEL_STYLES.dataAmountChi(isOdd);
  }

  for (let c = 0; c <= 7; c++) {
    const ref = getCellAddress(totalRowIdx, c);
    if (c === 0) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c === 1) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowEmpty; }
    else { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountThu; }
  }

  if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_STYLES.signRole;
  if (ws[getCellAddress(signRowStart, 3)]) ws[getCellAddress(signRowStart, 3)].s = EXCEL_STYLES.signRole;
  if (ws[getCellAddress(signRowStart, 6)]) ws[getCellAddress(signRowStart, 6)].s = EXCEL_STYLES.signRole;

  if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws[getCellAddress(signRowStart + 1, 3)]) ws[getCellAddress(signRowStart + 1, 3)].s = EXCEL_STYLES.signNote;
  if (ws[getCellAddress(signRowStart + 1, 6)]) ws[getCellAddress(signRowStart + 1, 6)].s = EXCEL_STYLES.signNote;

  if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws[getCellAddress(signRowStart + 4, 3)]) ws[getCellAddress(signRowStart + 4, 3)].s = EXCEL_STYLES.signName;
  if (ws[getCellAddress(signRowStart + 4, 6)]) ws[getCellAddress(signRowStart + 4, 6)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws, 'TC');
  XLSX.writeFile(wb, `Bang_Tinh_Kinh_Phi_Doan_Phi_TC_${summary.year}.xlsx`);
}

