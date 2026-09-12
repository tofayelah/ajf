const fs = require('fs');
let code = fs.readFileSync('src/services/api.ts', 'utf8');

const injection = `
export async function updateNomineeAPI(nomineeData: any) {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(\`\${API_URL}/api/member/profile/nominees\`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: \`Bearer \${token}\`
    },
    body: JSON.stringify(nomineeData)
  });

  if (!res.ok) {
    let errorMsg = "Failed to update nominee";
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }
  return res.json();
}
`;

code = code + '\n' + injection;
fs.writeFileSync('src/services/api.ts', code);
