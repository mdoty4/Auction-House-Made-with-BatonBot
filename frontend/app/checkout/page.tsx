'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { getCart, createOrder, clearCart } from '@/lib/api';
import { checkoutSchema, type CheckoutFormData } from '@/lib/formSchemas';

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

function getItemPrice(listing: { priceType: string; buyNowPrice: number | null; startPrice: number; currentBid: number | null }): number {
  if (listing.priceType === 'fixed') {
    return toNumber(listing.buyNowPrice) || toNumber(listing.startPrice);
  }
  if (listing.priceType === 'auction') {
    return toNumber(listing.currentBid) || toNumber(listing.startPrice);
  }
  return toNumber(listing.buyNowPrice) || toNumber(listing.startPrice);
}

// ─── Payment method definitions ──────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    value: 'test_card' as const,
    label: 'Test Credit Card',
    description: 'Simulated card ending in 4242 (test mode)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    value: 'simulated_wallet' as const,
    label: 'Simulated Wallet',
    description: 'Digital wallet balance: $250.00 (mock)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <path d="M21 12V7H5a2 2 0 010-4h14v4" />
        <path d="M3 5v14a2 2 0 002 2h16v-5" />
        <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
      </svg>
    ),
  },
  {
    value: 'platform_credit' as const,
    label: 'Platform Credit',
    description: 'Account credits: $75.50 (mock)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 rounded bg-gray-200 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
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

// ─── Empty / No Cart ──────────────────────────────────────────────────────────

function EmptyCheckoutState() {
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
        <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.29 4.59A2 2 0 006.96 20h14.08M12 17v2m-7-4h10" />
      </svg>
      <h2 className="text-2xl font-semibold text-gray-900">Nothing to check out</h2>
      <p className="mt-2 text-gray-500">Your cart is empty. Add some items before checking out.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
        Browse Items
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Fetch cart
  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: () => getCart(),
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (payload: { items: { listingId: string; quantity: number }[] }) =>
      createOrder(payload),
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: () => clearCart(),
  });

  // react-hook-form + zod
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: undefined as any,
    },
  });

  const selectedPayment = watch('paymentMethod');

  // Active cart items
  const activeItems = cart?.cartItems.filter((item) => !item.savedForLater) ?? [];

  // Calculate totals
  const { subtotal, shipping, tax, total } = (() => {
    const sub = activeItems.reduce((sum, item) => sum + getItemPrice(item.listing) * item.quantity, 0);
    const ship = sub > 0 ? (sub >= 50 ? 0 : 9.99) : 0;
    const tx = sub * 0.08;
    return { subtotal: sub, shipping: ship, tax: tx, total: sub + ship + tx };
  })();

  // On submit
  const onSubmit = async (formData: CheckoutFormData) => {
    if (activeItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setSubmitting(true);

    try {
      // Build order payload matching backend checkoutSchema: { items: [{ listingId, quantity }] }
      const payload = {
        items: activeItems.map((item) => ({
          listingId: item.listing.id,
          quantity: item.quantity,
        })),
      };

      // Create order
      await createOrderMutation.mutateAsync(payload);

      // Clear cart after successful order
      await clearCartMutation.mutateAsync();

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success('Order placed successfully! 🎉', {
        description: 'Your test transaction has been completed.',
      });

      // Redirect to orders page
      router.push('/orders');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      toast.error('Order failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading
  if (isLoading) return <CheckoutSkeleton />;

  // Error
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
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

  // Empty cart
  if (!cart || activeItems.length === 0) {
    return <EmptyCheckoutState />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Page header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/cart"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Back to Cart
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      </div>

      {/* Test mode banner */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">Test Mode</p>
          <p className="text-xs text-amber-600 mt-0.5">
            This is a simulated checkout. No real payment will be processed. All transactions are for testing purposes only.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left column: Shipping + Payment */}
          <div className="lg:col-span-2 space-y-6">

            {/* ─── Shipping Address Form ─── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400">
                  <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping Address
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('fullName')}
                    type="text"
                    id="fullName"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Address Line 1 */}
                <div>
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('addressLine1')}
                    type="text"
                    id="addressLine1"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-xs text-red-600">{errors.addressLine1.message}</p>
                  )}
                </div>

                {/* Address Line 2 */}
                <div>
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <input
                    {...register('addressLine2')}
                    type="text"
                    id="addressLine2"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Apt, Suite, Unit (optional)"
                  />
                </div>

                {/* City, State, Postal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('city')}
                      type="text"
                      id="city"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="San Francisco"
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State / Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('state')}
                      type="text"
                      id="state"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="CA"
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('postalCode')}
                      type="text"
                      id="postalCode"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="94102"
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-xs text-red-600">{errors.postalCode.message}</p>
                    )}
                  </div>
                </div>

                {/* Country, Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('country')}
                      type="text"
                      id="country"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="United States"
                    />
                    {errors.country && (
                      <p className="mt-1 text-xs text-red-600">{errors.country.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('phone')}
                      type="tel"
                      id="phone"
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Mock Payment Selector ─── */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gray-400">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Payment Method
              </h2>

              {errors.paymentMethod && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{errors.paymentMethod.message}</p>
                </div>
              )}

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      selectedPayment === method.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={method.value}
                      {...register('paymentMethod')}
                      className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`flex-shrink-0 ${selectedPayment === method.value ? 'text-blue-600' : 'text-gray-400'}`}>
                        {method.icon}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">{method.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Order Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {activeItems.map((item) => {
                  const price = getItemPrice(item.listing);
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 line-clamp-1 flex-1 mr-4">
                        {item.listing.title}
                        {item.quantity > 1 && (
                          <span className="text-gray-400"> ×{item.quantity}</span>
                        )}
                      </span>
                      <span className="font-medium text-gray-900 flex-shrink-0">
                        {formatCurrency(price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shipping > 0 ? formatCurrency(shipping) : 'Free'}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                type="submit"
                disabled={submitting || createOrderMutation.isPending}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting || createOrderMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Confirm Test Transaction
                  </>
                )}
              </button>

              <p className="mt-3 text-xs text-gray-400 text-center">
                This is a test environment. No real charges will occur.
              </p>

              {/* Security badge */}
              <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Secure test checkout
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}