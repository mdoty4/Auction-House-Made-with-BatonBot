'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCart,
  updateCartItem,
  removeCartItem,
  saveForLater,
  restoreFromSaved,
  CartItem as CartItemType,
} from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCallback, useMemo } from 'react';

// ─── Price helpers ────────────────────────────────────────────────────────────

function toNumber(val: number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function getItemPrice(item: CartItemType): number {
  const { listing } = item;
  // For buy-now / fixed price items use buyNowPrice or startPrice
  if (listing.priceType === 'fixed') {
    return toNumber(listing.buyNowPrice) || toNumber(listing.startPrice);
  }
  // For auction items use currentBid or startPrice
  if (listing.priceType === 'auction') {
    return toNumber(listing.currentBid) || toNumber(listing.startPrice);
  }
  // Hybrid: prefer buyNowPrice
  return toNumber(listing.buyNowPrice) || toNumber(listing.startPrice);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items column */}
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-gray-200 p-4">
              <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
                  <div className="h-8 w-24 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
              <div className="h-8 w-20 rounded bg-gray-200 animate-pulse self-start" />
            </div>
          ))}
        </div>
        {/* Summary column */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-12 w-full rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty cart ───────────────────────────────────────────────────────────────

function EmptyCart({ hasSavedItems, savedCount }: { hasSavedItems: boolean; savedCount: number }) {
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
        <circle cx="9" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M2 2h4l2.68 12.34a2 2 0 002 1.66h8.72a2 2 0 002-1.66L20 6H6" />
      </svg>
      <h2 className="text-2xl font-semibold text-gray-900">Your cart is empty</h2>
      <p className="mt-2 text-gray-500">
        Looks like you haven't added anything to your cart yet.
      </p>
      {hasSavedItems && (
        <p className="mt-1 text-sm text-blue-600">
          You have {savedCount} item{savedCount > 1 ? 's' : ''} saved for later.
        </p>
      )}
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Continue Shopping
      </Link>
    </div>
  );
}

