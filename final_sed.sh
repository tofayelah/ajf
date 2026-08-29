sed -i 's/status: "ACTIVE" as any/status: "ACTIVE" as any, updatedAt: new Date().toISOString()/' src/services/accounting.ts
sed -i 's/status: "ACTIVE"/status: "ACTIVE", journalNo: `REV-${Date.now()}`, reference: `REV-${Date.now()}`/' src/services/accounting.ts
sed -i 's/approvalStatus: c.approvalStatus === "DRAFT" ? "POSTED" : c.approvalStatus/approvalStatus: (c.approvalStatus === "DRAFT" ? "POSTED" : c.approvalStatus) as ExpenseStatus/' src/services/accounting.ts
