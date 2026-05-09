'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

/** Shape of a real-time bid update pushed from the server */
export interface BidUpdatePayload {
  listingId: string;
  newBid: {
    id: string;
    amount: number;
    bidderId: string;
    bidderName?: string;
    timestamp: string;
  };
  currentBid: number;
  bidCount: number;
  timeRemaining?: string; // ISO endsAt for countdown sync
}

/** Shape of a missed-bid notification (user was outbid) */
export interface MissedBidPayload {
  listingId: string;
  previousBid: number;
  newBid: number;
  newBidderName?: string;
}

/** Shape of a new bidder joined room event */
export interface RoomJoinPayload {
  listingId: string;
  viewerCount: number;
}

/** Callback type for event handlers */
type UpdateCallback<T = any> = (data: T) => void;

/* ─── Hook factory URL ───────────────────────────────────────────────────────── */

/**
 * Resolve the Socket.IO server URL.
 * Uses NEXT_PUBLIC_SOCKET_URL from env, falls back to NEXT_PUBLIC_API_URL,
 * and finally to a local default for dev.
 */
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4001'
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────────── */

interface UseSocketReturn {
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Join an auction room by listing ID */
  joinRoom: (listingId: string) => void;
  /** Leave an auction room */
  leaveRoom: (listingId: string) => void;
  /** Register a callback for bid-update events on a specific listing */
  onUpdate: (listingId: string, callback: UpdateCallback<BidUpdatePayload>) => () => void;
  /** Register a callback for missed-bid (outbid) events */
  onMissedBid: (listingId: string, callback: UpdateCallback<MissedBidPayload>) => () => void;
  /** Register a callback for viewer-count changes */
  onViewerCount: (listingId: string, callback: UpdateCallback<RoomJoinPayload>) => () => void;
  /** Register a callback for auction-end events */
  onAuctionEnd: (listingId: string, callback: UpdateCallback<{ listingId: string }>) => () => void;
  /** Current socket connection ID (for debugging) */
  id: string | null;
}

/**
 * useSocket - Custom hook for Socket.IO connection and auction-room management.
 *
 * Features:
 *  - Single shared socket instance across the app (module-level singleton)
 *  - Auto-reconnection with exponential back-off (built into socket.io-client)
 *  - Room-based subscription: joinRoom / leaveRoom per listing
 *  - Event registration via onUpdate, onMissedBid, onViewerCount, onAuctionEnd
 *  - Returns cleanup functions to prevent memory leaks
 *  - Connection state exposed via `isConnected`
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  // Track which rooms we've joined to avoid duplicate joins
  const joinedRoomsRef = useRef(new Set<string>());

  /* ─── Initialize socket (singleton) ─────────────────────────────────────── */

  useEffect(() => {
    const url = getSocketUrl();
    if (!url) return;

    const socket: Socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });

    socketRef.current = socket;

    // ── Connection events ─────────────────────────────────────────────────
    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
      console.log('[useSocket] Connected, id:', socket.id);

      // Re-join any rooms that may have been lost during reconnection
      joinedRoomsRef.current.forEach((room) => {
        socket.emit('joinRoom', { listingId: room });
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[useSocket] Disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('[useSocket] Connection error:', err.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[useSocket] Reconnected after', attemptNumber, 'attempts');
      // Re-join rooms after reconnection
      joinedRoomsRef.current.forEach((room) => {
        socket.emit('joinRoom', { listingId: room });
      });
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[useSocket] Reconnection attempt', attemptNumber);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      // Note: we do NOT disconnect here to allow sharing across components.
      // The socket will be disconnected when the app unmounts.
    };
  }, []);

  /* ─── Room management ──────────────────────────────────────────────────── */

  const joinRoom = useCallback((listingId: string) => {
    const socket = socketRef.current;
    if (!socket) {
      console.warn('[useSocket] joinRoom called before socket initialized');
      return;
    }

    if (joinedRoomsRef.current.has(listingId)) {
      console.log('[useSocket] Already in room:', listingId);
      return;
    }

    joinedRoomsRef.current.add(listingId);
    socket.emit('joinRoom', { listingId });
    console.log('[useSocket] Joined room:', listingId);
  }, []);

  const leaveRoom = useCallback((listingId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    joinedRoomsRef.current.delete(listingId);
    socket.emit('leaveRoom', { listingId });
    console.log('[useSocket] Left room:', listingId);
  }, []);

  /* ─── Event subscription helpers ───────────────────────────────────────── */

  /**
   * Generic subscription helper.
   * Returns a cleanup function that removes the listener.
   */
  const subscribe = useCallback(
    (eventName: string, callback: UpdateCallback) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(eventName, callback);
      return () => {
        socket.off(eventName, callback);
      };
    },
    [],
  );

  const onUpdate = useCallback(
    (_listingId: string, callback: UpdateCallback<BidUpdatePayload>) => {
      return subscribe('updateBid', callback);
    },
    [subscribe],
  );

  const onMissedBid = useCallback(
    (_listingId: string, callback: UpdateCallback<MissedBidPayload>) => {
      return subscribe('missedBid', callback);
    },
    [subscribe],
  );

  const onViewerCount = useCallback(
    (_listingId: string, callback: UpdateCallback<RoomJoinPayload>) => {
      return subscribe('viewerCount', callback);
    },
    [subscribe],
  );

  const onAuctionEnd = useCallback(
    (_listingId: string, callback: UpdateCallback<{ listingId: string }>) => {
      return subscribe('auctionEnd', callback);
    },
    [subscribe],
  );

  return {
    isConnected,
    id: socketId,
    joinRoom,
    leaveRoom,
    onUpdate,
    onMissedBid,
    onViewerCount,
    onAuctionEnd,
  };
}

/* ─── Legacy window-sync bridge ──────────────────────────────────────────────── */

/**
 * useSocketCountdownSync - Bridge between useSocket and CountdownTimer's sync mechanism.
 *
 * Subscribe to server time pings and trigger countdown re-sync.
 * Call this in a parent component that renders CountdownTimer.
 */
export function useSocketCountdownSync() {
  const { isConnected, onUpdate } = useSocket();

  useEffect(() => {
    if (!isConnected) return;

    const handleServerPing = () => {
      // Trigger the CountdownTimer's window-based sync
      if (
        typeof window !== 'undefined' &&
        (window as Window & { __countdownSync?: () => void }).__countdownSync
      ) {
        (window as Window & { __countdownSync?: () => void }).__countdownSync?.();
      }

      // Also dispatch a custom event for CountdownTimer to pick up
      window.dispatchEvent(new CustomEvent('socketServerPing'));
    };

    // Subscribe to server ping events
    return onUpdate('__sync__', handleServerPing);
  }, [isConnected, onUpdate]);
}