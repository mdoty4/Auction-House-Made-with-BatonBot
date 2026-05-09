'use client';
import { useState, useCallback } from 'react';
import { Listing } from '@/lib/api';
export default function WatchButton({ listing }: { listing: Listing }) {
  const [isWatching, setIsWatching] = useState(false);
  const [count, setCount] = useState(listing.watchers);
  const [toast, setToast] = useState<string | null>(null);
  const toggleWatch = useCallback(() => {
    const auth = typeof window !== 'undefined' && localStorage.getItem('auth_token');
    if (!auth) { setToast('Sign in to watch this item'); setTimeout(() => setToast(null), 3000); return; }
    setIsWatching((prev) => !prev);
    setCount((prev) => (isWatching ? prev - 1 : prev + 1));
    setToast(isWatching ? 'Removed from watch list' : 'Added to watch list');
    setTimeout(() => setToast(null), 2500);
  }, [isWatching]);
  return (
    <div className="relative">
      <button onClick={toggleWatch} className={`group flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold transition-all ${isWatching ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isWatching ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={`h-5 w-5 transition-transform ${isWatching ? 'text-blue-600' : 'group-hover:scale-110'}`}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
        {isWatching ? 'Watching' : 'Add to Watchlist'}
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isWatching ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>{count}</span>
      </button>
      {toast && <div className="absolute -bottom-12 left-0 right-0 z-10"><div className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div></div>}
    </div>
  );
}
