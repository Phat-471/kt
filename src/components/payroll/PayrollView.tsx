import React, { useState, useEffect, useMemo } from 'react';
import {
  Employee,
  getAllEmployees, saveEmployee, deleteEmployee,
  calculatePayrollSummary,
} from '../../services/payrollService';
import { Client } from '../../types/accounting';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PageHeader, SubTabNav, StatCard } from '../common';
import {
  Users, Plus, Trash2, ChevronDown, ChevronUp,
  Calculator, Download, BookOpen, CircleDollarSign,
  AlertTriangle, Edit3, X, Save
} from 'lucide-react';

interface PayrollViewProps {
  activeClient: Client | null;
}

const DEPARTMENTS = ['Kế toán', 'Kinh doanh', 'Nhân sự', 'Kỹ thuật', 'Ban giám đốc', 'Hành chính', 'Sản xuất', 'Khác'];

const emptyEmployee = (): Omit<Employee, 'id'> => ({
  name: '',
  position: '',
  department: 'Kế toán',
  contractType: 'OFFICIAL',
  basicSalary: 10_000_000,
  allowances: { position: 0, transport: 500_000, meal: 730_000, phone: 0, other: 0 },
  dependentsCount: 0,
  taxCode: '',
  bankAccount: '',
  startDate: new Date().toISOString().slice(0, 10),
});

const now = new Date();
const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

