import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowLeft, 
  History, 
  QrCode, 
  Download, 
  Eye, 
  Sparkles, 
  Compass, 
  Cpu, 
  Share2, 
  ShieldCheck,
  FolderOpen,
  Calendar,
  User,
  Tag,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ExternalLink,
  Briefcase,
  SlidersHorizontal,
  Flame,
  FileCheck2,
  AlertOctagon,
  TrendingUp,
  DollarSign,
  Settings,
  Edit,
  Trash2,
  Save,
  Check,
  FolderKanban,
  FileCode,
  Users,
  CheckCircle,
  Table as TableIcon,
  LayoutGrid,
  FileSpreadsheet,
  Printer,
  ClipboardCheck,
  BarChart3,
  SendHorizontal,
  Scale,
  Award,
  AlertCircle,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { 
  DrawingProject, 
  DrawingItem, 
  DrawingDiscipline, 
  DrawingStageType,
  DrawingIssueNature,
  DrawingStatus,
  DrawingCompany,
  DrawingRevision,
  DrawingTransmittal,
  MonthlyDrawingSummary
} from '../../types/drawings';
import { db, seedInitialDrawingsData } from '../../services/storage';
import { exportDrawingsToExcel } from '../../services/drawingsExportService';
import { 
  calculateMonthlySummary, 
  exportMonthlyReportToExcel, 
  printTransmittalForm 
} from '../../services/monthlyDrawingsReportService';
import { 
  extractTimelineLogs, 
  calculateEmployeeStats, 
  exportReconciliationExcel, 
  printReconciliationDoc,
  TimelineLogItem,
  EmployeeProductivityStats
} from '../../services/reconciliationService';
import { APP_VERSION } from '../../constants/version';

interface DrawingsManagerViewProps {
  onBackToAccounting: () => void;
}

type BlueprintMainTab = 'DRAWINGS_LIST' | 'RECONCILIATION_TIMELINE' | 'PROJECTS_LIST' | 'MONTHLY_REPORT' | 'SETTINGS';
type DisplayMode = 'TABLE' | 'GRID';

