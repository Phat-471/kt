/**
 * Payroll Service — Bảng Lương & BHXH/BHYT/BHTN
 * Chuẩn: Luật BHXH 58/2014, NĐ 38/2022 (lương tối thiểu vùng), TT200/2014
 * Mức đóng 2026: NLĐ 10.5% | NSDLĐ 21.5% (trên lương đóng BHXH, tối đa 20x lương CS)
 */

import { calculatePersonalIncomeTax } from './pitCalculationEngine';

// ============================================================
// INTERFACES
// ============================================================

export interface Employee {
  id: string;
  name: string;
  position: string;           // Chức vụ
  department: string;         // Phòng ban
  contractType: 'OFFICIAL' | 'PROBATION' | 'PARTTIME'; // Loại HĐ
  basicSalary: number;        // Lương cơ bản (lương đóng BH)
  allowances: {
    position: number;         // Phụ cấp chức vụ (không chịu BH)
    transport: number;        // Phụ cấp đi lại
    meal: number;             // Phụ cấp cơm ca (tối đa 730K/tháng miễn thuế)
    phone: number;            // Phụ cấp điện thoại
    other: number;            // Phụ cấp khác
  };
  dependentsCount: number;    // Số người phụ thuộc
  taxCode: string;            // Mã số thuế cá nhân
  bankAccount: string;        // Số tài khoản ngân hàng
  startDate: string;          // Ngày vào làm
}

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  // Thu nhập
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;        // = basicSalary + allowances
  // Trích BHXH phía NLĐ đóng (10.5% trên lương đóng BH)
  bhxhEmployee: number;       // 8%
  bhytEmployee: number;       // 1.5%
  bhtnEmployee: number;       // 1%
  totalInsuranceEmployee: number; // 10.5%
  // Trích BHXH phía NSDLĐ đóng (21.5%) — chi phí doanh nghiệp
  bhxhEmployer: number;       // 17.5%
  bhytEmployer: number;       // 3%
  bhtnEmployer: number;       // 1%
  totalInsuranceEmployer: number; // 21.5%
  // Thuế TNCN
  personalDeduction: number;  // 15.5M
  dependentDeduction: number; // 5.5M x số người PT
  assessableIncome: number;   // Thu nhập tính thuế
  pitAmount: number;          // Thuế TNCN
  // Kết quả
  netSalary: number;          // Lương thực nhận = Gross - BH NLĐ - TNCN
  totalEmployerCost: number;  // Chi phí NSDLĐ = Gross + BH NSDLĐ
  // Hạch toán
  accountingEntries: AccountingEntry[];
}

export interface AccountingEntry {
  debitAcc: string;
  creditAcc: string;
  amount: number;
  description: string;
}

export interface PayrollSummary {
  period: string;              // VD: "07/2026"
  clientId: string;
  entries: PayrollEntry[];
  totalGross: number;
  totalNetSalary: number;
  totalInsuranceEmployee: number;
  totalInsuranceEmployer: number;
  totalPIT: number;
  totalEmployerCost: number;
}

// ============================================================
// CONSTANTS — Mức đóng BHXH 2026
// ============================================================

const BH_RATES = {
  // NLĐ (Người lao động)
  bhxhEmployee: 0.08,    // BHXH
  bhytEmployee: 0.015,   // BHYT
  bhtnEmployee: 0.01,    // BHTN
  // NSDLĐ (Nhà sử dụng lao động)
  bhxhEmployer: 0.175,   // BHXH
  bhytEmployer: 0.03,    // BHYT
  bhtnEmployer: 0.01,    // BHTN
};

// Lương cơ sở 2026: 2,340,000 đ/tháng (theo NĐ 73/2024)
const LUONG_CO_SO_2026 = 2_340_000;
// Mức trần lương đóng BHXH = 20 x lương cơ sở
const BH_SALARY_CAP = LUONG_CO_SO_2026 * 20; // 46,800,000

// ============================================================
// CORE CALCULATION
// ============================================================

