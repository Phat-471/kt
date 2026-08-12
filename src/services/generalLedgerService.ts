import { NormalizedTransaction } from '../types/accounting';

export interface GeneralLedgerRow {
  date: string;
  voucherNo: string;
  voucherDate: string;
  description: string;
  correspondingAcc: string; // Tài khoản đối ứng
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  partnerName: string;
}

export interface GeneralLedgerReport {
  accountCode: string;
  accountName: string;
  openingBalance: number;
  periodDebitTotal: number;
  periodCreditTotal: number;
  closingBalance: number;
  rows: GeneralLedgerRow[];
}

export const generateGeneralLedgerReport = (
  accountCode: string,
  transactions: NormalizedTransaction[]
): GeneralLedgerReport => {
  const accountTransactions = transactions.filter(
    (t) => t.debitAcc.startsWith(accountCode) || t.creditAcc.startsWith(accountCode)
  );

  let runningBalance = 0; // Giả định dư đầu kỳ = 0
  let periodDebitTotal = 0;
  let periodCreditTotal = 0;

  const rows: GeneralLedgerRow[] = accountTransactions.map((t) => {
    const isDebit = t.debitAcc.startsWith(accountCode);
    const debitAmount = isDebit ? t.amount : 0;
    const creditAmount = !isDebit ? t.amount : 0;
    const correspondingAcc = isDebit ? t.creditAcc : t.debitAcc;

    periodDebitTotal += debitAmount;
    periodCreditTotal += creditAmount;
    runningBalance += debitAmount - creditAmount;

    return {
      date: t.date,
      voucherNo: t.voucherNo || 'PKN',
      voucherDate: t.date,
      description: t.description,
      correspondingAcc,
      debitAmount,
      creditAmount,
      runningBalance,
      partnerName: t.partnerName || '',
    };
  });

  return {
    accountCode,
    accountName: `Sổ Cái Tài Khoản ${accountCode}`,
    openingBalance: 0,
    periodDebitTotal,
    periodCreditTotal,
    closingBalance: runningBalance,
    rows,
  };
};
