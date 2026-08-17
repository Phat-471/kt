import React from 'react';
import { TradeUnionEventGiftList } from '../../types/accounting';
import { Gift, Sparkles } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

interface EventGiftsTabProps {
  eventGifts: TradeUnionEventGiftList[];
  selectedEventKey: string;
  onSelectEventKey: (key: string) => void;
  onSyncGift: (gift: TradeUnionEventGiftList) => void;
}

export const EventGiftsTab: React.FC<EventGiftsTabProps> = ({
  eventGifts,
  selectedEventKey,
  onSelectEventKey,
  onSyncGift,
}) => {
  const activeGift = eventGifts.find(g => g.eventKey === selectedEventKey) || eventGifts[0];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-950 text-rose-400 rounded-xl border border-rose-800/50">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Tính Năng 2: Danh Sách Chi Quà Lễ Tết Đoàn Viên</h3>
            <p className="text-xs text-slate-400">Quản lý các đợt tặng quà: Tết Dương Lịch, Tết Nguyên Đán, 8/3, 30/4, 2/9, Trung Thu, 20/10</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {eventGifts.length > 0 && (
            <select
              value={selectedEventKey}
              onChange={(e) => onSelectEventKey(e.target.value)}
              className="bg-slate-800 border border-rose-500/40 rounded-lg px-3 py-2 text-sm text-rose-300 font-medium focus:outline-none"
            >
              {eventGifts.map(g => (
                <option key={g.eventKey} value={g.eventKey}>{g.eventName} ({g.totalPersons} người - {formatNumber(g.totalAmount)} đ)</option>
              ))}
            </select>
          )}

          {activeGift && (
            <button
              onClick={() => onSyncGift(activeGift)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Duyệt & Sinh Phiếu Chi Quà</span>
            </button>
          )}
        </div>
      </div>

      {eventGifts.length === 0 ? (
        <div className="bg-slate-900/40 p-8 rounded-xl border border-slate-800 text-center space-y-3">
          <Gift className="w-12 h-12 text-rose-400 mx-auto opacity-70" />
          <div className="font-semibold text-slate-200">Chưa có danh sách quà Lễ Tết</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Bấm <strong>"Nạp File Excel"</strong> để nạp các sheet quà từ file <code>Phi cong doan 2026.xlsx</code>.
          </p>
        </div>
      ) : activeGift && (
        <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between bg-slate-800/40 p-3 rounded-lg text-xs">
            <div>Mức quà: <strong className="text-slate-200">{formatNumber(activeGift.giftPerPerson)} đ/người</strong></div>
            <div>Số đoàn viên nhận: <strong className="text-slate-200">{activeGift.totalPersons} người</strong></div>
            <div>Tổng chi phí: <strong className="text-rose-400 text-sm font-bold">{formatNumber(activeGift.totalAmount)} đ</strong></div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="p-2.5 text-center w-10">STT</th>
                  <th className="p-2.5">Họ & Tên Đoàn Viên</th>
                  <th className="p-2.5">Bộ Phận / Tổ CĐ</th>
                  <th className="p-2.5 text-right">Số Tiền Quà (VND)</th>
                  <th className="p-2.5 text-center">Ký Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeGift.beneficiaries.map(b => (
                  <tr key={b.stt} className="hover:bg-slate-800/30">
                    <td className="p-2.5 text-center text-slate-500">{b.stt}</td>
                    <td className="p-2.5 font-medium text-slate-200">{b.fullName}</td>
                    <td className="p-2.5 text-slate-400">{b.department || 'CĐCS'}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-400 font-semibold">{formatNumber(b.amount)}</td>
                    <td className="p-2.5 text-center text-slate-500 italic">Đã ký nhận</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
