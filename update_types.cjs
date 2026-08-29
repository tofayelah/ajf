const fs = require('fs');

let content = fs.readFileSync('src/types/index.ts', 'utf8');

// Update ExitType
content = content.replace(
  /export type ExitType = "NORMAL" \| "EARLY";/,
  `export type ExitType = "NORMAL" | "EARLY" | "DEATH_SETTLEMENT";`
);

// Update MemberExitRequest
content = content.replace(
  /export interface MemberExitRequest \{[\s\S]*?status: "EXIT_REQUESTED" \| "UNDER_REVIEW" \| "APPROVED" \| "REFUNDED" \| "EXITED" \| "REJECTED";\n\}/,
  `export interface MemberExitRequest {
  exitRequestId: string;
  memberId: string;
  requestDate: string;
  exitType: ExitType;
  exitReason: string;
  
  // Death specific
  dateOfDeath?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeNid?: string;
  nomineeMobile?: string;
  nomineeAddress?: string;
  eligibleBenefitAmount?: number;
  netSettlementAmount?: number;

  // Financials
  membershipTenureYears: number;
  membershipTenureMonths: number;
  memberCapital: number;
  totalDeposits: number;
  outstandingDue: number;
  outstandingLoan: number;
  eligibleRefundAmount: number;
  serviceChargePercentage: number;
  serviceChargeAmount: number;
  netRefundAmount: number;
  
  refundVoucherNo?: string;
  refundPaymentMethod?: PaymentMethod;
  refundBankAccountId?: string;
  refundPaymentReference?: string;
  refundProcessDate?: string;

  userId: string;
  userName: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  rejectionReason?: string;

  // Status
  status: "NORMAL_EXIT_REQUESTED" | "EARLY_EXIT_REQUESTED" | "DEATH_REPORTED" | "UNDER_REVIEW" | "APPROVED" | "REFUND_PROCESSING" | "REFUNDED" | "SETTLED" | "EXITED" | "DECEASED" | "REJECTED";
}`
);

// Update AuditAction
content = content.replace(
  /export type AuditAction =/,
  `export type AuditAction = 
  | "NORMAL_EXIT_REQUESTED"
  | "NORMAL_EXIT_REVIEWED"
  | "NORMAL_EXIT_APPROVED"
  | "NORMAL_EXIT_REJECTED"
  | "NORMAL_EXIT_REFUNDED"
  | "EARLY_EXIT_REQUESTED"
  | "EARLY_EXIT_REVIEWED"
  | "EARLY_EXIT_APPROVED"
  | "EARLY_EXIT_REJECTED"
  | "EARLY_EXIT_REFUNDED"
  | "DEATH_REPORTED"
  | "DEATH_SETTLEMENT_REVIEWED"
  | "DEATH_SETTLEMENT_APPROVED"
  | "DEATH_SETTLEMENT_REJECTED"
  | "DEATH_SETTLEMENT_COMPLETED"`
);

fs.writeFileSync('src/types/index.ts', content);
console.log("Types updated.");
