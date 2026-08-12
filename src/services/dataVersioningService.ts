import { NormalizedTransaction } from '../types/accounting';

export interface DataSnapshotVersion {
  versionId: string;
  versionName: string; // VD: "Snapshot Khóa Sổ Tháng 07/2026"
  createdAt: string;
  createdBy: string;
  totalTransactions: number;
  totalRevenue: number;
  totalExpense: number;
  transactionsSnapshot: NormalizedTransaction[];
}

const STORAGE_KEY_VERSIONS = 'ketoan_pro_data_versions_v1';

export const createDataSnapshot = (
  versionName: string,
  transactions: NormalizedTransaction[],
  createdBy: string = 'Kế Toán Trưởng'
): DataSnapshotVersion => {
  const totalRevenue = transactions
    .filter(t => t.type === 'INCOME' || t.creditAcc.startsWith('511'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE' || t.debitAcc.startsWith('632') || t.debitAcc.startsWith('642'))
    .reduce((sum, t) => sum + t.amount, 0);

  const snapshot: DataSnapshotVersion = {
    versionId: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    versionName,
    createdAt: new Date().toLocaleString('vi-VN'),
    createdBy,
    totalTransactions: transactions.length,
    totalRevenue,
    totalExpense,
    transactionsSnapshot: JSON.parse(JSON.stringify(transactions)), // Deep copy
  };

  const existing = getSavedDataSnapshots();
  existing.unshift(snapshot);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(existing));
  }

  return snapshot;
};

export const getSavedDataSnapshots = (): DataSnapshotVersion[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_VERSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const compareDataSnapshots = (
  oldVersion: DataSnapshotVersion,
  currentTransactions: NormalizedTransaction[]
) => {
  const oldMap = new Map(oldVersion.transactionsSnapshot.map(t => [t.id, t]));
  const currentMap = new Map(currentTransactions.map(t => [t.id, t]));

  const modifiedList: { oldTx?: NormalizedTransaction; newTx?: NormalizedTransaction; changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' }[] = [];

  currentTransactions.forEach(newTx => {
    const oldTx = oldMap.get(newTx.id);
    if (!oldTx) {
      modifiedList.push({ newTx, changeType: 'ADDED' });
    } else if (oldTx.amount !== newTx.amount || oldTx.description !== newTx.description || oldTx.debitAcc !== newTx.debitAcc || oldTx.creditAcc !== newTx.creditAcc) {
      modifiedList.push({ oldTx, newTx, changeType: 'MODIFIED' });
    }
  });

  oldVersion.transactionsSnapshot.forEach(oldTx => {
    if (!currentMap.has(oldTx.id)) {
      modifiedList.push({ oldTx, changeType: 'REMOVED' });
    }
  });

  return {
    oldVersionName: oldVersion.versionName,
    totalChanges: modifiedList.length,
    modifiedList,
  };
};
