const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove imports from sessionManager
code = code.replace(/  isEmergencyRecoveryRateLimited,\n  recordEmergencyRecoveryFailure,\n  recordEmergencyRecoverySuccess,\n  EMERGENCY_RECOVERY_CONFIRMATION_PHRASE\n/g, '');

// 2. Remove demote admin check
const demoteCheckRegex = /const designatedAdminUsername = process\.env\.AJF_EMERGENCY_RECOVERY_ADMIN_USERNAME \|\| "tofayelah";\s*if \(user\.username === designatedAdminUsername && cleanRole !== "ADMIN"\) {\s*return res\.status\(400\)\.json\({ error: "Cannot demote the designated emergency recovery administrator" }\);\s*}/g;
code = code.replace(demoteCheckRegex, '');

// 3. Remove delete admin check
const deleteCheckRegex = /const designatedAdminUsername = process\.env\.AJF_EMERGENCY_RECOVERY_ADMIN_USERNAME \|\| "tofayelah";\s*if \(user\.username === designatedAdminUsername\) {\s*return res\.status\(400\)\.json\({ error: "Cannot delete the designated emergency recovery administrator" }\);\s*}/g;
code = code.replace(deleteCheckRegex, '');

// 4. Remove handleEmergencyRecovery and app.post/app.all
const handleRecoveryRegex = /const handleEmergencyRecovery = async \(req, res\) => {[\s\S]*?app\.all\("\/api\/admin\/emergency-recovery", \(req, res\) => res\.status\(405\)\.json\({ error: "Method not allowed\. Use POST\." }\)\);/g;
code = code.replace(handleRecoveryRegex, '');

fs.writeFileSync('server.ts', code);

// ----------------------------------------------------

let sessionCode = fs.readFileSync('src/security/sessionManager.ts', 'utf8');

const phraseRegex = /export const EMERGENCY_RECOVERY_CONFIRMATION_PHRASE = "EMERGENCY RECOVERY AJF ADMIN";/g;
sessionCode = sessionCode.replace(phraseRegex, '');

const rateLimitRegex = /\/\/ Strict rate-limiting dedicated to the Emergency Recovery endpoint[\s\S]*?export function recordEmergencyRecoverySuccess\(ip: string\): void {[\s\S]*?}/g;
sessionCode = sessionCode.replace(rateLimitRegex, '');

fs.writeFileSync('src/security/sessionManager.ts', sessionCode);

// ----------------------------------------------------

let envExample = fs.readFileSync('.env.example', 'utf8');
envExample = envExample.replace(/# Emergency Admin Recovery Configuration\nAJF_EMERGENCY_RECOVERY_SECRET=\nAJF_EMERGENCY_RECOVERY_ADMIN_USERNAME=\n/, '');
fs.writeFileSync('.env.example', envExample);

console.log("Cleanup script executed.");
