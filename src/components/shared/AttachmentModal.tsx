import React from 'react';
import { AttachmentManager } from './AttachmentManager';

interface Props {
  entityType: 'MEMBER' | 'EXPENSE' | 'INVESTMENT' | 'RESOLUTION' | 'WELFARE' | 'LOAN';
  entityId: string;
  title: string;
  onClose: () => void;
}

export const AttachmentModal: React.FC<Props> = ({ entityType, entityId, title, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Attachments</h3>
            <p className="text-[11px] text-slate-500">{title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
        </div>
        
        <AttachmentManager entityType={entityType} entityId={entityId} />
        
        <div className="pt-4 border-t flex justify-end">
          <button onClick={onClose} className="bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
