export interface PITCalculationResult {
  grossSalary: number;
  insuranceDeduction: number;   // 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%)
  personalDeduction: number;    // 15.500.000 VNĐ
  dependentDeduction: number;   // 5.500.000 VNĐ * số người
  taxableIncome: number;        // Thu nhập chịu thuế
  assessableIncome: number;     // Thu nhập tính thuế
  pitAmount: number;            // Số thuế TNCN phải nộp
  effectiveTaxRatePercent: number;
  taxBracketBreakdown: { bracketName: string; taxableAmount: number; taxRatePercent: number; taxAmount: number }[];
}

export const calculatePersonalIncomeTax = (
  grossSalary: number,
  dependentsCount: number = 0,
  isContractLabor: boolean = true // Contract >= 3 months vs Casual labor
): PITCalculationResult => {
  if (!isContractLabor) {
    // Lao động thử việc / vãng lai >= 2 triệu: Khấu trừ 10% tại nguồn
    const pitAmount = grossSalary >= 2000000 ? Math.round(grossSalary * 0.10) : 0;
    return {
      grossSalary,
      insuranceDeduction: 0,
      personalDeduction: 0,
      dependentDeduction: 0,
      taxableIncome: grossSalary,
      assessableIncome: grossSalary,
      pitAmount,
      effectiveTaxRatePercent: grossSalary > 0 ? Number(((pitAmount / grossSalary) * 100).toFixed(1)) : 0,
      taxBracketBreakdown: [
        { bracketName: 'Khấu trừ 10% tại nguồn (Vãng lai)', taxableAmount: grossSalary, taxRatePercent: 10, taxAmount: pitAmount }
      ],
    };
  }

  // Lao động chính thức: Biểu thuế lũy tiến 7 bậc
  const personalDeduction = 15500000;
  const dependentDeduction = dependentsCount * 5500000;
  const insuranceDeduction = Math.round(grossSalary * 0.105);

  const taxableIncome = Math.max(0, grossSalary - insuranceDeduction);
  const assessableIncome = Math.max(0, taxableIncome - personalDeduction - dependentDeduction);

  // Biểu thuế lũy tiến 7 bậc (Triệu VNĐ/tháng)
  // Bậc 1: đến 5M (5%)
  // Bậc 2: 5M - 10M (10%)
  // Bậc 3: 10M - 18M (15%)
  // Bậc 4: 18M - 32M (20%)
  // Bậc 5: 32M - 52M (25%)
  // Bậc 6: 52M - 80M (30%)
  // Bậc 7: > 80M (35%)
  let remainingIncome = assessableIncome;
  let pitAmount = 0;
  const breakdown: PITCalculationResult['taxBracketBreakdown'] = [];

  const brackets = [
    { name: 'Bậc 1 (Đến 5 triệu)', max: 5000000, rate: 0.05 },
    { name: 'Bậc 2 (5M đến 10M)', max: 5000000, rate: 0.10 },
    { name: 'Bậc 3 (10M đến 18M)', max: 8000000, rate: 0.15 },
    { name: 'Bậc 4 (18M đến 32M)', max: 14000000, rate: 0.20 },
    { name: 'Bậc 5 (32M đến 52M)', max: 20000000, rate: 0.25 },
    { name: 'Bậc 6 (52M đến 80M)', max: 28000000, rate: 0.30 },
    { name: 'Bậc 7 (Trên 80 triệu)', max: Infinity, rate: 0.35 },
  ];

  for (const b of brackets) {
    if (remainingIncome <= 0) break;
    const taxableInBracket = Math.min(remainingIncome, b.max);
    const taxInBracket = Math.round(taxableInBracket * b.rate);
    pitAmount += taxInBracket;

    breakdown.push({
      bracketName: b.name,
      taxableAmount: taxableInBracket,
      taxRatePercent: b.rate * 100,
      taxAmount: taxInBracket,
    });

    remainingIncome -= taxableInBracket;
  }

  return {
    grossSalary,
    insuranceDeduction,
    personalDeduction,
    dependentDeduction,
    taxableIncome,
    assessableIncome,
    pitAmount,
    effectiveTaxRatePercent: grossSalary > 0 ? Number(((pitAmount / grossSalary) * 100).toFixed(1)) : 0,
    taxBracketBreakdown: breakdown,
  };
};
