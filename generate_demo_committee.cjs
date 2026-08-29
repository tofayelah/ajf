const fs = require('fs');
const file = fs.readFileSync('src/services/db.ts', 'utf8');

const committeeDemoCode = `
    committees: [
      {
        committeeId: "COM-001",
        committeeName: "কার্যনির্বাহী পর্ষদ (২০২৬-২০২৮)",
        startDate: "2026-06-26",
        endDate: "2028-06-25",
        status: "ACTIVE",
        createdAt: "2026-06-26T10:00:00.000Z",
        updatedAt: "2026-06-26T10:00:00.000Z"
      }
    ],
    committeeMembers: [
      {
        committeeMemberId: "CM-001",
        committeeId: "COM-001",
        memberId: "AJ-0001",
        position: "PRESIDENT",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-002",
        committeeId: "COM-001",
        memberId: "AJ-0002",
        position: "GENERAL_SECRETARY",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      },
      {
        committeeMemberId: "CM-003",
        committeeId: "COM-001",
        memberId: "AJ-0003",
        position: "TREASURER",
        appointmentDate: "2026-06-26",
        createdAt: "2026-06-26T10:00:00.000Z"
      }
    ],
    committeeHistory: [],
`;

const updated = file.replace(/committees: \[\],/, committeeDemoCode.replace('    committees: [', 'committees: [')).replace(/    committeeMembers: \[\],\n    committeeHistory: \[\],/, '');
fs.writeFileSync('src/services/db.ts', updated);
