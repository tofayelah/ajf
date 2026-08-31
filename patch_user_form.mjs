import fs from 'fs';

let content = fs.readFileSync('src/components/users/UserFormModal.tsx', 'utf8');

if (!content.includes('import { createUserAPI, updateUserAPI }')) {
  content = content.replace(
    "import { useApp } from '../../context/AppContext';",
    "import { useApp } from '../../context/AppContext';\nimport { createUserAPI, updateUserAPI } from '../../services/api';"
  );
  
  // Replace handleSave
  const newHandleSave = `
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !fullName.trim() || !mobile.trim()) {
      setError(isBangla ? 'সব তথ্য পূরণ করুন' : 'Please fill all required fields');
      return;
    }

    if (!userToEdit) {
      if (!password) {
        setError(isBangla ? 'পাসওয়ার্ড দিন' : 'Password is required');
        return;
      }
      if (password !== confirmPassword) {
        setError(isBangla ? 'পাসওয়ার্ড মিলেনি' : 'Passwords do not match');
        return;
      }
    }

    if (role === 'MEMBER' && !linkedMemberId) {
      setError(isBangla ? 'মেম্বার আইডি লিঙ্ক করুন' : 'Member ID is required for MEMBER role');
      return;
    }

    try {
      if (userToEdit) {
        await updateUserAPI(userToEdit.userId, { fullName, mobile, email, status, linkedMemberId });
      } else {
        await createUserAPI({ username, fullName, mobile, email, role, status, linkedMemberId, password });
      }
      await forceSync();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };
  `;
  
  // Actually, I'll just use string replacement on the function body
  content = content.replace(
    /const handleSave = \(e: React\.FormEvent\) => \{[\s\S]*?if \(!userToEdit\) \{[\s\S]*?\}\s*onClose\(\);\s*\};/,
    newHandleSave
  );
  
  fs.writeFileSync('src/components/users/UserFormModal.tsx', content);
}
