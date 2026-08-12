import Dexie, { Table } from 'dexie';
import { Client, MappingTemplate, NormalizedTransaction, ReconciliationPair, AuditLogItem } from '../types/accounting';

export class AccountingDatabase extends Dexie {
  clients!: Table<Client, string>;
  mappingTemplates!: Table<MappingTemplate, string>;
  transactions!: Table<NormalizedTransaction, string>;
  reconciliations!: Table<ReconciliationPair, string>;
  auditLogs!: Table<AuditLogItem, string>;

  constructor() {
    super('AccoDeskDB');
    this.version(2).stores({
      clients: 'id, code, taxCode, financialYear',
      mappingTemplates: 'id, clientId, name',
      transactions: 'id, clientId, type, date, voucherNo, validationStatus, userApproved, reconciledStatus, sourceFileName',
      reconciliations: 'id, clientId, voucherId, statementId, status',
      auditLogs: 'id, clientId, timestamp, action',
    });
  }
}

export const db = new AccountingDatabase();

// Audit Logger Helper
export async function logAuditEvent(
  action: AuditLogItem['action'],
  actionTitle: string,
  details: string,
  clientId?: string
) {
  try {
    const item: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId,
      timestamp: new Date().toISOString(),
      action,
      actionTitle,
      details,
      userName: 'Kế toán viên',
    };
    await db.auditLogs.add(item);
  } catch (e) {
    console.error('Audit Log Failed', e);
  }
}

// Seed Initial Sample Data if DB is empty
export async function seedInitialDataIfNeeded() {
  // Database giữ trạng thái hoàn toàn sạch trống cho dữ liệu thực tế của kế toán
}

// Backup & Restore Services
export async function exportFullDatabaseJSON(): Promise<string> {
  const clients = await db.clients.toArray();
  const mappingTemplates = await db.mappingTemplates.toArray();
  const transactions = await db.transactions.toArray();
  const reconciliations = await db.reconciliations.toArray();
  const auditLogs = await db.auditLogs.toArray();

  const backupData = {
    appName: 'AccoDesk',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    clients,
    mappingTemplates,
    transactions,
    reconciliations,
    auditLogs,
  };

  await logAuditEvent('BACKUP_EXPORT', 'Sao lưu dữ liệu', `Đã xuất file sao lưu chứa ${transactions.length} dòng chứng từ`);

  return JSON.stringify(backupData, null, 2);
}

export async function restoreFullDatabaseJSON(jsonContent: string): Promise<{ success: boolean; message: string }> {
  try {
    const data = JSON.parse(jsonContent);
    if (!data.appName || data.appName !== 'AccoDesk') {
      return { success: false, message: 'Tệp sao lưu không đúng định dạng AccoDesk!' };
    }

    await db.transaction('rw', [db.clients, db.mappingTemplates, db.transactions, db.reconciliations, db.auditLogs], async () => {
      await db.clients.clear();
      await db.mappingTemplates.clear();
      await db.transactions.clear();
      await db.reconciliations.clear();
      await db.auditLogs.clear();

      if (data.clients && data.clients.length > 0) await db.clients.bulkAdd(data.clients);
      if (data.mappingTemplates && data.mappingTemplates.length > 0) await db.mappingTemplates.bulkAdd(data.mappingTemplates);
      if (data.transactions && data.transactions.length > 0) await db.transactions.bulkAdd(data.transactions);
      if (data.reconciliations && data.reconciliations.length > 0) await db.reconciliations.bulkAdd(data.reconciliations);
      if (data.auditLogs && data.auditLogs.length > 0) await db.auditLogs.bulkAdd(data.auditLogs);
    });

    await logAuditEvent('RESTORE_DB', 'Khôi phục CSDL', `Đã phục hồi dữ liệu từ file sao lưu (${data.transactions?.length || 0} chứng từ)`);

    return { success: true, message: `Khôi phục thành công! Đã tải ${data.clients?.length || 0} khách hàng và ${data.transactions?.length || 0} chứng từ.` };
  } catch (err: any) {
    return { success: false, message: `Lỗi đọc tệp sao lưu: ${err.message}` };
  }
}

// Clear 100% All Data
export async function clearAllDatabaseData(): Promise<void> {
  await db.transaction('rw', [db.clients, db.mappingTemplates, db.transactions, db.reconciliations, db.auditLogs], async () => {
    await db.clients.clear();
    await db.mappingTemplates.clear();
    await db.transactions.clear();
    await db.reconciliations.clear();
    await db.auditLogs.clear();
  });
}
