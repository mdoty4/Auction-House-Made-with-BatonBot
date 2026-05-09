'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { Listing, api, PaginatedResult } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';

// ─── Seller metrics type ─────────────────────────────────────────────────────

interface SellerMetrics {
  totalViews: number;
  activeListings: number;
  soldListings: number;
  conversionRate: number;
  avgSellTime: string;
  totalRevenue: number;
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabKey = 'active' | 'sold' | 'unsold' | 'drafts';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'sold', label: 'Sold' },
  { key: 'unsold', label: 'Unsold' },
  { key: 'drafts', label: 'Drafts' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

function getStatusFilter(tab: TabKey): string {
  switch (tab) {
    case 'active': return 'active';
    case 'sold': return 'sold';
    case 'unsold': return 'ended';
    case 'drafts': return 'draft';
  }
}

async function getSellerListings(tab: TabKey): Promise<PaginatedResult<Listing>> {
  return api<PaginatedResult<Listing>>(`/listings/seller?status=${getStatusFilter(tab)}`);
}

async function getSellerMetrics(): Promise<SellerMetrics> {
  return api<SellerMetrics>('/listings/seller/metrics');
}

async function endListing(id: string): Promise<Listing> {
  return api<Listing>(`/listings/${id}/end`, { method: 'POST' });
}

async function relistListing(id: string): Promise<Listing> {
  return api<Listing>(`/listings/${id}/relist`, { method: 'POST' });
}

async function deleteListing(id: string): Promise<{ success: boolean }> {
  return api<{ success: boolean }>(`/listings/${id}`, { method: 'DELETE' });
}

// ─── Metrics Card Component ───────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Listing Table Row ────────────────────────────────────────────────────────

function ListingRow({ listing }: { listing: Listing }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const endMutation = useMutation({
    mutationFn: (id: string) => endListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/listings/seller'] });
    },
  });

  const relistMutation = useMutation({
    mutationFn: (id: string) => relistListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/listings/seller'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/listings/seller'] });
    },
  });

  const handleAction = (action: string, id: string) => {
    setActionLoading(action);
    const run = () => {
      switch (action) {
        case 'end':
          endMutation.mutate(id, { onSettled: () => setActionLoading(null) });
          break;
        case 'relist':
          relistMutation.mutate(id, { onSettled: () => setActionLoading(null) });
          break;
        case 'delete':
          deleteMutation.mutate(id, { onSettled: () => setActionLoading(null) });
          break;
      }
    };
    run();
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    sold: 'bg-blue-100 text-blue-700',
    ended: 'bg-gray-100 text-gray-700',
    draft: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <tr className="border-b transition-colors hover:bg-gray-50">
      {/* Image */}
      <td className="px-4 py-3">
        <div className="h-12 w-12 overflow-hidden rounded-lg border bg-gray-100">
          <img
            src={`/placeholder-${listing.id.slice(0, 6)}.png`}
            alt={listing.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="1.5"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" /%3E%3Ccircle cx="8.5" cy="8.5" r="1.5" /%3E%3Cpath d="M21 15l-5-5L5 21" /%3E%3C/svg%3E';
            }}
          />
        </div>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="max-w-xs">
          <p className="truncate text-sm font-medium text-gray-900">{listing.title}</p>
          <p className="text-xs text-gray-400">
            ${typeof listing.currentBid === 'number' ? listing.currentBid.toFixed(2) : listing.startPrice.toFixed(2)}
          </p>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
            statusColors[listing.status] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {listing.status}
        </span>
      </td>

      {/* Watchers */}
      <td className="px-4 py-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {listing.watchers}
        </div>
      </td>

      {/* Bids */}
      <td className="px-4 py-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
          {listing.currentBid ? 'Has bids' : 'No bids'}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/listing/${listing.id}/edit`)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            Edit
          </button>

          {listing.status === 'active' && (
            <button
              onClick={() => handleAction('end', listing.id)}
              disabled={actionLoading === 'end'}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
            >
              {actionLoading === 'end' ? '...' : 'End'}
            </button>
          )}

          {(listing.status === 'ended' || listing.status === 'sold') && (
            <button
              onClick={() => handleAction('relist', listing.id)}
              disabled={actionLoading === 'relist'}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50"
            >
              {actionLoading === 'relist' ? '...' : 'Relist'}
            </button>
          )}

          <button
            onClick={() => handleAction('delete', listing.id)}
            disabled={actionLoading === 'delete'}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {actionLoading === 'delete' ? '...' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const labels: Record<TabKey, string> = {
    active: 'No active listings',
    sold: 'No sold listings yet',
    unsold: 'No unsold listings',
    drafts: 'No draft listings',
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-gray-300">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-500">{labels[tab]}</h3>
      <p className="mt-1 text-sm text-gray-400">
        {tab === 'active' ? 'Create a new listing to get started.' : 'Your listings will appear here.'}
      </p>
      {tab === 'active' && (
        <button
          onClick={() => (window as any).router?.push?.('/dashboard/listing/new') || window.location.assign('/dashboard/listing/new')}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Create Listing
        </button>
      )}
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const { isAuthenticated } = useAuthStore();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in</h2>
          <p className="mt-2 text-gray-500">You need to be logged in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  // Fetch seller listings for the active tab
  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['/listings/seller', activeTab],
    queryFn: () => getSellerListings(activeTab),
  });

  // Fetch seller metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/listings/seller/metrics'],
    queryFn: getSellerMetrics,
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your listings and track performance
                </p>
              </div>
              <a
                href="/dashboard/listing/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Listing
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Metrics Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricsLoading ? (
              // Skeleton loading state
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-white p-5 shadow-sm animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-3 w-20 rounded bg-gray-200" />
                      <div className="mt-2 h-6 w-16 rounded bg-gray-200" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  }
                  label="Total Views"
                  value={metrics?.totalViews ?? 0}
                  sublabel="All time"
                />
                <MetricCard
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  }
                  label="Active Listings"
                  value={metrics?.activeListings ?? 0}
                  sublabel="Currently selling"
                />
                <MetricCard
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  }
                  label="Conversion Rate"
                  value={`${metrics?.conversionRate ?? 0}%`}
                  sublabel="Sold / Ended"
                />
                <MetricCard
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  }
                  label="Avg Sell Time"
                  value={metrics?.avgSellTime ?? 'N/A'}
                  sublabel="From listing to sale"
                />
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6" aria-label="Tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'active' && metrics && metrics.activeListings > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {metrics.activeListings}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Listings Table */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {listingsLoading ? (
              // Skeleton table rows
              <div className="p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="mb-4 flex items-center gap-4 animate-pulse">
                    <div className="h-12 w-12 rounded-lg bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 w-48 rounded bg-gray-200" />
                      <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-gray-200" />
                    <div className="h-4 w-12 rounded bg-gray-200" />
                    <div className="h-4 w-12 rounded bg-gray-200" />
                    <div className="flex gap-2">
                      <div className="h-7 w-14 rounded bg-gray-200" />
                      <div className="h-7 w-14 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listingsData && listingsData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Image</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Watchers</th>
                      <th className="px-4 py-3">Bids</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {listingsData.items.map((listing) => (
                      <ListingRow key={listing.id} listing={listing} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState tab={activeTab} />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}