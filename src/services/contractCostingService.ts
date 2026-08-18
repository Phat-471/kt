import { NormalizedTransaction } from '../types/accounting';

export interface ContractCostingItem {
  contractCode: string;
  contractName: string;
  partnerName: string;
  contractValue: number;        // Giá trị hợp đồng (Doanh thu cam kết)
  materialCost1541: number;     // Chi phí NVL trực tiếp (TK 1541 / 621)
  laborCost1542: number;        // Chi phí Nhân công trực tiếp (TK 1542 / 622)
  overheadCost1543: number;     // Chi phí Máy thi công & Mua ngoài (TK 1543 / 627)
  totalCost: number;            // Tổng giá thành thực tế
  grossProfit: number;          // Lợi nhuận gộp hợp đồng
  profitMarginPercent: number;  // Tỷ suất lợi nhuận gộp (%)
  completionRatePercent: number;// Tỷ lệ tiến độ hoàn thành (%)
  isOverBudget: boolean;        // Cảnh báo vượt định mức chi phí
  materialBudget?: number;      // Định mức dự toán NVL (BOM)
  materialVariance?: number;    // Còn thực tế vs dự toán NVL
  isBOMAlert?: boolean;         // Cảnh báo vượt định mức BOM > 5%
  transactions: NormalizedTransaction[];
}

export const calculateContractCostingReport = (
  transactions: NormalizedTransaction[],
  bomBudgetMap?: Record<string, { materialBudget: number; laborBudget: number; overheadBudget: number }>
): ContractCostingItem[] => {
  const contractMap: Record<string, ContractCostingItem> = {};

  transactions.forEach((t) => {
    // Trích xuất mã hợp đồng/công trình từ diễn giải hoặc partnerName
    const match = t.description.match(/(HĐ\d+|HĐ-[A-Z0-9]+|CT\d+|PROJECT-[A-Z0-9]+)/i);
    const contractCode = match ? match[0].toUpperCase() : 'HĐ-MAC-DINH';
    const contractName = `Hợp đồng / Dự án ${contractCode}`;
    const partnerName = t.partnerName || 'Khách hàng đối tác';

    if (!contractMap[contractCode]) {
      contractMap[contractCode] = {
        contractCode,
        contractName,
        partnerName,
        contractValue: 0,
        materialCost1541: 0,
        laborCost1542: 0,
        overheadCost1543: 0,
        totalCost: 0,
        grossProfit: 0,
        profitMarginPercent: 0,
        completionRatePercent: 0,
        isOverBudget: false,
        transactions: [],
      };
    }

    const item = contractMap[contractCode];
    item.transactions.push(t);

    // Ghi nhận Doanh thu hợp đồng
    if (t.type === 'INCOME' || t.creditAcc.startsWith('511')) {
      item.contractValue += t.amount;
    }

    // Tập hợp chi phí giá thành (TK 154 / 621 / 622 / 627)
    if (t.debitAcc.startsWith('1541') || t.debitAcc.startsWith('621') || t.debitAcc.startsWith('152')) {
      item.materialCost1541 += t.amount;
    } else if (t.debitAcc.startsWith('1542') || t.debitAcc.startsWith('622') || t.creditAcc.startsWith('334')) {
      item.laborCost1542 += t.amount;
    } else if (t.debitAcc.startsWith('1543') || t.debitAcc.startsWith('627') || t.type === 'EXPENSE') {
      item.overheadCost1543 += t.amount;
    }
  });

  // Calculate totals and metrics for each contract
  return Object.values(contractMap).map((item) => {
    const totalCost = item.materialCost1541 + item.laborCost1542 + item.overheadCost1543;
    const grossProfit = item.contractValue - totalCost;
    const profitMarginPercent = item.contractValue > 0 ? (grossProfit / item.contractValue) * 100 : 0;
    const completionRatePercent = item.contractValue > 0 ? Math.min(100, (totalCost / (item.contractValue * 0.8)) * 100) : 50;
    const isOverBudget = totalCost > item.contractValue * 0.85 && item.contractValue > 0;

    // BOM định mức dự toán
    const bomConfig = bomBudgetMap ? bomBudgetMap[item.contractCode] : undefined;
    const materialBudget = bomConfig?.materialBudget || (item.contractValue > 0 ? item.contractValue * 0.45 : 0);
    const materialVariance = materialBudget > 0 ? item.materialCost1541 - materialBudget : 0;
    const isBOMAlert = materialBudget > 0 && item.materialCost1541 > materialBudget * 1.05;

    return {
      ...item,
      totalCost,
      grossProfit,
      profitMarginPercent: Number(profitMarginPercent.toFixed(1)),
      completionRatePercent: Number(completionRatePercent.toFixed(1)),
      isOverBudget,
      materialBudget,
      materialVariance,
      isBOMAlert,
    };
  });
};
