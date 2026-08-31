import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

// The new routes to append before app.listen
const newRoutes = `
// --- User Management Routes ---

function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const dbData = await fs.readFile(DB_FILE, 'utf8');
      const db = JSON.parse(dbData);
      const user = db.users?.find(u => u.userId === req.user.userId);
      if (!user) return res.status(403).json({ error: 'Forbidden' });
      
      const rolePerms = {
        ADMIN: ['users.view', 'users.create', 'users.edit', 'users.disable', 'users.reset_password', 'users.assign_role', 'users.assign_permission'],
      };
      
      const userRole = user.role;
      if (userRole === 'ADMIN') return next(); // ADMIN has all
      
      const explicitPerms = user.permissions || [];
      const roleDefaults = rolePerms[userRole] || [];
      
      if (roleDefaults.includes(permission) || explicitPerms.includes(permission)) {
        return next();
      }
      
      return res.status(403).json({ error: 'Forbidden: Missing permission ' + permission });
    } catch(e) {
      return res.status(500).json({ error: 'Server error' });
    }
  };
}

function logAudit(db, req, action, module, remarks, recordId) {
  const auditLogs = db.auditLogs || [];
  auditLogs.push({
    auditId: \`AL-\${Date.now()}-\${Math.floor(Math.random() * 1000)}\`,
    userId: req.user.userId,
    userName: req.user.username, // Fallback
    dateTime: new Date().toISOString(),
    module,
    action,
    recordId,
    remarks
  });
  db.auditLogs = auditLogs;
}

app.get('/api/users', requireAuth, requirePermission('users.view'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const safeUsers = (db.users || []).map(u => {
      const { passwordHash, pinHash, salt, ...safe } = u;
      return safe;
    });
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', requireAuth, requirePermission('users.create'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const { username, fullName, mobile, email, password, role, linkedMemberId, status, permissions } = req.body;
    
    if (db.users?.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const userId = 'USR-' + Date.now().toString().slice(-6);
    const passwordHash = await bcrypt.hash(password, 10);
    
    const newUser = {
      userId,
      username,
      fullName,
      mobile,
      email,
      role,
      linkedMemberId,
      status: status || 'ACTIVE',
      permissions: permissions || [],
      passwordHash,
      pinHash: '',
      createdAt: new Date().toISOString()
    };
    
    if (!db.users) db.users = [];
    db.users.push(newUser);
    
    // Find caller name for audit
    const caller = db.users.find(u => u.userId === req.user.userId);
    if(caller) req.user.username = caller.fullName || caller.username;
    
    logAudit(db, req, 'USER_CREATED', 'USER_MANAGEMENT', \`Created user \${username} (\${role})\`, userId);
    
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    
    const { passwordHash: ph, pinHash, salt, ...safeUser } = newUser;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', requireAuth, requirePermission('users.edit'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const { fullName, mobile, email, status, linkedMemberId } = req.body;
    
    const userIndex = db.users?.findIndex(u => u.userId === req.params.id);
    if (userIndex === -1 || userIndex === undefined) return res.status(404).json({ error: 'User not found' });
    
    const existingUser = db.users[userIndex];
    
    // Last admin protection for deactivation
    if (status === 'INACTIVE' && existingUser.role === 'ADMIN' && existingUser.status === 'ACTIVE') {
      const activeAdmins = db.users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot deactivate the last active ADMIN' });
      }
    }
    
    db.users[userIndex] = {
      ...existingUser,
      fullName: fullName !== undefined ? fullName : existingUser.fullName,
      mobile: mobile !== undefined ? mobile : existingUser.mobile,
      email: email !== undefined ? email : existingUser.email,
      status: status !== undefined ? status : existingUser.status,
      linkedMemberId: linkedMemberId !== undefined ? linkedMemberId : existingUser.linkedMemberId,
    };
    
    const caller = db.users.find(u => u.userId === req.user.userId);
    if(caller) req.user.username = caller.fullName || caller.username;
    
    logAudit(db, req, 'USER_UPDATED', 'USER_MANAGEMENT', \`Updated profile for \${existingUser.username}\`, existingUser.userId);
    if (status !== undefined && status !== existingUser.status) {
      logAudit(db, req, status === 'ACTIVE' ? 'USER_ENABLED' : 'USER_DISABLED', 'USER_MANAGEMENT', \`Status changed to \${status}\`, existingUser.userId);
    }
    
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    
    const { passwordHash, pinHash, salt, ...safeUser } = db.users[userIndex];
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:id/reset-password', requireAuth, requirePermission('users.reset_password'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const { password } = req.body;
    
    const user = db.users?.find(u => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.passwordHash = await bcrypt.hash(password, 10);
    
    const caller = db.users.find(u => u.userId === req.user.userId);
    if(caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, 'PASSWORD_RESET', 'USER_MANAGEMENT', \`Password reset for \${user.username}\`, user.userId);
    
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:id/role', requireAuth, requirePermission('users.assign_role'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const { role } = req.body;
    
    const user = db.users?.find(u => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.role === 'ADMIN' && role !== 'ADMIN' && user.status === 'ACTIVE') {
      const activeAdmins = db.users.filter(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: 'Cannot remove ADMIN role from the last active ADMIN' });
      }
    }
    
    const oldRole = user.role;
    user.role = role;
    
    const caller = db.users.find(u => u.userId === req.user.userId);
    if(caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, 'ROLE_CHANGED', 'USER_MANAGEMENT', \`Role changed from \${oldRole} to \${role} for \${user.username}\`, user.userId);
    
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:id/permissions', requireAuth, requirePermission('users.assign_permission'), async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    const { permissions } = req.body;
    
    const user = db.users?.find(u => u.userId === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.permissions = permissions || [];
    
    const caller = db.users.find(u => u.userId === req.user.userId);
    if(caller) req.user.username = caller.fullName || caller.username;
    logAudit(db, req, 'PERMISSION_CHANGED', 'USER_MANAGEMENT', \`Permissions updated for \${user.username}\`, user.userId);
    
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

  app.listen(PORT, "0.0.0.0", () => {
`;

if (!content.includes('// --- User Management Routes ---')) {
  const updated = content.replace('  app.listen(PORT, "0.0.0.0", () => {', newRoutes);
  fs.writeFileSync('server.ts', updated);
  console.log('Routes added');
} else {
  console.log('Routes already exist');
}
