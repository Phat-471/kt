import React, { useState } from 'react';
import { NormalizedTransaction, Client } from '../../types/accounting';
import { calculateContractCostingReport, ContractCostingItem } from '../../services/contractCostingService';
import { auditVatRefundEligibility, VatRefundAuditResult } from '../../services/vatRefundAuditService';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { PageHeader, SubTabNav, StatCard, TabItem } from '../common';
import { formatNumber } from '../../utils/formatters';

interface ContractCostingViewProps {
  transactions: NormalizedTransaction[];
  activeClient?: Client | null;
}

export const ContractCostingView: React.FC<ContractCostingViewProps> = ({
  transactions,
  activeClient,
}) => {
  const [activeTab, setActiveTab] = useState<'CONTRACTS' | 'VAT_REFUND'>('CONTRACTS');
  const contracts: ContractCostingItem[] = calculateContractCostingReport(transactions);
  const vatAudit: VatRefundAuditResult = auditVatRefundEligibility(transactions);

  const tabs: TabItem<'CONTRACTS' | 'VAT_REFUND'>[] = [
    {
      id: 'CONTRACTS',
      label: 'Giá Thành Hợp Đồng',
      icon: Briefcase,
      count: contracts.length,
    },
    {
      id: 'VAT_REFUND',
      label: 'Hồ Sơ Hoàn Thuế GTGT',
      icon: ShieldCheck,
    },
  ];

  const totalContractValue = contracts.reduce((sum, c) => sum + c.contractValue, 0);
  const totalCostValue = contracts.reduce((sum, c) => sum + c.totalCost, 0);
  const totalGrossProfit = contracts.reduce((sum, c) => sum + c.grossProfit, 0);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <PageHeader
        variant="gradient"
        icon={Briefcase}
        title="Quản Trị Chi Phí Giá Thành Hợp Đồng & Kiểm Tra Hoàn Thuế GTGT"
        badgeText="PRO COSTING"
        subtitle={`${activeClient ? activeClient.name : 'Doanh Nghiệp Kế Toán Pro'} | Theo dõi chi phí 1541-1543 & Hồ sơ hoàn thuế GTGT`}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'CONTRACTS' && (
              <button
                onClick={() => {
                  import('xlsx').then(XLSX => {
                    const data = contracts.map(c => ({
                      'Mã Hợp Đồng': c.contractCode,
                      'Tên Hợp Đồng / Công Trình': c.contractName,
                      'Đối Tác': c.partnerName,
                      'Giá Trị HĐ (Doanh Thu)': c.contractValue,
                      'NVL Trực Tiếp (1541)': c.materialCost1541,
                      'Nhân Công (1542)': c.laborCost1542,
                      'Máy Thi Công & SXC (1543)': c.overheadCost1543,
                      'Tổng Giá Thành (154)': c.totalCost,
                      'Lợi Nhuận Gộp': c.grossProfit,
                      'Tỷ Suất LN (%)': c.profitMarginPercent,
                      'Cảnh Báo Vượt Ngân Sách': c.isOverBudget ? 'CÓ' : 'KHÔNG',
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Gia_Thanh_HD');
                    XLSX.writeFile(wb, `BaoCao_GiaThanh_${activeClient?.taxCode || 'Costing'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                  });
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel Giá Thành</span>
              </button>
            )}
          </div>
        }
      />

      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'CONTRACTS' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard
              label="TỔNG GIÁ TRỊ HỢP ĐỒNG"
              value={`${formatNumber(totalContractValue)} đ`}
              variant="purple"
            />
            <StatCard
              label="TỔNG GIÁ THÀNH ĐÃ TẬP HỢP (154)"
              value={`${formatNumber(totalCostValue)} đ`}
              variant="purple"
            />
            <StatCard
              label="TỔNG LỢI NHUẬN GỘP HỢP ĐỒNG"
              value={`${formatNumber(totalGrossProfit)} đ`}
              variant="emerald"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200">
              Bảng Tổng Hợp Chi Phí Giá Thành Theo Mã Hợp Đồng / Công Trình
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {contracts.map((item) => (
                <div key={item.contractCode} className="p-4 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                          {item.contractCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.contractName}</span>
                        {item.isOverBudget && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white">VƯỢT ĐỊNH MỨC</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        Đối tác: <span className="font-semibold">{item.partnerName}</span> | Giá trị HĐ: <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">{item.contractValue.toLocaleString()} VNĐ</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        Lãi Gộp: {item.grossProfit.toLocaleString()} VNĐ ({item.profitMarginPercent}%)
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Tổng Giá Thành 154: <span className="font-bold text-slate-700 dark:text-slate-300">{item.totalCost.toLocaleString()} VNĐ</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px]">
                      <span className="text-slate-500">NVL Trực Tiếp (1541):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.materialCost1541.toLocaleString()} VNĐ</span>
                      {item.materialBudget !== undefined && item.materialBudget > 0 && (
                        <span className={`text-[10px] block mt-0.5 font-semibold ${item.isBOMAlert ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          Dự toán BOM: {item.materialBudget.toLocaleString()} đ ({item.materialVariance !== undefined && item.materialVariance > 0 ? `+${item.materialVariance.toLocaleString()} đ` : 'Đạt'})
                        </span>
                      )}
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px]">
                      <span className="text-slate-500">Nhân Công (1542):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.laborCost1542.toLocaleString()} VNĐ</span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px]">
                      <span className="text-slate-500">Máy & Mua Ngoài (1543):</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.overheadCost1543.toLocaleString()} VNĐ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'VAT_REFUND' && (
        <div className="space-y-3">
          <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            vatAudit.isEligibleForRefund
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                vatAudit.isEligibleForRefund ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {vatAudit.isEligibleForRefund ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đánh Giá Hồ Sơ Hoàn Thuế GTGT</div>
                <div className={`text-xs font-extrabold mt-0.5 ${
                  vatAudit.isEligibleForRefund ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {vatAudit.isEligibleForRefund ? 'ĐỦ ĐIỀU KIỆN LẬP HỒ SƠ HOÀN THUẾ GTGT' : 'CHƯA ĐỦ ĐIỀU KIỆN HOÀN THUẾ (CẦN BỔ SUNG)'}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Số Thuế Chưa Khấu Trừ Hết [43]</div>
              <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {vatAudit.totalVatDeductibleAmount.toLocaleString()} VNĐ
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {vatAudit.rules.map((rule) => (
              <div key={rule.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${
                      rule.status === 'PASSED' ? 'text-emerald-600 dark:text-emerald-400' : rule.status === 'FAILED' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {rule.title}
                    </span>
                    <span className="text-[10px] text-slate-400 italic">({rule.legalBase})</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rule.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                  }`}>
                    {rule.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{rule.details}</p>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  👉 Hướng dẫn xử lý: {rule.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
