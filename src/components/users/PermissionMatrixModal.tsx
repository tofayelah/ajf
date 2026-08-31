import React, { useState, useEffect } from 'react';
import { Shield, X, Check } from 'lucide-react';
import { UserAccount } from '../../types';
import { useApp } from '../../context/AppContext';
import { PERMISSIONS, ROLE_PERMISSIONS, Permission } from '../../utils/permissions';
import { assignUserPermissionsAPI } from '../../services/api';

interface PermissionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount;
}

export const PermissionMatrixModal: React.FC<PermissionMatrixModalProps> = ({ isOpen, onClose, user }) => {
  const { language, showNotification, updateUser } = useApp();
  const isBangla = language === 'bn';
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (user && isOpen) {
      setSelectedPermissions(new Set((user.permissions || []) as Permission[]));
    }
  }, [user, isOpen]);
  
  if (!isOpen) return null;
  
  const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
  const isAdmin = user.role === 'ADMIN';

  const togglePermission = (permission: Permission) => {
    if (isAdmin) return; // Admin has all, no need to toggle
    const next = new Set(selectedPermissions);
    if (next.has(permission)) {
      next.delete(permission);
    } else {
      next.add(permission);
    }
    setSelectedPermissions(next);
  };
  
  const handleSave = async () => {
    if (isAdmin) return onClose();
    try {
      setIsSubmitting(true);
      const permArray = Array.from(selectedPermissions);
      await assignUserPermissionsAPI(user.userId, permArray);
      // Also update local context state
      await updateUser(user.userId, { permissions: permArray } as any);
      showNotification(
        isBangla ? 'পারমিশন সফলভাবে আপডেট হয়েছে' : 'Permissions updated successfully',
        'success'
      );
      onClose();
    } catch (e: any) {
      showNotification(e.message || 'Failed to update permissions', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-800">
                {isBangla ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'}
              </h2>
              <p className="text-sm text-slate-500">
                {user.fullName} ({user.role})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {isAdmin ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-lg text-slate-700">ADMIN has full access</p>
              <p className="text-sm">Cannot modify individual permissions for administrators.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {isBangla ? 'যে পারমিশনগুলো রোলের সাথে ডিফল্ট আসে সেগুলো পরিবর্তন করা যাবে না। আপনি অতিরিক্ত পারমিশন যোগ করতে পারবেন।' : 'Permissions default to the role cannot be removed. You can grant additional explicit permissions.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PERMISSIONS.map(p => {
                  const isRoleDefault = roleDefaults.includes(p);
                  const isExplicit = selectedPermissions.has(p);
                  const isActive = isRoleDefault || isExplicit;
                  
                  return (
                    <label key={p} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                      <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded border ${isRoleDefault ? 'bg-slate-300 border-slate-400' : isActive ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                        {isActive && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={isActive}
                        onChange={() => togglePermission(p)}
                        disabled={isRoleDefault}
                      />
                      <div>
                        <div className={`text-sm font-bold ${isActive ? 'text-emerald-800' : 'text-slate-700'}`}>{p}</div>
                        {isRoleDefault && <div className="text-[10px] uppercase font-bold text-slate-500 mt-1">Role Default</div>}
                        {isExplicit && !isRoleDefault && <div className="text-[10px] uppercase font-bold text-emerald-600 mt-1">Explicitly Granted</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            {isBangla ? 'বাতিল' : 'Cancel'}
          </button>
          {!isAdmin && (
            <button onClick={handleSave} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-200 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isBangla ? 'সংরক্ষণ করুন' : 'Save Permissions')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
