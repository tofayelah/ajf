const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const replacement = `  useEffect(() => {
    loadDatabaseFromStorage().then(loadedDb => {
      setDb(loadedDb);
      setIsAuthenticated(!!loadedDb.activeUserId);
      setIsDbLoading(false);
      
      // Committee Expiry check
      const today = new Date().toISOString().split("T")[0];
      const activeCommittee = loadedDb.committees?.find(c => c.status === "ACTIVE");
      if (activeCommittee && activeCommittee.endDate < today) {
        setTimeout(() => {
          setNotificationMessage({ text: "বর্তমান Committee-এর মেয়াদ শেষ হয়েছে। নতুন Committee গঠন করুন।", type: "error" });
          setTimeout(() => setNotificationMessage(null), 10000);
        }, 1000);
      }
    });
  }, []);`;

content = content.replace(/  useEffect\(\(\) => \{\n    loadDatabaseFromStorage\(\)\.then\(loadedDb => \{\n      setDb\(loadedDb\);\n      setIsAuthenticated\(\!\!loadedDb\.activeUserId\);\n      setIsDbLoading\(false\);\n    \}\);\n  \}, \[\]\);/g, replacement);

fs.writeFileSync('src/context/AppContext.tsx', content);
