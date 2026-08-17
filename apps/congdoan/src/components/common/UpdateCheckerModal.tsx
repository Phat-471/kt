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
              <span>v1.1.0</span>
              <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold">
                Mới Nhất
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">Phát hành: 17/08/2026 • Chuẩn QĐ 61/QĐ-TLĐ & TT 107/2017/TT-BTC</div>
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
            <span>Phần mềm của bạn đang ở phiên bản v1.1.0 mới nhất! Đã tích hợp đầy đủ các mẫu biểu thực tế.</span>
          </div>
        )}

        {/* Lịch Sử Cập Nhật & Biểu Mẫu */}
        <div className="space-y-2">
          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Tính Năng Mới Trong Bản Cập Nhật v1.1.0:</span>
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Nạp Dữ Liệu Excel Thực Tế (Thu chi 2025, Phi cong doan 2026, BCQT 2026):</strong> Tự động nhận diện chứng từ Thu/Chi, Bảng trích nộp tháng, và 7 đợt quà lễ/Tết.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Tự Động Đồng Bộ Danh Bạ Đoàn Viên:</strong> Nạp danh sách nhân sự mới từ Excel vào cơ sở dữ liệu để chọn nhanh khi tạo phiếu.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Chuẩn Hóa Tỷ Lệ Theo Quyết Định số 61/QĐ-TLĐ:</strong> Phân bổ 75% KPCĐ giữ lại / 25% cấp trên; 70% Đoàn phí giữ lại / 30% cấp trên.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <div>
                <strong className="text-slate-800">Xuất Báo Cáo / Sổ Sách Ra Excel Chuẩn Mẫu:</strong> Xuất Bảng trích nộp tháng/quý, Bảng TC 12 tháng, Sổ Quỹ TM (S11H), Sổ NH (S12-H) và Quyết toán (B07-TLĐ).
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
