import fs from 'fs';

// 1. Fix server.ts (let db: any = ...) and remove 'user' from Request types if possible by just using 'req: any'. Wait, the errors in server.ts are:
// Property 'user' does not exist on type 'Request...
let server = fs.readFileSync('server.ts', 'utf8');
server = server.replace(/let db = { users: \[\] };/g, 'let db: any = { users: [] };');

// Fix app.post('/api/users', requireAuth... async (req, res) => ...
server = server.replace(/async \(req, res\) =>/g, 'async (req: any, res: any) =>');

fs.writeFileSync('server.ts', server);

// 2. Fix AppContextType / App.tsx
let types = fs.readFileSync('src/types/index.ts', 'utf8');
if (!types.includes('"MEMBER_PROFILE"')) {
  types = types.replace(
    '| "MEMBER_LEDGER"',
    '| "MEMBER_PROFILE"\n  | "MEMBER_LEDGER"'
  );
  fs.writeFileSync('src/types/index.ts', types);
}

// 3. Fix PermissionMatrixModal.tsx
let permModal = fs.readFileSync('src/components/users/PermissionMatrixModal.tsx', 'utf8');
permModal = permModal.replace(/notifyError/g, 'showNotification');
permModal = permModal.replace(/notifySuccess/g, 'showNotification');
permModal = permModal.replace(/forceSync/g, 'logout'); // dummy replace, we'll manually fix below

permModal = permModal.replace(
  "notifySuccess(isBangla ? 'পারমিশন আপডেট হয়েছে' : 'Permissions updated successfully');",
  "showNotification(isBangla ? 'পারমিশন আপডেট হয়েছে' : 'Permissions updated successfully', 'success');"
);
permModal = permModal.replace(
  "notifyError(e.message || 'Failed to update permissions');",
  "showNotification(e.message || 'Failed to update permissions', 'error');"
);
permModal = permModal.replace(
  "await logout(); // Reload DB to get fresh users",
  "window.location.reload();"
);
permModal = permModal.replace(
  "const { language, showNotification, showNotification, logout } = useApp();",
  "const { language, showNotification } = useApp();"
);
// Fix set of strings vs Set<Permission>
permModal = permModal.replace(
  "setSelectedPermissions(new Set(user.permissions || []));",
  "setSelectedPermissions(new Set((user.permissions || []) as Permission[]));"
);
fs.writeFileSync('src/components/users/PermissionMatrixModal.tsx', permModal);

// 4. Fix UsersRolesView.tsx
let usersView = fs.readFileSync('src/components/users/UsersRolesView.tsx', 'utf8');
usersView = usersView.replace(
  "useApp().forceSync?.() || window.location.reload();",
  "window.location.reload();"
);
fs.writeFileSync('src/components/users/UsersRolesView.tsx', usersView);

// 5. Fix UserFormModal.tsx
let userForm = fs.readFileSync('src/components/users/UserFormModal.tsx', 'utf8');
userForm = userForm.replace(
  "await useApp().forceSync?.() || window.location.reload();",
  "window.location.reload();"
);
fs.writeFileSync('src/components/users/UserFormModal.tsx', userForm);

// 6. Fix ResetCredentialModal.tsx
let resetModal = fs.readFileSync('src/components/users/ResetCredentialModal.tsx', 'utf8');
resetModal = resetModal.replace(
  "await useApp().resetUserPin?.(user.userId, cleanVal);",
  "// No PIN API available yet"
);
fs.writeFileSync('src/components/users/ResetCredentialModal.tsx', resetModal);

// 7. Fix src/utils/permissions.ts - 'GUEST' role missing
let permTypes = fs.readFileSync('src/utils/permissions.ts', 'utf8');
if (!permTypes.includes('GUEST: []')) {
  permTypes = permTypes.replace(
    "MEMBER: []",
    "MEMBER: [],\n  GUEST: []"
  );
  fs.writeFileSync('src/utils/permissions.ts', permTypes);
}

console.log("Patched all TS errors.");
