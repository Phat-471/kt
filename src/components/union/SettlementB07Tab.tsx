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
    <div className="bg-slate-900/60 p-6 rounded-xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950 text-blue-400 rounded-xl border border-blue-800/50">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Tính Năng 5: Báo Cáo Quyết Toán Thu, Chi Tài Chính Công Đoàn (Mẫu B07-TLĐ)</h3>
            <p className="text-xs text-slate-400">Tự động tổng hợp số liệu từ Sổ Quỹ Tiền Mặt và Sổ Ngân Hàng theo Hướng dẫn 47/HD-TLĐ</p>
          </div>
        </div>

        <button
          onClick={onPrintReport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>In Báo Cáo B07-TLĐ (PDF)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/40 p-3 rounded-lg text-xs">
        <div>- Số LĐ đóng KPCĐ: <strong className="text-slate-200">{report.basicIndicators.totalEmployeesKpcd} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-200">{formatNumber(report.basicIndicators.salaryFundKpcd)} đ</strong></div>
        <div>- Số đoàn viên đóng ĐPCĐ: <strong className="text-slate-200">{report.basicIndicators.totalMembers} người</strong> &nbsp;|&nbsp; Quỹ lương: <strong className="text-slate-200">{formatNumber(report.basicIndicators.salaryFundDoanPhi)} đ</strong></div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400 font-semibold uppercase text-xs">
            <tr>
              <th className="p-3 w-14 text-center">TT</th>
              <th className="p-3">Nội Dung Chỉ Tiêu</th>
              <th className="p-3 w-28 text-center">Mã Mục Lục</th>
              <th className="p-3 w-36 text-right">Quyết Toán Năm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {report.items.map((it, idx) => {
              const isMajor = it.stt === 'I' || it.stt === 'II' || it.stt === 'III' || it.stt === 'IV';
              return (
                <tr key={idx} className={isMajor ? 'bg-slate-800/60 font-bold text-slate-100' : 'hover:bg-slate-800/30'}>
                  <td className="p-3 text-center text-slate-400">{it.stt}</td>
                  <td className="p-3">{it.content}</td>
                  <td className="p-3 text-center text-slate-400 font-mono">{it.code}</td>
                  <td className="p-3 text-right font-mono text-slate-100 font-medium">{formatNumber(it.settledAmount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
