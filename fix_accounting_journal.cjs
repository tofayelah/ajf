const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

acc = acc.replace(
  /accountId: "3000", \/\/ Member Capital \(Share\)\n\s*\/\/[^\n]*\n\s*debit: req\.eligibleRefundAmount,\n\s*credit: 0/g,
  `accountId: "3000",
      accountName: "Member Capital (Share)",
      journalEntryId: "",
      debit: req.eligibleRefundAmount,
      credit: 0`
);

acc = acc.replace(
  /accountId: cashBankAccountId,\n\s*debit: 0,\n\s*credit: req\.netRefundAmount/g,
  `accountId: cashBankAccountId,
      accountName: params.paymentMethod === "Cash" ? "Cash in Hand" : "Bank Account",
      journalEntryId: "",
      debit: 0,
      credit: req.netRefundAmount`
);

acc = acc.replace(
  /accountId: "4110",[^\n]*\n\s*debit: 0,\n\s*credit: req\.serviceChargeAmount/g,
  `accountId: "4110",
         accountName: "Service Charge Income",
         journalEntryId: "",
         debit: 0,
         credit: req.serviceChargeAmount`
);

// Fix cash and bank transaction missing `id` if they do miss it? Wait, cashTransaction had id, but what's missing?
// error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'CashTransaction'.
// CashTransaction uses `transactionId`? Let's check.
