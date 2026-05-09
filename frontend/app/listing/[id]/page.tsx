'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getListingById, getListings, getBidHistory, Listing, Bid } from '@/lib/api';
import { useCallback } from 'react';
import ImageGallery from '@/components/listings/ImageGallery';
import PricingBlock from '@/components/listings/PricingBlock';
import ItemSpecifics from '@/components/listings/ItemSpecifics';
import SellerInfo from '@/components/listings/SellerInfo';
import WatchButton from '@/components/listings/WatchButton';
import DescriptionSection from '@/components/listings/DescriptionSection';
import BidHistorySection from '@/components/listings/BidHistorySection';
import QAAccordion from '@/components/listings/QAAccordion';
import SimilarItems from '@/components/listings/SimilarItems';
import { SkeletonCard } from '@/components/listings/ListingCard';

// ─── Format helpers ────────────────────────────────────────────────────────────

function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'N/A';
  // Handle Decimal.js-like objects from Prisma
  const num = typeof price === 'number' ? price : parseFloat(String(price));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

function ListingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2 animate-pulse">
        <div className="h-4 w-16 rounded bg-gray-200" />
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-xl bg-gray-200 animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 w-20 rounded-lg bg-gray-200 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Pricing sidebar skeleton */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-3">
            <div className="h-8 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-6 w-3/4 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Pricing block */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div className="h-10 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-full rounded bg-gray-200 animate-pulse" />
            <div className="h-10 w-full rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Seller info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Specs section skeleton */}
      <div className="mt-12 rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────────────────

function ListingError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center lg:px-8">
      <div className="mx-auto max-w-md">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mx-auto mb-4 h-16 w-16 text-gray-300"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">Listing Not Found</h2>
        <p className="mt-2 text-gray-500">{message}</p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to Home
        </a>
      </div>
    </div>
  );
}

// ─── Breadcrumb navigation ─────────────────────────────────────────────────────

function Breadcrumbs({ listing }: { listing: Listing }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-2 text-sm text-gray-500">
        <li>
          <a href="/" className="hover:text-blue-600 transition-colors">
            Home
          </a>
        </li>
        <li aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </li>
        <li>
          <a href="/listings" className="hover:text-blue-600 transition-colors">
            All Listings
          </a>
        </li>
        <li aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </li>
        <li className="truncate max-w-xs font-medium text-gray-900" aria-current="page">
          {listing.title}
        </li>
      </ol>
    </nav>
  );
}

// ─── Main page component ───────────────────────────────────────────────────────

export default function ListingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();

  // Callback fired when a bid is successfully placed — invalidates queries so
  // the listing price and bid history refresh automatically.
  const handleBidPlaced = useCallback(
    async (_newBid: Bid) => {
      await queryClient.invalidateQueries({ queryKey: ['listing', id] });
      await queryClient.invalidateQueries({ queryKey: ['bidHistory', id] });
    },
    [queryClient, id],
  );

  // Fetch listing data
  const {
    data: listing,
    isLoading,
    error,
  } = useQuery<Listing>({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id),
    enabled: !!id,
  });

  // Fetch bid history for auction listings
  const { data: bidHistory } = useQuery<Bid[]>({
    queryKey: ['bidHistory', id],
    queryFn: () => getBidHistory(id),
    enabled: !!id && listing?.priceType === 'auction',
  });

  // Fetch similar items (same category, different listing)
  const { data: similarItems } = useQuery<any>({
    queryKey: ['similarListings', id, listing?.categoryId],
    queryFn: () => getListings({ page: 1, limit: 8, ...(listing?.categoryId ? { categoryId: listing.categoryId } : {}) }),
    enabled: !!listing?.categoryId,
  });

  if (isLoading) return <ListingDetailSkeleton />;
  if (error || !listing) return <ListingError message={error?.message || 'An error occurred loading this listing.'} />;

  // Parse similar items excluding current listing
  const filteredSimilar = (similarItems?.items ?? [])
    .filter((item: Listing) => item.id !== listing.id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <Breadcrumbs listing={listing} />

      {/* Main content: Gallery + Pricing sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Image Gallery */}
        <div>
          <ImageGallery listingId={listing.id} title={listing.title} />
        </div>

        {/* Right: Pricing, Seller, Actions */}
        <div className="space-y-6">
          {/* Title & Condition */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              {listing.title}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  listing.condition.toLowerCase().includes('new')
                    ? 'bg-green-100 text-green-700'
                    : listing.condition.toLowerCase().includes('refurb')
                    ? 'bg-blue-100 text-blue-700'
                    : listing.condition.toLowerCase().includes('used')
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {listing.condition}
              </span>
              {listing.watchers > 0 && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {listing.watchers} watching
                </span>
              )}
            </div>
          </div>

          {/* Pricing Block */}
          <PricingBlock listing={listing} onBidPlaced={handleBidPlaced} />

          {/* Watch / Save Button */}
          <WatchButton listing={listing} />

          {/* Seller Info */}
          <SellerInfo listing={listing} />

          {/* Share button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Listing
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="my-10 border-t border-gray-200" />

      {/* Description Section */}
      <DescriptionSection listing={listing} />

      {/* Divider */}
      <div className="my-10 border-t border-gray-200" />

      {/* Item Specifics Table */}
      <ItemSpecifics listing={listing} />

      {/* Divider */}
      <div className="my-10 border-t border-gray-200" />

      {/* Bid History (auction items only) */}
      {listing.priceType === 'auction' && bidHistory && (
        <BidHistorySection bids={bidHistory} />
      )}

      {/* Divider */}
      <div className="my-10 border-t border-gray-200" />

      {/* Q&A Accordion */}
      <QAAccordion listingId={listing.id} />

      {/* Divider */}
      <div className="my-10 border-t border-gray-200" />

      {/* Similar Items Carousel */}
      {filteredSimilar.length > 0 && (
        <SimilarItems items={filteredSimilar} />
      )}
    </div>
  );
}