export function calculatePayrollEntry(employee: Employee): PayrollEntry {
  const { basicSalary, allowances, dependentsCount, contractType } = employee;

  // Tổng phụ cấp
  const totalAllowances = allowances.position + allowances.transport +
    allowances.meal + allowances.phone + allowances.other;

  // Gross = Lương cơ bản + phụ cấp
  const grossSalary = basicSalary + totalAllowances;

  // Lương đóng BH (capped)
  const bhSalaryBase = Math.min(basicSalary, BH_SALARY_CAP);

  // --- BH NLĐ ---
  const bhxhEmployee = Math.round(bhSalaryBase * BH_RATES.bhxhEmployee);
  const bhytEmployee = Math.round(bhSalaryBase * BH_RATES.bhytEmployee);
  const bhtnEmployee = contractType === 'PARTTIME' ? 0 : Math.round(bhSalaryBase * BH_RATES.bhtnEmployee);
  const totalInsuranceEmployee = bhxhEmployee + bhytEmployee + bhtnEmployee;

  // --- BH NSDLĐ ---
  const bhxhEmployer = Math.round(bhSalaryBase * BH_RATES.bhxhEmployer);
  const bhytEmployer = Math.round(bhSalaryBase * BH_RATES.bhytEmployer);
  const bhtnEmployer = contractType === 'PARTTIME' ? 0 : Math.round(bhSalaryBase * BH_RATES.bhtnEmployer);
  const totalInsuranceEmployer = bhxhEmployer + bhytEmployer + bhtnEmployer;

  // --- TNCN tại nguồn ---
  const isOfficial = contractType !== 'PARTTIME';
  const pit = calculatePersonalIncomeTax(grossSalary, dependentsCount, isOfficial);

  // --- Kết quả ---
  const netSalary = grossSalary - totalInsuranceEmployee - pit.pitAmount;
  const totalEmployerCost = grossSalary + totalInsuranceEmployer;

  // --- Bút toán kế toán lương (theo TT200) ---
  const accountingEntries: AccountingEntry[] = [];

  if (grossSalary > 0) {
    // 1. Ghi nhận lương phải trả NLĐ
    accountingEntries.push({
      debitAcc: '622', // (hoặc 641/642 tùy phòng ban)
      creditAcc: '334',
      amount: grossSalary,
      description: `Lương phải trả ${employee.name} tháng`,
    });

    // 2. Trích BHXH/BHYT/BHTN phần NLĐ đóng (trừ vào lương)
    if (totalInsuranceEmployee > 0) {
      accountingEntries.push({
        debitAcc: '334',
        creditAcc: '338',
        amount: totalInsuranceEmployee,
        description: `Khấu trừ BH NLĐ (10.5%) của ${employee.name}`,
      });
    }

    // 3. Trích BHXH/BHYT/BHTN phần NSDLĐ đóng (chi phí DN)
    if (totalInsuranceEmployer > 0) {
      accountingEntries.push({
        debitAcc: '622',
        creditAcc: '338',
        amount: totalInsuranceEmployer,
        description: `Trích BH NSDLĐ (21.5%) cho ${employee.name}`,
      });
    }

    // 4. Khấu trừ TNCN tại nguồn
    if (pit.pitAmount > 0) {
      accountingEntries.push({
        debitAcc: '334',
        creditAcc: '333',
        amount: pit.pitAmount,
        description: `Khấu trừ TNCN tại nguồn của ${employee.name}`,
      });
    }

    // 5. Thực chi lương (chuyển khoản ngân hàng)
    accountingEntries.push({
      debitAcc: '334',
      creditAcc: '112',
      amount: netSalary,
      description: `Chi lương thực nhận cho ${employee.name}`,
    });
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    position: employee.position,
    department: employee.department,
    basicSalary,
    totalAllowances,
    grossSalary,
    bhxhEmployee,
    bhytEmployee,
    bhtnEmployee,
    totalInsuranceEmployee,
    bhxhEmployer,
    bhytEmployer,
    bhtnEmployer,
    totalInsuranceEmployer,
    personalDeduction: pit.personalDeduction,
    dependentDeduction: pit.dependentDeduction,
    assessableIncome: pit.assessableIncome,
    pitAmount: pit.pitAmount,
    netSalary,
    totalEmployerCost,
    accountingEntries,
  };
}