export const DrawingsManagerView: React.FC<DrawingsManagerViewProps> = ({ onBackToAccounting }) => {
  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState<BlueprintMainTab>(() => {
    try {
      return (localStorage.getItem('ACCODESK_DRAWINGS_ACTIVE_TAB') as BlueprintMainTab) || 'DRAWINGS_LIST';
    } catch {
      return 'DRAWINGS_LIST';
    }
  });
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      return (localStorage.getItem('ACCODESK_DRAWINGS_DISPLAY_MODE') as DisplayMode) || 'TABLE';
    } catch {
      return 'TABLE';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ACCODESK_DRAWINGS_ACTIVE_TAB', activeMainTab);
    } catch {}
  }, [activeMainTab]);

  useEffect(() => {
    try {
      localStorage.setItem('ACCODESK_DRAWINGS_DISPLAY_MODE', displayMode);
    } catch {}
  }, [displayMode]);

  // Data State từ Dexie DB
  const [projects, setProjects] = useState<DrawingProject[]>([]);
  const [companies, setCompanies] = useState<DrawingCompany[]>([]);
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Batch Selection State: Chọn nhiều bản vẽ cùng lúc
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);

  // Bộ lọc cho Tab Nhật Ký & Đối Chiếu Khách Hàng
  const [reconAuthorFilter, setReconAuthorFilter] = useState<string>('ALL');
  const [reconFaultFilter, setReconFaultFilter] = useState<string>('ALL');
  const [reconSearchTerm, setReconSearchTerm] = useState<string>('');

  // Báo Cáo Tháng & Bàn Giao State
  const [reportYear, setReportYear] = useState<number>(2026);
  const [reportMonth, setReportMonth] = useState<number>(8);
  const [transmittals, setTransmittals] = useState<DrawingTransmittal[]>([
    {
      id: 'trans-01',
      transmittalNo: 'TR-2026-08-01',
      projectId: 'proj-01',
      projectName: 'Biệt Thự Phố Vườn Tân Phú',
      senderCompany: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
      senderPerson: 'KTS. Lê Hoàng Sỹ',
      recipientCompany: 'TƯ VẤN GIÁM SÁT SÀI GÒN & BAN QLDA CĐT',
      recipientPerson: 'KS. Trương Hoàng Nam',
      issueDate: '2026-08-18',
      purpose: 'FOR_CONSTRUCTION',
      status: 'CONFIRMED',
      notes: 'Bàn giao hồ sơ bản vẽ thi công đợt 1 kèm bản sửa đổi kết cấu dầm D2A',
      drawingItems: [
        {
          drawingId: 'draw-01',
          drawingNumber: 'KT-01',
          title: 'Mặt Bằng Bố Trí Nội Thất Tầng 1',
          revision: 'Rev 00',
          sheetSize: 'A2',
          copiesCount: 2,
          hasSoftCopy: true,
        },
        {
          drawingId: 'draw-02',
          drawingNumber: 'KC-01',
          title: 'Mặt Bằng Bố Trí Thép Sàn Tầng 2 & Chi Tiết Dầm D2A',
          revision: 'Rev 01',
          sheetSize: 'A1',
          copiesCount: 2,
          hasSoftCopy: true,
        },
        {
          drawingId: 'draw-03',
          drawingNumber: 'KC-PS01',
          title: 'Chi Tiết Bổ Sung Móng Băng Trục 3 Tránh Ống Nước Cũ',
          revision: 'Rev 00',
          sheetSize: 'A1',
          copiesCount: 2,
          hasSoftCopy: true,
        }
      ]
    }
  ]);
  
  // Tải dữ liệu từ Dexie DB
  const loadDatabase = async () => {
    try {
      await seedInitialDrawingsData();
      const projList = await db.drawingProjects.toArray();
      const compList = await db.drawingCompanies.toArray();
      const drawList = await db.drawings.toArray();

      setProjects(projList);
      setCompanies(compList);
      setDrawings(drawList);

      if (projList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projList[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải CSDL bản vẽ:', err);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Settings State: Tiền tố & Lý do sửa
  const [drawingCodePrefixes] = useState([
    { code: 'KT-', name: 'Kiến Trúc Tổng Thể', discipline: 'ARCHITECTURE', sheet: 'A2' },
    { code: 'KC-', name: 'Kết Cấu Bê Tông Cốt Thép', discipline: 'STRUCTURE', sheet: 'A1' },
    { code: 'MEP-', name: 'Cơ Điện Lạnh & Cấp Thoát Nước', discipline: 'MEP', sheet: 'A2' },
    { code: 'SHOP-', name: 'Shop Drawing Gia Công Xưởng', discipline: 'ARCHITECTURE', sheet: 'A1' },
    { code: 'XPXD-', name: 'Hồ Sơ Xin Phép Xây Dựng', discipline: 'ARCHITECTURE', sheet: 'A0' },
    { code: 'HC-', name: 'Hồ Sơ Bản Vẽ Hoàn Công', discipline: 'AS_BUILT', sheet: 'A1' },
  ]);

  const [changeReasons] = useState([
    { id: 'INVESTOR_REQUEST', name: 'Chủ Đầu Tư yêu cầu thay đổi thiết kế / công năng' },
    { id: 'SITE_CONFLICT', name: 'Xung đột hiện trường (Vướng kết cấu, địa chất khác biệt)' },
    { id: 'COST_OPTIMIZATION', name: 'Tối ưu hóa chi phí & vật tư thi công' },
    { id: 'REGULATORY_CHANGE', name: 'Thay đổi theo quy định cơ quan cấp phép xây dựng' },
    { id: 'ERROR_CORRECTION', name: 'Chỉnh sửa lỗi sai sót kích thước kỹ thuật' },
  ]);

  // Bộ lọc đa chiều Tab 1
  const [selectedDiscipline, setSelectedDiscipline] = useState<DrawingDiscipline>('ALL');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<DrawingStageType>('ALL');
  const [selectedNature, setSelectedNature] = useState<DrawingIssueNature>('ALL');
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Phân Trang Bản Vẽ
  const [drawingPageSize, setDrawingPageSize] = useState<number | 'ALL'>(25);
  const [drawingCurrentPage, setDrawingCurrentPage] = useState<number>(1);
  
  // Modal State
  const [selectedDrawing, setSelectedDrawing] = useState<DrawingItem | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeQrDrawing, setActiveQrDrawing] = useState<DrawingItem | null>(null);

  // Form Thêm / Sửa Bản Vẽ
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [editingDrawing, setEditingDrawing] = useState<DrawingItem | null>(null);
  const [isAddingNewRevision, setIsAddingNewRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionReasonType, setRevisionReasonType] = useState<'INVESTOR_REQUEST' | 'ERROR_CORRECTION' | 'SITE_CONFLICT'>('INVESTOR_REQUEST');
  const [drawingForm, setDrawingForm] = useState<Partial<DrawingItem>>({
    drawingNumber: '',
    title: '',
    companyId: '',
    discipline: 'ARCHITECTURE',
    stageType: 'CONSTRUCTION',
    issueNature: 'NEW_ISSUE',
    scale: '1/100',
    sheetSize: 'A2',
    author: 'KTS. Lê Hoàng Sỹ',
    approver: 'Chủ Đầu Tư',
    variationAmount: 0,
    costingLinkId: '',
    tags: [],
  });

  // Modal Thêm Công Trình Mới
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<DrawingProject>>({
    projectCode: '',
    projectName: '',
    investorName: '',
    address: '',
    contractValue: 0,
    leadArchitect: 'KTS. Lê Hoàng Sỹ',
    leadEngineer: 'KS. Võ Huy Phong',
  });

  // Modal Tạo Biên Bản Bàn Giao
  const [isTransmittalModalOpen, setIsTransmittalModalOpen] = useState(false);
  const [selectedDrawingsForTransmittal, setSelectedDrawingsForTransmittal] = useState<string[]>([]);
  const [transmittalRecipient, setTransmittalRecipient] = useState('TƯ VẤN GIÁM SÁT & CHỦ ĐẦU TƯ');
  const [transmittalRecipientPerson, setTransmittalRecipientPerson] = useState('KS. Trương Hoàng Nam');
  const [transmittalPurpose, setTransmittalPurpose] = useState<'FOR_CONSTRUCTION' | 'FOR_APPROVAL' | 'FOR_REVIEW'>('FOR_CONSTRUCTION');
  const [transmittalNotes, setTransmittalNotes] = useState('');

  // Settings Modal: Thêm Công Ty
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<DrawingCompany>>({
    name: '',
    shortName: '',
    role: 'SUB_CONTRACTOR',
    contactPerson: '',
    phone: '',
  });

  const fallbackProject: DrawingProject = {
    id: 'proj-01',
    projectCode: 'CT-2026-HP01',
    projectName: 'Dự Án Công Trình Mẫu',
    investorId: 'comp-cdt-01',
    investorName: 'Chủ Đầu Tư',
    mainContractorId: 'comp-hp',
    mainContractorName: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
    address: 'TP. Hồ Chí Minh',
    contractValue: 0,
    startDate: '2026-01-01',
    expectedEndDate: '2026-12-31',
    status: 'CONSTRUCTING',
    leadArchitect: 'KTS. Lê Hoàng Sỹ',
    leadEngineer: 'KS. Võ Huy Phong',
    drawingCount: 0,
  };

  const activeProject: DrawingProject = projects.find(p => p.id === selectedProjectId) || projects[0] || fallbackProject;

  // Lọc đa chiều danh sách bản vẽ Tab 1
  const allProjectDrawings = drawings.filter(d => d.projectId === selectedProjectId);

  const availableAuthors = React.useMemo(() => {
    const set = new Set<string>();
    allProjectDrawings.forEach(d => { if (d.author) set.add(d.author); });
    return Array.from(set).sort();
  }, [allProjectDrawings]);

  const filteredDrawings = allProjectDrawings.filter(d => {
    if (selectedDiscipline !== 'ALL' && d.discipline !== selectedDiscipline) return false;
    if (selectedCompanyId !== 'ALL' && d.companyId !== selectedCompanyId) return false;
    if (selectedStage !== 'ALL' && d.stageType !== selectedStage) return false;
    if (selectedNature !== 'ALL' && d.issueNature !== selectedNature) return false;
    if (selectedAuthorFilter !== 'ALL' && d.author !== selectedAuthorFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNum = d.drawingNumber.toLowerCase().includes(q);
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchCompany = d.companyName.toLowerCase().includes(q);
      const matchAuthor = d.author.toLowerCase().includes(q);
      const matchTag = d.tags.some(t => t.toLowerCase().includes(q));
      return matchNum || matchTitle || matchCompany || matchAuthor || matchTag;
    }
    return true;
  });

  const drawingTotalPages = Math.max(1, Math.ceil(filteredDrawings.length / (typeof drawingPageSize === 'number' ? drawingPageSize : filteredDrawings.length)));
  const safeDrawingCurrentPage = Math.min(Math.max(1, drawingCurrentPage), drawingTotalPages);
  const paginatedDrawings = drawingPageSize === 'ALL'
    ? filteredDrawings
    : filteredDrawings.slice((safeDrawingCurrentPage - 1) * drawingPageSize, safeDrawingCurrentPage * drawingPageSize);

  // Thống kê nhanh
  const totalInProject = allProjectDrawings.length;
  const newIssuesCount = allProjectDrawings.filter(d => d.issueNature === 'NEW_ISSUE').length;
  const revisionCount = allProjectDrawings.filter(d => d.issueNature === 'REVISION_MODIFIED').length;
  const variationCount = allProjectDrawings.filter(d => d.issueNature === 'VARIATION_ORDER').length;
  const totalVariationValue = allProjectDrawings
    .filter(d => d.isVariationOrder)
    .reduce((sum, d) => sum + (d.variationAmount || 0), 0);

  // Xử lý Chọn Nhiều Checkbox
  const isAllFilteredSelected = filteredDrawings.length > 0 && filteredDrawings.every(d => selectedDrawingIds.includes(d.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Bỏ chọn tất cả các bản vẽ đang lọc
      const filteredIds = filteredDrawings.map(d => d.id);
      setSelectedDrawingIds(selectedDrawingIds.filter(id => !filteredIds.includes(id)));
    } else {
      // Chọn tất cả các bản vẽ đang lọc
      const newIds = Array.from(new Set([...selectedDrawingIds, ...filteredDrawings.map(d => d.id)]));
      setSelectedDrawingIds(newIds);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedDrawingIds.includes(id)) {
      setSelectedDrawingIds(selectedDrawingIds.filter(i => i !== id));
    } else {
      setSelectedDrawingIds([...selectedDrawingIds, id]);
    }
  };

  // Xử lý Xóa Hàng Loạt Các Bản Vẽ Đã Chọn
  const handleBatchDelete = async () => {
    if (selectedDrawingIds.length === 0) return;

    const count = selectedDrawingIds.length;
    if (!window.confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA ${count} BẢN VẼ ĐÃ CHỌN?\n\nHành động này sẽ xóa vĩnh viễn các bản vẽ khỏi CSDL dự án và không thể hoàn tác.`)) {
      return;
    }

    try {
      await db.drawings.bulkDelete(selectedDrawingIds);
      await loadDatabase();
      setSelectedDrawingIds([]);
      if (selectedDrawing && selectedDrawingIds.includes(selectedDrawing.id)) {
        setSelectedDrawing(null);
      }
      alert(`✅ Đã xóa thành công ${count} bản vẽ khỏi dự án!`);
    } catch (err: any) {
      alert(`Lỗi khi xóa hàng loạt: ${err?.message}`);
    }
  };

  // Xử lý Xuất Excel Các Bản Vẽ Đã Chọn
  const handleExportSelectedExcel = () => {
    if (selectedDrawingIds.length === 0) return;
    const selectedDraws = drawings.filter(d => selectedDrawingIds.includes(d.id));
    exportDrawingsToExcel({
      project: activeProject,
      drawings: selectedDraws,
      filterDescription: `${selectedDraws.length} bản vẽ đã chọn`,
      isAll: false
    });
  };

  // Dữ liệu Nhật Ký & Đối Chiếu Khách Hàng (Tab 2)
  const allTimelineLogs = extractTimelineLogs(allProjectDrawings);
  const employeeStats = calculateEmployeeStats(allTimelineLogs);

  // Lọc dữ liệu Nhật Ký
  const filteredTimelineLogs = allTimelineLogs.filter(log => {
    if (reconAuthorFilter !== 'ALL' && log.author !== reconAuthorFilter) return false;
    if (reconFaultFilter !== 'ALL' && log.faultParty !== reconFaultFilter) return false;
    if (reconSearchTerm) {
      const q = reconSearchTerm.toLowerCase();
      return log.drawingNumber.toLowerCase().includes(q) || 
             log.drawingTitle.toLowerCase().includes(q) || 
             log.changeDescription.toLowerCase().includes(q) ||
             log.date.includes(q);
    }
    return true;
  });

  // Số liệu tổng hợp báo cáo tháng
  const monthlySummary = calculateMonthlySummary(allProjectDrawings, transmittals, reportYear, reportMonth);
  const drawingsInMonth = allProjectDrawings.filter(d => {
    const mKey = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
    return (d.createdAt && d.createdAt.startsWith(mKey)) || d.revisions.some(r => r.changeDate && r.changeDate.startsWith(mKey));
  });
  const transmittalsInMonth = transmittals.filter(t => t.issueDate && t.issueDate.startsWith(`${reportYear}-${String(reportMonth).padStart(2, '0')}`));

  // =========================================================================
  // XỬ LÝ THÊM - XÓA - SỬA BẢN VẼ (CRUD)
  // =========================================================================
  // Auto-Save Draft khi người dùng nhập form bản vẽ mới
  useEffect(() => {
    if (isDrawingModalOpen && !editingDrawing && drawingForm.title) {
      try {
        localStorage.setItem('ACCODESK_DRAWING_DRAFT', JSON.stringify({ projectId: selectedProjectId, form: drawingForm }));
      } catch (e) {}
    }
  }, [isDrawingModalOpen, editingDrawing, drawingForm, selectedProjectId]);

  const clearDrawingDraft = () => {
    try {
      localStorage.removeItem('ACCODESK_DRAWING_DRAFT');
    } catch (e) {}
  };

  const openCreateDrawingModal = () => {
    setEditingDrawing(null);
    setIsAddingNewRevision(false);
    setRevisionNote('');

    let restoredDraft: any = null;
    try {
      const saved = localStorage.getItem('ACCODESK_DRAWING_DRAFT');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.projectId === selectedProjectId && parsed.form?.title) {
          restoredDraft = parsed.form;
        }
      }
    } catch (e) {}

    if (restoredDraft) {
      setDrawingForm(restoredDraft);
    } else {
      setDrawingForm({
        drawingNumber: 'KT-01',
        title: '',
        companyId: companies[0]?.id || 'comp-hp',
        discipline: 'ARCHITECTURE',
        stageType: 'CONSTRUCTION',
        issueNature: 'NEW_ISSUE',
        scale: '1/100',
        sheetSize: 'A2',
        author: 'KTS. Lê Hoàng Sỹ',
        approver: activeProject.investorName,
        variationAmount: 0,
        costingLinkId: '',
        tags: [],
      });
    }
    setIsDrawingModalOpen(true);
  };

  const openEditDrawingModal = (draw: DrawingItem) => {
    setEditingDrawing(draw);
    setIsAddingNewRevision(false);
    setRevisionNote('');
    setRevisionReasonType('INVESTOR_REQUEST');
    setDrawingForm({
      ...draw,
    });
    setIsDrawingModalOpen(true);
  };

  const handleSaveDrawing = async () => {
    if (!drawingForm.drawingNumber?.trim() || !drawingForm.title?.trim()) {
      alert('Vui lòng nhập đầy đủ Số hiệu và Tiêu đề bản vẽ!');
      return;
    }

    const targetComp = companies.find(c => c.id === drawingForm.companyId) || companies[0];

    try {
      if (editingDrawing) {
        let updatedRevisions = [...editingDrawing.revisions];
        let currentRevText = editingDrawing.currentRevision;
        let nature = drawingForm.issueNature || editingDrawing.issueNature;

        // Nếu người dùng chọn tạo đợt hiệu chỉnh mới (New Revision)
        if (isAddingNewRevision && revisionNote.trim()) {
          const revCount = updatedRevisions.length;
          currentRevText = `Rev 0${revCount}`;
          nature = 'REVISION_MODIFIED';

          updatedRevisions = updatedRevisions.map(r => ({ ...r, isCurrent: false }));

          const newRevObj: DrawingRevision = {
            id: `rev-${editingDrawing.id}-${Date.now()}`,
            drawingId: editingDrawing.id,
            revisionNumber: currentRevText,
            issueNature: nature,
            changeDate: new Date().toISOString().slice(0, 10),
            changedBy: drawingForm.author || 'KTS. Lê Hoàng Sỹ',
            issuingCompany: targetComp.shortName,
            changeReasonCategory: revisionReasonType,
            changeDescription: revisionNote.trim(),
            approvedBy: drawingForm.approver,
            approvedDate: new Date().toISOString().slice(0, 10),
            fileUrl: '#',
            isCurrent: true,
          };
          updatedRevisions.push(newRevObj);
        }

        const updatedItem: DrawingItem = {
          ...editingDrawing,
          drawingNumber: drawingForm.drawingNumber.trim(),
          title: drawingForm.title.trim(),
          companyId: targetComp.id,
          companyName: targetComp.shortName,
          discipline: drawingForm.discipline || 'ARCHITECTURE',
          stageType: drawingForm.stageType || 'CONSTRUCTION',
          issueNature: nature,
          scale: drawingForm.scale || '1/100',
          sheetSize: drawingForm.sheetSize || 'A2',
          currentRevision: currentRevText,
          author: drawingForm.author || '',
          approver: drawingForm.approver || '',
          variationAmount: Number(drawingForm.variationAmount) || 0,
          isVariationOrder: (Number(drawingForm.variationAmount) || 0) > 0,
          costingLinkId: drawingForm.costingLinkId || '',
          revisions: updatedRevisions,
          updatedAt: new Date().toISOString(),
        };

        await db.drawings.put(updatedItem);
        await loadDatabase();
        if (selectedDrawing?.id === updatedItem.id) {
          setSelectedDrawing(updatedItem);
        }
        alert(`Đã cập nhật thành công bản vẽ [${updatedItem.drawingNumber}]!`);
      } else {
        const newId = `draw-${Date.now()}`;
        const initRev: DrawingRevision = {
          id: `rev-${newId}-0`,
          drawingId: newId,
          revisionNumber: 'Rev 00',
          issueNature: drawingForm.issueNature || 'NEW_ISSUE',
          changeDate: new Date().toISOString().slice(0, 10),
          changedBy: drawingForm.author || 'KTS. Lê Hoàng Sỹ',
          issuingCompany: targetComp.shortName,
          changeReasonCategory: 'INVESTOR_REQUEST',
          changeDescription: revisionNote.trim() || 'Phát hành bản vẽ lần đầu',
          fileUrl: '#',
          isCurrent: true,
        };

        const newItem: DrawingItem = {
          id: newId,
          projectId: selectedProjectId,
          companyId: targetComp.id,
          companyName: targetComp.shortName,
          drawingNumber: drawingForm.drawingNumber.trim(),
          title: drawingForm.title.trim(),
          discipline: drawingForm.discipline || 'ARCHITECTURE',
          stageType: drawingForm.stageType || 'CONSTRUCTION',
          issueNature: drawingForm.issueNature || 'NEW_ISSUE',
          scale: drawingForm.scale || '1/100',
          sheetSize: drawingForm.sheetSize || 'A2',
          currentRevision: 'Rev 00',
          status: 'APPROVED_FOR_CONSTRUCTION',
          author: drawingForm.author || 'KTS. Lê Hoàng Sỹ',
          approver: drawingForm.approver || 'Chủ Đầu Tư',
          approvedDate: new Date().toISOString().slice(0, 10),
          fileUrl: '#',
          tags: [drawingForm.discipline || 'Kiến trúc', 'Thi công'],
          revisions: [initRev],
          costingLinkId: drawingForm.costingLinkId || '',
          isVariationOrder: (Number(drawingForm.variationAmount) || 0) > 0,
          variationAmount: Number(drawingForm.variationAmount) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.drawings.add(newItem);
        await loadDatabase();
        alert(`Đã thêm thành công bản vẽ [${newItem.drawingNumber}] vào dự án!`);
      }

      clearDrawingDraft();
      setIsDrawingModalOpen(false);
    } catch (err: any) {
      alert(`Lỗi lưu bản vẽ: ${err?.message}`);
    }
  };

  const handleDeleteDrawing = async (drawId: string, drawNo: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản vẽ [${drawNo}] khỏi dự án không? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await db.drawings.delete(drawId);
      await loadDatabase();
      setSelectedDrawingIds(selectedDrawingIds.filter(id => id !== drawId));
      if (selectedDrawing?.id === drawId) {
        setSelectedDrawing(null);
      }
      alert(`Đã xóa bản vẽ [${drawNo}] thành công!`);
    } catch (err: any) {
      alert(`Lỗi xóa bản vẽ: ${err?.message}`);
    }
  };

  // =========================================================================
  // XỬ LÝ THÊM DỰ ÁN MỚI
  // =========================================================================
  const handleCreateProject = async () => {
    if (!newProject.projectCode?.trim() || !newProject.projectName?.trim()) {
      alert('Vui lòng nhập Mã và Tên công trình!');
      return;
    }
    try {
      const projId = `proj-${Date.now()}`;
      const createdProj: DrawingProject = {
        id: projId,
        projectCode: newProject.projectCode.trim(),
        projectName: newProject.projectName.trim(),
        investorId: 'comp-cdt-01',
        investorName: newProject.investorName?.trim() || 'Chủ Đầu Tư',
        mainContractorId: 'comp-hp',
        mainContractorName: 'CÔNG TY TNHH THIẾT KẾ XÂY DỰNG VÀ THƯƠNG MẠI HƯNG PHÁT',
        address: newProject.address?.trim() || 'TP. Hồ Chí Minh',
        contractValue: Number(newProject.contractValue) || 0,
        startDate: new Date().toISOString().slice(0, 10),
        expectedEndDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
        status: 'CONSTRUCTING',
        leadArchitect: newProject.leadArchitect || 'KTS. Lê Hoàng Sỹ',
        leadEngineer: newProject.leadEngineer || 'KS. Võ Huy Phong',
        drawingCount: 0,
      };

      await db.drawingProjects.add(createdProj);
      await loadDatabase();
      setSelectedProjectId(projId);
      setIsProjectModalOpen(false);
      setNewProject({ projectCode: '', projectName: '', investorName: '', address: '', contractValue: 0 });
      alert(`Đã tạo thành công công trình [${createdProj.projectName}]!`);
    } catch (err: any) {
      alert(`Lỗi tạo dự án: ${err?.message}`);
    }
  };

  // =========================================================================
  // XỬ LÝ TẠO BIÊN BẢN BÀN GIAO
  // =========================================================================
  const handleCreateTransmittal = () => {
    if (selectedDrawingsForTransmittal.length === 0) {
      alert('Vui lòng chọn ít nhất 1 bản vẽ để lập biên bản bàn giao!');
      return;
    }

    const selectedDrawItems = drawings
      .filter(d => selectedDrawingsForTransmittal.includes(d.id))
      .map(d => ({
        drawingId: d.id,
        drawingNumber: d.drawingNumber,
        title: d.title,
        revision: d.currentRevision,
        sheetSize: d.sheetSize,
        copiesCount: 2,
        hasSoftCopy: true,
      }));

    const newTrans: DrawingTransmittal = {
      id: `trans-${Date.now()}`,
      transmittalNo: `TR-${reportYear}-${String(reportMonth).padStart(2, '0')}-${String(transmittals.length + 1).padStart(2, '0')}`,
      projectId: activeProject.id,
      projectName: activeProject.projectName,
      senderCompany: activeProject.mainContractorName,
      senderPerson: activeProject.leadArchitect,
      recipientCompany: transmittalRecipient,
      recipientPerson: transmittalRecipientPerson,
      issueDate: new Date().toISOString().slice(0, 10),
      purpose: transmittalPurpose,
      status: 'CONFIRMED',
      notes: transmittalNotes,
      drawingItems: selectedDrawItems,
    };

    setTransmittals([newTrans, ...transmittals]);
    setIsTransmittalModalOpen(false);
    setSelectedDrawingsForTransmittal([]);
    setTransmittalNotes('');
    alert(`Đã tạo Biên bản bàn giao số [${newTrans.transmittalNo}] thành công!`);
  };

  // =========================================================================
  // XỬ LÝ XUẤT EXCEL & IN ẤN
  // =========================================================================
  const handleExportFilteredExcel = () => {
    if (filteredDrawings.length === 0) {
      alert('Không có bản vẽ nào trong danh sách lọc để xuất Excel!');
      return;
    }
    const filterDesc = `${selectedDiscipline !== 'ALL' ? selectedDiscipline : ''} ${selectedCompanyId !== 'ALL' ? 'Đơn vị đã chọn' : ''}`.trim() || 'Tất Cả';
    exportDrawingsToExcel({
      project: activeProject,
      drawings: filteredDrawings,
      filterDescription: filterDesc,
      isAll: false
    });
  };

  const handleExportAllExcel = () => {
    if (allProjectDrawings.length === 0) {
      alert('Không có bản vẽ nào trong dự án để xuất Excel!');
      return;
    }
    exportDrawingsToExcel({
      project: activeProject,
      drawings: allProjectDrawings,
      isAll: true
    });
  };

  const handleExportMonthlyExcel = () => {
    if (drawingsInMonth.length === 0) {
      alert(`Không có bản vẽ nào phát hành hoặc hiệu chỉnh trong ${monthlySummary.monthLabel}!`);
      return;
    }
    exportMonthlyReportToExcel(activeProject, monthlySummary, drawingsInMonth, transmittalsInMonth);
  };

  const handleExportReconciliation = () => {
    if (filteredTimelineLogs.length === 0) {
      alert('Không có dữ liệu nhật ký nào để xuất Excel đối chiếu!');
      return;
    }
    exportReconciliationExcel(activeProject, filteredTimelineLogs, employeeStats);
  };

  // Badge Bộ Môn
  const getDisciplineBadge = (discipline: string) => {
    switch (discipline) {
      case 'ARCHITECTURE':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold whitespace-nowrap">🏛️ Kiến Trúc</span>;
      case 'STRUCTURE':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold whitespace-nowrap">🏗️ Kết Cấu</span>;
      case 'MEP':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold whitespace-nowrap">⚡ Điện Nước</span>;
      case 'INTERIOR':
        return <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-bold whitespace-nowrap">🛋️ Nội Thất</span>;
      case 'AS_BUILT':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold whitespace-nowrap">📋 Hoàn Công</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">Chung</span>;
    }
  };

  // Badge Tính Chất Phát Hành
  const getNatureBadge = (nature: string, revisionText: string, variationAmount?: number) => {
    switch (nature) {
      case 'NEW_ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-300 rounded-md text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-cyan-600" />
            MỚI ({revisionText})
          </span>
        );
      case 'REVISION_MODIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            <History className="w-3 h-3 text-amber-600" />
            SỬA ĐỔI ({revisionText})
          </span>
        );
      case 'VARIATION_ORDER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-300 rounded-md text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            <Flame className="w-3 h-3 text-rose-600" />
            PHÁT SINH {variationAmount ? `(+${(variationAmount / 1000000).toFixed(0)}Tr)` : ''}
          </span>
        );
      case 'REDLINE_MARKUP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-800 border border-red-300 rounded-md text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            REDLINE
          </span>
        );
      case 'AS_BUILT_FINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-extrabold tracking-wide whitespace-nowrap">
            <FileCheck2 className="w-3 h-3 text-emerald-600" />
            HOÀN CÔNG
          </span>
        );
      default:
        return null;
    }
  };

  // Badge Giai Đoạn
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'PERMIT':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold whitespace-nowrap">📜 Xin Phép XD</span>;
      case 'CONSTRUCTION':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold whitespace-nowrap">🏗️ Thi Công</span>;
      case 'SHOP_DRAWING':
        return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-semibold whitespace-nowrap">✂️ Shop Gia Công</span>;
      case 'VARIATION_SITE':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold whitespace-nowrap">⚡ Hiện Trường</span>;
      case 'AS_BUILT':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold whitespace-nowrap">📋 Hoàn Công</span>;
      default:
        return null;
    }
  };

  const handleAddCompany = async () => {
    if (!newCompany.name?.trim() || !newCompany.shortName?.trim()) {
      alert('Vui lòng nhập đầy đủ tên công ty và tên viết tắt!');
      return;
    }
    const createdComp: DrawingCompany = {
      id: `comp-${Date.now()}`,
      name: newCompany.name.trim(),
      shortName: newCompany.shortName.trim(),
      role: newCompany.role || 'SUB_CONTRACTOR',
      contactPerson: newCompany.contactPerson || '',
      phone: newCompany.phone || '',
    };
    await db.drawingCompanies.add(createdComp);
    await loadDatabase();
    setIsCompanyModalOpen(false);
    setNewCompany({ name: '', shortName: '', role: 'SUB_CONTRACTOR', contactPerson: '', phone: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-xs flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToAccounting}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs group"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Về Kế Toán Công Đoàn</span>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-wide text-slate-900 flex items-center gap-2">
                <span>HƯNG PHÁT BLUEPRINT HUB</span>
                <span className="px-2 py-0.2 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-[10px] font-mono font-bold">
                  {APP_VERSION}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Chọn Nhiều & Xóa Hàng Loạt • Nhật Ký Dòng Thời Gian • Đối Chiếu Khách Hàng & Năng Suất
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Chính */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-bold flex-wrap">
          <button
            onClick={() => setActiveMainTab('DRAWINGS_LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMainTab === 'DRAWINGS_LIST'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Danh Mục Bản Vẽ ({totalInProject})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('RECONCILIATION_TIMELINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMainTab === 'RECONCILIATION_TIMELINE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Nhật Ký & Đối Chiếu Khách Hàng</span>
          </button>

          <button
            onClick={() => setActiveMainTab('PROJECTS_LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMainTab === 'PROJECTS_LIST'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>3. Công Trình / Dự Án ({projects.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('MONTHLY_REPORT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMainTab === 'MONTHLY_REPORT'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>4. Báo Cáo Tháng & Bàn Giao</span>
          </button>

          <button
            onClick={() => setActiveMainTab('SETTINGS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMainTab === 'SETTINGS'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>5. Cài Đặt Hệ Thống</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 p-6 space-y-5 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* TAB 1: DANH MỤC BẢN VẼ (DẠNG BẢNG & DẠNG THẺ + XUẤT EXCEL + CHỌN NHIỀU)    */}
        {/* ========================================================================= */}
        {activeMainTab === 'DRAWINGS_LIST' && (
          <div className="space-y-5">
            {/* Banner Dự Án & Các Nút Thao Tác Xuất Excel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-mono font-bold">
                    {activeProject.projectCode}
                  </span>
                  <h1 className="text-lg font-extrabold text-slate-900">{activeProject.projectName}</h1>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                    Đang Thi Công
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-4 flex-wrap">
                  <span>📍 {activeProject.address}</span>
                  <span>🏢 Tổng thầu: <strong className="text-blue-700">{activeProject.mainContractorName}</strong></span>
                  <span>👤 CĐT: <strong className="text-slate-700">{activeProject.investorName}</strong></span>
                </div>
              </div>

              {/* Các nút Chuyển đổi công trình & Xuất Excel & Thêm Bản Vẽ */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Chọn Công Trình */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-500 font-medium">Công Trình:</span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.projectCode}] {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nút Xuất Excel Theo Lọc */}
                <button
                  onClick={handleExportFilteredExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                  title="Xuất danh sách các bản vẽ đang lọc ra file Excel chuẩn"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Xuất Excel ({filteredDrawings.length})</span>
                </button>

                {/* Nút Xuất Toàn Bộ */}
                <button
                  onClick={handleExportAllExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-xs"
                  title="Xuất toàn bộ hồ sơ bản vẽ dự án ra file Excel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Xuất Toàn Bộ ({totalInProject})</span>
                </button>

                {/* Nút Thêm Bản Vẽ Mới */}
                <button
                  onClick={openCreateDrawingModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Bản Vẽ</span>
                </button>
              </div>
            </div>

            {/* Thống Kê 4 Thẻ KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Bản Vẽ Mới (Lần Đầu)</span>
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="text-2xl font-extrabold text-cyan-700 font-mono">{newIssuesCount}</div>
                <div className="text-[11px] text-slate-400">Phát hành đợt 1 / Concept</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Bản Vẽ Sửa Đổi (Revisions)</span>
                  <History className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-amber-700 font-mono">{revisionCount}</div>
                <div className="text-[11px] text-slate-400">Hiệu chỉnh theo ý CĐT & Kỹ thuật</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Phát Sinh Hiện Trường</span>
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-700 font-mono">{variationCount}</div>
                <div className="text-[11px] text-rose-600 font-semibold">
                  {totalVariationValue > 0 ? `+${(totalVariationValue / 1000000).toFixed(0)} Tr (TK 154)` : 'Không có phát sinh'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Đơn Vị / Thầu Phụ</span>
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-indigo-700 font-mono">{companies.length}</div>
                <div className="text-[11px] text-slate-400">Hưng Phát, CĐT, Nhôm Kính, Cơ Điện</div>
              </div>
            </div>

            {/* THANH THAO TÁC HÀNG LOẠT (BATCH ACTION BAR) KHI CHỌN NHIỀU */}
            {selectedDrawingIds.length > 0 && (
              <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-200" />
                  <span>Đã chọn <strong className="text-amber-300 font-mono text-sm">{selectedDrawingIds.length}</strong> bản vẽ</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút Xóa Hàng Loạt */}
                  <button
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-xs transition-all active:scale-95"
                    title="Xóa vĩnh viễn các bản vẽ đã chọn"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa {selectedDrawingIds.length} Bản Vẽ Đã Chọn</span>
                  </button>

                  {/* Nút Xuất Excel Các Bản Đã Chọn */}
                  <button
                    onClick={handleExportSelectedExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-all"
                    title="Xuất file Excel cho các bản vẽ đã chọn"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Xuất Excel ({selectedDrawingIds.length})</span>
                  </button>

                  {/* Nút Bỏ Chọn */}
                  <button
                    onClick={() => setSelectedDrawingIds([])}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bỏ chọn</span>
                  </button>
                </div>
              </div>
            )}

            {/* Thanh Bộ Lọc Đa Chiều & Chuyển Đổi Chế Độ Xem Bảng / Thẻ */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                {/* Lọc theo Đơn Vị & Kỹ Sư Phụ Trách */}
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      Đơn Vị:
                    </span>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className="bg-slate-50 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ALL">🏢 Tất Cả Đơn Vị</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.shortName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lọc theo Tác Giả / Kỹ Sư */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Kỹ Sư:
                    </span>
                    <select
                      value={selectedAuthorFilter}
                      onChange={(e) => setSelectedAuthorFilter(e.target.value)}
                      className="bg-slate-50 text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-xl font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="ALL">👤 Tất Cả Kỹ Sư ({availableAuthors.length})</option>
                      {availableAuthors.map((author) => (
                        <option key={author} value={author}>
                          {author}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lọc theo Tính Chất Bản Vẽ */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-600 font-bold flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                    Tính Chất:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {[
                      { id: 'ALL', label: 'Tất Cả' },
                      { id: 'NEW_ISSUE', label: '🆕 Bản Mới' },
                      { id: 'REVISION_MODIFIED', label: '✏️ Bản Sửa' },
                      { id: 'VARIATION_ORDER', label: '⚡ Phát Sinh' },
                      { id: 'REDLINE_MARKUP', label: '🔴 Redline' },
                      { id: 'AS_BUILT_FINAL', label: '📋 Hoàn Công' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedNature(item.id as DrawingIssueNature)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          selectedNature === item.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chuyển đổi Dạng Bảng vs Dạng Thẻ & Tìm kiếm */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setDisplayMode('TABLE')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        displayMode === 'TABLE'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Hiển thị dạng Bảng chi tiết"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>Dạng Bảng</span>
                    </button>

                    <button
                      onClick={() => setDisplayMode('GRID')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        displayMode === 'GRID'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Hiển thị dạng Thẻ trực quan"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Dạng Thẻ</span>
                    </button>
                  </div>

                  {/* Ô tìm kiếm nhanh */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm số hiệu, tên..."
                      className="w-full bg-slate-50 text-slate-800 pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Dòng Tabs Bộ Môn */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-slate-600 font-bold">Bộ Môn:</span>
                {[
                  { id: 'ALL', label: 'Tất Cả Bộ Môn' },
                  { id: 'ARCHITECTURE', label: '🏛️ Kiến Trúc' },
                  { id: 'STRUCTURE', label: '🏗️ Kết Cấu' },
                  { id: 'MEP', label: '⚡ Cơ Điện (MEP)' },
                  { id: 'AS_BUILT', label: '📋 Hoàn Công' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedDiscipline(tab.id as DrawingDiscipline)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedDiscipline === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* =================================================================== */}
            {/* CHẾ ĐỘ 1: DẠNG BẢNG (TABLE VIEW CÓ CHECKBOX CHỌN NHIỀU)            */}
            {/* =================================================================== */}
            {displayMode === 'TABLE' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                      <tr>
                        {/* Cột Checkbox Chọn Tất Cả */}
                        <th className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                            title="Chọn tất cả bản vẽ đang hiển thị"
                          />
                        </th>
                        <th className="p-3 text-center w-10">STT</th>
                        <th className="p-3 w-24">Số Hiệu</th>
                        <th className="p-3 min-w-[220px]">Tên / Tiêu Đề Bản Vẽ</th>
                        <th className="p-3 min-w-[160px]">Đơn Vị Phát Hành</th>
                        <th className="p-3 w-28">Bộ Môn</th>
                        <th className="p-3 w-32">Giai Đoạn</th>
                        <th className="p-3 w-36">Tính Chất & Phiên Bản</th>
                        <th className="p-3 text-center w-20">Khổ & Tỉ Lệ</th>
                        <th className="p-3 w-32">Chủ Trì / Tác Giả</th>
                        <th className="p-3 w-32">Người Duyệt</th>
                        <th className="p-3 text-right w-28">Phát Sinh (VNĐ)</th>
                        <th className="p-3 text-center w-28">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDrawings.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="p-10 text-center text-slate-400">
                            <FolderOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <div className="font-bold text-slate-600">Không tìm thấy bản vẽ nào phù hợp</div>
                          </td>
                        </tr>
                      ) : (
                        paginatedDrawings.map((draw, idx) => {
                          const globalIdx = drawingPageSize === 'ALL' ? idx : (safeDrawingCurrentPage - 1) * drawingPageSize + idx;
                          const isSelected = selectedDrawingIds.includes(draw.id);
                          return (
                            <tr 
                              key={draw.id} 
                              onClick={() => setSelectedDrawing(draw)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/80' : 'hover:bg-blue-50/40'
                              }`}
                            >
                              {/* Checkbox từng dòng */}
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(draw.id)}
                                  className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                                />
                              </td>
                              <td className="p-3 text-center font-mono text-slate-400">{globalIdx + 1}</td>
                              <td className="p-3">
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {draw.drawingNumber}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-slate-900">
                                <div className="line-clamp-2">{draw.title}</div>
                                {draw.costingLinkId && (
                                  <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-1 py-0.2 rounded mt-0.5 inline-block">
                                    BOM: {draw.costingLinkId}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-600 font-medium">{draw.companyName}</td>
                              <td className="p-3">{getDisciplineBadge(draw.discipline)}</td>
                              <td className="p-3">{getStageBadge(draw.stageType)}</td>
                              <td className="p-3">{getNatureBadge(draw.issueNature, draw.currentRevision, draw.variationAmount)}</td>
                              <td className="p-3 text-center font-mono text-slate-700">
                                <strong>{draw.sheetSize}</strong>
                                <div className="text-[10px] text-slate-400">1:{draw.scale.replace('1/', '')}</div>
                              </td>
                              <td className="p-3 text-slate-700">{draw.author}</td>
                              <td className="p-3 text-slate-600">{draw.approver || 'Chờ duyệt'}</td>
                              <td className="p-3 text-right font-mono font-bold">
                                {draw.variationAmount ? (
                                  <span className="text-rose-600">+{draw.variationAmount.toLocaleString('vi-VN')} đ</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setSelectedDrawing(draw)}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg transition-colors border border-blue-200"
                                    title="Xem bản vẽ & Lịch sử sửa"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openEditDrawingModal(draw)}
                                    className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-lg transition-colors border border-amber-200"
                                    title="Sửa bản vẽ / Thêm đợt hiệu chỉnh"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDrawing(draw.id, draw.drawingNumber)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-colors border border-rose-200"
                                    title="Xóa bản vẽ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Bảng & Phân Trang Bản Vẽ */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs font-bold text-slate-700 px-6 gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Hiển thị{' '}
                      <strong className="text-blue-700 font-mono">
                        {drawingPageSize === 'ALL' ? `1 - ${filteredDrawings.length}` : `${(safeDrawingCurrentPage - 1) * drawingPageSize + 1} - ${Math.min(safeDrawingCurrentPage * drawingPageSize, filteredDrawings.length)}`}
                      </strong>{' '}
                      / Tổng số <strong className="text-slate-900 font-mono">{filteredDrawings.length}</strong> bản vẽ
                    </span>

                    <div className="flex items-center gap-1 ml-2 font-normal text-slate-500">
                      <span>| Mỗi trang:</span>
                      <select
                        value={drawingPageSize}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDrawingPageSize(val === 'ALL' ? 'ALL' : Number(val));
                          setDrawingCurrentPage(1);
                        }}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="ALL">Tất cả</option>
                      </select>
                    </div>
                  </div>

                  {/* Điều hướng trang */}
                  {drawingPageSize !== 'ALL' && drawingTotalPages > 1 && (
                    <div className="flex items-center gap-1 font-semibold">
                      <button
                        onClick={() => setDrawingCurrentPage(1)}
                        disabled={safeDrawingCurrentPage === 1}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        ««
                      </button>
                      <button
                        onClick={() => setDrawingCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safeDrawingCurrentPage === 1}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        ‹ Trước
                      </button>

                      <span className="px-2 font-mono text-slate-800">
                        {safeDrawingCurrentPage} / {drawingTotalPages}
                      </span>

                      <button
                        onClick={() => setDrawingCurrentPage(p => Math.min(drawingTotalPages, p + 1))}
                        disabled={safeDrawingCurrentPage === drawingTotalPages}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        Tiếp ›
                      </button>
                      <button
                        onClick={() => setDrawingCurrentPage(drawingTotalPages)}
                        disabled={safeDrawingCurrentPage === drawingTotalPages}
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                      >
                        »»
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="text-slate-600">
                      Phát sinh hiện trường: <strong className="text-rose-600 font-mono font-extrabold">{totalVariationValue.toLocaleString('vi-VN')} đ</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* CHẾ ĐỘ 2: DẠNG THẺ (GRID CARDS VIEW)                               */}
            {/* =================================================================== */}
            {displayMode === 'GRID' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDrawings.map((draw) => {
                  const isSelected = selectedDrawingIds.includes(draw.id);
                  return (
                    <div
                      key={draw.id}
                      className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3 group ${
                        isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(draw.id)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                            />
                            <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {draw.drawingNumber}
                            </span>
                            {getStageBadge(draw.stageType)}
                          </div>
                          {getNatureBadge(draw.issueNature, draw.currentRevision, draw.variationAmount)}
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {draw.title}
                        </h3>

                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>Đơn vị: <strong className="text-slate-700">{draw.companyName}</strong></span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Bộ môn & Khổ:</span>
                          <div className="flex items-center gap-1.5">
                            {getDisciplineBadge(draw.discipline)}
                            <strong className="text-slate-800 font-mono">{draw.sheetSize} (1:{draw.scale.replace('1/', '')})</strong>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Số lần sửa đổi:</span>
                          <strong className="text-amber-700 font-mono font-bold">
                            {draw.revisions.length > 1 ? `${draw.revisions.length - 1} lần hiệu chỉnh` : 'Bản gốc (Chưa sửa)'}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Chủ trì / Tác giả:</span>
                          <strong className="text-slate-800">{draw.author}</strong>
                        </div>
                        {draw.costingLinkId && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-indigo-700 font-medium">
                            <span>Dự toán BOM (TK 154):</span>
                            <span className="font-mono font-bold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              {draw.costingLinkId}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {draw.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedDrawing(draw)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-200 hover:border-blue-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem Chi Tiết</span>
                        </button>

                        <button
                          onClick={() => openEditDrawingModal(draw)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-xl border border-amber-200 transition-all"
                          title="Sửa bản vẽ"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteDrawing(draw.id, draw.drawingNumber)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl border border-rose-200 transition-all"
                          title="Xóa bản vẽ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: NHẬT KÝ DÒNG THỜI GIAN & ĐỐI CHIẾU KHÁCH HÀNG (CORE FEATURE)       */}
        {/* ========================================================================= */}
        {activeMainTab === 'RECONCILIATION_TIMELINE' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Nhật Ký Bản Vẽ & Đối Chiếu Khách Hàng (Audit Trail)</h2>
                  <p className="text-xs text-slate-500">
                    Theo dõi lịch trình từng ngày ({filteredTimelineLogs.length} lượt) • Truy xét nguyên nhân sửa đổi (Khách đổi ý hay Mình sai kỹ thuật)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleExportReconciliation}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  title="Xuất bảng đối chiếu khối lượng & trách nhiệm ra file Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Đối Chiếu</span>
                </button>

                <button
                  onClick={() => printReconciliationDoc(activeProject, filteredTimelineLogs)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  title="In Biên bản đối soát A4 có sẵn chữ ký để làm việc với Chủ đầu tư"
                >
                  <Printer className="w-4 h-4" />
                  <span>In Biên Bản Đối Soát (A4)</span>
                </button>
              </div>
            </div>

            {/* Khung 1: Bảng Đánh Giá Năng Suất & Chất Lượng Từng Nhân Viên */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>1. Năng Suất & Chất Lượng Bản Vẽ Từng Nhân Viên (KTS / Kỹ Sư):</span>
                </h3>
                <span className="text-xs text-slate-500">Đánh giá dựa trên số lần sửa & nguyên nhân sai sót</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeeStats.map((stat, idx) => (
                  <div 
                    key={idx} 
                    className={`bg-white p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                      stat.internalErrorCount > 0 ? 'border-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                          {stat.authorName.charAt(stat.authorName.lastIndexOf(' ') + 1) || 'NV'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{stat.authorName}</div>
                          <div className="text-[10px] text-slate-400">KTS / Kỹ sư thiết kế</div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        stat.qualityScore >= 90 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : stat.qualityScore >= 70 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        Chất lượng: {stat.qualityScore}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Tổng bản vẽ:</span>
                        <strong className="text-blue-700 font-mono text-sm">{stat.totalDrawings} bản</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Chuẩn lần đầu:</span>
                        <strong className="text-emerald-700 font-mono text-sm">{stat.firstTimePassCount} bản</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Sửa theo CĐT:</span>
                        <strong className="text-slate-800 font-mono">{stat.clientRevisionCount} đợt</strong>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block">Lỗi kỹ thuật (Sai):</span>
                        <strong className={`font-mono font-bold ${stat.internalErrorCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {stat.internalErrorCount > 0 ? `${stat.internalErrorCount} lỗi` : '0 lỗi'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Khung 2: Bảng Nhật Ký Dòng Thời Gian Chi Tiết & Bộ Lọc Tinh Gọn */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">2. Nhật Ký Dòng Thời Gian Phát Hành & Sửa Đổi Bản Vẽ</h3>
                </div>

                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Nhân Viên:</span>
                    <select
                      value={reconAuthorFilter}
                      onChange={(e) => setReconAuthorFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-800"
                    >
                      <option value="ALL">Tất Cả Nhân Viên</option>
                      {employeeStats.map((e, idx) => (
                        <option key={idx} value={e.authorName}>{e.authorName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Phân Định:</span>
                    <select
                      value={reconFaultFilter}
                      onChange={(e) => setReconFaultFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-800"
                    >
                      <option value="ALL">Tất Cả Phân Loại</option>
                      <option value="CLIENT_REQUEST">🟢 Khách Yêu Cầu Đổi Ý</option>
                      <option value="INTERNAL_ERROR">🔴 Lỗi Kỹ Thuật (Mình Sai)</option>
                      <option value="SITE_CONDITION">🟡 Xung Đột Hiện Trường</option>
                      <option value="NORMAL_NEW">🆕 Bản Gốc Phát Hành</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={reconSearchTerm}
                      onChange={(e) => setReconSearchTerm(e.target.value)}
                      placeholder="Tìm ngày, số hiệu, nội dung..."
                      className="bg-slate-50 border border-slate-200 pl-8 pr-2.5 py-1 rounded-lg text-xs w-48 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <tr>
                      <th className="p-3 text-center w-10">STT</th>
                      <th className="p-3 w-28">Ngày Tháng</th>
                      <th className="p-3 w-24">Số Hiệu</th>
                      <th className="p-3 min-w-[200px]">Tên / Tiêu Đề Bản Vẽ</th>
                      <th className="p-3 w-32">Người Vẽ</th>
                      <th className="p-3 text-center w-24">Phiên Bản</th>
                      <th className="p-3 min-w-[240px]">Nội Dung / Lý Do Sửa Đổi</th>
                      <th className="p-3 min-w-[180px]">Phân Định (Khách hay Mình)</th>
                      <th className="p-3 text-center w-36">Tình Trạng Bàn Giao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTimelineLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">
                          Không tìm thấy bản ghi nhật ký nào phù hợp bộ lọc
                        </td>
                      </tr>
                    ) : (
                      filteredTimelineLogs.map((log, idx) => (
                        <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{log.date}</td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {log.drawingNumber}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{log.drawingTitle}</td>
                          <td className="p-3 text-slate-700 font-medium">{log.author}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800">{log.revisionNumber}</td>
                          <td className="p-3 text-slate-700">
                            <div className="line-clamp-2">{log.changeDescription}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-block ${
                              log.faultParty === 'INTERNAL_ERROR'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : log.faultParty === 'CLIENT_REQUEST'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.faultParty === 'SITE_CONDITION'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            }`}>
                              {log.faultPartyLabel}
                            </span>
                          </td>
                          <td className="p-3 text-center text-[11px]">
                            <span className={`font-semibold ${
                              log.handoverStatus === 'HANDED_OVER' ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {log.handoverStatusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: QUẢN LÝ DANH SÁCH CÔNG TRÌNH / DỰ ÁN                                */}
        {/* ========================================================================= */}
        {activeMainTab === 'PROJECTS_LIST' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Danh Mục Công Trình & Dự Án Xây Dựng</h2>
                <p className="text-xs text-slate-500">Quản lý toàn bộ các công trình thi công, chủ đầu tư và giá trị hợp đồng</p>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Công Trình Mới</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {proj.projectCode}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{proj.projectName}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                      {proj.status === 'CONSTRUCTING' ? 'Đang Thi Công' : 'Thiết Kế'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div>📍 Địa chỉ: <strong>{proj.address}</strong></div>
                    <div>👤 Chủ đầu tư: <strong>{proj.investorName}</strong></div>
                    <div>📐 KTS Chủ trì: <strong>{proj.leadArchitect}</strong> • KS Kết cấu: <strong>{proj.leadEngineer}</strong></div>
                    <div>💰 Giá trị hợp đồng: <strong className="text-emerald-700">{proj.contractValue.toLocaleString('vi-VN')} đ</strong></div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Số bản vẽ: <strong>{drawings.filter(d => d.projectId === proj.id).length} bản vẽ</strong></span>
                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setActiveMainTab('DRAWINGS_LIST');
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <span>Xem Hồ Sơ Bản Vẽ</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: BÁO CÁO THÁNG & BÀN GIAO HỒ SƠ BẢN VẼ                             */}
        {/* ========================================================================= */}
        {activeMainTab === 'MONTHLY_REPORT' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Báo Cáo Tiến Độ Bản Vẽ & Chi Phí Phát Sinh Tháng</h2>
                  <p className="text-xs text-slate-500">Dự án: <strong className="text-blue-700">{activeProject.projectName}</strong> • Phân tích theo từng kỳ tháng</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-xs">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-500 font-bold">Kỳ Báo Cáo:</span>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                      <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</option>
                    ))}
                  </select>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <button
                  onClick={handleExportMonthlyExcel}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Báo Cáo Tháng (Excel)</span>
                </button>

                <button
                  onClick={() => setIsTransmittalModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-all"
                >
                  <SendHorizontal className="w-4 h-4" />
                  <span>+ Lập Biên Bản Bàn Giao</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Bản Vẽ Xử Lý Trong Tháng</span>
                  <Layers className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-blue-700 font-mono">{monthlySummary.totalDrawingsIssued}</div>
                <div className="text-[11px] text-slate-400">Bao gồm {monthlySummary.newIssuesCount} bản mới, {monthlySummary.revisionsCount} bản sửa</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Phát Sinh Thiết Kế Tháng</span>
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-extrabold text-rose-700 font-mono">
                  {monthlySummary.totalVariationAmount > 0 ? `+${(monthlySummary.totalVariationAmount / 1000000).toFixed(0)} Tr` : '0 đ'}
                </div>
                <div className="text-[11px] text-rose-600 font-semibold">{monthlySummary.variationOrdersCount} bản vẽ làm tăng khối lượng</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Đợt Bàn Giao Hồ Sơ</span>
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">{monthlySummary.transmittalsCount}</div>
                <div className="text-[11px] text-slate-400">Đã lập biên bản & ký nhận</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-xs">
                <div className="text-slate-500 font-bold flex items-center justify-between">
                  <span>Chờ CĐT / TVGS Phê Duyệt</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-amber-700 font-mono">{monthlySummary.pendingApprovalsCount}</div>
                <div className="text-[11px] text-slate-400">Cần đốc thúc ký duyệt AFC</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Danh Sách Biên Bản Bàn Giao Hồ Sơ Bản Vẽ (Transmittal Logs)</h3>
                </div>
                <span className="text-xs text-slate-500">Căn cứ pháp lý bàn giao hồ sơ thi công tại hiện trường</span>
              </div>

              <div className="space-y-3">
                {transmittals.map((trans) => (
                  <div key={trans.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded border border-indigo-200 shadow-2xs">
                          {trans.transmittalNo}
                        </span>
                        <span className="ml-2 text-xs font-bold text-slate-800">Ngày giao: {trans.issueDate}</span>
                        <p className="text-xs text-slate-600 mt-1">
                          Bên Giao: <strong>{trans.senderCompany}</strong> ({trans.senderPerson}) $\rightarrow$ Bên Nhận: <strong>{trans.recipientCompany}</strong> ({trans.recipientPerson})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => printTransmittalForm(trans, activeProject)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In Biên Bản (A4)</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                      <div className="font-semibold text-slate-700">Các bản vẽ bàn giao ({trans.drawingItems.length} bản vẽ):</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {trans.drawingItems.map((item, idx) => (
                          <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px]">
                            <div className="font-mono font-bold text-blue-700">[{item.drawingNumber}] {item.revision}</div>
                            <div className="line-clamp-1 text-slate-700">{item.title}</div>
                            <div className="text-slate-400 mt-0.5">{item.sheetSize} • {item.copiesCount} bản in</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {trans.notes && (
                      <div className="text-xs text-slate-500 italic">
                        <strong>Ghi chú:</strong> {trans.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: CÀI ĐẶT HỆ THỐNG BẢN VẼ (SETTINGS TAB)                              */}
        {/* ========================================================================= */}
        {activeMainTab === 'SETTINGS' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Cài Đặt Hệ Thống Bản Vẽ & Hồ Sơ Dự Án</h2>
                  <p className="text-xs text-slate-500">Thiết lập danh mục công ty, quy ước ký hiệu bản vẽ, lý do sửa đổi và khung tên tiêu chuẩn</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">1. Danh Mục Công Ty & Đơn Vị Phát Hành Bản Vẽ</h3>
                </div>
                <button
                  onClick={() => setIsCompanyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Đơn Vị / Thầu Phụ</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">STT</th>
                      <th className="p-3">Tên Công Ty / Đơn Vị</th>
                      <th className="p-3">Tên Viết Tắt</th>
                      <th className="p-3">Vai Trò</th>
                      <th className="p-3">Người Phụ Trách</th>
                      <th className="p-3">Điện Thoại</th>
                      <th className="p-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{c.name}</td>
                        <td className="p-3 font-semibold text-blue-700">{c.shortName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                            {c.role === 'MAIN_CONTRACTOR' ? 'Tổng Thầu / Thiết Kế' : c.role === 'INVESTOR' ? 'Chủ Đầu Tư' : c.role === 'SUPERVISION_CONSULTANT' ? 'Tư Vấn Giám Sát' : 'Thầu Phụ Thi Công'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{c.contactPerson || '---'}</td>
                        <td className="p-3 font-mono text-slate-600">{c.phone || '---'}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => alert(`Sửa thông tin: ${c.name}`)}
                            className="p-1 text-slate-500 hover:text-blue-600"
                            title="Sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">2. Quy Ước Ký Hiệu & Tiền Tố Đánh Mã Bản Vẽ (Prefix)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {drawingCodePrefixes.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-xs">
                        {item.code}
                      </span>
                      <div className="font-bold text-slate-800 mt-1.5">{item.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Khổ chuẩn: {item.sheet}</div>
                    </div>
                    {getDisciplineBadge(item.discipline)}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">3. Danh Mục Lý Do Sửa Đổi & Phát Sinh Thiết Kế (Revision Reasons)</h3>
              </div>

              <div className="space-y-2 text-xs">
                {changeReasons.map((reason, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{reason.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {reason.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL LẬP BIÊN BẢN BÀN GIAO */}
      {isTransmittalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-2xl w-full space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm">Lập Biên Bản Bàn Giao Hồ Sơ Bản Vẽ (Transmittal Form)</span>
                <p className="text-[11px] text-slate-500">Công trình: {activeProject.projectName}</p>
              </div>
              <button onClick={() => setIsTransmittalModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Đơn Vị Nhận Hồ Sơ (*):</label>
                  <input
                    type="text"
                    value={transmittalRecipient}
                    onChange={(e) => setTransmittalRecipient(e.target.value)}
                    placeholder="Tư Vấn Giám Sát Sài Gòn / Ban QLDA CĐT..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Người Đại Diện Ký Nhận (*):</label>
                  <input
                    type="text"
                    value={transmittalRecipientPerson}
                    onChange={(e) => setTransmittalRecipientPerson(e.target.value)}
                    placeholder="KS. Nguyễn Văn A..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Mục Đích Phát Hành:</label>
                  <select
                    value={transmittalPurpose}
                    onChange={(e) => setTransmittalPurpose(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-semibold"
                  >
                    <option value="FOR_CONSTRUCTION">🏗️ Bàn giao thi công tại hiện trường (AFC)</option>
                    <option value="FOR_APPROVAL">📋 Trình phê duyệt / Thẩm tra</option>
                    <option value="FOR_REVIEW">🔍 Trình xem xét ý kiến</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Ghi Chú Đợt Giao:</label>
                  <input
                    type="text"
                    value={transmittalNotes}
                    onChange={(e) => setTransmittalNotes(e.target.value)}
                    placeholder="Bàn giao đợt 2 có bản vẽ sửa dầm..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Chọn Các Bản Vẽ Cần Bàn Giao ({selectedDrawingsForTransmittal.length} đã chọn):
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 p-1">
                  {allProjectDrawings.map((draw) => {
                    const isChecked = selectedDrawingsForTransmittal.includes(draw.id);
                    return (
                      <label key={draw.id} className="flex items-center gap-2.5 p-2 hover:bg-white cursor-pointer rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDrawingsForTransmittal([...selectedDrawingsForTransmittal, draw.id]);
                            } else {
                              setSelectedDrawingsForTransmittal(selectedDrawingsForTransmittal.filter(id => id !== draw.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-blue-700">[{draw.drawingNumber}]</span>
                            <span className="ml-1.5 font-semibold text-slate-800">{draw.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-200 px-1.5 py-0.2 rounded">
                            {draw.currentRevision} • {draw.sheetSize}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsTransmittalModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTransmittal}
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
              >
                Tạo Biên Bản & In Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BẢN VẼ & TIMELINE REVISIONS */}
      {selectedDrawing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-extrabold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  {selectedDrawing.drawingNumber}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{selectedDrawing.title}</h2>
                    {getNatureBadge(selectedDrawing.issueNature, selectedDrawing.currentRevision, selectedDrawing.variationAmount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Đơn vị: <strong>{selectedDrawing.companyName}</strong> • Dự án: {activeProject.projectName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditDrawingModal(selectedDrawing)}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-bold flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Bản Vẽ</span>
                </button>
                <button
                  onClick={() => setSelectedDrawing(null)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div className="text-slate-700 font-bold flex items-center justify-between">
                  <span>Khung Nhìn Bản Vẽ Hiện Hành ({selectedDrawing.currentRevision})</span>
                  <div className="flex items-center gap-2">
                    <button className="p-1 bg-slate-100 rounded border border-slate-200 text-slate-600 hover:text-slate-900" title="Phóng to">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 bg-slate-100 rounded border border-slate-200 text-slate-600 hover:text-slate-900" title="Thu nhỏ">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full aspect-[4/3] bg-blue-900/90 rounded-xl border border-blue-700 p-4 relative flex flex-col justify-between overflow-hidden shadow-inner">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />

                  <div className="relative z-10 flex-1 flex items-center justify-center">
                    <svg className="w-full h-full text-white/90 stroke-current fill-none stroke-[1.5]" viewBox="0 0 400 300">
                      <rect x="30" y="30" width="340" height="240" strokeWidth="2.5" stroke="#93c5fd" />
                      <line x1="160" y1="30" x2="160" y2="270" strokeDasharray="4 2" />
                      <line x1="30" y1="150" x2="160" y2="150" />
                      <line x1="160" y1="180" x2="370" y2="180" />
                      <path d="M 30,120 A 30,30 0 0,1 60,150" stroke="#bae6fd" />
                      <path d="M 160,80 A 30,30 0 0,1 190,110" stroke="#bae6fd" />
                      {selectedDrawing.issueNature === 'REVISION_MODIFIED' && (
                        <g stroke="#fbbf24" strokeWidth="2">
                          <circle cx="160" cy="180" r="18" strokeDasharray="3 3" />
                          <text x="185" y="185" fill="#fbbf24" fontSize="9" fontWeight="bold">Sửa dầm D2A</text>
                        </g>
                      )}
                      {selectedDrawing.issueNature === 'REDLINE_MARKUP' && (
                        <g stroke="#f87171" strokeWidth="2">
                          <rect x="50" y="160" width="80" height="40" strokeDasharray="4 2" />
                          <text x="55" y="185" fill="#f87171" fontSize="9" fontWeight="bold">Tránh ống D90</text>
                        </g>
                      )}
                      <circle cx="30" cy="15" r="8" fill="#1e40af" stroke="#93c5fd" />
                      <text x="26" y="19" fill="#fff" fontSize="10" fontWeight="bold">A</text>
                      <circle cx="160" cy="15" r="8" fill="#1e40af" stroke="#93c5fd" />
                      <text x="156" y="19" fill="#fff" fontSize="10" fontWeight="bold">B</text>
                      <circle cx="370" cy="15" r="8" fill="#1e40af" stroke="#93c5fd" />
                      <text x="366" y="19" fill="#fff" fontSize="10" fontWeight="bold">C</text>
                    </svg>
                  </div>

                  <div className="relative z-10 self-end bg-slate-900/90 border border-blue-400/50 p-2 rounded text-[9px] text-slate-200 space-y-0.5 max-w-[240px]">
                    <div className="font-bold text-blue-300 uppercase">{selectedDrawing.companyName}</div>
                    <div>Số hiệu: <strong>{selectedDrawing.drawingNumber}</strong> ({selectedDrawing.currentRevision})</div>
                    <div>Khổ: {selectedDrawing.sheetSize} • Tỉ lệ: {selectedDrawing.scale}</div>
                    <div>Phê duyệt: <strong>{selectedDrawing.approver || 'Chờ duyệt'}</strong></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                  <span>Trạng thái: <strong className="text-emerald-700">{selectedDrawing.status}</strong></span>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold">
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải File Bản Vẽ PDF ({selectedDrawing.sheetSize})</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="text-slate-900 font-bold flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-amber-600" />
                    <span>Lịch Sử Sửa Đổi (Revisions)</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                    {selectedDrawing.revisions.length} phiên bản
                  </span>
                </div>

                <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {selectedDrawing.revisions.map((rev) => (
                    <div key={rev.id} className="relative pl-6 space-y-1.5">
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        rev.isCurrent
                          ? 'bg-blue-600 border-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-slate-300 border-slate-400'
                      }`}>
                        {rev.isCurrent && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-blue-700">{rev.revisionNumber}</span>
                          {rev.isCurrent && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                              Mới nhất
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{rev.changeDate}</span>
                      </div>

                      <div className="text-[10px] text-slate-500">
                        Đơn vị: <strong className="text-slate-700">{rev.issuingCompany}</strong> • Tác giả: <strong>{rev.changedBy}</strong>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 text-[11px] leading-relaxed shadow-2xs">
                        <div className="text-[10px] text-amber-700 font-bold mb-0.5">
                          📌 Lý do & Nội dung sửa:
                        </div>
                        {rev.changeDescription}
                      </div>

                      {rev.approvedBy && (
                        <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Duyệt bởi: <strong>{rev.approvedBy}</strong> ({rev.approvedDate})</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA BẢN VẼ */}
      {isDrawingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-xl w-full space-y-4 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {editingDrawing ? `Chỉnh Sửa Bản Vẽ [${editingDrawing.drawingNumber}]` : 'Thêm Bản Vẽ Mới Vào Dự Án'}
                </span>
                <p className="text-[11px] text-slate-500">Dự án: {activeProject.projectName}</p>
              </div>
              <button onClick={() => setIsDrawingModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Đơn Vị / Công Ty Phát Hành:</label>
                <select 
                  value={drawingForm.companyId}
                  onChange={(e) => setDrawingForm({ ...drawingForm, companyId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-semibold"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Số Hiệu Bản Vẽ (*):</label>
                  <input
                    type="text"
                    value={drawingForm.drawingNumber}
                    onChange={(e) => setDrawingForm({ ...drawingForm, drawingNumber: e.target.value })}
                    placeholder="KT-01, KC-PS02, MEP-01..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tính Chất Bản Vẽ:</label>
                  <select 
                    value={drawingForm.issueNature}
                    onChange={(e) => setDrawingForm({ ...drawingForm, issueNature: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-semibold"
                  >
                    <option value="NEW_ISSUE">🆕 Bản Vẽ Mới (Lần đầu)</option>
                    <option value="REVISION_MODIFIED">✏️ Bản Vẽ Sửa Đổi (Revision)</option>
                    <option value="VARIATION_ORDER">⚡ Phát Sinh Hiện Trường</option>
                    <option value="REDLINE_MARKUP">🔴 Redline Tại Chỗ</option>
                    <option value="AS_BUILT_FINAL">📋 Hoàn Công Bàn Giao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Tên / Tiêu Đề Bản Vẽ (*):</label>
                <input
                  type="text"
                  value={drawingForm.title}
                  onChange={(e) => setDrawingForm({ ...drawingForm, title: e.target.value })}
                  placeholder="Mặt Bằng Bố Trí Cửa Đi & Cửa Sổ Tầng 1..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Bộ Môn:</label>
                  <select 
                    value={drawingForm.discipline}
                    onChange={(e) => setDrawingForm({ ...drawingForm, discipline: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  >
                    <option value="ARCHITECTURE">Kiến Trúc</option>
                    <option value="STRUCTURE">Kết Cấu</option>
                    <option value="MEP">Cơ Điện (MEP)</option>
                    <option value="INTERIOR">Nội Thất</option>
                    <option value="AS_BUILT">Hoàn Công</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Giai Đoạn:</label>
                  <select 
                    value={drawingForm.stageType}
                    onChange={(e) => setDrawingForm({ ...drawingForm, stageType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  >
                    <option value="CONSTRUCTION">Thiết Kế Thi Công</option>
                    <option value="SHOP_DRAWING">Shop Drawing</option>
                    <option value="VARIATION_SITE">Xử Lý Hiện Trường</option>
                    <option value="PERMIT">Xin Phép XD</option>
                    <option value="AS_BUILT">Hoàn Công</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Khổ & Tỉ Lệ:</label>
                  <div className="flex gap-1">
                    <select 
                      value={drawingForm.sheetSize}
                      onChange={(e) => setDrawingForm({ ...drawingForm, sheetSize: e.target.value })}
                      className="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 px-2 py-1.5 rounded-lg"
                    >
                      <option value="A2">A2</option>
                      <option value="A1">A1</option>
                      <option value="A0">A0</option>
                      <option value="A3">A3</option>
                    </select>
                    <input
                      type="text"
                      value={drawingForm.scale}
                      onChange={(e) => setDrawingForm({ ...drawingForm, scale: e.target.value })}
                      placeholder="1/100"
                      className="w-1/2 bg-slate-50 border border-slate-200 text-slate-900 px-2 py-1.5 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">KTS / Kỹ Sư Thực Hiện:</label>
                  <input
                    type="text"
                    value={drawingForm.author}
                    onChange={(e) => setDrawingForm({ ...drawingForm, author: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Người Duyệt (CĐT / TVGS):</label>
                  <input
                    type="text"
                    value={drawingForm.approver}
                    onChange={(e) => setDrawingForm({ ...drawingForm, approver: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Giá Trị Phát Sinh (+VNĐ nếu có):</label>
                  <input
                    type="number"
                    value={drawingForm.variationAmount || 0}
                    onChange={(e) => setDrawingForm({ ...drawingForm, variationAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Mã Định Mức BOM (TK 154):</label>
                  <input
                    type="text"
                    value={drawingForm.costingLinkId}
                    onChange={(e) => setDrawingForm({ ...drawingForm, costingLinkId: e.target.value })}
                    placeholder="BOM-KT01-T1..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-mono"
                  />
                </div>
              </div>

              {editingDrawing && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900">
                    <input
                      type="checkbox"
                      checked={isAddingNewRevision}
                      onChange={(e) => setIsAddingNewRevision(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    <span>Tạo Đợt Sửa Đổi Mới (Lên Rev 0{editingDrawing.revisions.length})</span>
                  </label>

                  {isAddingNewRevision && (
                    <div className="space-y-2 pt-1 border-t border-amber-200">
                      <div>
                        <label className="text-amber-900 font-bold block mb-1">Phân Định Trách Nhiệm / Nguyên Nhân Sửa (*):</label>
                        <select
                          value={revisionReasonType}
                          onChange={(e) => setRevisionReasonType(e.target.value as any)}
                          className="w-full bg-white border border-amber-300 text-slate-900 px-3 py-1.5 rounded-lg font-bold"
                        >
                          <option value="INVESTOR_REQUEST">🟢 Khách Hàng (CĐT) yêu cầu đổi ý / thay đổi công năng (Tính phát sinh)</option>
                          <option value="ERROR_CORRECTION">🔴 Lỗi Kỹ Thuật Nội Bộ (KTS vẽ sai sót kích thước / nhầm thép - Mình sai)</option>
                          <option value="SITE_CONFLICT">🟡 Xung Đột Hiện Trường (Vướng địa chất / đường cống cũ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-amber-800 font-semibold block mb-1">Nội dung chi tiết sửa đổi:</label>
                        <textarea
                          value={revisionNote}
                          onChange={(e) => setRevisionNote(e.target.value)}
                          placeholder="Mô tả cụ thể: Dời vách ngăn phòng ngủ, chỉnh thép dầm từ D18 lên D20..."
                          rows={2}
                          className="w-full bg-white border border-amber-300 text-slate-900 p-2 rounded-lg text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsDrawingModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveDrawing}
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{editingDrawing ? 'Cập Nhật Bản Vẽ' : 'Lưu Bản Vẽ Mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM CÔNG TRÌNH */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Thêm Công Trình / Dự Án Mới</span>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Mã Công Trình (*):</label>
                <input
                  type="text"
                  value={newProject.projectCode}
                  onChange={(e) => setNewProject({ ...newProject, projectCode: e.target.value })}
                  placeholder="CT-2026-HP03..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Tên Công Trình (*):</label>
                <input
                  type="text"
                  value={newProject.projectName}
                  onChange={(e) => setNewProject({ ...newProject, projectName: e.target.value })}
                  placeholder="Biệt Thự Vườn Củ Chi..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Chủ Đầu Tư:</label>
                <input
                  type="text"
                  value={newProject.investorName}
                  onChange={(e) => setNewProject({ ...newProject, investorName: e.target.value })}
                  placeholder="Ông Nguyễn Văn B..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Địa Chỉ Thi Công:</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  placeholder="Số nhà, đường, quận/huyện..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Giá Trị Hợp Đồng (VNĐ):</label>
                <input
                  type="number"
                  value={newProject.contractValue || 0}
                  onChange={(e) => setNewProject({ ...newProject, contractValue: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Lưu Công Trình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÃ QR */}
      {isQrModalOpen && activeQrDrawing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900">Mã QR Tra Cứu Công Trường</span>
              <button onClick={() => setIsQrModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl inline-block border border-slate-200 shadow-inner">
              <div className="w-44 h-44 bg-white rounded-lg flex items-center justify-center text-slate-800 font-mono text-[10px] p-2 text-center flex-col gap-2 border border-slate-200 shadow-xs">
                <QrCode className="w-24 h-24 text-blue-600" />
                <span className="text-slate-700 font-bold">[{activeQrDrawing.drawingNumber}] {activeQrDrawing.currentRevision}</span>
                <span className="text-[9px] text-slate-400">{activeQrDrawing.companyName}</span>
              </div>
            </div>

            <div className="text-slate-600 space-y-1">
              <div className="font-bold text-slate-900">{activeQrDrawing.title}</div>
              <div className="text-[11px] text-slate-500">
                Kỹ sư quét mã QR tại hiện trường để đối soát bản vẽ mới nhất ({activeQrDrawing.currentRevision}).
              </div>
            </div>

            <button
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xs"
            >
              Hoàn Tất
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM CÔNG TY */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Thêm Công Ty / Nhà Thầu Phụ Mới</span>
              <button onClick={() => setIsCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1">Tên Đầy Đủ Công Ty:</label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="CÔNG TY TNHH XÂY DỰNG..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Tên Viết Tắt / Gọi Nhanh:</label>
                  <input
                    type="text"
                    value={newCompany.shortName}
                    onChange={(e) => setNewCompany({ ...newCompany, shortName: e.target.value })}
                    placeholder="Thầu Sơn Nước Á Châu..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Vai Trò:</label>
                  <select
                    value={newCompany.role}
                    onChange={(e) => setNewCompany({ ...newCompany, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg"
                  >
                    <option value="SUB_CONTRACTOR">Thầu Phụ Thi Công</option>
                    <option value="INVESTOR">Chủ Đầu Tư</option>
                    <option value="SUPERVISION_CONSULTANT">Tư Vấn Giám Sát</option>
                    <option value="DESIGN_CONSULTANT">Đơn Vị Thiết Kế Ngoài</option>
                    <option value="SUPPLIER">Nhà Cung Cấp Vật Tư</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Người Đại Diện / Liên Hệ:</label>
                  <input
                    type="text"
                    value={newCompany.contactPerson}
                    onChange={(e) => setNewCompany({ ...newCompany, contactPerson: e.target.value })}
                    placeholder="KS. Nguyễn Văn A"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Số Điện Thoại:</label>
                  <input
                    type="text"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    placeholder="0908..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsCompanyModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCompany}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Lưu Đơn Vị
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
