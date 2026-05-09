'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { placeBid, Listing, Bid } from '@/lib/api';
import { toast } from 'sonner';
import { useSocket, BidUpdatePayload, MissedBidPayload } from '@/hooks/useSocket';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface BidFormProps {
  /** The full listing object (must be auction type) */
  listing: Listing;
  /** Callback after bid succeeds — receives the new current-bid value */
  onBidPlaced?: (newBid: Bid) => void;
}

interface FormValues {
  amount: string;
  useProxyBid: boolean;
  maxProxyBid: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function formatPrice(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Calculate the minimum bid increment based on the current bid value.
 * Mirrors common marketplace rules.
 */
function getBidIncrement(current: number): number {
  if (current >= 1000) return 10;
  if (current >= 500) return 5;
  if (current >= 100) return 2;
  if (current >= 50) return 1;
  if (current >= 20) return 0.5;
  return 0.25;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function BidForm({ listing, onBidPlaced }: BidFormProps) {
  const { joinRoom, leaveRoom, onUpdate, onMissedBid, isConnected } = useSocket();

  const currentBidValue = useMemo(() => {
    const raw = listing.currentBid ?? listing.startPrice;
    return typeof raw === 'number' ? raw : parseFloat(String(raw));
  }, [listing.currentBid, listing.startPrice]);

  const increment = useMemo(() => getBidIncrement(currentBidValue), [currentBidValue]);
  const minBid = currentBidValue + increment;

  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Optimistic bid amount — shown immediately before server confirms */
  const [optimisticBid, setOptimisticBid] = useState<number | null>(null);

  /* ─── Real-time socket subscription ──────────────────────────────────────── */

  // Join the auction room when mounting, leave when unmounting
  useEffect(() => {
    joinRoom(listing.id);
    return () => {
      leaveRoom(listing.id);
    };
  }, [listing.id, joinRoom, leaveRoom]);

  // Subscribe to live bid updates
  useEffect(() => {
    const handleBidUpdate = (data: BidUpdatePayload) => {
      if (data.listingId !== listing.id) return;

      console.log('[BidForm] Live bid update:', data);
      toast.info(`New bid: $${data.currentBid.toFixed(2)}`, {
        duration: 3000,
      });

      // Trigger parent to refresh listing data
      onBidPlaced?.({
        ...data.newBid,
        listingId: data.listingId,
      } as unknown as Bid);
    };

    const unsubscribe = onUpdate(listing.id, handleBidUpdate);
    return unsubscribe;
  }, [listing.id, onUpdate, onBidPlaced]);

  // Subscribe to missed-bid (outbid) notifications
  useEffect(() => {
    const handleMissedBid = (data: MissedBidPayload) => {
      if (data.listingId !== listing.id) return;

      console.log('[BidForm] You were outbid!', data);
      toast.error(
        `You've been outbid! New bid: $${data.newBid.toFixed(2)}${data.newBidderName ? ` by ${data.newBidderName}` : ''}`,
        {
          duration: 6000,
          description: 'Increase your bid to regain the lead.',
        }
      );

      // Trigger parent to refresh listing data
      onBidPlaced?.({
        id: '',
        amount: data.newBid,
        bidderId: '',
        listingId: data.listingId,
        timestamp: new Date().toISOString(),
      } as unknown as Bid);
    };

    const unsubscribe = onMissedBid(listing.id, handleMissedBid);
    return unsubscribe;
  }, [listing.id, onMissedBid, onBidPlaced]);

  const { control, handleSubmit, watch, resetField, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      amount: '',
      useProxyBid: false,
      maxProxyBid: '',
    },
  });

  const useProxyBid = watch('useProxyBid');

  /* ─── Submit handler ─────────────────────────────────────────────────────── */

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const amount = parseFloat(values.amount);
      if (isNaN(amount) || amount < minBid) return; // should never happen (validated), but safety

      const payload = {
        listingId: listing.id,
        amount,
        ...(values.useProxyBid ? { maxProxyBid: parseFloat(values.maxProxyBid) } : {}),
      };

      // Store the previous bid value so we can roll back on failure
      const previousBid = currentBidValue;

      // ── Optimistic update ────────────────────────────────────────────────
      setIsSubmitting(true);
      setOptimisticBid(amount);
      toast.loading('Placing your bid...');

      try {
        const newBid = await placeBid(payload);

        // Server confirmed — dismiss loading, show success
        toast.success('Bid placed successfully!');

        // Notify parent so it can refresh listing data / invalidate queries
        onBidPlaced?.(newBid);

        // Reset form
        resetField('amount');
        resetField('maxProxyBid');
        setOptimisticBid(null);
      } catch (err: any) {
        const message = err?.message || 'Failed to place bid';

        // ── Rollback optimistic state ──────────────────────────────────────
        setOptimisticBid(previousBid === amount ? null : previousBid);
        toast.error(message, {
          duration: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [listing.id, minBid, currentBidValue, onBidPlaced, resetField],
  );

  /* ─── Display price (optimistic or real) ─────────────────────────────────── */
  const displayBid = optimisticBid ?? currentBidValue;

  /* ─── Connection status indicator ────────────────────────────────────────── */
  const connectionStatus = useMemo(() => {
    if (!isConnected) return { label: 'Connecting…', color: 'text-amber-500', bg: 'bg-amber-500' };
    return { label: 'Live', color: 'text-green-500', bg: 'bg-green-500' };
  }, [isConnected]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ── Primary bid input ──────────────────────────────────────────────── */}
      <div>
        <label htmlFor="bid-amount" className="mb-1.5 block text-sm font-medium text-gray-700">
          Place a bid
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 select-none">
              $
            </span>
            <Controller
              name="amount"
              control={control}
              rules={{
                required: 'Enter a bid amount',
                validate: (v) => {
                  const n = parseFloat(v);
                  if (isNaN(n)) return 'Enter a valid number';
                  if (n < minBid) return `Minimum bid is ${formatPrice(minBid)}`;
                  return true;
                },
              }}
              render={({ field }) => (
                <input
                  {...field}
                  id="bid-amount"
                  type="number"
                  step={increment}
                  min={minBid}
                  placeholder={formatPrice(minBid).replace('$', '')}
                  disabled={isSubmitting}
                  className={`w-full rounded-lg border py-2.5 pl-7 pr-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
                    errors.amount
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                  } disabled:opacity-50`}
                />
              )}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Bidding…
              </>
            ) : (
              'Place Bid'
            )}
          </button>
        </div>
        {errors.amount && (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errors.amount.message}
          </p>
        )}
        <p className="mt-1.5 text-xs text-gray-400">
          Minimum bid: {formatPrice(minBid)} · {formatPrice(increment)} increment
        </p>
      </div>

