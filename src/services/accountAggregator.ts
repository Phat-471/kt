import { NormalizedTransaction } from '../types/accounting';

export interface AccountTotals {
  debit: number;
  credit: number;
}

export class AccountAggregator {
  private accountMap: Map<string, AccountTotals> = new Map();
  private totalDebitAll: number = 0;
  private totalCreditAll: number = 0;

  constructor(transactions: NormalizedTransaction[] = []) {
    this.processTransactions(transactions);
  }

  private processTransactions(transactions: NormalizedTransaction[]): void {
    this.accountMap.clear();
    this.totalDebitAll = 0;
    this.totalCreditAll = 0;

    for (let i = 0; i < transactions.length; i++) {
      this.addTransactionToMap(transactions[i]);
    }
  }

  private addTransactionToMap(t: NormalizedTransaction): void {
    const amount = t.amount || 0;

    if (t.debitAcc) {
      const dAcc = t.debitAcc.trim();
      if (dAcc) {
        let current = this.accountMap.get(dAcc);
        if (!current) {
          current = { debit: 0, credit: 0 };
          this.accountMap.set(dAcc, current);
        }
        current.debit += amount;
        this.totalDebitAll += amount;
      }
    }

    if (t.creditAcc) {
      const cAcc = t.creditAcc.trim();
      if (cAcc) {
        let current = this.accountMap.get(cAcc);
        if (!current) {
          current = { debit: 0, credit: 0 };
          this.accountMap.set(cAcc, current);
        }
        current.credit += amount;
        this.totalCreditAll += amount;
      }
    }
  }

  private removeTransactionFromMap(t: NormalizedTransaction): void {
    const amount = t.amount || 0;

    if (t.debitAcc) {
      const dAcc = t.debitAcc.trim();
      if (dAcc) {
        const current = this.accountMap.get(dAcc);
        if (current) {
          current.debit = Math.max(0, current.debit - amount);
          this.totalDebitAll = Math.max(0, this.totalDebitAll - amount);
        }
      }
    }

    if (t.creditAcc) {
      const cAcc = t.creditAcc.trim();
      if (cAcc) {
        const current = this.accountMap.get(cAcc);
        if (current) {
          current.credit = Math.max(0, current.credit - amount);
          this.totalCreditAll = Math.max(0, this.totalCreditAll - amount);
        }
      }
    }
  }

  /**
   * Incremental Mutation: Thêm 1 chứng từ mới vào cache
   */
  public addTransaction(t: NormalizedTransaction): void {
    this.addTransactionToMap(t);
  }

  /**
   * Incremental Mutation: Xóa 1 chứng từ khỏi cache
   */
  public removeTransaction(t: NormalizedTransaction): void {
    this.removeTransactionFromMap(t);
  }

  /**
   * Incremental Mutation: Cập nhật chứng từ cũ -> mới
   */
  public updateTransaction(oldT: NormalizedTransaction, newT: NormalizedTransaction): void {
    this.removeTransactionFromMap(oldT);
    this.addTransactionToMap(newT);
  }

  /**
   * Lấy tổng Nợ và Có cho các tài khoản bắt đầu bằng accountPrefix
   */
  public getTotals(accountPrefix: string): AccountTotals {
    let debit = 0;
    let credit = 0;

    for (const [acc, totals] of this.accountMap.entries()) {
      if (acc.startsWith(accountPrefix)) {
        debit += totals.debit;
        credit += totals.credit;
      }
    }

    return { debit, credit };
  }

  /**
   * Lấy số dư tính toán cho 1 tài khoản hoặc nhóm tài khoản (prefix)
   * normalSide = 'DEBIT' -> Dư Nợ = Nợ - Có
   * normalSide = 'CREDIT' -> Dư Có = Có - Nợ
   */
  public getAccountBalance(accountPrefix: string, normalSide: 'DEBIT' | 'CREDIT'): number {
    const { debit, credit } = this.getTotals(accountPrefix);
    if (normalSide === 'DEBIT') {
      return debit - credit;
    } else {
      return credit - debit;
    }
  }

  /**
   * Hao mòn lũy kế (Tài khoản tương phản tài sản 214)
   * Trả về Có - Nợ (dương)
   */
  public getContraAssetBalance(accountPrefix: string): number {
    const { debit, credit } = this.getTotals(accountPrefix);
    return credit - debit;
  }

  /**
   * Trả về danh sách tất cả các tài khoản có phát sinh
   */
  public getAllAccountCodes(): string[] {
    return Array.from(this.accountMap.keys());
  }

  /**
   * Kiểm tra tính cân bằng tổng thể: Tổng phát sinh Nợ == Tổng phát sinh Có
   */
  public isBalanced(): boolean {
    return this.totalDebitAll === this.totalCreditAll;
  }

  public getTotalDebit(): number {
    return this.totalDebitAll;
  }

  public getTotalCredit(): number {
    return this.totalCreditAll;
  }
}

/**
 * Factory function tạo nhanh AccountAggregator
 */
export function buildAccountAggregator(transactions: NormalizedTransaction[]): AccountAggregator {
  return new AccountAggregator(transactions);
}
