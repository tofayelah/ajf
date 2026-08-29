const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

// Add wrapper signatures
content = content.replace(/restoreBackup:\s*\(backupDb:\s*AppDatabaseState\)\s*=>\s*boolean;/, 
`restoreBackup: (backupDb: AppDatabaseState) => boolean;
  requestMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  reviewMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  approveMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  rejectMemberExit: (params: any) => Promise<{success: boolean; message: string}>;
  processMemberExitRefund: (params: any) => Promise<{success: boolean; message: string; voucherNo?: string}>;`);

// Add implementations
let injectedCode = `
  const requestMemberExit = async (params: any) => {
    const res = AccountingService.requestMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const reviewMemberExit = async (params: any) => {
    const res = AccountingService.reviewMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const approveMemberExit = async (params: any) => {
    const res = AccountingService.approveMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const rejectMemberExit = async (params: any) => {
    const res = AccountingService.rejectMemberExit(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
  const processMemberExitRefund = async (params: any) => {
    const res = AccountingService.processMemberExitRefund(db, params);
    if (res && res.success && res.updatedDb) setDb(res.updatedDb);
    return res;
  };
`;

content = content.replace(/const updateSettings = \(updates: any\) => \{/, injectedCode + '\n  const updateSettings = (updates: any) => {');

// Add to value
content = content.replace(/restoreBackup,/, `restoreBackup,
        requestMemberExit, reviewMemberExit, approveMemberExit, rejectMemberExit, processMemberExitRefund,`);

fs.writeFileSync('src/context/AppContext.tsx', content);
console.log("AppContext updated");
