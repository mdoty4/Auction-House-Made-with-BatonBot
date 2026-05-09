'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getListings, Listing } from '@/lib/api';
import { ListingCard, SkeletonCard } from './ListingCard';

// ─── Page Size ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

// ─── Use Listings Query Hook ─────────────────────────────────────────────────

/**
 * Reusable hook for fetching listings with infinite scroll support.
 * Uses React Query's useInfiniteQuery for cursor-based pagination.
 */
interface UseListingsOptions {
  status?: string;
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  sortBy?: string;
}

export function useListings(options: UseListingsOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['/listings', {
      limit: PAGE_SIZE,
      status: options.status,
      categoryId: options.categoryId,
      search: options.search,
      minPrice: options.minPrice,
      maxPrice: options.maxPrice,
      condition: options.condition,
      sortBy: options.sortBy,
    }],

    queryFn: ({ pageParam = 1 }) =>
      getListings({
        page: pageParam,
        limit: PAGE_SIZE,
        ...(options.status && { status: options.status }),
        ...(options.categoryId && { categoryId: options.categoryId }),
        ...(options.search && { search: options.search }),
        ...(options.minPrice != null && { minPrice: options.minPrice }),
        ...(options.maxPrice != null && { maxPrice: options.maxPrice }),
        ...(options.condition && { condition: options.condition }),
        ...(options.sortBy && { sortBy: options.sortBy }),
      }),

    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      const currentPage = lastPage.page;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },

    initialPageParam: 1,
  });
}

// ─── Pagination Buttons Component ────────────────────────────────────────────

interface PaginationButtonsProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

function PaginationButtons({ hasNextPage, isFetchingNextPage, fetchNextPage }: PaginationButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {hasNextPage ? (
        <button
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetchingNextPage ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading more...
            </span>
          ) : (
            'Load More Listings'
          )}
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          You've reached the end of the listings.
        </p>
      )}
    </div>
  );
}

// ─── ListingGrid Component ───────────────────────────────────────────────────

interface ListingGridProps {
  /** When true, automatically loads more as the user scrolls to the sentinel */
  autoLoad?: boolean;

  /** Query filter options passed through to useListings */
  filters?: UseListingsOptions;

  /** Custom empty state message */
  emptyMessage?: string;

  /** Maximum number of items to display (for featured/homepage carousels) */
  maxItems?: number;
}

export function ListingGrid({
  autoLoad = true,
  filters,
  emptyMessage = 'No listings found.',
  maxItems,
}: ListingGridProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useListings(filters);

  // Flatten all pages into a single array
  const allListings: Listing[] = data?.pages.flatMap((page) => page.items) ?? [];

  // Optionally limit the number of items displayed
  const displayListings = maxItems ? allListings.slice(0, maxItems) : allListings;

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoLoad || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );

    const current = sentinelRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [autoLoad, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ─── Loading State ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 py-20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-14 w-14 text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-red-800">
          Failed to load listings
        </h3>
        <p className="mt-1 max-w-sm text-center text-sm text-red-600">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────────

  if (displayListings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-14 w-14 text-gray-400"
        >
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          {emptyMessage}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Check back later or adjust your filters.
        </p>
      </div>
    );
  }

  // ─── Loaded State ──────────────────────────────────────────────────────

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{displayListings.length}</span> listings
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {displayListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {/* Loading more indicator (inline skeletons) */}
      {isFetchingNextPage && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={`loading-${i}`} />
          ))}
        </div>
      )}

      {/* Intersection observer sentinel for auto-load */}
      {autoLoad && hasNextPage && (
        <div ref={sentinelRef} className="h-1" />
      )}

      {/* Manual pagination button */}
      {!autoLoad && (
        <PaginationButtons
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      )}

      {/* End-of-list message when auto-loading and no more pages */}
      {autoLoad && displayListings.length > 0 && !hasNextPage && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-400">
            You've seen all available listings.
          </p>
        </div>
      )}
    </div>
  );
}

export default ListingGrid;