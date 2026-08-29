import { AppDatabaseState } from "../services/db";
import { JournalEntry, JournalEntryLine, CashTransaction } from "../types";
import { resolveCanonicalAccount, CANONICAL_COA } from "./accountMapping";

export interface UnbalancedJournalDetail {
  journalEntryId: string;
  journalNo: string;
  sourceType: string;
  sourceId: string;
  module: string;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  linesCount: number;
}

export interface ModuleIntegritySummary {
  totalChecked: number;
  unbalancedIds: string[];
  details: UnbalancedJournalDetail[];
}

export interface JournalIntegrityValidationResult {
  isValid: boolean;
  totalEntriesChecked: number;
  unbalancedCount: number;
  unbalancedIds: string[];
  unbalancedDetails: UnbalancedJournalDetail[];
  modules: {
    collections: ModuleIntegritySummary;
    capital: ModuleIntegritySummary;
    loans: ModuleIntegritySummary;
    investments: ModuleIntegritySummary;
    income: ModuleIntegritySummary;
    expenses: ModuleIntegritySummary;
    welfare: ModuleIntegritySummary;
    reserve: ModuleIntegritySummary;
    profit: ModuleIntegritySummary;
    other: ModuleIntegritySummary;
  };
}

/**
 * Internal utility function that iterates through all financial modules
 * (Collections, Capital, Loans, Investments, Income, Expenses, Welfare, Reserve, Profit)
 * and verifies that every associated Journal entry has matching total Debits and Credits,
 * returning an object listing any unbalanced IDs found.
 */
export function validateJournalIntegrity(db: AppDatabaseState): JournalIntegrityValidationResult {
  const journalEntries: JournalEntry[] = db.journalEntries || [];
  const journalLines: JournalEntryLine[] = db.journalLines || [];

  // Group lines by journalEntryId for fast lookups
  const linesByEntryId = new Map<string, JournalEntryLine[]>();
  for (const line of journalLines) {
    if (!line || !line.journalEntryId) continue;
    const existing = linesByEntryId.get(line.journalEntryId) || [];
    existing.push(line);
    linesByEntryId.set(line.journalEntryId, existing);
  }

  const unbalancedIdsSet = new Set<string>();
  const allUnbalancedDetails: UnbalancedJournalDetail[] = [];
  const checkedJournalIds = new Set<string>();

  const initSummary = (): ModuleIntegritySummary => ({
    totalChecked: 0,
    unbalancedIds: [],
    details: [],
  });

  const modules = {
    collections: initSummary(),
    capital: initSummary(),
    loans: initSummary(),
    investments: initSummary(),
    income: initSummary(),
    expenses: initSummary(),
    welfare: initSummary(),
    reserve: initSummary(),
    profit: initSummary(),
    other: initSummary(),
  };

  const checkEntry = (entry: JournalEntry, targetModule: keyof typeof modules): boolean => {
    checkedJournalIds.add(entry.id);
    modules[targetModule].totalChecked++;

    const lines = linesByEntryId.get(entry.id) || [];
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);

    // Tolerance for float calculations
    const isUnbalanced = difference > 0.005;

    if (isUnbalanced) {
      const detail: UnbalancedJournalDetail = {
        journalEntryId: entry.id,
        journalNo: entry.journalNo || entry.id,
        sourceType: entry.sourceType || "UNKNOWN",
        sourceId: entry.sourceId || entry.id,
        module: targetModule,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        linesCount: lines.length,
      };

      unbalancedIdsSet.add(entry.id);
      if (entry.sourceId) {
        unbalancedIdsSet.add(entry.sourceId);
      }
      allUnbalancedDetails.push(detail);
      modules[targetModule].unbalancedIds.push(entry.id);
      modules[targetModule].details.push(detail);
      return false;
    }

    return true;
  };

  // 1. Collections Module
  const collections = db.collections || [];
  for (const c of collections) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "COLLECTION" && (j.sourceId === c.collectionId || j.reference === c.receiptNo)) ||
        j.journalNo === `JNL-${c.receiptNo}`
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "collections");
      }
    }
  }

  // 2. Capital Module
  const capitalDeposits = db.capitalDeposits || [];
  for (const cd of capitalDeposits) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "CAPITAL" && (j.sourceId === cd.depositId || j.reference === cd.voucherNo)) ||
        j.journalNo === `JNL-${cd.voucherNo}` ||
        j.journalNo === `JE-CAP-${cd.voucherNo}`
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "capital");
      }
    }
  }

  // 3. Loans Module (Disbursements + Repayments)
  const loans = db.loans || [];
  for (const ln of loans) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "LOAN" || j.sourceType === "LOAN_DISBURSEMENT") &&
        (j.sourceId === ln.loanId || j.reference === ln.loanId || j.reference === ln.disbursementVoucherNo)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "loans");
      }
    }
  }

  const loanRepayments = db.loanRepayments || [];
  for (const lr of loanRepayments) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        j.sourceType === "LOAN_REPAYMENT" &&
        (j.sourceId === lr.repaymentId || j.reference === lr.voucherNo)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "loans");
      }
    }
  }

  // 4. Investments Module
  const investments = db.investments || [];
  for (const inv of investments) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "INVESTMENT" || j.sourceType === "INVESTMENT_PROFIT") &&
        (j.sourceId === inv.investmentId || j.reference === inv.investmentId)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "investments");
      }
    }
  }

  // 5. Income Module
  const incomes = db.incomes || [];
  for (const inc of incomes) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        j.sourceType === "INCOME" &&
        (j.sourceId === inc.incomeId || j.reference === inc.voucherNo || j.reference === inc.reference)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "income");
      }
    }
  }

  // 6. Expenses Module
  const expenses = db.expenses || [];
  for (const exp of expenses) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        j.sourceType === "EXPENSE" &&
        (j.sourceId === exp.expenseId || j.reference === exp.voucherNo || j.reference === exp.billNumber)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "expenses");
      }
    }
  }

  // 7. Welfare & Emergency Module
  const welfareTx = db.welfareTransactions || [];
  for (const w of welfareTx) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "WELFARE" ||
          j.sourceType === "WELFARE_INCOME" ||
          j.sourceType === "WELFARE_GRANT" ||
          j.sourceType === "EMERGENCY_GRANT") &&
        (j.sourceId === w.fundId || j.reference === w.voucherNo)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "welfare");
      }
    }
  }

  // 8. Reserve Module
  const reserveUtilizations = db.reserveUtilizations || [];
  for (const ru of reserveUtilizations) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "RESERVE_UTILIZATION" || j.sourceType === "RESERVE") &&
        (j.sourceId === ru.utilizationId || j.reference === ru.voucherNo)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "reserve");
      }
    }
  }

  // 9. Profit Module
  const historicalProfits = db.historicalProfits || [];
  for (const hp of historicalProfits) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "PROFIT" ||
          j.sourceType === "PROFIT_DISTRIBUTION" ||
          j.sourceType === "PROFIT_ALLOCATION") &&
        (j.sourceId === hp.id || j.reference === hp.financialYear)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "profit");
      }
    }
  }

  const profitAllocations = db.profitAllocations || [];
  for (const pa of profitAllocations) {
    const relatedEntries = journalEntries.filter(
      (j) =>
        (j.sourceType === "PROFIT" ||
          j.sourceType === "PROFIT_DISTRIBUTION" ||
          j.sourceType === "PROFIT_ALLOCATION") &&
        (j.sourceId === pa.yearId || j.reference === pa.financialYear)
    );
    for (const entry of relatedEntries) {
      if (!checkedJournalIds.has(entry.id)) {
        checkEntry(entry, "profit");
      }
    }
  }

  // 10. Check all remaining Journal Entries (general/manual/other entries)
  for (const entry of journalEntries) {
    if (!checkedJournalIds.has(entry.id)) {
      // Map sourceType to appropriate module if recognizable
      const sType = (entry.sourceType || "").toUpperCase();
      let mod: keyof typeof modules = "other";
      if (sType.includes("COLLECT")) mod = "collections";
      else if (sType.includes("CAPITAL")) mod = "capital";
      else if (sType.includes("LOAN")) mod = "loans";
      else if (sType.includes("INVEST")) mod = "investments";
      else if (sType.includes("INC")) mod = "income";
      else if (sType.includes("EXP")) mod = "expenses";
      else if (sType.includes("WELF") || sType.includes("EMERG")) mod = "welfare";
      else if (sType.includes("RESERV")) mod = "reserve";
      else if (sType.includes("PROFIT")) mod = "profit";

      checkEntry(entry, mod);
    }
  }

  const totalEntriesChecked = checkedJournalIds.size;
  const unbalancedCount = allUnbalancedDetails.length;
  const isValid = unbalancedCount === 0;

  return {
    isValid,
    totalEntriesChecked,
    unbalancedCount,
    unbalancedIds: Array.from(unbalancedIdsSet),
    unbalancedDetails: allUnbalancedDetails,
    modules,
  };
}

export interface VoucherRangeFilter {
  startVoucherNo?: string;     // e.g., 'VCH-2026-000001' or '1' or 'JNL-2026-000001'
  endVoucherNo?: string;       // e.g., 'VCH-2026-000010' or '10' or 'JNL-2026-000010'
  voucherNos?: string[];       // Specific list of voucher numbers
  startDate?: string;          // Format: 'YYYY-MM-DD'
  endDate?: string;            // Format: 'YYYY-MM-DD'
  voucherPrefix?: string;      // e.g., 'VCH-', 'JNL-', 'REC-'
  sourceType?: string;         // 'COLLECTION' | 'CAPITAL' | 'EXPENSE' | 'INCOME' etc.
  tolerance?: number;          // Float tolerance, default 0.005
}

export interface VoucherLineDetail {
  id: string;
  accountId: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface VoucherBalanceDiscrepancy {
  journalEntryId: string;
  journalNo: string;
  voucherNo?: string;
  reference?: string;
  date: string;
  sourceType: string;
  sourceId?: string;
  description?: string;
  totalDebit: number;
  totalCredit: number;
  imbalance: number;           // totalDebit - totalCredit (non-zero indicating ledger error)
  absoluteDifference: number;  // Math.abs(totalDebit - totalCredit)
  lineCount: number;
  issueType: 'UNBALANCED' | 'NO_LINES' | 'SINGLE_SIDED' | 'INVALID_VALUES';
  issueDescription: string;
  lines: VoucherLineDetail[];
  suggestedAction: string;
}

export interface VoucherBalanceSummary {
  journalEntryId: string;
  journalNo: string;
  voucherNo?: string;
  reference?: string;
  date: string;
  sourceType: string;
  totalDebit: number;
  totalCredit: number;
  imbalance: number;
  lineCount: number;
  isBalanced: boolean;
}

export interface VoucherRangeValidationResult {
  isBalanced: boolean;             // True if all vouchers in range balance to zero
  hasIntegrityIssues: boolean;     // True if any discrepancies/non-zero imbalances found
  rangeApplied: VoucherRangeFilter;
  totalVouchersTraversed: number;
  totalLinesTraversed: number;
  totalDebitSum: number;
  totalCreditSum: number;
  netLedgerImbalance: number;      // totalDebitSum - totalCreditSum across the whole range
  discrepanciesCount: number;
  discrepancies: VoucherBalanceDiscrepancy[];
  balancedVouchers: VoucherBalanceSummary[];
  summaryMessage: string;
}

/**
 * Extracts a numeric sequence value and string prefix from a voucher string.
 * Supports patterns like "VCH-2026-000005", "JNL-0012", "REC-12", "5".
 */
function parseVoucherSerial(voucherStr?: string): { prefix: string; num: number | null } {
  if (!voucherStr) return { prefix: '', num: null };
  const trimmed = voucherStr.trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      num: parseInt(match[2], 10)
    };
  }
  return { prefix: trimmed.toUpperCase(), num: null };
}