/** Tính toàn bộ bảng lương một kỳ */
export function calculatePayrollSummary(
  employees: Employee[],
  period: string,
  clientId: string,
): PayrollSummary {
  const entries = employees.map(calculatePayrollEntry);

  return {
    period,
    clientId,
    entries,
    totalGross: entries.reduce((s, e) => s + e.grossSalary, 0),
    totalNetSalary: entries.reduce((s, e) => s + e.netSalary, 0),
    totalInsuranceEmployee: entries.reduce((s, e) => s + e.totalInsuranceEmployee, 0),
    totalInsuranceEmployer: entries.reduce((s, e) => s + e.totalInsuranceEmployer, 0),
    totalPIT: entries.reduce((s, e) => s + e.pitAmount, 0),
    totalEmployerCost: entries.reduce((s, e) => s + e.totalEmployerCost, 0),
  };
}

// ============================================================
// EMPLOYEE STORAGE (localStorage / in-memory fallback)
// ============================================================

const EMP_KEY = 'accodesk_employees';
const _empMemStore: Employee[] = [
  // Nhân viên mẫu để demo
  {
    id: 'emp-001',
    name: 'Nguyễn Văn An',
    position: 'Kế toán viên',
    department: 'Kế toán',
    contractType: 'OFFICIAL',
    basicSalary: 12_000_000,
    allowances: { position: 1_000_000, transport: 500_000, meal: 730_000, phone: 300_000, other: 0 },
    dependentsCount: 1,
    taxCode: '0123456789',
    bankAccount: '19036789012345',
    startDate: '2023-03-01',
  },
  {
    id: 'emp-002',
    name: 'Trần Thị Bích',
    position: 'Kế toán trưởng',
    department: 'Kế toán',
    contractType: 'OFFICIAL',
    basicSalary: 22_000_000,
    allowances: { position: 3_000_000, transport: 800_000, meal: 730_000, phone: 500_000, other: 1_000_000 },
    dependentsCount: 2,
    taxCode: '0987654321',
    bankAccount: '19039876543210',
    startDate: '2021-01-15',
  },
  {
    id: 'emp-003',
    name: 'Lê Minh Tuấn',
    position: 'Nhân viên kinh doanh',
    department: 'Kinh doanh',
    contractType: 'OFFICIAL',
    basicSalary: 8_000_000,
    allowances: { position: 0, transport: 500_000, meal: 730_000, phone: 200_000, other: 2_000_000 },
    dependentsCount: 0,
    taxCode: '0112233445',
    bankAccount: '19031234567891',
    startDate: '2024-06-01',
  },
];

export function getAllEmployees(): Employee[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [..._empMemStore];
    const raw = localStorage.getItem(EMP_KEY);
    if (raw) return JSON.parse(raw);
    // Seed demo data on first load
    localStorage.setItem(EMP_KEY, JSON.stringify(_empMemStore));
    return [..._empMemStore];
  } catch {
    return [..._empMemStore];
  }
}

export function saveEmployee(emp: Employee): void {
  const all = getAllEmployees();
  const idx = all.findIndex(e => e.id === emp.id);
  if (idx >= 0) all[idx] = emp;
  else all.push(emp);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(EMP_KEY, JSON.stringify(all));
  } else {
    _empMemStore.length = 0;
    _empMemStore.push(...all);
  }
}

export function deleteEmployee(id: string): void {
  const all = getAllEmployees().filter(e => e.id !== id);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(EMP_KEY, JSON.stringify(all));
  } else {
    _empMemStore.length = 0;
    _empMemStore.push(...all);
  }
}
