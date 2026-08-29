import * as XLSX from 'xlsx';
import { AppDatabaseState } from './db';
import { 
  Member, Collection, CapitalDeposit, LoanApplication, LoanRepayment,
  Investment, Income, Expense, CashTransaction, BankTransaction,
  MemberLedgerEntry, WelfareFundTransaction, ReserveUtilization,
  HistoricalProfit, JournalEntry, JournalEntryLine, CashReconciliation, BankReconciliation,
  FinancialYear
} from '../types';

export class ExcelService {
  
  static shareOrDownload(filename: string, wb: XLSX.WorkBook) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    // Web Share API if possible and supported for files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })] })) {
      const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      navigator.share({
        title: filename,
        files: [file]
      }).catch((err) => {
        console.error('Share failed, falling back to download', err);
        this.downloadFallback(filename, url);
      });
    } else {
      this.downloadFallback(filename, url);
    }
  }

  private static downloadFallback(filename: string, url: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  private static createSheetWithHeader(title: string, orgName: string, fy: string, data: any[]) {
    const headerRows = [
      [orgName],
      [title],
      [`Financial Year: ${fy}`],
      [`Generated Date: ${new Date().toLocaleString()}`],
      [], // blank row
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(headerRows);
    XLSX.utils.sheet_add_json(ws, data, { origin: "A6" });
    
    // Auto fit columns roughly
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(k => ({ wch: Math.max(k.length + 2, 15) }));
    }
    
    return ws;
  }

  private static getActiveFyStr(db: AppDatabaseState) {
    const active = db.financialYears?.find(f => f.status === 'ACTIVE');
    return active ? active.yearCode : 'ALL_YEARS';
  }

  private static safeData(data: any[]) {
    if (!data || data.length === 0) {
      return [{ "Message": "No records found" }];
    }
    return data;
  }

  static exportMembers(db: AppDatabaseState, members: Member[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = members.map(m => ({
      'Member ID': m.memberId,
      'Membership Number': m.membershipNo,
      'Full Name': m.fullName,
      'Father Name': m.fatherName,
      'Mother Name': m.motherName,
      'Date of Birth': m.dateOfBirth,
      'NID': m.nid,
      'Occupation': m.occupation,
      'Marital Status': m.maritalStatus,
      'Mobile': m.mobile,
      'Email': m.email,
      'Present Address': m.presentAddress,
      'Permanent Address': m.permanentAddress,
      'Joining Date': m.joiningDate,
      'Status': m.status,
      'Nominee': m.nominees?.map(n => n.name).join(', ') || '',
      'Remarks': m.remarks || ''
    }));

    const ws = this.createSheetWithHeader('Members Register', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    this.shareOrDownload(`AJ_Welfare_Members_${fyStr}.xlsx`, wb);
  }

  static exportCollections(db: AppDatabaseState, collections: Collection[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = collections.map(c => {
      const member = db.members?.find(m => m.memberId === c.memberId);
      return {
        'Receipt No': c.receiptNo,
        'Member ID': c.memberId,
        'Member Name': member?.fullName || '',
        'Collection Month': c.collectionMonth,
        'Collection Date': c.collectionDate,
        'Monthly Amount': c.monthlyAmount,
        'Previous Due': c.previousDue,
        'Late Fine': c.lateFine,
        'Discount': c.discount,
        'Total Payable': c.totalPayable,
        'Paid Amount': c.paidAmount,
        'Current Due': c.currentDue,
        'Payment Method': c.paymentMethod,
        'Transaction Number': c.transactionNo || '',
        'Received By': c.receivedBy,
        'Remarks': c.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Monthly Collections', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Collections");
    this.shareOrDownload(`AJ_Welfare_Collections_${fyStr}.xlsx`, wb);
  }

  static exportDueAging(db: AppDatabaseState, ageingData: any[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = ageingData.map(d => ({
      'Age Category': d.category,
      'Member ID': d.memberId,
      'Member Name': d.memberName,
      'Mobile': d.mobile,
      'Oldest Due Month': d.oldestDueMonth || '',
      'Months Overdue': d.monthsOverdue,
      'Total Due': d.totalDue
    }));

    const ws = this.createSheetWithHeader('Due Aging Report', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Due_Aging");
    this.shareOrDownload(`AJ_Welfare_Due_Aging_${fyStr}.xlsx`, wb);
  }

  static exportCapital(db: AppDatabaseState, capitals: CapitalDeposit[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = capitals.map(c => {
      const member = db.members?.find(m => m.memberId === c.memberId);
      return {
        'Voucher': c.voucherNo,
        'Date': c.date,
        'Member ID': c.memberId,
        'Member Name': member?.fullName || '',
        'Amount': c.amount,
        'Payment Method': c.paymentMethod,
        'Transaction Number': c.transactionNo || '',
        'Remarks': c.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Capital Deposits', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Capital");
    this.shareOrDownload(`AJ_Welfare_Capital_${fyStr}.xlsx`, wb);
  }

  static exportLoans(db: AppDatabaseState, loans: LoanApplication[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = loans.map(l => {
      const member = db.members?.find(m => m.memberId === l.memberId);
      const approvedOrApplied = l.approvedAmount ?? l.appliedAmount ?? l.requestedAmount ?? 0;
      const outstanding = l.totalOutstanding ?? Math.max(0, approvedOrApplied - (l.repaidPrincipal || 0));
      return {
        'Voucher No': l.disbursementVoucherNo || l.loanId,
        'Member ID': l.memberId,
        'Member Name': member?.fullName || '',
        'Purpose': l.purpose || '',
        'Approved/Applied Amount': approvedOrApplied,
        'Term (Months)': l.durationMonths ?? l.termMonths ?? 0,
        'Profit Rate (%)': l.interestRate ?? l.interestRatePercentage ?? 0,
        'Installment Amount': l.monthlyInstallment ?? Math.round(approvedOrApplied / Math.max(1, l.durationMonths ?? l.termMonths ?? 1)),
        'Repaid Principal': l.repaidPrincipal || 0,
        'Outstanding Balance': outstanding,
        'Status': l.status,
        'Remarks': l.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Loans', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loans");
    this.shareOrDownload(`AJ_Welfare_Loans_${fyStr}.xlsx`, wb);
  }

  static exportLoanRepayments(db: AppDatabaseState, repayments: LoanRepayment[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = repayments.map(r => {
      const member = db.members?.find(m => m.memberId === r.memberId);
      return {
        'Receipt/Voucher': r.voucherNo,
        'Loan ID': r.loanId,
        'Member ID': r.memberId,
        'Member Name': member?.fullName || '',
        'Date': r.date,
        'Installment No': r.installmentNo,
        'Principal': r.principalAmount,
        'Profit/Charge': r.profitOrCharge,
        'Total Paid': r.totalPaid,
        'Remaining Balance': r.remainingBalance,
        'Payment Method': r.paymentMethod,
        'Received By': r.receivedBy || '',
        'Remarks': r.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Loan Repayments', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loan_Repayments");
    this.shareOrDownload(`AJ_Welfare_Loan_Repayments_${fyStr}.xlsx`, wb);
  }

  static exportInvestments(db: AppDatabaseState, investments: Investment[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = investments.map(i => ({
      'Investment ID': i.investmentId,
      'Date': i.investmentDate,
      'Investment Type': i.investmentType,
      'Partner': i.partner,
      'Description': i.description,
      'Investment Amount': i.investmentAmount,
      'Expected Return': i.expectedReturn || 0,
      'Actual Return': i.actualReturn || 0,
      'Profit': i.profit || 0,
      'Loss': i.loss || 0,
      'ROI (%)': i.roiPercentage || 0,
      'Maturity Date': i.maturityDate || '',
      'Status': i.status
    }));

    const ws = this.createSheetWithHeader('Investments', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Investments");
    this.shareOrDownload(`AJ_Welfare_Investments_${fyStr}.xlsx`, wb);
  }

  static exportIncome(db: AppDatabaseState, incomes: Income[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = incomes.map(i => {
      const member = db.members?.find(m => m.memberId === i.memberId);
      return {
        'Voucher': i.voucherNo,
        'Date': i.date,
        'Income Head': i.incomeHead,
        'Member': member ? `${member.memberId} - ${member.fullName}` : (i.memberName || ''),
        'Amount': i.amount,
        'Payment Method': i.paymentMethod,
        'Reference': i.reference || '',
        'Remarks': i.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Income', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Income");
    this.shareOrDownload(`AJ_Welfare_Income_${fyStr}.xlsx`, wb);
  }

  static exportExpenses(db: AppDatabaseState, expenses: Expense[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = expenses.map(e => ({
      'Voucher': e.voucherNo,
      'Date': e.date,
      'Expense Head': e.expenseHead,
      'Payee': e.payee,
      'Amount': e.amount,
      'Payment Method': e.paymentMethod,
      'Approval Status': e.approvalStatus,
      'Approved By': e.approvedBy || '',
      'Bill / Reference': e.billNumber || '',
      'Remarks': e.remarks || ''
    }));

    const ws = this.createSheetWithHeader('Expenses', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense");
    this.shareOrDownload(`AJ_Welfare_Expense_${fyStr}.xlsx`, wb);
  }

  static exportCashBook(db: AppDatabaseState, txs: CashTransaction[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    let running = 0;
    const exportData = txs.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => {
      running = running + ((t.cashIn || 0) - (t.cashOut || 0));
      return {
        'Date': t.date,
        'Voucher': t.voucherNo || '',
        'Reference': t.reference || '',
        'Description': t.description,
        'Cash In': t.cashIn || 0,
        'Cash Out': t.cashOut || 0,
        'Running Balance': running,
        'Source Type': t.sourceType,
        'Source ID': t.sourceId
      };
    });

    const ws = this.createSheetWithHeader('CashBook', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CashBook");
    this.shareOrDownload(`AJ_Welfare_CashBook_${fyStr}.xlsx`, wb);
  }

  static exportBankBook(db: AppDatabaseState, txs: BankTransaction[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    let running = 0;
    const exportData = txs.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => {
      running = running + ((t.deposit || 0) - (t.withdrawal || 0));
      return {
        'Bank Account': t.bankName,
        'Date': t.date,
        'Voucher': t.reference || '',
        'Reference': t.reference || '',
        'Description': t.description,
        'Deposit': t.deposit || 0,
        'Withdrawal': t.withdrawal || 0,
        'Running Balance': running,
        'Transaction Number': t.transactionNo || '',
        'Source Type': t.sourceType,
        'Source ID': t.sourceId
      };
    });

    const ws = this.createSheetWithHeader('BankBook', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BankBook");
    this.shareOrDownload(`AJ_Welfare_BankBook_${fyStr}.xlsx`, wb);
  }

  static exportMemberLedger(db: AppDatabaseState, ledgers: MemberLedgerEntry[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = ledgers.sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime()).map(l => {
      const member = db.members?.find(m => m.memberId === l.memberId);
      return {
        'Date': l.date,
        'Member ID': l.memberId,
        'Member Name': member?.fullName || '',
        'Voucher': l.voucherNo || '',
        'Receipt': l.receiptNo || '',
        'Description': l.description,
        'Transaction Type': l.transactionType,
        'Debit': l.debit,
        'Credit': l.credit,
        'Balance': l.balance,
        'Reference': l.reference || '',
        'Source ID': l.sourceId
      };
    });

    const ws = this.createSheetWithHeader('Member Ledger', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Member_Ledger");
    this.shareOrDownload(`AJ_Welfare_Member_Ledger_${fyStr}.xlsx`, wb);
  }

  static exportWelfare(db: AppDatabaseState, welfares: WelfareFundTransaction[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = welfares.map(w => {
      return {
        'Date': w.date,
        'Voucher': w.voucherNo,
        'Fund Type': w.fundType,
        'Beneficiary': w.beneficiary,
        'Member ID': w.memberId || '',
        'Purpose': w.reason,
        'Amount': w.amount,
        'Approved': w.approvedByPresident ? 'Yes' : 'Pending',
        'Resolution': w.resolutionNo || '',
        'Status': w.approvalStatus,
        'Remarks': w.remarks || ''
      };
    });

    const ws = this.createSheetWithHeader('Welfare Fund', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Welfare");
    this.shareOrDownload(`AJ_Welfare_Welfare_${fyStr}.xlsx`, wb);
  }

  static exportReserveFund(db: AppDatabaseState, reserves: ReserveUtilization[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = reserves.map(r => ({
      'Utilization ID': r.utilizationId,
      'Date': r.date,
      'Purpose': r.purpose,
      'Description': r.description,
      'Requested By': r.requestedBy,
      'Amount': r.amount,
      'Status': r.status,
      'Approved By': r.approvedBy || '',
      'Resolution': r.resolutionNo || '',
      'Payment Method': r.paymentMethod || '',
      'Voucher': r.voucherNo || '',
      'Remarks': r.remarks || ''
    }));

    const ws = this.createSheetWithHeader('Reserve Fund Utilization', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reserve");
    this.shareOrDownload(`AJ_Welfare_Reserve_${fyStr}.xlsx`, wb);
  }

  static exportProfit(db: AppDatabaseState, profits: HistoricalProfit[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = profits.map(p => ({
      'Financial Year': p.financialYear,
      'Net Profit': p.netProfit,
      'Welfare %': p.welfarePercent,
      'Emergency %': p.emergencyPercent,
      'Reserve %': p.reservePercent,
      'Member %': p.memberDistributionPercent,
      'Welfare Amount': p.welfareAmount,
      'Emergency Amount': p.emergencyAmount,
      'Reserve Amount': p.reserveAmount,
      'Member Distribution': p.memberDistributionAmount,
      'Finalized Date': p.finalizedAt || '',
      'Finalized By': p.finalizedBy || '',
      'Resolution': p.resolutionNo || '',
      'Status': p.finalized ? 'FINALIZED' : 'DRAFT'
    }));

    const ws = this.createSheetWithHeader('Historical Profit', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit");
    this.shareOrDownload(`AJ_Welfare_Profit_${fyStr}.xlsx`, wb);
  }

  static exportFinancialSummary(db: AppDatabaseState, summary: any) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = [{
      'Financial Year': fyStr,
      'Total Income': summary.totalIncome || 0,
      'Total Expense': summary.totalExpense || 0,
      'Net Profit': summary.netProfit || 0,
      'Cash Balance': summary.cashBalance || 0,
      'Bank Balance': summary.bankBalance || 0,
      'Member Capital': summary.memberCapital || summary.totalCapital || 0,
      'Loan Receivable': summary.loanReceivable || summary.outstandingLoan || 0,
      'Investment': summary.totalInvestment || 0,
      'Outstanding Due': summary.outstandingDue || 0,
      'Outstanding Loan': summary.outstandingLoan || 0,
      'Welfare Fund': summary.welfareFund || summary.welfareFundBalance || 0,
      'Emergency Fund': summary.emergencyFund || summary.emergencyFundBalance || 0,
      'Reserve Fund': summary.reserveFund || summary.reserveFundBalance || 0,
      'Retained Profit': summary.retainedProfit || 0
    }];

    const ws = this.createSheetWithHeader('Financial Summary', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial_Summary");
    this.shareOrDownload(`AJ_Welfare_Financial_Summary_${fyStr}.xlsx`, wb);
  }

  static exportJournal(db: AppDatabaseState, journals: JournalEntry[], allLines: JournalEntryLine[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    // We want to export Journal Entries flat (lines included)
    const exportData: any[] = [];
    
    journals.forEach(j => {
      const jLines = allLines.filter(l => l.journalEntryId === j.id);
      jLines.forEach(l => {
        exportData.push({
          'Journal ID': j.id,
          'Date': j.date,
          'Journal No': j.journalNo || '',
          'Description': j.description,
          'Source Type': j.sourceType,
          'Source ID': j.sourceId,
          'Account': l.accountId,
          'Debit': l.debit,
          'Credit': l.credit,
          'Reference': j.reference || ''
        });
      });
    });

    const ws = this.createSheetWithHeader('Journal Entries', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Journal");
    this.shareOrDownload(`AJ_Welfare_Journal_${fyStr}.xlsx`, wb);
  }

  static exportCashReconciliation(db: AppDatabaseState, recons: CashReconciliation[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = recons.map(r => ({
      'Reconciliation ID': r.id,
      'Financial Year': r.financialYearId,
      'Date': r.reconciliationDate,
      'Book Balance': r.bookBalance,
      'Physical Cash': r.physicalCash,
      'Difference': r.difference,
      'Status': r.status,
      'Explanation': r.explanation || '',
      'Prepared By': r.preparedBy || '',
      'Reviewed By': r.reviewedBy || '',
      'Approved By': r.approvedBy || ''
    }));

    const ws = this.createSheetWithHeader('Cash Reconciliation', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash_Reconciliation");
    this.shareOrDownload(`AJ_Welfare_Cash_Recon_${fyStr}.xlsx`, wb);
  }

  static exportBankReconciliation(db: AppDatabaseState, recons: BankReconciliation[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = recons.map(r => ({
      'Reconciliation ID': r.id,
      'Financial Year': r.financialYearId,
      'Bank Account': r.bankAccountId,
      'Date From': r.statementDateFrom,
      'Date To': r.statementDateTo,
      'Book Opening': r.bookOpeningBalance,
      'Book Closing': r.bookClosingBalance,
      'Statement Opening': r.statementOpeningBalance || 0,
      'Statement Closing': r.statementClosingBalance || 0,
      'Matched': r.matchedAmount,
      'Book Only': r.bookOnlyAmount,
      'Bank Only': r.bankOnlyAmount,
      'Difference': r.difference,
      'Status': r.status,
      'Explanation': r.explanation || '',
      'Prepared By': r.preparedBy || '',
      'Approved By': r.approvedBy || ''
    }));

    const ws = this.createSheetWithHeader('Bank Reconciliation', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bank_Reconciliation");
    this.shareOrDownload(`AJ_Welfare_Bank_Recon_${fyStr}.xlsx`, wb);
  }
  
  static exportYearClosing(db: AppDatabaseState, closes: FinancialYear[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);
    
    const exportData = closes.filter(c => c.status === 'CLOSED').map(c => ({
      'Financial Year': c.yearCode,
      'Opening Cash': c.openingBalances?.cash || 0,
      'Opening Bank': c.openingBalances?.bank || 0,
      'Member Capital': c.openingBalances?.memberCapital || 0,
      'Loan Receivable': c.openingBalances?.loanReceivable || 0,
      'Investment': c.openingBalances?.investment || 0,
      'Welfare Fund': c.openingBalances?.welfareFund || 0,
      'Emergency Fund': c.openingBalances?.emergencyFund || 0,
      'Reserve Fund': c.openingBalances?.reserveFund || 0,
      'Retained Profit': c.openingBalances?.retainedProfit || 0,
      'Closed Date': c.closedAt || '',
      'Closed By': c.closedBy || '',
      'Validation Status': 'PASS'
    }));

    const ws = this.createSheetWithHeader('Year Closing', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Year_Closing");
    this.shareOrDownload(`AJ_Welfare_Year_Closing_${fyStr}.xlsx`, wb);
  }

  static exportLateFeeWaivers(db: AppDatabaseState, waivers: any[]) {
    const orgName = db.settings.orgName;
    const fyStr = this.getActiveFyStr(db);

    const exportData = waivers.map((w, idx) => ({
      'SL': idx + 1,
      'Waiver Date': w.waiverDate,
      'Member ID': w.memberId,
      'Member Name': w.memberName,
      'Collection Month': w.collectionMonth,
      'Calculated Late Fee': w.calculatedLateFee,
      'Waived Amount': w.waivedAmount,
      'Receipt No': w.receiptNo,
      'Approved By': w.approvedBy,
      'Reason / Remarks': w.reason || w.remarks,
      'Status': w.status
    }));

    const ws = this.createSheetWithHeader('Late Fee Waiver Register', orgName, fyStr, this.safeData(exportData));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Late_Fee_Waivers");
    this.shareOrDownload(`AJ_Welfare_Late_Fee_Waivers_${fyStr}.xlsx`, wb);
  }

  static exportToExcel(data: any[], filename: string, sheetName = 'Sheet1') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    this.shareOrDownload(`${filename}.xlsx`, wb);
  }
}

export const exportToExcel = (data: any[], filename: string, sheetName = 'Sheet1') => {
  ExcelService.exportToExcel(data, filename, sheetName);
};

