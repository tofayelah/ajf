import { AppDatabaseState } from '../services/db';

function getActiveYearPrefix(db: AppDatabaseState): string {
  if (!db.financialYears || db.financialYears.length === 0) {
    return new Date().getFullYear().toString();
  }
  const activeYear = db.financialYears.find(fy => fy.status === 'ACTIVE');
  if (activeYear) {
    return activeYear.yearCode.split('-')[0] || activeYear.yearCode;
  }
  return new Date().getFullYear().toString();
}

export const generateReceiptNumber = (db: AppDatabaseState, reservedNumbers?: (string | undefined)[] | Set<string>): string => {
  const prefix = db.settings.receiptPrefix || 'REC';
  const yearStr = getActiveYearPrefix(db);
  const basePrefix = `${prefix}-${yearStr}-`;

  const existingNumbers = new Set<string>();
  
  db.collections?.forEach(c => { if (c.receiptNo) existingNumbers.add(c.receiptNo); });
  db.incomes?.forEach(i => { if (i.voucherNo) existingNumbers.add(i.voucherNo); });
  db.capitalDeposits?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
  db.loanRepayments?.forEach(r => { if (r.voucherNo) existingNumbers.add(r.voucherNo); });
  db.cashTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
  db.bankTransactions?.forEach(b => { if (b.transactionNo) existingNumbers.add(b.transactionNo); });

  if (reservedNumbers) {
    reservedNumbers.forEach(num => { if (num) existingNumbers.add(num); });
  }

  let nextSequence = 1;
  const regex = new RegExp(`^${basePrefix}(\\d{4,6})$`);
  
  existingNumbers.forEach(num => {
    const match = num?.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq >= nextSequence) {
        nextSequence = seq + 1;
      }
    }
  });

  let generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  
  while (existingNumbers.has(generated)) {
    nextSequence++;
    generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  }
  
  return generated;
};

export const generateVoucherNumber = (db: AppDatabaseState, reservedNumbers?: (string | undefined)[] | Set<string>): string => {
  const prefix = db.settings.voucherPrefix || 'VCH';
  const yearStr = getActiveYearPrefix(db);
  const basePrefix = `${prefix}-${yearStr}-`;

  const existingNumbers = new Set<string>();
  
  db.expenses?.forEach(e => { if (e.voucherNo) existingNumbers.add(e.voucherNo); });
  db.incomes?.forEach(i => { if (i.voucherNo) existingNumbers.add(i.voucherNo); });
  db.capitalDeposits?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
  db.contraTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });
  db.loanRepayments?.forEach(r => { if (r.voucherNo) existingNumbers.add(r.voucherNo); });
  db.welfareTransactions?.forEach(w => { if (w.voucherNo) existingNumbers.add(w.voucherNo); });
  db.journalEntries?.forEach(j => {
    if (j.journalNo) existingNumbers.add(j.journalNo);
    if (j.reference) existingNumbers.add(j.reference);
  });
  db.cashTransactions?.forEach(c => { if (c.voucherNo) existingNumbers.add(c.voucherNo); });

  if (reservedNumbers) {
    reservedNumbers.forEach(num => { if (num) existingNumbers.add(num); });
  }
  
  let nextSequence = 1;
  const regex = new RegExp(`^${basePrefix}(\\d{4,6})$`);
  
  existingNumbers.forEach(num => {
    const match = num?.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq >= nextSequence) {
        nextSequence = seq + 1;
      }
    }
  });

  let generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  
  while (existingNumbers.has(generated)) {
    nextSequence++;
    generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  }
  
  return generated;
};

export const generateMemberId = (db: AppDatabaseState): string => {
  const prefix = db.settings.memberIdPrefix || 'AJM';
  const basePrefix = `${prefix}-`;

  const existingNumbers = new Set<string>();
  db.members?.forEach(m => { if (m.memberId) existingNumbers.add(m.memberId); });
  
  let nextSequence = 1;
  const regex = new RegExp(`^${basePrefix}(\\d{4,6})$`);
  
  existingNumbers.forEach(num => {
    const match = num?.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq >= nextSequence) {
        nextSequence = seq + 1;
      }
    }
  });

  let generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  
  while (existingNumbers.has(generated)) {
    nextSequence++;
    generated = `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
  }
  
  return generated;
};

export const generateLoanId = (db: AppDatabaseState): string => {
  const prefix = 'LN';
  const yearStr = getActiveYearPrefix(db);
  const basePrefix = `${prefix}-${yearStr}-`;
  
  const existingNumbers = new Set<string>();
  db.loans?.forEach(l => { if (l.loanId) existingNumbers.add(l.loanId); });
  
  let nextSequence = 1;
  const regex = new RegExp(`^${basePrefix}(\\d{4,6})$`);
  existingNumbers.forEach(num => {
    const match = num?.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq >= nextSequence) nextSequence = seq + 1;
    }
  });
  
  return `${basePrefix}${nextSequence.toString().padStart(6, '0')}`;
};