export const PayrollView: React.FC<PayrollViewProps> = ({ activeClient }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [period, setPeriod] = useState(defaultPeriod);
  const [activeTab, setActiveTab] = useState<'BANGLUONG' | 'NHANVIEN' | 'BUTOAN'>('BANGLUONG');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmp, setNewEmp] = useState<Omit<Employee, 'id'>>(emptyEmployee());

  const refresh = () => setEmployees(getAllEmployees());

  useEffect(() => { refresh(); }, []);

  const summary = useMemo(() => {
    if (employees.length === 0) return null;
    return calculatePayrollSummary(employees, period, activeClient?.id || 'default');
  }, [employees, period, activeClient]);

  const handleSaveNewEmp = () => {
    if (!newEmp.name.trim() || !newEmp.position.trim()) {
      alert('Vui lòng nhập họ tên và chức vụ!');
      return;
    }
    const emp: Employee = { ...newEmp, id: `emp-${Date.now()}` };
    saveEmployee(emp);
    refresh();
    setShowAddForm(false);
    setNewEmp(emptyEmployee());
  };

  const handleUpdateEmp = () => {
    if (!editingEmp) return;
    saveEmployee(editingEmp);
    refresh();
    setEditingEmp(null);
  };

  const handleDeleteEmp = (id: string) => {
    if (!confirm('Xóa nhân viên này khỏi danh sách bảng lương?')) return;
    deleteEmployee(id);
    refresh();
  };

  const handleExportCSV = () => {
    if (!summary) return;
    const headers = [
      'STT', 'Họ tên', 'Chức vụ', 'Bộ phận', 'Loại HĐ',
      'Lương cơ bản', 'Phụ cấp', 'Gross', 'BHXH (8%)', 'BHYT (1.5%)', 'BHTN (1%)',
      'Tổng BH NLĐ', 'Giảm trừ BT', 'Giảm trừ PT', 'TN tính thuế', 'Thuế TNCN',
      'Lương NET', 'BH NSDLĐ (21.5%)', 'Tổng CP DN'
    ];
    const rows = summary.entries.map((e, i) => {
      const emp = employees.find(item => item.id === e.employeeId);
      const contractType = emp ? (emp.contractType === 'OFFICIAL' ? 'Chính thức' : emp.contractType === 'PROBATION' ? 'Thử việc' : 'Bán thời gian') : 'Chính thức';
      return [
        i + 1, e.employeeName, e.position, e.department, contractType,
        e.basicSalary, e.totalAllowances, e.grossSalary,
        e.bhxhEmployee, e.bhytEmployee, e.bhtnEmployee, e.totalInsuranceEmployee,
        e.personalDeduction, e.dependentDeduction, e.assessableIncome, e.pitAmount,
        e.netSalary, e.totalInsuranceEmployer, e.totalEmployerCost,
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Luong_${period.replace('/', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'BANGLUONG' as const, label: 'Bảng Lương', icon: CircleDollarSign },
    { id: 'NHANVIEN' as const, label: 'Danh Sách NV', icon: Users, count: employees.length },
    { id: 'BUTOAN' as const, label: 'Bút Toán Lương', icon: BookOpen },
  ];

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        icon={Calculator}
        title="Tính Lương, Bảo Hiểm & Thuế TNCN"
        subtitle={`Theo luật 2026 (BHXH 10.5%/21.5%, biểu thuế lũy tiến từng phần, giảm trừ bản thân 11M/tháng)${activeClient ? ` — ${activeClient.name}` : ''}`}
        variant="gradient"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/20">
              <span className="text-[10px] text-blue-200">Kỳ:</span>
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                placeholder="MM/YYYY"
                className="w-20 px-1 py-0.5 bg-transparent text-xs text-white placeholder-blue-300 focus:outline-none font-mono font-bold"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-blue-900 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Xuất CSV
            </button>
          </div>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Nhân viên"
            value={`${summary.entries.length} người`}
            variant="purple"
            compact
          />
          <StatCard
            label="Tổng Gross"
            value={`${formatCurrency(summary.totalGross)} đ`}
            variant="slate"
            compact
          />
          <StatCard
            label="BH NLĐ (10.5%)"
            value={`${formatCurrency(summary.totalInsuranceEmployee)} đ`}
            variant="amber"
            compact
          />
          <StatCard
            label="BH NSDLĐ (21.5%)"
            value={`${formatCurrency(summary.totalInsuranceEmployer)} đ`}
            variant="cyan"
            compact
          />
          <StatCard
            label="Thuế TNCN"
            value={`${formatCurrency(summary.totalPIT)} đ`}
            variant="rose"
            compact
          />
          <StatCard
            label="Lương Net"
            value={`${formatCurrency(summary.totalNetSalary)} đ`}
            variant="emerald"
            compact
          />
        </div>
      )}

      <SubTabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t)}
      />

      {activeTab === 'BANGLUONG' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">BẢNG THANH TOÁN LƯƠNG KỲ {period}</p>
              <p className="text-[10px] text-slate-500">Đơn vị: Đồng Việt Nam (VNĐ)</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300 min-w-[900px]">
              <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3 w-8">STT</th>
                  <th className="p-3">Họ Tên</th>
                  <th className="p-3">Bộ Phận</th>
                  <th className="p-3 text-right">Gross (đ)</th>
                  <th className="p-3 text-right">BH NLĐ (đ)</th>
                  <th className="p-3 text-right">BH NSDLĐ (đ)</th>
                  <th className="p-3 text-right">TNCN (đ)</th>
                  <th className="p-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400">Lương Net (đ)</th>
                  <th className="p-3 text-right text-orange-700 dark:text-orange-400">Chi phí DN (đ)</th>
                  <th className="p-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(summary?.entries || []).map((entry, i) => (
                  <React.Fragment key={entry.employeeId}>
                    <tr
                      className={`hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/10'}`}
                      onClick={() => setExpandedEntryId(expandedEntryId === entry.employeeId ? null : entry.employeeId)}
                    >
                      <td className="p-3 text-slate-400">{i + 1}</td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{entry.employeeName}</p>
                        <p className="text-[10px] text-slate-400">{entry.position}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-500/20">{entry.department}</span>
                      </td>
                      <td className="p-3 text-right tabular-num font-semibold">{formatNumber(entry.grossSalary)}</td>
                      <td className="p-3 text-right tabular-num text-amber-700 dark:text-amber-400">{formatNumber(entry.totalInsuranceEmployee)}</td>
                      <td className="p-3 text-right tabular-num text-orange-700 dark:text-orange-400">{formatNumber(entry.totalInsuranceEmployer)}</td>
                      <td className="p-3 text-right tabular-num text-rose-700 dark:text-rose-400">{formatNumber(entry.pitAmount)}</td>
                      <td className="p-3 text-right tabular-num font-extrabold text-emerald-700 dark:text-emerald-400">{formatNumber(entry.netSalary)}</td>
                      <td className="p-3 text-right tabular-num text-orange-600 dark:text-orange-400">{formatNumber(entry.totalEmployerCost)}</td>
                      <td className="p-3">
                        {expandedEntryId === entry.employeeId
                          ? <ChevronUp className="w-4 h-4 text-slate-400" />
                          : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </td>
                    </tr>
                    {expandedEntryId === entry.employeeId && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <div className="px-5 py-4 bg-violet-50/60 dark:bg-violet-950/20 border-y border-violet-200 dark:border-violet-500/20">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="space-y-1">
                                <p className="font-bold text-violet-700 dark:text-violet-400 text-[10px] uppercase">Thu Nhập</p>
                                <p>Lương cơ bản: <strong>{formatNumber(entry.basicSalary)}</strong></p>
                                <p>Phụ cấp: <strong>{formatNumber(entry.totalAllowances)}</strong></p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">= Gross: {formatNumber(entry.grossSalary)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-amber-700 dark:text-amber-400 text-[10px] uppercase">BH Phần NLĐ</p>
                                <p>BHXH 8%: <strong>{formatNumber(entry.bhxhEmployee)}</strong></p>
                                <p>BHYT 1.5%: <strong>{formatNumber(entry.bhytEmployee)}</strong></p>
                                <p>BHTN 1%: <strong>{formatNumber(entry.bhtnEmployee)}</strong></p>
                                <p className="font-bold text-amber-700 dark:text-amber-400">= {formatNumber(entry.totalInsuranceEmployee)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-rose-700 dark:text-rose-400 text-[10px] uppercase">Thuế TNCN</p>
                                <p>Giảm trừ BT: <strong>{formatNumber(entry.personalDeduction)}</strong></p>
                                <p>Giảm trừ PT: <strong>{formatNumber(entry.dependentDeduction)}</strong></p>
                                <p>TN tính thuế: <strong>{formatNumber(entry.assessableIncome)}</strong></p>
                                <p className="font-bold text-rose-700 dark:text-rose-400">TNCN: {formatNumber(entry.pitAmount)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-orange-700 dark:text-orange-400 text-[10px] uppercase">BH Phần NSDLĐ</p>
                                <p>BHXH 17.5%: <strong>{formatNumber(entry.bhxhEmployer)}</strong></p>
                                <p>BHYT 3%: <strong>{formatNumber(entry.bhytEmployer)}</strong></p>
                                <p>BHTN 1%: <strong>{formatNumber(entry.bhtnEmployer)}</strong></p>
                                <p className="font-bold text-orange-700 dark:text-orange-400">= {formatNumber(entry.totalInsuranceEmployer)}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {summary && (
                  <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={3} className="p-3 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">CỘNG</td>
                    <td className="p-3 text-right tabular-num text-slate-900 dark:text-slate-100">{formatNumber(summary.totalGross)}</td>
                    <td className="p-3 text-right tabular-num text-amber-700 dark:text-amber-400">{formatNumber(summary.totalInsuranceEmployee)}</td>
                    <td className="p-3 text-right tabular-num text-orange-700 dark:text-orange-400">{formatNumber(summary.totalInsuranceEmployer)}</td>
                    <td className="p-3 text-right tabular-num text-rose-700 dark:text-rose-400">{formatNumber(summary.totalPIT)}</td>
                    <td className="p-3 text-right tabular-num text-emerald-700 dark:text-emerald-400">{formatNumber(summary.totalNetSalary)}</td>
                    <td className="p-3 text-right tabular-num text-orange-600 dark:text-orange-400">{formatNumber(summary.totalEmployerCost)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {employees.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có nhân viên. Vào tab "Danh Sách NV" để thêm.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'NHANVIEN' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{employees.length} nhân viên trong danh sách lương</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm Nhân Viên
            </button>
          </div>

          {showAddForm && (
            <EmployeeForm
              emp={newEmp as Employee}
              onChange={(field, val) => setNewEmp(prev => ({ ...prev, [field]: val }))}
              onChangeAllowance={(field, val) => setNewEmp(prev => ({ ...prev, allowances: { ...prev.allowances, [field]: val } }))}
              onSave={handleSaveNewEmp}
              onCancel={() => { setShowAddForm(false); setNewEmp(emptyEmployee()); }}
              isNew
            />
          )}

          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {editingEmp?.id === emp.id ? (
                  <div className="p-4">
                    <EmployeeForm
                      emp={editingEmp}
                      onChange={(field, val) => setEditingEmp(prev => prev ? { ...prev, [field]: val } : prev)}
                      onChangeAllowance={(field, val) => setEditingEmp(prev => prev ? { ...prev, allowances: { ...prev.allowances, [field]: val } } : prev)}
                      onSave={handleUpdateEmp}
                      onCancel={() => setEditingEmp(null)}
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-extrabold shrink-0">
                        {emp.name.split(' ').pop()?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{emp.name}</p>
                        <p className="text-[10px] text-slate-500">{emp.position} — {emp.department} | {emp.contractType === 'OFFICIAL' ? 'Chính thức' : emp.contractType === 'PROBATION' ? 'Thử việc' : 'Bán thời gian'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500">Lương cơ bản</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{formatNumber(emp.basicSalary)} đ</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-slate-500">Người PT</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{emp.dependentsCount}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingEmp(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors cursor-pointer">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEmp(emp.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'BUTOAN' && (
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs text-blue-800 dark:text-blue-300">
            <p className="font-bold mb-1">📋 Bút Toán Hạch Toán Lương Kỳ {period} (TT200/2014)</p>
            <p>Gồm: Ghi nhận lương phải trả (Nợ 622/Có 334) → Trích BH NLĐ (Nợ 334/Có 338) → Trích BH NSDLĐ (Nợ 622/Có 338) → Khấu trừ TNCN (Nợ 334/Có 333) → Chi lương (Nợ 334/Có 112)</p>
          </div>

          {(summary?.entries || []).map(entry => (
            <div key={entry.employeeId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.employeeName} — {entry.position}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[520px]">
                  <thead className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2">Nợ TK</th>
                      <th className="px-4 py-2">Có TK</th>
                      <th className="px-4 py-2">Diễn Giải</th>
                      <th className="px-4 py-2 text-right">Số Tiền (đ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {entry.accountingEntries.map((ae, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="px-4 py-2 font-mono font-bold text-amber-700 dark:text-amber-400">{ae.debitAcc}</td>
                        <td className="px-4 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-400">{ae.creditAcc}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{ae.description}</td>
                        <td className="px-4 py-2 text-right tabular-num font-semibold text-slate-900 dark:text-slate-100">{formatNumber(ae.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {(!summary || summary.entries.length === 0) && (
            <div className="py-12 text-center text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Thêm nhân viên để xem bút toán lương.</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Lưu ý 2026:</strong> Lương cơ sở 2,340,000đ/tháng | Mức lương tối thiểu vùng I: 4,960,000đ | Trần lương đóng BH: 46,800,000đ (20x lương CS) | Phụ cấp cơm ca miễn thuế tối đa 730,000đ/tháng.
        </span>
      </div>
    </div>
  );
};

const EmployeeForm: React.FC<{
  emp: Employee;
  onChange: (field: keyof Employee, val: any) => void;
  onChangeAllowance: (field: string, val: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew?: boolean;
}> = ({ emp, onChange, onChangeAllowance, onSave, onCancel, isNew }) => {
  return (
    <div className="bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-500/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-extrabold text-violet-800 dark:text-violet-300">{isNew ? '➕ Thêm Nhân Viên Mới' : '✏️ Cập Nhật Thông Tin'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Họ Tên *', field: 'name' as keyof Employee, type: 'text' },
          { label: 'Chức Vụ *', field: 'position' as keyof Employee, type: 'text' },
          { label: 'MST Cá Nhân', field: 'taxCode' as keyof Employee, type: 'text' },
          { label: 'Ngày Vào Làm', field: 'startDate' as keyof Employee, type: 'date' },
          { label: 'Số TK Ngân Hàng', field: 'bankAccount' as keyof Employee, type: 'text' },
        ].map(f => (
          <div key={f.field}>
            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={String(emp[f.field] ?? '')}
              onChange={e => onChange(f.field, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        ))}

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Phòng Ban</label>
          <select value={emp.department} onChange={e => onChange('department', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Loại HĐ</label>
          <select value={emp.contractType} onChange={e => onChange('contractType', e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="OFFICIAL">Chính thức (≥3 tháng)</option>
            <option value="PROBATION">Thử việc</option>
            <option value="PARTTIME">Bán thời gian</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Người Phụ Thuộc</label>
          <input type="number" min={0} max={10} value={emp.dependentsCount}
            onChange={e => onChange('dependentsCount', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Lương Cơ Bản (đ) *</label>
          <input type="number" min={0} step={500000} value={emp.basicSalary}
            onChange={e => onChange('basicSalary', Number(e.target.value))}
            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
      </div>

      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1">Phụ Cấp Hàng Tháng</p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Chức vụ', field: 'position' },
          { label: 'Đi lại', field: 'transport' },
          { label: 'Cơm ca (max 730K)', field: 'meal' },
          { label: 'Điện thoại', field: 'phone' },
          { label: 'Khác', field: 'other' },
        ].map(f => (
          <div key={f.field}>
            <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">{f.label}</label>
            <input type="number" min={0} step={100000} value={(emp.allowances as any)[f.field]}
              onChange={e => onChangeAllowance(f.field, Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer">
          <Save className="w-3.5 h-3.5" /> {isNew ? 'Thêm Nhân Viên' : 'Lưu Thay Đổi'}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
          <X className="w-3.5 h-3.5" /> Hủy
        </button>
      </div>
    </div>
  );
};