/**
 * Determines whether a voucher identifier falls within the specified start and end range.
 */
function isVoucherInRange(
  voucherId: string,
  startVoucher?: string,
  endVoucher?: string
): boolean {
  if (!startVoucher && !endVoucher) return true;
  if (!voucherId) return false;

  const target = voucherId.trim();
  const targetParsed = parseVoucherSerial(target);

  if (startVoucher && endVoucher) {
    const startParsed = parseVoucherSerial(startVoucher);
    const endParsed = parseVoucherSerial(endVoucher);

    // If all have numeric serials and compatible prefixes
    if (targetParsed.num !== null && startParsed.num !== null && endParsed.num !== null) {
      const minNum = Math.min(startParsed.num, endParsed.num);
      const maxNum = Math.max(startParsed.num, endParsed.num);
      return targetParsed.num >= minNum && targetParsed.num <= maxNum;
    }

    // Lexicographical fallback
    const minStr = startVoucher < endVoucher ? startVoucher : endVoucher;
    const maxStr = startVoucher < endVoucher ? endVoucher : startVoucher;
    return target >= minStr && target <= maxStr;
  }

  if (startVoucher) {
    const startParsed = parseVoucherSerial(startVoucher);
    if (targetParsed.num !== null && startParsed.num !== null) {
      return targetParsed.num >= startParsed.num;
    }
    return target >= startVoucher;
  }

  if (endVoucher) {
    const endParsed = parseVoucherSerial(endVoucher);
    if (targetParsed.num !== null && endParsed.num !== null) {
      return targetParsed.num <= endParsed.num;
    }
    return target <= endVoucher;
  }

  return true;
}

/**
 * Traverses the journal entry lines for a specific voucher range and verifies if
 * the debits and credits balance to zero, reporting any non-zero results that
 * indicate a ledger integrity issue.
 * 
 * Supports calling with `AppDatabaseState` or explicit `JournalEntry[]` & `JournalEntryLine[]` arrays.
 */
export function verifyVoucherRangeBalance(
  dbOrEntries: AppDatabaseState | JournalEntry[],
  linesOrFilter?: JournalEntryLine[] | VoucherRangeFilter,
  explicitFilter?: VoucherRangeFilter
): VoucherRangeValidationResult {
  let journalEntries: JournalEntry[] = [];
  let journalLines: JournalEntryLine[] = [];
  let filter: VoucherRangeFilter = {};

  if (Array.isArray(dbOrEntries)) {
    journalEntries = dbOrEntries;
    journalLines = Array.isArray(linesOrFilter) ? linesOrFilter : [];
    filter = explicitFilter || (!Array.isArray(linesOrFilter) && linesOrFilter ? linesOrFilter : {});
  } else {
    journalEntries = dbOrEntries.journalEntries || [];
    journalLines = dbOrEntries.journalLines || [];
    filter = (linesOrFilter as VoucherRangeFilter) || {};
  }

  const tolerance = typeof filter.tolerance === 'number' ? filter.tolerance : 0.005;

  // Index lines by journalEntryId, entryId, and voucher references for fast lookups
  const linesMap = new Map<string, JournalEntryLine[]>();
  for (const line of journalLines) {
    if (!line) continue;
    const candidateKeys = [
      line.journalEntryId,
      (line as any).entryId,
      (line as any).journalId,
      (line as any).voucherNo,
    ].filter(Boolean) as string[];

    for (const key of candidateKeys) {
      const list = linesMap.get(key) || [];
      if (!list.includes(line)) {
        list.push(line);
      }
      linesMap.set(key, list);
    }
  }

  // Filter journal entries by range criteria
  const matchedEntries = journalEntries.filter((entry) => {
    if (!entry) return false;
    if (!filter.voucherNos?.length && ((entry.status as string) === 'CANCELLED' || entry.status === 'REVERSED')) {
      return false;
    }

    const jNo = entry.journalNo || '';
    const ref = entry.reference || '';
    const vNo = (entry as any).voucherNo || '';
    const id = entry.id || '';

    // 1. Explicit voucher list filter
    if (filter.voucherNos && filter.voucherNos.length > 0) {
      const matchesAny = filter.voucherNos.some(
        (target) => target === jNo || target === ref || target === vNo || target === id
      );
      if (!matchesAny) return false;
    }

    // 2. Voucher Prefix filter
    if (filter.voucherPrefix) {
      const p = filter.voucherPrefix.toUpperCase();
      const matchesPrefix =
        jNo.toUpperCase().startsWith(p) ||
        ref.toUpperCase().startsWith(p) ||
        vNo.toUpperCase().startsWith(p) ||
        id.toUpperCase().startsWith(p);
      if (!matchesPrefix) return false;
    }

    // 3. Source Type filter
    if (filter.sourceType && filter.sourceType !== 'ALL') {
      const st = (entry.sourceType || '').toUpperCase();
      if (st !== filter.sourceType.toUpperCase()) return false;
    }

    // 4. Date Range filter
    if (filter.startDate && entry.date && entry.date < filter.startDate) {
      return false;
    }
    if (filter.endDate && entry.date && entry.date > filter.endDate) {
      return false;
    }

    // 5. Start / End Voucher Range filter
    if (filter.startVoucherNo || filter.endVoucherNo) {
      const candidates = [jNo, ref, vNo, id].filter(Boolean);
      const isAnyInRange = candidates.some((cand) =>
        isVoucherInRange(cand, filter.startVoucherNo, filter.endVoucherNo)
      );
      if (!isAnyInRange) return false;
    }

    return true;
  });

  // Sort matched entries by date and voucher/journalNo
  matchedEntries.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.journalNo || a.id || '').localeCompare(b.journalNo || b.id || '');
  });

  const discrepancies: VoucherBalanceDiscrepancy[] = [];
  const balancedVouchers: VoucherBalanceSummary[] = [];

  let totalDebitSum = 0;
  let totalCreditSum = 0;
  let totalLinesTraversed = 0;

  for (const entry of matchedEntries) {
    const entryId = entry.id || '';
    const jNo = entry.journalNo || entryId;
    const ref = entry.reference;
    const vNo = (entry as any).voucherNo || ref || jNo;

    // Retrieve associated lines using all possible keys
    const lines = linesMap.get(entryId) || linesMap.get(jNo) || (ref ? linesMap.get(ref) : []) || [];
    totalLinesTraversed += lines.length;

    const lineDetails: VoucherLineDetail[] = lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountName: l.accountName,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description,
    }));

    let entryDebit = 0;
    let entryCredit = 0;
    let hasInvalidValues = false;

    for (const line of lineDetails) {
      if (isNaN(line.debit) || isNaN(line.credit) || line.debit < 0 || line.credit < 0) {
        hasInvalidValues = true;
      }
      entryDebit += line.debit;
      entryCredit += line.credit;
    }

    totalDebitSum += entryDebit;
    totalCreditSum += entryCredit;

    const rawImbalance = entryDebit - entryCredit;
    const absDifference = Math.abs(rawImbalance);
    const isBalanced = absDifference <= tolerance && !hasInvalidValues && lines.length > 0;

    const summary: VoucherBalanceSummary = {
      journalEntryId: entryId,
      journalNo: jNo,
      voucherNo: vNo,
      reference: ref,
      date: entry.date,
      sourceType: entry.sourceType || 'UNKNOWN',
      totalDebit: Math.round(entryDebit * 100) / 100,
      totalCredit: Math.round(entryCredit * 100) / 100,
      imbalance: Math.round(rawImbalance * 100) / 100,
      lineCount: lines.length,
      isBalanced,
    };

    if (isBalanced) {
      balancedVouchers.push(summary);
    } else {
      let issueType: VoucherBalanceDiscrepancy['issueType'] = 'UNBALANCED';
      let issueDescription = `Voucher debits (৳${entryDebit.toLocaleString()}) and credits (৳${entryCredit.toLocaleString()}) do not balance. Imbalance: ৳${absDifference.toLocaleString()}.`;
      let suggestedAction = 'Review voucher lines and add or adjust debit/credit line to restore double-entry balance.';

      if (lines.length === 0) {
        issueType = 'NO_LINES';
        issueDescription = 'Voucher header has no associated journal entry lines in the ledger.';
        suggestedAction = 'Re-post transaction lines from the source record or delete empty journal voucher.';
      } else if (hasInvalidValues) {
        issueType = 'INVALID_VALUES';
        issueDescription = 'Voucher contains negative or non-numeric debit/credit values.';
        suggestedAction = 'Correct negative or invalid line numbers into valid positive debit/credit amounts.';
      } else if (entryDebit > 0 && entryCredit === 0) {
        issueType = 'SINGLE_SIDED';
        issueDescription = `Single-sided debit entry without corresponding credit lines (Total Debit: ৳${entryDebit.toLocaleString()}).`;
        suggestedAction = 'Add corresponding credit account line to complete the double-entry equation.';
      } else if (entryCredit > 0 && entryDebit === 0) {
        issueType = 'SINGLE_SIDED';
        issueDescription = `Single-sided credit entry without corresponding debit lines (Total Credit: ৳${entryCredit.toLocaleString()}).`;
        suggestedAction = 'Add corresponding debit account line to complete the double-entry equation.';
      }

      discrepancies.push({
        journalEntryId: entryId,
        journalNo: jNo,
        voucherNo: vNo,
        reference: ref,
        date: entry.date,
        sourceType: entry.sourceType || 'UNKNOWN',
        sourceId: entry.sourceId,
        description: entry.description,
        totalDebit: Math.round(entryDebit * 100) / 100,
        totalCredit: Math.round(entryCredit * 100) / 100,
        imbalance: Math.round(rawImbalance * 100) / 100,
        absoluteDifference: Math.round(absDifference * 100) / 100,
        lineCount: lines.length,
        issueType,
        issueDescription,
        lines: lineDetails,
        suggestedAction,
      });
    }
  }

  const netLedgerImbalance = Math.round((totalDebitSum - totalCreditSum) * 100) / 100;
  const discrepanciesCount = discrepancies.length;
  const hasIntegrityIssues = discrepanciesCount > 0 || Math.abs(netLedgerImbalance) > tolerance;
  const isBalanced = !hasIntegrityIssues;

  let summaryMessage = `Traversed ${matchedEntries.length} vouchers (${totalLinesTraversed} lines). All vouchers balance to zero (Net Imbalance: ৳0.00). Ledger integrity verified.`;
  if (hasIntegrityIssues) {
    summaryMessage = `LEDGER INTEGRITY WARNING: Found ${discrepanciesCount} voucher discrepancies across ${matchedEntries.length} traversed vouchers. Net Ledger Imbalance: ৳${netLedgerImbalance.toLocaleString()}.`;
  }

  return {
    isBalanced,
    hasIntegrityIssues,
    rangeApplied: filter,
    totalVouchersTraversed: matchedEntries.length,
    totalLinesTraversed,
    totalDebitSum: Math.round(totalDebitSum * 100) / 100,
    totalCreditSum: Math.round(totalCreditSum * 100) / 100,
    netLedgerImbalance,
    discrepanciesCount,
    discrepancies,
    balancedVouchers,
    summaryMessage,
  };
}

