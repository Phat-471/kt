import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded, logAuditEvent } from '../services/storage';
import { Client, MappingTemplate, NormalizedTransaction, ReconciliationPair } from '../types/accounting';
import { UserRole } from '../services/rolePermissionService';
import { IndustryPresetType } from '../services/industryPresetService';

interface AccountingContextType {
  // Data States
  clients: Client[];
  activeClient: Client | null;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;
  transactions: NormalizedTransaction[];
  reconciliations: ReconciliationPair[];
  mappingTemplates: MappingTemplate[];
  auditLogs: any[];

  // Role & Industry
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentIndustry: IndustryPresetType;
  setCurrentIndustry: (industry: IndustryPresetType) => void;

  // Actions
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  saveTransactions: (newTxs: NormalizedTransaction[]) => Promise<void>;
  saveTemplate: (templateData: Omit<MappingTemplate, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (updatedTx: NormalizedTransaction) => Promise<void>;
  batchApprove: (txIds: string[]) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');
  const [currentIndustry, setCurrentIndustry] = useState<IndustryPresetType>('COMMERCE');

  // Khởi tạo Seed Data
  useEffect(() => {
    seedInitialDataIfNeeded();
  }, []);

  // Live Reactive Queries từ IndexedDB (Dexie)
  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const mappingTemplates = useLiveQuery(() => db.mappingTemplates.toArray()) || [];
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().toArray()) || [];

  // Tự động chọn client đầu tiên khi load
  useEffect(() => {
    if (clients.length > 0 && !activeClientId) {
      setActiveClientId(clients[0].id);
    }
  }, [clients, activeClientId]);

  const activeClient = clients.find(c => c.id === activeClientId) || null;

  // Lọc transactions & reconciliations theo activeClient
  const transactions = useLiveQuery(
    () => (activeClientId ? db.transactions.where('clientId').equals(activeClientId).toArray() : []),
    [activeClientId]
  ) || [];

  const reconciliations = useLiveQuery(
    () => (activeClientId ? db.reconciliations.where('clientId').equals(activeClientId).toArray() : []),
    [activeClientId]
  ) || [];

  // Handlers
  const addClient = async (newClient: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  const updateClient = async (updatedClient: Client) => {
    await db.clients.put(updatedClient);
    await logAuditEvent('CREATE_CLIENT', 'Cập nhật thông tin khách hàng', `Đã cập nhật doanh nghiệp '${updatedClient.name}'`, updatedClient.id);
  };

  const deleteClient = async (clientId: string) => {
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

  const saveTransactions = async (newTxs: NormalizedTransaction[]) => {
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

  const saveTemplate = async (templateData: Omit<MappingTemplate, 'id' | 'createdAt'>) => {
    const created: MappingTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await db.mappingTemplates.add(created);
    await logAuditEvent('IMPORT_EXCEL', 'Lưu mẫu Map cột', `Đã tạo mẫu ánh xạ cột mới '${created.name}'`);
  };

  const updateTransaction = async (updatedTx: NormalizedTransaction) => {
    await db.transactions.put(updatedTx);
    await logAuditEvent('EDIT_TX', 'Chỉnh sửa chứng từ', `Đã sửa chứng từ số '${updatedTx.voucherNo}' (Ngày ${updatedTx.date}, ${updatedTx.amount.toLocaleString('vi-VN')} đ)`, activeClientId || undefined);
  };

  const batchApprove = async (txIds: string[]) => {
    await db.transaction('rw', db.transactions, async () => {
      for (const id of txIds) {
        const tx = await db.transactions.get(id);
        if (tx) {
          tx.userApproved = true;
          await db.transactions.put(tx);
        }
      }
    });
    await logAuditEvent('APPROVE_TX', 'Duyệt hàng loạt', `Đã phê duyệt ${txIds.length} dòng chứng từ`, activeClientId || undefined);
  };

  return (
    <AccountingContext.Provider
      value={{
        clients,
        activeClient,
        activeClientId,
        setActiveClientId,
        transactions,
        reconciliations,
        mappingTemplates,
        auditLogs,
        currentRole,
        setCurrentRole,
        currentIndustry,
        setCurrentIndustry,
        addClient,
        updateClient,
        deleteClient,
        saveTransactions,
        saveTemplate,
        updateTransaction,
        batchApprove,
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
};

export function useAccounting(): AccountingContextType {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
}
