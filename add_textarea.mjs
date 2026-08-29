import fs from 'fs';

const filePath = 'src/components/settlement/PendingSettlementApprovalsView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// For Review Modal
const reviewInsertPoint = '                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800">\n                  <span>{isBangla ? \'প্রদেয় নিট নিষ্পত্তি:\' : \'Net Settlement Amount:\'}</span>\n                  <span className="font-mono text-base">\n                    ৳{(selectedReviewExit.netRefundAmount || selectedReviewExit.netSettlementAmount || 0).toLocaleString()}\n                  </span>\n                </div>\n              </div>';

const reviewTextareaCode = `
              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isBangla ? 'পর্যালোচনা নোট / অডিট ট্রেইল (বাধ্যতামূলক) *' : 'Review Note / Audit Trail (Required) *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder={isBangla ? 'যাচাইকরণের বিস্তারিত বিবরণ লিখুন...' : 'Enter review verification details...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>`;

content = content.replace(reviewInsertPoint, reviewInsertPoint + reviewTextareaCode);

// For Review Confirm Button Disable condition
content = content.replace(
  "              <button\n                type=\"button\"\n                onClick={handleConfirmReview}\n                disabled={isSubmitting}\n                className=\"px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5\"",
  "              <button\n                type=\"button\"\n                onClick={handleConfirmReview}\n                disabled={isSubmitting || !auditNote.trim()}\n                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${!auditNote.trim() || isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}"
);

// For Approve Modal
const approveInsertPoint = '                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-800 text-sm">\n                  <span>{isBangla ? \'প্রদেয় নিট নিষ্পত্তি:\' : \'Net Settlement:\'}</span>\n                  <span className="font-mono text-base font-black">\n                    ৳{(selectedApproveExit.netRefundAmount || selectedApproveExit.netSettlementAmount || 0).toLocaleString()}\n                  </span>\n                </div>\n              </div>';

const approveTextareaCode = `
              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isBangla ? 'অনুমোদন নোট / অডিট ট্রেইল (বাধ্যতামূলক) *' : 'Approval Note / Audit Trail (Required) *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={auditNote}
                  onChange={e => setAuditNote(e.target.value)}
                  placeholder={isBangla ? 'চূড়ান্ত অনুমোদনের বিবরণ বা শর্ত লিখুন...' : 'Enter final approval details or conditions...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>`;

content = content.replace(approveInsertPoint, approveInsertPoint + approveTextareaCode);

// For Approve Confirm Button Disable condition
content = content.replace(
  "              <button\n                type=\"button\"\n                onClick={handleConfirmApprove}\n                disabled={isSubmitting}\n                className=\"px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5\"",
  "              <button\n                type=\"button\"\n                onClick={handleConfirmApprove}\n                disabled={isSubmitting || !auditNote.trim()}\n                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 ${!auditNote.trim() || isSubmitting ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Updated PendingSettlementApprovalsView.tsx text areas.");
