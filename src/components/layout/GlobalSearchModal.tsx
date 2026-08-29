import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, User, FileText, Landmark, ArrowRight } from 'lucide-react';

import { getAccountCode, getAccountBanglaName, getAccountEnglishName, getAccountCategory } from '../accounts/ChartOfAccountsView';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, db, navigateTo } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const handleClose = () => {
    setIsSearchOpen(false);
    setQuery('');
  };

  const getSearchResults = () => {
    if (!query.trim()) return [];
    
    const q = query.toLowerCase();
    const results = [];

    // Search Members
    const members = (db.members || []).filter(m => 
      (m.fullName || "").toLowerCase().includes(q) || 
      (m.memberId || "").toLowerCase().includes(q) ||
      m.mobile.includes(q)
    ).slice(0, 5);
    
    members.forEach(m => {
      results.push({
        type: 'MEMBER',
        id: m.memberId,
        title: m.fullName,
        subtitle: `ID: ${m.memberId} | Mobile: ${m.mobile}`,
        icon: <User className="w-4 h-4 text-emerald-600" />,
        action: () => { navigateTo('MEMBERS'); handleClose(); }
      });
    });

    // Search Accounts
    const accountsArray = Array.isArray(db.accounts) ? db.accounts : [];
    const accounts = accountsArray.filter(a => a && (
      getAccountEnglishName(a).toLowerCase().includes(q) ||
      getAccountBanglaName(a).toLowerCase().includes(q) ||
      getAccountCode(a).toLowerCase().includes(q)
    )).slice(0, 5);
    
    accounts.forEach(a => {
      results.push({
        type: 'ACCOUNT',
        id: getAccountCode(a),
        title: getAccountBanglaName(a),
        subtitle: `Code: ${getAccountCode(a)} | Category: ${getAccountCategory(a)}`,
        icon: <Landmark className="w-4 h-4 text-blue-600" />,
        action: () => { navigateTo('ACCOUNTS'); handleClose(); }
      });
    });
    // Search Transactions (Collections)
    const collections = (db.collections || []).filter(c =>
      (c.receiptNo || "").toLowerCase().includes(q) ||
      c.memberName?.toLowerCase().includes(q)
    ).slice(0, 5);

    collections.forEach(c => {
      results.push({
        type: 'TRANSACTION',
        id: c.receiptNo,
        title: `Receipt: ${c.receiptNo}`,
        subtitle: `Member: ${c.memberName} | Amount: ৳${c.paidAmount}`,
        icon: <FileText className="w-4 h-4 text-amber-600" />,
        action: () => { navigateTo('COLLECTIONS'); handleClose(); }
      });
    });

    return results;
  };

  const results = getSearchResults();

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div 
        className="fixed inset-0"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in slide-in-from-top-4">
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none px-4 text-slate-900 placeholder-slate-400 text-lg"
            placeholder="Search members, accounts, receipts... (Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {query.trim() && (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {(results || []).map((result, i) => (
                  <button
                    key={`${result.type}-${result.id}-${i}`}
                    onClick={result.action}
                    className="flex items-center gap-4 w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                      {result.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{result.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{result.subtitle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                <p>No matching results found for "{query}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
