import React, { useState } from 'react';
import { NormalizedTransaction } from '../../types/accounting';
import { getPostJuly2026TaxPolicies, TaxPolicyAlert } from '../../services/taxPolicySyncService';
import { calculatePersonalIncomeTax, PITCalculationResult } from '../../services/pitCalculationEngine';
import { generateForm01VATReport, OfficialForm01VAT } from '../../services/officialFormTemplates';
import {
  Scale,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  Calculator,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface TaxLawPolicyAlertBannerProps {
  transactions: NormalizedTransaction[];
}

export const TaxLawPolicyAlertBanner: React.FC<TaxLawPolicyAlertBannerProps> = ({ transactions }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [grossSalaryInput, setGrossSalaryInput] = useState<number>(30000000); // 30 triệu
  const [dependentsInput, setDependentsInput] = useState<number>(1); // 1 người phụ thuộc

  const alerts: TaxPolicyAlert[] = getPostJuly2026TaxPolicies(transactions);
  const pitResult: PITCalculationResult = calculatePersonalIncomeTax(grossSalaryInput, dependentsInput);
  const form01Vat: OfficialForm01VAT = generateForm01VATReport(transactions);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-500/30 shadow-lg space-y-3 select-none">
      {/* Top Banner Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black tracking-tight uppercase">Cập Nhật Chính Sách Luật Thuế Mới Sau 01/07/2026</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-slate-900 animate-pulse">
                CẬP NHẬT MỚI
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Đã rà soát {alerts.length} thay đổi quy định Thuế GTGT 8%, Giảm trừ gia cảnh TNCN ($15.5M / $5.5M$) & Tờ khai 01/GTGT TT80
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto shrink-0"
        >
          <span>{isExpanded ? 'Thu Gọn Chi Tiết' : 'Xem Chi Tiết Điểm Mới'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/10 space-y-4 animate-fade-in">
          {/* List of Tax Law Change Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alerts.map((al) => (
              <div key={al.id} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase">{al.policyCode}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300">{al.effectiveFrom}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-100">{al.title}</h4>
                <p className="text-[10px] text-slate-300 leading-relaxed">{al.summary}</p>
              </div>
            ))}
          </div>

          {/* Live PIT & Form 01/VAT Calculation Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Interactive PIT Calculator Widget */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" />
                  <span>Mô Phỏng Tính Thuế TNCN Lũy Tiến 7 Bậc (Mức Mới 2026)</span>
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Lương Gross (VNĐ):</label>
                  <input
                    type="number"
                    value={grossSalaryInput}
                    onChange={(e) => setGrossSalaryInput(Number(e.target.value))}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Số người phụ thuộc:</label>
                  <input
                    type="number"
                    value={dependentsInput}
                    onChange={(e) => setDependentsInput(Number(e.target.value))}
                    className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-lg text-[11px] space-y-1 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Giảm trừ bản thân (15.5M):</span>
                  <span className="font-bold text-slate-200">15.500.000 VNĐ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Giảm trừ phụ thuộc ({dependentsInput} người):</span>
                  <span className="font-bold text-slate-200">{(dependentsInput * 5500000).toLocaleString()} VNĐ</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-extrabold text-amber-400">
                  <span>Thuế TNCN Khấu Trừ Phải Nộp:</span>
                  <span>{pitResult.pitAmount.toLocaleString()} VNĐ ({pitResult.effectiveTaxRatePercent}%)</span>
                </div>
              </div>
            </div>

            {/* Form 01/VAT Output Summary */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Tóm Tắt Tờ Khai Thuế GTGT Mẫu 01/GTGT ({form01Vat.taxPeriod})</span>
              </h4>

              <div className="p-2.5 bg-slate-900/80 rounded-lg text-[11px] space-y-1 border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Tổng doanh số bán ra:</span>
                  <span className="font-bold text-slate-200">{form01Vat.totalSalesValue.toLocaleString()} VNĐ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thuế GTGT đầu ra phát sinh:</span>
                  <span className="font-bold text-rose-400">{form01Vat.totalSalesVat.toLocaleString()} VNĐ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thuế GTGT đầu vào được khấu trừ:</span>
                  <span className="font-bold text-emerald-400">{form01Vat.totalPurchaseVat.toLocaleString()} VNĐ</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 font-extrabold text-indigo-400">
                  <span>Số thuế GTGT phải nộp [40]:</span>
                  <span>{form01Vat.vatPayableCurrentPeriod.toLocaleString()} VNĐ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
