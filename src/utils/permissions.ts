import { UserRole } from "../types";

export const PERMISSIONS = [
  'members.view', 'members.view_self', 'members.create', 'members.edit',
  'admission.view', 'admission.create',
  'capital.view', 'capital.create',
  'collection.view', 'collection.create', 'collection.cancel',
  'cashbook.view', 'cashbook.create',
  'bank.view', 'bank.create',
  'journal.view', 'ledger.view', 'trial_balance.view',
  'reports.view', 'financial_summary.view',
  'audit.view', 'reconciliation.view',
  'loan.view', 'loan.create', 'loan.repayment',
  'income.view', 'income.create',
  'expense.view', 'expense.create',
  'receipt.view',
  'member_ledger.view',
  'users.view', 'users.create', 'users.edit', 'users.disable', 'users.reset_password', 'users.assign_role', 'users.assign_permission',
  'settings.view',
  'database.reset', 'test_data.reset', 'migration.execute', 'migration.rollback', 'financial_record.cancel', 'financial_record.reverse'
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS], // ALL permissions
  ACCOUNTANT: [
    'members.view', 'members.create', 'members.edit',
    'admission.view', 'admission.create',
    'capital.view', 'capital.create',
    'collection.view', 'collection.create', 'collection.cancel',
    'cashbook.view', 'cashbook.create',
    'bank.view', 'bank.create',
    'journal.view', 'ledger.view', 'trial_balance.view',
    'reports.view', 'financial_summary.view',
    'audit.view', 'reconciliation.view',
    'loan.view', 'loan.create', 'loan.repayment',
    'income.view', 'income.create',
    'expense.view', 'expense.create',
    'receipt.view', 'member_ledger.view'
  ],
  COLLECTION_OFFICER: [
    'members.view',
    'collection.view', 'collection.create',
    'receipt.view',
    'financial_summary.view',
    'member_ledger.view'
  ],
  AUDITOR: [
    'members.view', 'admission.view', 'capital.view',
    'collection.view', 'cashbook.view', 'bank.view',
    'journal.view', 'ledger.view', 'trial_balance.view',
    'reports.view', 'financial_summary.view', 'audit.view',
    'reconciliation.view', 'loan.view', 'income.view',
    'expense.view', 'receipt.view', 'member_ledger.view'
  ],
  MEMBER: [
    'members.view_self', 'financial_summary.view', 'receipt.view', 'member_ledger.view'
  ]
};

export const hasPermission = (user: { role: UserRole, permissions?: Permission[] } | null | undefined, permission: Permission): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  
  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  const explicitPerms = user.permissions || [];
  
  return rolePerms.includes(permission) || explicitPerms.includes(permission);
};
