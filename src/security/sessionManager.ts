// Server-authoritative Session, Lockout, and Password Security Module
// Enforces 10-minute idle session timeout, failed login tracking, and strict password requirements.

export const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes = 600,000 ms
export const MAX_FAILED_ATTEMPTS = 5;

export interface ActiveSession {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  linkedMemberId?: string;
  createdAt: number;
  lastActivity: number;
}

// In-memory store for active sessions
const activeSessions = new Map<string, ActiveSession>();
const userSessionsMap = new Map<string, Set<string>>();

// In-memory store for IP-based rate limiting (protection against brute force)
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();

/**
 * Creates and registers a new authenticated session with an initial idle timer.
 */
export function createSession(user: {
  userId: string;
  username: string;
  role: string;
  linkedMemberId?: string;
}): ActiveSession {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const session: ActiveSession = {
    sessionId,
    userId: user.userId,
    username: user.username,
    role: user.role,
    linkedMemberId: user.linkedMemberId,
    createdAt: now,
    lastActivity: now
  };

  activeSessions.set(sessionId, session);

  if (!userSessionsMap.has(user.userId)) {
    userSessionsMap.set(user.userId, new Set());
  }
  userSessionsMap.get(user.userId)!.add(sessionId);

  return session;
}

/**
 * Retrieves a session by its ID.
 */
export function getSession(sessionId: string): ActiveSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Resets the idle activity timer for a given session when legitimate authenticated activity occurs.
 */
export function touchSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const now = Date.now();
  // If already expired, do not touch
  if (now - session.lastActivity > IDLE_TIMEOUT_MS) {
    invalidateSession(sessionId);
    return false;
  }

  session.lastActivity = now;
  return true;
}

/**
 * Checks whether a session has expired due to 10 minutes of inactivity.
 */
export function isSessionExpired(sessionId: string): { expired: boolean; session?: ActiveSession; reason?: string } {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { expired: true, reason: 'SESSION_NOT_FOUND' };
  }

  const now = Date.now();
  const idleTime = now - session.lastActivity;
  if (idleTime > IDLE_TIMEOUT_MS) {
    invalidateSession(sessionId);
    return { expired: true, session, reason: 'IDLE_TIMEOUT_EXCEEDED' };
  }

  return { expired: false, session };
}

/**
 * Invalidates and removes a specific session.
 */
export function invalidateSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    const userSessions = userSessionsMap.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        userSessionsMap.delete(session.userId);
      }
    }
    activeSessions.delete(sessionId);
  }
}

/**
 * Invalidates all active sessions for a specific user (e.g. on password change or account lock).
 */
export function invalidateUserSessions(userId: string): void {
  const sessionIds = userSessionsMap.get(userId);
  if (sessionIds) {
    for (const sid of sessionIds) {
      activeSessions.delete(sid);
    }
    userSessionsMap.delete(userId);
  }
}

/**
 * Validates password strength per the mandatory policy:
 * - Minimum 8 characters
 * - At least 1 uppercase English letter (A-Z)
 * - At least 1 number (0-9)
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 uppercase letter (A-Z)' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 number (0-9)' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 special character' };
  }
  return { valid: true };
}

/**
 * IP rate limiting helper to prevent rapid automated brute-force attacks.
 */
export function isRateLimited(ip: string): boolean {
  const record = ipRateLimits.get(ip);
  if (!record) return false;

  const now = Date.now();
  if (record.blockedUntil && now < record.blockedUntil) {
    return true;
  }

  // Reset window after 5 minutes
  if (now - record.firstAttemptAt > 5 * 60 * 1000) {
    ipRateLimits.delete(ip);
    return false;
  }

  return false;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const record = ipRateLimits.get(ip) || { attempts: 0, firstAttemptAt: now };

  if (now - record.firstAttemptAt > 5 * 60 * 1000) {
    record.attempts = 1;
    record.firstAttemptAt = now;
    delete record.blockedUntil;
  } else {
    record.attempts += 1;
  }

  // If more than 20 consecutive failures from same IP within 5 mins, block for 5 mins
  if (record.attempts >= 20) {
    record.blockedUntil = now + 5 * 60 * 1000;
  }

  ipRateLimits.set(ip, record);
}

export function recordLoginSuccess(ip: string): void {
  ipRateLimits.delete(ip);
}





/**
 * Safely appends an audit log entry to database auditLogs without exposing sensitive secrets.
 */
export function logSecurityAudit(
  db: any,
  actor: { userId?: string; username?: string; fullName?: string } | null,
  action: string,
  remarks: string,
  recordId?: string
): void {
  if (!db) return;
  if (!Array.isArray(db.auditLogs)) {
    db.auditLogs = [];
  }

  // Strict safety filter: ensure remarks never contains plaintext passwords, secrets, hashes, or session tokens
  const sanitizedRemarks = String(remarks || '')
    .replace(/password[:=]\s*\S+/gi, 'password:[REDACTED]')
    .replace(/secret[:=]\s*\S+/gi, 'secret:[REDACTED]')
    .replace(/recoverySecret[:=]\s*\S+/gi, 'recoverySecret:[REDACTED]')
    .replace(/token[:=]\s*\S+/gi, 'token:[REDACTED]')
    .replace(/cookie[:=]\s*\S+/gi, 'cookie:[REDACTED]')
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, '[HASH_REDACTED]');

  db.auditLogs.push({
    auditId: `AL-SEC-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    userId: actor?.userId || 'SYSTEM',
    userName: actor?.fullName || actor?.username || 'SYSTEM',
    dateTime: new Date().toISOString(),
    module: 'SECURITY',
    action,
    recordId: recordId || actor?.userId || 'SYSTEM',
    remarks: sanitizedRemarks
  });
}
