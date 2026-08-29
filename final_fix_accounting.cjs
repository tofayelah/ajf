const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

acc = acc.replace(
  /if \(isDateInClosedYear\(db, params\.processDate\)\) \{/,
  `if (isDateInClosedYear(params.processDate, db)) {`
);

acc = acc.replace(
  /const bank = currentDb\.bankAccounts\?\.find\(b => b\.accountId === params\.bankAccountId\);/,
  `const bank = currentDb.bankAccounts?.find(b => b.id === params.bankAccountId);`
);

acc = acc.replace(
  /accountNumberMasked: bank \? bank\.accountNo : "",/,
  `accountNumberMasked: bank ? bank.accountNumber : "",\n        transactionNo: voucherNo,\n        sourceType: "MEMBER_EXIT" as any,\n        sourceId: req.exitRequestId,`
);

// also fix AuditLog `remarks`
acc = acc.replace(
  /description: `Refund Processed for /g,
  `remarks: \`Refund Processed for `
);

acc = acc.replace(
  /description: `Service Charge \${req\.serviceChargeAmount}/g,
  `remarks: \`Service Charge \${req.serviceChargeAmount}`
);

fs.writeFileSync('src/services/accounting.ts', acc);
console.log('Fixed accounting.ts final issues');
