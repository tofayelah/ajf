const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const injection = `
app.put("/api/member/profile/nominees", requireAuth, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== "MEMBER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    // If member, force linkedMemberId
    let targetMemberId = req.body.memberId;
    if (role === "MEMBER") {
       const linkedMemberId = req.user?.linkedMemberId;
       if (!linkedMemberId) return res.status(403).json({ error: "Forbidden: No linked member profile" });
       if (targetMemberId && String(targetMemberId).trim() !== linkedMemberId) {
         return res.status(403).json({ error: "Forbidden: Cannot update another member's nominee" });
       }
       targetMemberId = linkedMemberId;
    }

    if (!targetMemberId) return res.status(400).json({ error: "memberId is required" });

    const db = await fs.promises.readFile(DB_FILE, "utf8").then(JSON.parse);
    const memberIndex = (db.members || []).findIndex(m => m.memberId === targetMemberId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: "Member not found" });
    }

    const { name, relation, dob, nid, mobile, address, percentage, status } = req.body;
    
    if (!name || !String(name).trim()) return res.status(400).json({ error: "Nominee Name is required" });
    if (!relation || !String(relation).trim()) return res.status(400).json({ error: "Relationship is required" });

    let parsedPercentage = 100;
    if (percentage !== undefined && percentage !== "") {
      parsedPercentage = parseFloat(percentage);
      if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
        return res.status(400).json({ error: "Percentage must be between 0 and 100" });
      }
    }

    const currentMember = db.members[memberIndex];
    if (!currentMember.nominees) currentMember.nominees = [];
    
    const nominee = {
      nomineeId: currentMember.nominees[0]?.nomineeId || \`NOM-\${Date.now()}\`,
      memberId: targetMemberId,
      name: String(name).trim(),
      relation: String(relation).trim(),
      mobile: mobile ? String(mobile).trim() : "",
      nid: nid ? String(nid).trim() : "",
      address: address ? String(address).trim() : "",
      percentage: parsedPercentage,
      dob: dob ? String(dob).trim() : "",
      status: status ? String(status).trim() : "ACTIVE",
      updatedAt: new Date().toISOString()
    };
    
    currentMember.nominees = [nominee];

    await writeDbFile(db, { operation: "MEMBER_NOMINEE_UPDATED" });
    
    const maskedNid = nominee.nid ? \`***\${nominee.nid.slice(-4)}\` : "None";
    const auditMsg = role === "MEMBER" 
      ? \`Member \${currentMember.fullName} self-updated nominee (NID: \${maskedNid})\`
      : \`Admin \${req.user.username} updated nominee for \${currentMember.fullName} (NID: \${maskedNid})\`;
      
    logAudit(db, req, "NOMINEE_UPDATED", "MEMBER_MANAGEMENT", auditMsg, targetMemberId);

    return res.json({ message: "Nominee updated successfully", nominees: currentMember.nominees });
  } catch (error) {
    console.error("Error updating nominee:", error);
    return res.status(500).json({ error: "Server error updating nominee" });
  }
});
`;

code = code.replace(
  'app.get("/api/members/:memberId", requireAuth, requireMemberOwnership("memberId"), async (req, res) => {',
  injection + '\napp.get("/api/members/:memberId", requireAuth, requireMemberOwnership("memberId"), async (req, res) => {'
);

fs.writeFileSync('server.ts', code);
