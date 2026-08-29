const fs = require('fs');

let content = fs.readFileSync('src/types/index.ts', 'utf8');

// Update MemberExitRequest
content = content.replace(
  /status: "EXIT_REQUESTED" \| "UNDER_REVIEW" \| "APPROVED" \| "REFUNDED" \| "EXITED" \| "REJECTED";/,
  `status: "EXIT_REQUESTED" | "UNDER_REVIEW" | "APPROVED" | "REFUNDED" | "EXITED" | "REJECTED" | "NORMAL_EXIT_REQUESTED" | "EARLY_EXIT_REQUESTED" | "DEATH_REPORTED" | "SETTLED";
  
  // Death specific
  dateOfDeath?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeNid?: string;
  nomineeMobile?: string;
  nomineeAddress?: string;
  eligibleBenefitAmount?: number;
  netSettlementAmount?: number;
  
  userId?: string;
  userName?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  refundPaymentMethod?: string;
  refundBankAccountId?: string;
  refundPaymentReference?: string;
  refundProcessDate?: string;`
);

fs.writeFileSync('src/types/index.ts', content);
console.log('Fixed types');
