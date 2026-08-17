import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { RefreshCw, CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface UpdateCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateCheckerModal: React.FC<UpdateCheckerModalProps> = ({ isOpen, onClose }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleCheckUpdate = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setChecked(true);
    }, 1200);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Cập Nhật & Phiên Bản Phần Mềm" size="md">
      <div className="space-y-4 text-xs">
        {/* Phiên Bản Hiện Tại */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">Phiên bản đang sử dụng</div>
            <div className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              <span>v1.0.0 (Bản Chính Thức)</span>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold">
                Mới Nhất
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">Phát hành: 16/08/2026 • Chuẩn QĐ 61/QĐ-TLĐ & TT 107/2017/TT-BTC</div>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Đang kiểm tra...' : 'Kiểm Tra Bản Mới'}</span>
          </button>
        </div>

        {checked && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Phần mềm của bạn đang ở phiên bản mới nhất! Không có bản vá mới cần cài đặt.</span>
          </div>
        )}

        {/* Lịch Sử Cập Nhật & Biểu Mẫu */}
        <div className="space-y-2">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Các Tính Năng & Chuẩn Mực Trong Bản v1.0.0:</span>
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Biểu Mẫu Phiếu Thu (C40-BB) & Phiếu Chi (C41-BB):</strong> In đơn, in hàng loạt cả tháng, in theo tích chọn chuẩn khổ A4.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Trích Nộp 2% KPCĐ & 0.5% Đoàn Phí:</strong> Báo cáo Tháng (kèm Thai sản / Nghỉ việc / Sửa lương inline), Báo cáo Quý, Bảng tổng hợp năm TC.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Sổ Quỹ & Quyết Toán B07-TLĐ:</strong> Tự động gom Sổ Tiền Mặt (S11H), Sổ Ngân Hàng (S12-H) và 14 chỉ tiêu B07-TLĐ.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Sao Lưu & Chuyển Dữ Liệu:</strong> 1-click xuất file sao lưu JSON để di chuyển sang máy tính khác dễ dàng.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
          >
            Đóng
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
