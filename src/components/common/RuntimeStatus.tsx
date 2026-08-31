import React, { useState, useEffect, useCallback } from 'react';

interface RuntimeStatusProps {
  className?: string;
  hideTextOnMobile?: boolean;
}

export const RuntimeStatus: React.FC<RuntimeStatusProps> = ({
  className = '',
  hideTextOnMobile = true,
}) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const checkRuntimeHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data && (data.status === 'ok' || data.runtime)) {
          setIsHealthy(true);
          return;
        }
      }
      setIsHealthy(false);
    } catch {
      // Safe fallback: never throw uncaught error, never crash UI or trigger white screen
      setIsHealthy(false);
    }
  }, []);

  useEffect(() => {
    // Initial check on mount
    checkRuntimeHealth();

    // Centralized periodic polling (every 45s)
    const interval = setInterval(checkRuntimeHealth, 45000);

    // Re-check when window regains focus, visibility changes, or network reconnects
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkRuntimeHealth();
      }
    };
    const handleOnline = () => checkRuntimeHealth();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkRuntimeHealth]);

  // Determine current status (treat null initial loading gracefully as healthy or evaluating)
  const healthy = isHealthy !== false;

  return (
    <div
      id="ajf-runtime-status"
      className={`inline-flex items-center gap-1.5 ${
        hideTextOnMobile ? 'px-1.5 py-1 sm:px-2.5 sm:py-0.5' : 'px-2 py-0.5 sm:px-2.5'
      } rounded-full text-[10px] sm:text-[11px] font-medium tracking-tight transition-all duration-200 select-none shadow-xs border shrink-0 backdrop-blur-xs ${
        healthy
          ? 'bg-emerald-950/60 text-emerald-100 border-emerald-500/40 hover:bg-emerald-900/70 hover:border-emerald-400/60'
          : 'bg-rose-950/70 text-rose-100 border-rose-500/50 hover:bg-rose-900/80 hover:border-rose-400/70'
      } ${className}`}
      title={healthy ? 'AJF Welfare ERP Runtime OK' : 'AJF Welfare ERP Runtime Not OK'}
      aria-label={healthy ? 'AJF Welfare ERP Runtime OK' : 'AJF Welfare ERP Runtime Not OK'}
    >
      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
        {healthy && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
            healthy ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]' : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)]'
          }`}
        />
      </span>
      <span className={`${hideTextOnMobile ? 'hidden sm:inline' : 'inline'} whitespace-nowrap font-medium leading-none`}>
        {healthy ? 'AJF Welfare ERP Runtime OK' : 'AJF Welfare ERP Runtime Not OK'}
      </span>
    </div>
  );
};
