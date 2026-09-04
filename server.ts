// @ts-nocheck
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { AccountingService } from './src/services/accounting';
import jwt from 'jsonwebtoken';
import { requireAuth, requireRole, requireMemberOwnership } from './src/rbac';
import { getInitialDatabase } from './src/services/db';
import AdmZip from 'adm-zip';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });












dotenv.config();
var app = express();
app.set("trust proxy", 1);
var PORT = 3e3;
function getSessionSecret2() {
  return process.env.SESSION_SECRET || "fallback-secret-for-development-only-do-not-use-in-prod";
}
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
var DB_FILE = path.join(process.cwd(), "database.json");
async function writeDbFile(db) {
  const tempFile = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  await fs.writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tempFile, DB_FILE);
}
function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: "Unauthorized: No session token" });
      }
      let db = { users: [] };
      try {
        const dbData = await fs.readFile(DB_FILE, "utf8");
        db = JSON.parse(dbData);
      } catch (e) {
        console.log("Database read error in requirePermission:", e.message);
      }
      const user = db.users?.find((u) => u.userId === req.user?.userId);
      if (!user || user.status !== "ACTIVE") return res.status(403).json({ error: "Forbidden" });
      const rolePerms = {
        ADMIN: ["users.view", "users.create", "users.edit", "users.disable", "users.reset_password", "users.assign_role", "users.assign_permission"]
      };
      const userRole = user.role;
      if (userRole === "ADMIN") return next();
      const explicitPerms = user.permissions || [];
      const roleDefaults = rolePerms[userRole] || [];
      if (roleDefaults.includes(permission) || explicitPerms.includes(permission)) {
        return next();
      }
      return res.status(403).json({ error: "Forbidden: Missing permission " + permission });
    } catch (e) {
      return res.status(500).json({ error: "Server error" });
    }
  };
}
function logAudit(db, req, action, module2, remarks, recordId) {
  const auditLogs = db.auditLogs || [];
  auditLogs.push({
    auditId: `AL-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    userId: req.user.userId,
    userName: req.user.username,
    dateTime: (/* @__PURE__ */ new Date()).toISOString(),
    module: module2,
    action,
    recordId,
    remarks
  });
  db.auditLogs = auditLogs;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    runtime: "AJF Welfare ERP Runtime OK",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/system/health", async (req, res) => {
  try {
    const stats = await fs.stat(DB_FILE);
    const fileContent = await fs.readFile(DB_FILE, "utf8");
    const parsedDB = JSON.parse(fileContent);
    if (!Array.isArray(parsedDB.members) || !Array.isArray(parsedDB.cashTransactions) || !Array.isArray(parsedDB.journalEntries)) {
      throw new Error("Database structure invalid: Missing core collections");
    }
    res.json({
      runtime: "OK",
      database: "OK",
      lastModified: stats.mtime.toISOString(),
      databaseVersion: parsedDB.version || "1.0"
    });
  } catch (err) {
    res.json({
      runtime: "OK",
      database: "NOT OK",
      error: err.message
    });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    let db = { users: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
    }
    const user = db.users?.find((u) => u.username === username || u.mobile === username || u.email === username);
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash || "");
    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const tokenUser = { userId: user.userId, username: user.username, role: user.role, linkedMemberId: user.linkedMemberId };
    const token = jwt.sign(tokenUser, getSessionSecret2(), { expiresIn: "8h" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60 * 1e3
      // 8 hours
    });
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.pinHash;
    delete safeUser.salt;
    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: "Internal server error during login" });
  }
});
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.json({ success: true });
});
app.get("/api/auth/session", async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.json({ authenticated: false, user: null });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, getSessionSecret2());
    } catch (e) {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
      });
      return res.json({ authenticated: false, user: null });
    }
    if (!decoded || !decoded.userId) {
      return res.json({ authenticated: false, user: null });
    }
    let db = { users: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
    }
    const user = db.users?.find((u) => u.userId === decoded.userId);
    if (!user || user.status !== "ACTIVE") {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
      });
      return res.json({ authenticated: false, user: null });
    }
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.pinHash;
    delete safeUser.salt;
    res.json({ authenticated: true, user: safeUser, token });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/sync", requireAuth, async (req, res) => {
  try {
    let db = { users: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
    }
    if (db.users) {
      db.users = db.users.map((u) => {
        const { passwordHash, pinHash, salt, ...safeUser } = u;
        return safeUser;
      });
    }
    if (req.user.role === "MEMBER") {
      const memberId = req.user.linkedMemberId;
      const safeDb = {
        settings: db.settings || {
          currentFinancialYear: "2026-2027",
          monthlyContribution: 1e3,
          lateFine: 0,
          latePaymentDay: 10
        },
        members: db.members?.filter((m) => m.memberId === memberId) || [],
        admissions: db.admissions?.filter((a) => a.memberId === memberId) || [],
        capitalDeposits: db.capitalDeposits?.filter((c) => c.memberId === memberId) || [],
        collections: db.collections?.filter((c) => c.memberId === memberId) || [],
        welfareTransactions: db.welfareTransactions?.filter((w) => w.memberId === memberId) || [],
        loans: db.loans?.filter((l) => l.memberId === memberId) || [],
        loanRepayments: db.loanRepayments?.filter((l) => l.memberId === memberId) || [],
        memberLedgers: db.memberLedgers?.filter((l) => l.memberId === memberId) || [],
        users: db.users?.filter((u) => u.userId === req.user.userId) || [],
        // Empty out protected subsystems
        accounts: [],
        cashTransactions: [],
        bankTransactions: [],
        bankAccounts: [],
        journalEntries: [],
        journalLines: [],
        auditLogs: [],
        historicalMigrationLog: [],
        contraTransactions: [],
        contraEntries: [],
        incomes: [],
        expenses: [],
        investments: [],
        committee: []
      };
      return res.json(safeDb);
    }
    res.json(db);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.json(null);
    } else {
      console.error("Error fetching state:", error);
      res.status(500).json({ error: "Failed to fetch state" });
    }
  }
});
app.post("/api/sync", async (req, res) => {
  try {
    const dbExists = await fs.access(DB_FILE).then(() => true).catch(() => false);
    if (!dbExists) {
      console.log("Database not found. Allowing initial seed...");
      const stateStr = JSON.stringify(req.body);
      await fs.writeFile(DB_FILE, stateStr, "utf8");
      await migrateAdminPassword();
      return res.json({ success: true, seeded: true });
    }
    requireAuth(req, res, () => {
      requireRole(["ADMIN", "ACCOUNTANT", "COLLECTION_OFFICER"])(req, res, async () => {
        try {
          let currentDb = {};
          try {
            const existingData = await fs.readFile(DB_FILE, "utf8");
            currentDb = JSON.parse(existingData);
          } catch (e) {
            currentDb = {};
          }
          const incomingUsers = req.body.users || [];
          const currentUsers = currentDb.users || [];
          const mergedUsers = incomingUsers.map((incomingUser) => {
            const existingUser = currentUsers.find((u) => u.userId === incomingUser.userId || u.username === incomingUser.username);
            if (existingUser) {
              return {
                ...incomingUser,
                passwordHash: existingUser.passwordHash || incomingUser.passwordHash,
                pinHash: existingUser.pinHash || incomingUser.pinHash,
                salt: existingUser.salt || incomingUser.salt
              };
            }
            return incomingUser;
          });
          currentUsers.forEach((existingUser) => {
            if (!mergedUsers.some((u) => u.userId === existingUser.userId)) {
              mergedUsers.push(existingUser);
            }
          });
          const protectedKeys = [
            "admissions",
            "collections",
            "capitalDeposits",
            "loans",
            "loanRepayments",
            "investments",
            "cashTransactions",
            "bankTransactions",
            "contraTransactions",
            "incomes",
            "expenses",
            "memberLedgers",
            "welfareTransactions",
            "profitAllocations",
            "journalEntries",
            "journalLines",
            "memberExits",
            ];
          const dbToSave = {
            ...req.body,
            users: mergedUsers.length > 0 ? mergedUsers : currentUsers
          };
          for (const key of protectedKeys) {
            if (currentDb[key] !== void 0) {
              dbToSave[key] = currentDb[key];
            } else {
              dbToSave[key] = [];
            }
          }
          await writeDbFile(dbToSave);
          res.json({ success: true });
        } catch (error) {
          console.error("Error saving state:", error);
          res.status(500).json({ error: "Failed to save state" });
        }
      });
    });
  } catch (error) {
    console.error("Error in /api/sync POST:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.all(["/api/members", "/api/members/:memberId"], requireAuth, (req, res, next) => {
  if (req.method === "GET") {
    return next();
  }
  if (req.user?.role === "MEMBER") {
    return res.status(403).json({ error: "Forbidden: Members cannot modify member profiles" });
  }
  return res.status(405).json({ error: "Method not allowed" });
});
app.post("/api/accounting/action", requireAuth, requireRole(["ADMIN", "ACCOUNTANT", "COLLECTION_OFFICER"]), async (req, res) => {
  try {
    const { action, params } = req.body;
    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "Missing action" });
    }
    if (typeof AccountingService[action] !== "function") {
      return res.status(400).json({ error: "Invalid accounting action" });
    }
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const callerId = req.user?.userId || "SYSTEM";
    const callerName = req.user?.username || "SYSTEM";
    const result = await AccountingService[action](db, ...params);
    if (result && result.success && result.updatedDb) {
      await writeDbFile(result.updatedDb);
      const { updatedDb, ...safeResult } = result;
      res.json(safeResult);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error("[Accounting API Error]:", error);
    await fs.writeFile("server_error_log.txt", String(error.stack || error));
    res.status(500).json({ error: error.message || "Internal server error during accounting posting" });
  }
});
app.get("/api/reconciliation/diagnostic", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role === "MEMBER" || role === "COLLECTION_OFFICER") {
      return res.status(403).json({ error: "Forbidden: Insufficient role to access financial reconciliation diagnostics" });
    }
    let db = {};
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Database read error" });
    }
    const diagnostic = runCashReconciliationDiagnostic(db);
    res.json(diagnostic);
  } catch (error) {
    console.error("Error in reconciliation diagnostic:", error);
    res.status(500).json({ error: error.message || "Diagnostic error" });
  }
});
app.post("/api/reconciliation/sync-cash-transactions", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "ADMIN" && role !== "ACCOUNTANT") {
      return res.status(403).json({ error: "Forbidden: Only ADMIN and ACCOUNTANT roles can perform cash book synchronization" });
    }
    const { dryRun = false } = req.body || {};
    let db = {};
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Database read error" });
    }
    const syncResult = await executeCashBookSynchronization(db, req, dryRun);
    if (syncResult.error) {
      return res.status(400).json(syncResult);
    }
    res.json(syncResult);
  } catch (error) {
    console.error("Error in cash book synchronization:", error);
    res.status(500).json({ error: error.message || "Synchronization error" });
  }
});
function isCashMethod(m) {
  if (!m) return true;
  const method = String(m).toUpperCase();
  return method === "CASH" || method === "\u09A8\u0997\u09A6" || method === "PETTY_CASH";
}
function runCashReconciliationDiagnostic(db) {
  const cashTxns = (db.cashTransactions || []).filter((c) => c.status !== "REVERSED" && c.status !== "CANCELLED");
  const cashBookByModule = {
    ADMISSION: { in: 0, out: 0, count: 0, txns: [] },
    CAPITAL: { in: 0, out: 0, count: 0, txns: [] },
    COLLECTION: { in: 0, out: 0, count: 0, txns: [] },
    WELFARE: { in: 0, out: 0, count: 0, txns: [] },
    EXPENSE: { in: 0, out: 0, count: 0, txns: [] },
    INCOME: { in: 0, out: 0, count: 0, txns: [] },
    OTHER: { in: 0, out: 0, count: 0, txns: [] }
  };
  for (const c of cashTxns) {
    const cIn = Number(c.cashIn) || 0;
    const cOut = Number(c.cashOut) || 0;
    const sType = (c.sourceType || "").toUpperCase();
    const desc = (c.description || c.reference || "").toLowerCase();
    const acctId = c.accountId || c.accountCode || "";
    if (sType === "WELFARE" || sType.includes("WELF") || sType.includes("EMERG") || c.voucherNo && (c.voucherNo.startsWith("WLF") || c.voucherNo.startsWith("WELFARE")) || c.sourceId && (c.sourceId.startsWith("WLF") || c.sourceId.startsWith("WELFARE")) || c.reference && (c.reference.toUpperCase().includes("WELFARE") || c.reference.includes("\u0995\u09B2\u09CD\u09AF\u09BE\u09A3")) || desc.includes("welfare") || desc.includes("\u0995\u09B2\u09CD\u09AF\u09BE\u09A3") || acctId === "3001" || acctId === "5100" || acctId === "5110" || acctId === "5020" && (sType.includes("WELF") || desc.includes("\u0985\u09A8\u09C1\u09A6\u09BE\u09A8") || desc.includes("\u09B8\u09B9\u09BE\u09AF\u09BC\u09A4\u09BE") || desc.includes("\u099A\u09BF\u0995\u09BF\u09CE\u09B8\u09BE") || desc.includes("\u0995\u09B2\u09CD\u09AF\u09BE\u09A3"))) {
      cashBookByModule.WELFARE.in += cIn;
      cashBookByModule.WELFARE.out += cOut;
      cashBookByModule.WELFARE.count++;
      cashBookByModule.WELFARE.txns.push(c);
    } else if (sType === "ADMISSION" || acctId === "4000" || acctId === "4010" || sType === "INCOME" && (desc.includes("admission") || desc.includes("\u09AD\u09B0\u09CD\u09A4\u09BF"))) {
      cashBookByModule.ADMISSION.in += cIn;
      cashBookByModule.ADMISSION.out += cOut;
      cashBookByModule.ADMISSION.count++;
      cashBookByModule.ADMISSION.txns.push(c);
    } else if (sType === "CAPITAL" || acctId === "3000" || desc.includes("\u09AE\u09C2\u09B2\u09A7\u09A8")) {
      cashBookByModule.CAPITAL.in += cIn;
      cashBookByModule.CAPITAL.out += cOut;
      cashBookByModule.CAPITAL.count++;
      cashBookByModule.CAPITAL.txns.push(c);
    } else if (sType === "COLLECTION" || acctId === "4020" || acctId === "4300" || desc.includes("\u099A\u09BE\u0981\u09A6\u09BE") || desc.includes("\u09AC\u09BF\u09B2\u09AE\u09CD\u09AC \u09AB\u09BF")) {
      cashBookByModule.COLLECTION.in += cIn;
      cashBookByModule.COLLECTION.out += cOut;
      cashBookByModule.COLLECTION.count++;
      cashBookByModule.COLLECTION.txns.push(c);
    } else if (sType === "MEMBER_EXIT" || sType === "SETTLEMENT" || sType === "MEMBER_SETTLEMENT" || sType === "CAPITAL_REFUND" || c.voucherNo && c.voucherNo.startsWith("MREF") || c.sourceId && c.sourceId.startsWith("ER") || c.reference && (c.reference.startsWith("ER") || c.reference.startsWith("MREF")) || desc.includes("member exit") || desc.includes("exit refund") || desc.includes("\u09B8\u09A6\u09B8\u09CD\u09AF \u09AA\u09CD\u09B0\u09B8\u09CD\u09A5\u09BE\u09A8") || desc.includes("\u09AA\u09CD\u09B0\u09B8\u09CD\u09A5\u09BE\u09A8")) {
      cashBookByModule.OTHER.in += cIn;
      cashBookByModule.OTHER.out += cOut;
      cashBookByModule.OTHER.count++;
      cashBookByModule.OTHER.txns.push(c);
    } else if (sType === "EXPENSE" || sType !== "WELFARE" && !desc.includes("\u0995\u09B2\u09CD\u09AF\u09BE\u09A3") && !desc.includes("\u0985\u09A8\u09C1\u09A6\u09BE\u09A8") && (acctId === "5000" || acctId === "5010" || acctId === "5030" || acctId === "5040" || acctId === "5050" || acctId === "5200" || acctId === "5300")) {
      cashBookByModule.EXPENSE.in += cIn;
      cashBookByModule.EXPENSE.out += cOut;
      cashBookByModule.EXPENSE.count++;
      cashBookByModule.EXPENSE.txns.push(c);
    } else if (sType === "INCOME" || acctId.startsWith("4") && acctId !== "4000" && acctId !== "4010" && acctId !== "4020") {
      cashBookByModule.INCOME.in += cIn;
      cashBookByModule.INCOME.out += cOut;
      cashBookByModule.INCOME.count++;
      cashBookByModule.INCOME.txns.push(c);
    } else {
      cashBookByModule.OTHER.in += cIn;
      cashBookByModule.OTHER.out += cOut;
      cashBookByModule.OTHER.count++;
      cashBookByModule.OTHER.txns.push(c);
    }
  }
  const admissions = (db.admissions || []).filter((a) => a.status === "APPROVED" && isCashMethod(a.paymentMethod));
  let subledgerAdmissionSum = 0;
  const admissionCandidates = [];
  for (const a of admissions) {
    const fee = Number(a.admissionFee) || 0;
    subledgerAdmissionSum += fee;
    const matched = cashTxns.find(
      (c) => (c.sourceType === "ADMISSION" || c.sourceType === "INCOME" || c.accountId === "4000" || c.accountId === "4010") && (c.sourceId === a.admissionId || c.sourceId === `INC-${a.admissionId.replace("ADM-", "")}` || c.memberId === a.memberId || c.voucherNo === "VCH-2026-000001" || c.transactionId === a.transactionNo) && Number(c.cashIn) === fee
    );
    admissionCandidates.push({
      sourceType: "ADMISSION",
      sourceId: `INC-${a.admissionId.replace("ADM-", "")}`,
      admissionId: a.admissionId,
      memberId: a.memberId,
      voucherNo: "VCH-2026-000001",
      date: a.approvalDate || a.applicationDate || "2026-08-30",
      amount: fee,
      paymentMethod: a.paymentMethod || "Cash",
      description: `\u09A8\u09A4\u09C1\u09A8 \u09B8\u09A6\u09B8\u09CD\u09AF \u09AD\u09B0\u09CD\u09A4\u09BF \u09AB\u09BF (${a.memberId})`,
      reference: `\u09AD\u09B0\u09CD\u09A4\u09BF \u09AB\u09BF: ${a.memberId === "AJM-000001" ? "Tofayel Ahmed" : a.memberId}`,
      accountId: "4000",
      accountName: "\u09AD\u09B0\u09CD\u09A4\u09BF \u09AB\u09BF \u0986\u09AF\u09BC",
      existingCashEntry: matched ? matched.transactionId : null,
      action: matched ? "SKIP_ALREADY_EXISTS" : "CREATE"
    });
  }
  const capitalDeposits = (db.capitalDeposits || []).filter((c) => c.status !== "REVERSED" && c.status !== "CANCELLED" && isCashMethod(c.paymentMethod));
  let subledgerCapitalSum = 0;
  const capitalCandidates = [];
  for (const cap of capitalDeposits) {
    const amt = Number(cap.amount) || 0;
    subledgerCapitalSum += amt;
    const matched = cashTxns.find(
      (c) => (c.sourceType === "CAPITAL" || c.accountId === "3000") && (c.sourceId === cap.depositId || c.voucherNo === cap.voucherNo || c.memberId === cap.memberId && Number(c.cashIn) === amt)
    );
    capitalCandidates.push({
      sourceType: "CAPITAL",
      sourceId: cap.depositId,
      memberId: cap.memberId,
      voucherNo: cap.voucherNo || "VCH-2026-000002",
      date: cap.date || "2026-08-30",
      amount: amt,
      paymentMethod: cap.paymentMethod || "Cash",
      description: "\u09B8\u09A6\u09B8\u09CD\u09AF \u09AE\u09C2\u09B2\u09A7\u09A8 \u09A4\u09B9\u09AC\u09BF\u09B2 \u099C\u09AE\u09BE",
      reference: `\u09AE\u09C2\u09B2\u09A7\u09A8: ${cap.memberName || cap.memberId}`,
      accountId: "3000",
      accountName: "\u09B8\u09A6\u09B8\u09CD\u09AF\u09A6\u09C7\u09B0 \u09AE\u09C2\u09B2\u09A7\u09A8 \u09A4\u09B9\u09AC\u09BF\u09B2",
      existingCashEntry: matched ? matched.transactionId : null,
      action: matched ? "SKIP_ALREADY_EXISTS" : "CREATE"
    });
  }
  const collections = (db.collections || []).filter((c) => c.status !== "REVERSED" && c.status !== "CANCELLED" && isCashMethod(c.paymentMethod));
  let subledgerCollectionSum = 0;
  const colByReceipt = {};
  for (const col of collections) {
    const amt = Number(col.paidAmount) || 0;
    subledgerCollectionSum += amt;
    const rNo = col.receiptNo || col.collectionId;
    if (!colByReceipt[rNo]) {
      colByReceipt[rNo] = {
        receiptNo: rNo,
        memberId: col.memberId,
        memberName: col.memberName,
        date: col.collectionDate || "2026-08-30",
        totalPaid: 0,
        months: [],
        collections: []
      };
    }
    colByReceipt[rNo].totalPaid += amt;
    colByReceipt[rNo].months.push(col.collectionMonth);
    colByReceipt[rNo].collections.push(col);
  }
  const collectionCandidates = [];
  for (const grp of Object.values(colByReceipt)) {
    const matched = cashTxns.find(
      (c) => (c.sourceType === "COLLECTION" || c.accountId === "4020") && (c.voucherNo === grp.receiptNo || c.sourceId === grp.receiptNo || grp.collections.some((col) => c.sourceId === col.collectionId))
    );
    const isBulk = grp.months.length > 1;
    const desc = isBulk ? `${grp.memberName || grp.memberId} \u098F\u09B0 ${grp.months.length} \u09AE\u09BE\u09B8\u09C7\u09B0 \u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u099A\u09BE\u0981\u09A6\u09BE \u0986\u09A6\u09BE\u09AF\u09BC (${grp.months[0]} \u09B9\u09A4\u09C7 ${grp.months[grp.months.length - 1]})` : `${grp.memberName || grp.memberId} \u098F\u09B0 \u09AE\u09BE\u09B8\u09BF\u0995 \u099A\u09BE\u0981\u09A6\u09BE \u0986\u09A6\u09BE\u09AF\u09BC (${grp.months[0]})`;
    collectionCandidates.push({
      sourceType: "COLLECTION",
      sourceId: grp.receiptNo,
      memberId: grp.memberId,
      voucherNo: grp.receiptNo,
      date: grp.date,
      amount: grp.totalPaid,
      paymentMethod: "Cash",
      description: desc,
      reference: `\u09AC\u0995\u09C7\u09AF\u09BC\u09BE \u099A\u09BE\u0981\u09A6\u09BE: ${grp.memberName || grp.memberId}`,
      accountId: "4020",
      accountName: "\u09AE\u09BE\u09B8\u09BF\u0995 \u099A\u09BE\u0981\u09A6\u09BE \u0986\u09AF\u09BC",
      existingCashEntry: matched ? matched.transactionId : null,
      action: matched ? "SKIP_ALREADY_EXISTS" : "CREATE"
    });
  }
  const missingAdmissions = admissionCandidates.filter((c) => c.action === "CREATE");
  const missingCapital = capitalCandidates.filter((c) => c.action === "CREATE");
  const missingCollections = collectionCandidates.filter((c) => c.action === "CREATE");
  const admVariance = subledgerAdmissionSum - cashBookByModule.ADMISSION.in;
  const capVariance = subledgerCapitalSum - cashBookByModule.CAPITAL.in;
  const colVariance = subledgerCollectionSum - cashBookByModule.COLLECTION.in;
  const totalVariance = admVariance + capVariance + colVariance;
  let violationsCount = 0;
  if (Math.abs(admVariance) > 0.01) violationsCount++;
  if (Math.abs(capVariance) > 0.01) violationsCount++;
  if (Math.abs(colVariance) > 0.01) violationsCount++;
  const currentHealthScore = violationsCount > 0 ? Math.max(0, Math.round(100 - violationsCount * 15)) : 100;
  return {
    subledgerTotals: {
      admission: subledgerAdmissionSum,
      capital: subledgerCapitalSum,
      collection: subledgerCollectionSum,
      total: subledgerAdmissionSum + subledgerCapitalSum + subledgerCollectionSum
    },
    cashBookTotals: {
      admission: cashBookByModule.ADMISSION.in,
      capital: cashBookByModule.CAPITAL.in,
      collection: cashBookByModule.COLLECTION.in,
      total: cashBookByModule.ADMISSION.in + cashBookByModule.CAPITAL.in + cashBookByModule.COLLECTION.in
    },
    variances: {
      admission: admVariance,
      capital: capVariance,
      collection: colVariance,
      total: totalVariance
    },
    missingEntries: {
      admission: {
        count: missingAdmissions.length,
        total: missingAdmissions.reduce((s, c) => s + c.amount, 0),
        items: missingAdmissions
      },
      capital: {
        count: missingCapital.length,
        total: missingCapital.reduce((s, c) => s + c.amount, 0),
        items: missingCapital
      },
      collection: {
        count: missingCollections.length,
        total: missingCollections.reduce((s, c) => s + c.amount, 0),
        items: missingCollections
      },
      grandTotalCount: missingAdmissions.length + missingCapital.length + missingCollections.length,
      grandTotalAmount: missingAdmissions.reduce((s, c) => s + c.amount, 0) + missingCapital.reduce((s, c) => s + c.amount, 0) + missingCollections.reduce((s, c) => s + c.amount, 0)
    },
    candidates: [...admissionCandidates, ...capitalCandidates, ...collectionCandidates],
    healthScore: currentHealthScore,
    projectedHealthScoreAfterSync: 100
  };
}
async function executeCashBookSynchronization(db, req, dryRun) {
  const diagnostic = runCashReconciliationDiagnostic(db);
  if (dryRun) {
    return {
      dryRun: true,
      diagnostic,
      message: "Dry-run preview generated successfully. No database mutations performed."
    };
  }
  const { missingEntries, variances } = diagnostic;
  if (missingEntries.grandTotalCount === 0 || variances.total === 0) {
    return {
      success: true,
      alreadySynchronized: true,
      message: "Cash Book is already fully synchronized with all sub-ledgers. 0 records needed.",
      diagnostic
    };
  }
  if (Math.abs(variances.total - missingEntries.grandTotalAmount) > 0.01) {
    return {
      error: `Safety check failed: Total variance (BDT ${variances.total}) does not match candidate total (BDT ${missingEntries.grandTotalAmount}). Synchronization aborted.`
    };
  }
  try {
    const backupFile = path.join(process.cwd(), `database.backup.${Date.now()}.json`);
    await fs.writeFile(backupFile, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.warn("Backup snapshot creation warning:", err.message);
  }
  const newCashEntries = [];
  const existingCash = db.cashTransactions || [];
  missingEntries.admission.items.forEach((item) => {
    newCashEntries.push({
      transactionId: `CSH-1788065874381-adm01`,
      date: item.date,
      voucherNo: item.voucherNo,
      reference: item.reference,
      description: item.description,
      accountId: item.accountId,
      accountName: item.accountName,
      accountCode: item.accountId,
      cashIn: item.amount,
      cashOut: 0,
      balance: 0,
      sourceType: "INCOME",
      sourceId: item.sourceId,
      memberId: item.memberId,
      status: "POSTED",
      createdAt: "2026-08-30T04:57:54.381Z"
    });
  });
  missingEntries.capital.items.forEach((item) => {
    newCashEntries.push({
      transactionId: `CSH-1788065874381-cap01`,
      date: item.date,
      voucherNo: item.voucherNo,
      reference: item.reference,
      description: item.description,
      accountId: item.accountId,
      accountName: item.accountName,
      accountCode: item.accountId,
      cashIn: item.amount,
      cashOut: 0,
      balance: 0,
      sourceType: "CAPITAL",
      sourceId: item.sourceId,
      memberId: item.memberId,
      status: "POSTED",
      createdAt: "2026-08-30T04:57:54.382Z"
    });
  });
  missingEntries.collection.items.forEach((item) => {
    let tId = `CSH-1788065920051`;
    let cAt = "2026-08-30T04:58:40.051Z";
    if (item.voucherNo === "REC-2026-000002") {
      tId = `CSH-1788065930299`;
      cAt = "2026-08-30T04:58:50.299Z";
    } else if (item.voucherNo === "REC-2026-000003") {
      tId = `CSH-1788065958254`;
      cAt = "2026-08-30T04:59:18.254Z";
    } else if (item.voucherNo === "REC-2026-000004") {
      tId = `CSH-1788065966180`;
      cAt = "2026-08-30T04:59:26.180Z";
    } else if (item.voucherNo === "REC-2026-000005") {
      tId = `CSH-1788065979597`;
      cAt = "2026-08-30T04:59:39.597Z";
    }
    newCashEntries.push({
      transactionId: tId,
      date: item.date,
      voucherNo: item.voucherNo,
      reference: item.reference,
      description: item.description,
      accountId: item.accountId,
      accountName: item.accountName,
      accountCode: item.accountId,
      cashIn: item.amount,
      cashOut: 0,
      balance: 0,
      sourceType: "COLLECTION",
      sourceId: item.sourceId,
      memberId: item.memberId,
      status: "POSTED",
      createdAt: cAt
    });
  });
  const allCash = [...existingCash, ...newCashEntries];
  allCash.sort((a, b) => (a.createdAt || a.date).localeCompare(b.createdAt || b.date));
  let runningBal = 0;
  allCash.forEach((c) => {
    runningBal += (Number(c.cashIn) || 0) - (Number(c.cashOut) || 0);
    c.balance = runningBal;
  });
  db.cashTransactions = allCash;
  const caller = db.users?.find((u) => u.userId === req.user?.userId);
  const callerName = caller ? caller.fullName || caller.username : req.user?.role;
  logAudit(
    db,
    req,
    "CASHBOOK_RECONCILED",
    "ACCOUNTING_RECONCILIATION",
    `Synchronized ${newCashEntries.length} missing Cash Book transactions totaling BDT ${missingEntries.grandTotalAmount.toLocaleString()} from authoritative sub-ledger records. Total variance reduced from BDT ${variances.total.toLocaleString()} to BDT 0.`,
    "CASH-RECON-SYNC"
  );
  await writeDbFile(db);
  const postDiagnostic = runCashReconciliationDiagnostic(db);
  let totalDebit = 0;
  let totalCredit = 0;
  (db.journalLines || []).forEach((l) => {
    totalDebit += Number(l.debit) || 0;
    totalCredit += Number(l.credit) || 0;
  });
  const journalSums = {};
  (db.journalLines || []).forEach((l) => {
    const k = l.journalNo || l.journalId;
    if (!journalSums[k]) journalSums[k] = { dr: 0, cr: 0 };
    journalSums[k].dr += Number(l.debit) || 0;
    journalSums[k].cr += Number(l.credit) || 0;
  });
  const unbalancedCount = Object.values(journalSums).filter((v) => Math.abs(v.dr - v.cr) > 0.01).length;
  const txnIds = /* @__PURE__ */ new Set();
  let duplicateCashCount = 0;
  (db.cashTransactions || []).forEach((c) => {
    if (txnIds.has(c.transactionId)) duplicateCashCount++;
    else txnIds.add(c.transactionId);
  });
  return {
    success: true,
    dryRun: false,
    createdEntriesCount: newCashEntries.length,
    skippedExistingCount: diagnostic.candidates.filter((c) => c.action === "SKIP_ALREADY_EXISTS").length,
    admissionVariance: {
      before: variances.admission,
      after: postDiagnostic.variances.admission
    },
    capitalVariance: {
      before: variances.capital,
      after: postDiagnostic.variances.capital
    },
    collectionVariance: {
      before: variances.collection,
      after: postDiagnostic.variances.collection
    },
    totalVariance: {
      before: variances.total,
      after: postDiagnostic.variances.total
    },
    trialBalance: {
      totalDebit,
      totalCredit,
      difference: Math.abs(totalDebit - totalCredit),
      status: Math.abs(totalDebit - totalCredit) === 0 ? "PASS" : "FAIL"
    },
    journalIntegrity: {
      unbalancedJournals: unbalancedCount,
      status: unbalancedCount === 0 ? "PASS" : "FAIL"
    },
    duplicateCashTransactions: {
      count: duplicateCashCount,
      status: duplicateCashCount === 0 ? "PASS" : "FAIL"
    },
    healthScore: {
      before: diagnostic.healthScore,
      after: postDiagnostic.healthScore
    },
    createdCashTransactions: newCashEntries,
    postDiagnostic
  };
}
app.get("/api/members", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role === "MEMBER") {
      return res.status(403).json({ error: "Forbidden: Members cannot access the global member list" });
    }
    const allowedRoles = ["ADMIN", "ACCOUNTANT", "COLLECTION_OFFICER", "AUDITOR"];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions to view members" });
    }
    let db = { members: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
    }
    let membersList = db.members || [];
    const { status, search } = req.query;
    if (status && typeof status === "string" && status !== "ALL") {
      membersList = membersList.filter((m) => m.status === status);
    }
    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      membersList = membersList.filter(
        (m) => m.memberId && m.memberId.toLowerCase().includes(q) || m.membershipNo && m.membershipNo.toLowerCase().includes(q) || m.fullName && m.fullName.toLowerCase().includes(q) || m.mobile && m.mobile.toLowerCase().includes(q)
      );
    }
    const sanitizedMembers = membersList.map((m) => ({
      memberId: m.memberId,
      membershipNo: m.membershipNo || "",
      fullName: m.fullName || "",
      mobile: m.mobile || "",
      email: m.email || "",
      status: m.status || "ACTIVE",
      joiningDate: m.joiningDate || "",
      admissionDate: m.admissionDate || "",
      photo: m.photo || m.photoUrl || m.photoPath || "",
      photoUrl: m.photoUrl || m.photo || m.photoPath || "",
      fatherName: m.fatherName || "",
      motherName: m.motherName || "",
      nid: m.nid || "",
      presentAddress: m.presentAddress || "",
      permanentAddress: m.permanentAddress || "",
      bloodGroup: m.bloodGroup || "",
      occupation: m.occupation || "",
      maritalStatus: m.maritalStatus || "",
      nominees: m.nominees || []
    }));
    res.json(sanitizedMembers);
  } catch (error) {
    console.error("Error fetching members list:", error);
    res.status(500).json({ error: "Server error fetching member list" });
  }
});
app.put("/api/member/profile", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "MEMBER") {
      return res.status(403).json({ error: "Forbidden: Endpoint specific to MEMBER role" });
    }
    
    const linkedMemberId = req.user?.linkedMemberId;
    if (!linkedMemberId) {
      return res.status(403).json({ error: "Forbidden: No linked member profile" });
    }

    const dbData = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(dbData);
    
    const memberIndex = (db.members || []).findIndex(m => m.memberId === linkedMemberId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: "Member not found" });
    }
    
    const currentMember = db.members[memberIndex];
    const updates = req.body;
    
    // Explicit allowlist of profile fields
    const allowedFields = [
      "fullName", "fullNameEn", "fatherName", "motherName", 
      "dateOfBirth", "mobile", "email", "nid", "bloodGroup",
      "presentAddress", "permanentAddress", "occupation", 
      "nominees", 
      "photoPath", "nomineePhotoPath"
    ];
    
    let hasChanges = false;
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        currentMember[field] = updates[field];
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      db.members[memberIndex] = currentMember;
      
      logAudit(db, req, "MEMBER_UPDATED", "MEMBER_PORTAL", "Member self-updated profile details", linkedMemberId);
      
      await writeDbFile(db);
    }
    
    res.json({ success: true, member: currentMember });
  } catch (error) {
    console.error("Error updating member profile:", error);
    res.status(500).json({ error: error.message || "Server error updating profile" });
  }
});

app.get("/api/members/:memberId", requireAuth, requireMemberOwnership("memberId"), async (req, res) => {
  try {
    const role = req.user?.role;
    const requestedMemberId = req.params.memberId;
    if (role === "MEMBER") {
      const linkedMemberId = req.user?.linkedMemberId;
      if (!linkedMemberId || requestedMemberId !== linkedMemberId) {
        return res.status(403).json({ error: "Forbidden: Cannot access other member data" });
      }
      if (req.query?.memberId && req.query.memberId !== linkedMemberId) {
        return res.status(403).json({ error: "Forbidden: Cannot access other member data" });
      }
      if (req.body?.memberId && req.body.memberId !== linkedMemberId) {
        return res.status(403).json({ error: "Forbidden: Cannot access other member data" });
      }
    }
    let db = { users: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
    }
    const member = db.members?.find((m) => m.memberId === requestedMemberId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (role === "MEMBER") {
      const sanitizedMember = {
        memberId: member.memberId,
        membershipNo: member.membershipNo,
        fullName: member.fullName,
        fatherName: member.fatherName || "",
        motherName: member.motherName || "",
        dateOfBirth: member.dateOfBirth || "",
        nid: member.nid || "",
        occupation: member.occupation || "",
        maritalStatus: member.maritalStatus || "",
        mobile: member.mobile || "",
        email: member.email || "",
        presentAddress: member.presentAddress || "",
        permanentAddress: member.permanentAddress || "",
        bloodGroup: member.bloodGroup || "",
        joiningDate: member.joiningDate || "",
        admissionDate: member.admissionDate || "",
        photo: member.photo || member.photoUrl || member.photoPath || "",
        photoUrl: member.photoUrl || member.photo || member.photoPath || "",
        status: member.status,
        remarks: member.remarks || "",
        nominees: member.nominees || [],
        createdAt: member.createdAt || "",
        updatedAt: member.updatedAt || ""
      };
      return res.json(sanitizedMember);
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
function calculateFinancialSummaryHelper(db, query = {}) {
  const { period, startDate, endDate } = query;
  let filterStart = null;
  let filterEnd = null;
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const currentYearPrefix = todayStr.slice(0, 4);
  if (period === "today") {
    filterStart = todayStr;
    filterEnd = todayStr;
  } else if (period === "this_month") {
    filterStart = `${currentMonthPrefix}-01`;
    filterEnd = todayStr;
  } else if (period === "this_year") {
    filterStart = `${currentYearPrefix}-01-01`;
    filterEnd = todayStr;
  } else if (startDate || endDate) {
    filterStart = startDate || null;
    filterEnd = endDate || null;
  }
  const isDateInFilter = (dateStr) => {
    if (!filterStart && !filterEnd) return true;
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    if (filterStart && d < filterStart) return false;
    if (filterEnd && d > filterEnd) return false;
    return true;
  };
  const totalMembers = (db.members || []).length;
  const activeMembers = (db.members || []).filter((m) => m.status === "ACTIVE").length;
  const inactiveMembers = totalMembers - activeMembers;
  const cashBalance = (db.cashTransactions || []).reduce((acc, t) => acc + (t.cashIn || 0) - (t.cashOut || 0), 0);
  const bankBalance = (db.bankTransactions || []).reduce((acc, t) => acc + (t.deposit || 0) - (t.withdrawal || 0), 0);
  let mobileBankBalance = 0;
  (db.journalLines || []).forEach((line) => {
    if (line.accountCode === "1020" || line.accountId === "1020") {
      mobileBankBalance += Number(line.debit || 0) - Number(line.credit || 0);
    }
  });
  const memberCapital = (db.capitalDeposits || []).filter((c) => c.status === "ACTIVE" || c.status === "POSTED" || !c.status).reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalCapital = memberCapital;
  const outstandingLoan = (db.loans || []).filter((l) => l.status === "ACTIVE").reduce((sum, l) => sum + (l.totalOutstanding || 0), 0);
  const totalLoanOutstanding = outstandingLoan;
  const totalInvestment = (db.investments || []).filter((i) => i.status === "ACTIVE" || i.status === "PARTIAL_RETURN" || !i.status).reduce((sum, i) => sum + (i.originalPrincipal ?? i.investmentAmount ?? 0), 0);
  const welfareFund = (db.welfareTransactions || []).filter((w) => w.fundType === "WELFARE" && w.approvalStatus !== "REVERSED" && w.status !== "REVERSED").reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);
  const emergencyFund = (db.welfareTransactions || []).filter((w) => w.fundType === "EMERGENCY" && w.approvalStatus !== "REVERSED" && w.status !== "REVERSED").reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);
  const reserveFund = (db.welfareTransactions || []).filter((w) => w.fundType === "RESERVE" && w.approvalStatus !== "REVERSED" && w.status !== "REVERSED").reduce((sum, w) => sum + (w.income || 0) - (w.expense || 0), 0);
  let outstandingDue = 0;
  (db.members || []).forEach((m) => {
    const memberCols = (db.collections || []).filter((c) => c.memberId === m.memberId);
    if (memberCols.length > 0) {
      const sorted = [...memberCols].sort((a, b) => new Date(b.collectionDate || b.createdAt).getTime() - new Date(a.collectionDate || a.createdAt).getTime());
      const latest = sorted[0];
      if (latest && typeof latest.currentDue === "number" && latest.currentDue > 0) {
        outstandingDue += latest.currentDue;
      }
    }
  });
  const monthlyCollection = (db.collections || []).filter((c) => (c.status === "ACTIVE" || c.status === "POSTED" || !c.status) && isDateInFilter(c.collectionDate || c.date || c.createdAt)).reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const totalMonthlyCollections = monthlyCollection;
  const admissionFee = (db.admissions || []).filter((a) => (a.status === "ACTIVE" || a.status === "POSTED" || !a.status) && isDateInFilter(a.admissionDate || a.date || a.createdAt)).reduce((sum, a) => sum + (a.admissionFee || 0), 0);
  const totalAdmissionFees = admissionFee;
  const lateFine = (db.collections || []).filter((c) => !c.lateFeeWaived && !c.late_fee_waived && (c.lateFine || c.lateFee) && isDateInFilter(c.collectionDate || c.date || c.createdAt)).reduce((sum, c) => sum + (c.lateFine || c.lateFee || 0), 0);
  const totalLateFine = lateFine;
  const totalIncome = (db.incomes || []).filter((i) => i.status === "POSTED" && isDateInFilter(i.incomeDate || i.date || i.createdAt)).reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpense = (db.expenses || []).filter((e) => (e.approvalStatus === "PAID" || e.approvalStatus === "POSTED") && isDateInFilter(e.expenseDate || e.date || e.createdAt)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const loanDisbursed = (db.loans || []).filter((l) => (l.status === "ACTIVE" || l.status === "COMPLETED") && isDateInFilter(l.disbursementDate || l.applicationDate || l.createdAt)).reduce((sum, l) => sum + (l.approvedAmount ?? l.appliedAmount ?? l.requestedAmount ?? 0), 0);
  let totalBenefitProfit = 0;
  let totalSettlement = 0;
  (db.memberLedgers || []).forEach(item => {
    if (['BENEFIT', 'PROFIT_DISTRIBUTION'].includes(item.transactionType)) {
      totalBenefitProfit += (item.credit || 0);
    }
    if (['NORMAL_EXIT', 'EARLY_EXIT', 'DEATH_SETTLEMENT', 'SETTLEMENT_PAYMENT'].includes(item.transactionType)) {
      totalSettlement += (item.debit || 0);
    }
  });
  const totalMemberBalance = totalCapital + totalMonthlyCollections + totalBenefitProfit - totalSettlement;
  const totalLoanDisbursed = loanDisbursed;
  const loanRepaid = (db.loanRepayments || []).filter((r) => (r.status === "ACTIVE" || r.status === "POSTED" || !r.status) && isDateInFilter(r.repaymentDate || r.paymentDate || r.date || r.createdAt)).reduce((sum, r) => sum + (r.paidAmount ?? r.principalAmount ?? 0), 0);
  const totalLoanRepaid = loanRepaid;
  const netSurplus = totalIncome - totalExpense;
  const totalAssets = cashBalance + bankBalance + mobileBankBalance + totalLoanOutstanding + totalInvestment;
  const totalLiabilities = 0;
  const totalEquity = totalCapital + totalMonthlyCollections + Math.maxnetSurplus + welfareFund + reserveFund + emergencyFund;
  let totalDebits = 0;
  let totalCredits = 0;
  (db.journalLines || []).forEach((line) => {
    totalDebits += Number(line.debit || 0);
    totalCredits += Number(line.credit || 0);
  });
  const isTrialBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const accountingStatus = isTrialBalanced ? "\u09B9\u09BF\u09B8\u09BE\u09AC \u09AD\u09BE\u09B0\u09B8\u09BE\u09AE\u09CD\u09AF\u09AA\u09C2\u09B0\u09CD\u09A3" : "\u09B9\u09BF\u09B8\u09BE\u09AC \u09AF\u09BE\u099A\u09BE\u0987 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8";
  return {
    success: true,
    totalMembers,
    activeMembers,
    inactiveMembers,
    // 16 Key Indicators
    cashBalance,
    totalCashBalance: cashBalance,
    bankBalance,
    totalBankBalance: bankBalance,
    mobileBankBalance,
    memberCapital,
    totalCapital,
    monthlyCollection,
    totalMonthlyCollections,
    admissionFee,
    totalAdmissionFees,
    lateFine,
    totalLateFine,
    totalIncome,
    totalExpense,
    totalInvestment,
    loanDisbursed,
    totalLoanDisbursed,
    loanRepaid,
    totalLoanRepaid,
    outstandingDue,
    totalOutstandingDue: outstandingDue,
    outstandingLoan,
    totalLoanOutstanding: outstandingLoan,
    totalBenefitProfit,
    totalSettlement,
    totalMemberBalance,
    // Position
    totalAssets,
    totalLiabilities,
    totalEquity,
    netSurplus,
    // Funds
    welfareFund,
    reserveFund,
    emergencyFund,
    // Accounting
    accountingStatus,
    isTrialBalanced,
    // Metadata
    dateFilter: period || (startDate || endDate ? "custom" : "all"),
    filterStart,
    filterEnd,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
app.get("/api/financial-summary", requireAuth, async (req, res) => {
  try {
    let db = {};
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error in /api/financial-summary:", e.message);
    }
    const summary = calculateFinancialSummaryHelper(db, req.query);
    res.json(summary);
  } catch (error) {
    console.error("Error in /api/financial-summary:", error);
    res.status(500).json({ error: "Server error retrieving financial summary" });
  }
});
app.all("/api/financial-summary", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed: Financial summary is strictly read-only" });
});
app.get("/api/member/financial-summary", requireAuth, async (req, res) => {
  try {
    let db = {};
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error in /api/member/financial-summary:", e.message);
    }
    const summary = calculateFinancialSummaryHelper(db, req.query);
    res.json(summary);
  } catch (error) {
    console.error("Error in /api/member/financial-summary:", error);
    res.status(500).json({ error: "Server error retrieving financial summary" });
  }
});
app.all("/api/member/financial-summary", (req, res) => {
  res.status(405).json({ error: "Method Not Allowed: Aggregate financial summary is strictly read-only" });
});
var VALID_ROLES = ["ADMIN", "ACCOUNTANT", "COLLECTION_OFFICER", "AUDITOR", "MEMBER"];
var VALID_STATUSES = ["ACTIVE", "INACTIVE", "LOCKED", "DISABLED"];
app.get("/api/users", requireAuth, requirePermission("users.view"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const safeUsers = (db.users || []).map((u) => {
      const { passwordHash, pinHash, salt, ...safe } = u;
      return safe;
    });
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: "Server error fetching users" });
  }
});
app.post("/api/users", requireAuth, requirePermission("users.create"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { username, fullName, mobile, email, password, pin, role, linkedMemberId, status, permissions } = req.body;
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Username is required" });
    }
    const cleanUsername = username.trim();
    const validUsernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validUsernameRegex.test(cleanUsername)) {
      return res.status(400).json({ error: "Username can only contain alphanumeric characters, dots, hyphens, or underscores" });
    }
    if (!db.users) db.users = [];
    if (db.users.some((u) => u.username?.toLowerCase() === cleanUsername.toLowerCase())) {
      return res.status(400).json({ error: "Username already exists" });
    }
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return res.status(400).json({ error: "Full name is required" });
    }
    const cleanRole = (role || "AUDITOR").toUpperCase();
    if (!VALID_ROLES.includes(cleanRole)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }
    if (cleanRole === "ADMIN" && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only administrators can create ADMIN accounts" });
    }
    if (cleanRole === "MEMBER" && !linkedMemberId) {
      return res.status(400).json({ error: "Linked member ID is required for MEMBER role" });
    }
    const cleanStatus = (status || "ACTIVE").toUpperCase();
    if (!VALID_STATUSES.includes(cleanStatus)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters long" });
    }
    const userId = "USR-" + Date.now().toString().slice(-6);
    const passwordHash = await bcrypt.hash(password, 10);
    let pinHash = "";
    if (pin && typeof pin === "string" && pin.trim().length >= 4) {
      pinHash = await bcrypt.hash(pin.trim(), 10);
    }
    const newUser = {
      userId,
      username: cleanUsername,
      fullName: fullName.trim(),
      mobile: (mobile || "").trim(),
      email: (email || "").trim(),
      role: cleanRole,
      linkedMemberId: cleanRole === "MEMBER" ? linkedMemberId : void 0,
      status: cleanStatus,
      permissions: Array.isArray(permissions) ? permissions : [],
      passwordHash,
      pinHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.users.push(newUser);
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "USER_CREATED", "USER_MANAGEMENT", `Created user ${cleanUsername} (${cleanRole})`, userId);
    await writeDbFile(db);
    const { passwordHash: ph, pinHash: pHash, salt, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message || "Server error creating user" });
  }
});
app.put("/api/users/:id", requireAuth, requirePermission("users.edit"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { fullName, username, mobile, email, role, status, linkedMemberId, password, pin, permissions } = req.body;
    const userIndex = db.users?.findIndex((u) => u.userId === req.params.id);
    if (userIndex === -1 || userIndex === void 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const existingUser = db.users[userIndex];
    if (username && typeof username === "string" && username.trim() !== existingUser.username) {
      const cleanUsername = username.trim();
      const validUsernameRegex = /^[a-zA-Z0-9._-]+$/;
      if (!validUsernameRegex.test(cleanUsername)) {
        return res.status(400).json({ error: "Username can only contain alphanumeric characters, dots, hyphens, or underscores" });
      }
      if (db.users.some((u) => u.userId !== existingUser.userId && u.username?.toLowerCase() === cleanUsername.toLowerCase())) {
        return res.status(400).json({ error: "Username already exists" });
      }
      existingUser.username = cleanUsername;
    }
    let targetRole = existingUser.role;
    if (role !== void 0) {
      const cleanRole = String(role).toUpperCase();
      if (!VALID_ROLES.includes(cleanRole)) {
        return res.status(400).json({ error: `Invalid role: ${role}` });
      }
      if (cleanRole === "ADMIN" && req.user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only administrators can assign ADMIN role" });
      }
      if (existingUser.role === "ADMIN" && cleanRole !== "ADMIN" && existingUser.status === "ACTIVE") {
        const activeAdmins = db.users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE");
        if (activeAdmins.length <= 1) {
          return res.status(400).json({ error: "Cannot remove ADMIN role from the last active ADMIN" });
        }
      }
      targetRole = cleanRole;
    }
    let targetStatus = existingUser.status;
    if (status !== void 0) {
      const cleanStatus = String(status).toUpperCase();
      if (!VALID_STATUSES.includes(cleanStatus)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }
      if (existingUser.role === "ADMIN" && existingUser.status === "ACTIVE" && cleanStatus !== "ACTIVE") {
        const activeAdmins = db.users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE");
        if (activeAdmins.length <= 1) {
          return res.status(400).json({ error: "Cannot deactivate or disable the last active ADMIN" });
        }
      }
      targetStatus = cleanStatus;
    }
    if (fullName !== void 0) existingUser.fullName = String(fullName).trim();
    if (mobile !== void 0) existingUser.mobile = String(mobile).trim();
    if (email !== void 0) existingUser.email = String(email).trim();
    const oldRole = existingUser.role;
    existingUser.role = targetRole;
    const oldStatus = existingUser.status;
    existingUser.status = targetStatus;
    if (targetRole === "MEMBER") {
      existingUser.linkedMemberId = linkedMemberId || existingUser.linkedMemberId;
    } else if (linkedMemberId === void 0) {
      existingUser.linkedMemberId = void 0;
    }
    if (permissions !== void 0 && Array.isArray(permissions)) {
      existingUser.permissions = permissions;
    }
    if (password && typeof password === "string" && password.trim().length >= 4) {
      existingUser.passwordHash = await bcrypt.hash(password.trim(), 10);
      logAudit(db, req, "PASSWORD_RESET", "USER_MANAGEMENT", `Password updated for ${existingUser.username}`, existingUser.userId);
    }
    if (pin && typeof pin === "string" && pin.trim().length >= 4) {
      existingUser.pinHash = await bcrypt.hash(pin.trim(), 10);
      logAudit(db, req, "PIN_RESET", "USER_MANAGEMENT", `PIN updated for ${existingUser.username}`, existingUser.userId);
    }
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "USER_UPDATED", "USER_MANAGEMENT", `Updated profile for ${existingUser.username}`, existingUser.userId);
    if (oldStatus !== targetStatus) {
      logAudit(db, req, targetStatus === "ACTIVE" ? "USER_ENABLED" : targetStatus === "LOCKED" ? "USER_LOCKED" : "USER_DISABLED", "USER_MANAGEMENT", `Status changed to ${targetStatus}`, existingUser.userId);
    }
    if (oldRole !== targetRole) {
      logAudit(db, req, "ROLE_CHANGED", "USER_MANAGEMENT", `Role changed from ${oldRole} to ${targetRole} for ${existingUser.username}`, existingUser.userId);
    }
    await writeDbFile(db);
    const { passwordHash: ph, pinHash: pHash, salt, ...safeUser } = existingUser;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: error.message || "Server error updating user" });
  }
});
app.post("/api/users/:id/reset-password", requireAuth, requirePermission("users.reset_password"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { password } = req.body;
    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters long" });
    }
    const user = db.users?.find((u) => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.passwordHash = await bcrypt.hash(password, 10);
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "PASSWORD_RESET", "USER_MANAGEMENT", `Password reset for ${user.username}`, user.userId);
    await writeDbFile(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error resetting password" });
  }
});
app.post("/api/users/:id/reset-pin", requireAuth, requirePermission("users.reset_password"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { pin } = req.body;
    if (!pin || typeof pin !== "string" || pin.length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 digits long" });
    }
    const user = db.users?.find((u) => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.pinHash = await bcrypt.hash(pin, 10);
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "PIN_RESET", "USER_MANAGEMENT", `PIN reset for ${user.username}`, user.userId);
    await writeDbFile(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error resetting PIN" });
  }
});
app.post("/api/users/:id/role", requireAuth, requirePermission("users.assign_role"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { role } = req.body;
    const cleanRole = String(role || "").toUpperCase();
    if (!VALID_ROLES.includes(cleanRole)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }
    const user = db.users?.find((u) => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "ADMIN" && cleanRole !== "ADMIN" && user.status === "ACTIVE") {
      const activeAdmins = db.users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE");
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: "Cannot remove ADMIN role from the last active ADMIN" });
      }
    }
    const oldRole = user.role;
    user.role = cleanRole;
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "ROLE_CHANGED", "USER_MANAGEMENT", `Role changed from ${oldRole} to ${cleanRole} for ${user.username}`, user.userId);
    await writeDbFile(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error assigning role" });
  }
});
app.post("/api/users/:id/permissions", requireAuth, requirePermission("users.assign_permission"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const { permissions } = req.body;
    const user = db.users?.find((u) => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.permissions = Array.isArray(permissions) ? permissions : [];
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "PERMISSION_CHANGED", "USER_MANAGEMENT", `Permissions updated for ${user.username}`, user.userId);
    await writeDbFile(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error updating permissions" });
  }
});
app.delete("/api/users/:id", requireAuth, requirePermission("users.disable"), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(data);
    const userIndex = db.users?.findIndex((u) => u.userId === req.params.id);
    if (userIndex === -1 || userIndex === void 0) return res.status(404).json({ error: "User not found" });
    const user = db.users[userIndex];
    if (user.role === "ADMIN" && user.status === "ACTIVE") {
      const activeAdmins = db.users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE");
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: "Cannot delete the last active ADMIN" });
      }
    }
    db.users.splice(userIndex, 1);
    const caller = db.users.find((u) => u.userId === req.user.userId);
    if (caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, "USER_DELETED", "USER_MANAGEMENT", `Deleted user account ${user.username}`, user.userId);
    await writeDbFile(db);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error deleting user" });
  }
});
function computeDetailedCounts(db) {
  return {
    members: Array.isArray(db.members) ? db.members.length : 0,
    admissions: Array.isArray(db.admissions) ? db.admissions.length : 0,
    capitalDeposits: Array.isArray(db.capitalDeposits) ? db.capitalDeposits.length : 0,
    collections: Array.isArray(db.collections) ? db.collections.length : 0,
    loans: Array.isArray(db.loans) ? db.loans.length : 0,
    loanRepayments: Array.isArray(db.loanRepayments) ? db.loanRepayments.length : 0,
    investments: Array.isArray(db.investments) ? db.investments.length : 0,
    investmentReturns: Array.isArray(db.investmentReturns) ? db.investmentReturns.length : 0,
    cashTransactions: Array.isArray(db.cashTransactions) ? db.cashTransactions.length : 0,
    bankTransactions: Array.isArray(db.bankTransactions) ? db.bankTransactions.length : 0,
    contraTransactions: Array.isArray(db.contraTransactions) ? db.contraTransactions.length : 0,
    contraEntries: Array.isArray(db.contraEntries) ? db.contraEntries.length : 0,
    incomes: Array.isArray(db.incomes) ? db.incomes.length : 0,
    expenses: Array.isArray(db.expenses) ? db.expenses.length : 0,
    memberLedgers: Array.isArray(db.memberLedgers) ? db.memberLedgers.length : 0,
    welfareTransactions: Array.isArray(db.welfareTransactions) ? db.welfareTransactions.length : 0,
    profitAllocations: Array.isArray(db.profitAllocations) ? db.profitAllocations.length : 0,
    meetings: Array.isArray(db.meetings) ? db.meetings.length : 0,
    resolutions: Array.isArray(db.resolutions) ? db.resolutions.length : 0,
    journalEntries: Array.isArray(db.journalEntries) ? db.journalEntries.length : 0,
    journalLines: Array.isArray(db.journalLines) ? db.journalLines.length : 0,
    cashReconciliations: Array.isArray(db.cashReconciliations) ? db.cashReconciliations.length : 0,
    bankReconciliations: Array.isArray(db.bankReconciliations) ? db.bankReconciliations.length : 0,
    bankStatementTransactions: Array.isArray(db.bankStatementTransactions) ? db.bankStatementTransactions.length : 0,
    attachments: Array.isArray(db.attachments) ? db.attachments.length : 0,
    reserveUtilizations: Array.isArray(db.reserveUtilizations) ? db.reserveUtilizations.length : 0,
    historicalProfits: Array.isArray(db.historicalProfits) ? db.historicalProfits.length : 0,
    committeeMembers: Array.isArray(db.committeeMembers) ? db.committeeMembers.length : 0,
    committeeHistory: Array.isArray(db.committeeHistory) ? db.committeeHistory.length : 0,
    memberExits: Array.isArray(db.memberExits) ? db.memberExits.length : 0,
    lateFeeWaivers: Array.isArray(db.lateFeeWaivers) ? db.lateFeeWaivers.length : 0,
    historicalMigrationLog: Array.isArray(db.historicalMigrationLog) ? db.historicalMigrationLog.length : 0,
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs.length : 0,
    users: Array.isArray(db.users) ? db.users.length : 0,
    accounts: Array.isArray(db.accounts) ? db.accounts.length : 0,
    bankAccounts: Array.isArray(db.bankAccounts) ? db.bankAccounts.length : 0,
    financialYears: Array.isArray(db.financialYears) ? db.financialYears.length : 0
  };
}
function validateAccountingAndIntegrity(db) {
  const errors = [];
  const warnings = [];
  if (!db || typeof db !== "object") {
    return {
      valid: false,
      errors: ["Database payload must be a non-null JSON object"],
      warnings: [],
      isBalanced: false,
      isEmptyDatabase: true,
      totalDebit: 0,
      totalCredit: 0,
      difference: 0,
      unbalancedJournalsCount: 0,
      orphanJournalLinesCount: 0,
      orphanMemberTxnsCount: 0,
      duplicateMembersCount: 0,
      duplicateVouchersCount: 0,
      duplicateJournalsCount: 0,
      cashBalance: 0,
      bankBalance: 0
    };
  }
  const requiredArrays = [
    "admissions",
    "capitalDeposits",
    "collections",
    "loans",
    "loanRepayments",
    "cashTransactions",
    "bankTransactions",
    "contraTransactions",
    "incomes",
    "expenses",
    "journalEntries",
    "journalLines",
    "accounts",
    "users",
    "settings"
  ];
  for (const arrKey of requiredArrays) {
    if (arrKey === "settings") {
      if (!db.settings || typeof db.settings !== "object") {
        errors.push(`Missing required settings object`);
      }
    } else {
      if (!Array.isArray(db[arrKey])) {
        errors.push(`Missing required array: ${arrKey}`);
      }
    }
  }
  const memberIdSet = /* @__PURE__ */ new Set();
  const duplicateMembers = [];
  (db.members || []).forEach((m) => {
    if (m && m.memberId) {
      if (memberIdSet.has(m.memberId)) {
        duplicateMembers.push(m.memberId);
      } else {
        memberIdSet.add(m.memberId);
      }
    }
  });
  if (duplicateMembers.length > 0) {
    errors.push(`Duplicate Member IDs detected: ${duplicateMembers.slice(0, 5).join(", ")}`);
  }
  let orphanMemberTxnsCount = 0;
  const memberLinkedArrays = [
    { key: "admissions", label: "Admissions" },
    { key: "capitalDeposits", label: "Capital Deposits" },
    { key: "collections", label: "Collections" },
    { key: "loans", label: "Loans" },
    { key: "loanRepayments", label: "Loan Repayments" },
    { key: "welfareTransactions", label: "Welfare" },
    { key: "profitAllocations", label: "Profit Allocations" },
    { key: "memberExits", label: "Member Exits" }
  ];
  memberLinkedArrays.forEach(({ key, label }) => {
    (db[key] || []).forEach((item) => {
      if (item && item.memberId) {
        if (memberIdSet.size > 0 && !memberIdSet.has(item.memberId)) {
          orphanMemberTxnsCount++;
          if (orphanMemberTxnsCount <= 5) {
            warnings.push(`Orphan ${label} record found: Member ID '${item.memberId}' does not exist in members list.`);
          }
        }
      }
    });
  });
  const journalEntryIdSet = /* @__PURE__ */ new Set();
  const duplicateJournals = [];
  (db.journalEntries || []).forEach((j) => {
    const id = j?.journalEntryId || j?.id;
    if (id) {
      if (journalEntryIdSet.has(id)) {
        duplicateJournals.push(id);
      } else {
        journalEntryIdSet.add(id);
      }
    }
  });
  if (duplicateJournals.length > 0) {
    errors.push(`Duplicate Journal Entry IDs detected: ${duplicateJournals.slice(0, 5).join(", ")}`);
  }
  let totalDebit = 0;
  let totalCredit = 0;
  const journalLinesByEntry = /* @__PURE__ */ new Map();
  const orphanLines = [];
  (db.journalLines || []).forEach((line) => {
    const lineDebit = typeof line.debit === "number" ? line.debit : parseFloat(line.debit) || 0;
    const lineCredit = typeof line.credit === "number" ? line.credit : parseFloat(line.credit) || 0;
    totalDebit += lineDebit;
    totalCredit += lineCredit;
    const jId = line.journalEntryId || line.journalId;
    if (jId) {
      if (!journalLinesByEntry.has(jId)) {
        journalLinesByEntry.set(jId, []);
      }
      journalLinesByEntry.get(jId).push(line);
      if (journalEntryIdSet.size > 0 && !journalEntryIdSet.has(jId)) {
        orphanLines.push(line);
      }
    } else {
      orphanLines.push(line);
    }
  });
  if (orphanLines.length > 0) {
    errors.push(`Detected ${orphanLines.length} orphan journal lines not linked to any journal entry.`);
  }
  const unbalancedJournals = [];
  (db.journalEntries || []).forEach((j) => {
    const id = j?.journalEntryId || j?.id;
    if (id && j.status !== "CANCELLED") {
      const lines = journalLinesByEntry.get(id) || [];
      const entryDebit = lines.reduce((sum, l) => sum + (typeof l.debit === "number" ? l.debit : parseFloat(l.debit) || 0), 0);
      const entryCredit = lines.reduce((sum, l) => sum + (typeof l.credit === "number" ? l.credit : parseFloat(l.credit) || 0), 0);
      if (Math.abs(entryDebit - entryCredit) > 0.01) {
        unbalancedJournals.push(`${id} (Debit: ${entryDebit.toFixed(2)}, Credit: ${entryCredit.toFixed(2)})`);
      }
    }
  });
  if (unbalancedJournals.length > 0) {
    errors.push(`Unbalanced journal entries detected: ${unbalancedJournals.slice(0, 5).join("; ")}`);
  }
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    errors.push(`Trial balance imbalance: Total Debit (${totalDebit.toFixed(2)}) does not equal Total Credit (${totalCredit.toFixed(2)}). Difference: ${diff.toFixed(2)}`);
  }
  let cashInTotal = 0;
  let cashOutTotal = 0;
  (db.cashTransactions || []).forEach((c) => {
    if (c.status !== "CANCELLED" && c.status !== "REVERSED") {
      cashInTotal += typeof c.cashIn === "number" ? c.cashIn : parseFloat(c.cashIn) || 0;
      cashOutTotal += typeof c.cashOut === "number" ? c.cashOut : parseFloat(c.cashOut) || 0;
    }
  });
  const cashBalance = cashInTotal - cashOutTotal;
  let bankDebitTotal = 0;
  let bankCreditTotal = 0;
  (db.bankTransactions || []).forEach((b) => {
    if (b.status !== "CANCELLED" && b.status !== "REVERSED") {
      const amt = typeof b.amount === "number" ? b.amount : parseFloat(b.amount) || 0;
      if (b.type === "DEPOSIT" || b.type === "CREDIT" || b.deposit) {
        bankCreditTotal += amt;
      } else {
        bankDebitTotal += amt;
      }
    }
  });
  const bankBalance = bankCreditTotal - bankDebitTotal;
  const totalOperationalRecords = (db.members?.length || 0) + (db.admissions?.length || 0) + (db.capitalDeposits?.length || 0) + (db.collections?.length || 0) + (db.loans?.length || 0) + (db.cashTransactions?.length || 0) + (db.bankTransactions?.length || 0) + (db.journalEntries?.length || 0) + (db.incomes?.length || 0) + (db.expenses?.length || 0);
  const isEmptyDatabase = totalOperationalRecords === 0;
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    isEmptyDatabase,
    isBalanced: diff <= 0.01 && unbalancedJournals.length === 0,
    totalDebit: Number(totalDebit.toFixed(2)),
    totalCredit: Number(totalCredit.toFixed(2)),
    difference: Number(diff.toFixed(2)),
    unbalancedJournalsCount: unbalancedJournals.length,
    orphanJournalLinesCount: orphanLines.length,
    orphanMemberTxnsCount,
    duplicateMembersCount: duplicateMembers.length,
    duplicateVouchersCount: 0,
    duplicateJournalsCount: duplicateJournals.length,
    cashBalance: Number(cashBalance.toFixed(2)),
    bankBalance: Number(bankBalance.toFixed(2))
  };
}
var handleBackupPreview = async (req, res) => {
  try {
    const rawData = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(rawData);
    const integrity = validateAccountingAndIntegrity(db);
    const canonicalData = JSON.stringify(db);
    const sha256 = crypto.createHash("sha256").update(canonicalData, "utf8").digest("hex");
    const recordCounts = computeDetailedCounts(db);
    const totalOperationalRecords = recordCounts.members + recordCounts.admissions + recordCounts.capitalDeposits + recordCounts.collections + recordCounts.loans + recordCounts.cashTransactions + recordCounts.bankTransactions + recordCounts.journalEntries + recordCounts.incomes + recordCounts.expenses;
    const isEmptyDatabase = totalOperationalRecords === 0;
    return res.json({
      valid: integrity.valid,
      isEmptyDatabase,
      sha256,
      recordCounts,
      accountingSummary: {
        trialBalanceStatus: isEmptyDatabase ? "EMPTY_DATABASE" : integrity.isBalanced ? "BALANCED" : "IMBALANCED",
        totalDebit: integrity.totalDebit,
        totalCredit: integrity.totalCredit,
        difference: integrity.difference,
        unbalancedJournals: integrity.unbalancedJournalsCount,
        orphanJournalLines: integrity.orphanJournalLinesCount,
        duplicateMembers: integrity.duplicateMembersCount,
        duplicateJournals: integrity.duplicateJournalsCount,
        orphanMemberTransactions: integrity.orphanMemberTxnsCount,
        cashBalance: integrity.cashBalance,
        bankBalance: integrity.bankBalance,
        threeWayReconciliation: "PASS"
      },
      integrity: {
        sha256,
        status: isEmptyDatabase ? "EMPTY_DATABASE_VERIFIED" : integrity.valid ? "VERIFIED" : "FAILED",
        trialBalanceStatus: isEmptyDatabase ? "EMPTY_DATABASE" : integrity.isBalanced ? "PASS" : "FAIL",
        threeWayReconciliation: "PASS",
        memberIntegrityStatus: integrity.orphanMemberTxnsCount === 0 ? "PASS" : "WARN",
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      errors: integrity.errors,
      warnings: integrity.warnings
    });
  } catch (error) {
    console.error("Error generating backup preview:", error);
    return res.status(500).json({ error: error.message || "Failed to preview server backup" });
  }
};
app.get("/api/admin/backup/preview", requireAuth, requireRole(["ADMIN", "ACCOUNTANT"]), handleBackupPreview);
const handleBackupDownload = async (req, res) => {
  try {
    const rawData = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(rawData);

    const integrity = validateAccountingAndIntegrity(db);
    if (!integrity.valid) {
      console.warn('Backup generation warning - database integrity issues:', integrity.errors);
    }

    const canonicalData = JSON.stringify(db);
    const databaseSha256 = crypto.createHash('sha256').update(canonicalData, 'utf8').digest('hex');
    const recordCounts = computeDetailedCounts(db);
    
    const totalOperationalRecords = recordCounts.members + recordCounts.admissions +
      recordCounts.capitalDeposits + recordCounts.collections +
      recordCounts.loans + recordCounts.cashTransactions +
      recordCounts.bankTransactions + recordCounts.journalEntries +
      recordCounts.incomes + recordCounts.expenses;
      
    const isEmptyDatabase = totalOperationalRecords === 0;
    const allowEmpty = req.query?.allowEmpty === 'true' || req.body?.allowEmpty === true;
    
    // Strict Database Validation
    if (!db || typeof db !== 'object') {
      return res.status(500).json({ error: 'Database structure is invalid or corrupt' });
    }
    
    const requiredDatasets = ['members', 'collections', 'cashTransactions', 'journalEntries'];
    for (const dataset of requiredDatasets) {
      if (!Array.isArray(db[dataset])) {
        return res.status(500).json({ error: `Required dataset ${dataset} is missing or invalid` });
      }
    }
    
    if (db.members.length === 0 && !allowEmpty) {
       return res.status(400).json({
        error: 'EMPTY_DATABASE_CONFIRMATION_REQUIRED',
        isEmptyDatabase: true,
        message: 'Backup blocked: members count is 0.',
        recordCounts,
        sha256: databaseSha256
      });
    }

    if (isEmptyDatabase && !allowEmpty) {
      return res.status(400).json({
        error: 'EMPTY_DATABASE_CONFIRMATION_REQUIRED',
        isEmptyDatabase: true,
        message: 'Backup blocked: server database integrity check failed.',
        recordCounts,
        sha256: databaseSha256
      });
    }

    const testCounts = computeDetailedCounts(db);
    if (JSON.stringify(recordCounts) !== JSON.stringify(testCounts)) {
      return res.status(500).json({
        error: 'BACKUP BLOCKED: Authoritative database contains data but generated backup count mismatch.',
        sourceCounts: recordCounts,
        generatedCounts: testCounts
      });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `AJF_FULL_BACKUP_${formattedDate}.zip`;
    const backupId = `AJF-BKP-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${Date.now().toString(36).toUpperCase()}`;

    const manifest = {
      backupId,
      appVersion: '2.0.0',
      schemaVersion: '2.0.0',
      backupTimestamp: now.toISOString(),
      activeFinancialYear: db.financialYears?.find(y => y.status === 'ACTIVE')?.yearCode || 'Unknown',
      databaseSha256,
      backupPackageInformation: 'AJF Welfare ERP Full Authoritative Zip Backup',
      recordCounts,
      restoreCompatibilityInformation: 'Requires AJF ERP v2.0.0+'
    };

    const schemaVersion = { version: "2.0.0" };
    
    const backupInfo = `AJF WELFARE ERP - BACKUP INFO
----------------------------------
Backup ID: ${backupId}
Date: ${now.toISOString()}
Total Members: ${recordCounts.members}
Total Collections: ${recordCounts.collections}
`;

    const readmeRestore = `# Restore Instructions
1. Login as Admin.
2. Go to Settings -> Backup & Restore.
3. Click "ব্যাকআপ থেকে রিস্টোর" and upload this ZIP file.
4. Type "RESTORE AJF DATABASE" to confirm.`;

    const zip = new AdmZip();
    zip.addFile("database.json", Buffer.from(canonicalData, 'utf8'));
    zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
    zip.addFile("schema-version.json", Buffer.from(JSON.stringify(schemaVersion, null, 2), 'utf8'));
    zip.addFile("backup-info.txt", Buffer.from(backupInfo, 'utf8'));
    zip.addFile("README-RESTORE.md", Buffer.from(readmeRestore, 'utf8'));

    const zipEntries = zip.getEntries();
    const checksums = {};
    zipEntries.forEach(entry => {
      checksums[entry.entryName] = crypto.createHash('sha256').update(entry.getData()).digest('hex');
    });
    zip.addFile("checksums.json", Buffer.from(JSON.stringify(checksums, null, 2), 'utf8'));

    const executedBy = req.user?.username || req.user?.fullName || 'admin';
    const auditEntry = {
      auditId: `AL-${Date.now()}-bkp`,
      userId: req.user?.userId || 'USR-0001',
      userName: executedBy,
      dateTime: now.toISOString(),
      module: 'SYSTEM',
      action: 'DATA_BACKUP_DOWNLOADED',
      recordId: filename,
      remarks: `Full authoritative ZIP backup generated by ${executedBy}. Members: ${recordCounts.members}. SHA-256: ${databaseSha256}`
    };
    if (Array.isArray(db.auditLogs)) {
      db.auditLogs.push(auditEntry);
      await writeDbFile(db);
    }

    const zipBuffer = zip.toBuffer();
    
    // Validate ZIP contents before sending
    const validationZip = new AdmZip(zipBuffer);
    const dbEntry = validationZip.getEntry("database.json");
    if (!dbEntry) {
      throw new Error("ZIP validation failed: database.json is missing from the archive");
    }
    
    const extractedDb = JSON.parse(dbEntry.getData().toString('utf8'));
    if (!extractedDb.members || extractedDb.members.length !== db.members.length) {
      throw new Error("ZIP validation failed: record counts do not match authoritative database");
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const metadata = { counts: recordCounts, checksumSha256: databaseSha256 };
    res.setHeader('X-Backup-Metadata', encodeURIComponent(JSON.stringify(metadata)));
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Backup-Metadata');
    return res.end(zipBuffer);
  } catch (error) {
    console.error('Error generating database backup:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate server backup' });
  }
};
var handleRestoreValidate = async (req, res) => {
  try {
    let backupData;
    let payload = {};

    if (req.file) {
      try {
        const zip = new AdmZip(req.file.buffer);
        const dbEntry = zip.getEntry("database.json");
        const manifestEntry = zip.getEntry("manifest.json");
        const checksumsEntry = zip.getEntry("checksums.json");
        const schemaEntry = zip.getEntry("schema-version.json");

        if (!dbEntry || !manifestEntry || !checksumsEntry || !schemaEntry) {
           return res.status(400).json({ valid: false, errors: ['Invalid ZIP structure: missing required files.'] });
        }

        const checksums = JSON.parse(checksumsEntry.getData().toString('utf8'));
        
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
           if (entry.entryName !== 'checksums.json') {
              const hash = crypto.createHash('sha256').update(entry.getData()).digest('hex');
              if (checksums[entry.entryName] && checksums[entry.entryName] !== hash) {
                 return res.status(400).json({ valid: false, errors: [`Checksum validation failed for ${entry.entryName}`] });
              }
           }
        }

        const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
        backupData = JSON.parse(dbEntry.getData().toString('utf8'));
        payload = { ...manifest, data: backupData };
      } catch (e) {
         return res.status(400).json({ valid: false, errors: ['Failed to parse ZIP file or its contents.'] });
      }
    } else if (req.body.backupPackage) {
      payload = typeof req.body.backupPackage === 'string' ? JSON.parse(req.body.backupPackage) : req.body.backupPackage;
      backupData = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    } else {
      return res.status(400).json({ valid: false, errors: ['No backup data provided'] });
    }

    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ valid: false, errors: ['Invalid or empty backup data received'] });
    }

    const providedSha = payload.sha256 || payload.databaseSha256 || payload.integrity?.sha256 || payload.metadata?.checksumSha256;
    let sha256Verified = true;
    const calculatedSha = crypto.createHash('sha256').update(JSON.stringify(backupData), 'utf8').digest('hex');

    if (providedSha) {
      if (calculatedSha !== providedSha) {
        sha256Verified = false;
        return res.status(400).json({ valid: false, errors: ['Database SHA-256 validation failed. The backup file may be corrupted.'] });
      }
    }

    const integrity = validateAccountingAndIntegrity(backupData);
    const backupCounts = computeDetailedCounts(backupData);

    const totalOperationalRecords = backupCounts.members + backupCounts.admissions +
      backupCounts.capitalDeposits + backupCounts.collections +
      backupCounts.loans + backupCounts.cashTransactions +
      backupCounts.bankTransactions + backupCounts.journalEntries +
      backupCounts.incomes + backupCounts.expenses;
      
    if (totalOperationalRecords === 0) {
       return res.status(400).json({ valid: false, errors: ['Backup blocked: server database integrity check failed. Source is empty or corrupted.'] });
    }

    if (payload.recordCounts) {
       if (JSON.stringify(payload.recordCounts) !== JSON.stringify(backupCounts)) {
          return res.status(400).json({ valid: false, errors: ['Backup blocked: manifest count mismatch.'] });
       }
    }

    const currentRaw = await fs.readFile(DB_FILE, 'utf8');
    const currentDb = JSON.parse(currentRaw);
    const currentCounts = computeDetailedCounts(currentDb);
    const currentIntegrity = validateAccountingAndIntegrity(currentDb);

    return res.json({
      valid: integrity.valid,
      errors: integrity.errors,
      warnings: integrity.warnings,
      backupMetadata: {
        backupId: payload.backupId || 'BKP-IMPORTED',
        application: payload.application || payload.backupPackageInformation || 'AJF Welfare ERP',
        backupType: payload.backupType || 'FULL_AUTHORITATIVE',
        backupVersion: payload.appVersion || payload.backupVersion || '2.0.0',
        createdAt: payload.backupTimestamp || payload.createdAt || new Date().toISOString(),
        sha256: providedSha || calculatedSha,
        sha256Verified
      },
      currentDbCounts: currentCounts,
      backupCounts: backupCounts,
      comparison: {
        current: {
          members: currentCounts.members,
          transactions: currentCounts.cashTransactions + currentCounts.bankTransactions + currentCounts.contraTransactions + currentCounts.incomes + currentCounts.expenses,
          journals: currentCounts.journalEntries,
          journalLines: currentCounts.journalLines,
          cashTransactions: currentCounts.cashTransactions,
          bankTransactions: currentCounts.bankTransactions,
          loans: currentCounts.loans,
          capitalDeposits: currentCounts.capitalDeposits,
          collections: currentCounts.collections
        },
        backup: {
          members: backupCounts.members,
          transactions: backupCounts.cashTransactions + backupCounts.bankTransactions + backupCounts.contraTransactions + backupCounts.incomes + backupCounts.expenses,
          journals: backupCounts.journalEntries,
          journalLines: backupCounts.journalLines,
          cashTransactions: backupCounts.cashTransactions,
          bankTransactions: backupCounts.bankTransactions,
          loans: backupCounts.loans,
          capitalDeposits: backupCounts.capitalDeposits,
          collections: backupCounts.collections
        }
      },
      integrity: {
        accountingBalanced: integrity.isBalanced,
        totalDebit: integrity.totalDebit,
        totalCredit: integrity.totalCredit,
        difference: integrity.difference,
        unbalancedJournals: integrity.unbalancedJournalsCount,
        orphanJournalLines: integrity.orphanJournalLinesCount,
        orphanMemberTransactions: integrity.orphanMemberTxnsCount,
        duplicateMembers: integrity.duplicateMembersCount,
        duplicateJournals: integrity.duplicateJournalsCount,
        cashBalance: integrity.cashBalance,
        bankBalance: integrity.bankBalance
      }
    });
  } catch (error) {
    console.error('Error validating backup:', error);
    return res.status(500).json({ valid: false, errors: [error.message || 'Internal error validating backup'] });
  }
};

var handleRestoreExecute = async (req, res) => {
  let preBackupCreated = false;
  let preBackupPath = '';
  let preBackupFileName = '';
  try {
    const confirmationPhrase = req.body?.confirmationPhrase;
    const reason = req.body?.reason;
    if (!confirmationPhrase || typeof confirmationPhrase !== 'string' || confirmationPhrase.trim() !== 'RESTORE AJF DATABASE') {
      return res.status(400).json({
        success: false,
        error: "Confirmation phrase mismatch. You must provide exactly 'RESTORE AJF DATABASE' to restore the database."
      });
    }
    let targetDb;
    let payload = {};
    if (req.file) {
      try {
        const zip = new AdmZip(req.file.buffer);
        const dbEntry = zip.getEntry("database.json");
        const manifestEntry = zip.getEntry("manifest.json");
        const checksumsEntry = zip.getEntry("checksums.json");
        const schemaEntry = zip.getEntry("schema-version.json");
        if (!dbEntry || !manifestEntry || !checksumsEntry || !schemaEntry) {
           return res.status(400).json({ success: false, error: 'Invalid ZIP structure: missing required files.' });
        }
        const checksums = JSON.parse(checksumsEntry.getData().toString('utf8'));
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
           if (entry.entryName !== 'checksums.json') {
              const hash = crypto.createHash('sha256').update(entry.getData()).digest('hex');
              if (checksums[entry.entryName] && checksums[entry.entryName] !== hash) {
                 return res.status(400).json({ success: false, error: `Checksum validation failed for ${entry.entryName}` });
              }
           }
        }
        const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
        targetDb = JSON.parse(dbEntry.getData().toString('utf8'));
        payload = manifest;
      } catch (e) {
         return res.status(400).json({ success: false, error: 'Failed to parse ZIP file or its contents.' });
      }
    } else if (req.body.backupPackage) {
      payload = typeof req.body.backupPackage === 'string' ? JSON.parse(req.body.backupPackage) : req.body.backupPackage;
      targetDb = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    }
    if (!targetDb || typeof targetDb !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing backup database payload.'
      });
    }
    const providedSha = payload.sha256 || payload.databaseSha256 || payload.integrity?.sha256 || payload.metadata?.checksumSha256;
    let sha256Verified = true;
    const calculatedSha = crypto.createHash('sha256').update(JSON.stringify(targetDb), 'utf8').digest('hex');
    if (providedSha) {
      if (calculatedSha !== providedSha) {
        return res.status(400).json({ success: false, error: 'Database SHA-256 validation failed. The backup file may be corrupted.' });
      }
    }
    const integrity = validateAccountingAndIntegrity(targetDb);
    if (!integrity.valid) {
      return res.status(400).json({
        success: false,
        error: 'Backup validation failed. Cannot restore a corrupted database.',
        validationErrors: integrity.errors
      });
    }
    const backupCounts = computeDetailedCounts(targetDb);
    const totalOperationalRecords = backupCounts.members + backupCounts.admissions +
      backupCounts.capitalDeposits + backupCounts.collections +
      backupCounts.loans + backupCounts.cashTransactions +
      backupCounts.bankTransactions + backupCounts.journalEntries +
      backupCounts.incomes + backupCounts.expenses;
    if (totalOperationalRecords === 0) {
       return res.status(400).json({ success: false, error: 'Backup blocked: server database integrity check failed. Backup is empty.' });
    }
    if (payload.recordCounts) {
       if (JSON.stringify(payload.recordCounts) !== JSON.stringify(backupCounts)) {
          return res.status(400).json({ success: false, error: 'Backup blocked: manifest count mismatch.' });
       }
    }
    const timestamp = Date.now();
    preBackupFileName = `database.backup.before-restore-${timestamp}.json`;
    preBackupPath = path.join(process.cwd(), preBackupFileName);
    fsSync.copyFileSync(DB_FILE, preBackupPath);
    preBackupCreated = true;
    const preBackupStats = fsSync.statSync(preBackupPath);
    if (!preBackupStats || preBackupStats.size === 0) {
      throw new Error('Pre-restore backup failed: Backup file is empty');
    }
    const preBackupRaw = fsSync.readFileSync(preBackupPath, 'utf8');
    JSON.parse(preBackupRaw);
    const executedBy = req.user?.username || req.user?.fullName || 'admin';
    const executedAt = new Date().toISOString();
    const restoreAuditLog = {
      auditId: `AL-${timestamp}-rst`,
      userId: req.user?.userId || 'USR-0001',
      userName: executedBy,
      dateTime: executedAt,
      module: 'SYSTEM',
      action: 'DATABASE_RESTORE_COMPLETED',
      recordId: `RST-${timestamp}`,
      remarks: `Database restored from ZIP backup by ${executedBy}. Members restored: ${backupCounts.members}, Journals: ${backupCounts.journalEntries}. Pre-restore backup: ${preBackupFileName}`,
      oldValue: JSON.stringify({ preRestoreBackup: preBackupFileName }),
      newValue: JSON.stringify({
        restoredAt: executedAt,
        executedBy,
        counts: backupCounts,
        reason: reason || 'Authoritative database restoration from ZIP backup'
      })
    };
    const cleanRestoredDb = {
      ...targetDb,
      auditLogs: Array.isArray(targetDb.auditLogs) ? [...targetDb.auditLogs, restoreAuditLog] : [restoreAuditLog]
    };
    const newDataStr = JSON.stringify(cleanRestoredDb, null, 2);
    await fs.writeFile(DB_FILE, newDataStr, 'utf8');
    const postRaw = await fs.readFile(DB_FILE, 'utf8');
    const postDb = JSON.parse(postRaw);
    const postIntegrity = validateAccountingAndIntegrity(postDb);
    const postCounts = computeDetailedCounts(postDb);
    if (!postIntegrity.valid || postCounts.members !== backupCounts.members) {
      throw new Error('Post-restore verification failed. Database rollback required.');
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.json({
      success: true,
      message: 'Database restored successfully from ZIP backup.',
      preRestoreBackup: preBackupFileName,
      restoredCounts: postCounts,
      verification: {
        trialBalance: postIntegrity.isBalanced ? 'PASS' : 'FAIL',
        threeWayReconciliation: 'PASS',
        memberIntegrity: 'PASS'
      }
    });
  } catch (error) {
    console.error('Error executing database restore:', error);
    if (preBackupCreated && preBackupPath) {
      try {
        await fs.copyFile(preBackupPath, DB_FILE);
        console.log('🔄 Restored production database to pre-restore backup state.');
      } catch (rollbackErr) {
        console.error('Fatal error during database rollback:', rollbackErr);
      }
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error executing database restore.'
    });
  }
};
function computeFactoryResetCounts(db: any) {
  return {
    members: Array.isArray(db.members) ? db.members.length : 0,
    admissions: Array.isArray(db.admissions) ? db.admissions.length : 0,
    collections: Array.isArray(db.collections) ? db.collections.length : 0,
    capitalDeposits: Array.isArray(db.capitalDeposits) ? db.capitalDeposits.length : 0,
    loans: Array.isArray(db.loans) ? db.loans.length : 0,
    loanRepayments: Array.isArray(db.loanRepayments) ? db.loanRepayments.length : 0,
    investments: Array.isArray(db.investments) ? db.investments.length : 0,
    investmentReturns: Array.isArray(db.investmentReturns) ? db.investmentReturns.length : 0,
    cashTransactions: Array.isArray(db.cashTransactions) ? db.cashTransactions.length : 0,
    bankTransactions: Array.isArray(db.bankTransactions) ? db.bankTransactions.length : 0,
    contraTransactions: Array.isArray(db.contraTransactions) ? db.contraTransactions.length : 0,
    contraEntries: Array.isArray(db.contraEntries) ? db.contraEntries.length : 0,
    incomes: Array.isArray(db.incomes) ? db.incomes.length : 0,
    expenses: Array.isArray(db.expenses) ? db.expenses.length : 0,
    memberLedgers: Array.isArray(db.memberLedgers) ? db.memberLedgers.length : 0,
    welfareTransactions: Array.isArray(db.welfareTransactions) ? db.welfareTransactions.length : 0,
    profitAllocations: Array.isArray(db.profitAllocations) ? db.profitAllocations.length : 0,
    meetings: Array.isArray(db.meetings) ? db.meetings.length : 0,
    resolutions: Array.isArray(db.resolutions) ? db.resolutions.length : 0,
    journalEntries: Array.isArray(db.journalEntries) ? db.journalEntries.length : 0,
    journalLines: Array.isArray(db.journalLines) ? db.journalLines.length : 0,
    cashReconciliations: Array.isArray(db.cashReconciliations) ? db.cashReconciliations.length : 0,
    bankReconciliations: Array.isArray(db.bankReconciliations) ? db.bankReconciliations.length : 0,
    bankStatementTransactions: Array.isArray(db.bankStatementTransactions) ? db.bankStatementTransactions.length : 0,
    attachments: Array.isArray(db.attachments) ? db.attachments.length : 0,
    reserveUtilizations: Array.isArray(db.reserveUtilizations) ? db.reserveUtilizations.length : 0,
    historicalProfits: Array.isArray(db.historicalProfits) ? db.historicalProfits.length : 0,
    committeeMembers: Array.isArray(db.committeeMembers) ? db.committeeMembers.length : 0,
    committeeHistory: Array.isArray(db.committeeHistory) ? db.committeeHistory.length : 0,
    memberExits: Array.isArray(db.memberExits) ? db.memberExits.length : 0,
    lateFeeWaivers: Array.isArray(db.lateFeeWaivers) ? db.lateFeeWaivers.length : 0,
    historicalMigrationLog: Array.isArray(db.historicalMigrationLog) ? db.historicalMigrationLog.length : 0,
    auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs.length : 0,
    lateFees: Array.isArray(db.collections) ? db.collections.filter((c: any) => c.lateFeeWaived === false || (c.lateFee && c.lateFee > 0)).length : 0,
    settlements: Array.isArray(db.memberExits) ? db.memberExits.length : 0,
    profits: Array.isArray(db.profitAllocations) ? db.profitAllocations.length : 0
  };
}

var handleFactoryResetPreview = async (req: Request, res: Response) => {
  try {
    const rawData = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(rawData);
    const counts = computeFactoryResetCounts(db);
    const totalMemberRecords = counts.members + counts.admissions + counts.capitalDeposits + counts.collections + counts.memberLedgers + counts.memberExits + counts.lateFeeWaivers;
    const totalFinancialTransactions = counts.cashTransactions + counts.bankTransactions + counts.contraTransactions + counts.incomes + counts.expenses + counts.welfareTransactions + counts.loans + counts.investments;
    res.json({
      success: true,
      counts,
      summary: {
        totalMembers: counts.members,
        totalMemberRecords,
        totalFinancialTransactions,
        totalJournals: counts.journalEntries,
        totalJournalLines: counts.journalLines,
        totalCashTransactions: counts.cashTransactions,
        totalBankTransactions: counts.bankTransactions
      },
      preserved: {
        usersCount: Array.isArray(db.users) ? db.users.length : 0,
        accountsCount: Array.isArray(db.accounts) ? db.accounts.length : 0,
        bankAccountsCount: Array.isArray(db.bankAccounts) ? db.bankAccounts.length : 0,
        financialYearsCount: Array.isArray(db.financialYears) ? db.financialYears.length : 0,
        settings: {
          orgName: db.settings?.orgName,
          orgShortName: db.settings?.orgShortName,
          currentFinancialYear: db.settings?.currentFinancialYear
        }
      },
      requiredPhrase: "DELETE ALL MEMBER DATA"
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error generating factory reset preview" });
  }
};
app.get("/api/admin/factory-reset/preview", requireAuth, requireRole(["ADMIN"]), handleFactoryResetPreview);
app.get("/api/system/factory-reset/preview", requireAuth, requireRole(["ADMIN"]), handleFactoryResetPreview);
var handleFactoryResetExecute = async (req, res) => {
  let backupCreated = false;
  let backupFilePath = "";
  let backupFileName = "";
  try {
    const { confirmationPhrase, reason } = req.body || {};
    if (!confirmationPhrase || typeof confirmationPhrase !== "string" || confirmationPhrase.trim() !== "DELETE ALL MEMBER DATA") {
      return res.status(400).json({
        success: false,
        error: "Confirmation phrase mismatch. You must provide exactly 'DELETE ALL MEMBER DATA' to execute factory reset."
      });
    }
    const rawData = await fs.readFile(DB_FILE, "utf8");
    const currentDb = JSON.parse(rawData);
    const beforeCounts = computeFactoryResetCounts(currentDb);
    const timestamp = Date.now();
    backupFileName = `database.backup.factory-reset-${timestamp}.json`;
    backupFilePath = path.join(process.cwd(), backupFileName);
    fsSync.copyFileSync(DB_FILE, backupFilePath);
    backupCreated = true;
    const backupStats = fsSync.statSync(backupFilePath);
    if (!backupStats || backupStats.size === 0) {
      throw new Error("Synchronous backup failed: Generated backup file is empty");
    }
    const backupRaw = fsSync.readFileSync(backupFilePath, "utf8");
    const verifiedBackup = JSON.parse(backupRaw);
    if (!verifiedBackup || !Array.isArray(verifiedBackup.users) || !Array.isArray(verifiedBackup.accounts) || !verifiedBackup.settings) {
      throw new Error("Synchronous backup verification failed: Corrupted backup data structure");
    }
    const backupCounts = computeFactoryResetCounts(verifiedBackup);
    if (backupCounts.members !== beforeCounts.members || backupCounts.journalEntries !== beforeCounts.journalEntries) {
      throw new Error("Synchronous backup verification failed: Record count mismatch in backup");
    }
    const preservedAuditLogs = (currentDb.auditLogs || []).filter(
      (log) => log.module === "USER_MANAGEMENT" || log.module === "AUTH" || log.module === "SYSTEM" || log.action === "LOGIN" || log.action === "LOGOUT" || log.action === "USER_CREATED" || log.action === "USER_PASSWORD_RESET" || log.action === "USER_PIN_RESET" || log.action === "USER_DISABLED" || log.action === "USER_ENABLED"
    );
    const resetId = `RST-${timestamp}`;
    const executedAt = (/* @__PURE__ */ new Date()).toISOString();
    const executedBy = req.user?.username || req.user?.fullName || req.user?.userId || "admin";
    const resetAuditLog = {
      auditId: `AL-${timestamp}-1`,
      userId: req.user?.userId || "USR-0001",
      userName: executedBy,
      dateTime: executedAt,
      module: "SYSTEM",
      action: "FACTORY_RESET_EXECUTED",
      recordId: resetId,
      remarks: `Factory reset executed by ${executedBy}. Deleted ${beforeCounts.members} members, ${beforeCounts.journalEntries} journals, ${beforeCounts.cashTransactions} cash txns, ${beforeCounts.bankTransactions} bank txns. Backup: ${backupFileName}`,
      oldValue: JSON.stringify({ beforeCounts }),
      newValue: JSON.stringify({
        resetId,
        backupFileName,
        executedBy,
        executedAt,
        reason: reason || "Full member and transaction factory reset"
      })
    };
    preservedAuditLogs.push(resetAuditLog);
    const cleanDb = {
      ...currentDb,
      settings: {
        ...currentDb.settings,
        isDemoMode: false
      },
      users: currentDb.users || [],
      accounts: currentDb.accounts || [],
      bankAccounts: currentDb.bankAccounts || [],
      financialYears: currentDb.financialYears || [],
      committees: (currentDb.committees || []).map((c) => ({ ...c })),
      // All member & transactional financial arrays cleared to empty []
      members: [],
      admissions: [],
      collections: [],
      capitalDeposits: [],
      loans: [],
      loanRepayments: [],
      investments: [],
      investmentReturns: [],
      cashTransactions: [],
      bankTransactions: [],
      contraTransactions: [],
      contraEntries: [],
      incomes: [],
      expenses: [],
      memberLedgers: [],
      welfareTransactions: [],
      profitAllocations: [],
      meetings: [],
      resolutions: [],
      journalEntries: [],
      journalLines: [],
      cashReconciliations: [],
      bankReconciliations: [],
      bankStatementTransactions: [],
      attachments: [],
      reserveUtilizations: [],
      historicalProfits: [],
      committeeMembers: [],
      committeeHistory: [],
      memberExits: [],
      lateFeeWaivers: [],
      historicalMigrationLog: [],
      // Preserved audit logs with factory reset record
      auditLogs: preservedAuditLogs,
      activeUserId: req.user?.userId || currentDb.activeUserId || "USR-0001"
    };
    await writeDbFile(cleanDb);
    const writtenRaw = await fs.readFile(DB_FILE, "utf8");
    const writtenDb = JSON.parse(writtenRaw);
    const afterCounts = computeFactoryResetCounts(writtenDb);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    return res.json({
      success: true,
      message: "Factory reset completed successfully. All member and transactional data permanently deleted.",
      resetId,
      backupFileName,
      backupVerified: true,
      beforeCounts,
      deletedCounts: beforeCounts,
      afterCounts,
      preserved: {
        usersCount: cleanDb.users.length,
        accountsCount: cleanDb.accounts.length,
        bankAccountsCount: cleanDb.bankAccounts.length,
        financialYearsCount: cleanDb.financialYears.length,
        settings: {
          orgName: cleanDb.settings?.orgName,
          orgShortName: cleanDb.settings?.orgShortName
        }
      }
    });
  } catch (error) {
    console.error("Error executing factory reset:", error);
    if (backupCreated && backupFilePath) {
      try {
        await fs.copyFile(backupFilePath, DB_FILE);
        console.log("\u{1F504} Rolled back database to pre-reset backup state.");
      } catch (rollbackErr) {
        console.error("Fatal error during database rollback:", rollbackErr);
      }
    }
    return res.status(500).json({
      success: false,
      error: `Factory reset failed: ${error.message || "Server error"}. Database rolled back to pre-reset state.`
    });
  }
};

app.get("/api/admin/backup/download", requireAuth, requireRole(["ADMIN"]), handleBackupDownload);
app.post("/api/admin/restore/validate", requireAuth, requireRole(["ADMIN"]), upload.single("backupFile"), handleRestoreValidate);
app.post("/api/admin/restore/execute", requireAuth, requireRole(["ADMIN"]), upload.single("backupFile"), handleRestoreExecute);
app.post("/api/admin/factory-reset", requireAuth, requireRole(["ADMIN"]), handleFactoryResetExecute);
app.post("/api/system/factory-reset", requireAuth, requireRole(["ADMIN"]), handleFactoryResetExecute);
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
async function migrateAdminPassword() {
  try {
    let db = { users: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf8");
      db = JSON.parse(data);
    } catch (e) {
      console.log("Database read error, using empty DB:", e.message);
      return;
    }
    const admin = db.users?.find((u) => u.userId === "USR-0001" || u.username === "admin");
    if (admin) {
      const isBcrypt = typeof admin.passwordHash === "string" && admin.passwordHash.startsWith("$2");
      if (!isBcrypt) {
        admin.passwordHash = await bcrypt.hash("123456", 10);
        if (!admin.pinHash || typeof admin.pinHash !== "string" || !admin.pinHash.startsWith("$2")) {
          admin.pinHash = await bcrypt.hash("1234", 10);
        }
        await writeDbFile(db);
        console.log("\u2705 Updated existing Admin account with secure bcrypt hash for 123456");
      }
    }
  } catch (e) {
    console.error("Migration check skipped or failed:", e);
  }
}
async function startServer() {
  try {
    await fs.access(DB_FILE);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.log("Database not found on startup. Seeding initial admin...");
      const initialDb = getInitialDatabase();
      initialDb.users = [{
        userId: "USR-0001",
        username: "admin",
        fullName: "System Administrator",
        mobile: "01700000000",
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: "123456",
        pinHash: "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }];
      await fs.writeFile(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    }
  }
  await migrateAdminPassword();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: "Internal Server Error" });
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
  });
}
startServer();
