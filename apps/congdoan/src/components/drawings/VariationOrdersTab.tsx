import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Edit, 
  Trash2, 
  FileText, 
  Layers, 
  DollarSign, 
  Calendar, 
  UserCheck, 
  Check, 
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  DrawingVariationOrder, 
  DrawingProject, 
  DrawingItem, 
  VariationOrderStatus 
} from '../../types/drawings';
import { 
  calculateVariationSummaryStats, 
  printVariationAgreement, 
  exportVariationOrdersToExcel 
} from '../../services/variationOrderService';
import { formatNumber } from '../../utils/formatters';

interface VariationOrdersTabProps {
  variationOrders: DrawingVariationOrder[];
  projects: DrawingProject[];
  drawings: DrawingItem[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onSaveVO: (vo: DrawingVariationOrder) => Promise<void>;
  onDeleteVO: (id: string) => Promise<void>;
}

export const VariationOrdersTab: React.FC<VariationOrdersTabProps> = ({
  variationOrders,
  projects,
  drawings,
  selectedProjectId,
  onSelectProject,
  onSaveVO,
  onDeleteVO,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VariationOrderStatus>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVO, setEditingVO] = useState<DrawingVariationOrder | null>(null);

  // Form State
  const [voNumber, setVoNumber] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId || projects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [requestedBy, setRequestedBy] = useState<DrawingVariationOrder['requestedBy']>('INVESTOR');
  const [legalBasis, setLegalBasis] = useState('');
  const [reasonCategory, setReasonCategory] = useState<DrawingVariationOrder['reasonCategory']>('CLIENT_REQUEST');
  const [timeExtensionDays, setTimeExtensionDays] = useState(0);
  const [status, setStatus] = useState<VariationOrderStatus>('SUBMITTED');
  const [vatRate, setVatRate] = useState(8);
  const [notes, setNotes] = useState('');
  const [signedByInvestor, setSignedByInvestor] = useState('');
  const [signedByConsultant, setSignedByConsultant] = useState('');
  const [signedByContractor, setSignedByContractor] = useState('');

  // Items State (Bản vẽ kèm theo)
  const [selectedDrawingId, setSelectedDrawingId] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [itemsList, setItemsList] = useState<DrawingVariationOrder['items']>([]);

  // Lọc VO theo dự án & tìm kiếm
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectVOs = selectedProjectId
    ? variationOrders.filter(vo => vo.projectId === selectedProjectId)
    : variationOrders;

  const filteredVOs = projectVOs.filter(vo => {
    const matchSearch = searchTerm === '' ||
      vo.voNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vo.legalBasis.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter === 'ALL' || vo.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Thống kê
  const stats = calculateVariationSummaryStats(projectVOs, currentProject?.contractValue || 0);

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    const pId = selectedProjectId || projects[0]?.id || '';
    const proj = projects.find(p => p.id === pId);
    const count = variationOrders.filter(v => v.projectId === pId).length + 1;
    const nextVoNumber = `VO-${proj?.projectCode?.slice(-4) || 'HP01'}-${String(count).padStart(3, '0')}`;

    setEditingVO(null);
    setVoNumber(nextVoNumber);
    setProjectId(pId);
    setTitle('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setRequestedBy('INVESTOR');
    setLegalBasis('Thư yêu cầu thay đổi thiết kế của Chủ Đầu Tư');
    setReasonCategory('CLIENT_REQUEST');
    setTimeExtensionDays(0);
    setStatus('SUBMITTED');
    setVatRate(8);
    setNotes('');
    setSignedByInvestor(proj?.investorName || '');
    setSignedByConsultant('KS. Đặng Quốc Bảo (TVGS)');
    setSignedByContractor('KTS. Lê Hoàng Sỹ (Hưng Phát)');
    setItemsList([]);
    setIsModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (vo: DrawingVariationOrder) => {
    setEditingVO(vo);
    setVoNumber(vo.voNumber);
    setProjectId(vo.projectId);
    setTitle(vo.title);
    setIssueDate(vo.issueDate);
    setRequestedBy(vo.requestedBy);
    setLegalBasis(vo.legalBasis);
    setReasonCategory(vo.reasonCategory);
    setTimeExtensionDays(vo.timeExtensionDays);
    setStatus(vo.status);
    setVatRate(vo.vatRate);
    setNotes(vo.notes || '');
    setSignedByInvestor(vo.signedByInvestor || '');
    setSignedByConsultant(vo.signedByConsultant || '');
    setSignedByContractor(vo.signedByContractor || '');
    setItemsList([...vo.items]);
    setIsModalOpen(true);
  };

  // Thêm bản vẽ vào danh sách phát sinh
  const handleAddItem = () => {
    if (!selectedDrawingId) {
      alert('Vui lòng chọn một bản vẽ liên quan!');
      return;
    }
    const drawing = drawings.find(d => d.id === selectedDrawingId);
    if (!drawing) return;

    const newItem = {
      drawingId: drawing.id,
      drawingNumber: drawing.drawingNumber,
      title: drawing.title,
      revision: drawing.currentRevision,
      nature: drawing.issueNature === 'VARIATION_ORDER' ? 'Bản vẽ phát sinh' : 'Bản vẽ hiệu chỉnh',
      description: itemDescription || `Điều chỉnh theo đợt phát sinh ${voNumber}`,
      amount: itemAmount,
    };

    setItemsList([...itemsList, newItem]);
    setSelectedDrawingId('');
    setItemDescription('');
    setItemAmount(0);
  };

  // Xóa item khỏi danh sách
  const handleRemoveItem = (index: number) => {
    setItemsList(itemsList.filter((_, idx) => idx !== index));
  };

  // Lưu VO
  const handleSubmitVO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !voNumber.trim()) {
      alert('Vui lòng nhập Mã số VO và Tiêu đề phát sinh!');
      return;
    }

    if (itemsList.length === 0) {
      alert('Vui lòng thêm ít nhất một bản vẽ / nội dung phát sinh vào danh sách!');
      return;
    }

    const totalAmount = itemsList.reduce((sum, item) => sum + item.amount, 0);
    const vatAmount = Math.round(totalAmount * (vatRate / 100));
    const totalWithVat = totalAmount + vatAmount;
    const proj = projects.find(p => p.id === projectId);

    const savedVO: DrawingVariationOrder = {
      id: editingVO ? editingVO.id : `vo-${Date.now()}`,
      voNumber,
      projectId,
      projectName: proj?.projectName || currentProject?.projectName || 'Dự án',
      title,
      issueDate,
      requestedBy,
      legalBasis,
      reasonCategory,
      items: itemsList,
      totalAmount,
      vatRate,
      vatAmount,
      totalWithVat,
      timeExtensionDays,
      status,
      signedByInvestor,
      signedByConsultant,
      signedByContractor,
      notes,
      createdAt: editingVO ? editingVO.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveVO(savedVO);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Thống Kê Chỉ Số Phát Sinh Dự Án */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Tổng Giá Trị Phát Sinh (VO)</div>
            <div className="text-lg font-black text-blue-700">
              {formatNumber(stats.totalVariationAmount)} <span className="text-xs">đ</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {stats.totalVOs} đợt ({stats.variationRatioPercent}% so với HĐ gốc)
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Đã Ký Duyệt Chính Thức</div>
            <div className="text-lg font-black text-emerald-700">
              {formatNumber(stats.approvedVariationAmount)} <span className="text-xs">đ</span>
            </div>
            <div className="text-[11px] text-emerald-600 font-bold">
              {stats.approvedVOs} đợt đã ký 3 bên
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Đang Trình Chờ Ký Duyệt</div>
            <div className="text-lg font-black text-amber-700">
              {formatNumber(stats.pendingVariationAmount)} <span className="text-xs">đ</span>
            </div>
            <div className="text-[11px] text-amber-600 font-bold">
              {stats.submittedVOs + stats.draftVOs} đợt đang thương thảo
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">Giá Trị Hợp Đồng Gốc</div>
            <div className="text-lg font-black text-slate-900">
              {formatNumber(stats.contractValue)} <span className="text-xs">đ</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {currentProject?.projectCode || 'Tất cả DA'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Thanh Điều Khiển & Bộ Lọc */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Lọc Dự Án */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="text-slate-500 font-semibold">Công Trình:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectCode}] {p.projectName}
                </option>
              ))}
            </select>
          </div>

