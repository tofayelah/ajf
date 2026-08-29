import fs from 'fs';

const filePath = 'src/components/settlement/PendingSettlementApprovalsView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "  const [rejectionReason, setRejectionReason] = useState('');\n  const [isSubmitting, setIsSubmitting] = useState(false);",
  "  const [rejectionReason, setRejectionReason] = useState('');\n  const [auditNote, setAuditNote] = useState('');\n  const [isSubmitting, setIsSubmitting] = useState(false);"
);

content = content.replace(
  "  const handleOpenReview = (exitId: string) => {\n    const exit = getExitById(exitId);\n    if (!exit) return;\n    if (exit.status === 'UNDER_REVIEW') {\n      // If already UNDER_REVIEW, prevent redundant transitions and display the approval UI directly\n      handleOpenApprove(exitId);\n      return;\n    }\n    setReviewingExitId(exitId);\n  };\n\n  const handleOpenApprove = (exitId: string) => {\n    const exit = getExitById(exitId);\n    if (!exit) return;\n    if (!isAuthorizedApprover) {\n      alert(isBangla ? 'আপনার এই নিষ্পত্তি অনুমোদনের অনুমতি নেই।' : 'You do not have permission to approve settlements.');\n      return;\n    }\n    const requestedBy = exit.userId || exit.requestedBy;\n    if (!isSuperOrAdmin && requestedBy && activeUser?.userId && requestedBy === activeUser.userId) {\n      alert(isBangla ? 'নিজের তৈরি Settlement Request নিজে অনুমোদন করা যাবে না।' : 'You cannot approve your own settlement request.');\n      return;\n    }\n    setApprovingExitId(exitId);\n  };",
  "  const handleOpenReview = (exitId: string) => {\n    const exit = getExitById(exitId);\n    if (!exit) return;\n    if (exit.status === 'UNDER_REVIEW') {\n      // If already UNDER_REVIEW, prevent redundant transitions and display the approval UI directly\n      handleOpenApprove(exitId);\n      return;\n    }\n    setAuditNote('');\n    setReviewingExitId(exitId);\n  };\n\n  const handleOpenApprove = (exitId: string) => {\n    const exit = getExitById(exitId);\n    if (!exit) return;\n    if (!isAuthorizedApprover) {\n      alert(isBangla ? 'আপনার এই নিষ্পত্তি অনুমোদনের অনুমতি নেই।' : 'You do not have permission to approve settlements.');\n      return;\n    }\n    const requestedBy = exit.userId || exit.requestedBy;\n    if (!isSuperOrAdmin && requestedBy && activeUser?.userId && requestedBy === activeUser.userId) {\n      alert(isBangla ? 'নিজের তৈরি Settlement Request নিজে অনুমোদন করা যাবে না।' : 'You cannot approve your own settlement request.');\n      return;\n    }\n    setAuditNote('');\n    setApprovingExitId(exitId);\n  };"
);

content = content.replace(
  "      const res = await reviewMemberExit({\n        exitRequestId: realId,\n        userId: activeUser.userId,\n        userName: activeUser.fullName || activeUser.username,\n        role: activeUser.role\n      });",
  "      const res = await reviewMemberExit({\n        exitRequestId: realId,\n        userId: activeUser.userId,\n        userName: activeUser.fullName || activeUser.username,\n        role: activeUser.role,\n        auditNote\n      });"
);

content = content.replace(
  "      const res = await approveMemberExit({\n        exitRequestId: realId,\n        userId: activeUser.userId,\n        userName: activeUser.fullName || activeUser.username,\n        role: activeUser.role\n      });",
  "      const res = await approveMemberExit({\n        exitRequestId: realId,\n        userId: activeUser.userId,\n        userName: activeUser.fullName || activeUser.username,\n        role: activeUser.role,\n        auditNote\n      });"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated PendingSettlementApprovalsView.tsx");