export interface CashReconciliationItem {
  module: 'ADMISSION' | 'CAPITAL' | 'COLLECTION' | 'LOAN' | 'EXPENSE' | 'INCOME' | 'CONTRA' | 'OTHER';
  label: string;
  subledgerAmount: number;       // Sum of individual sub-ledger transactions
  cashBookAmount: number;        // Sum of Cash Book entries
  variance: number;              // subledgerAmount - cashBookAmount
  isMatched: boolean;
  subledgerTransactionCount: number;
  cashBookTransactionCount: number;
  unreconciledTransactions: {
    id: string;
    date: string;
    voucherNo?: string;
    receiptNo?: string;
    reference?: string;
    description?: string;
    amount: number;
    type: 'MISSING_IN_CASHBOOK' | 'MISSING_IN_SUBLEDGER' | 'AMOUNT_MISMATCH';
    details: string;
  }[];
}

export interface CashMovementReconciliationResult {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalCashBookIn: number;
  totalCashBookOut: number;
  netCashBookMovement: number;
  totalSubledgerIn: number;
  totalSubledgerOut: number;
  netSubledgerMovement: number;
  totalVariance: number;
  isReconciled: boolean;
  modules: {
    admission: CashReconciliationItem;
    capital: CashReconciliationItem;
    collection: CashReconciliationItem;
    loans: CashReconciliationItem;
    expenses: CashReconciliationItem;
    income: CashReconciliationItem;
    other: CashReconciliationItem;
  };
  allUnreconciledItems: {
    id: string;
    module: string;
    date: string;
    voucherNo?: string;
    amount: number;
    issue: string;
    suggestedFix: string;
  }[];
  summaryMessage: string;
}

export interface ComprehensiveIntegrityReport {
  generatedAt: string;
  reportId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  auditedBy?: string;
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
  healthScore: number; // 0 - 100
  totalVouchersAudited: number;
  unbalancedVouchersCount: number;
  doubleEntryAudit: VoucherRangeValidationResult;
  cashMovementAudit: CashMovementReconciliationResult;
  totalViolationsCount: number;
  violationsList: {
    violationId: string;
    category: 'DOUBLE_ENTRY_IMBALANCE' | 'CASH_SUBLEDGER_MISMATCH' | 'ORPHANED_TRANSACTION' | 'INVALID_DATA';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    voucherId?: string;
    transactionId?: string;
    module: string;
    date: string;
    description: string;
    impactAmount: number;
    remediation: string;
  }[];
  recommendations: string[];
}

/**
 * Normalizes payment method string to check if cash
 */
function isCashPayment(method?: string): boolean {
  if (!method) return false;
  const m = method.trim().toUpperCase();
  return m === 'CASH' || m === 'নগদ' || m.includes('CASH');
}

/**
 * Canonical helper to retrieve and filter Cash Book transactions for a given source.
 * Prioritizes structured identifiers (sourceType, sourceId, memberId, voucherNo, reference, accountId).
 */
