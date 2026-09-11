import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { isSessionExpired, touchSession, invalidateSession, createSession, getSession } from './security/sessionManager';

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'fallback-secret-for-development-only-do-not-use-in-prod';
}

const DB_FILE = path.join(process.cwd(), 'database.json');

export const requireAuth = async (req: any, res: any, next: any) => {
  let token = req.cookies?.token;
  if (!token && req.headers?.authorization) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized: No session token' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, getSessionSecret());
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session payload' });
  }

  const sessionId = decoded.sessionId || `user_${decoded.userId}`;

  // Check if this session is expired or not registered yet
  const sessionCheck = isSessionExpired(sessionId);
  if (sessionCheck.expired) {
    if (sessionCheck.reason === 'IDLE_TIMEOUT_EXCEEDED') {
      return res.status(401).json({
        error: 'Your session has expired due to inactivity. Please login again.',
        code: 'SESSION_EXPIRED',
        expired: true
      });
    }
    // If not found in memory (e.g. server restart or first token use), register it with current timestamp
    createSession({
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      linkedMemberId: decoded.linkedMemberId
    });
  }

  // Ensure the account in the database is not LOCKED or DISABLED
  try {
    if (fs.existsSync(DB_FILE)) {
      const dbData = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(dbData);
      const user = db.users?.find((u: any) => u.userId === decoded.userId);
      if (user) {
        if (user.status === 'LOCKED') {
          invalidateSession(sessionId);
          return res.status(401).json({
            error: 'Your account is locked. Please contact an administrator.',
            code: 'ACCOUNT_LOCKED'
          });
        }
        if (user.status !== 'ACTIVE') {
          invalidateSession(sessionId);
          return res.status(401).json({
            error: 'Account is inactive. Please contact an administrator.',
            code: 'ACCOUNT_INACTIVE'
          });
        }
      }
    }
  } catch (e) {
    // If DB read fails, fall through safely
  }

  // Legitimate authenticated activity resets the idle timer!
  touchSession(sessionId);
  req.user = decoded;
  req.sessionId = sessionId;
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }
    next();
  };
};

export const requirePermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    // In this basic implementation, we will map roles to permissions since there isn't a robust permissions table yet.
    const role = req.user?.role;
    let hasPermission = false;
    
    if (role === 'ADMIN') hasPermission = true; // Admin has all permissions
    
    // Some basic permission mapping
    if (permission === 'database.sync' && role === 'ADMIN') hasPermission = true;
    
    if (!hasPermission) {
      return res.status(403).json({ error: `Forbidden: Missing permission ${permission}` });
    }
    next();
  };
};

export const requireMemberOwnership = (memberIdParamKey: string = 'memberId') => {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const role = req.user.role;
    if (role !== 'MEMBER') {
      return next(); // Non-members bypass ownership check to their role/permission handlers
    }
    
    const linkedMemberId = req.user.linkedMemberId;
    if (!linkedMemberId) {
      return res.status(403).json({ error: 'Forbidden: No linked member profile associated with this account' });
    }
    
    // Extract and inspect requested member ID from params, query, and body to prevent tampering
    const paramMemberId = req.params?.[memberIdParamKey] || req.params?.memberId;
    const queryMemberId = req.query?.[memberIdParamKey] || req.query?.memberId;
    const bodyMemberId = req.body?.[memberIdParamKey] || req.body?.memberId;

    if (paramMemberId && paramMemberId !== linkedMemberId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other member data' });
    }

    if (queryMemberId && queryMemberId !== linkedMemberId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other member data' });
    }

    if (bodyMemberId && bodyMemberId !== linkedMemberId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other member data' });
    }

    const effectiveMemberId = paramMemberId || queryMemberId || bodyMemberId || linkedMemberId;
    if (effectiveMemberId !== linkedMemberId) {
      return res.status(403).json({ error: 'Forbidden: Cannot access other member data' });
    }
    
    next();
  };
};
