import { NormalizedTransaction } from '../types/accounting';
import { checkRiskyTaxpayer } from './riskyTaxpayerDatabase';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskFactorDetail {
  code: string;
  name: string;
  weight: number;
  score: number; // 0 - 100
  description: string;
  affectedTxIds?: string[];
}

export interface RiskScoreResult {
  totalScore: number; // 0 - 100
  riskLevel: RiskLevel;
  factors: RiskFactorDetail[];
  summary: string;
}

export function calculateEnterpriseRiskScore(transactions: NormalizedTransaction[]): RiskScoreResult {
  if (!transactions || transactions.length === 0) {
    return {
      totalScore: 0,
      riskLevel: 'LOW',
      factors: [],
      summary: 'Không có chứng từ để phân tích rủi ro.',
    };
  }

  const factors: RiskFactorDetail[] = [];

  // Factor 1: Thanh toán tiền mặt >= 20 triệu đồng (Trọng số 30%)
  const cash20mTxIds: string[] = [];
  transactions.forEach(t => {
    if (t.debitAcc && (t.debitAcc.startsWith('111')) && t.amount >= 20000000) {
      cash20mTxIds.push(t.id);
    } else if (t.creditAcc && t.creditAcc.startsWith('111') && t.amount >= 20000000) {
      cash20mTxIds.push(t.id);
    }
  });

  const cash20mRatio = cash20mTxIds.length / transactions.length;
  const cashScore = Math.min(100, Math.round(cash20mRatio * 300)); // >33% txs là max 100
  factors.push({
    code: 'F1_CASH_OVER_20M',
    name: 'Thanh toán tiền mặt ≥ 20 triệu',
    weight: 0.3,
    score: cashScore,
    description: `Có ${cash20mTxIds.length} chứng từ thanh toán bằng tiền mặt ≥ 20 triệu (rủi ro không được trừ thuế GTGT/TNDN theo NĐ 123/2020).`,
    affectedTxIds: cash20mTxIds,
  });

  // Factor 2: Đối tác rủi ro thuế / ngưng hoạt động (Trọng số 35%)
  const riskyPartnerTxIds: string[] = [];
  const checkedMsts = new Set<string>();

  transactions.forEach(t => {
    const mstMatch = t.description ? t.description.match(/\b\d{10}(\d{3})?\b/) : null;
    if (mstMatch) {
      const mst = mstMatch[0];
      if (!checkedMsts.has(mst)) {
        checkedMsts.add(mst);
        const check = checkRiskyTaxpayer(mst);
        if (check) {
          riskyPartnerTxIds.push(t.id);
        }
      }
    }
  });

  const riskyPartnerScore = riskyPartnerTxIds.length > 0 ? Math.min(100, riskyPartnerTxIds.length * 40) : 0;
  factors.push({
    code: 'F2_RISKY_PARTNER',
    name: 'Đối tác nằm trong CSDL Rủi ro Thuế',
    weight: 0.35,
    score: riskyPartnerScore,
    description: `Phát hiện ${riskyPartnerTxIds.length} chứng từ liên quan đến doanh nghiệp rủi ro cao hoặc bỏ trốn.`,
    affectedTxIds: riskyPartnerTxIds,
  });

  // Factor 3: Khấu trừ thuế GTGT cao bất thường so với Doanh thu (Trọng số 20%)
  let inputVat = 0;
  let outputVat = 0;
  let totalRevenue = 0;

  transactions.forEach(t => {
    if (t.debitAcc && t.debitAcc.startsWith('133')) inputVat += t.vatAmount || (t.amount * 0.1);
    if (t.creditAcc && t.creditAcc.startsWith('3331')) outputVat += t.vatAmount || (t.amount * 0.1);
    if (t.creditAcc && t.creditAcc.startsWith('511')) totalRevenue += t.amount;
  });

  let vatScore = 0;
  if (totalRevenue > 0 && inputVat > outputVat * 1.5) {
    vatScore = Math.min(100, Math.round(((inputVat - outputVat) / totalRevenue) * 500));
  }

  factors.push({
    code: 'F3_VAT_DEDUCTIBLE_ANOMALY',
    name: 'Thuế GTGT đầu vào âm/khấu trừ lớn bất thường',
    weight: 0.2,
    score: vatScore,
    description: vatScore > 30 
      ? `Thuế GTGT đầu vào được khấu trừ (${inputVat.toLocaleString()} đ) cao vượt trội so với thuế đầu ra (${outputVat.toLocaleString()} đ).`
      : 'Tỷ lệ GTGT khấu trừ nằm trong ngưỡng an toàn.',
  });

  // Factor 4: Đột biến chứng từ không có hóa đơn/không có đối tác (Trọng số 15%)
  const missingInfoTxIds = transactions.filter(t => !t.partnerName && !t.voucherNo).map(t => t.id);
  const missingInfoRatio = missingInfoTxIds.length / transactions.length;
  const missingInfoScore = Math.min(100, Math.round(missingInfoRatio * 200));

  factors.push({
    code: 'F4_MISSING_INFO',
    name: 'Chứng từ thiếu thông tin pháp lý',
    weight: 0.15,
    score: missingInfoScore,
    description: `Có ${missingInfoTxIds.length} chứng từ thiếu thông tin tên đối tác hoặc số chứng từ gốc.`,
    affectedTxIds: missingInfoTxIds,
  });

  // Tổng hợp score có trọng số
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  let riskLevel: RiskLevel = 'LOW';
  if (totalScore >= 75) riskLevel = 'CRITICAL';
  else if (totalScore >= 50) riskLevel = 'HIGH';
  else if (totalScore >= 25) riskLevel = 'MEDIUM';

  const summary = `Mức độ rủi ro doanh nghiệp: ${riskLevel} (${totalScore}/100). ` +
    (riskLevel === 'CRITICAL' || riskLevel === 'HIGH' 
      ? 'Cần rà soát gấp các chứng từ thanh toán tiền mặt ≥ 20M và MST đối tác rủi ro.'
      : 'Hồ sơ kế toán và thuế đạt mức độ an toàn tiêu chuẩn.');

  return {
    totalScore,
    riskLevel,
    factors,
    summary,
  };
}
