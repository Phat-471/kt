import React, { useState } from 'react';
import { HelpCircle, FileSpreadsheet, ShieldAlert, GitCompare, Printer, HardDriveDownload, Sparkles, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

export const UserGuideView: React.FC = () => {
  const [openSection, setOpenSection] = useState<string>('step1');

  const sections = [
    {
      id: 'step1',
      title: '1. Quy trình làm việc 5 bước dành cho Kế toán viên',
      icon: Sparkles,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Ứng dụng <strong>AccoDesk</strong> được thiết kế theo quy trình hỗ trợ tối ưu công việc của Kế toán nội bộ và Kế toán làm dịch vụ ngoài:
          </p>
          <ol className="list-decimal list-inside space-y-2 font-medium">
            <li><strong className="text-brand-700 dark:text-brand-300">Tạo/Chọn Khách Hàng (Job)</strong>: Khởi tạo doanh nghiệp dịch vụ và niên độ kế toán tương ứng tại menu Quản lý Khách/Job.</li>
            <li><strong className="text-brand-700 dark:text-brand-300">Import & Map Cột Excel</strong>: Đọc file Excel nhật ký thu/chi hoặc sao kê ngân hàng, ánh xạ các trường thông tin chuẩn.</li>
            <li><strong className="text-brand-700 dark:text-brand-300">Xử Lý & Kiểm Lỗi Dữ Liệu</strong>: Hệ thống tự động bắt 9 quy tắc lỗi kế toán (lệch Nợ/Có, sai MST, khuyết ngày/số tiền). Kế toán duyệt cuối.</li>
            <li><strong className="text-brand-700 dark:text-brand-300">Đối Chiếu Song Song Sao Kê</strong>: Thuật toán thông minh tính điểm tin cậy % gợi ý ghép đôi Phiếu Thu/Chi với Sao kê Ngân hàng.</li>
            <li><strong className="text-brand-700 dark:text-brand-300">In Chứng Từ & Sao Lưu</strong>: Tự động dịch số tiền thành chữ Tiếng Việt, in Phiếu Thu/Chi Thông tư 200 và xuất file sao lưu <code>.accobak</code>.</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'step2',
      title: '2. Hướng dẫn Import Excel & Cấu Hình Mẫu Map Cột',
      icon: FileSpreadsheet,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Khi import file Excel từ các phần mềm khác (MISA, Fast, Bravo, sao kê Vietcombank, Techcombank...), bạn chỉ cần ánh xạ 1 lần và bấm nút <strong>"Lưu Mẫu Map"</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1.5 font-medium">
            <li>Các cột bắt buộc: <em>Ngày chứng từ, Số chứng từ, Diễn giải, Số tiền giao dịch</em>.</li>
            <li>Hệ thống hỗ trợ tự động nhận diện các từ khoá phổ biến trong bảng tính Excel Tiếng Việt.</li>
            <li>Các lần sau chỉ cần chọn mẫu map sẵn từ danh sách thả xuống mà không cần chỉnh lại.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'step3',
      title: '3. Các Quy Tắc Tự Động Kiểm Lỗi Kế Toán',
      icon: ShieldAlert,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Trình kiểm lỗi tự động kiểm tra tất cả các dòng giao dịch nạp vào hệ thống:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-medium">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-xl">
              <strong className="text-rose-700 dark:text-rose-400">Lỗi nghiêm trọng (Error)</strong>: Thiếu ngày, thiếu số tiền, mất cân đối TK Nợ / TK Có, số tiền nhỏ hơn hoặc bằng 0.
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
              <strong className="text-amber-700 dark:text-amber-400">Cảnh báo (Warning)</strong>: Mã số thuế không đúng 10 hoặc 13 chữ số, trùng số chứng từ giữa nhiều file Excel nạp trước đó, ngày tương lai.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'step4',
      title: '4. Mẹo Đối Chiếu 2 Chiều Thu/Chi vs Sao Kê Ngân Hàng',
      icon: GitCompare,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Bấm nút <strong>"Tìm Gợi Ý Ghép Đôi Tự Động"</strong> ở phân hệ So Sánh & Đối Chiếu. Hệ thống sẽ tính điểm tin cậy:
          </p>
          <ul className="list-disc list-inside space-y-1.5 font-medium">
            <li><strong>Ghép 100%</strong>: Trùng hoàn toàn số tiền, cùng ngày chứng từ và xuất hiện số chứng từ trong nội dung sao kê.</li>
            <li><strong>Lệch nhỏ số tiền (phí ngân hàng)</strong>: Số tiền lệch dưới 50.000 đ được ghi chú làm phí phát sinh.</li>
            <li>Sau khi kiểm tra, kế toán bấm nút <strong>"Duyệt Khớp"</strong> để ghi sổ đối chiếu.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'step5',
      title: '5. In Phiếu Thu/Chi & Đọc Số Tiền Bằng Chữ',
      icon: Printer,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Thuật toán tự động đọc số tiền Tiếng Việt (chuyển <code>12.500.000 đ</code> thành <em>"Mười hai triệu năm trăm ngàn đồng"</em>). Mẫu chứng từ tuân thủ Thông tư 200/2014/TT-BTC, cho phép bấm nút In trực tiếp ra giấy A5/A4 hoặc xuất file PDF.
          </p>
        </div>
      ),
    },
    {
      id: 'step6',
      title: '6. An Toàn Dữ Liệu Offline & Sao Lưu .accobak',
      icon: HardDriveDownload,
      content: (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Dữ liệu kế toán lưu trữ 100% cục bộ trên đĩa cứng máy tính cá nhân. Hãy thường xuyên sử dụng tính năng <strong>Sao Lưu Nhanh</strong> để lưu tệp <code>.accobak</code> ra đĩa hoặc USB phòng ngừa các trường hợp hư hỏng phần cứng máy tính.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Hướng Dẫn Sử Dụng & Quy Trình Kế Toán Trong App</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tổng hợp hướng dẫn làm việc từng bước và quy tắc kế toán chuẩn Thông tư 200/2014/TT-BTC.
          </p>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isOpen = openSection === sec.id;
          return (
            <div
              key={sec.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
            >
              <button
                onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                className="w-full p-4 text-left font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{sec.title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {isOpen && (
                <div className="p-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                  {sec.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
