import * as XLSX from 'xlsx';
import { ColumnMapping, NormalizedTransaction, ReconciliationPair, TransactionType } from '../types/accounting';
import { validateTransaction } from './validationRules';

export interface ExcelSheetParseResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
}

export function parseExcelFile(fileBuffer: ArrayBuffer, selectedSheetName?: string): ExcelSheetParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  
  const targetSheetName = (selectedSheetName && sheetNames.includes(selectedSheetName)) 
    ? selectedSheetName 
    : sheetNames[0];

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    return { sheetNames, selectedSheet: '', headers: [], rawRows: [] };
  }

  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  
  let headers: string[] = [];
  if (jsonData.length > 0) {
    headers = Object.keys(jsonData[0]);
  }

  return {
    sheetNames,
    selectedSheet: targetSheetName,
    headers,
    rawRows: jsonData,
  };
}

export function normalizeExcelRows(
  clientId: string,
  fileName: string,
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  transactionType: TransactionType,
  allExistingTxs: NormalizedTransaction[] = []
): NormalizedTransaction[] {
  return rawRows.map((row, index) => {
    const dateRaw = row[mapping.dateCol] ?? '';
    const voucherNoRaw = row[mapping.voucherNoCol] ?? '';
    const descRaw = row[mapping.descriptionCol] ?? '';
    const debitAccRaw = row[mapping.debitAccCol] ?? '';
    const creditAccRaw = row[mapping.creditAccCol] ?? '';
    const amountRaw = row[mapping.amountCol] ?? 0;
    const partnerNameRaw = row[mapping.partnerNameCol] ?? '';
    const partnerTaxCodeRaw = row[mapping.partnerTaxCodeCol] ?? '';
    const bankAccRaw = mapping.bankAccCol ? (row[mapping.bankAccCol] ?? '') : '';

    let formattedDate = '';
    if (dateRaw instanceof Date) {
      formattedDate = dateRaw.toISOString().slice(0, 10);
    } else if (typeof dateRaw === 'number') {
      const parsedDate = XLSX.SSF.parse_date_code(dateRaw);
      if (parsedDate) {
        const yyyy = parsedDate.y;
        const mm = String(parsedDate.m).padStart(2, '0');
        const dd = String(parsedDate.d).padStart(2, '0');
        formattedDate = `${yyyy}-${mm}-${dd}`;
      }
    } else {
      const str = String(dateRaw).trim();
      if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
        const parts = str.split(/[\/-]/);
        const dd = parts[0].padStart(2, '0');
        const mm = parts[1].padStart(2, '0');
        const yyyy = parts[2];
        formattedDate = `${yyyy}-${mm}-${dd}`;
      } else if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(str)) {
        formattedDate = str.replace(/\//g, '-');
      } else {
        formattedDate = str;
      }
    }

    let cleanAmount = 0;
    if (typeof amountRaw === 'number') {
      cleanAmount = Math.abs(amountRaw);
    } else {
      const numStr = String(amountRaw).replace(/[^0-9.-]+/g, '');
      cleanAmount = Math.abs(parseFloat(numStr) || 0);
    }

    const initialTx: NormalizedTransaction = {
      id: `tx-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
      clientId,
      sourceFileName: fileName,
      importDate: new Date().toISOString(),
      type: transactionType,
      date: formattedDate,
      voucherNo: String(voucherNoRaw).trim(),
      description: String(descRaw).trim(),
      debitAcc: String(debitAccRaw).trim(),
      creditAcc: String(creditAccRaw).trim(),
      amount: cleanAmount,
      partnerName: String(partnerNameRaw).trim(),
      partnerTaxCode: String(partnerTaxCodeRaw).trim().replace(/[^0-9-]/g, ''),
      bankAcc: String(bankAccRaw).trim(),
      rawRow: row,
      validationStatus: 'VALID',
      errors: [],
      userApproved: false,
      reconciledStatus: 'NONE',
    };

    const validationResult = validateTransaction(initialTx, allExistingTxs);
    initialTx.errors = validationResult.errors;
    initialTx.validationStatus = validationResult.status;

    return initialTx;
  });
}

export function exportTransactionsToExcel(transactions: NormalizedTransaction[], fileName: string) {
  const exportData = transactions.map((t, idx) => ({
    'STT': idx + 1,
    'Tệp nguồn Excel': t.sourceFileName,
    'Loại': t.type === 'INCOME' ? 'Thu' : t.type === 'EXPENSE' ? 'Chi' : t.type === 'BANK_STMT' ? 'Sao kê NH' : 'Công nợ',
    'Ngày chứng từ': t.date,
    'Số chứng từ': t.voucherNo,
    'Diễn giải / Nội dung': t.description,
    'TK Nợ': t.debitAcc,
    'TK Có': t.creditAcc,
    'Số tiền (VND)': t.amount,
    'Tên đối tác': t.partnerName,
    'Mã số thuế': t.partnerTaxCode,
    'Số TK Ngân hàng': t.bankAcc || '',
    'Trạng thái kiểm lỗi': t.validationStatus === 'ERROR' ? 'Có lỗi' : t.validationStatus === 'WARNING' ? 'Cảnh báo' : 'Hợp lệ',
    'Lỗi phát hiện': t.errors.map(e => e.message).join('; '),
    'Kế toán duyệt': t.userApproved ? 'Đã duyệt' : 'Chưa duyệt',
    'Trạng thái đối chiếu': t.reconciledStatus === 'MATCHED' ? 'Đã khớp' : 'Chưa khớp',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu chuẩn hoá');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

// Export Full Reconciliation Report to Excel Multi-Sheet
export function exportReconciliationReportToExcel(
  vouchers: NormalizedTransaction[],
  statements: NormalizedTransaction[],
  reconciliations: ReconciliationPair[],
  clientName: string
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Matched Pairs
  const matchedData = reconciliations.map((rec, idx) => {
    const v = vouchers.find(x => x.id === rec.voucherId);
    const s = statements.find(x => x.id === rec.statementId);
    return {
      'STT': idx + 1,
      'Số CT Nội bộ': v?.voucherNo || '',
      'Ngày CT Nội bộ': v?.date || '',
      'Số tiền Nội bộ (VND)': v?.amount || 0,
      'Diễn giải Nội bộ': v?.description || '',
      'Số CT / Nôi dung Sao kê': s?.description || '',
      'Ngày Sao kê': s?.date || '',
      'Số tiền Sao kê (VND)': s?.amount || 0,
      'Chênh lệch (VND)': (v?.amount || 0) - (s?.amount || 0),
      'Điểm tin cậy (% Khớp)': rec.matchScore,
      'Lý do ghép khớp': rec.matchReasons.join('; '),
      'Thời gian duyệt': new Date(rec.matchedAt).toLocaleString('vi-VN'),
    };
  });

  // Sheet 2: Unmatched Vouchers
  const matchedVoucherIds = new Set(reconciliations.map(r => r.voucherId));
  const unmatchedVouchers = vouchers.filter(v => !matchedVoucherIds.has(v.id)).map((v, idx) => ({
    'STT': idx + 1,
    'Ngày CT': v.date,
    'Số CT': v.voucherNo,
    'Diễn giải': v.description,
    'TK Nợ': v.debitAcc,
    'TK Có': v.creditAcc,
    'Số tiền (VND)': v.amount,
    'Tên đối tác': v.partnerName,
    'MST Đối tác': v.partnerTaxCode,
    'Tệp nguồn': v.sourceFileName,
  }));

  // Sheet 3: Unmatched Bank Statements
  const matchedStatementIds = new Set(reconciliations.map(r => r.statementId));
  const unmatchedStatements = statements.filter(s => !matchedStatementIds.has(s.id)).map((s, idx) => ({
    'STT': idx + 1,
    'Ngày Sao kê': s.date,
    'Số CT / Mã GD': s.voucherNo || '',
    'Nội dung sao kê': s.description,
    'Số tiền (VND)': s.amount,
    'Số tài khoản NH': s.bankAcc || '',
    'Tệp nguồn': s.sourceFileName,
  }));

  const wsMatched = XLSX.utils.json_to_sheet(matchedData);
  const wsUnmatchedVouchers = XLSX.utils.json_to_sheet(unmatchedVouchers);
  const wsUnmatchedStatements = XLSX.utils.json_to_sheet(unmatchedStatements);

  XLSX.utils.book_append_sheet(workbook, wsMatched, 'Cặp đã khớp đối chiếu');
  XLSX.utils.book_append_sheet(workbook, wsUnmatchedVouchers, 'Phiếu thu chi chưa khớp');
  XLSX.utils.book_append_sheet(workbook, wsUnmatchedStatements, 'Dòng sao kê chưa khớp');

  const fileName = `Bao_Cao_Doi_Chieu_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