          {/* Tìm Kiếm */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã VO, nội dung phát sinh..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lọc Trạng Thái */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none"
            >
              <option value="ALL">Tất Cả Trạng Thái</option>
              <option value="APPROVED">✅ Đã Duyệt (Approved)</option>
              <option value="SUBMITTED">⏳ Đang Trình (Submitted)</option>
              <option value="DRAFT">📝 Dự Thảo (Draft)</option>
              <option value="BILLED">💰 Đã Quyết Toán (Billed)</option>
            </select>
          </div>
        </div>

        {/* Nút Hành Động */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportVariationOrdersToExcel(filteredVOs, currentProject?.projectName || 'Du_An')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Xuất bảng kê chi phí phát sinh ra Excel chuẩn nghiệm thu"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel Bảng Kê</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Đợt Phát Sinh (VO)</span>
          </button>
        </div>
      </div>

      {/* 3. Danh Sách Các Đợt Phát Sinh */}
      <div className="space-y-4">
        {filteredVOs.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-60" />
            <div className="font-bold text-slate-700">Chưa có đợt phát sinh (VO) nào trong công trình này</div>
            <div className="text-xs text-slate-400 mt-1">
              Bấm nút "Thêm Đợt Phát Sinh (VO)" ở trên để lập biên bản thỏa thuận chi phí với Chủ Đầu Tư & TVGS.
            </div>
          </div>
        ) : (
          filteredVOs.map((vo) => {
            const statusBadge = 
              vo.status === 'APPROVED' ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã Ký Duyệt 3 Bên
                </span>
              ) : vo.status === 'SUBMITTED' ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Đang Trình Duyệt
                </span>
              ) : vo.status === 'BILLED' ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Đã Quyết Toán
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Dự Thảo
                </span>
              );

            return (
              <div key={vo.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all">
                {/* Header Thẻ VO */}
                <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                        {vo.voNumber}
                      </span>
                      <span className="text-xs text-slate-400">• Ngày lập: {vo.issueDate}</span>
                      {statusBadge}
                      {vo.timeExtensionDays > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md border border-orange-200">
                          + {vo.timeExtensionDays} ngày tiến độ
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{vo.title}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Căn cứ:</span> {vo.legalBasis}
                    </div>
                  </div>

                  {/* Khối Tiền & Nút In */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Tổng Tiền Phát Sinh (VAT {vo.vatRate}%)</div>
                      <div className="text-xl font-black text-blue-800">
                        {formatNumber(vo.totalWithVat)} <span className="text-xs">đ</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Trước thuế: {formatNumber(vo.totalAmount)} đ
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                      {/* Nút In Biên Bản Ký 3 Bên */}
                      <button
                        onClick={() => printVariationAgreement(vo, currentProject)}
                        className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                        title="In hoặc Lưu PDF Biên Bản Thỏa Thuận Ký 3 Bên (CĐT - TVGS - Hưng Phát)"
                      >
                        <Printer className="w-4 h-4 text-indigo-600" />
                        <span>In Biên Bản (3 Bên)</span>
                      </button>

                      {/* Nút Sửa */}
                      <button
                        onClick={() => handleOpenEdit(vo)}
                        className="p-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl transition-all"
                        title="Chỉnh sửa đợt phát sinh"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Nút Xóa */}
                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa đợt phát sinh ${vo.voNumber}?`)) {
                            onDeleteVO(vo.id);
                          }
                        }}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                        title="Xóa đợt phát sinh"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danh Sách Bản Vẽ Thuộc Đợt Phát Sinh */}
                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chi Tiết {vo.items.length} Bản Vẽ & Khối Lượng Phát Sinh Bổ Sung:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vo.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {item.drawingNumber}
                            </span>
                            <span className="font-bold text-slate-800">{item.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({item.revision})</span>
                          </div>
                          <div className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                            {item.description}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-900">{formatNumber(item.amount)} đ</div>
                          <span className="text-[10px] text-slate-400 font-medium">{item.nature}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thông tin đại diện 3 bên ký */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                  <div className="flex items-center gap-4">
                    <span>🏢 <b>CĐT:</b> {vo.signedByInvestor || 'Chưa cập nhật'}</span>
                    <span>📐 <b>TVGS:</b> {vo.signedByConsultant || 'Chưa cập nhật'}</span>
                    <span>🏗️ <b>Nhà Thầu:</b> {vo.signedByContractor || 'Hưng Phát'}</span>
                  </div>
                  {vo.notes && (
                    <div className="italic text-slate-400">Ghi chú: {vo.notes}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Modal Tạo / Sửa Đợt Phát Sinh (VO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingVO ? 'Chỉnh Sửa Đợt Phát Sinh (VO)' : 'Tạo Đợt Phát Sinh Mới (Variation Order)'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Lập thỏa thuận chi phí & liên kết bản vẽ điều chỉnh để trình CĐT & TVGS ký duyệt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVO} className="p-6 space-y-4 text-xs">
              {/* Hàng 1: Mã VO, Dự Án, Ngày */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Mã Số VO (*):</label>
                  <input
                    type="text"
                    value={voNumber}
                    onChange={(e) => setVoNumber(e.target.value)}
                    placeholder="VO-HP01-001"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl font-mono font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Công Trình / Dự Án:</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl font-bold focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>[{p.projectCode}] {p.projectName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Ngày Lập Biên Bản:</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Hàng 2: Tên Hạng Mục Phát Sinh */}
              <div>
                <label className="text-slate-700 font-bold block mb-1">Tên Hạng Mục Phát Sinh (*):</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Xử lý vướng đường ống nước ngầm cũ & gia cố giằng móng băng trục 3"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Hàng 3: Căn Cứ & Nguyên Nhân */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Căn Cứ Pháp Lý & Đề Xuất:</label>
                  <input
                    type="text"
                    value={legalBasis}
                    onChange={(e) => setLegalBasis(e.target.value)}
                    placeholder="VD: Thư yêu cầu của CĐT ngày 08/04 & Biên bản hiện trường"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Nhóm Nguyên Nhân:</label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl font-semibold focus:outline-none"
                  >
                    <option value="CLIENT_REQUEST">Chủ Đầu Tư Đổi Ý / Nâng Cấp Thiết Kế</option>
                    <option value="SITE_CONFLICT">Xử Lý Chướng Ngại Vật Hiện Trường</option>
                    <option value="TECHNICAL_OPTIMIZATION">Tối Ưu Kỹ Thuật & Khả Năng Chịu Lực</option>
                    <option value="SAFETY_REGULATION">Tuân Thủ Quy Chuẩn & PCCC</option>
                  </select>
                </div>
              </div>

              {/* Hàng 4: Thêm Bản Vẽ Liên Quan */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Danh Sách Bản Vẽ & Chi Tiết Khối Lượng Phát Sinh ({itemsList.length}):</span>
                  </span>
                </div>

                {/* Form thêm item */}
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <select
                      value={selectedDrawingId}
                      onChange={(e) => {
                        setSelectedDrawingId(e.target.value);
                        const d = drawings.find(x => x.id === e.target.value);
                        if (d) setItemDescription(`Điều chỉnh theo bản vẽ ${d.drawingNumber}`);
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-900 px-2 py-1.5 rounded-lg font-medium"
                    >
                      <option value="">-- Chọn bản vẽ liên quan --</option>
                      {drawings
                        .filter(d => !selectedProjectId || d.projectId === selectedProjectId)
                        .map(d => (
                          <option key={d.id} value={d.id}>
                            [{d.drawingNumber}] {d.title} ({d.currentRevision})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="Mô tả công việc phát sinh..."
                      className="w-full bg-white border border-slate-200 text-slate-900 px-2 py-1.5 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={itemAmount || ''}
                      onChange={(e) => setItemAmount(Number(e.target.value))}
                      placeholder="Số tiền (đ)"
                      className="w-full bg-white border border-slate-200 text-slate-900 px-2 py-1.5 rounded-lg font-bold text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full h-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center"
                      title="Thêm vào danh sách"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Danh sách items đã thêm */}
                {itemsList.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto">
                    {itemsList.map((item, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                            {item.drawingNumber}
                          </span>
                          <span className="font-bold text-slate-800">{item.title}</span>
                          <span className="text-slate-500 italic text-[11px]">- {item.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{formatNumber(item.amount)} đ</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hàng 5: Thuế & Trạng Thái & Tiến Độ */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Thuế VAT (%):</label>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    <option value={8}>8% (Giảm thuế)</option>
                    <option value={10}>10% (Chuẩn)</option>
                    <option value={0}>0% (Không thuế)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Gia Hạn Tiến Độ (Ngày):</label>
                  <input
                    type="number"
                    value={timeExtensionDays}
                    onChange={(e) => setTimeExtensionDays(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg font-bold text-right"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Trạng Thái Ký Duyệt:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    <option value="SUBMITTED">⏳ Đang Trình Duyệt</option>
                    <option value="APPROVED">✅ Đã Ký Duyệt 3 Bên</option>
                    <option value="BILLED">💰 Đã Quyết Toán</option>
                    <option value="DRAFT">📝 Dự Thảo</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tổng Cộng Sau Thuế:</label>
                  <div className="font-black text-blue-800 text-base pt-1">
                    {formatNumber(
                      itemsList.reduce((sum, i) => sum + i.amount, 0) * (1 + vatRate / 100)
                    )} đ
                  </div>
                </div>
              </div>

              {/* Hàng 6: Người Ký 3 Bên */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Đại Diện CĐT (Bên A):</label>
                  <input
                    type="text"
                    value={signedByInvestor}
                    onChange={(e) => setSignedByInvestor(e.target.value)}
                    placeholder="Ông Trần Minh Thắng"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Đại Diện TVGS (Bên C):</label>
                  <input
                    type="text"
                    value={signedByConsultant}
                    onChange={(e) => setSignedByConsultant(e.target.value)}
                    placeholder="KS. Đặng Quốc Bảo"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Đại Diện Nhà Thầu (Bên B):</label>
                  <input
                    type="text"
                    value={signedByContractor}
                    onChange={(e) => setSignedByContractor(e.target.value)}
                    placeholder="KTS. Lê Hoàng Sỹ"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-2.5 py-1.5 rounded-lg"
                  />
                </div>
              </div>

              {/* Nút Submit */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm active:scale-95 transition-all"
                >
                  {editingVO ? 'Lưu Thay Đổi' : 'Tạo Đợt Phát Sinh (VO)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
