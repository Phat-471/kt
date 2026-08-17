import React from 'react';
import { TradeUnionSettlementB07Report } from '../../types/accounting';
import { Landmark, Printer } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface SettlementB07TabProps {
  report: TradeUnionSettlementB07Report;
  onPrintReport: () => void;
}

export const SettlementB07Tab: React.FC<SettlementB07TabProps> = ({
  report,
  onPrintReport,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Báo Cáo Quyết Toán Thu Chi Tài Chính Công Đoàn (Mẫu B07-TLĐ)</h3>
            <p className="text-xs text-slate-500">Tự động tổng hợp số liệu từ Sổ Quỹ Tiền Mặt và Sổ Ngân Hàng theo Hướng dẫn 47/HD-TLĐ</p>
          </div>
        </div>

        <button
          onClick={onPrintReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>In Báo Cáo B07-TLĐ (PDF)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-100">
        <div>- Số LĐ đóng KPCĐ: <strong className="text-slate-900">{report.basicIndicators.totalEmployeesKpcd} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-900">{formatNumber(report.basicIndicators.salaryFundKpcd)} đ</strong></div>
        <div>- Số đoàn viên đóng ĐPCĐ: <strong className="text-slate-900">{report.basicIndicators.totalMembers} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-900">{formatNumber(report.basicIndicators.salaryFundDoanPhi)} đ</strong></div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase">
            <tr>
              <th className="p-2.5 w-12 text-center">TT</th>
              <th className="p-2.5">Nội Dung Chỉ Tiêu</th>
              <th className="p-2.5 w-24 text-center">Mã Mục Lục</th>
              <th className="p-2.5 w-36 text-right">Quyết Toán Năm (đ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.items.map((it, idx) => {
              const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
              return (
                <tr key={idx} className={isMajor ? 'bg-slate-50 font-bold text-slate-900' : 'hover:bg-slate-50/60'}>
                  <td className="p-2.5 text-center text-slate-400 font-mono">{it.stt}</td>
                  <td className="p-2.5">{it.content}</td>
                  <td className="p-2.5 text-center text-slate-500 font-mono">{it.code}</td>
                  <td className="p-2.5 text-right font-mono text-slate-900 font-bold">{formatNumber(it.settledAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
