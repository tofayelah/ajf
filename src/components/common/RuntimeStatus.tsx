import React, { useState, useEffect, useCallback } from 'react';

interface RuntimeStatusProps {
  className?: string;
  hideTextOnMobile?: boolean;
}

export const RuntimeStatus: React.FC<RuntimeStatusProps> = ({
  className = '',
  hideTextOnMobile = true,
}) => {
  const [runtimeStatus, setRuntimeStatus] = useState<'OK' | 'NOT OK' | 'Checking...'>('Checking...');
  const [dbStatus, setDbStatus] = useState<'OK' | 'NOT OK' | 'Checking...'>('Checking...');
  
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
      else setRuntimeStatus('NOT OK');
      
      if (data.database === 'OK') setDbStatus('OK');
      else setDbStatus('NOT OK');

      clearTimeout(timeoutId);
    } catch {
      setRuntimeStatus('NOT OK');
      setDbStatus('NOT OK');
    }
  }, []);

  useEffect(() => {
    checkHealth();

    const interval = setInterval(() => {
      checkHealth();
    }, 60000); // 1 minute

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', checkHealth);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', checkHealth);
    };
  }, [checkHealth]);

  const getStatusColor = (status: string) => {
    if (status === 'OK') return 'text-emerald-100';
    if (status === 'Checking...') return 'text-amber-200';
    return 'text-rose-200';
  };
  
  const getDotColor = (status: string) => {
    if (status === 'OK') return 'bg-emerald-400';
    if (status === 'Checking...') return 'bg-amber-400';
    return 'bg-rose-400';
  };

  const getContainerColor = (runtime: string, db: string) => {
    if (runtime === 'OK' && db === 'OK') {
      return 'bg-emerald-950/60 border-emerald-500/40 hover:bg-emerald-900/70 hover:border-emerald-400/60';
    }
    if (runtime === 'NOT OK' || db === 'NOT OK') {
      return 'bg-rose-950/70 border-rose-500/50 hover:bg-rose-900/80 hover:border-rose-400/70';
    }
    return 'bg-amber-950/60 border-amber-500/40 hover:bg-amber-900/70 hover:border-amber-400/60';
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-medium transition-all duration-200 select-none shadow-xs border shrink-0 backdrop-blur-xs rounded-full ${
      hideTextOnMobile ? 'px-2 py-0.5 sm:px-2.5 sm:py-0.5' : 'px-2 py-0.5 sm:px-2.5'
    } ${getContainerColor(runtimeStatus, dbStatus)} ${className}`}>
      
      <div className="hidden sm:inline font-bold text-white opacity-90 pr-1 border-r border-white/20">
        AJF Welfare ERP
      </div>

      {/* Runtime */}
      <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 items-center justify-center">
          {runtimeStatus === 'OK' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${getDotColor(runtimeStatus)}`} />
        </span>
        <span>
          <span className="hidden sm:inline">Runtime: </span>
          <span className="sm:hidden text-emerald-100/70">RT: </span>
          <span className={getStatusColor(runtimeStatus)}>{runtimeStatus}</span>
        </span>
      </div>

      {/* Database */}
      <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
        <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 items-center justify-center">
          {dbStatus === 'OK' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${getDotColor(dbStatus)}`} />
        </span>
        <span>
          <span className="hidden sm:inline">Database: </span>
          <span className="sm:hidden text-emerald-100/70">DB: </span>
          <span className={getStatusColor(dbStatus)}>{dbStatus}</span>
        </span>
      </div>
    </div>
  );
};
