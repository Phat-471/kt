import { Client } from '../types/accounting';

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
  },
];

export const getCompanyConfig = (taxCode: string): CompanyConfig => {
  const found = DEFAULT_COMPANIES.find((c) => c.taxCode === taxCode);
  if (found) return found;

  return {
    id: `c_${taxCode}`,
    name: `Doanh Nghiệp (MST: ${taxCode})`,
    taxCode,
    financialYear: 2026,
    accountingStandard: 'TT200',
    industryPreset: 'COMMERCE',
  };
};
