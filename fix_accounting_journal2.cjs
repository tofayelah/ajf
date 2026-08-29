const fs = require('fs');

let acc = fs.readFileSync('src/services/accounting.ts', 'utf8');

const targetFunction = `  static processMemberExitRefund(
    db: AppDatabaseState,
    params: {
      exitRequestId: string;
      paymentMethod: PaymentMethod;
      bankAccountId?: string;
      paymentReference?: string;
      processDate: string;
      userId: string;
      userName: string;
    }
  ) {`;

// Let's just find the processMemberExitRefund and replace the entire method!

let methodStartIndex = acc.indexOf(targetFunction);
if (methodStartIndex !== -1) {
   let endIndex = acc.indexOf('  //', methodStartIndex + 10);
   if (endIndex === -1) endIndex = acc.length; // end of file maybe? Wait, let's find the closing brace.
   // I'll just write a script to replace it.
}
