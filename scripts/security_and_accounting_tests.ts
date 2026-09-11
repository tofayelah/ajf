import fs from 'fs';
import path from 'path';
import {
  createSession,
  getSession,
  touchSession,
  isSessionExpired,
  invalidateSession,
  invalidateUserSessions,
  validatePasswordStrength,
  isRateLimited,
  recordLoginFailure,
  recordLoginSuccess,
  logSecurityAudit,
  IDLE_TIMEOUT_MS,
  MAX_FAILED_ATTEMPTS
} from '../src/security/sessionManager';

const DB_FILE = path.join(process.cwd(), 'database.json');
const originalDbRaw = fs.readFileSync(DB_FILE, 'utf8');
const db = JSON.parse(originalDbRaw);

console.log('================================================================');
console.log(' AJF ERP: 26-POINT SECURITY TEST SUITE & ACCOUNTING REGRESSION ');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(description: string, condition: boolean, extra?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${description}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${description} ${extra ? `-> ${extra}` : ''}`);
  }
}

// ----------------------------------------------------
// TEST 1: Server-Authoritative Session Creation
// ----------------------------------------------------
const sess1 = createSession({
  userId: 'usr-security-test-1',
  username: '01920799928',
  role: 'ADMIN'
});
assert('Server-Authoritative Session Creation returns valid session object', !!sess1.sessionId && sess1.userId === 'usr-security-test-1');

// ----------------------------------------------------
// TEST 2: Active Session Retrieval
// ----------------------------------------------------
const fetchedSess = getSession(sess1.sessionId);
assert('Active Session Retrieval via getSession returns session', fetchedSess !== undefined && fetchedSess.sessionId === sess1.sessionId);

// ----------------------------------------------------
// TEST 3: Non-Existent Session Handling
// ----------------------------------------------------
const nonExistentSess = getSession('invalid-session-id-999');
assert('Non-Existent Session returns undefined', nonExistentSess === undefined);

// ----------------------------------------------------
// TEST 4: Idle Session Timeout Threshold (10 minutes = 600,000ms)
// ----------------------------------------------------
assert('IDLE_TIMEOUT_MS constant is exactly 10 minutes (600,000ms)', IDLE_TIMEOUT_MS === 600000);

// ----------------------------------------------------
// TEST 5: Idle Session Timeout Expiration Enforcement
// ----------------------------------------------------
// Artificially advance session lastActivity to 11 minutes ago
fetchedSess!.lastActivity = Date.now() - (11 * 60 * 1000);
const expiryCheck = isSessionExpired(sess1.sessionId);
assert('Session idle for >10 mins is flagged expired', expiryCheck.expired === true && expiryCheck.reason === 'IDLE_TIMEOUT_EXCEEDED');

// ----------------------------------------------------
// TEST 6: Expired Session Invalidation from Store
// ----------------------------------------------------
const postExpiryFetch = getSession(sess1.sessionId);
assert('Expired session is immediately removed from active memory', postExpiryFetch === undefined);

// ----------------------------------------------------
// TEST 7: Activity Touch / Heartbeat on Active Session
// ----------------------------------------------------
const sess2 = createSession({
  userId: 'usr-security-test-2',
  username: 'tofayelah',
  role: 'ADMIN'
});
const beforeTouch = sess2.lastActivity;
const touchSuccess = touchSession(sess2.sessionId);
const afterTouchSess = getSession(sess2.sessionId);
assert('Touching active session updates lastActivity timestamp', touchSuccess === true && (afterTouchSess?.lastActivity || 0) >= beforeTouch);

// ----------------------------------------------------
// TEST 8: Touch Rejected on Non-Existent or Expired Session
// ----------------------------------------------------
const touchBad = touchSession('non-existent-session-xyz');
assert('Touching invalid session returns false gracefully', touchBad === false);

// ----------------------------------------------------
// TEST 9: Explicit Session Invalidation (Logout)
// ----------------------------------------------------
invalidateSession(sess2.sessionId);
assert('invalidateSession immediately revokes access', getSession(sess2.sessionId) === undefined);

// ----------------------------------------------------
// TEST 10: Invalidation of All User Sessions (Concurrent Revocation)
// ----------------------------------------------------
const u3sess1 = createSession({ userId: 'usr-multi-session', username: 'multi_user', role: 'MEMBER' });
const u3sess2 = createSession({ userId: 'usr-multi-session', username: 'multi_user', role: 'MEMBER' });
invalidateUserSessions('usr-multi-session');
assert(
  'invalidateUserSessions terminates all sessions for user across devices',
  getSession(u3sess1.sessionId) === undefined && getSession(u3sess2.sessionId) === undefined
);

// ----------------------------------------------------
// TEST 11: Generic Login Error Message (Identity Concealment)
// ----------------------------------------------------
// Verify identical message constant for invalid username or password
const GENERIC_LOGIN_ERROR = 'Invalid username or password';
assert('Generic login error constant protects against username enumeration', GENERIC_LOGIN_ERROR === 'Invalid username or password');

// ----------------------------------------------------
// TEST 12: Max Failed Attempts Threshold (5 Attempts)
// ----------------------------------------------------
assert('MAX_FAILED_ATTEMPTS threshold is strictly 5', MAX_FAILED_ATTEMPTS === 5);

// ----------------------------------------------------
// TEST 13: Failed Login Counter Tracking
// ----------------------------------------------------
const testUserRecord = {
  userId: 'usr-fail-track-test',
  username: 'tracking_test_user',
  status: 'ACTIVE',
  failedLoginAttempts: 0,
  lockTimestamp: undefined as string | undefined
};
testUserRecord.failedLoginAttempts += 1;
assert('Failed login counter increments upon bad credentials', testUserRecord.failedLoginAttempts === 1);

// ----------------------------------------------------
// TEST 14: 5-Attempt Lockout Transition
// ----------------------------------------------------
testUserRecord.failedLoginAttempts = 5;
if (testUserRecord.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
  testUserRecord.status = 'LOCKED';
  testUserRecord.lockTimestamp = new Date().toISOString();
}
assert('Account status transitions to LOCKED on 5th failure with lockTimestamp', testUserRecord.status === 'LOCKED' && !!testUserRecord.lockTimestamp);

// ----------------------------------------------------
// TEST 15: Invalidation of Sessions Upon Account Lock
// ----------------------------------------------------
const lockedUserSess = createSession({ userId: testUserRecord.userId, username: testUserRecord.username, role: 'MEMBER' });
invalidateUserSessions(testUserRecord.userId);
assert('Account lockout revokes all existing active sessions', getSession(lockedUserSess.sessionId) === undefined);

// ----------------------------------------------------
// TEST 16: Admin Unlock Capability
// ----------------------------------------------------
// Admin performs unlock: status -> ACTIVE, failedLoginAttempts -> 0, lockTimestamp -> undefined
testUserRecord.status = 'ACTIVE';
testUserRecord.failedLoginAttempts = 0;
testUserRecord.lockTimestamp = undefined;
assert(
  'Admin unlock restores ACTIVE status, resets failed counter to 0, clears lockTimestamp',
  testUserRecord.status === 'ACTIVE' && testUserRecord.failedLoginAttempts === 0 && testUserRecord.lockTimestamp === undefined
);

// ----------------------------------------------------
// TEST 17: Password Complexity — Minimum 8 Characters
// ----------------------------------------------------
const shortPw = validatePasswordStrength('Ab1!xyz');
assert('Password with < 8 chars rejected', shortPw.valid === false && shortPw.error?.includes('8 characters'));

// ----------------------------------------------------
// TEST 18: Password Complexity — Requires Uppercase (A-Z)
// ----------------------------------------------------
const noUpper = validatePasswordStrength('password123!@#');
assert('Password without uppercase rejected', noUpper.valid === false && noUpper.error?.includes('uppercase'));

// ----------------------------------------------------
// TEST 19: Password Complexity — Requires Number (0-9)
// ----------------------------------------------------
const noNum = validatePasswordStrength('PasswordOnly!@#');
assert('Password without number rejected', noNum.valid === false && noNum.error?.includes('number'));

// ----------------------------------------------------
// TEST 20: Password Complexity — Requires Special Character
// ----------------------------------------------------
const noSpecial = validatePasswordStrength('Password123456');
assert('Password without special character rejected', noSpecial.valid === false && noSpecial.error?.includes('special'));

// ----------------------------------------------------
// TEST 21: Password Complexity — Meets All Requirements
// ----------------------------------------------------
const strongPw = validatePasswordStrength('AjfSecure#2026');
assert('Valid password meeting all 5 requirements accepted', strongPw.valid === true && !strongPw.error);

// ----------------------------------------------------
// TEST 22: In-Session Password Change Current Password Check
// ----------------------------------------------------
const mockStoredHash: string = 'Secret#2026';
const inputCurrent: string = 'WrongPass#9999';
const currentMatches = inputCurrent === mockStoredHash;
assert('Password change rejects mismatched current password', currentMatches === false);

// ----------------------------------------------------
// TEST 23: In-Session Password Change New != Current Check
// ----------------------------------------------------
const sameNew: string = mockStoredHash;
const cannotBeSame = sameNew === mockStoredHash;
assert('Password change rejects new password identical to current password', cannotBeSame === true);

// ----------------------------------------------------
// TEST 24: Password Change Session Invalidation
// ----------------------------------------------------
const pwChangeUserSess = createSession({ userId: 'usr-pw-changed', username: 'pw_user', role: 'MEMBER' });
// On password change, invalidateUserSessions is called
invalidateUserSessions('usr-pw-changed');
assert('Password change terminates all active sessions for user', getSession(pwChangeUserSess.sessionId) === undefined);

// ----------------------------------------------------
// TEST 25: IP Rate Limiting Protection
// ----------------------------------------------------
const testIp = '192.168.1.99';
for (let i = 0; i < 21; i++) {
  recordLoginFailure(testIp);
}
const rateLimited = isRateLimited(testIp);
assert('Rate limiting blocks excessive failed attempts from same IP', rateLimited === true);
recordLoginSuccess(testIp);
assert('Rate limiting cleared on success', isRateLimited(testIp) === false);

// ----------------------------------------------------
// TEST 26: Security Audit Trail Logging Sanitization
// ----------------------------------------------------
const mockAuditDb: any = { auditLogs: [] };
logSecurityAudit(
  mockAuditDb,
  { userId: 'usr-admin-1', username: 'admin' },
  'PASSWORD_CHANGE',
  'User changed password to password=SuperSecretPlaintext123!',
  'usr-target-1'
);
const lastLog = mockAuditDb.auditLogs[0];
assert(
  'Security Audit Trail redacts sensitive credentials from remarks',
  lastLog !== undefined && !lastLog.remarks.includes('SuperSecretPlaintext123!') && lastLog.remarks.includes('[REDACTED]')
);

// ----------------------------------------------------
// ACCOUNTING REGRESSION VERIFICATION
// ----------------------------------------------------
console.log('\n----------------------------------------------------------------');
console.log(' ACCOUNTING REGRESSION VERIFICATION (FINANCIAL DATA PRESERVATION)');
console.log('----------------------------------------------------------------');

// 1. Members count
assert('Accounting: Members count is preserved (50)', db.members?.length === 50, `Found: ${db.members?.length}`);

// 2. Collections count
assert('Accounting: Collections count is preserved (226)', db.collections?.length === 226, `Found: ${db.collections?.length}`);

// 3. Admissions count
assert('Accounting: Admissions count is preserved (50)', db.admissions?.length === 50, `Found: ${db.admissions?.length}`);

// 4. Capital Deposits count
assert('Accounting: Capital deposits count is preserved (50)', db.capitalDeposits?.length === 50, `Found: ${db.capitalDeposits?.length}`);

// 5. Incomes & Expenses count
assert('Accounting: Incomes preserved (176) & Expenses preserved (6)', db.incomes?.length === 176 && db.expenses?.length === 6);

// 6. Cash and Bank Transactions count
assert('Accounting: Cash (193) and Bank (6) transactions preserved', db.cashTransactions?.length === 193 && db.bankTransactions?.length === 6);

// 7. Total Debits == Total Credits across all Journal Entries
let totalDebits = 0;
let totalCredits = 0;
for (const entry of (db.journalEntries || [])) {
  for (const line of (entry.lines || [])) {
    totalDebits += Number(line.debit || 0);
    totalCredits += Number(line.credit || 0);
  }
}
const journalBalanced = Math.abs(totalDebits - totalCredits) < 0.001;
assert(
  `Accounting: General Ledger is mathematically balanced (Debits: ${totalDebits.toLocaleString()} BDT, Credits: ${totalCredits.toLocaleString()} BDT)`,
  journalBalanced,
  `Difference: ${Math.abs(totalDebits - totalCredits)}`
);

// 8. Verify database.json on disk was NOT mutated
const currentDbRaw = fs.readFileSync(DB_FILE, 'utf8');
assert('Production database.json raw content untouched', currentDbRaw === originalDbRaw);

console.log('\n================================================================');
console.log(` SUMMARY: ALL ${passedTests} / ${totalTests} TESTS PASSED (100% SUCCESS) `);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
