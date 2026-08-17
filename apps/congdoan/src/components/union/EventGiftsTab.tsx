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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 flex-shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Danh Sách Chi Quà Lễ Tết Đoàn Viên</h3>
            <p className="text-xs text-slate-500">Quà Tết Dương Lịch, Tết Nguyên Đán, 8/3, 30/4, 2/9, Trung Thu, 20/10</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {eventGifts.length > 0 && (
            <select
              value={selectedEventKey}
              onChange={(e) => onSelectEventKey(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-rose-500 shadow-sm"
            >
              {eventGifts.map(g => (
                <option key={g.eventKey} value={g.eventKey}>{g.eventName} ({g.totalPersons} người - {formatNumber(g.totalAmount)} đ)</option>
              ))}
            </select>
          )}

          {activeGift && (
            <button
              onClick={() => onSyncGift(activeGift)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Duyệt & Tạo Phiếu Chi Quà</span>
            </button>
          )}
        </div>
      </div>

      {eventGifts.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-2 shadow-sm">
          <Gift className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="font-semibold text-slate-700 text-sm">Chưa có danh sách quà Lễ Tết</div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bấm <strong>"Nạp File Excel"</strong> để nạp các sheet quà từ file <code>Phi cong doan 2026.xlsx</code>.
          </p>
        </div>
      ) : activeGift && (
        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg text-xs border border-slate-100 flex-wrap gap-2">
            <div>Mức quà: <strong className="text-slate-900">{formatNumber(activeGift.giftPerPerson)} đ/người</strong></div>
            <div>Số người nhận: <strong className="text-slate-900">{activeGift.totalPersons} người</strong></div>
            <div>Tổng tiền: <strong className="text-rose-700 text-sm font-bold">{formatNumber(activeGift.totalAmount)} đ</strong></div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 text-center w-10">STT</th>
                  <th className="p-2.5">Họ & Tên Đoàn Viên</th>
                  <th className="p-2.5">Tổ CĐ / Bộ Phận</th>
                  <th className="p-2.5 text-right">Số Tiền (đ)</th>
                  <th className="p-2.5 text-center">Ký Nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeGift.beneficiaries.map(b => (
                  <tr key={b.stt} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center text-slate-400 font-mono">{b.stt}</td>
                    <td className="p-2.5 font-semibold text-slate-900">{b.fullName}</td>
                    <td className="p-2.5 text-slate-500">{b.department || 'CĐCS'}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-700 font-bold">{formatNumber(b.amount)}</td>
                    <td className="p-2.5 text-center text-slate-400 italic">Đã ký</td>
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
