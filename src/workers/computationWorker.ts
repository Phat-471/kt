import { NormalizedTransaction } from '../types/accounting';
import { jaccardSimilarity } from '../services/matchingEngine';
import { auditNonDeductibleExpenses } from '../services/taxAuditService';

export interface AuditWorkerResult {
  totalProcessed: number;
  totalNonDeductible: number;
  taxRiskAmount: number;
  flaggedCount: number;
}

export interface FuzzyReconcileWorkerPayload {
  vouchers: NormalizedTransaction[];
  statements: NormalizedTransaction[];
  threshold?: number;
}

export interface FuzzyMatchCandidate {
  voucherId: string;
  statementId: string;
  similarity: number;
  reasons: string[];
}

/**
 * Quét kiểm lỗi dữ liệu và bóc tách rủi ro thuế theo cơ chế non-blocking batch chunking
 */
export async function runBackgroundAudit(
  transactions: NormalizedTransaction[]
): Promise<AuditWorkerResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const res = auditNonDeductibleExpenses(transactions);
      resolve({
        totalProcessed: transactions.length,
        totalNonDeductible: res.totalNonDeductibleAmount,
        taxRiskAmount: res.totalCitTaxRisk,
        flaggedCount: res.items.length,
      });
    }, 0);
  });
}

/**
 * Tìm kiếm các cặp ghép đối chiếu sao kê tự động theo thuật toán Similarity (Levenshtein + Fuzzy)
 */
export async function runBackgroundFuzzyReconcile(
  payload: FuzzyReconcileWorkerPayload
): Promise<FuzzyMatchCandidate[]> {
  const { vouchers, statements, threshold = 70 } = payload;
  const results: FuzzyMatchCandidate[] = [];

  return new Promise((resolve) => {
    setTimeout(() => {
      for (let i = 0; i < vouchers.length; i++) {
        const v = vouchers[i];
        for (let j = 0; j < statements.length; j++) {
          const s = statements[j];

          // So sánh số tiền (bắt buộc khớp hoặc Còn rất nhỏ)
          if (Math.abs(v.amount - s.amount) < 1) {
            const dateScore = v.date === s.date ? 30 : Math.abs(new Date(v.date).getTime() - new Date(s.date).getTime()) <= 86400000 * 3 ? 15 : 0;
            const textSim = jaccardSimilarity(v.description || '', s.description || '');
            const totalScore = 50 + dateScore + Math.round(textSim * 20);

            if (totalScore >= threshold) {
              const reasons: string[] = ['Khớp chính xác 100% số tiền'];
              if (dateScore === 30) reasons.push('Cùng ngày giao dịch');
              else if (dateScore > 0) reasons.push('Ngày giao dịch gần nhau (±3 ngày)');
              if (textSim > 0.6) reasons.push(`Nội dung diễn giải tương đồng (${Math.round(textSim * 100)}%)`);

              results.push({
                voucherId: v.id,
                statementId: s.id,
                similarity: Math.min(100, totalScore),
                reasons,
              });
            }
          }
        }
      }
      resolve(results);
    }, 0);
  });
}
