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

export function calculateTradeUnionSummary(transactions: TradeUnionTransaction[]) {
  let totalReceipts = 0;
  let totalPayments = 0;
  let cashBalance = 0;
  let bankBalance = 0;

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

    if (sNameNorm.includes('SỔ TM') || sNameNorm.includes('SO TM') || sNameNorm.includes('TIỀN MẶT')) {
      let headerRowIndex = -1;
      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const row = rawRows[r];
        if (row && row.some(cell => String(cell).toUpperCase().includes('DIỄN GIẢI') || String(cell).toUpperCase().includes('SỐ HIỆU'))) {
          headerRowIndex = r;
          break;
        }
      }

      const startIdx = headerRowIndex !== -1 ? headerRowIndex + 2 : 10;

      for (let r = startIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const dateRaw = row[0] || row[1];
        const voucherNoThu = String(row[2] || '').trim();
        const voucherNoChi = String(row[3] || '').trim();
        const reason = String(row[4] || row[3] || '').trim();
        const thuAmount = Number(String(row[5] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const chiAmount = Number(String(row[6] || row[5] || 0).replace(/[^0-9.-]+/g, '')) || 0;

        if (!reason || reason.toUpperCase().includes('SỐ DƯ ĐẦU KỲ') || reason.toUpperCase().includes('CỘNG PHÁT SINH') || reason.toUpperCase().includes('SỐ DƯ CUỐI KỲ')) {
          continue;
        }

        const date = excelSerialDateToYYYYMMDD(dateRaw);

        if (thuAmount > 0) {
          const voucherNo = voucherNoThu || `PT-TM-${date.slice(0, 4)}-${String(transactions.length + 1).padStart(3, '0')}`;
          let category: TradeUnionCategory = 'DOAN_PHI_1_PERCENT';
          if (reason.toUpperCase().includes('KPCĐ') || reason.toUpperCase().includes('2%')) category = 'KPCĐ_2_PERCENT';
          else if (reason.toUpperCase().includes('CẤP TRÊN') || reason.toUpperCase().includes('KINH PHÍ CẤP')) category = 'KINH_PHI_CAP_TREN';
          else if (reason.toUpperCase().includes('HỖ TRỢ') || reason.toUpperCase().includes('TÀI TRỢ')) category = 'HO_TRO_KHAC';

          transactions.push({
            id: `tm-thu-${date}-${transactions.length}-${Math.random().toString(36).substring(2, 6)}`,
            clientId,
            voucherType: 'UNION_RECEIPT',
            voucherNo,
            date,
            category,
            personName: 'Người nộp tiền',
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

        if (chiAmount > 0) {
          const voucherNo = voucherNoChi || `PC-TM-${date.slice(0, 4)}-${String(transactions.length + 1).padStart(3, '0')}`;
          let category: TradeUnionCategory = 'THAM_HOI_OM_DAU';
          const rUp = reason.toUpperCase();
          if (rUp.includes('SINH NHẬT') || rUp.includes('ỐM ĐAU') || rUp.includes('HIẾU HỈ') || rUp.includes('THAI SẢN') || rUp.includes('THĂM HỎI')) category = 'THAM_HOI_OM_DAU';
          else if (rUp.includes('TẾT') || rUp.includes('8/3') || rUp.includes('20/10') || rUp.includes('TRUNG THU') || rUp.includes('2/9') || rUp.includes('30/4') || rUp.includes('QUÀ')) category = 'QUA_LE_TET';
          else if (rUp.includes('VĂN NGHỆ') || rUp.includes('THỂ THAO') || rUp.includes('PHONG TRÀO') || rUp.includes('DU LỊCH')) category = 'HOAT_DONG_PHONG_TRAO';
          else if (rUp.includes('KHEN THƯỞNG')) category = 'KHEN_THUONG';
          else if (rUp.includes('PHỤ CẤP') || rUp.includes('CÁN BỘ')) category = 'PHU_CAP_CAN_BO_CD';
          else if (rUp.includes('NỘP') || rUp.includes('25%') || rUp.includes('CẤP TRÊN')) category = 'NOP_CAP_TREN_25';
          else category = 'CHI_KHAC';

          transactions.push({
            id: `tm-chi-${date}-${transactions.length}-${Math.random().toString(36).substring(2, 6)}`,
            clientId,
            voucherType: 'UNION_PAYMENT',
            voucherNo,
            date,
            category,
            personName: reason.includes('đoàn viên') ? reason.split('đoàn viên')[1].split('(')[0].trim() : 'Người nhận tiền',
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
    } else if (sNameNorm.includes('SỔ NH') || sNameNorm.includes('SO NH') || sNameNorm.includes('NGÂN HÀNG')) {
      let startIdx = 12;
      for (let r = startIdx; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const voucherNo = String(row[1] || '').trim();
        const dateRaw = row[2] || row[0];
        const reason = String(row[3] || '').trim();
        const thuAmount = Number(String(row[4] || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const chiAmount = Number(String(row[5] || 0).replace(/[^0-9.-]+/g, '')) || 0;

        if (!reason || reason.toUpperCase().includes('SỐ DƯ ĐẦU KỲ') || reason.toUpperCase().includes('CỘNG PHÁT SINH') || reason.toUpperCase().includes('SỐ DƯ CUỐI KỲ')) {
          continue;
        }

        const date = excelSerialDateToYYYYMMDD(dateRaw);

        if (thuAmount > 0) {
          transactions.push({
            id: `nh-thu-${date}-${transactions.length}-${Math.random().toString(36).substring(2, 6)}`,
            clientId,
            voucherType: 'UNION_RECEIPT',
            voucherNo: voucherNo || `PT-NH-${date.slice(0, 4)}-${String(transactions.length + 1).padStart(3, '0')}`,
            date,
            category: reason.toUpperCase().includes('KPCĐ') ? 'KPCĐ_2_PERCENT' : 'KINH_PHI_CAP_TREN',
            personName: 'Ngân hàng / Cấp trên chuyển',
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

        if (chiAmount > 0) {
          transactions.push({
            id: `nh-chi-${date}-${transactions.length}-${Math.random().toString(36).substring(2, 6)}`,
            clientId,
            voucherType: 'UNION_PAYMENT',
            voucherNo: voucherNo || `UNC-${date.slice(0, 4)}-${String(transactions.length + 1).padStart(3, '0')}`,
            date,
            category: reason.toUpperCase().includes('NỘP') ? 'NOP_CAP_TREN_25' : 'CHI_KHAC',
            personName: 'Người thụ hưởng',
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
    } else if (sNameNorm.includes('BCQT') || sNameNorm.includes('QUYẾT TOÁN')) {
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
        clientName: 'CÔNG ĐOÀN CƠ SỞ',
        clientAddress: '',
        basicIndicators: {
          totalEmployeesKpcd: totalEmployeesKpcd || 10,
          salaryFundKpcd: salaryFundKpcd || 60090000,
          totalMembers: totalMembers || 10,
          salaryFundDoanPhi: salaryFundDoanPhi || 60090000,
        },
        items,
        closingCash: 0,
        closingBank: 0,
      });
    } else if (sNameNorm.includes('KIEM KE') || sNameNorm.includes('KIỂM KÊ')) {
      const denominations: Array<{ faceValue: number; count: number; total: number }> = [];
      let totalActual = 0;

      for (let r = 8; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;
        const faceVal = Number(String(row[1] || 0).replace(/[^0-9.-]+/g, ''));
        const count = Number(String(row[2] || 0).replace(/[^0-9.-]+/g, ''));
        const total = Number(String(row[3] || (faceVal * count)).replace(/[^0-9.-]+/g, ''));

        if (faceVal > 0 && count >= 0) {
          denominations.push({ faceValue: faceVal, count, total: total || (faceVal * count) });
          totalActual += (total || (faceVal * count));
        }
      }

      cashCountSheets.push({
        year: 2025,
        countDate: new Date().toISOString().slice(0, 10),
        boardMembers: [
          { name: 'Chủ tịch CĐCS', position: 'Trưởng ban kiểm kê' },
          { name: 'Kế toán CĐCS', position: 'Ủy viên' },
          { name: 'Thủ quỹ CĐCS', position: 'Ủy viên' },
        ],
        bookBalance: totalActual,
        actualBalance: totalActual,
        difference: 0,
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
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }),

  dataCellLeft: (isOdd: boolean, isBold: boolean = false) => ({
    font: { name: 'Segoe UI', sz: 10, bold: isBold, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }),

  dataVoucherCode: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1D4ED8' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }),

  dataAmountThu: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '047857' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }),

  dataAmountChi: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    }
  }),

  dataAmountNeutral: (isOdd: boolean) => ({
    font: { name: 'Segoe UI', sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: isOdd ? 'F8FAFC' : 'FFFFFF' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
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
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    },
    alignment: { vertical: 'center' }
  }
};

function getCellAddress(r: number, c: number): string {
  return XLSX.utils.encode_cell({ r, c });
}

export function exportUnionFinancialReportToExcel(
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number,
  signers?: UnionSignerSettings | null
): void {
  const wb = XLSX.utils.book_new();
  const unitTitle = signers?.unitTitle || 'CÔNG ĐOÀN CƠ SỞ';
  const clientName = signers?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const clientAddress = signers?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';
  const headName = signers?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const accountantName = signers?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const preparerName = signers?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const treasurerName = signers?.treasurerName || 'Bùi Xuân Mai Thảo';

  // -------------------------------------------------------------
  // Sheet 1: DANH SÁCH TẤT CẢ PHIẾU THU & CHI
  // -------------------------------------------------------------
  const ws1Data: any[] = [
    [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', '', '', '', '', ''],
    [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    [`BẢNG KÊ DANH SÁCH CHỨNG TỪ THU - CHI CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['STT', 'Ngày Lập', 'Số Phiếu', 'Loại Phiếu', 'Khoản Mục', 'Họ Tên Đối Tác', 'Nội Dung Diễn Giải', 'Hình Thức', 'Số Tiền Thu (VNĐ)', 'Số Tiền Chi (VNĐ)', 'Kèm Theo']
  ];

  let totalThu1 = 0;
  let totalChi1 = 0;
  const startRow1 = 6;

  transactions.forEach((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) totalThu1 += t.amount;
    else totalChi1 += t.amount;

    ws1Data.push([
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

  const totalRowIdx1 = ws1Data.length;
  ws1Data.push(['', '', '', '', '', '', 'TỔNG CỘNG PHÁT SINH:', '', totalThu1, totalChi1, '']);
  const balanceRowIdx1 = ws1Data.length;
  ws1Data.push(['', '', '', '', '', '', 'TỒN QUỸ CÒN LẠI:', '', totalThu1 - totalChi1, '', '']);
  ws1Data.push(['', '', '', '', '', '', '', '', '', '', '']);

  const signRowStart1 = ws1Data.length;
  ws1Data.push(['', 'NGƯỜI LẬP BIỂU', '', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', '', 'CHỦ TỊCH CĐCS', '', '']);
  ws1Data.push(['', '(Ký, họ tên)', '', '', '(Ký, họ tên)', '', '', '', '(Ký, họ tên, đóng dấu)', '', '']);
  ws1Data.push(['', '', '', '', '', '', '', '', '', '', '']);
  ws1Data.push(['', '', '', '', '', '', '', '', '', '', '']);
  ws1Data.push(['', preparerName, '', '', accountantName, '', '', '', headName, '', '']);

  const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } }
  ];
  ws1['!cols'] = [
    { wch: 6 },  // STT
    { wch: 13 }, // Ngày Lập
    { wch: 15 }, // Số Phiếu
    { wch: 16 }, // Loại Phiếu
    { wch: 32 }, // Khoản Mục
    { wch: 24 }, // Họ Tên
    { wch: 42 }, // Diễn Giải
    { wch: 13 }, // Hình Thức
    { wch: 20 }, // Thu
    { wch: 20 }, // Chi
    { wch: 12 }  // Kèm Theo
  ];

  // Styling ws1
  const numRows1 = ws1Data.length;
  ws1['!rows'] = Array(numRows1).fill({ hpt: 20 });
  ws1['!rows'][3] = { hpt: 32 };
  ws1['!rows'][5] = { hpt: 28 };

  // Set Styles for ws1
  if (ws1['A1']) ws1['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws1['A2']) ws1['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws1['A4']) ws1['A4'].s = EXCEL_STYLES.mainTitleBanner;

  for (let c = 0; c <= 10; c++) {
    const ref = getCellAddress(5, c);
    if (ws1[ref]) ws1[ref].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < transactions.length; i++) {
    const r = startRow1 + i;
    const isOdd = i % 2 === 1;
    if (ws1[getCellAddress(r, 0)]) ws1[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws1[getCellAddress(r, 1)]) ws1[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws1[getCellAddress(r, 2)]) ws1[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
    if (ws1[getCellAddress(r, 3)]) ws1[getCellAddress(r, 3)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws1[getCellAddress(r, 4)]) ws1[getCellAddress(r, 4)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws1[getCellAddress(r, 5)]) ws1[getCellAddress(r, 5)].s = EXCEL_STYLES.dataCellLeft(isOdd, true);
    if (ws1[getCellAddress(r, 6)]) ws1[getCellAddress(r, 6)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws1[getCellAddress(r, 7)]) ws1[getCellAddress(r, 7)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws1[getCellAddress(r, 8)]) ws1[getCellAddress(r, 8)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws1[getCellAddress(r, 9)]) ws1[getCellAddress(r, 9)].s = EXCEL_STYLES.dataAmountChi(isOdd);
    if (ws1[getCellAddress(r, 10)]) ws1[getCellAddress(r, 10)].s = EXCEL_STYLES.dataCellCenter(isOdd);
  }

  for (let c = 0; c <= 10; c++) {
    const ref = getCellAddress(totalRowIdx1, c);
    if (c === 6) { if (ws1[ref]) ws1[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c === 8) { if (ws1[ref]) ws1[ref].s = EXCEL_STYLES.totalRowAmountThu; }
    else if (c === 9) { if (ws1[ref]) ws1[ref].s = EXCEL_STYLES.totalRowAmountChi; }
    else { if (ws1[ref]) ws1[ref].s = EXCEL_STYLES.totalRowEmpty; }

    const refB = getCellAddress(balanceRowIdx1, c);
    if (c === 6) { if (ws1[refB]) ws1[refB].s = EXCEL_STYLES.balanceRowLabel; }
    else if (c === 8) { if (ws1[refB]) ws1[refB].s = EXCEL_STYLES.balanceRowAmount; }
    else { if (ws1[refB]) ws1[refB].s = EXCEL_STYLES.balanceRowEmpty; }
  }

  // Chữ ký ws1
  if (ws1[getCellAddress(signRowStart1, 1)]) ws1[getCellAddress(signRowStart1, 1)].s = EXCEL_STYLES.signRole;
  if (ws1[getCellAddress(signRowStart1, 4)]) ws1[getCellAddress(signRowStart1, 4)].s = EXCEL_STYLES.signRole;
  if (ws1[getCellAddress(signRowStart1, 8)]) ws1[getCellAddress(signRowStart1, 8)].s = EXCEL_STYLES.signRole;

  if (ws1[getCellAddress(signRowStart1 + 1, 1)]) ws1[getCellAddress(signRowStart1 + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws1[getCellAddress(signRowStart1 + 1, 4)]) ws1[getCellAddress(signRowStart1 + 1, 4)].s = EXCEL_STYLES.signNote;
  if (ws1[getCellAddress(signRowStart1 + 1, 8)]) ws1[getCellAddress(signRowStart1 + 1, 8)].s = EXCEL_STYLES.signNote;

  if (ws1[getCellAddress(signRowStart1 + 4, 1)]) ws1[getCellAddress(signRowStart1 + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws1[getCellAddress(signRowStart1 + 4, 4)]) ws1[getCellAddress(signRowStart1 + 4, 4)].s = EXCEL_STYLES.signName;
  if (ws1[getCellAddress(signRowStart1 + 4, 8)]) ws1[getCellAddress(signRowStart1 + 4, 8)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws1, 'DANH_SACH_THU_CHI');

  // -------------------------------------------------------------
  // Sheet 2: SỔ QUỸ TIỀN MẶT (MẪU S11H)
  // -------------------------------------------------------------
  const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');
  const ws2Data: any[] = [
    [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', '', 'Mẫu số: S11H'],
    [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '', '(Ban hành theo TT 107/2017/TT-BTC)'],
    ['', '', '', '', '', '', '', ''],
    [`SỔ QUỸ TIỀN MẶT CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', '', '', ''],
    ['Tài khoản tiền mặt: TK 1111', '', '', '', '', '', '', ''],
    ['STT', 'Ngày Tháng', 'Số Phiếu Thu', 'Số Phiếu Chi', 'Họ Tên & Diễn Giải Nghiệp Vụ', 'Số Tiền Thu (VNĐ)', 'Số Tiền Chi (VNĐ)', 'Tồn Quỹ (VNĐ)']
  ];

  let runningCash = 0;
  let totalCashThu = 0;
  let totalCashChi = 0;

  cashTxs.forEach((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) {
      runningCash += t.amount;
      totalCashThu += t.amount;
    } else {
      runningCash -= t.amount;
      totalCashChi += t.amount;
    }

    ws2Data.push([
      idx + 1,
      t.date,
      isThu ? t.voucherNo : '',
      !isThu ? t.voucherNo : '',
      `${t.reason} - ${t.personName}`,
      isThu ? t.amount : 0,
      !isThu ? t.amount : 0,
      runningCash
    ]);
  });

  const totalRowIdx2 = ws2Data.length;
  ws2Data.push(['', '', '', '', 'TỔNG CỘNG SỐ PHÁT SINH:', totalCashThu, totalCashChi, runningCash]);
  ws2Data.push(['', '', '', '', '', '', '', '']);

  const signRowStart2 = ws2Data.length;
  ws2Data.push(['', 'THỦ QUỸ CÔNG ĐOÀN', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', 'CHỦ TỊCH CĐCS', '']);
  ws2Data.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '', '(Ký, họ tên, đóng dấu)', '']);
  ws2Data.push(['', '', '', '', '', '', '', '']);
  ws2Data.push(['', '', '', '', '', '', '', '']);
  ws2Data.push(['', treasurerName, '', accountantName, '', '', headName, '']);

  const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }
  ];
  ws2['!cols'] = [
    { wch: 6 },  // STT
    { wch: 13 }, // Ngày
    { wch: 16 }, // Thu
    { wch: 16 }, // Chi
    { wch: 45 }, // Diễn giải
    { wch: 20 }, // Thu
    { wch: 20 }, // Chi
    { wch: 22 }  // Tồn
  ];

  // Styling ws2
  if (ws2['A1']) ws2['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws2['A2']) ws2['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws2['H1']) ws2['H1'].s = EXCEL_STYLES.formCode;
  if (ws2['H2']) ws2['H2'].s = EXCEL_STYLES.formSubCode;
  if (ws2['A4']) ws2['A4'].s = EXCEL_STYLES.mainTitleBanner;
  if (ws2['A5']) ws2['A5'].s = EXCEL_STYLES.subTitle;

  for (let c = 0; c <= 7; c++) {
    const ref = getCellAddress(5, c);
    if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.tableHeaderTeal;
  }

  for (let i = 0; i < cashTxs.length; i++) {
    const r = 6 + i;
    const isOdd = i % 2 === 1;
    if (ws2[getCellAddress(r, 0)]) ws2[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws2[getCellAddress(r, 1)]) ws2[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws2[getCellAddress(r, 2)]) ws2[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
    if (ws2[getCellAddress(r, 3)]) ws2[getCellAddress(r, 3)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
    if (ws2[getCellAddress(r, 4)]) ws2[getCellAddress(r, 4)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws2[getCellAddress(r, 5)]) ws2[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws2[getCellAddress(r, 6)]) ws2[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountChi(isOdd);
    if (ws2[getCellAddress(r, 7)]) ws2[getCellAddress(r, 7)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
  }

  for (let c = 0; c <= 7; c++) {
    const ref = getCellAddress(totalRowIdx2, c);
    if (c === 4) { if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c === 5) { if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.totalRowAmountThu; }
    else if (c === 6) { if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.totalRowAmountChi; }
    else if (c === 7) { if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.balanceRowAmount; }
    else { if (ws2[ref]) ws2[ref].s = EXCEL_STYLES.totalRowEmpty; }
  }

  // Chữ ký ws2
  if (ws2[getCellAddress(signRowStart2, 1)]) ws2[getCellAddress(signRowStart2, 1)].s = EXCEL_STYLES.signRole;
  if (ws2[getCellAddress(signRowStart2, 3)]) ws2[getCellAddress(signRowStart2, 3)].s = EXCEL_STYLES.signRole;
  if (ws2[getCellAddress(signRowStart2, 6)]) ws2[getCellAddress(signRowStart2, 6)].s = EXCEL_STYLES.signRole;

  if (ws2[getCellAddress(signRowStart2 + 1, 1)]) ws2[getCellAddress(signRowStart2 + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws2[getCellAddress(signRowStart2 + 1, 3)]) ws2[getCellAddress(signRowStart2 + 1, 3)].s = EXCEL_STYLES.signNote;
  if (ws2[getCellAddress(signRowStart2 + 1, 6)]) ws2[getCellAddress(signRowStart2 + 1, 6)].s = EXCEL_STYLES.signNote;

  if (ws2[getCellAddress(signRowStart2 + 4, 1)]) ws2[getCellAddress(signRowStart2 + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws2[getCellAddress(signRowStart2 + 4, 3)]) ws2[getCellAddress(signRowStart2 + 4, 3)].s = EXCEL_STYLES.signName;
  if (ws2[getCellAddress(signRowStart2 + 4, 6)]) ws2[getCellAddress(signRowStart2 + 4, 6)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws2, 'SO_QUY_TIEN_MAT_S11H');

  // -------------------------------------------------------------
  // Sheet 3: SỔ TIỀN GỬI NGÂN HÀNG (MẪU S12-H)
  // -------------------------------------------------------------
  const bankTxs = transactions.filter(t => t.paymentMethod === 'BANK');
  const ws3Data: any[] = [
    [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', 'Mẫu số: S12-H'],
    [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '(Ban hành theo TT 107/2017/TT-BTC)'],
    ['', '', '', '', '', '', ''],
    [`SỔ TIỀN GỬI NGÂN HÀNG CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', '', ''],
    ['Tài khoản tiền gửi: TK 1121', '', '', '', '', '', ''],
    ['STT', 'Ngày Tháng', 'Số Chứng Từ / UNC', 'Nội Dung Giao Dịch', 'Gửi Vào / Thu (VNĐ)', 'Rút Ra / Chi (VNĐ)', 'Số Dư Cuối (VNĐ)']
  ];

  let runningBank = 0;
  let totalBankThu = 0;
  let totalBankChi = 0;

  bankTxs.forEach((t, idx) => {
    const isThu = t.voucherType === 'UNION_RECEIPT';
    if (isThu) {
      runningBank += t.amount;
      totalBankThu += t.amount;
    } else {
      runningBank -= t.amount;
      totalBankChi += t.amount;
    }

    ws3Data.push([
      idx + 1,
      t.date,
      t.voucherNo,
      `${t.reason} - ${t.personName}`,
      isThu ? t.amount : 0,
      !isThu ? t.amount : 0,
      runningBank
    ]);
  });

  const totalRowIdx3 = ws3Data.length;
  ws3Data.push(['', '', '', 'TỔNG CỘNG PHÁT SINH:', totalBankThu, totalBankChi, runningBank]);
  ws3Data.push(['', '', '', '', '', '', '']);

  const signRowStart3 = ws3Data.length;
  ws3Data.push(['', 'NGƯỜI LẬP BIỂU', '', 'KẾ TOÁN CÔNG ĐOÀN', '', 'CHỦ TỊCH CĐCS', '']);
  ws3Data.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '(Ký, họ tên, đóng dấu)', '']);
  ws3Data.push(['', '', '', '', '', '', '']);
  ws3Data.push(['', '', '', '', '', '', '']);
  ws3Data.push(['', preparerName, '', accountantName, '', headName, '']);

  const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
  ws3['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }
  ];
  ws3['!cols'] = [
    { wch: 6 },
    { wch: 13 },
    { wch: 20 },
    { wch: 45 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 }
  ];

  // Styling ws3
  if (ws3['A1']) ws3['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws3['A2']) ws3['A2'].s = EXCEL_STYLES.companyAddress;
  if (ws3['G1']) ws3['G1'].s = EXCEL_STYLES.formCode;
  if (ws3['G2']) ws3['G2'].s = EXCEL_STYLES.formSubCode;
  if (ws3['A4']) ws3['A4'].s = EXCEL_STYLES.mainTitleBanner;
  if (ws3['A5']) ws3['A5'].s = EXCEL_STYLES.subTitle;

  for (let c = 0; c <= 6; c++) {
    const ref = getCellAddress(5, c);
    if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < bankTxs.length; i++) {
    const r = 6 + i;
    const isOdd = i % 2 === 1;
    if (ws3[getCellAddress(r, 0)]) ws3[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws3[getCellAddress(r, 1)]) ws3[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
    if (ws3[getCellAddress(r, 2)]) ws3[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
    if (ws3[getCellAddress(r, 3)]) ws3[getCellAddress(r, 3)].s = EXCEL_STYLES.dataCellLeft(isOdd);
    if (ws3[getCellAddress(r, 4)]) ws3[getCellAddress(r, 4)].s = EXCEL_STYLES.dataAmountThu(isOdd);
    if (ws3[getCellAddress(r, 5)]) ws3[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountChi(isOdd);
    if (ws3[getCellAddress(r, 6)]) ws3[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
  }

  for (let c = 0; c <= 6; c++) {
    const ref = getCellAddress(totalRowIdx3, c);
    if (c === 3) { if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.totalRowLabel; }
    else if (c === 4) { if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.totalRowAmountThu; }
    else if (c === 5) { if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.totalRowAmountChi; }
    else if (c === 6) { if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.balanceRowAmount; }
    else { if (ws3[ref]) ws3[ref].s = EXCEL_STYLES.totalRowEmpty; }
  }

  // Chữ ký ws3
  if (ws3[getCellAddress(signRowStart3, 1)]) ws3[getCellAddress(signRowStart3, 1)].s = EXCEL_STYLES.signRole;
  if (ws3[getCellAddress(signRowStart3, 3)]) ws3[getCellAddress(signRowStart3, 3)].s = EXCEL_STYLES.signRole;
  if (ws3[getCellAddress(signRowStart3, 5)]) ws3[getCellAddress(signRowStart3, 5)].s = EXCEL_STYLES.signRole;

  if (ws3[getCellAddress(signRowStart3 + 1, 1)]) ws3[getCellAddress(signRowStart3 + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws3[getCellAddress(signRowStart3 + 1, 3)]) ws3[getCellAddress(signRowStart3 + 1, 3)].s = EXCEL_STYLES.signNote;
  if (ws3[getCellAddress(signRowStart3 + 1, 5)]) ws3[getCellAddress(signRowStart3 + 1, 5)].s = EXCEL_STYLES.signNote;

  if (ws3[getCellAddress(signRowStart3 + 4, 1)]) ws3[getCellAddress(signRowStart3 + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws3[getCellAddress(signRowStart3 + 4, 3)]) ws3[getCellAddress(signRowStart3 + 4, 3)].s = EXCEL_STYLES.signName;
  if (ws3[getCellAddress(signRowStart3 + 4, 5)]) ws3[getCellAddress(signRowStart3 + 4, 5)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws3, 'SO_TIEN_GUI_NH_S12H');

  // -------------------------------------------------------------
  // Sheet 4: BÁO CÁO QUYẾT TOÁN B07-TLĐ
  // -------------------------------------------------------------
  const reportB07 = computeSettlementReportB07(transactions, client, year);
  const ws4Data: any[] = [
    ['LIÊN ĐOÀN LAO ĐỘNG QUẬN / HUYỆN', '', '', '', '', 'Mẫu số: B07-TLĐ'],
    [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '(Theo Hướng dẫn 47/HD-TLĐ)'],
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

  // Styling ws4
  if (ws4['A1']) ws4['A1'].s = EXCEL_STYLES.companyTitle;
  if (ws4['A2']) ws4['A2'].s = EXCEL_STYLES.companyTitle;
  if (ws4['F1']) ws4['F1'].s = EXCEL_STYLES.formCode;
  if (ws4['F2']) ws4['F2'].s = EXCEL_STYLES.formSubCode;
  if (ws4['A4']) ws4['A4'].s = EXCEL_STYLES.mainTitleBanner;

  for (let c = 0; c <= 5; c++) {
    const ref = getCellAddress(10, c);
    if (ws4[ref]) ws4[ref].s = EXCEL_STYLES.tableHeader;
  }

  for (let i = 0; i < reportB07.items.length; i++) {
    const r = startIdx4 + i;
    const it = reportB07.items[i];
    const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
    const isOdd = i % 2 === 1;

    for (let c = 0; c <= 5; c++) {
      const ref = getCellAddress(r, c);
      if (!ws4[ref]) continue;
      if (isMajor) {
        ws4[ref].s = EXCEL_STYLES.b07MajorRow;
        if (c === 4) ws4[ref].s = { ...EXCEL_STYLES.b07MajorRow, numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'center' } };
      } else {
        if (c === 0 || c === 2) ws4[ref].s = EXCEL_STYLES.dataCellCenter(isOdd);
        else if (c === 1) ws4[ref].s = EXCEL_STYLES.dataCellLeft(isOdd);
        else ws4[ref].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
      }
    }
  }

  // Chữ ký ws4
  if (ws4[getCellAddress(signRowStart4, 1)]) ws4[getCellAddress(signRowStart4, 1)].s = EXCEL_STYLES.signRole;
  if (ws4[getCellAddress(signRowStart4, 3)]) ws4[getCellAddress(signRowStart4, 3)].s = EXCEL_STYLES.signRole;
  if (ws4[getCellAddress(signRowStart4, 5)]) ws4[getCellAddress(signRowStart4, 5)].s = EXCEL_STYLES.signRole;

  if (ws4[getCellAddress(signRowStart4 + 1, 1)]) ws4[getCellAddress(signRowStart4 + 1, 1)].s = EXCEL_STYLES.signNote;
  if (ws4[getCellAddress(signRowStart4 + 1, 3)]) ws4[getCellAddress(signRowStart4 + 1, 3)].s = EXCEL_STYLES.signNote;
  if (ws4[getCellAddress(signRowStart4 + 1, 5)]) ws4[getCellAddress(signRowStart4 + 1, 5)].s = EXCEL_STYLES.signNote;

  if (ws4[getCellAddress(signRowStart4 + 4, 1)]) ws4[getCellAddress(signRowStart4 + 4, 1)].s = EXCEL_STYLES.signName;
  if (ws4[getCellAddress(signRowStart4 + 4, 3)]) ws4[getCellAddress(signRowStart4 + 4, 3)].s = EXCEL_STYLES.signName;
  if (ws4[getCellAddress(signRowStart4 + 4, 5)]) ws4[getCellAddress(signRowStart4 + 4, 5)].s = EXCEL_STYLES.signName;

  XLSX.utils.book_append_sheet(wb, ws4, 'QUYET_TOAN_B07_TLD');

  // Lưu file
  const safeName = clientName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  XLSX.writeFile(wb, `So_Sach_Cong_Doan_${safeName}_${year}.xlsx`);
}

export function exportSingleExcelSheet(
  type: 'VOUCHERS' | 'CASH_BOOK' | 'BANK_BOOK' | 'SETTLEMENT_B07',
  transactions: TradeUnionTransaction[],
  client: Client | null,
  year: number,
  filterMonth?: number | 'ALL',
  signers?: UnionSignerSettings | null
): void {
  const wb = XLSX.utils.book_new();
  const unitTitle = signers?.unitTitle || 'CÔNG ĐOÀN CƠ SỞ';
  const clientName = signers?.companyName || client?.name || 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT';
  const clientAddress = signers?.companyAddress || client?.address || '153G Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP. HCM';
  const headName = signers?.headOfUnitName || 'Ngô Thị Bích Ngọc';
  const accountantName = signers?.accountantName || 'Nguyễn Thị Cẩm Ly';
  const preparerName = signers?.preparerName || 'Nguyễn Thị Cẩm Ly';
  const treasurerName = signers?.treasurerName || 'Bùi Xuân Mai Thảo';
  const safeName = clientName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);

  if (type === 'VOUCHERS') {
    let filteredTxs = transactions;
    if (filterMonth && filterMonth !== 'ALL') {
      filteredTxs = transactions.filter(t => {
        const d = new Date(t.date);
        return (!isNaN(d.getMonth()) ? d.getMonth() + 1 : 1) === filterMonth;
      });
    }

    const titleMonth = filterMonth && filterMonth !== 'ALL' ? `THÁNG ${filterMonth}/${year}` : `NĂM ${year}`;
    const wsData: any[] = [
      [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', '', '', '', '', ''],
      [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '', '', '', '', ''],
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
      { wch: 6 },  { wch: 13 }, { wch: 15 }, { wch: 16 }, { wch: 32 },
      { wch: 24 }, { wch: 42 }, { wch: 13 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
    ];

    // Styles
    if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
    if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
    if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;

    for (let c = 0; c <= 10; c++) {
      const ref = getCellAddress(5, c);
      if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeader;
    }

    for (let i = 0; i < filteredTxs.length; i++) {
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
    XLSX.writeFile(wb, `Danh_Sach_Thu_Chi_${safeName}_${year}${filterMonth && filterMonth !== 'ALL' ? `_T${filterMonth}` : ''}.xlsx`);
  } else if (type === 'CASH_BOOK') {
    const cashTxs = transactions.filter(t => t.paymentMethod === 'CASH');
    const wsData: any[] = [
      [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', '', 'Mẫu số: S11H'],
      [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '', '(Ban hành theo TT 107/2017/TT-BTC)'],
      ['', '', '', '', '', '', '', ''],
      [`SỔ QUỸ TIỀN MẶT CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', '', '', ''],
      ['Tài khoản tiền mặt: TK 1111', '', '', '', '', '', '', ''],
      ['STT', 'Ngày Tháng', 'Số Phiếu Thu', 'Số Phiếu Chi', 'Họ Tên & Diễn Giải Nghiệp Vụ', 'Số Tiền Thu (VNĐ)', 'Số Tiền Chi (VNĐ)', 'Tồn Quỹ (VNĐ)']
    ];

    let runningCash = 0;
    let totalCashThu = 0;
    let totalCashChi = 0;

    cashTxs.forEach((t, idx) => {
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        runningCash += t.amount;
        totalCashThu += t.amount;
      } else {
        runningCash -= t.amount;
        totalCashChi += t.amount;
      }
      wsData.push([
        idx + 1,
        t.date,
        isThu ? t.voucherNo : '',
        !isThu ? t.voucherNo : '',
        `${t.reason} - ${t.personName}`,
        isThu ? t.amount : 0,
        !isThu ? t.amount : 0,
        runningCash
      ]);
    });

    const totalRowIdx = wsData.length;
    wsData.push(['', '', '', '', 'TỔNG CỘNG SỐ PHÁT SINH:', totalCashThu, totalCashChi, runningCash]);
    wsData.push(['', '', '', '', '', '', '', '']);

    const signRowStart = wsData.length;
    wsData.push(['', 'THỦ QUỸ CÔNG ĐOÀN', '', 'KẾ TOÁN CÔNG ĐOÀN', '', '', 'CHỦ TỊCH CĐCS', '']);
    wsData.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '', '(Ký, họ tên, đóng dấu)', '']);
    wsData.push(['', '', '', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '', '', '']);
    wsData.push(['', treasurerName, '', accountantName, '', '', headName, '']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 7 } }
    ];
    ws['!cols'] = [
      { wch: 6 }, { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 22 }
    ];

    if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
    if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
    if (ws['H1']) ws['H1'].s = EXCEL_STYLES.formCode;
    if (ws['H2']) ws['H2'].s = EXCEL_STYLES.formSubCode;
    if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;
    if (ws['A5']) ws['A5'].s = EXCEL_STYLES.subTitle;

    for (let c = 0; c <= 7; c++) {
      const ref = getCellAddress(5, c);
      if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeaderTeal;
    }

    for (let i = 0; i < cashTxs.length; i++) {
      const r = 6 + i;
      const isOdd = i % 2 === 1;
      if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
      if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
      if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
      if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
      if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_STYLES.dataCellLeft(isOdd);
      if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountThu(isOdd);
      if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountChi(isOdd);
      if (ws[getCellAddress(r, 7)]) ws[getCellAddress(r, 7)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    }

    for (let c = 0; c <= 7; c++) {
      const ref = getCellAddress(totalRowIdx, c);
      if (c === 4) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowLabel; }
      else if (c === 5) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountThu; }
      else if (c === 6) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountChi; }
      else if (c === 7) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.balanceRowAmount; }
      else { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowEmpty; }
    }

    // Chữ ký
    if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 3)]) ws[getCellAddress(signRowStart, 3)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 6)]) ws[getCellAddress(signRowStart, 6)].s = EXCEL_STYLES.signRole;

    if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 3)]) ws[getCellAddress(signRowStart + 1, 3)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 6)]) ws[getCellAddress(signRowStart + 1, 6)].s = EXCEL_STYLES.signNote;

    if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 3)]) ws[getCellAddress(signRowStart + 4, 3)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 6)]) ws[getCellAddress(signRowStart + 4, 6)].s = EXCEL_STYLES.signName;

    XLSX.utils.book_append_sheet(wb, ws, 'SO_QUY_TIEN_MAT_S11H');
    XLSX.writeFile(wb, `So_Quy_Tien_Mat_S11H_${safeName}_${year}.xlsx`);
  } else if (type === 'BANK_BOOK') {
    const bankTxs = transactions.filter(t => t.paymentMethod === 'BANK');
    const wsData: any[] = [
      [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '', 'Mẫu số: S12-H'],
      [`Địa chỉ: ${clientAddress}`, '', '', '', '', '', '(Ban hành theo TT 107/2017/TT-BTC)'],
      ['', '', '', '', '', '', ''],
      [`SỔ TIỀN GỬI NGÂN HÀNG CÔNG ĐOÀN NĂM ${year}`, '', '', '', '', '', ''],
      ['Tài khoản tiền gửi: TK 1121', '', '', '', '', '', ''],
      ['STT', 'Ngày Tháng', 'Số Chứng Từ / UNC', 'Nội Dung Giao Dịch', 'Gửi Vào / Thu (VNĐ)', 'Rút Ra / Chi (VNĐ)', 'Số Dư Cuối (VNĐ)']
    ];

    let runningBank = 0;
    let totalBankThu = 0;
    let totalBankChi = 0;

    bankTxs.forEach((t, idx) => {
      const isThu = t.voucherType === 'UNION_RECEIPT';
      if (isThu) {
        runningBank += t.amount;
        totalBankThu += t.amount;
      } else {
        runningBank -= t.amount;
        totalBankChi += t.amount;
      }
      wsData.push([
        idx + 1,
        t.date,
        t.voucherNo,
        `${t.reason} - ${t.personName}`,
        isThu ? t.amount : 0,
        !isThu ? t.amount : 0,
        runningBank
      ]);
    });

    const totalRowIdx = wsData.length;
    wsData.push(['', '', '', 'TỔNG CỘNG PHÁT SINH:', totalBankThu, totalBankChi, runningBank]);
    wsData.push(['', '', '', '', '', '', '']);

    const signRowStart = wsData.length;
    wsData.push(['', 'NGƯỜI LẬP BIỂU', '', 'KẾ TOÁN CÔNG ĐOÀN', '', 'CHỦ TỊCH CĐCS', '']);
    wsData.push(['', '(Ký, họ tên)', '', '(Ký, họ tên)', '', '(Ký, họ tên, đóng dấu)', '']);
    wsData.push(['', '', '', '', '', '', '']);
    wsData.push(['', '', '', '', '', '', '']);
    wsData.push(['', preparerName, '', accountantName, '', headName, '']);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }
    ];
    ws['!cols'] = [
      { wch: 6 }, { wch: 13 }, { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 22 }
    ];

    if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
    if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyAddress;
    if (ws['G1']) ws['G1'].s = EXCEL_STYLES.formCode;
    if (ws['G2']) ws['G2'].s = EXCEL_STYLES.formSubCode;
    if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;
    if (ws['A5']) ws['A5'].s = EXCEL_STYLES.subTitle;

    for (let c = 0; c <= 6; c++) {
      const ref = getCellAddress(5, c);
      if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeader;
    }

    for (let i = 0; i < bankTxs.length; i++) {
      const r = 6 + i;
      const isOdd = i % 2 === 1;
      if (ws[getCellAddress(r, 0)]) ws[getCellAddress(r, 0)].s = EXCEL_STYLES.dataCellCenter(isOdd);
      if (ws[getCellAddress(r, 1)]) ws[getCellAddress(r, 1)].s = EXCEL_STYLES.dataCellCenter(isOdd);
      if (ws[getCellAddress(r, 2)]) ws[getCellAddress(r, 2)].s = EXCEL_STYLES.dataVoucherCode(isOdd);
      if (ws[getCellAddress(r, 3)]) ws[getCellAddress(r, 3)].s = EXCEL_STYLES.dataCellLeft(isOdd);
      if (ws[getCellAddress(r, 4)]) ws[getCellAddress(r, 4)].s = EXCEL_STYLES.dataAmountThu(isOdd);
      if (ws[getCellAddress(r, 5)]) ws[getCellAddress(r, 5)].s = EXCEL_STYLES.dataAmountChi(isOdd);
      if (ws[getCellAddress(r, 6)]) ws[getCellAddress(r, 6)].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
    }

    for (let c = 0; c <= 6; c++) {
      const ref = getCellAddress(totalRowIdx, c);
      if (c === 3) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowLabel; }
      else if (c === 4) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountThu; }
      else if (c === 5) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowAmountChi; }
      else if (c === 6) { if (ws[ref]) ws[ref].s = EXCEL_STYLES.balanceRowAmount; }
      else { if (ws[ref]) ws[ref].s = EXCEL_STYLES.totalRowEmpty; }
    }

    // Chữ ký
    if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 3)]) ws[getCellAddress(signRowStart, 3)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 5)]) ws[getCellAddress(signRowStart, 5)].s = EXCEL_STYLES.signRole;

    if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 3)]) ws[getCellAddress(signRowStart + 1, 3)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 5)]) ws[getCellAddress(signRowStart + 1, 5)].s = EXCEL_STYLES.signNote;

    if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 3)]) ws[getCellAddress(signRowStart + 4, 3)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 5)]) ws[getCellAddress(signRowStart + 4, 5)].s = EXCEL_STYLES.signName;

    XLSX.utils.book_append_sheet(wb, ws, 'SO_TIEN_GUI_NH_S12H');
    XLSX.writeFile(wb, `So_Tien_Gui_NH_S12H_${safeName}_${year}.xlsx`);
  } else if (type === 'SETTLEMENT_B07') {
    const reportB07 = computeSettlementReportB07(transactions, client, year);
    const wsData: any[] = [
      ['LIÊN ĐOÀN LAO ĐỘNG QUẬN / HUYỆN', '', '', '', '', 'Mẫu số: B07-TLĐ'],
      [`${unitTitle}: ${clientName.toUpperCase()}`, '', '', '', '', '(Theo Hướng dẫn 47/HD-TLĐ)'],
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

    if (ws['A1']) ws['A1'].s = EXCEL_STYLES.companyTitle;
    if (ws['A2']) ws['A2'].s = EXCEL_STYLES.companyTitle;
    if (ws['F1']) ws['F1'].s = EXCEL_STYLES.formCode;
    if (ws['F2']) ws['F2'].s = EXCEL_STYLES.formSubCode;
    if (ws['A4']) ws['A4'].s = EXCEL_STYLES.mainTitleBanner;

    for (let c = 0; c <= 5; c++) {
      const ref = getCellAddress(10, c);
      if (ws[ref]) ws[ref].s = EXCEL_STYLES.tableHeader;
    }

    for (let i = 0; i < reportB07.items.length; i++) {
      const r = startIdx + i;
      const it = reportB07.items[i];
      const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
      const isOdd = i % 2 === 1;

      for (let c = 0; c <= 5; c++) {
        const ref = getCellAddress(r, c);
        if (!ws[ref]) continue;
        if (isMajor) {
          ws[ref].s = EXCEL_STYLES.b07MajorRow;
          if (c === 4) ws[ref].s = { ...EXCEL_STYLES.b07MajorRow, numFmt: '#,##0', alignment: { horizontal: 'right', vertical: 'center' } };
        } else {
          if (c === 0 || c === 2) ws[ref].s = EXCEL_STYLES.dataCellCenter(isOdd);
          else if (c === 1) ws[ref].s = EXCEL_STYLES.dataCellLeft(isOdd);
          else ws[ref].s = EXCEL_STYLES.dataAmountNeutral(isOdd);
        }
      }
    }

    // Chữ ký
    if (ws[getCellAddress(signRowStart, 1)]) ws[getCellAddress(signRowStart, 1)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 3)]) ws[getCellAddress(signRowStart, 3)].s = EXCEL_STYLES.signRole;
    if (ws[getCellAddress(signRowStart, 5)]) ws[getCellAddress(signRowStart, 5)].s = EXCEL_STYLES.signRole;

    if (ws[getCellAddress(signRowStart + 1, 1)]) ws[getCellAddress(signRowStart + 1, 1)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 3)]) ws[getCellAddress(signRowStart + 1, 3)].s = EXCEL_STYLES.signNote;
    if (ws[getCellAddress(signRowStart + 1, 5)]) ws[getCellAddress(signRowStart + 1, 5)].s = EXCEL_STYLES.signNote;

    if (ws[getCellAddress(signRowStart + 4, 1)]) ws[getCellAddress(signRowStart + 4, 1)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 3)]) ws[getCellAddress(signRowStart + 4, 3)].s = EXCEL_STYLES.signName;
    if (ws[getCellAddress(signRowStart + 4, 5)]) ws[getCellAddress(signRowStart + 4, 5)].s = EXCEL_STYLES.signName;

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
  wsData.push(['', '', '', '', '', '', 'CHÊNH LỆCH DÒNG TIỀN (THU - CHI):', '', totalThu - totalChi, '', '']);
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
    { wch: 6 },  { wch: 13 }, { wch: 15 }, { wch: 16 }, { wch: 32 },
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
    const period = monthlyPeriods.find(p => p.periodKey === key || p.month === m);

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
    { wch: 6 },  { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
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

