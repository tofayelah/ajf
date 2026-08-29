const fs = require('fs');
let code = fs.readFileSync('src/components/committee/CommitteeManagementView.tsx', 'utf8');

const createFormCode = `
const [isCreating, setIsCreating] = useState(false);
const handleCreateCommittee = () => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(startDate.getFullYear() + 2);
  endDate.setDate(endDate.getDate() - 1);
  
  const newCommittee = {
    committeeId: "COM-" + Date.now(),
    committeeName: isBangla ? \`কার্যনির্বাহী পর্ষদ (\${startDate.getFullYear()}-\${endDate.getFullYear()})\` : \`Executive Committee (\${startDate.getFullYear()}-\${endDate.getFullYear()})\`,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    status: "ACTIVE" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Expire existing
  const updatedCommittees = (db.committees || []).map(c => 
    c.status === "ACTIVE" ? { ...c, status: "EXPIRED" as const } : c
  );
  
  setDb({
    ...db,
    committees: [...updatedCommittees, newCommittee]
  });
  
  setIsCreating(false);
  showNotification(isBangla ? 'নতুন কমিটি সফলভাবে গঠিত হয়েছে' : 'New committee created successfully');
};
`;

// Insert the create form logic
code = code.replace("const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');", "const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');\n  const { setDb, showNotification } = useAppContext();\n" + createFormCode);

// Add onClick to the create button
code = code.replace("<button className=\"px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow font-medium transition-colors\">", "<button onClick={handleCreateCommittee} className=\"px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow font-medium transition-colors\">");

fs.writeFileSync('src/components/committee/CommitteeManagementView.tsx', code);
