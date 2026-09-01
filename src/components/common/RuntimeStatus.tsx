import React, { useState, useEffect, useCallback } from 'react';

interface RuntimeStatusProps {
  className?: string;
  hideTextOnMobile?: boolean;
}

export const RuntimeStatus: React.FC<RuntimeStatusProps> = ({
  className = '',
  hideTextOnMobile = true,
}) => {
  const [runtimeStatus, setRuntimeStatus] = useState<'OK' | 'ERROR' | 'CHECKING'>('CHECKING');
  const [dbStatus, setDbStatus] = useState<'OK' | 'ERROR' | 'CHECKING'>('CHECKING');
  
  const [githubSync, setGithubSync] = useState<'OK' | 'OUTDATED' | 'CHECK FAILED' | 'UNKNOWN' | 'CHECKING'>('CHECKING');
  const [githubDetails, setGithubDetails] = useState<any>(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch('/api/system/health', {
        signal: controller.signal,
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (data.runtime === 'OK') setRuntimeStatus('OK');
      else setRuntimeStatus('ERROR');
      
      if (data.database === 'OK') setDbStatus('OK');
      else setDbStatus('ERROR');

      clearTimeout(timeoutId);
    } catch {
      setRuntimeStatus('ERROR');
      setDbStatus('ERROR');
    }
  }, []);

  const checkGithub = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch('/api/system/github-status', {
        signal: controller.signal,
        cache: 'no-store'
      });
      const data = await res.json();
      setGithubDetails(data);

      if (!data.githubReachable) {
        setGithubSync('CHECK FAILED');
      } else if (data.deployedCommitSha === 'unknown' || data.githubCommitSha === 'unknown') {
        setGithubSync('UNKNOWN');
      } else if (data.synced) {
        setGithubSync('OK');
      } else {
        setGithubSync('OUTDATED');
      }

      clearTimeout(timeoutId);
    } catch {
      setGithubSync('CHECK FAILED');
    }
  }, []);

  useEffect(() => {
    checkHealth();
    checkGithub();

    const interval = setInterval(() => {
      checkHealth();
      checkGithub();
    }, 60000); // 1 minute

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
        checkGithub();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkHealth);
    window.addEventListener('online', checkGithub);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkHealth);
      window.removeEventListener('online', checkGithub);
    };
  }, [checkHealth, checkGithub]);

  const getStatusColor = (status: string) => {
    if (status === 'OK') return 'text-emerald-500';
    if (status === 'CHECKING' || status === 'UNKNOWN') return 'text-amber-500';
    return 'text-rose-500';
  };
  
  const getDotColor = (status: string) => {
    if (status === 'OK') return 'bg-emerald-500';
    if (status === 'CHECKING' || status === 'UNKNOWN') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 text-[11px] sm:text-xs font-medium text-slate-400 bg-slate-900/40 px-3 py-1.5 rounded-md border border-slate-700/50 ${className}`}>
      
      {/* Runtime */}
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(runtimeStatus)}`} />
        <span>Runtime: <span className={getStatusColor(runtimeStatus)}>{runtimeStatus}</span></span>
      </div>

      {/* Database */}
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(dbStatus)}`} />
        <span>Database: <span className={getStatusColor(dbStatus)}>{dbStatus}</span></span>
      </div>

      {/* GitHub Sync */}
      <div className="flex items-center gap-1.5 group relative cursor-help">
        <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(githubSync)}`} />
        <span>GitHub Sync: <span className={getStatusColor(githubSync)}>{githubSync}</span></span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-[240px] p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[11px] text-slate-300 z-50">
          <div className="font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-1">GitHub Sync Details</div>
          {githubDetails ? (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Branch:</span>
                <span className="font-mono text-emerald-400">{githubDetails.githubBranch || 'unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Live Commit:</span>
                <span className="font-mono">{githubDetails.deployedCommitSha ? githubDetails.deployedCommitSha.substring(0, 7) : 'unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GitHub Commit:</span>
                <span className="font-mono">{githubDetails.githubCommitSha ? githubDetails.githubCommitSha.substring(0, 7) : 'unknown'}</span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-700">
                <span className="text-slate-400">Status:</span>
                <span className={getStatusColor(githubSync)}>
                  {githubSync === 'OK' ? 'Synchronized' : githubSync === 'OUTDATED' ? 'Live server is behind GitHub' : githubSync}
                </span>
              </div>
              {githubDetails.buildTime && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Build Time:</span>
                  <span>{new Date(githubDetails.buildTime).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div>Loading details...</div>
          )}
          {/* Tooltip Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-b border-r border-slate-700 transform rotate-45" />
        </div>
      </div>
      
    </div>
  );
};
