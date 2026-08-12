import { NormalizedTransaction } from '../types/accounting';

export interface OfficialForm01VAT {
  taxPeriod: string;
  totalSalesValue: number;
  totalSalesVat: number;
  totalPurchaseValue: number;
  totalPurchaseVat: number;
  vatDeductibleCurrentPeriod: number; // Chỉ tiêu [43]
  vatPayableCurrentPeriod: number;    // Chỉ tiêu [40]
}

export const generateForm01VATReport = (
  transactions: NormalizedTransaction[],
  taxPeriod: string = 'Quý 3/2026'
): OfficialForm01VAT => {
  let totalSalesValue = 0;
  let totalSalesVat = 0;
  let totalPurchaseValue = 0;
  let totalPurchaseVat = 0;

  transactions.forEach(t => {
    if (t.type === 'INCOME' || t.creditAcc.startsWith('511')) {
      totalSalesValue += t.amount;
      totalSalesVat += Math.round(t.amount * 0.10);
    } else if (t.type === 'EXPENSE' || t.debitAcc.startsWith('152') || t.debitAcc.startsWith('642')) {
      totalPurchaseValue += t.amount;
      totalPurchaseVat += Math.round(t.amount * 0.10);
    }
  });

  const diffVat = totalSalesVat - totalPurchaseVat;
  const vatPayableCurrentPeriod = Math.max(0, diffVat);
  const vatDeductibleCurrentPeriod = Math.max(0, -diffVat);

  return {
    taxPeriod,
    totalSalesValue,
    totalSalesVat,
    totalPurchaseValue,
    totalPurchaseVat,
    vatDeductibleCurrentPeriod,
    vatPayableCurrentPeriod,
  };
};
