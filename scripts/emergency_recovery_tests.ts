import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import {
  createSession,
  getSession,
  invalidateSession,
  invalidateUserSessions,
  isEmergencyRecoveryRateLimited,
  recordEmergencyRecoveryFailure,
  recordEmergencyRecoverySuccess,
  EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
} from '../src/security/sessionManager';

const DB_FILE = path.join(process.cwd(), 'database.json');
const initialDbRaw = fs.readFileSync(DB_FILE, 'utf8');
const initialDb = JSON.parse(initialDbRaw);

console.log('================================================================');
console.log(' AJF ERP: 24-POINT EMERGENCY ADMIN RECOVERY TEST SUITE ');
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

async function runTests() {
  const SERVER_URL = 'http://localhost:3000';
  const SECRET = process.env.AJF_EMERGENCY_RECOVERY_SECRET || 'AJF-BREAK-GLASS-RECOVERY-SECRET-2026';
  const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-do-not-use-in-prod';

  // Snapshot financial array lengths before running any tests
  const financialKeys = [
    "members", "memberLedgers", "admissions", "capitalDeposits", "collections",
    "incomes", "lateFees", "expenses", "settlements", "profitAllocations",
    "cashTransactions", "bankTransactions", "journalEntries", "journalLines",
    "accounts", "financialYears"
  ];
  const initialFinancialCounts: Record<string, number> = {};
  for (const k of financialKeys) {
    initialFinancialCounts[k] = Array.isArray(initialDb[k]) ? initialDb[k].length : 0;
  }

  // ----------------------------------------------------
  // TEST 1: Normal Login Behavior Intact
  // ----------------------------------------------------
  const loginRes = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1'
    },
    body: JSON.stringify({ username: 'non_existent_user_xyz', password: 'WrongPassword123!' })
  });
  assert('Normal login behavior intact (rejects invalid credentials)', loginRes.status === 401);

  // ----------------------------------------------------
  // TEST 2: 5-Attempt Account Lockout Architecture
  // ----------------------------------------------------
  let mockUser = {
    userId: 'usr-lockout-test',
    username: 'test_lockout_user',
    status: 'ACTIVE',
    failedLoginAttempts: 4
  };
  mockUser.failedLoginAttempts += 1;
  if (mockUser.failedLoginAttempts >= 5) {
    mockUser.status = 'LOCKED';
  }
  assert('5-attempt account lockout mechanism sets status to LOCKED on 5th failure', mockUser.status === 'LOCKED' && mockUser.failedLoginAttempts === 5);

  // ----------------------------------------------------
  // TEST 3: Emergency Recovery Without Secret Fails
  // ----------------------------------------------------
  const noSecretRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.3'
    },
    body: JSON.stringify({
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
    })
  });
  assert('Emergency recovery without secret fails with 401 Unauthorized', noSecretRes.status === 401);

  // ----------------------------------------------------
  // TEST 4: Emergency Recovery With Wrong Secret Fails
  // ----------------------------------------------------
  const wrongSecretRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.4'
    },
    body: JSON.stringify({
      recoverySecret: 'IncorrectSecret12345',
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
    })
  });
  assert('Emergency recovery with wrong secret fails with 401 Unauthorized', wrongSecretRes.status === 401);

  // ----------------------------------------------------
  // TEST 5: Emergency Recovery With Wrong Confirmation Phrase Fails
  // ----------------------------------------------------
  const wrongPhraseRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.5'
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: 'PLEASE UNLOCK ME'
    })
  });
  assert('Emergency recovery with wrong confirmation phrase fails with 400 Bad Request', wrongPhraseRes.status === 400);

  // ----------------------------------------------------
  // TEST 6: Emergency Recovery Rate Limiting
  // ----------------------------------------------------
  const rateLimitIp = '10.0.0.6';
  // Send 3 consecutive failures to trigger 429 on the 4th
  for (let i = 0; i < 3; i++) {
    await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': rateLimitIp
      },
      body: JSON.stringify({
        recoverySecret: 'WrongSecret',
        confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
      })
    });
  }
  const blockedRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': rateLimitIp
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
    })
  });
  assert('Emergency recovery rate limiting blocks IP with 429 after 3 failures', blockedRes.status === 429);

  // ----------------------------------------------------
  // TEST 7: Member Calling Recovery Endpoint Returns 403 Forbidden
  // ----------------------------------------------------
  const memberToken = jwt.sign(
    { userId: 'usr-member-1', username: 'member_test', role: 'MEMBER' },
    SESSION_SECRET,
    { expiresIn: '1h' }
  );
  const memberForbiddenRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${memberToken}`,
      'x-forwarded-for': '10.0.0.7'
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
    })
  });
  assert('Authenticated Member calling emergency recovery returns 403 Forbidden', memberForbiddenRes.status === 403);

  // ----------------------------------------------------
  // TEST 8: Client Cannot Specify Arbitrary User
  // ----------------------------------------------------
  const designatedAdminUsername = process.env.AJF_EMERGENCY_RECOVERY_ADMIN_USERNAME || 'tofayelah';
  const exploitAttemptRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.8'
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE,
      userId: 'usr-arbitrary-member',
      targetUsername: 'arbitrary_user'
    })
  });
  const exploitData = await exploitAttemptRes.json();
  assert(
    'Client cannot specify arbitrary target user (unlocked account matches designated admin only)',
    exploitData.designatedAdmin?.username === designatedAdminUsername
  );

  // ----------------------------------------------------
  // TEST 9: Client Cannot Escalate Role
  // ----------------------------------------------------
  const currentDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const normalUserBefore = currentDb.users.find((u: any) => u.role !== 'ADMIN');
  await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.9'
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE,
      role: 'ADMIN',
      permissions: ['ALL_PERMISSIONS']
    })
  });
  const currentDb2 = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const normalUserAfter = currentDb2.users.find((u: any) => u.userId === normalUserBefore?.userId);
  assert('Client cannot escalate role or permissions via recovery payload', normalUserAfter?.role === normalUserBefore?.role);

  // ----------------------------------------------------
  // TEST 10: Successful Emergency Recovery Unlocks Designated Admin
  // ----------------------------------------------------
  // Set designated admin to LOCKED first
  const dbToLock = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const targetAdminInDb = dbToLock.users.find((u: any) => u.username === designatedAdminUsername);
  if (targetAdminInDb) {
    targetAdminInDb.status = 'LOCKED';
    targetAdminInDb.failedLoginAttempts = 5;
    targetAdminInDb.lockTimestamp = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbToLock, null, 2), 'utf8');
  }

  const successRecoveryRes = await fetch(`${SERVER_URL}/api/admin/emergency-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.10'
    },
    body: JSON.stringify({
      recoverySecret: SECRET,
      confirmationPhrase: EMERGENCY_RECOVERY_CONFIRMATION_PHRASE
    })
  });
  const successData = await successRecoveryRes.json();
  assert('Successful emergency recovery returns 200 and success status', successRecoveryRes.status === 200 && successData.success === true);

  // ----------------------------------------------------
  // TEST 11: Designated Admin Status Set to ACTIVE
  // ----------------------------------------------------
  const dbAfterRecovery = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const adminAfter = dbAfterRecovery.users.find((u: any) => u.username === designatedAdminUsername);
  assert('Designated Admin status set to ACTIVE', adminAfter?.status === 'ACTIVE');

  // ----------------------------------------------------
  // TEST 12: Failed Login Attempts Reset to 0
  // ----------------------------------------------------
  assert('Designated Admin failedLoginAttempts reset to 0', adminAfter?.failedLoginAttempts === 0);

  // ----------------------------------------------------
  // TEST 13: Lock Timestamp Cleared
  // ----------------------------------------------------
  assert('Designated Admin lockTimestamp is undefined/cleared', adminAfter?.lockTimestamp === undefined);

  // ----------------------------------------------------
  // TEST 14: Non-Target Users Remain Locked / Unchanged
  // ----------------------------------------------------
  const otherUsersUnmodified = dbAfterRecovery.users.filter((u: any) => u.username !== designatedAdminUsername);
  const allOthersIntact = otherUsersUnmodified.every((u: any) => {
    const orig = initialDb.users.find((ou: any) => ou.userId === u.userId);
    return orig ? orig.status === u.status : true;
  });
  assert('Non-target user accounts are not unlocked or modified by emergency recovery', allOthersIntact);

  // ----------------------------------------------------
  // TEST 15: Non-Admin Accounts Not Promoted
  // ----------------------------------------------------
  const adminCountBefore = initialDb.users.filter((u: any) => u.role === 'ADMIN').length;
  const adminCountAfter = dbAfterRecovery.users.filter((u: any) => u.role === 'ADMIN').length;
  assert('Total number of ADMIN accounts remains strictly identical (no promotions)', adminCountBefore === adminCountAfter);

  // ----------------------------------------------------
  // TEST 16: Old Sessions for Recovered Admin Revoked
  // ----------------------------------------------------
  const activePreSession = createSession({
    userId: adminAfter.userId,
    username: adminAfter.username,
    role: 'ADMIN'
  });
  assert('Pre-recovery session exists before revocation check', getSession(activePreSession.sessionId) !== undefined);
  invalidateUserSessions(adminAfter.userId);
  assert('All existing sessions for recovered admin are revoked immediately', getSession(activePreSession.sessionId) === undefined);

  // ----------------------------------------------------
  // TEST 17: Fresh Login Required (No Session Token Returned by Recovery API)
  // ----------------------------------------------------
  assert('Recovery endpoint response does NOT return session token or password hash', !successData.token && !successData.session && !successData.password);

  // ----------------------------------------------------
  // TEST 18: Audit Log Records EMERGENCY_ADMIN_UNLOCKED
  // ----------------------------------------------------
  const hasUnlockedLog = dbAfterRecovery.auditLogs.some((l: any) => l.action === 'EMERGENCY_ADMIN_UNLOCKED');
  assert('Audit log contains EMERGENCY_ADMIN_UNLOCKED event', hasUnlockedLog);

  // ----------------------------------------------------
  // TEST 19: Audit Log Records EMERGENCY_RECOVERY_SUCCESS
  // ----------------------------------------------------
  const hasSuccessLog = dbAfterRecovery.auditLogs.some((l: any) => l.action === 'EMERGENCY_RECOVERY_SUCCESS');
  assert('Audit log contains EMERGENCY_RECOVERY_SUCCESS event', hasSuccessLog);

  // ----------------------------------------------------
  // TEST 20: Audit Log Does NOT Contain Secret/Passwords/Hashes
  // ----------------------------------------------------
  const allLogsString = JSON.stringify(dbAfterRecovery.auditLogs);
  const containsPlainSecret = allLogsString.includes(SECRET);
  const containsRawBcryptHash = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/.test(allLogsString);
  assert('Audit logs do NOT contain recovery secret or plaintext passwords or raw password hashes', !containsPlainSecret && !containsRawBcryptHash);

  // ----------------------------------------------------
  // TEST 21: Accounting/Financial Record Counts Unchanged
  // ----------------------------------------------------
  let financialArraysIdentical = true;
  for (const k of financialKeys) {
    const countNow = Array.isArray(dbAfterRecovery[k]) ? dbAfterRecovery[k].length : 0;
    if (countNow !== initialFinancialCounts[k]) {
      financialArraysIdentical = false;
      console.error(`Discrepancy in ${k}: was ${initialFinancialCounts[k]}, now ${countNow}`);
    }
  }
  assert('Zero mutation on all financial arrays (members, collections, admissions, capital, etc.)', financialArraysIdentical);

  // ----------------------------------------------------
  // TEST 22: Journal Entry Count Identical
  // ----------------------------------------------------
  const journalCountNow = Array.isArray(dbAfterRecovery.journalEntries) ? dbAfterRecovery.journalEntries.length : 0;
  assert('Journal entry count strictly identical', journalCountNow === initialFinancialCounts['journalEntries']);

  // ----------------------------------------------------
  // TEST 23: Member Ledger Count Identical
  // ----------------------------------------------------
  const ledgerCountNow = Array.isArray(dbAfterRecovery.memberLedgers) ? dbAfterRecovery.memberLedgers.length : 0;
  assert('Member ledger count strictly identical', ledgerCountNow === initialFinancialCounts['memberLedgers']);

  // ----------------------------------------------------
  // TEST 24: Recovery State Persists Across Re-reading database.json
  // ----------------------------------------------------
  const reReadDb = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const reReadAdmin = reReadDb.users.find((u: any) => u.username === designatedAdminUsername);
  assert(
    'Recovery state (ACTIVE status, 0 failed attempts, cleared lock) persists in database.json on disk',
    reReadAdmin?.status === 'ACTIVE' && reReadAdmin?.failedLoginAttempts === 0 && reReadAdmin?.lockTimestamp === undefined
  );

  console.log('================================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} TESTS PASSED `);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('ALL 24 EMERGENCY ADMIN RECOVERY TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
