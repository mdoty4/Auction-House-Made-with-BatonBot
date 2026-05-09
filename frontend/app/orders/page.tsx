'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getOrders, Order as OrderType } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'placed':
      return 'bg-blue-100 text-blue-700';
    case 'shipped':
      return 'bg-purple-100 text-purple-700';
    case 'delivered':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function paymentBadgeClass(paymentStatus: string): string {
  switch (paymentStatus.toLowerCase()) {
    case 'mock_paid':
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'refunded':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex justify-between">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
              <div className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="h-4 w-full rounded bg-gray-200 animate-pulse" />
              ))}
            </div>
            <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyOrdersState() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto mb-6 h-24 w-24 text-gray-300"
      >
        <path d="M16 16h6" />
        <path d="M19 13v6" />
        <path d="M21 10V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h5" />
        <path d="M8 10h4" />
        <path d="M9 7v6" />
      </svg>
      <h2 className="text-2xl font-semibold text-gray-900">No orders yet</h2>
      <p className="mt-2 text-gray-500">
        When you place orders, they'll appear here.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Start Shopping
      </Link>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: OrderType }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Order #{order.id.slice(-8).toUpperCase()}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentBadgeClass(order.paymentStatus)}`}>
            {order.paymentStatus.replace('_', ' ')}
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.orderItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                {item.quantity}×
              </span>
              <span className="text-gray-700">
                {item.listing?.title || `Listing ${item.listingId.slice(-6)}`}
              </span>
            </div>
            <span className="font-medium text-gray-900">
              {formatCurrency(item.priceAtPurchase * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {order.orderItems.length} {order.orderItems.length === 1 ? 'item' : 'items'}
        </span>
        <span className="text-base font-bold text-gray-900">
          {formatCurrency(order.totalAmount)}
        </span>
      </div>
    </div>
  );
}

// ─── Success Banner (shown on first visit after checkout) ─────────────────────

function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
      <div className="flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-green-600">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-green-800">Order Placed Successfully!</h3>
        <p className="text-xs text-green-600 mt-0.5">
          Your test transaction has been completed. This is a simulated order in test mode.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [showSuccess, setShowSuccess] = useState(true);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => getOrders(),
  });

  // Loading
  if (isLoading) return <OrdersSkeleton />;

  // Error
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mx-auto mb-4 h-16 w-16 text-gray-300"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">Error Loading Orders</h2>
        <p className="mt-2 text-gray-500">{error.message}</p>
      </div>
    );
  }

  // Empty
  if (!orders || orders.length === 0) {
    return <EmptyOrdersState />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          My Orders
          <span className="ml-2 text-base font-normal text-gray-500">
            ({orders.length})
          </span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your purchases and order history
        </p>
      </div>

      {/* Success banner */}
      {showSuccess && <SuccessBanner onDismiss={() => setShowSuccess(false)} />}

      {/* Test mode note */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs text-amber-700">
          <strong>Test Mode:</strong> All orders shown here are simulated. No real payments were processed.
        </p>
      </div>

      {/* Orders list */}
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Back to shopping */}
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}