import fs from 'fs';

let content = fs.readFileSync('src/components/users/UsersRolesView.tsx', 'utf8');

if (!content.includes('import { PermissionMatrixModal }')) {
  content = content.replace(
    "import { ResetCredentialModal } from './ResetCredentialModal';",
    "import { ResetCredentialModal } from './ResetCredentialModal';\nimport { PermissionMatrixModal } from './PermissionMatrixModal';"
  );
}

if (!content.includes('const [permissionModalUser, setPermissionModalUser]')) {
  content = content.replace(
    "const [resetModalState, setResetModalState]",
    "const [permissionModalUser, setPermissionModalUser] = useState<UserAccount | null>(null);\n  const [resetModalState, setResetModalState]"
  );
  
  const buttonHtml = `
                          <button
                            onClick={() => setPermissionModalUser(user)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title={isBangla ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>`;
                          
  content = content.replace(
    /(\s*)(<button[^>]+onClick=\{\(\) => handleOpenEditModal\(user\)\}[^>]+>[\s\S]*?<\/button>)/,
    `$1$2$1${buttonHtml}`
  );
  
  const modalHtml = `
      {permissionModalUser && (
        <PermissionMatrixModal
          isOpen={true}
          onClose={() => setPermissionModalUser(null)}
          user={permissionModalUser}
        />
      )}`;
      
  content = content.replace(
    /(<UserFormModal[^>]+>[\s\S]*?<\/UserFormModal>)/,
    `$1${modalHtml}`
  );
  
  fs.writeFileSync('src/components/users/UsersRolesView.tsx', content);
}
