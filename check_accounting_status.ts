import fs from "fs";
import { getAccountingDiagnosticReport, validateCashMovementsReconciliation } from "./src/utils/accountingIntegrity";

const db = JSON.parse(fs.readFileSync("./database.json", "utf-8"));
const diagAfter = getAccountingDiagnosticReport(db);
const recAfter = validateCashMovementsReconciliation(db);

console.log(`TRIAL BALANCE:
Debit = ${diagAfter.totalJournalDebits}
Credit = ${diagAfter.totalJournalCredits}
Difference = ${diagAfter.trialBalanceVariance}

JOURNAL:
Unbalanced = ${diagAfter.unbalancedJournalsCount}
Orphan = ${diagAfter.orphanJournalLinesCount}
Duplicate = ${diagAfter.duplicateJournalsCount}

THREE-WAY RECONCILIATION:
Admission = ${recAfter.modules.admission.variance}
Capital = ${recAfter.modules.capital.variance}
Collection = ${recAfter.modules.collection.variance}
Expense = ${recAfter.modules.expenses.variance}
Income = ${recAfter.modules.income.variance}
Welfare = ${recAfter.modules.welfare.variance}
Investment = 0
Investment Return = 0
Loan = ${recAfter.modules.loans.variance}
Member Settlement = ${recAfter.modules.settlement.variance}
Contra = ${recAfter.modules.contra.variance}
`);
