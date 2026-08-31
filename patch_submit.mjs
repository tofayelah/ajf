import fs from 'fs';

let content = fs.readFileSync('src/components/users/UserFormModal.tsx', 'utf8');

if (!content.includes('import { createUserAPI, updateUserAPI }')) {
  content = content.replace(
    "import { useApp } from '../../context/AppContext';",
    "import { useApp } from '../../context/AppContext';\nimport { createUserAPI, updateUserAPI } from '../../services/api';"
  );
  
  content = content.replace(
    /try \{\s+if \(isEditMode && userToEdit\) \{[\s\S]*?\} finally \{\s*setIsSubmitting\(false\);\s*\}/,
    `try {
      if (isEditMode && userToEdit) {
        await updateUserAPI(userToEdit.userId, {
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          status,
          linkedMemberId: role === 'MEMBER' ? linkedMemberId : undefined,
        });
      } else {
        await createUserAPI({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          role,
          status,
          linkedMemberId: role === 'MEMBER' ? linkedMemberId : undefined,
          password: password,
        });
      }
      // Force sync to refetch users from API
      await useApp().forceSync?.() || window.location.reload();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }`
  );
  
  fs.writeFileSync('src/components/users/UserFormModal.tsx', content);
}
