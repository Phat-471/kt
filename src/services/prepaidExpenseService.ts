import { PrepaidExpense, PrepaidAllocationSchedule, NormalizedTransaction } from '../types/accounting';
import * as XLSX from 'xlsx';

export function getCategoryLabel(category: PrepaidExpense['category']): string {
  switch (category) {
    case 'CCDC':
      return 'Công cụ dụng cụ';
    case 'RENT':
      return 'Tiền thuê văn phòng / kho bãi';
    case 'SOFTWARE':
      return 'Phần mềm & Bản quyền';
    case 'REPAIR':
      return 'Sửa chữa lớn TSCĐ';
    case 'INSURANCE':
      return 'Bảo hiểm trả trước';
    case 'OTHER':
    default:
      return 'Chi phí trả trước khác';
  }
}

export function calculateMonthlyAllocation(originalAmount: number, allocationMonths: number): number {
  if (allocationMonths <= 0) return originalAmount;
  return Math.round(originalAmount / allocationMonths);
}

export function calculatePrepaidAllocationSchedule(
  item: PrepaidExpense,
  targetYear: number,
  existingTransactions: NormalizedTransaction[] = []
): PrepaidAllocationSchedule[] {
  const schedules: PrepaidAllocationSchedule[] = [];
  const start = new Date(item.startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth() + 1; // 1-12

  const monthlyAmount = calculateMonthlyAllocation(item.originalAmount, item.allocationMonths);

  let accumulated = 0;

  // Tính tổng số tháng đã trôi qua trước targetYear
  const monthsBeforeTargetYear = (targetYear - startYear) * 12 + (1 - startMonth);
  if (monthsBeforeTargetYear > 0) {
    const effectiveMonths = Math.min(monthsBeforeTargetYear, item.allocationMonths);
    accumulated = effectiveMonths * monthlyAmount;
  }

  for (let m = 1; m <= 12; m++) {
    const periodKey = `${targetYear}-${String(m).padStart(2, '0')}`;
    
    // Tính xem tháng m của năm targetYear có nằm trong khoảng phân bổ không
    const totalMonthsFromStart = (targetYear - startYear) * 12 + (m - startMonth) + 1;

    let currentMonthAllocation = 0;
    if (totalMonthsFromStart >= 1 && totalMonthsFromStart <= item.allocationMonths) {
      if (totalMonthsFromStart === item.allocationMonths) {
        // Tháng cuối cùng lấy phần còn lại để khớp chính xác nguyên giá
        currentMonthAllocation = Math.max(0, item.originalAmount - accumulated);
      } else {
        currentMonthAllocation = monthlyAmount;
      }
    }

    accumulated += currentMonthAllocation;
    const remaining = Math.max(0, item.originalAmount - accumulated);

    // Kiểm tra xem đã có bút toán phân bổ cho tháng này trong CSDL chưa
    const foundTx = existingTransactions.find(
      t => t.creditAcc === '242' && 
           t.debitAcc === item.expenseAccount && 
           t.date.startsWith(periodKey) &&
           (t.description.includes(item.code) || t.description.includes(item.name))
    );

    schedules.push({
      month: m,
      year: targetYear,
      periodKey,
      amount: currentMonthAllocation,
      accumulatedAmount: accumulated,
      remainingAmount: remaining,
      isAllocated: Boolean(foundTx),
      transactionId: foundTx?.id,
    });
  }

  return schedules;
}

export function calculatePrepaidSummary(
  items: PrepaidExpense[],
  targetYear: number = new Date().getFullYear(),
  targetMonth: number = new Date().getMonth() + 1
) {
  const totalOriginal = items.reduce((sum, item) => sum + item.originalAmount, 0);
  
  let totalAllocated = 0;
  let currentMonthAllocation = 0;

  items.forEach(item => {
    const schedules = calculatePrepaidAllocationSchedule(item, targetYear);
    const currentMonthSchedule = schedules.find(s => s.month === targetMonth);
    if (currentMonthSchedule) {
      currentMonthAllocation += currentMonthSchedule.amount;
    }

    // Tính lũy kế phân bổ đến tháng hiện tại
    const currentAcc = currentMonthSchedule ? currentMonthSchedule.accumulatedAmount : (item.allocatedAmount || 0);
    totalAllocated += currentAcc;
  });

  const totalRemaining = Math.max(0, totalOriginal - totalAllocated);

  return {
    totalOriginal,
    totalAllocated,
    totalRemaining,
    currentMonthAllocation,
    itemCount: items.length,
  };
}

export function generatePrepaidAllocationTransaction(
  item: PrepaidExpense,
  month: number,
  year: number,
  clientId: string
): NormalizedTransaction {
  const periodKey = `${year}-${String(month).padStart(2, '0')}`;
  const schedules = calculatePrepaidAllocationSchedule(item, year);
  const targetSchedule = schedules.find(s => s.month === month);
  const amount = targetSchedule ? targetSchedule.amount : calculateMonthlyAllocation(item.originalAmount, item.allocationMonths);

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const txDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const voucherNo = `PB242-${String(month).padStart(2, '0')}${String(year).slice(-2)}-${item.code}`;

  return {
    id: `tx-pb242-${item.id}-${year}-${month}-${Date.now()}`,
    clientId,
    sourceFileName: 'HeThong_PhanBo_TK242.system',
    importDate: new Date().toISOString(),
    type: 'GENERAL',
    date: txDate,
    voucherNo,
    description: `Phân bổ chi phí trả trước (${getCategoryLabel(item.category)}) T${month}/${year} - ${item.name} [${item.code}]`,
    debitAcc: item.expenseAccount || '6422',
    creditAcc: '242',
    amount,
    partnerName: item.name,
    partnerTaxCode: '',
    rawRow: {
      'Loại nghiệp vụ': 'Phân bổ chi phí trả trước TK 242',
      'Mã CCDC': item.code,
      'Tên CCDC': item.name,
      'Thời gian phân bổ': `${item.allocationMonths} tháng`,
      'Kỳ phân bổ': `Tháng ${month}/${year}`,
    },
    validationStatus: 'VALID',
    errors: [],
    userApproved: true,
    userNotes: `Bút toán sinh tự động từ phân hệ Phân bổ TK 242 ngày ${new Date().toLocaleDateString('vi-VN')}`,
  };
}

export function exportPrepaidExpensesToExcel(
  items: PrepaidExpense[],
  clientName: string,
  year: number
): void {
  const wb = XLSX.utils.book_new();

  const exportRows = items.map((item, index) => {
    const schedules = calculatePrepaidAllocationSchedule(item, year);
    const monthlyAmt = calculateMonthlyAllocation(item.originalAmount, item.allocationMonths);
    const totalInYear = schedules.reduce((s, sch) => s + sch.amount, 0);
    const remainingEndYear = schedules[11]?.remainingAmount || 0;

    const rowObj: Record<string, any> = {
      'STT': index + 1,
      'Mã CCDC / CP': item.code,
      'Tên Chi Phí / CCDC': item.name,
      'Loại Chi Phí': getCategoryLabel(item.category),
      'Ngày Bắt Đầu': item.startDate,
      'Số Tháng PB': item.allocationMonths,
      'TK Chi Phí': item.expenseAccount,
      'Tổng Nguyên Giá (VND)': item.originalAmount,
      'Mức PB Tháng (VND)': monthlyAmt,
    };

    // Điền 12 tháng
    for (let m = 1; m <= 12; m++) {
      rowObj[`Tháng ${m}`] = schedules[m - 1]?.amount || 0;
    }

    rowObj['Tổng PB Trong Năm'] = totalInYear;
    rowObj['Giá Trị Còn Lại Cuối Năm'] = remainingEndYear;
    rowObj['Ghi Chú'] = item.notes || '';

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 32 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    ...Array(12).fill({ wch: 14 }),
    { wch: 20 },
    { wch: 22 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Bang_Phan_Bo_242_${year}`);

  const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Bang_Phan_Bo_Chi_Phi_Tra_Truoc_242_${safeClient}_${year}.xlsx`);
}
