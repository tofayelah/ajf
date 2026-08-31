import fs from 'fs';

let content = fs.readFileSync('src/components/users/UsersRolesView.tsx', 'utf8');

if (!content.includes('updateUserAPI')) {
  content = content.replace(
    "import { useApp } from '../../context/AppContext';",
    "import { useApp } from '../../context/AppContext';\nimport { updateUserAPI } from '../../services/api';"
  );
  
  content = content.replace(
    "manageUserStatus(confirmActionState.user.userId, confirmActionState.action);",
    `
    // Convert action to status
    let newStatus = 'ACTIVE';
    if (confirmActionState.action === 'DISABLE') newStatus = 'INACTIVE';
    if (confirmActionState.action === 'LOCK') newStatus = 'LOCKED';
    if (confirmActionState.action === 'ENABLE' || confirmActionState.action === 'UNLOCK') newStatus = 'ACTIVE';
    
    updateUserAPI(confirmActionState.user.userId, { status: newStatus }).then(() => {
      useApp().forceSync?.() || window.location.reload();
    }).catch(e => {
      alert(e.message || 'Failed to update user status');
    });
    `
  );
  
  fs.writeFileSync('src/components/users/UsersRolesView.tsx', content);
}