// ─── Cart item row ────────────────────────────────────────────────────────────

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  onSaveForLater,
}: {
  item: CartItemType;
  onUpdateQuantity: (listingId: string, quantity: number) => void;
  onRemove: (listingId: string) => void;
  onSaveForLater: (listingId: string) => void;
}) {
  const price = getItemPrice(item);
  const lineTotal = price * item.quantity;
  const isUnavailable = item.listing.status !== 'active';

  return (
    <div
      className={`flex gap-4 rounded-xl border p-4 transition-colors ${
        isUnavailable
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {/* Thumbnail placeholder */}
      <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-10 w-10 text-gray-300"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>

      {/* Item details */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/listing/${item.listing.id}`}
            className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
          >
            {item.listing.title}
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                item.listing.condition.toLowerCase().includes('new')
                  ? 'bg-green-100 text-green-700'
                  : item.listing.condition.toLowerCase().includes('refurb')
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {item.listing.condition}
            </span>
            {item.listing.priceType !== 'fixed' && (
              <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                {item.listing.priceType}
              </span>
            )}
            {isUnavailable && (
              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Unavailable
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4">
          {/* Quantity controls */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-300">
            <button
              onClick={() => onUpdateQuantity(item.listing.id, Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1 || isUnavailable}
              className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-lg"
              aria-label="Decrease quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-medium text-gray-900" aria-label={`Quantity: ${item.quantity}`}>
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.listing.id, Math.min(99, item.quantity + 1))}
              disabled={isUnavailable}
              className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-lg"
              aria-label="Increase quantity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>

          {/* Line total */}
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(lineTotal)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        {!isUnavailable && (
          <button
            onClick={() => onSaveForLater(item.listing.id)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors text-right"
          >
            Save for later
          </button>
        )}
        <button
          onClick={() => onRemove(item.listing.id)}
          className="text-xs text-red-600 hover:text-red-800 hover:underline transition-colors text-right"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ─── Saved for later item row ─────────────────────────────────────────────────

function SavedItemRow({
  item,
  onRestore,
  onRemove,
}: {
  item: CartItemType;
  onRestore: (listingId: string) => void;
  onRemove: (listingId: string) => void;
}) {
  const price = getItemPrice(item);

  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 opacity-80">
      {/* Thumbnail placeholder */}
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-8 w-8 text-gray-400"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link
            href={`/listing/${item.listing.id}`}
            className="line-clamp-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
          >
            {item.listing.title}
          </Link>
          <span className="text-sm text-gray-500">{formatCurrency(price)}</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onRestore(item.listing.id)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Move to cart
          </button>
          <button
            onClick={() => onRemove(item.listing.id)}
            className="text-xs text-red-600 hover:text-red-800 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order summary ────────────────────────────────────────────────────────────

function OrderSummary({
  subtotal,
  shipping,
  tax,
  total,
}: {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 sticky top-24">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Shipping</span>
          <span>{shipping > 0 ? formatCurrency(shipping) : 'Calculated at checkout'}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Estimated tax</span>
          <span>{formatCurrency(tax)}</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Proceed to Checkout CTA */}
      <Link
        href="/checkout"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Proceed to Checkout
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>

      <p className="mt-3 text-xs text-gray-400 text-center">
        You won't be charged yet
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CartPage() {
  const queryClient = useQueryClient();

  // Fetch cart data
  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => getCart(),
    refetchOnWindowFocus: true,
  });

  // Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: ({ listingId, quantity }: { listingId: string; quantity: number }) =>
      updateCartItem({ listingId, quantity }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  const removeItemMutation = useMutation({
    mutationFn: (listingId: string) => removeCartItem(listingId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onSuccess: () => {
      toast.success('Item removed from cart');
    },
  });

  const saveForLaterMutation = useMutation({
    mutationFn: (listingId: string) => saveForLater(listingId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onSuccess: () => {
      toast.success('Item saved for later');
    },
  });

  const restoreItemMutation = useMutation({
    mutationFn: (listingId: string) => restoreFromSaved(listingId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onSuccess: () => {
      toast.success('Item moved back to cart');
    },
  });

  // Separate active and saved items
  const activeItems = useMemo(
    () => cart?.cartItems.filter((item) => !item.savedForLater) ?? [],
    [cart],
  );

  const savedItems = useMemo(
    () => cart?.cartItems.filter((item) => item.savedForLater) ?? [],
    [cart],
  );

  // Calculate totals from active items only
  const { subtotal, shipping, tax, total } = useMemo(() => {
    const sub = activeItems.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
    // Shipping placeholder: $9.99 flat if items exist, free over $50
    const ship = sub > 0 ? (sub >= 50 ? 0 : 9.99) : 0;
    // Tax estimate at 8%
    const tx = sub * 0.08;
    return {
      subtotal: sub,
      shipping: ship,
      tax: tx,
      total: sub + ship + tx,
    };
  }, [activeItems]);

  // Handlers
  const handleUpdateQuantity = useCallback(
    (listingId: string, quantity: number) => {
      updateQuantityMutation.mutate({ listingId, quantity });
    },
    [updateQuantityMutation],
  );

  const handleRemove = useCallback(
    (listingId: string) => {
      removeItemMutation.mutate(listingId);
    },
    [removeItemMutation],
  );

  const handleSaveForLater = useCallback(
    (listingId: string) => {
      saveForLaterMutation.mutate(listingId);
    },
    [saveForLaterMutation],
  );

  const handleRestore = useCallback(
    (listingId: string) => {
      restoreItemMutation.mutate(listingId);
    },
    [restoreItemMutation],
  );

  // Loading state
  if (isLoading) return <CartSkeleton />;

  // Error state
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
        <h2 className="text-xl font-semibold text-gray-900">Error Loading Cart</h2>
        <p className="mt-2 text-gray-500">{error.message}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['cart'] })}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Empty or no cart
  if (!cart || activeItems.length === 0) {
    return <EmptyCart hasSavedItems={savedItems.length > 0} savedCount={savedItems.length} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Shopping Cart
          <span className="ml-2 text-base font-normal text-gray-500">
            ({activeItems.length} {activeItems.length === 1 ? 'item' : 'items'})
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active items */}
          <div className="space-y-4">
            {activeItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
                onSaveForLater={handleSaveForLater}
              />
            ))}
          </div>

          {/* Saved for later section */}
          {savedItems.length > 0 && (
            <div className="pt-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Saved for Later
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({savedItems.length})
                </span>
              </h2>
              <div className="space-y-3">
                {savedItems.map((item) => (
                  <SavedItemRow
                    key={item.id}
                    item={item}
                    onRestore={handleRestore}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order summary column */}
        <div className="lg:col-span-1">
          <OrderSummary
            subtotal={subtotal}
            shipping={shipping}
            tax={tax}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}