      {/* ── Proxy bid toggle ───────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Proxy bidding</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Set a maximum — the system bids automatically on your behalf
            </p>
          </div>
          <Controller
            name="useProxyBid"
            control={control}
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  field.value ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    field.value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          />
        </div>

        {/* Max proxy bid input (conditionally rendered) */}
        {useProxyBid && (
          <div>
            <label htmlFor="max-proxy-bid" className="mb-1.5 block text-xs font-medium text-gray-600">
              Maximum bid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                $
              </span>
              <Controller
                name="maxProxyBid"
                control={control}
                rules={{
                  required: 'Set a maximum bid',
                  validate: (v) => {
                    const n = parseFloat(v);
                    if (isNaN(n)) return 'Enter a valid number';
                    if (n <= minBid) return `Must be greater than ${formatPrice(minBid)}`;
                    return true;
                  },
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    id="max-proxy-bid"
                    type="number"
                    step={increment}
                    min={minBid}
                    placeholder="Max amount"
                    disabled={isSubmitting}
                    className={`w-full rounded-lg border py-2 pl-7 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 ${
                      errors.maxProxyBid
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
                    } disabled:opacity-50`}
                  />
                )}
              />
            </div>
            {errors.maxProxyBid && (
              <p className="mt-1 text-xs text-red-500">{errors.maxProxyBid.message}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Optimistic bid display ─────────────────────────────────────────── */}
      {optimisticBid !== null && optimisticBid !== currentBidValue && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5 text-green-500 flex-shrink-0"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">
              Your bid: {formatPrice(optimisticBid)}
            </p>
            <p className="text-xs text-green-600">Confirming with server…</p>
          </div>
        </div>
      )}
    </form>
  );
}