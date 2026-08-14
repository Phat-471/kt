export interface BankAccount {
  accountNo: string;
  bankName: string;
  branch?: string;
}

export interface CompanyConfig {
  id: string;
  name: string;
  taxCode: string;
  financialYear: number;
  accountingStandard: 'TT200' | 'TT133' | 'TT88_HKD';
  industryPreset: 'COMMERCE' | 'SERVICE' | 'CONSTRUCTION' | 'MANUFACTURING' | 'AGENCY' | 'HOUSEHOLD';
  address?: string;
  directorName?: string;
  chiefAccountant?: string;
  logoBase64?: string;
  bankAccounts?: BankAccount[];
  parentCompanyId?: string; // ID công ty mẹ nếu là công ty con
  ownershipRatio?: number; // Tỷ lệ sở hữu (%) VD: 100, 51
}

export const DEFAULT_COMPANIES: CompanyConfig[] = [
  {
    id: 'c1',
    name: 'Công ty TNHH Thương Mại & Dịch Vụ An Phát',
    taxCode: '0101234567',
    financialYear: 2026,
    accountingStandard: 'TT200',
    industryPreset: 'COMMERCE',
    address: 'Số 100 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    directorName: 'Nguyễn Văn An',
    chiefAccountant: 'Trần Thị Mai',
    ownershipRatio: 100,
  },
  {
    id: 'c2',
    name: 'Công ty Cổ Phần Xây Dựng & Thiết Kế Nam Long',
    taxCode: '0309876543',
    financialYear: 2026,
    accountingStandard: 'TT200',
    industryPreset: 'CONSTRUCTION',
    address: '250 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    directorName: 'Lê Hoàng Nam',
    chiefAccountant: 'Phạm Minh Đức',
    parentCompanyId: 'c1',
    ownershipRatio: 51,
  },
  {
    id: 'c3',
    name: 'Hộ Kinh Doanh Sản Xuất Bao Bì Đại Quang',
    taxCode: '8012345678',
    financialYear: 2026,
    accountingStandard: 'TT88_HKD',
    industryPreset: 'HOUSEHOLD',
    address: 'Lô C4 Cụm CN Bát Tràng, Gia Lâm, Hà Nội',
    directorName: 'Đặng Văn Quang',
    ownershipRatio: 100,
  },
];

const LOCAL_STORAGE_KEY = 'acco_desk_companies_v1';

export function getAllCompanies(): CompanyConfig[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Cannot read multi-company config from localStorage:', e);
  }
  return DEFAULT_COMPANIES;
}

export function saveCompanyConfig(company: CompanyConfig): CompanyConfig[] {
  const companies = getAllCompanies();
  const index = companies.findIndex(c => c.id === company.id || c.taxCode === company.taxCode);
  if (index >= 0) {
    companies[index] = { ...companies[index], ...company };
  } else {
    companies.push(company);
  }

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(companies));
    }
  } catch (e) {
    console.error('Failed to save company config:', e);
  }
  return companies;
}

export function deleteCompanyConfig(id: string): CompanyConfig[] {
  let companies = getAllCompanies();
  companies = companies.filter(c => c.id !== id);

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(companies));
    }
  } catch (e) {
    console.error('Failed to delete company config:', e);
  }
  return companies;
}

export const getCompanyConfig = (taxCode: string): CompanyConfig => {
  const companies = getAllCompanies();
  const found = companies.find((c) => c.taxCode === taxCode);
  if (found) return found;

  return {
    id: `c_${taxCode}`,
    name: `Doanh Nghiệp (MST: ${taxCode})`,
    taxCode,
    financialYear: 2026,
    accountingStandard: 'TT200',
    industryPreset: 'COMMERCE',
    ownershipRatio: 100,
  };
};