export function getCashBookTransactionsForSource(
  db: AppDatabaseState,
  options: {
    sourceType?: string;
    sourceId?: string;
    memberId?: string;
    voucherNo?: string;
    accountId?: string;
    dateRange?: { startDate?: string; endDate?: string };
    includeDrafts?: boolean;
  }
): CashTransaction[] {
  const startDate = options.dateRange?.startDate || '1970-01-01';
  const endDate = options.dateRange?.endDate || '2099-12-31';

  return (db.cashTransactions || []).filter((c) => {
    // Status filter: ignore cancelled or reversed
    if (c.status === 'CANCELLED' || c.status === 'REVERSED') return false;
    if (!options.includeDrafts && c.status === 'DRAFT') return false;

    // Date range filter
    if (c.date) {
      const d = c.date.split('T')[0];
      if (d < startDate || d > endDate) return false;
    }

    // Match by sourceId
    if (options.sourceId && (c.sourceId === options.sourceId || (c as any).sourceId === options.sourceId)) {
      return true;
    }

    // Match by voucherNo / reference
    if (options.voucherNo && (c.voucherNo === options.voucherNo || c.reference === options.voucherNo)) {
      return true;
    }

    // Match by memberId + sourceType
    if (options.memberId && (c.memberId === options.memberId || (c as any).memberId === options.memberId)) {
      if (options.sourceType && (c.sourceType?.toUpperCase() === options.sourceType.toUpperCase())) {
        return true;
      }
    }

    // Match by sourceType + accountId
    if (options.sourceType && c.sourceType?.toUpperCase() === options.sourceType.toUpperCase()) {
      if (!options.accountId || c.accountId === options.accountId || c.accountCode === options.accountId) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Canonical Cash Book vs Sub-Ledger Reconciliation Engine.
 * Reconciles across all financial modules using structured keys.
 */
export function reconcileCashBookWithSubLedger(
  db: AppDatabaseState,
  dateRange?: { startDate?: string; endDate?: string; tolerance?: number }
): CashMovementReconciliationResult {
  return validateCashMovementsReconciliation(db, dateRange);
}

/**
 * Validates that total cash movements recorded in the Cash Book match the sum
 * of individual transactions (Admission, Capital, Collection, Loans, Expenses, Incomes)
 * for a user-specified date range.
 */
export function validateCashMovementsReconciliation(
  db: AppDatabaseState,
  dateRange?: { startDate?: string; endDate?: string; tolerance?: number }
): CashMovementReconciliationResult {
  const startDate = dateRange?.startDate || '1970-01-01';
  const endDate = dateRange?.endDate || '2099-12-31';
  const tolerance = typeof dateRange?.tolerance === 'number' ? dateRange.tolerance : 0.01;

  const isDateInRange = (d?: string) => {
    if (!d) return true;
    const dateStr = d.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  };

  // 1. Fetch Cash Book transactions in range
  const cashTxns = (db.cashTransactions || []).filter(
    (c) => isDateInRange(c.date) && c.status !== 'REVERSED' && c.status !== 'CANCELLED'
  );

  // Group Cash Book entries by module/sourceType using structured identification
  const cashBookByModule = {
    ADMISSION: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    CAPITAL: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    COLLECTION: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    LOAN: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    EXPENSE: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    INCOME: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
    OTHER: { in: 0, out: 0, count: 0, txns: [] as typeof cashTxns },
  };

  let totalCashBookIn = 0;
  let totalCashBookOut = 0;

  for (const c of cashTxns) {
    const cIn = Number(c.cashIn) || 0;
    const cOut = Number(c.cashOut) || 0;
    totalCashBookIn += cIn;
    totalCashBookOut += cOut;

    const sType = (c.sourceType || '').toUpperCase();
    const desc = (c.description || c.reference || '').toLowerCase();
    const acctId = c.accountId || c.accountCode || '';

    // Structured matching
    if (
      sType === 'ADMISSION' ||
      acctId === '4000' ||
      acctId === '4010' ||
      (sType === 'INCOME' && (desc.includes('admission') || desc.includes('ভর্তি')))
    ) {
      cashBookByModule.ADMISSION.in += cIn;
      cashBookByModule.ADMISSION.out += cOut;
      cashBookByModule.ADMISSION.count++;
      cashBookByModule.ADMISSION.txns.push(c);
    } else if (sType === 'CAPITAL' || acctId === '3000' || desc.includes('মূলধন')) {
      cashBookByModule.CAPITAL.in += cIn;
      cashBookByModule.CAPITAL.out += cOut;
      cashBookByModule.CAPITAL.count++;
      cashBookByModule.CAPITAL.txns.push(c);
    } else if (sType === 'COLLECTION' || acctId === '4020' || acctId === '4000' || acctId === '4300' || desc.includes('চাঁদা') || desc.includes('বিলম্ব ফি')) {
      cashBookByModule.COLLECTION.in += cIn;
      cashBookByModule.COLLECTION.out += cOut;
      cashBookByModule.COLLECTION.count++;
      cashBookByModule.COLLECTION.txns.push(c);
    } else if (
      sType.includes('LOAN') ||
      acctId === '1100' ||
      desc.includes('ঋণ')
    ) {
      cashBookByModule.LOAN.in += cIn;
      cashBookByModule.LOAN.out += cOut;
      cashBookByModule.LOAN.count++;
      cashBookByModule.LOAN.txns.push(c);
    } else if (sType === 'EXPENSE' || cOut > 0 || acctId.startsWith('5')) {
      cashBookByModule.EXPENSE.in += cIn;
      cashBookByModule.EXPENSE.out += cOut;
      cashBookByModule.EXPENSE.count++;
      cashBookByModule.EXPENSE.txns.push(c);
    } else if (sType === 'INCOME' || acctId.startsWith('4')) {
      cashBookByModule.INCOME.in += cIn;
      cashBookByModule.INCOME.out += cOut;
      cashBookByModule.INCOME.count++;
      cashBookByModule.INCOME.txns.push(c);
    } else {
      cashBookByModule.OTHER.in += cIn;
      cashBookByModule.OTHER.out += cOut;
      cashBookByModule.OTHER.count++;
      cashBookByModule.OTHER.txns.push(c);
    }
  }

  // 2. Fetch Individual Sub-Ledger transactions in date range (Admission, Capital, Collection, Loans, etc.)
  
  // A. Admissions
  const admissions = (db.admissions || []).filter(
    (a) =>
      a.status === 'APPROVED' &&
      isCashPayment(a.paymentMethod) &&
      isDateInRange(a.approvalDate || a.applicationDate || a.createdAt)
  );
  let subledgerAdmissionSum = 0;
  for (const a of admissions) {
    subledgerAdmissionSum += Number(a.admissionFee) || 0;
  }

  // Also check if any standalone admission income exists
  const admissionIncomes = (db.incomes || []).filter((i: any) => {
    const desc = (i.description || i.incomeHead || '').toLowerCase();
    const isAdm = i.category === 'ADMISSION' || i.sourceType === 'ADMISSION' || desc.includes('ভর্তি') || desc.includes('admission');
    return isAdm && isCashPayment(i.paymentMethod) && isDateInRange(i.date) && i.status !== 'REVERSED' && i.status !== 'CANCELLED';
  });
  // If incomes contain admissions not in db.admissions, count them
  const admissionVouchersInDb = new Set(cashBookByModule.ADMISSION.txns.map(t => t.voucherNo || t.sourceId));

  // B. Capital Deposits
  const capitalDeposits = (db.capitalDeposits || []).filter(
    (c) =>
      c.status !== 'REVERSED' &&
      c.status !== 'CANCELLED' &&
      isCashPayment(c.paymentMethod) &&
      isDateInRange(c.date || c.createdAt)
  );
  let subledgerCapitalSum = 0;
  for (const c of capitalDeposits) {
    subledgerCapitalSum += Number(c.amount) || 0;
  }

  // C. Collections (Monthly Subscriptions)
  const collections = (db.collections || []).filter(
    (c) =>
      c.status !== 'REVERSED' &&
      c.status !== 'CANCELLED' &&
      isCashPayment(c.paymentMethod) &&
      isDateInRange(c.collectionDate || c.createdAt)
  );
  let subledgerCollectionSum = 0;
  for (const c of collections) {
    subledgerCollectionSum += Number(c.paidAmount) || 0;
  }

  // D. Loans (Disbursements & Repayments)
  const loanDisbursements = (db.loans || []).filter(
    (l) =>
      l.status === 'ACTIVE' || l.status === 'COMPLETED'
  ).filter((l) => isCashPayment(l.paymentMethod) && isDateInRange(l.disbursementDate || l.approvalDate));
  
  const loanRepayments = (db.loanRepayments || []).filter(
    (r) =>
      r.status !== 'REVERSED' &&
      r.status !== 'CANCELLED' &&
      isCashPayment(r.paymentMethod) &&
      isDateInRange(r.date || r.createdAt)
  );
  let subledgerLoanIn = 0;
  for (const r of loanRepayments) {
    subledgerLoanIn += Number(r.totalPaid) || (Number(r.principalAmount) || 0) + (Number(r.profitOrCharge) || 0);
  }
  let subledgerLoanOut = 0;
  for (const l of loanDisbursements) {
    subledgerLoanOut += Number(l.approvedAmount ?? l.appliedAmount ?? 0);
  }

  // E. Expenses
  const expenses = (db.expenses || []).filter(
    (e: any) =>
      e.status !== 'REVERSED' &&
      e.status !== 'CANCELLED' &&
      isCashPayment(e.paymentMethod) &&
      isDateInRange(e.date || e.createdAt)
  );
  let subledgerExpenseSum = 0;
  for (const e of expenses) {
    subledgerExpenseSum += Number(e.amount) || 0;
  }

  // F. Other Incomes (excluding Admission and Collection incomes)
  const isAdmIncome = (i: any) => {
    const head = (i.incomeHead || '').toLowerCase();
    const cat = (i.category || '').toLowerCase();
    const src = (i.sourceType || '').toLowerCase();
    const desc = (i.description || i.remarks || i.reference || '').toLowerCase();
    return cat === 'admission' || src === 'admission' || head.includes('admission') || head.includes('ভর্তি') || desc.includes('ভর্তি');
  };

  const isColIncome = (i: any) => {
    const head = (i.incomeHead || '').toLowerCase();
    const cat = (i.category || '').toLowerCase();
    const src = (i.sourceType || '').toLowerCase();
    const desc = (i.description || i.remarks || i.reference || '').toLowerCase();
    return cat === 'collection' || src === 'collection' || head.includes('চাঁদা') || head.includes('collection') || desc.includes('চাঁদা') || head.includes('late') || head.includes('বিলম্ব') || desc.includes('বিলম্ব');
  };

  const otherIncomes = (db.incomes || []).filter(
    (i: any) =>
      i.status !== 'REVERSED' &&
      i.status !== 'CANCELLED' &&
      isCashPayment(i.paymentMethod) &&
      isDateInRange(i.date || i.createdAt) &&
      !isAdmIncome(i) &&
      !isColIncome(i)
  );
  let subledgerIncomeSum = 0;
  for (const i of otherIncomes) {
    subledgerIncomeSum += Number(i.amount) || 0;
  }

  // Build reconciliation modules
  const allUnreconciledItems: CashMovementReconciliationResult['allUnreconciledItems'] = [];

  const createModuleRec = (
    module: CashReconciliationItem['module'],
    label: string,
    subledgerAmount: number,
    cashBookAmount: number,
    subledgerCount: number,
    cashBookCount: number,
    unreconciled: CashReconciliationItem['unreconciledTransactions']
  ): CashReconciliationItem => {
    const variance = Math.round((subledgerAmount - cashBookAmount) * 100) / 100;
    const isMatched = Math.abs(variance) <= tolerance;

    if (!isMatched) {
      allUnreconciledItems.push({
        id: `REC-MISMATCH-${module}`,
        module,
        date: `${startDate} to ${endDate}`,
        amount: Math.abs(variance),
        issue: `${label}: Sub-ledger total (৳${subledgerAmount.toLocaleString()}) does not match Cash Book total (৳${cashBookAmount.toLocaleString()}). Variance: ৳${variance.toLocaleString()}.`,
        suggestedFix: `Review unposted or pending ${label} cash entries and record or adjust Cash Book transaction.`
      });
    }

    return {
      module,
      label,
      subledgerAmount: Math.round(subledgerAmount * 100) / 100,
      cashBookAmount: Math.round(cashBookAmount * 100) / 100,
      variance,
      isMatched,
      subledgerTransactionCount: subledgerCount,
      cashBookTransactionCount: cashBookCount,
      unreconciledTransactions: unreconciled,
    };
  };

  const admRec = createModuleRec(
    'ADMISSION',
    'Admission Fees / ভর্তি ফি',
    subledgerAdmissionSum,
    cashBookByModule.ADMISSION.in,
    admissions.length,
    cashBookByModule.ADMISSION.count,
    []
  );

  const capRec = createModuleRec(
    'CAPITAL',
    'Capital Deposits / মূলধন জমা',
    subledgerCapitalSum,
    cashBookByModule.CAPITAL.in,
    capitalDeposits.length,
    cashBookByModule.CAPITAL.count,
    []
  );

  const colRec = createModuleRec(
    'COLLECTION',
    'Monthly Collections / মাসিক চাঁদা',
    subledgerCollectionSum,
    cashBookByModule.COLLECTION.in,
    collections.length,
    cashBookByModule.COLLECTION.count,
    []
  );

  const loanRec = createModuleRec(
    'LOAN',
    'Loan In/Out / ঋণ লেনদেন',
    subledgerLoanIn - subledgerLoanOut,
    cashBookByModule.LOAN.in - cashBookByModule.LOAN.out,
    loanRepayments.length + loanDisbursements.length,
    cashBookByModule.LOAN.count,
    []
  );

  const expRec = createModuleRec(
    'EXPENSE',
    'Expenses / ব্যয়',
    subledgerExpenseSum,
    cashBookByModule.EXPENSE.out,
    expenses.length,
    cashBookByModule.EXPENSE.count,
    []
  );

  const incRec = createModuleRec(
    'INCOME',
    'Other Incomes / অন্যান্য আয়',
    subledgerIncomeSum,
    cashBookByModule.INCOME.in,
    otherIncomes.length,
    cashBookByModule.INCOME.count,
    []
  );

  const otherRec = createModuleRec(
    'OTHER',
    'Contra / Other Cash / বিপরীত ও অন্যান্য',
    0,
    cashBookByModule.OTHER.in - cashBookByModule.OTHER.out,
    0,
    cashBookByModule.OTHER.count,
    []
  );

  const totalSubledgerIn = subledgerAdmissionSum + subledgerCapitalSum + subledgerCollectionSum + subledgerLoanIn + subledgerIncomeSum;
  const totalSubledgerOut = subledgerLoanOut + subledgerExpenseSum;
  const netSubledgerMovement = Math.round((totalSubledgerIn - totalSubledgerOut) * 100) / 100;
  const netCashBookMovement = Math.round((totalCashBookIn - totalCashBookOut) * 100) / 100;
  const totalVariance = Math.round((netSubledgerMovement - netCashBookMovement) * 100) / 100;

  const isReconciled = Math.abs(totalVariance) <= tolerance && allUnreconciledItems.length === 0;

  let summaryMessage = `Cash Book fully reconciled with Sub-ledgers for date range ${startDate} to ${endDate}. Net Movement: ৳${netCashBookMovement.toLocaleString()}.`;
  if (!isReconciled) {
    summaryMessage = `CASH RECONCILIATION WARNING: Detected ৳${Math.abs(totalVariance).toLocaleString()} total net variance across ${allUnreconciledItems.length} module(s) between Sub-ledgers and Cash Book.`;
  }

  return {
    dateRange: { startDate, endDate },
    totalCashBookIn: Math.round(totalCashBookIn * 100) / 100,
    totalCashBookOut: Math.round(totalCashBookOut * 100) / 100,
    netCashBookMovement,
    totalSubledgerIn: Math.round(totalSubledgerIn * 100) / 100,
    totalSubledgerOut: Math.round(totalSubledgerOut * 100) / 100,
    netSubledgerMovement,
    totalVariance,
    isReconciled,
    modules: {
      admission: admRec,
      capital: capRec,
      collection: colRec,
      loans: loanRec,
      expenses: expRec,
      income: incRec,
      other: otherRec,
    },
    allUnreconciledItems,
    summaryMessage,
  };
}

/**
 * Runs a comprehensive administrative diagnostic audit across all financial modules:
 * 1) Verifies double-entry journal balance (sum of debits == sum of credits for every voucher ID)
 * 2) Validates Cash Book movements against individual sub-ledger transactions (Admission, Capital, Collection)
 * 3) Compiles an actionable 'Integrity Report' listing all violating voucher IDs and transactions.
 */
export function runComprehensiveDiagnosticAudit(
  db: AppDatabaseState,
  options?: {
    startDate?: string;
    endDate?: string;
    auditedBy?: string;
    voucherPrefix?: string;
    sourceType?: string;
  }
): ComprehensiveIntegrityReport {
  const startDate = options?.startDate || '1970-01-01';
  const endDate = options?.endDate || '2099-12-31';

  // 1. Run Double-Entry Journal balance audit on all vouchers in range
  const doubleEntryAudit = verifyVoucherRangeBalance(db, {
    startDate: options?.startDate,
    endDate: options?.endDate,
    voucherPrefix: options?.voucherPrefix,
    sourceType: options?.sourceType,
  });

  // 2. Run Cash Book vs Sub-ledger Reconciliation audit
  const cashMovementAudit = validateCashMovementsReconciliation(db, {
    startDate: options?.startDate,
    endDate: options?.endDate,
  });

  // 3. Aggregate all violations
  const violationsList: ComprehensiveIntegrityReport['violationsList'] = [];

  // Add Double-entry journal discrepancies
  doubleEntryAudit.discrepancies.forEach((disc, idx) => {
    violationsList.push({
      violationId: `VIO-JNL-${disc.journalEntryId || 'je'}-${disc.voucherNo || disc.journalNo || idx}-${idx}`,
      category: 'DOUBLE_ENTRY_IMBALANCE',
      severity: disc.absoluteDifference > 1000 ? 'HIGH' : 'MEDIUM',
      voucherId: disc.voucherNo || disc.journalNo,
      transactionId: disc.sourceId,
      module: disc.sourceType,
      date: disc.date,
      description: `Voucher ${disc.voucherNo || disc.journalNo}: Total Debits (৳${disc.totalDebit.toLocaleString()}) ≠ Credits (৳${disc.totalCredit.toLocaleString()}). Imbalance: ৳${disc.imbalance.toLocaleString()}. ${disc.issueDescription}`,
      impactAmount: disc.absoluteDifference,
      remediation: disc.suggestedAction,
    });
  });

  // Add Cash Reconciliation variances
  cashMovementAudit.allUnreconciledItems.forEach((item, idx) => {
    violationsList.push({
      violationId: `VIO-${item.id || 'cash'}-${item.module || 'mod'}-${idx}`,
      category: 'CASH_SUBLEDGER_MISMATCH',
      severity: item.amount > 1000 ? 'HIGH' : 'MEDIUM',
      transactionId: item.id,
      module: item.module,
      date: item.date,
      description: item.issue,
      impactAmount: item.amount,
      remediation: item.suggestedFix,
    });
  });

  const totalViolationsCount = violationsList.length;
  let overallStatus: ComprehensiveIntegrityReport['overallStatus'] = 'PASSED';
  let healthScore = 100;

  if (totalViolationsCount > 0) {
    const hasHighSeverity = violationsList.some((v) => v.severity === 'HIGH');
    overallStatus = hasHighSeverity ? 'FAILED' : 'WARNING';
    healthScore = Math.max(0, Math.round(100 - totalViolationsCount * 15));
  }

  const recommendations: string[] = [];
  if (totalViolationsCount === 0) {
    recommendations.push('Double-entry accounting ledger is perfectly balanced (Zero Imbalance).');
    recommendations.push('Cash Book receipts and payments match all individual Admission, Capital, and Collection sub-ledger transactions.');
    recommendations.push('Database integrity is healthy and ready for financial reporting and year-end closing.');
  } else {
    if (doubleEntryAudit.discrepanciesCount > 0) {
      recommendations.push(`Fix ${doubleEntryAudit.discrepanciesCount} unbalanced voucher journal entry line(s) to restore debits = credits double-entry symmetry.`);
    }
    if (!cashMovementAudit.isReconciled) {
      recommendations.push(`Reconcile cash book movements with sub-ledger records for ${cashMovementAudit.allUnreconciledItems.length} affected module(s).`);
    }
    recommendations.push('Run the diagnostic auditor again after making adjustments to confirm zero-variance status.');
  }

  const reportId = `INT-REP-${Date.now()}`;

  return {
    generatedAt: new Date().toISOString(),
    reportId,
    dateRange: { startDate, endDate },
    auditedBy: options?.auditedBy || 'System Auditor',
    overallStatus,
    healthScore,
    totalVouchersAudited: doubleEntryAudit.totalVouchersTraversed,
    unbalancedVouchersCount: doubleEntryAudit.discrepanciesCount,
    doubleEntryAudit,
    cashMovementAudit,
    totalViolationsCount,
    violationsList,
    recommendations,
  };
}

export interface AccountingIntegrityAuditReport {
  timestamp: string;
  isHealthy: boolean;
  totalJournals: number;
  balancedJournals: number;
  unbalancedJournals: number;
  orphanJournals: number;
  duplicateSourceJournals: number;
  duplicateLines: number;
  cashBookVariance: number;
  admissionVariance: number;
  capitalVariance: number;
  collectionVariance: number;
  totalLateFeeWaivers?: number;
  totalWaivedAmount?: number;
  unbalancedList: Array<{
    journalEntryId: string;
    journalNo: string;
    sourceType: string;
    sourceId?: string;
    issue: string;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    linesCount: number;
  }>;
  orphanList: Array<{
    journalEntryId: string;
    journalNo: string;
    sourceType: string;
    sourceId?: string;
  }>;
  duplicateSourceList: Array<{
    sourceType: string;
    sourceId: string;
    journalCount: number;
    journalIds: string[];
  }>;
  duplicateLinesList: Array<{
    journalEntryId: string;
    accountId: string;
    accountName: string;
    debit: number;
    credit: number;
    count: number;
  }>;
  cashReconciliationDiscrepancies: Array<{
    module: string;
    sourceModule: string;
    voucherNo?: string;
    expectedAmount: number;
    cashBookAmount: number;
    variance: number;
    issue: string;
  }>;
  summary: string;
}

/**
 * Safe, read-only diagnostic function to audit the accounting database integrity.
 * Checks double-entry symmetry, orphans, duplicate sources/lines, and cash/sub-ledger reconciliations.
 */
export function auditAccountingIntegrity(db: AppDatabaseState): AccountingIntegrityAuditReport {
  const journalEntries = db.journalEntries || [];
  const journalLines = db.journalLines || [];

  // Group lines by journalEntryId, journalNo, and reference
  const linesByEntryId = new Map<string, JournalEntryLine[]>();
  for (const line of journalLines) {
    const key = line.journalEntryId;
    if (!linesByEntryId.has(key)) {
      linesByEntryId.set(key, []);
    }
    linesByEntryId.get(key)!.push(line);
  }

  let balancedCount = 0;
  let unbalancedCount = 0;
  let orphanCount = 0;
  const unbalancedList: AccountingIntegrityAuditReport['unbalancedList'] = [];
  const orphanList: AccountingIntegrityAuditReport['orphanList'] = [];

  for (const entry of journalEntries) {
    if ((entry.status as string) === 'CANCELLED' || entry.status === 'REVERSED') {
      continue;
    }

    const entryId = entry.id || '';
    const jNo = entry.journalNo || entryId;
    const ref = entry.reference;

    const lines = linesByEntryId.get(entryId) || 
      (linesByEntryId.has(jNo) ? linesByEntryId.get(jNo) : undefined) || 
      (ref && linesByEntryId.has(ref) ? linesByEntryId.get(ref) : undefined) || 
      [];

    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);

    if (lines.length === 0) {
      orphanCount++;
      unbalancedCount++;
      orphanList.push({
        journalEntryId: entryId,
        journalNo: jNo,
        sourceType: entry.sourceType || 'UNKNOWN',
        sourceId: entry.sourceId,
      });
      unbalancedList.push({
        journalEntryId: entryId,
        journalNo: jNo,
        sourceType: entry.sourceType || 'UNKNOWN',
        sourceId: entry.sourceId,
        issue: 'CRITICAL_UNBALANCED_JOURNAL: No journal lines found (Orphan Header)',
        totalDebit: 0,
        totalCredit: 0,
        difference: 0,
        linesCount: 0,
      });
    } else if (lines.length < 2 || diff > 0.001 || totalDebit <= 0 || totalCredit <= 0) {
      unbalancedCount++;
      unbalancedList.push({
        journalEntryId: entryId,
        journalNo: jNo,
        sourceType: entry.sourceType || 'UNKNOWN',
        sourceId: entry.sourceId,
        issue: lines.length < 2 
          ? 'Single-sided journal (< 2 lines)' 
          : `Debits (৳${totalDebit.toLocaleString()}) ≠ Credits (৳${totalCredit.toLocaleString()})`,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        difference: Math.round(diff * 100) / 100,
        linesCount: lines.length,
      });
    } else {
      balancedCount++;
    }
  }

  // Duplicate active source journals
  const sourceMap = new Map<string, string[]>();
  for (const entry of journalEntries) {
    if (entry.sourceType && entry.sourceId && (entry.status as string) !== 'CANCELLED' && entry.status !== 'REVERSED') {
      const key = `${entry.sourceType}:${entry.sourceId}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, []);
      }
      sourceMap.get(key)!.push(entry.id || entry.journalNo || 'unknown');
    }
  }

  const duplicateSourceList: AccountingIntegrityAuditReport['duplicateSourceList'] = [];
  let duplicateSourceCount = 0;
  for (const [key, ids] of sourceMap.entries()) {
    if (ids.length > 1) {
      const [sourceType, sourceId] = key.split(':');
      duplicateSourceCount += (ids.length - 1);
      duplicateSourceList.push({
        sourceType,
        sourceId,
        journalCount: ids.length,
        journalIds: ids,
      });
    }
  }

  // Duplicate lines check (for active journals)
  const activeJournalIds = new Set(
    journalEntries
      .filter((e) => (e.status as string) !== 'CANCELLED' && e.status !== 'REVERSED')
      .map((e) => e.id)
  );
  const lineSignatureMap = new Map<string, { count: number; line: JournalEntryLine }>();
  for (const line of journalLines) {
    if (!activeJournalIds.has(line.journalEntryId)) {
      continue;
    }
    const sig = `${line.journalEntryId}_${line.accountId}_${Number(line.debit) || 0}_${Number(line.credit) || 0}_${line.description || ''}`;
    const existing = lineSignatureMap.get(sig);
    if (existing) {
      existing.count++;
    } else {
      lineSignatureMap.set(sig, { count: 1, line });
    }
  }

  const duplicateLinesList: AccountingIntegrityAuditReport['duplicateLinesList'] = [];
  let duplicateLinesCount = 0;
  for (const { count, line } of lineSignatureMap.values()) {
    if (count > 1) {
      duplicateLinesCount += (count - 1);
      duplicateLinesList.push({
        journalEntryId: line.journalEntryId,
        accountId: line.accountId,
        accountName: line.accountName,
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0,
        count,
      });
    }
  }

  // Cash movement reconciliation
  const cashRec = validateCashMovementsReconciliation(db);
  const admissionVariance = Math.abs(cashRec.modules.admission.variance);
  const capitalVariance = Math.abs(cashRec.modules.capital.variance);
  const collectionVariance = Math.abs(cashRec.modules.collection.variance);
  const cashBookVariance = Math.abs(cashRec.totalVariance);

  const cashReconciliationDiscrepancies = cashRec.allUnreconciledItems.map((item) => ({
    module: item.module,
    sourceModule: item.module,
    voucherNo: item.voucherNo,
    expectedAmount: item.amount,
    cashBookAmount: 0,
    variance: item.amount,
    issue: item.issue,
  }));

  const totalLateFeeWaivers = (db.lateFeeWaivers || []).filter(w => w.status === 'ACTIVE').length;
  const totalWaivedAmount = (db.lateFeeWaivers || []).filter(w => w.status === 'ACTIVE').reduce((s, w) => s + (Number(w.waivedAmount) || 0), 0);

  const isHealthy = 
    unbalancedCount === 0 && 
    orphanCount === 0 && 
    duplicateSourceCount === 0 && 
    duplicateLinesCount === 0 && 
    cashBookVariance <= 0.01 && 
    admissionVariance <= 0.01 && 
    capitalVariance <= 0.01 && 
    collectionVariance <= 0.01;

  const summary = isHealthy
    ? `Accounting integrity verified: ${balancedCount} balanced journals, 0 unbalanced, 0 duplicates, Cash Book fully reconciled.${totalLateFeeWaivers > 0 ? ` (${totalLateFeeWaivers} Late Fee Waivers recorded: ৳${totalWaivedAmount.toLocaleString()})` : ''}`
    : `Accounting integrity audit: ${unbalancedCount} unbalanced journals, ${orphanCount} orphan headers, ${duplicateSourceCount} duplicate source journals, ${duplicateLinesCount} duplicate lines, Cash Book variance: ৳${cashBookVariance.toLocaleString()}.`;

  return {
    timestamp: new Date().toISOString(),
    isHealthy,
    totalJournals: journalEntries.length,
    balancedJournals: balancedCount,
    unbalancedJournals: unbalancedCount,
    orphanJournals: orphanCount,
    duplicateSourceJournals: duplicateSourceCount,
    duplicateLines: duplicateLinesCount,
    cashBookVariance,
    admissionVariance,
    capitalVariance,
    collectionVariance,
    totalLateFeeWaivers,
    totalWaivedAmount,
    unbalancedList,
    orphanList,
    duplicateSourceList,
    duplicateLinesList,
    cashReconciliationDiscrepancies,
    summary,
  };
}

export interface AdmissionReconciliationDebugReport {
  timestamp: string;
  subledgerAdmissions: Array<{
    id: string;
    memberId: string;
    amount: number;
    date: string;
    voucherNo?: string;
    paymentMethod?: string;
  }>;
  subledgerCapital: Array<{
    id: string;
    memberId: string;
    amount: number;
    date: string;
    voucherNo?: string;
    paymentMethod?: string;
  }>;
  cashBookAdmissions: Array<{
    id: string;
    amount: number;
    date: string;
    voucherNo?: string;
    sourceType?: string;
    accountId?: string;
    description?: string;
  }>;
  cashBookCapital: Array<{
    id: string;
    amount: number;
    date: string;
    voucherNo?: string;
    sourceType?: string;
    accountId?: string;
    description?: string;
  }>;
  journalAdmissions: Array<{
    journalNo: string;
    date: string;
    reference?: string;
    sourceId?: string;
    debitTotal: number;
    creditTotal: number;
  }>;
  journalCapital: Array<{
    journalNo: string;
    date: string;
    reference?: string;
    sourceId?: string;
    debitTotal: number;
    creditTotal: number;
  }>;
  summary: {
    admissionSubledgerTotal: number;
    admissionCashBookTotal: number;
    admissionVariance: number;
    capitalSubledgerTotal: number;
    capitalCashBookTotal: number;
    capitalVariance: number;
    totalVariance: number;
    isFullyReconciled: boolean;
  };
}

export function getAdmissionReconciliationDebugReport(db: AppDatabaseState): AdmissionReconciliationDebugReport {
  const admissions = db.admissions || [];
  const capitalDeposits = db.capitalDeposits || [];
  const cashTransactions = (db.cashTransactions || []).filter(c => c.status === 'POSTED' || !c.status);
  const journalEntries = db.journalEntries || [];
  const journalLines = db.journalLines || [];

  const subledgerAdmissions = admissions.map(a => ({
    id: a.admissionId || (a as any).id,
    memberId: a.memberId,
    amount: a.admissionFee || 0,
    date: a.applicationDate || a.approvalDate || a.createdAt || '',
    voucherNo: (a as any).voucherNo || a.transactionNo,
    paymentMethod: a.paymentMethod
  }));

  const subledgerCapital = capitalDeposits.map(c => ({
    id: c.depositId || (c as any).id,
    memberId: c.memberId,
    amount: c.amount || 0,
    date: c.date || c.createdAt || '',
    voucherNo: c.voucherNo,
    paymentMethod: c.paymentMethod
  }));

  const cashBookAdmissions = cashTransactions.filter(c => {
    const sType = (c.sourceType || '').toUpperCase();
    const desc = (c.description || c.reference || '').toLowerCase();
    const acctId = c.accountId || (c as any).accountCode || '';
    return sType === 'ADMISSION' || acctId === '4000' || acctId === '4010' || (sType === 'INCOME' && (desc.includes('admission') || desc.includes('ভর্তি')));
  }).map(c => ({
    id: c.transactionId,
    amount: c.cashIn || 0,
    date: c.date,
    voucherNo: c.voucherNo,
    sourceType: c.sourceType,
    accountId: c.accountId,
    description: c.description
  }));

  const cashBookCapital = cashTransactions.filter(c => {
    const sType = (c.sourceType || '').toUpperCase();
    const desc = (c.description || c.reference || '').toLowerCase();
    const acctId = c.accountId || '';
    return sType === 'CAPITAL' || acctId === '3000' || desc.includes('মূলধন');
  }).map(c => ({
    id: c.transactionId,
    amount: c.cashIn || 0,
    date: c.date,
    voucherNo: c.voucherNo,
    sourceType: c.sourceType,
    accountId: c.accountId,
    description: c.description
  }));

  const journalAdmissions = journalEntries.filter(j => {
    const sType = (j.sourceType || '').toUpperCase();
    const desc = (j.description || j.reference || '').toLowerCase();
    return sType === 'ADMISSION' || (sType === 'INCOME' && (desc.includes('admission') || desc.includes('ভর্তি')));
  }).map(j => {
    const lines = journalLines.filter(l => l.journalEntryId === j.id || (l as any).journalId === j.id || l.journalEntryId === j.journalNo);
    const debitTotal = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const creditTotal = lines.reduce((s, l) => s + (l.credit || 0), 0);
    return {
      journalNo: j.journalNo,
      date: j.date,
      reference: j.reference,
      sourceId: j.sourceId,
      debitTotal,
      creditTotal
    };
  });

  const journalCapital = journalEntries.filter(j => {
    const sType = (j.sourceType || '').toUpperCase();
    const desc = (j.description || j.reference || '').toLowerCase();
    return sType === 'CAPITAL' || desc.includes('মূলধন');
  }).map(j => {
    const lines = journalLines.filter(l => l.journalEntryId === j.id || (l as any).journalId === j.id || l.journalEntryId === j.journalNo);
    const debitTotal = lines.reduce((s, l) => s + (l.debit || 0), 0);
    const creditTotal = lines.reduce((s, l) => s + (l.credit || 0), 0);
    return {
      journalNo: j.journalNo,
      date: j.date,
      reference: j.reference,
      sourceId: j.sourceId,
      debitTotal,
      creditTotal
    };
  });

  const admissionSubledgerTotal = subledgerAdmissions.reduce((s, a) => s + a.amount, 0);
  const admissionCashBookTotal = cashBookAdmissions.reduce((s, c) => s + c.amount, 0);
  const admissionVariance = Math.abs(admissionSubledgerTotal - admissionCashBookTotal);

  const capitalSubledgerTotal = subledgerCapital.reduce((s, c) => s + c.amount, 0);
  const capitalCashBookTotal = cashBookCapital.reduce((s, c) => s + c.amount, 0);
  const capitalVariance = Math.abs(capitalSubledgerTotal - capitalCashBookTotal);

  return {
    timestamp: new Date().toISOString(),
    subledgerAdmissions,
    subledgerCapital,
    cashBookAdmissions,
    cashBookCapital,
    journalAdmissions,
    journalCapital,
    summary: {
      admissionSubledgerTotal,
      admissionCashBookTotal,
      admissionVariance,
      capitalSubledgerTotal,
      capitalCashBookTotal,
      capitalVariance,
      totalVariance: admissionVariance + capitalVariance,
      isFullyReconciled: admissionVariance === 0 && capitalVariance === 0
    }
  };
}

export interface MemberFinancialChainTrace {
  memberId: string;
  memberName: string;
  admissionFee: {
    sourceId?: string;
    subLedgerId?: string;
    amount: number;
    voucherNo?: string;
    journalId?: string;
    journalStatus?: string;
    journalDebitTotal?: number;
    journalCreditTotal?: number;
    journalBalanced: boolean;
    cashTransactionId?: string;
    cashAmount: number;
    cashStatus?: string;
    accountCode: string;
    variance: number;
    status: 'RECONCILED' | 'MISSING_CASH' | 'MISSING_JOURNAL' | 'DUPLICATE_CASH' | 'AMOUNT_MISMATCH';
  };
  capitalDeposit: {
    sourceId?: string;
    subLedgerId?: string;
    amount: number;
    voucherNo?: string;
    journalId?: string;
    journalStatus?: string;
    journalDebitTotal?: number;
    journalCreditTotal?: number;
    journalBalanced: boolean;
    cashTransactionId?: string;
    cashAmount: number;
    cashStatus?: string;
    accountCode: string;
    variance: number;
    status: 'RECONCILED' | 'MISSING_CASH' | 'MISSING_JOURNAL' | 'DUPLICATE_CASH' | 'AMOUNT_MISMATCH';
  };
  totalVariance: number;
  isFullyReconciled: boolean;
}

export function getComprehensiveReconciliationTrace(db: AppDatabaseState): {
  timestamp: string;
  traces: MemberFinancialChainTrace[];
  summary: {
    totalMembers: number;
    fullyReconciledMembers: number;
    unreconciledMembers: number;
    totalAdmissionVariance: number;
    totalCapitalVariance: number;
    totalSystemVariance: number;
  };
} {
  const members = db.members || [];
  const admissions = db.admissions || [];
  const capitalDeposits = db.capitalDeposits || [];
  const cashTransactions = (db.cashTransactions || []).filter(c => c.status !== 'CANCELLED' && c.status !== 'REVERSED');
  const journalEntries = (db.journalEntries || []).filter(j => (j.status as string) !== 'CANCELLED' && j.status !== 'REVERSED');
  const journalLines = db.journalLines || [];

  const traces: MemberFinancialChainTrace[] = [];
  let totalAdmissionVariance = 0;
  let totalCapitalVariance = 0;

  for (const member of members) {
    const memberId = member.memberId;
    const memberName = member.fullName || '';

    // 1. Admission chain
    const admSub = admissions.find(a => a.memberId === memberId);
    const admAmount = admSub ? Number(admSub.admissionFee || 0) : 0;
    const admSubId = admSub?.admissionId || (admSub as any)?.id;
    const admVoucher = (admSub as any)?.voucherNo || admSub?.transactionNo;

    // Matching Journal for Admission
    const admJournal = journalEntries.find(j => 
      (admSubId && (j.sourceId === admSubId || j.reference?.includes(admSubId) || j.sourceId?.includes(admSubId.replace('ADM-', 'INC-')))) ||
      (admVoucher && (j.reference === admVoucher || j.journalNo === admVoucher)) ||
      ((j.reference?.includes(memberId) || j.description?.includes(memberId)) && 
       (j.sourceType === 'ADMISSION' || (j.sourceType === 'INCOME' && j.description?.toLowerCase().includes('ভর্তি'))))
    );
    let admJDebit = 0;
    let admJCredit = 0;
    if (admJournal) {
      const lines = journalLines.filter(l => l.journalEntryId === admJournal.id || l.journalEntryId === admJournal.journalNo);
      admJDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      admJCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    }
    const admJBalanced = !!admJournal && Math.abs(admJDebit - admJCredit) < 0.01 && admJDebit > 0;

    // Matching Cash Transactions for Admission
    const matchingAdmCash = cashTransactions.filter(c => 
      (admSubId && (c.sourceId === admSubId || c.reference?.includes(admSubId))) ||
      (admVoucher && (c.voucherNo === admVoucher || c.reference === admVoucher)) ||
      (c.memberId === memberId && (c.sourceType === 'ADMISSION' || c.accountId === '4000' || c.accountId === '4010' || c.accountCode === '4000' || c.accountCode === '4010' || (c.sourceType === 'INCOME' && c.description?.toLowerCase().includes('ভর্তি'))))
    );
    const admCashAmount = matchingAdmCash.reduce((s, c) => s + (Number(c.cashIn) || 0), 0);
    const admCashTxId = matchingAdmCash.map(c => c.transactionId).join(', ') || undefined;
    const admCashStatus = matchingAdmCash.map(c => c.status || 'POSTED').join(', ') || undefined;

    const admVariance = Math.abs(admAmount - admCashAmount);
    totalAdmissionVariance += admVariance;

    let admStatus: MemberFinancialChainTrace['admissionFee']['status'] = 'RECONCILED';
    if (admAmount > 0) {
      if (matchingAdmCash.length === 0) {
        admStatus = 'MISSING_CASH';
      } else if (matchingAdmCash.length > 1) {
        admStatus = 'DUPLICATE_CASH';
      } else if (admVariance > 0.01) {
        admStatus = 'AMOUNT_MISMATCH';
      } else if (!admJournal) {
        admStatus = 'MISSING_JOURNAL';
      }
    }

    // 2. Capital chain
    const capSub = capitalDeposits.find(c => c.memberId === memberId && c.status !== 'CANCELLED' && c.status !== 'REVERSED');
    const capAmount = capSub ? Number(capSub.amount || 0) : 0;
    const capSubId = capSub?.depositId || (capSub as any)?.id;
    const capVoucher = capSub?.voucherNo;

    // Matching Journal for Capital
    const capJournal = journalEntries.find(j => 
      (capSubId && (j.sourceId === capSubId || j.reference?.includes(capSubId))) ||
      (capVoucher && (j.reference === capVoucher || j.journalNo === capVoucher)) ||
      (j.reference?.includes(memberId) && (j.sourceType === 'CAPITAL' || j.description?.toLowerCase().includes('মূলধন')))
    );
    let capJDebit = 0;
    let capJCredit = 0;
    if (capJournal) {
      const lines = journalLines.filter(l => l.journalEntryId === capJournal.id || l.journalEntryId === capJournal.journalNo);
      capJDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      capJCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    }
    const capJBalanced = !!capJournal && Math.abs(capJDebit - capJCredit) < 0.01 && capJDebit > 0;

    // Matching Cash Transactions for Capital
    const matchingCapCash = cashTransactions.filter(c => 
      (capSubId && (c.sourceId === capSubId || c.reference?.includes(capSubId))) ||
      (capVoucher && (c.voucherNo === capVoucher || c.reference === capVoucher)) ||
      (c.memberId === memberId && (c.sourceType === 'CAPITAL' || c.accountId === '3000' || c.accountCode === '3000' || c.description?.toLowerCase().includes('মূলধন')))
    );
    const capCashAmount = matchingCapCash.reduce((s, c) => s + (Number(c.cashIn) || 0), 0);
    const capCashTxId = matchingCapCash.map(c => c.transactionId).join(', ') || undefined;
    const capCashStatus = matchingCapCash.map(c => c.status || 'POSTED').join(', ') || undefined;

    const capVariance = Math.abs(capAmount - capCashAmount);
    totalCapitalVariance += capVariance;

    let capStatus: MemberFinancialChainTrace['capitalDeposit']['status'] = 'RECONCILED';
    if (capAmount > 0) {
      if (matchingCapCash.length === 0) {
        capStatus = 'MISSING_CASH';
      } else if (matchingCapCash.length > 1) {
        capStatus = 'DUPLICATE_CASH';
      } else if (capVariance > 0.01) {
        capStatus = 'AMOUNT_MISMATCH';
      } else if (!capJournal) {
        capStatus = 'MISSING_JOURNAL';
      }
    }

    const memberTotalVariance = admVariance + capVariance;
    const isFullyReconciled = memberTotalVariance < 0.01 && admStatus === 'RECONCILED' && capStatus === 'RECONCILED';

    traces.push({
      memberId,
      memberName,
      admissionFee: {
        sourceId: admSubId,
        subLedgerId: admSubId,
        amount: admAmount,
        voucherNo: admVoucher,
        journalId: admJournal?.journalNo || admJournal?.id,
        journalStatus: admJournal?.status,
        journalDebitTotal: admJDebit,
        journalCreditTotal: admJCredit,
        journalBalanced: admJBalanced,
        cashTransactionId: admCashTxId,
        cashAmount: admCashAmount,
        cashStatus: admCashStatus,
        accountCode: '4010',
        variance: admVariance,
        status: admStatus,
      },
      capitalDeposit: {
        sourceId: capSubId,
        subLedgerId: capSubId,
        amount: capAmount,
        voucherNo: capVoucher,
        journalId: capJournal?.journalNo || capJournal?.id,
        journalStatus: capJournal?.status,
        journalDebitTotal: capJDebit,
        journalCreditTotal: capJCredit,
        journalBalanced: capJBalanced,
        cashTransactionId: capCashTxId,
        cashAmount: capCashAmount,
        cashStatus: capCashStatus,
        accountCode: '3000',
        variance: capVariance,
        status: capStatus,
      },
      totalVariance: memberTotalVariance,
      isFullyReconciled,
    });
  }

  const fullyReconciledMembers = traces.filter(t => t.isFullyReconciled).length;

  return {
    timestamp: new Date().toISOString(),
    traces,
    summary: {
      totalMembers: members.length,
      fullyReconciledMembers,
      unreconciledMembers: members.length - fullyReconciledMembers,
      totalAdmissionVariance,
      totalCapitalVariance,
      totalSystemVariance: totalAdmissionVariance + totalCapitalVariance,
    }
  };
}

export interface AccountingDiagnosticAccountItem {
  accountCode: string;
  accountName: string;
  banglaName: string;
  category: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  journalDebit: number;
  journalCredit: number;
  journalDerivedBalance: number;
  cashBookBalance: number;
  bankBookBalance: number;
  subLedgerBalance: number;
  mappedAliases: string[];
  duplicateContribution: number;
  variance: number;
  status: 'RECONCILED' | 'VARIANCE_DETECTED' | 'UNMAPPED_ENTRIES' | 'DUPLICATES_DETECTED';
  lineCount: number;
}

export interface AccountingDiagnosticReport {
  timestamp: string;
  isBalanced: boolean;
  totalJournalDebits: number;
  totalJournalCredits: number;
  trialBalanceVariance: number;
  unbalancedJournalsCount: number;
  orphanJournalLinesCount: number;
  duplicateJournalsCount: number;
  duplicateLinesCount: number;
  cashReconciliationVariance: number;
  bankReconciliationVariance: number;
  accounts: AccountingDiagnosticAccountItem[];
  unbalancedJournals: Array<{ journalId: string; journalNo: string; debit: number; credit: number; diff: number; issue: string }>;
  orphanJournalLines: Array<{ lineId: string; journalEntryId: string; accountId: string; amount: number }>;
  duplicateJournals: Array<{ sourceType: string; sourceId: string; count: number; journalNos: string[] }>;
  duplicateLines: Array<{ journalEntryId: string; accountId: string; debit: number; credit: number; count: number }>;
  summary: string;
}

/**
 * Diagnostic Report Generator (Requirement 13)
 * Analyzes journal-derived balances, cash-book balances, sub-ledger balances,
 * account mapping, duplicate contributions, and variances without modifying data.
 */
export function getAccountingDiagnosticReport(db: AppDatabaseState): AccountingDiagnosticReport {
  const accounts = Array.isArray(db.accounts) ? db.accounts : [];
  const journalEntries = db.journalEntries || [];
  const journalLines = db.journalLines || [];
  const cashTransactions = (db.cashTransactions || []).filter(c => c.status !== 'CANCELLED' && c.status !== 'REVERSED');
  const bankTransactions = (db.bankTransactions || []).filter(b => (b as any).status !== 'CANCELLED' && (b as any).status !== 'REVERSED');
  const admissions = (db.admissions || []).filter(a => a.status === 'APPROVED' || (a as any).approvalStatus === 'APPROVED' || !a.status);
  const capitalDeposits = (db.capitalDeposits || []).filter(c => c.status !== 'CANCELLED' && c.status !== 'REVERSED');
  const collections = (db.collections || []).filter(c => c.status !== 'CANCELLED' && c.status !== 'REVERSED');
  const loans = (db.loans || []).filter(l => l.status === 'ACTIVE' || l.status === 'COMPLETED');
  const investments = (db.investments || []).filter(i => i.status === 'ACTIVE' || i.status === 'COMPLETED' || i.status === 'PARTIAL_RETURN');
  const incomes = (db.incomes || []).filter(i => i.status === 'POSTED' || !i.status);
  const expenses = (db.expenses || []).filter(e => e.approvalStatus === 'POSTED' || !e.approvalStatus);

  // Active entries map
  const activeEntriesMap = new Map<string, JournalEntry>();
  const journalIdLookup = new Set<string>();

  journalEntries.forEach(entry => {
    if (!entry) return;
    const status = (entry.status as string) || 'ACTIVE';
    if (status === 'CANCELLED' || status === 'REVERSED') return;
    const id = entry.id || entry.journalNo || '';
    if (id) {
      activeEntriesMap.set(id, entry);
      journalIdLookup.add(id);
    }
    if (entry.journalNo) {
      activeEntriesMap.set(entry.journalNo, entry);
      journalIdLookup.add(entry.journalNo);
    }
  });

  // 1. Unbalanced Journals
  const unbalancedJournals: Array<{ journalId: string; journalNo: string; debit: number; credit: number; diff: number; issue: string }> = [];
  const linesByJournalId = new Map<string, JournalEntryLine[]>();

  journalLines.forEach(l => {
    if (!l || !l.journalEntryId) return;
    const existing = linesByJournalId.get(l.journalEntryId) || [];
    existing.push(l);
    linesByJournalId.set(l.journalEntryId, existing);
  });

  journalEntries.forEach(j => {
    const status = (j.status as string) || 'ACTIVE';
    if (status === 'CANCELLED' || status === 'REVERSED') return;
    const lines = linesByJournalId.get(j.id) || linesByJournalId.get(j.journalNo) || [];
    const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    const diff = Math.round(Math.abs(debit - credit) * 100) / 100;
    if (diff > 0.01 || lines.length === 0) {
      unbalancedJournals.push({
        journalId: j.id,
        journalNo: j.journalNo || j.id,
        debit,
        credit,
        diff,
        issue: lines.length === 0 ? 'No journal lines attached' : `DR (৳${debit}) != CR (৳${credit})`
      });
    }
  });

  // 2. Orphan Journal Lines (check against all journal entries in database)
  const allJournalIdLookup = new Set<string>();
  journalEntries.forEach(entry => {
    if (!entry) return;
    if (entry.id) allJournalIdLookup.add(entry.id);
    if (entry.journalNo) allJournalIdLookup.add(entry.journalNo);
  });

  const orphanJournalLines: Array<{ lineId: string; journalEntryId: string; accountId: string; amount: number }> = [];
  journalLines.forEach(l => {
    if (!l.journalEntryId || !allJournalIdLookup.has(l.journalEntryId)) {
      orphanJournalLines.push({
        lineId: l.id || (l as any).lineId || '',
        journalEntryId: l.journalEntryId,
        accountId: l.accountId,
        amount: Math.max(Number(l.debit) || 0, Number(l.credit) || 0)
      });
    }
  });

  // 3. Duplicate Journals
  const sourceTracker = new Map<string, { count: number; journalNos: string[] }>();
  journalEntries.forEach(j => {
    const status = (j.status as string) || 'ACTIVE';
    if (status === 'CANCELLED' || status === 'REVERSED') return;
    if (j.sourceType && j.sourceId && j.sourceType !== 'MANUAL') {
      const key = `${j.sourceType}::${j.sourceId}`;
      const existing = sourceTracker.get(key) || { count: 0, journalNos: [] };
      existing.count += 1;
      existing.journalNos.push(j.journalNo || j.id);
      sourceTracker.set(key, existing);
    }
  });

  const duplicateJournals: Array<{ sourceType: string; sourceId: string; count: number; journalNos: string[] }> = [];
  sourceTracker.forEach((val, key) => {
    if (val.count > 1) {
      const [sourceType, sourceId] = key.split('::');
      duplicateJournals.push({
        sourceType,
        sourceId,
        count: val.count,
        journalNos: val.journalNos
      });
    }
  });

  // 4. Duplicate Journal Lines
  const lineSignatureMap = new Map<string, number>();
  journalLines.forEach(l => {
    const sig = `${l.journalEntryId}|${l.accountId}|${l.debit}|${l.credit}`;
    lineSignatureMap.set(sig, (lineSignatureMap.get(sig) || 0) + 1);
  });
  const duplicateLines: Array<{ journalEntryId: string; accountId: string; debit: number; credit: number; count: number }> = [];
  lineSignatureMap.forEach((count, sig) => {
    if (count > 1) {
      const [journalEntryId, accountId, debitStr, creditStr] = sig.split('|');
      duplicateLines.push({
        journalEntryId,
        accountId,
        debit: Number(debitStr) || 0,
        credit: Number(creditStr) || 0,
        count
      });
    }
  });

  // 5. Account Diagnostics Mapping
  const diagnosticMap = new Map<string, AccountingDiagnosticAccountItem>();

  // Initialize known accounts from Chart of Accounts
  Object.keys(CANONICAL_COA).forEach(code => {
    const meta = CANONICAL_COA[code];
    diagnosticMap.set(code, {
      accountCode: code,
      accountName: meta.accountName,
      banglaName: meta.banglaName,
      category: meta.category,
      normalBalance: meta.normalBalance,
      journalDebit: 0,
      journalCredit: 0,
      journalDerivedBalance: 0,
      cashBookBalance: 0,
      bankBookBalance: 0,
      subLedgerBalance: 0,
      mappedAliases: [],
      duplicateContribution: 0,
      variance: 0,
      status: 'RECONCILED',
      lineCount: 0
    });
  });

  // Process journal lines into accounts
  journalLines.forEach(l => {
    if (!l) return;
    const parentEntry = activeEntriesMap.get(l.journalEntryId);
    if (!parentEntry) return;

    const debit = Number(l.debit) || 0;
    const credit = Number(l.credit) || 0;
    if (debit === 0 && credit === 0) return;

    const canonical = resolveCanonicalAccount(l.accountId, l.accountName, accounts);
    const code = canonical.accountCode;

    if (!diagnosticMap.has(code)) {
      diagnosticMap.set(code, {
        accountCode: code,
        accountName: canonical.accountName,
        banglaName: canonical.banglaName,
        category: canonical.category,
        normalBalance: canonical.normalBalance,
        journalDebit: 0,
        journalCredit: 0,
        journalDerivedBalance: 0,
        cashBookBalance: 0,
        bankBookBalance: 0,
        subLedgerBalance: 0,
        mappedAliases: [],
        duplicateContribution: 0,
        variance: 0,
        status: 'RECONCILED',
        lineCount: 0
      });
    }

    const item = diagnosticMap.get(code)!;
    item.journalDebit += debit;
    item.journalCredit += credit;
    item.lineCount += 1;

    if (l.accountId && l.accountId !== code && !item.mappedAliases.includes(l.accountId)) {
      item.mappedAliases.push(l.accountId);
    }
  });

  // Process Subledgers and Cash Book per account
  // 1000 Cash in Hand
  const cashIn = cashTransactions.reduce((s, c) => s + (Number(c.cashIn) || 0), 0);
  const cashOut = cashTransactions.reduce((s, c) => s + (Number(c.cashOut) || 0), 0);
  const netCashBook = cashIn - cashOut;
  if (diagnosticMap.has('1000')) {
    const acc1000 = diagnosticMap.get('1000')!;
    acc1000.cashBookBalance = netCashBook;
    acc1000.subLedgerBalance = netCashBook;
  }

  // 1010 Bank Account
  const bankIn = bankTransactions.reduce((s, b) => s + (Number(b.deposit) || 0), 0);
  const bankOut = bankTransactions.reduce((s, b) => s + (Number(b.withdrawal) || 0), 0);
  const netBankBook = bankIn - bankOut;
  if (diagnosticMap.has('1010')) {
    const acc1010 = diagnosticMap.get('1010')!;
    acc1010.bankBookBalance = netBankBook;
    acc1010.subLedgerBalance = netBankBook;
  }

  // 1200 Loan Receivable
  const totalLoanDisbursed = loans.reduce((s, l) => s + (Number(l.approvedAmount || l.requestedAmount || 0)), 0);
  const totalLoanRepaid = loans.reduce((s, l) => s + (Number(l.repaidPrincipal || 0)), 0);
  const loanSubledgerBalance = totalLoanDisbursed - totalLoanRepaid;
  if (diagnosticMap.has('1200')) {
    diagnosticMap.get('1200')!.subLedgerBalance = loanSubledgerBalance;
  }

  // 1500 Investment Asset
  const totalInvestmentDisbursed = investments.reduce((s, i) => s + (Number(i.investmentAmount || i.originalPrincipal || 0)), 0);
  const totalInvestmentReturned = investments.reduce((s, i) => s + (Number(i.returnedPrincipal || 0)), 0);
  const investmentSubledgerBalance = totalInvestmentDisbursed - totalInvestmentReturned;
  if (diagnosticMap.has('1500')) {
    diagnosticMap.get('1500')!.subLedgerBalance = investmentSubledgerBalance;
  }

  // 3000 Member Capital
  const totalCapitalSubledger = capitalDeposits.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  if (diagnosticMap.has('3000')) {
    diagnosticMap.get('3000')!.subLedgerBalance = totalCapitalSubledger;
  }

  // 4000 Admission Fee
  const totalAdmissionSubledger = admissions.reduce((s, a) => s + (Number(a.admissionFee) || 0), 0);
  if (diagnosticMap.has('4000')) {
    diagnosticMap.get('4000')!.subLedgerBalance = totalAdmissionSubledger;
  }

  // 4020 Monthly Subscription
  const totalCollectionSubledger = collections.reduce((s, c) => s + (Number(c.paidAmount) || 0), 0);
  if (diagnosticMap.has('4020')) {
    diagnosticMap.get('4020')!.subLedgerBalance = totalCollectionSubledger;
  }

  // 4300 Other Income / Late Fine
  const totalLateFineSubledger = collections.reduce((s, c) => s + (Number(c.lateFine) || 0), 0);
  if (diagnosticMap.has('4300')) {
    diagnosticMap.get('4300')!.subLedgerBalance = totalLateFineSubledger;
  }

  // Final account calculation
  const accountList: AccountingDiagnosticAccountItem[] = [];
  let grandJournalDebit = 0;
  let grandJournalCredit = 0;

  diagnosticMap.forEach(acc => {
    acc.journalDebit = Math.round(acc.journalDebit * 100) / 100;
    acc.journalCredit = Math.round(acc.journalCredit * 100) / 100;

    const diff = acc.journalDebit - acc.journalCredit;
    if (acc.normalBalance === 'DEBIT') {
      acc.journalDerivedBalance = Math.round(diff * 100) / 100;
    } else {
      acc.journalDerivedBalance = Math.round((-diff) * 100) / 100;
    }

    if (diff > 0) {
      grandJournalDebit += diff;
    } else if (diff < 0) {
      grandJournalCredit += Math.abs(diff);
    }

    // Determine target benchmark (Subledger or CashBook/BankBook)
    let benchmarkBalance = acc.subLedgerBalance;
    if (acc.accountCode === '1000' && acc.cashBookBalance !== 0) {
      benchmarkBalance = acc.cashBookBalance;
    } else if (acc.accountCode === '1010' && acc.bankBookBalance !== 0) {
      benchmarkBalance = acc.bankBookBalance;
    }

    acc.variance = Math.round(Math.abs(acc.journalDerivedBalance - benchmarkBalance) * 100) / 100;

    if (acc.variance > 0.01 && (acc.journalDerivedBalance !== 0 || benchmarkBalance !== 0)) {
      acc.status = 'VARIANCE_DETECTED';
    } else if (duplicateJournals.length > 0 && acc.duplicateContribution > 0) {
      acc.status = 'DUPLICATES_DETECTED';
    } else {
      acc.status = 'RECONCILED';
    }

    accountList.push(acc);
  });

  accountList.sort((a, b) => a.accountCode.localeCompare(b.accountCode, undefined, { numeric: true }));

  grandJournalDebit = Math.round(grandJournalDebit * 100) / 100;
  grandJournalCredit = Math.round(grandJournalCredit * 100) / 100;
  const trialBalanceVariance = Math.round(Math.abs(grandJournalDebit - grandJournalCredit) * 100) / 100;
  const isBalanced = trialBalanceVariance < 0.01;

  const cashReconciliationVariance = diagnosticMap.get('1000')?.variance || 0;
  const bankReconciliationVariance = diagnosticMap.get('1010')?.variance || 0;

  const summary = isBalanced && unbalancedJournals.length === 0 && orphanJournalLines.length === 0 && duplicateJournals.length === 0
    ? `Accounting Equilibrium Fully Verified: Total Debits (৳${grandJournalDebit.toLocaleString()}) = Total Credits (৳${grandJournalCredit.toLocaleString()}). Zero unbalanced journals, zero orphan lines, zero duplicate entries.`
    : `Accounting Discrepancy Found: Trial Balance variance ৳${trialBalanceVariance.toLocaleString()}, ${unbalancedJournals.length} unbalanced journals, ${orphanJournalLines.length} orphan lines, ${duplicateJournals.length} duplicate sources.`;

  return {
    timestamp: new Date().toISOString(),
    isBalanced,
    totalJournalDebits: grandJournalDebit,
    totalJournalCredits: grandJournalCredit,
    trialBalanceVariance,
    unbalancedJournalsCount: unbalancedJournals.length,
    orphanJournalLinesCount: orphanJournalLines.length,
    duplicateJournalsCount: duplicateJournals.length,
    duplicateLinesCount: duplicateLines.length,
    cashReconciliationVariance,
    bankReconciliationVariance,
    accounts: accountList,
    unbalancedJournals,
    orphanJournalLines,
    duplicateJournals,
    duplicateLines,
    summary
  };
}




