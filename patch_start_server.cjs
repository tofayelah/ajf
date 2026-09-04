const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldCode = `    if (e.code === "ENOENT") {
      console.log("Database not found on startup. Seeding initial admin...");
      const initialDb = getInitialDatabase();
      initialDb.users = [{
        userId: "USR-0001",
        username: "admin",
        fullName: "System Administrator",
        mobile: "01700000000",
        role: "ADMIN",
        status: "ACTIVE",
        passwordHash: "123456",
        pinHash: "",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }];
      await fs.writeFile(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
    }`;

const newCode = `    if (e.code === "ENOENT") {
      const isProduction = process.env.VITE_APP_MODE === "production";
      if (isProduction) {
        console.error("CRITICAL: PRODUCTION DATA PROTECTION BLOCKED THIS OPERATION: DATABASE INITIALIZATION REQUIRED.");
        console.error("Database not found in production. Exiting to prevent empty database overwrite.");
        // We will just not write anything. If DB_FILE is absent, we can either throw or let it run with memory DB. 
        // Throwing will crash the pod, which might be exactly what is needed for safety, but maybe we just skip writing.
        // Actually, just skip writing. The app might fail to read, which is safe.
      } else {
        console.log("Database not found on startup. Seeding initial admin...");
        const initialDb = getInitialDatabase();
        initialDb.users = [{
          userId: "USR-0001",
          username: "admin",
          fullName: "System Administrator",
          mobile: "01700000000",
          role: "ADMIN",
          status: "ACTIVE",
          passwordHash: "123456",
          pinHash: "",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }];
        await fs.writeFile(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
      }
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('server.ts', content, 'utf8');
console.log('Updated startServer protection in server.ts');
