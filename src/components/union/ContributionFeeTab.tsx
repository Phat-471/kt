import React, { useState, useMemo } from 'react';
import { 
  TradeUnionContributionPeriod, 
  UnionEmployee, 
  UnionSignerSettings, 
  Client, 
  TradeUnionMemberContribution,
  TradeUnionMonthlyYearSummaryRow
} from '../../types/accounting';
import { 
  Coins, 
  Sparkles, 
  Upload, 
  Printer, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  UserPlus, 
  Calendar, 
  Layers, 
  FileText, 
  Baby, 
  UserX, 
  CheckCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { 
  recalculateMemberContribution, 
  recalculateContributionPeriod,
  generateQuarterlyContributionPeriod,
  generateYearSummaryTC,
  generateContributionReportHTML,
  generateYearSummaryTCHTML,
  exportContributionPeriodToExcel,
  exportYearSummaryTCToExcel
} from '../../services/tradeUnionService';

interface ContributionFeeTabProps {
  periods: TradeUnionContributionPeriod[];
  selectedPeriodKey: string;
  onSelectPeriodKey: (key: string) => void;
  onSavePeriod: (period: TradeUnionContributionPeriod) => void;
  onSyncPeriod: (period: TradeUnionContributionPeriod) => void;
  onUploadClick: () => void;
  employees: UnionEmployee[];
  signerSettings?: UnionSignerSettings;
  activeClient?: Client | null;
  selectedYear: number;
}

type ViewMode = 'MONTH' | 'QUARTER' | 'YEAR_TC';

export const ContributionFeeTab: React.FC<ContributionFeeTabProps> = ({
  periods,
  selectedPeriodKey,
  onSelectPeriodKey,
  onSavePeriod,
  onSyncPeriod,
  onUploadClick,
  employees,
  signerSettings,
  activeClient,
  selectedYear,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Mặc định tháng 6
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberSalary, setNewMemberSalary] = useState<number>(5700000);
  const [newMemberNotes, setNewMemberNotes] = useState('');

  // Key của tháng đang chọn (VD: "062026")
  const currentMonthKey = `${String(selectedMonth).padStart(2, '0')}${selectedYear}`;

  // Tìm period của tháng hiện tại
  const currentMonthPeriod = useMemo(() => {
    const found = periods.find(p => p.periodKey === currentMonthKey || (p.month === selectedMonth && p.year === selectedYear));
    if (found) return found;
    return null;
  }, [periods, currentMonthKey, selectedMonth, selectedYear]);

  // Kỳ Quý được tính tự động từ các tháng
  const quarterlyPeriod = useMemo(() => {
    return generateQuarterlyContributionPeriod(selectedQuarter, selectedYear, periods);
  }, [selectedQuarter, selectedYear, periods]);

  // Bảng Tổng hợp Cả Năm (Sheet TC)
  const yearSummaryTC = useMemo(() => {
    return generateYearSummaryTC(selectedYear, periods, activeClient || undefined);
  }, [selectedYear, periods, activeClient]);

  // Khởi tạo bảng tháng mới từ danh sách nhân viên cố định
  const handleInitializeFromEmployees = () => {
    const baseList = employees.length > 0 ? employees : [
      { id: '1', code: '01', fullName: 'Trần Minh Thắng', insuranceSalary: 5700000 },
      { id: '2', code: '02', fullName: 'Lê Hoàng Sỹ', insuranceSalary: 5700000 },
      { id: '3', code: '03', fullName: 'Dương Hồng Loan', insuranceSalary: 5700000 },
    ];

    const initialMembers: TradeUnionMemberContribution[] = baseList.map((emp, idx) => {
      const isMaternity = emp.fullName.includes('Sử Ngọc Quế');
      return recalculateMemberContribution({
        stt: idx + 1,
        employeeId: emp.id,
        employeeCode: emp.code,
        fullName: emp.fullName,
        insuranceSalary: isMaternity ? 0 : (emp.insuranceSalary || 5700000),
        status: isMaternity ? 'MATERNITY' : 'ACTIVE',
        notes: isMaternity ? 'Nghỉ thai sản' : '',
      });
    });

    const newPeriod = recalculateContributionPeriod({
      periodKey: currentMonthKey,
      periodLabel: `Tháng ${String(selectedMonth).padStart(2, '0')}/${selectedYear}`,
      periodType: 'MONTH',
      year: selectedYear,
      month: selectedMonth,
      reportDate: `Ngày 01 tháng ${String(selectedMonth).padStart(2, '0')} năm ${selectedYear}`,
      preparerName: signerSettings?.preparerName || 'Nguyễn Thị Cẩm Ly',
      members: initialMembers,
    });

    onSavePeriod(newPeriod);
    onSelectPeriodKey(currentMonthKey);
  };

  // Cập nhật 1 trường của 1 nhân viên trong tháng
  const handleUpdateMember = (
    index: number,
    field: 'fullName' | 'insuranceSalary' | 'status' | 'notes',
    value: any
  ) => {
    if (!currentMonthPeriod) return;

    const updatedMembers = [...currentMonthPeriod.members];
    const target = { ...updatedMembers[index] };

    if (field === 'status') {
      target.status = value;
      if (value === 'MATERNITY') {
        target.insuranceSalary = 0;
        target.notes = target.notes || 'Nghỉ thai sản';
      } else if (value === 'UNPAID_LEAVE') {
        target.insuranceSalary = 0;
        target.notes = target.notes || 'Nghỉ không lương';
      } else if (value === 'RESIGNED') {
        target.insuranceSalary = 0;
        target.notes = target.notes || 'Đã thôi việc';
      } else if (value === 'ACTIVE' && target.insuranceSalary === 0) {
        target.insuranceSalary = 5700000;
        if (target.notes === 'Nghỉ thai sản' || target.notes === 'Nghỉ không lương') {
          target.notes = '';
        }
      }
    } else if (field === 'insuranceSalary') {
      target.insuranceSalary = Number(value) || 0;
      if (target.insuranceSalary > 0 && target.status !== 'ACTIVE') {
        target.status = 'ACTIVE';
      }
    } else if (field === 'notes') {
      target.notes = value;
    } else if (field === 'fullName') {
      target.fullName = value;
    }

    updatedMembers[index] = recalculateMemberContribution(target);

    const updatedPeriod = recalculateContributionPeriod({
      ...currentMonthPeriod,
      members: updatedMembers,
    });

    onSavePeriod(updatedPeriod);
  };

  // Xóa 1 thành viên khỏi bảng tháng
  const handleDeleteMember = (index: number) => {
    if (!currentMonthPeriod) return;
    const updatedMembers = currentMonthPeriod.members.filter((_, idx) => idx !== index);
    const updatedPeriod = recalculateContributionPeriod({
      ...currentMonthPeriod,
      members: updatedMembers,
    });
    onSavePeriod(updatedPeriod);
  };

  // Thêm thành viên mới vào bảng tháng
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMonthPeriod || !newMemberName.trim()) return;

    const newMember = recalculateMemberContribution({
      stt: currentMonthPeriod.members.length + 1,
      fullName: newMemberName.trim(),
      insuranceSalary: newMemberSalary,
      status: newMemberSalary > 0 ? 'ACTIVE' : 'MATERNITY',
      notes: newMemberNotes.trim(),
    });

    const updatedPeriod = recalculateContributionPeriod({
      ...currentMonthPeriod,
      members: [...currentMonthPeriod.members, newMember],
    });

    onSavePeriod(updatedPeriod);
    setNewMemberName('');
    setNewMemberSalary(5700000);
    setNewMemberNotes('');
    setIsAddMemberModalOpen(false);
  };

  // In báo cáo HTML
  const handlePrintHTML = (htmlContent: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="space-y-4">
      {/* Header & Bộ Chọn 3 Chế Độ Xem Báo Cáo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex-shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">Quản Lý Trích Nộp Kinh Phí (2%) & Đoàn Phí (0.5%)</h3>
            <p className="text-xs text-slate-500">Chuẩn hóa dữ liệu từng tháng để tự động liên kết Báo cáo Quý, Sổ sách và Quyết toán năm</p>
          </div>
        </div>

        {/* 3 Nút Chọn Chế Độ Xem */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full lg:w-auto">
          <button
            onClick={() => setViewMode('MONTH')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'MONTH' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Báo Cáo Tháng</span>
          </button>
          <button
            onClick={() => setViewMode('QUARTER')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'QUARTER' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Báo Cáo Quý</span>
          </button>
          <button
            onClick={() => setViewMode('YEAR_TC')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'YEAR_TC' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bảng Tổng Hợp Năm (TC)</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CHẾ ĐỘ 1: BÁO CÁO THEO THÁNG (CỐT LÕI)
          ========================================================================= */}
      {viewMode === 'MONTH' && (
        <div className="space-y-4">
          {/* Thanh Chọn Tháng (Tháng 1 -> Tháng 12) & Các Thao Tác */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Bộ Nút Tháng 1..12 */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const isSelected = selectedMonth === m;
                const monthKey = `${String(m).padStart(2, '0')}${selectedYear}`;
                const hasData = periods.some(p => p.periodKey === monthKey || (p.month === m && p.year === selectedYear));

                return (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(m);
                      onSelectPeriodKey(monthKey);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : hasData 
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>T{m}</span>
                    {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>
                );
              })}
            </div>

            {/* Các Nút Hành Động Cho Tháng Đang Chọn */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {currentMonthPeriod && (
                <>
                  <button
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm Người</span>
                  </button>

                  <button
                    onClick={() => onSyncPeriod(currentMonthPeriod)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Duyệt & Ghi Sổ Quỹ</span>
                  </button>

                  <button
                    onClick={() => handlePrintHTML(generateContributionReportHTML(currentMonthPeriod, signerSettings, activeClient || undefined))}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In A4</span>
                  </button>

                  <button
                    onClick={() => exportContributionPeriodToExcel(currentMonthPeriod, activeClient || undefined, signerSettings)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Excel</span>
                  </button>
                </>
              )}

              <button
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nạp Excel</span>
              </button>
            </div>
          </div>

          {/* Chưa có dữ liệu tháng này -> Hiển thị nút Khởi tạo */}
          {!currentMonthPeriod ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 shadow-sm">
              <Coins className="w-12 h-12 text-blue-500/50 mx-auto" />
              <div className="font-bold text-slate-800 text-sm">
                Chưa có dữ liệu Bảng Trích Nộp Tháng {selectedMonth}/{selectedYear}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bạn có thể khởi tạo nhanh danh sách nhân viên từ danh mục cài đặt để bắt đầu tính toán và ghi nhận các biến động thai sản, tăng giảm lương.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  onClick={handleInitializeFromEmployees}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Khởi Tạo Bảng Tháng {selectedMonth} Từ Danh Mục Nhân Viên ({employees.length || 34} người)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Có dữ liệu tháng -> Hiển thị bảng chi tiết đầy đủ */
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              {/* Thẻ Thống Kê Nhanh Tháng */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 bg-slate-50 p-3 rounded-lg text-xs border border-slate-100">
                <div className="p-2 bg-white rounded border border-slate-200/80">
                  <div className="text-[11px] text-slate-500">Số Lao Động</div>
                  <div className="font-bold text-slate-900 text-sm">{currentMonthPeriod.totalEmployees} người</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200/80">
                  <div className="text-[11px] text-slate-500">Quỹ Lương BHXH</div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{formatNumber(currentMonthPeriod.totalInsuranceSalary)} đ</div>
                </div>
                <div className="p-2 bg-white rounded border border-emerald-200 bg-emerald-50/30">
                  <div className="text-[11px] text-emerald-800">2% KPCĐ Giữ 75%</div>
                  <div className="font-bold text-emerald-700 text-sm font-mono">{formatNumber(currentMonthPeriod.totalKpcdRetained)} đ</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200/80">
                  <div className="text-[11px] text-slate-500">2% KPCĐ Nộp 25%</div>
                  <div className="font-bold text-slate-700 text-sm font-mono">{formatNumber(currentMonthPeriod.totalKpcdSuperior)} đ</div>
                </div>
                <div className="p-2 bg-white rounded border border-rose-200 bg-rose-50/30">
                  <div className="text-[11px] text-rose-800 font-bold">Tổng 2% KPCĐ</div>
                  <div className="font-bold text-rose-600 text-sm font-mono">{formatNumber(currentMonthPeriod.totalKpcd)} đ</div>
                </div>
                <div className="p-2 bg-white rounded border border-emerald-200 bg-emerald-50/30">
                  <div className="text-[11px] text-emerald-800">Đoàn Phí Giữ 70%</div>
                  <div className="font-bold text-emerald-700 text-sm font-mono">{formatNumber(currentMonthPeriod.totalDoanPhiRetained)} đ</div>
                </div>
                <div className="p-2 bg-white rounded border border-rose-200 bg-rose-50/30">
                  <div className="text-[11px] text-rose-800 font-bold">Tổng Nộp Cấp Trên</div>
                  <div className="font-bold text-rose-600 text-sm font-mono">{formatNumber(currentMonthPeriod.netPayableToSuperior)} đ</div>
                </div>
              </div>

              {/* Bảng Chi Tiết Từng Nhân Viên */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <tr>
                      <th rowSpan={2} className="p-2 w-10 border-r border-slate-200">STT</th>
                      <th rowSpan={2} className="p-2 min-w-[180px] text-left border-r border-slate-200">Họ & Tên</th>
                      <th rowSpan={2} className="p-2 w-32 border-r border-slate-200">Trạng Thái</th>
                      <th rowSpan={2} className="p-2 w-32 border-r border-slate-200 text-right">Mức Lương Đóng</th>
                      <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-blue-50/60 text-blue-900">Trích Đóng 2% KPCĐ</th>
                      <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-emerald-50/60 text-emerald-900">Trích Đóng 0.5% Đoàn Phí</th>
                      <th rowSpan={2} className="p-2 w-28 text-right border-r border-slate-200">Tổng Cộng (2.5%)</th>
                      <th rowSpan={2} className="p-2 min-w-[140px] text-left border-r border-slate-200">Ghi Chú</th>
                      <th rowSpan={2} className="p-2 w-10">Xóa</th>
                    </tr>
                    <tr>
                      <th className="p-1.5 w-28 border-r border-slate-200 text-right bg-blue-50/40 text-emerald-700">CĐ Cty giữ 75%</th>
                      <th className="p-1.5 w-28 border-r border-slate-200 text-right bg-blue-50/40 text-slate-600">LĐ VN giữ 25%</th>
                      <th className="p-1.5 w-28 border-r border-slate-200 text-right bg-emerald-50/40 text-emerald-700">CĐ Cty giữ 70%</th>
                      <th className="p-1.5 w-28 border-r border-slate-200 text-right bg-emerald-50/40 text-slate-600">LĐ QTP giữ 30%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentMonthPeriod.members.map((m, idx) => {
                      const isMaternity = m.status === 'MATERNITY';
                      const isUnpaid = m.status === 'UNPAID_LEAVE';
                      const isResigned = m.status === 'RESIGNED';

                      return (
                        <tr 
                          key={m.stt || idx} 
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isMaternity ? 'bg-purple-50/50' : isUnpaid ? 'bg-amber-50/40' : isResigned ? 'bg-slate-100 opacity-60' : idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                          }`}
                        >
                          <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">{idx + 1}</td>
                          
                          <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                            <input
                              type="text"
                              value={m.fullName}
                              onChange={(e) => handleUpdateMember(idx, 'fullName', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 font-semibold text-slate-900"
                            />
                          </td>

                          {/* Chọn Trạng Thái Nhân Sự */}
                          <td className="p-1.5 border-r border-slate-200">
                            <select
                              value={m.status || 'ACTIVE'}
                              onChange={(e) => handleUpdateMember(idx, 'status', e.target.value)}
                              className={`w-full text-xs font-semibold px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                                isMaternity 
                                  ? 'bg-purple-100 text-purple-800 border-purple-300' 
                                  : isUnpaid 
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : isResigned 
                                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                                      : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="ACTIVE">🟢 Đang đi làm</option>
                              <option value="MATERNITY">🟣 Nghỉ thai sản</option>
                              <option value="UNPAID_LEAVE">🟡 Nghỉ không lương</option>
                              <option value="RESIGNED">🔴 Đã thôi việc</option>
                            </select>
                          </td>

                          {/* Mức Lương Đóng BHXH (Inline Edit) */}
                          <td className="p-1.5 border-r border-slate-200 text-right">
                            <input
                              type="number"
                              value={m.insuranceSalary || ''}
                              disabled={isMaternity || isUnpaid || isResigned}
                              onChange={(e) => handleUpdateMember(idx, 'insuranceSalary', e.target.value)}
                              className={`w-full text-right font-mono px-2 py-1 rounded border focus:outline-none focus:ring-1 ${
                                isMaternity || isUnpaid || isResigned
                                  ? 'bg-slate-100 text-slate-400 border-slate-200' 
                                  : 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 font-semibold'
                              }`}
                              placeholder="0"
                            />
                          </td>

                          {/* 4 Cột Trích Nộp Tự Động Tính */}
                          <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                            {formatNumber(m.kpcdRetainedAmount)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-500 border-r border-slate-200">
                            {formatNumber(m.kpcdSuperiorAmount)}
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">
                            {formatNumber(m.doanPhiRetainedAmount)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-500 border-r border-slate-200">
                            {formatNumber(m.doanPhiSuperiorAmount)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                            {formatNumber(m.totalAmount)}
                          </td>

                          {/* Ghi Chú */}
                          <td className="p-1.5 border-r border-slate-200">
                            <input
                              type="text"
                              value={m.notes || ''}
                              onChange={(e) => handleUpdateMember(idx, 'notes', e.target.value)}
                              placeholder="Ghi chú..."
                              className="w-full bg-transparent text-xs text-slate-600 px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-none"
                            />
                          </td>

                          {/* Xóa Khỏi Tháng */}
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => handleDeleteMember(idx)}
                              title="Xóa nhân viên khỏi tháng này"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* DÒNG TỔNG CỘNG */}
                    <tr className="bg-amber-50/80 font-bold text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={3} className="p-2.5 text-center border-r border-slate-300">TỔNG CỘNG</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-900">
                        {formatNumber(currentMonthPeriod.totalInsuranceSalary)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">
                        {formatNumber(currentMonthPeriod.totalKpcdRetained)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-700">
                        {formatNumber(currentMonthPeriod.totalKpcdSuperior)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">
                        {formatNumber(currentMonthPeriod.totalDoanPhiRetained)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-700">
                        {formatNumber(currentMonthPeriod.totalDoanPhiSuperior)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300 text-base text-slate-900">
                        {formatNumber(currentMonthPeriod.totalInsuranceSalary > 0 ? Math.round(currentMonthPeriod.totalInsuranceSalary * 0.025) : 0)}
                      </td>
                      <td colSpan={2} className="p-2.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* DÒNG TỔNG 2% KPCĐ MÀU ĐỎ NỔI BẬT NHƯ ẢNH GỐC */}
              <div className="flex items-center justify-center p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                <span className="font-bold text-rose-700 text-sm">
                  🔴 Tổng 2% Kinh Phí Công Đoàn: {formatNumber(currentMonthPeriod.totalKpcd)} đ
                </span>
              </div>

              {/* KHỐI CHÂN TRANG & CHỮ KÝ */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <div>
                  * Đang áp dụng mức đóng Đoàn phí 0.5% theo Quyết định số 61/QĐ-TLĐ ngày 29/07/2025.
                </div>
                <div className="text-right font-semibold text-slate-700">
                  <div>{currentMonthPeriod.reportDate || `Ngày 01 tháng ${String(selectedMonth).padStart(2, '0')} năm ${selectedYear}`}</div>
                  <div className="font-bold text-slate-900 mt-1">Người lập: {signerSettings?.preparerName || 'Nguyễn Thị Cẩm Ly'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 2: BÁO CÁO THEO QUÝ (Q1, Q2, Q3, Q4)
          ========================================================================= */}
      {viewMode === 'QUARTER' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Bộ Chọn Quý */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedQuarter === q 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Quý 0{q} (Tháng {(q-1)*3 + 1} - {(q-1)*3 + 3})
                </button>
              ))}
            </div>

            {/* Các Nút In & Xuất Quý */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintHTML(generateContributionReportHTML(quarterlyPeriod, signerSettings, activeClient || undefined))}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Báo Cáo Quý 0{selectedQuarter}</span>
              </button>

              <button
                onClick={() => exportContributionPeriodToExcel(quarterlyPeriod, activeClient || undefined, signerSettings)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel Quý 0{selectedQuarter}</span>
              </button>
            </div>
          </div>

          {/* Bảng Dữ Liệu Quý */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs border border-slate-100">
              <div>Số Lao Động: <strong className="text-slate-900">{quarterlyPeriod.totalEmployees} người</strong></div>
              <div>Quỹ lương BHXH Quý: <strong className="text-slate-900">{formatNumber(quarterlyPeriod.totalInsuranceSalary)} đ</strong></div>
              <div>2% KPCĐ Giữ 75%: <strong className="text-emerald-700">{formatNumber(quarterlyPeriod.totalKpcdRetained)} đ</strong></div>
              <div>Tổng Nộp Cấp Trên: <strong className="text-rose-700">{formatNumber(quarterlyPeriod.netPayableToSuperior)} đ</strong></div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                  <tr>
                    <th rowSpan={2} className="p-2 w-10 border-r border-slate-200">STT</th>
                    <th rowSpan={2} className="p-2 text-left border-r border-slate-200">Họ & Tên</th>
                    <th rowSpan={2} className="p-2 text-right border-r border-slate-200">Mức Lương Đóng Quý</th>
                    <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-blue-50/60 text-blue-900">Trích Đóng 2% KPCĐ</th>
                    <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-emerald-50/60 text-emerald-900">Trích Đóng 0.5% Đoàn Phí</th>
                    <th rowSpan={2} className="p-2 text-right border-r border-slate-200">Tổng Cộng Quý</th>
                    <th rowSpan={2} className="p-2 text-left">Ghi Chú</th>
                  </tr>
                  <tr>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-blue-50/40 text-emerald-700">CĐ Cty giữ 75%</th>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-blue-50/40 text-slate-600">LĐ VN giữ 25%</th>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-emerald-50/40 text-emerald-700">CĐ Cty giữ 70%</th>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-emerald-50/40 text-slate-600">LĐ QTP giữ 30%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quarterlyPeriod.members.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">{m.fullName}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-200">{formatNumber(m.insuranceSalary)}</td>
                      <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">{formatNumber(m.kpcdRetainedAmount)}</td>
                      <td className="p-2 text-right font-mono text-slate-500 border-r border-slate-200">{formatNumber(m.kpcdSuperiorAmount)}</td>
                      <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-slate-200">{formatNumber(m.doanPhiRetainedAmount)}</td>
                      <td className="p-2 text-right font-mono text-slate-500 border-r border-slate-200">{formatNumber(m.doanPhiSuperiorAmount)}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{formatNumber(m.totalAmount)}</td>
                      <td className="p-2 text-slate-500">{m.notes || '-'}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td colSpan={2} className="p-2.5 text-center border-r border-slate-300">TỔNG CỘNG QUÝ 0{selectedQuarter}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">{formatNumber(quarterlyPeriod.totalInsuranceSalary)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">{formatNumber(quarterlyPeriod.totalKpcdRetained)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-700">{formatNumber(quarterlyPeriod.totalKpcdSuperior)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">{formatNumber(quarterlyPeriod.totalDoanPhiRetained)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-700">{formatNumber(quarterlyPeriod.totalDoanPhiSuperior)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-base">{formatNumber(quarterlyPeriod.totalInsuranceSalary > 0 ? Math.round(quarterlyPeriod.totalInsuranceSalary * 0.025) : 0)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 3: BẢNG TỔNG HỢP CẢ NĂM (SHEET TC)
          ========================================================================= */}
      {viewMode === 'YEAR_TC' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-800 text-sm">Bảng Tính Kinh Phí, Đoàn Phí Công Đoàn Năm {selectedYear} (Mẫu TC)</div>
              <div className="text-xs text-slate-500">Tổng hợp 12 tháng kinh phí 2% và đoàn phí 0.5% đã đối soát</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintHTML(generateYearSummaryTCHTML(yearSummaryTC, signerSettings))}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Bảng Tổng Hợp Năm</span>
              </button>

              <button
                onClick={() => exportYearSummaryTCToExcel(yearSummaryTC, activeClient || undefined, signerSettings)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel Bảng TC</span>
              </button>
            </div>
          </div>

          {/* Bảng 8 Cột Chuẩn Mực Sheet TC */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                  <tr>
                    <th className="p-2.5 border-r border-slate-200">
                      Tháng/ Năm Phát Sinh<br/><span className="font-normal text-[10px] text-slate-500">(1)</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200">
                      Số Lao Động<br/><span className="font-normal text-[10px] text-slate-500">(2)</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 text-right">
                      Quỹ lương nộp BHXH<br/><span className="font-normal text-[10px] text-slate-500">(3)</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 text-right">
                      Nộp 2% KPCĐ<br/><span className="font-normal text-[10px] text-slate-500">(4)=(3) x 2%</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 text-right text-emerald-800 bg-emerald-50/50">
                      Nhận 75% KPCĐ<br/><span className="font-normal text-[10px] text-emerald-700">(5)=(4) x 75%</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 text-right text-rose-800 bg-rose-50/50">
                      Thực đóng (25%)<br/><span className="font-normal text-[10px] text-rose-700">(6)=(4) - (5)</span>
                    </th>
                    <th className="p-2.5 border-r border-slate-200 text-right text-emerald-800 bg-emerald-50/50">
                      CĐ Cty giữ 70% ĐP<br/><span className="font-normal text-[10px] text-emerald-700">(7)=(3) x 0.5% x 70%</span>
                    </th>
                    <th className="p-2.5 text-right text-rose-800 bg-rose-50/50">
                      Nộp 30% ĐP (0.5%)<br/><span className="font-normal text-[10px] text-rose-700">(8)=(3) x 0.5% x 30%</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {yearSummaryTC.monthlyRows.map((r: TradeUnionMonthlyYearSummaryRow) => (
                    <tr key={r.monthNumber} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-900 border-r border-slate-200">{r.monthLabel}</td>
                      <td className="p-2.5 text-center border-r border-slate-200 font-mono">{r.employeeCount || '-'}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">{formatNumber(r.insuranceSalaryFund)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200 font-semibold">{formatNumber(r.kpcdTotal2Pct)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200 text-emerald-700 font-semibold">{formatNumber(r.kpcdRetained75Pct)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200 text-rose-700 font-semibold">{formatNumber(r.kpcdPayable25Pct)}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200 text-emerald-700 font-semibold">{formatNumber(r.doanPhiRetained70Pct)}</td>
                      <td className="p-2.5 text-right font-mono text-rose-700 font-semibold">{formatNumber(r.doanPhiPayable30Pct)}</td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50/90 font-bold text-slate-900 border-t-2 border-slate-400">
                    <td className="p-2.5 text-center border-r border-slate-300">TỔNG CỘNG</td>
                    <td className="p-2.5 text-center border-r border-slate-300">{yearSummaryTC.totalEmployeeAverage || '-'}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-900">{formatNumber(yearSummaryTC.totalInsuranceSalaryFund)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-slate-900">{formatNumber(yearSummaryTC.totalKpcd2Pct)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">{formatNumber(yearSummaryTC.totalKpcdRetained75Pct)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-rose-800">{formatNumber(yearSummaryTC.totalKpcdPayable25Pct)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300 text-emerald-800">{formatNumber(yearSummaryTC.totalDoanPhiRetained70Pct)}</td>
                    <td className="p-2.5 text-right font-mono text-rose-800">{formatNumber(yearSummaryTC.totalDoanPhiPayable30Pct)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL THÊM ĐOÀN VIÊN / NHÂN VIÊN MỚI VÀO THÁNG
          ========================================================================= */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-base mb-1">Thêm Nhân Viên Vào Bảng Tháng {selectedMonth}/{selectedYear}</h3>
            <p className="text-xs text-slate-500 mb-4">Điền họ tên và mức lương đóng BHXH để tự động tính mức trích nộp.</p>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên Nhân Viên / Đoàn Viên *</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mức Lương Đóng BHXH (VND)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={newMemberSalary}
                  onChange={(e) => setNewMemberSalary(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-blue-500"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  * Nếu nghỉ thai sản hoặc không đóng, nhập 0 đ.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú</label>
                <input
                  type="text"
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  placeholder="Ví dụ: Nghỉ thai sản, Mới tuyển..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Thêm Vào Bảng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
