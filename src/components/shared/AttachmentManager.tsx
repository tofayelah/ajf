import React, { useRef } from 'react';
import { Attachment } from '../../types';
import { useApp } from '../../context/AppContext';

interface Props {
  entityType: 'MEMBER' | 'EXPENSE' | 'INVESTMENT' | 'RESOLUTION' | 'WELFARE' | 'LOAN';
  entityId: string;
}

export const AttachmentManager: React.FC<Props> = ({ entityType, entityId }) => {
  const { db, setDb, activeUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachments = (db.attachments || []).filter(
    a => a.entityType === entityType && a.entityId === entityId && a.status === 'ACTIVE'
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const uri = event.target?.result as string;
      
      const newAttachment: Attachment = {
        id: `ATT-${Date.now()}`,
        uuid: crypto.randomUUID(),
        entityType,
        entityId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uri: uri, 
        uploadedBy: activeUser?.fullName || 'Unknown',
        uploadedAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      setDb({
        ...db,
        attachments: [...(db.attachments || []), newAttachment]
      });
    };
    
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleArchive = (attachmentId: string) => {
    const confirmArchive = window.confirm('Are you sure you want to remove this attachment?');
    if (!confirmArchive) return;

    const updated = (db.attachments || []).map(a => 
      a.id === attachmentId ? { ...a, status: 'ARCHIVED' as const } : a
    );
    
    setDb({ ...db, attachments: updated });
  };

  return (
    <div className="space-y-3 mt-4 border-t border-slate-200 pt-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-800">Attachments & Documents</h4>
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold"
        >
          + Add File
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
          accept="image/*,.pdf,.doc,.docx"
        />
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(attachments || []).map(att => (
            <div key={att.id} className="bg-slate-50 border border-slate-200 rounded p-2 flex justify-between items-center text-[10px]">
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-slate-700 truncate">{att.fileName}</span>
                <span className="text-slate-500">{(att.fileSize / 1024).toFixed(1)} KB • {new Date(att.uploadedAt || new Date().toISOString()).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 ml-2">
                <a href={att.uri} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-bold">View</a>
                <button type="button" onClick={() => handleArchive(att.id)} className="text-rose-600 hover:underline font-bold">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400">No attachments found.</p>
      )}
    </div>
  );
};
