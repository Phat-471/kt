import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded, exportFullDatabaseJSON, logAuditEvent } from './services/storage';
import { Client, MappingTemplate, NormalizedTransaction, ReconciliationPair } from './types/accounting';
import { useShortcuts } from './hooks/useShortcuts';

// Layout Components
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// View Modules
import { DashboardView } from './components/dashboard/DashboardView';
import { ClientManager } from './components/clients/ClientManager';
import { ExcelImporter } from './components/import/ExcelImporter';
import { InvoiceXMLImporter } from './components/import/InvoiceXMLImporter';
import { ErrorDiagnostics } from './components/validation/ErrorDiagnostics';
import { ReconciliationWorkspace } from './components/reconciliation/ReconciliationWorkspace';
import { ReportGeneratorView } from './components/reports/ReportGeneratorView';
import { DocumentGenerator } from './components/generator/DocumentGenerator';
import { BackupRestoreView } from './components/backup/BackupRestoreView';
import { AuditLogView } from './components/audit/AuditLogView';
import { UserGuideView } from './components/help/UserGuideView';
import { LegalKnowledgeBaseView } from './components/help/LegalKnowledgeBaseView';
import { TaxAndInventoryReportView } from './components/reports/TaxAndInventoryReportView';
import { MasterAccountingHub } from './components/accounting/MasterAccountingHub';
import { ExecutiveAnalyticsDashboardView } from './components/analytics/ExecutiveAnalyticsDashboardView';
import { MonthEndClosingView } from './components/closing/MonthEndClosingView';
import { FinancialStatementsView } from './components/reports/FinancialStatementsView';
import { ShortcutModal } from './components/common/ShortcutModal';
import { AISuggestionModal } from './components/common/AISuggestionModal';
import { MiniFloatingToolbar } from './components/common/MiniFloatingToolbar';
import { UserRole } from './services/rolePermissionService';
import { IndustryPresetType } from './services/industryPresetService';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [isShortcutOpen, setIsShortcutOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentIndustry, setCurrentIndustry] = useState<IndustryPresetType>('COMMERCE');
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(() => {
    return localStorage.getItem('accodesk_hide_header') === 'true';
  });
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Phím tắt Ctrl+Shift+F để Ẩn/Hiện Header nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsHeaderHidden(prev => {
          const next = !prev;
          localStorage.setItem('accodesk_hide_header', String(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize DB Seed
  useEffect(() => {
    seedInitialDataIfNeeded();
  }, []);

  // Live Reactive Queries
  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const mappingTemplates = useLiveQuery(() => db.mappingTemplates.toArray()) || [];
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray()) || [];

  // Set default active client when loaded
  useEffect(() => {
    if (clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0].id);
    }
  }, [clients, activeClientId]);

  const activeClient = clients.find(c => c.id === activeClientId) || null;

  // Filter data for active client
  const transactions = useLiveQuery(
    () => (activeClientId ? db.transactions.where('clientId').equals(activeClientId).toArray() : []),
    [activeClientId]
  ) || [];

  const reconciliations = useLiveQuery(
    () => (activeClientId ? db.reconciliations.where('clientId').equals(activeClientId).toArray() : []),
    [activeClientId]
  ) || [];

  // Handlers for Clients
  const handleAddClient = async (newClient: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created: Client = {
      ...newClient,
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.clients.add(created);
    await logAuditEvent('CREATE_CLIENT', 'Tạo mới doanh nghiệp/job', `Đã tạo doanh nghiệp '${created.name}' (MST: ${created.taxCode})`, created.id);
    setActiveClientId(created.id);
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    await db.clients.put(updatedClient);
    await logAuditEvent('CREATE_CLIENT', 'Cập nhật thông tin khách hàng', `Đã cập nhật doanh nghiệp '${updatedClient.name}'`, updatedClient.id);
  };

  const handleDeleteClient = async (clientId: string) => {
    const target = clients.find(c => c.id === clientId);
    await db.clients.delete(clientId);
    await db.transactions.where('clientId').equals(clientId).delete();
    await db.reconciliations.where('clientId').equals(clientId).delete();
    await logAuditEvent('DELETE_CLIENT', 'Xoá doanh nghiệp/job', `Đã xoá doanh nghiệp '${target?.name || clientId}' cùng toàn bộ chứng từ`, clientId);
    if (activeClientId === clientId) {
      const remaining = clients.filter(c => c.id !== clientId);
      setActiveClientId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Handlers for Import
  const handleSaveTransactions = async (newTxs: NormalizedTransaction[]) => {
    await db.transactions.bulkAdd(newTxs);
    if (newTxs.length > 0) {
      await logAuditEvent(
        'IMPORT_EXCEL', 
        'Import file Excel', 
        `Đã nạp ${newTxs.length} dòng chứng từ từ file '${newTxs[0].sourceFileName}' cho công ty '${activeClient?.name}'`,
        activeClientId || undefined
      );
    }
  };

  const handleSaveTemplate = async (templateData: Omit<MappingTemplate, 'id' | 'createdAt'>) => {
    const created: MappingTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await db.mappingTemplates.add(created);
    await logAuditEvent('IMPORT_EXCEL', 'Lưu mẫu Map cột', `Đã tạo mẫu ánh xạ cột mới '${created.name}'`);
  };

  // Handlers for Validation Diagnostics
  const handleUpdateTransaction = async (updatedTx: NormalizedTransaction) => {
    await db.transactions.put(updatedTx);
    await logAuditEvent('EDIT_TX', 'Chỉnh sửa chứng từ', `Đã sửa chứng từ số '${updatedTx.voucherNo}' (Ngày ${updatedTx.date}, ${updatedTx.amount.toLocaleString('vi-VN')} đ)`, activeClientId || undefined);
  };

  const handleBatchApprove = async (txIds: string[]) => {
    await db.transaction('rw', db.transactions, async () => {
      for (const id of txIds) {
        const tx = await db.transactions.get(id);
        if (tx) {
          tx.userApproved = true;
          await db.transactions.put(tx);
        }
      }
    });
    await logAuditEvent('APPROVE_TX', 'Duyệt hàng loạt chứng từ', `Kế toán đã phê duyệt hàng loạt ${txIds.length} dòng chứng từ trên màn hình`, activeClientId || undefined);
  };

  // Handlers for Reconciliation
  const handleConfirmMatch = async (voucherId: string, statementId: string, matchScore: number, reasons: string[]) => {
    if (!activeClientId) return;

    const pair: ReconciliationPair = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId: activeClientId,
      voucherId,
      statementId,
      matchScore,
      matchReasons: reasons,
      status: 'APPROVED',
      matchedAt: new Date().toISOString(),
    };

    await db.reconciliations.add(pair);

    // Update transactions status
    const vTx = await db.transactions.get(voucherId);
    if (vTx) {
      vTx.reconciledId = statementId;
      vTx.reconciledStatus = 'MATCHED';
      await db.transactions.put(vTx);
    }

    const sTx = await db.transactions.get(statementId);
    if (sTx) {
      sTx.reconciledId = voucherId;
      sTx.reconciledStatus = 'MATCHED';
      await db.transactions.put(sTx);
    }

    await logAuditEvent('MATCH_PAIR', 'Xác nhận khớp sao kê', `Đã duyệt ghép chứng từ số '${vTx?.voucherNo}' với sao kê ngân hàng (Điểm khớp: ${matchScore}%)`, activeClientId);
  };

  const handleUnmatch = async (pairId: string) => {
    const pair = await db.reconciliations.get(pairId);
    if (!pair) return;

    const vTx = await db.transactions.get(pair.voucherId);
    if (vTx) {
      vTx.reconciledId = undefined;
      vTx.reconciledStatus = 'NONE';
      await db.transactions.put(vTx);
    }

    const sTx = await db.transactions.get(pair.statementId);
    if (sTx) {
      sTx.reconciledId = undefined;
      sTx.reconciledStatus = 'NONE';
      await db.transactions.put(sTx);
    }

    await db.reconciliations.delete(pairId);
    await logAuditEvent('UNMATCH_PAIR', 'Hủy khớp đối chiếu', `Đã hủy ghép cặp chứng từ số '${vTx?.voucherNo}'`, activeClientId || undefined);
  };

  // Quick Backup Shortcut
  const handleQuickBackup = async () => {
    const jsonStr = await exportFullDatabaseJSON();
    const defaultName = `AccoDesk_Backup_${new Date().toISOString().slice(0, 10)}.accobak`;

    if ((window as any).electronAPI?.saveBackupDialog) {
      const res = await (window as any).electronAPI.saveBackupDialog(defaultName);
      if (!res.canceled && res.filePath) {
        const writeRes = await (window as any).electronAPI.writeFile(res.filePath, jsonStr);
        if (writeRes.success) {
          alert('Đã sao lưu nhanh thành công!');
          return;
        }
      }
    }

    // Web Fallback Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Categorized Txs for Reconciliation View
  const vouchers = transactions.filter(t => t.type === 'INCOME' || t.type === 'EXPENSE' || t.type === 'GENERAL');
  const statements = transactions.filter(t => t.type === 'BANK_STMT' || t.type === 'DEBT');

  const errorCount = transactions.filter(t => t.validationStatus === 'ERROR').length;
  const unreconciledCount = vouchers.filter(v => v.reconciledStatus !== 'MATCHED').length;

  // Global Keyboard Shortcuts
  useShortcuts({
    'ctrl+1': () => setActiveTab('dashboard'),
    'ctrl+2': () => setActiveTab('clients'),
    'ctrl+3': () => setActiveTab('import'),
    'ctrl+4': () => setActiveTab('validation'),
    'ctrl+5': () => setActiveTab('reconciliation'),
    'ctrl+6': () => setActiveTab('generator'),
    'ctrl+7': () => setActiveTab('xml-import'),
    'ctrl+8': () => setActiveTab('audit'),
    'ctrl+9': () => setActiveTab('backup'),
    'ctrl+shift+k': () => setIsShortcutOpen(prev => !prev),
    'escape': () => setIsShortcutOpen(false),
  });

  return (
    <div className="flex h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200">
      {/* Sidebar Navigation (Ẩn khi ở Zen Mode) */}
      {!isZenMode && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          errorCount={errorCount}
          unreconciledCount={unreconciledCount}
        />
      )}

      {/* Mini Floating Toolbar (Hiển thị khi Header ẩn hoặc Zen Mode) */}
      {(isHeaderHidden || isZenMode) && (
        <MiniFloatingToolbar
          activeClient={activeClient}
          onShowHeader={() => {
            setIsHeaderHidden(false);
            localStorage.setItem('accodesk_hide_header', 'false');
          }}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {!isHeaderHidden && !isZenMode && (
          <Header 
            clients={clients} 
            activeClient={activeClient}
            onSelectClient={(c) => setActiveClientId(c.id)}
            onQuickBackup={() => setActiveTab('backup')}
            onOpenShortcuts={() => setIsShortcutOpen(true)}
            onOpenAIModal={() => setIsAIModalOpen(true)}
            onToggleHideHeader={() => {
              setIsHeaderHidden(true);
              localStorage.setItem('accodesk_hide_header', 'true');
            }}
            isHeaderHidden={isHeaderHidden}
            totalTxCount={transactions.length}
            globalSearchTerm={globalSearchTerm}
            onSearchChange={setGlobalSearchTerm}
            currentRole={currentRole}
            onChangeRole={setCurrentRole}
            currentIndustry={currentIndustry}
            onChangeIndustry={setCurrentIndustry}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 transition-colors duration-200">
          <div key={activeTab} className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardView
              activeClient={activeClient}
              transactions={transactions}
              reconciliations={reconciliations}
              onNavigateTab={(t) => setActiveTab(t)}
            />
          )}

          {activeTab === 'executive-analytics' && (
            <ExecutiveAnalyticsDashboardView
              transactions={transactions}
              activeClient={activeClient}
            />
          )}

          {activeTab === 'month-end-closing' && (
            <MonthEndClosingView
              transactions={transactions}
              reconciliations={reconciliations}
              activeClient={activeClient}
              onNavigateTab={(t) => setActiveTab(t)}
              onQuickBackup={() => setActiveTab('backup')}
            />
          )}

          {activeTab === 'clients' && (
            <ClientManager
              clients={clients}
              activeClient={activeClient}
              onSelectClient={(c) => setActiveClientId(c.id)}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === 'import' && (
            <ExcelImporter
              activeClient={activeClient}
              mappingTemplates={mappingTemplates}
              onSaveTransactions={handleSaveTransactions}
              onSaveTemplate={handleSaveTemplate}
            />
          )}

          {activeTab === 'xml-import' && (
            <div className="h-full bg-slate-100 dark:bg-slate-950 p-6">
              {activeClient ? (
                <InvoiceXMLImporter
                  clientId={activeClient.id}
                  clientTaxCode={activeClient.taxCode}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                  <p>Vui lòng chọn hoặc tạo Khách hàng/Job trước khi đọc Hóa Đơn.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'validation' && (
            <ErrorDiagnostics
              transactions={transactions}
              onUpdateTransaction={handleUpdateTransaction}
              onBatchApprove={handleBatchApprove}
            />
          )}

          {activeTab === 'financial-reports' && (
            <FinancialStatementsView transactions={transactions} />
          )}

          {activeTab === 'master-accounting' && (
            <MasterAccountingHub transactions={transactions} activeClient={activeClient} />
          )}

          {activeTab === 'reconciliation' && (
            <ReconciliationWorkspace
              activeClient={activeClient}
              vouchers={vouchers}
              statements={statements}
              reconciliations={reconciliations}
              onConfirmMatch={handleConfirmMatch}
              onUnmatch={handleUnmatch}
              searchTerm={globalSearchTerm}
            />
          )}

          {activeTab === 'reports' && (
            <ReportGeneratorView
              activeClient={activeClient}
              transactions={transactions}
              reconciliations={reconciliations}
              searchTerm={globalSearchTerm}
            />
          )}

          {activeTab === 'generator' && (
            <DocumentGenerator
              activeClient={activeClient}
              transactions={transactions}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogView
              logs={auditLogs}
            />
          )}

          {activeTab === 'backup' && (
            <BackupRestoreView
              onRefreshDatabase={() => {
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'legal-search' && (
            <LegalKnowledgeBaseView />
          )}

          {activeTab === 'tax-reports' && (
            <TaxAndInventoryReportView
              activeClient={activeClient}
              transactions={transactions}
            />
          )}

          {activeTab === 'help' && (
            <UserGuideView />
          )}
          </div>
        </main>
      </div>

      <ShortcutModal isOpen={isShortcutOpen} onClose={() => setIsShortcutOpen(false)} />
      <AISuggestionModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        transactions={transactions}
      />
    </div>
  );
}
