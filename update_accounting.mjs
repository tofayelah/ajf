import fs from 'fs';

const filePath = 'src/services/accounting.ts';
let content = fs.readFileSync(filePath, 'utf8');

// For approveMemberExit
content = content.replace(
  "  static approveMemberExit(\n    db: AppDatabaseState,\n    params: {\n      exitRequestId: string;\n      userId: string;\n      userName: string;\n      role?: string;\n    }",
  "  static approveMemberExit(\n    db: AppDatabaseState,\n    params: {\n      exitRequestId: string;\n      userId: string;\n      userName: string;\n      role?: string;\n      auditNote?: string;\n    }"
);

content = content.replace(
  "        recordId: request.exitRequestId || (request as any).id,\n        remarks: `Settlement approved for member ${memberName} (${request.memberId})`\n      }]\n    };\n\n    return { success: true, message: \"Settlement সফলভাবে অনুমোদিত হয়েছে।\", updatedDb: newDb };",
  "        recordId: request.exitRequestId || (request as any).id,\n        remarks: `Settlement approved for member ${memberName} (${request.memberId}). ${params.auditNote ? 'Note: ' + params.auditNote : ''}`\n      }]\n    };\n\n    return { success: true, message: \"Settlement সফলভাবে অনুমোদিত হয়েছে।\", updatedDb: newDb };"
);

// For reviewMemberExit
content = content.replace(
  "  static reviewMemberExit(\n    db: AppDatabaseState,\n    params: {\n      exitRequestId: string;\n      userId: string;\n      userName: string;\n      role?: string;\n    }",
  "  static reviewMemberExit(\n    db: AppDatabaseState,\n    params: {\n      exitRequestId: string;\n      userId: string;\n      userName: string;\n      role?: string;\n      auditNote?: string;\n    }"
);

content = content.replace(
  "        recordId: request.exitRequestId || (request as any).id,\n        remarks: `Settlement review started for member ${memberName} (${request.memberId})`\n      }]\n    };\n\n    return { success: true, message: \"Settlement আবেদনটি পর্যালোচনার জন্য নেওয়া হয়েছে।\", updatedDb: newDb };",
  "        recordId: request.exitRequestId || (request as any).id,\n        remarks: `Settlement review started for member ${memberName} (${request.memberId}). ${params.auditNote ? 'Note: ' + params.auditNote : ''}`\n      }]\n    };\n\n    return { success: true, message: \"Settlement আবেদনটি পর্যালোচনার জন্য নেওয়া হয়েছে।\", updatedDb: newDb };"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated accounting.ts");
