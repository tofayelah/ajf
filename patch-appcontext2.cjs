const fs = require('fs');
let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const rpcHelper = `
  const executeAccountingRPC = async (action: string, args: any[]) => {
    try {
      const response = await fetch('/api/accounting/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${localStorage.getItem('authToken') || ''}\`
        },
        body: JSON.stringify({ action, params: args })
      });
      if (!response.ok) {
        throw new Error('RPC failed');
      }
      const result = await response.json();
      
      if (result && result.success) {
        const newDbResponse = await fetch('/api/sync', {
          headers: { 'Authorization': \`Bearer \${localStorage.getItem('authToken') || ''}\` }
        });
        if (newDbResponse.ok) {
           const newDb = await newDbResponse.json();
           (window as any).skipNextDbSave = true;
           setDb(newDb);
        }
      }
      
      return result;
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  };
`;

if (!content.includes('executeAccountingRPC')) {
  content = content.replace(
    '  const [notificationMessage, setNotificationMessage] = useState<{',
    rpcHelper + '\n  const [notificationMessage, setNotificationMessage] = useState<{'
  );
  fs.writeFileSync('src/context/AppContext.tsx', content, 'utf8');
}
