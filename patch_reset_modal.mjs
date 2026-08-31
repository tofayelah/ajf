import fs from 'fs';

let content = fs.readFileSync('src/components/users/ResetCredentialModal.tsx', 'utf8');

if (!content.includes('import { resetUserPasswordAPI }')) {
  content = content.replace(
    "import { useApp } from '../../context/AppContext';",
    "import { useApp } from '../../context/AppContext';\nimport { resetUserPasswordAPI } from '../../services/api';"
  );
  
  content = content.replace(
    /try \{\s+if \(isPassword\) \{[\s\S]*?\} finally \{\s*setIsSubmitting\(false\);\s*\}/,
    `try {
      if (isPassword) {
        await resetUserPasswordAPI(user.userId, cleanVal);
      } else {
        // Just mock for PIN as no PIN API
        await useApp().resetUserPin?.(user.userId, cleanVal);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting.');
    } finally {
      setIsSubmitting(false);
    }`
  );
  
  fs.writeFileSync('src/components/users/ResetCredentialModal.tsx', content);
}
