import { NormalizedTransaction } from '../types/accounting';
import { CompanyConfig } from './multiCompanyService';
import { calculateBalanceSheet, BalanceSheetReport } from './balanceSheetService';

export interface IntercompanyElimination {
  id: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  accountCode: string;
  eliminatedAmount: number;
  reason: string;
}

export interface ConsolidatedReportResult {
  parentCompany: CompanyConfig;
  subsidiariesCount: number;
  eliminations: IntercompanyElimination[];
  consolidatedBalanceSheet: BalanceSheetReport;
  totalConsolidatedRevenue: number;
  totalConsolidatedExpense: number;
  consolidatedNetProfit: number;
}

export function generateConsolidatedReport(
  companyConfigs: CompanyConfig[],
  transactionsMap: Record<string, NormalizedTransaction[]> // companyId -> transactions
): ConsolidatedReportResult {
  const parent = companyConfigs.find(c => !c.parentCompanyId) || companyConfigs[0];
  const eliminations: IntercompanyElimination[] = [];
  const allConsolidatedTransactions: NormalizedTransaction[] = [];

  // Lấy tập hợp tất cả MST của các công ty trong tập đoàn
  const groupTaxCodes = new Set(companyConfigs.map(c => c.taxCode));

  companyConfigs.forEach(company => {
    const rawTxs = transactionsMap[company.id] || [];
    const ratio = (company.ownershipRatio || 100) / 100;

    rawTxs.forEach(t => {
      // Check xem có phải giao dịch nội bộ không
      let isIntercompany = false;

      // Check theo TK Phải thu/Phải trả nội bộ (136/336)
      if (t.debitAcc?.startsWith('136') || t.creditAcc?.startsWith('336') || t.debitAcc?.startsWith('336') || t.creditAcc?.startsWith('136')) {
        isIntercompany = true;
      }

      // Check theo MST đối tác thuộc tập đoàn
      const partnerMstMatch = t.description ? t.description.match(/\b\d{10}(\d{3})?\b/) : null;
      if (partnerMstMatch && groupTaxCodes.has(partnerMstMatch[0]) && partnerMstMatch[0] !== company.taxCode) {
        isIntercompany = true;
      }

      if (isIntercompany) {
        eliminations.push({
          id: `elim_${t.id}`,
          sourceCompanyId: company.id,
          targetCompanyId: 'GROUP_MEMBER',
          accountCode: t.debitAcc || t.creditAcc,
          eliminatedAmount: t.amount * ratio,
          reason: `Loại trừ giao dịch nội bộ theo tỷ lệ sở hữu ${company.ownershipRatio}%: ${t.description}`,
        });
      } else {
        // Cộng gộp số liệu đã nhân tỷ lệ sở hữu
        allConsolidatedTransactions.push({
          ...t,
          amount: Math.round(t.amount * ratio),
          vatAmount: t.vatAmount ? Math.round(t.vatAmount * ratio) : undefined,
        });
      }
    });
  });

  // Tính Bảng cân đối kế toán hợp nhất từ các chứng từ sau loại trừ nội bộ
  const consolidatedBalanceSheet = calculateBalanceSheet(
    allConsolidatedTransactions,
    [],
    `TẬP ĐOÀN — HỢP NHẤT (${parent?.name})`,
    'Hợp nhất niên độ 2026'
  );

  // Tính Tổng doanh thu & Chi phí hợp nhất
  let totalConsolidatedRevenue = 0;
  let totalConsolidatedExpense = 0;

  allConsolidatedTransactions.forEach(t => {
    if (t.creditAcc?.startsWith('511') || t.creditAcc?.startsWith('515') || t.creditAcc?.startsWith('711')) {
      totalConsolidatedRevenue += t.amount;
    }
    if (t.debitAcc?.startsWith('632') || t.debitAcc?.startsWith('635') || t.debitAcc?.startsWith('641') || t.debitAcc?.startsWith('642') || t.debitAcc?.startsWith('811')) {
      totalConsolidatedExpense += t.amount;
    }
  });

  return {
    parentCompany: parent,
    subsidiariesCount: companyConfigs.length - 1,
    eliminations,
    consolidatedBalanceSheet,
    totalConsolidatedRevenue,
    totalConsolidatedExpense,
    consolidatedNetProfit: totalConsolidatedRevenue - totalConsolidatedExpense,
  };
}
