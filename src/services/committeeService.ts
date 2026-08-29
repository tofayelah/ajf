import { AppDatabaseState } from "./db";
import { Committee, CommitteeMember } from "../types";

export const CommitteeService = {
  getActiveCommittee: (db: AppDatabaseState) => {
    const today = new Date().toISOString().split("T")[0];
    
    const activeCommittee = db.committees?.find(c => c.status === "ACTIVE");
    if (!activeCommittee) return null;

    // Check expiry
    if (activeCommittee.endDate < today) {
      // It should be marked expired. But we just return it with an expired warning flag,
      // or we return null? The prompt says: "When the application starts: load ACTIVE committee, if expired, mark EXPIRED, show notification".
      // We will handle the marking elsewhere (e.g. AppContext or a dedicated check function).
    }

    const members = (db.committeeMembers || []).filter(cm => cm.committeeId === activeCommittee.committeeId);
    
    // Enrich with member data
    const enrichedMembers = members.map(cm => {
      const member = (db.members || []).find(m => m.memberId === cm.memberId);
      return {
        ...cm,
        fullName: member?.fullName || "Unknown",
        membershipNo: member?.membershipNo || "",
        mobile: member?.mobile || ""
      };
    });

    const president = enrichedMembers.find(m => m.position === "PRESIDENT");
    const generalSecretary = enrichedMembers.find(m => m.position === "GENERAL_SECRETARY");
    const treasurer = enrichedMembers.find(m => m.position === "TREASURER");

    return {
      ...activeCommittee,
      president,
      generalSecretary,
      treasurer,
      members: enrichedMembers
    };
  }
};

  // We can add checkCommitteeExpiry here or in AppContext
  export const checkCommitteeExpiry = (db: AppDatabaseState) => {
    const today = new Date().toISOString().split("T")[0];
    const activeCommittee = db.committees?.find(c => c.status === "ACTIVE");
    
    if (activeCommittee && activeCommittee.endDate < today) {
      return true; // is expired
    }
    return false;
  };
