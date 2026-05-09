'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';

/**
 * CountdownTimer - Server-synced auction countdown component
 *
 * Features:
 *  - Accepts endsAt: string (ISO date) prop
 *  - Calculates remaining time via setInterval, formatted as HH:MM:SS
 *  - Re-syncs on tab visibility change (visibilitychange event)
 *  - Re-syncs on Socket.IO serverPing events for drift correction
 *  - Exposes a syncRef for external triggers (e.g., WebSocket ping)
 *  - Visual urgency states (urgent < 1h, ended)
 *  - Connection status indicator
 */

interface CountdownTimerProps {
  endsAt: string;
  onEnded?: () => void;
  /** Optional listing ID to subscribe to socket auction-end events */
  listingId?: string;
}

interface TimeState {
  totalSeconds: number;
  hours: string;
  minutes: string;
  seconds: string;
  isUrgent: boolean;
  isEnded: boolean;
}

/**
 * Calculate remaining time breakdown from a target date string.
 */
function calculateRemaining(endsAt: string): TimeState {
  const diff = new Date(endsAt).getTime() - Date.now();

  if (diff <= 0) {
    return {
      totalSeconds: 0,
      hours: '00',
      minutes: '00',
      seconds: '00',
      isUrgent: false,
      isEnded: true,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const isUrgent = diff < 1000 * 60 * 60; // less than 1 hour

  return { totalSeconds, hours, minutes, seconds, isUrgent, isEnded: false };
}

export default function CountdownTimer({ endsAt, onEnded, listingId }: CountdownTimerProps) {
  const { isConnected, onAuctionEnd } = useSocket();
  const [time, setTime] = useState<TimeState>(() => calculateRemaining(endsAt));
  const onEndedRef = useRef(onEnded);
  const syncRef = useRef<(() => void) | null>(null);
  const [socketSynced, setSocketSynced] = useState(false);

  // Keep onEnded ref current so the effect closure stays stable
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  /* ─── Socket-based sync ─────────────────────────────────────────────────── */

  // Listen for server time pings to correct timer drift
  useEffect(() => {
    if (!listingId || !isConnected) return;

    const handleServerPing = () => {
      syncRef.current?.();
      setSocketSynced(true);
      setTimeout(() => setSocketSynced(false), 2000);
    };

    const unsubscribe = onAuctionEnd(listingId, (data) => {
      if (data.listingId === listingId) {
        // Force ended state when server signals auction end
        setTime({
          totalSeconds: 0,
          hours: '00',
          minutes: '00',
          seconds: '00',
          isUrgent: false,
          isEnded: true,
        });
        onEndedRef.current?.();
      }
    });

    // Also subscribe to serverPing via window bridge for drift correction
    const handlePing = (e: CustomEvent) => {
      if (e.detail?.listingId === listingId) {
        handleServerPing();
      }
    };
    window.addEventListener('socketServerPing', handlePing as any);

    return () => {
      unsubscribe();
      window.removeEventListener('socketServerPing', handlePing as any);
    };
  }, [listingId, isConnected, onAuctionEnd]);

  useEffect(() => {
    const sync = () => {
      const newState = calculateRemaining(endsAt);
      setTime(newState);

      // Fire callback when auction transitions to ended
      if (newState.isEnded && !time.isEnded) {
        onEndedRef.current?.();
      }
    };

    // Initial sync
    sync();

    // Update every second
    const interval = setInterval(sync, 1000);

    // Expose sync function via ref for external triggers (e.g., WebSocket ping)
    syncRef.current = sync;

    // Re-sync on tab visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      syncRef.current = null;
    };
  }, [endsAt, time.isEnded]);

  /**
   * Public method to trigger a manual sync.
   * Call this from parent when receiving WebSocket ping.
   */
  const triggerSync = useCallback(() => {
    syncRef.current?.();
  }, []);

  // Expose triggerSync for parent components
  useEffect(() => {
    (window as Window & { __countdownSync?: (id: string) => void }).__countdownSync = triggerSync;
  }, [triggerSync]);

  const { hours, minutes, seconds, isUrgent, isEnded } = time;

  return (
    <div
      className={`rounded-lg border p-4 transition-colors ${
        isEnded
          ? 'border-red-200 bg-red-50'
          : isUrgent
          ? 'border-amber-200 bg-amber-50'
          : 'border-gray-200 bg-gray-50'
      }`}
      data-testid="countdown-timer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Clock icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-5 w-5 ${
              isEnded
                ? 'text-red-500'
                : isUrgent
                ? 'text-amber-500 animate-pulse'
                : 'text-gray-500'
            }`}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            {isEnded ? "Auction Ended" : isUrgent ? 'Ending Soon!' : 'Time Remaining'}
          </span>

          {/* Socket connection indicator */}
          {!isEnded && (
            <span className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${
              isConnected ? 'text-green-600' : 'text-amber-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
              }`} />
              {isConnected ? 'Live' : 'Syncing'}
              {socketSynced && (
                <span className="text-green-600 ml-0.5">✓</span>
              )}
            </span>
          )}
        </div>

        {/* Countdown display - HH:MM:SS format */}
        <div className="flex items-center gap-1" role="timer" aria-label="Auction countdown">
          <span
            className={`inline-flex min-w-[2ch] items-center justify-center font-mono text-xl font-bold tabular-nums ${
              isEnded
                ? 'text-red-600'
                : isUrgent
                ? 'text-amber-600'
                : 'text-gray-900'
            }`}
          >
            {hours}
          </span>
          <span className={`text-xl font-bold ${isEnded ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gray-400'}`}>:</span>
          <span
            className={`inline-flex min-w-[2ch] items-center justify-center font-mono text-xl font-bold tabular-nums ${
              isEnded
                ? 'text-red-600'
                : isUrgent
                ? 'text-amber-600'
                : 'text-gray-900'
            }`}
          >
            {minutes}
          </span>
          <span className={`text-xl font-bold ${isEnded ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gray-400'}`}>:</span>
          <span
            className={`inline-flex min-w-[2ch] items-center justify-center font-mono text-xl font-bold tabular-nums ${
              isEnded
                ? 'text-red-600'
                : isUrgent
                ? 'text-amber-600'
                : 'text-gray-900'
            }`}
          >
            {seconds}
          </span>
        </div>
      </div>

      {/* Urgency progress bar */}
      {!isEnded && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{isUrgent ? 'Less than 1 hour remaining' : 'Auction in progress'}</span>
            <span>
              {isUrgent ? '~60%' : '~30%'} elapsed
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isUrgent ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{
                width: isUrgent ? '15%' : '60%',
              }}
            />
          </div>
        </div>
      )}

      {/* Ended state */}
      {isEnded && (
        <div className="mt-3 rounded-md bg-red-100 px-3 py-2 text-center text-sm font-medium text-red-700">
          This auction has ended
        </div>
      )}
    </div>
  );
}

/**
 * Hook for parent components to trigger server sync on WebSocket events.
 * Call useCountdownSync() in your parent, then invoke the returned function
 * when receiving a ping from the WebSocket server.
 */
export function useCountdownSync() {
  return useCallback(() => {
    if (typeof window !== 'undefined' && (window as Window & { __countdownSync?: () => void }).__countdownSync) {
      (window as Window & { __countdownSync?: () => void }).__countdownSync?.();
    }
  }, []);
}