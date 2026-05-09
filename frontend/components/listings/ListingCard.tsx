'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Listing } from '@/lib/api';

// ─── Condition badge color mapping ───────────────────────────────────────────

const conditionStyles: Record<string, string> = {
  new: 'bg-green-100 text-green-700 border border-green-200',
  newother: 'bg-green-100 text-green-700 border border-green-200',
  refurbished: 'bg-blue-100 text-blue-700 border border-blue-200',
  used: 'bg-amber-100 text-amber-700 border border-amber-200',
  forparts: 'bg-red-100 text-red-700 border border-red-200',
  notspecified: 'bg-gray-100 text-gray-600 border border-gray-200',
};

function getConditionBadge(condition: string): { label: string; className: string } {
  const normalized = condition.toLowerCase().replace(/\s+/g, '');
  const label = condition.charAt(0).toUpperCase() + condition.slice(1);
  const className = conditionStyles[normalized] ?? conditionStyles.notspecified;
  return { label, className };
}

// ─── Countdown Timer Hook ────────────────────────────────────────────────────

/**
 * Returns a live-updating countdown string for a given ISO date.
 * Updates every second while the component is mounted.
 */
function useCountdown(targetDate: string | null): string {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!targetDate) {
      setRemaining('');
      return;
    }

    const update = () => {
      const end = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setRemaining(`${minutes}m ${seconds}s`);
      } else {
        setRemaining(`${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return remaining;
}

// ─── Format price helper ─────────────────────────────────────────────────────

function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

// ─── Urgency color based on time remaining ───────────────────────────────────

function getCountdownColor(endsAt: string | null): string {
  if (!endsAt) return 'text-gray-500';
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'text-red-600 font-semibold';
  if (diff < 1000 * 60 * 60) return 'text-red-600 font-semibold'; // < 1h
  if (diff < 1000 * 60 * 60 * 24) return 'text-amber-600 font-medium'; // < 24h
  return 'text-gray-500';
}

// ─── ListingCard Component ───────────────────────────────────────────────────

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const countdown = useCountdown(listing.endsAt);
  const countdownColor = getCountdownColor(listing.endsAt);
  const { label: conditionLabel, className: conditionClassName } = getConditionBadge(listing.condition);

  // Determine the primary price to display
  const displayPrice = listing.buyNowPrice && !listing.currentBid
    ? listing.buyNowPrice
    : listing.currentBid ?? listing.startPrice;

  // Is this an auction-style listing with an end date?
  const isAuction = !!listing.endsAt;

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-400 hover:shadow-lg hover:shadow-gray-200/50">
        {/* Image Placeholder */}
        <div className="relative aspect-square w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-20 w-20 text-gray-300 transition-transform duration-200 group-hover:scale-105"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>

          {/* Condition Badge Overlay */}
          <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${conditionClassName}`}>
            {conditionLabel}
          </span>

          {/* Watchers Badge */}
          {listing.watchers > 0 && (
            <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {listing.watchers}
            </span>
          )}

          {/* Auction / Buy Now indicator */}
          {isAuction && (
            <span className="absolute bottom-2 left-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">
              Auction
            </span>
          )}
          {!isAuction && listing.buyNowPrice && (
            <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
              Buy It Now
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors min-h-[2.5rem]">
            {listing.title}
          </h3>

          {/* Price Row */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(displayPrice)}
            </span>
          </div>

          {/* Secondary price info */}
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
            {listing.currentBid && listing.currentBid !== displayPrice && (
              <span>
                Current: <span className="font-medium text-gray-700">{formatPrice(listing.currentBid)}</span>
              </span>
            )}
            {listing.buyNowPrice && listing.currentBid && (
              <span>
                Buy Now: <span className="font-medium text-gray-700">{formatPrice(listing.buyNowPrice)}</span>
              </span>
            )}
          </div>

          {/* Countdown / Footer Row */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className={`text-xs font-medium ${countdownColor}`}>
              {isAuction ? (
                <span className="flex items-center gap-1">
                  {/* Clock icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {countdown || 'Loading...'}
                </span>
              ) : (
                <span>Fixed Price</span>
              )}
            </span>

            {/* Status indicator */}
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                listing.status === 'active' ? 'bg-green-400' : 'bg-gray-300'
              }`}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── SkeletonCard Component (loading placeholder) ────────────────────────────

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-square w-full bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
        <div className="h-7 w-24 rounded bg-gray-200" />
        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-2 w-2 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default ListingCard;