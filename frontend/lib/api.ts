/**
 * Frontend API Client
 *
 * Typed fetch wrapper with automatic auth header injection.
 * Uses NEXT_PUBLIC_API_URL from environment for the base URL.
 */

// ─── Response types matching backend shape ───────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ApiError {
  error: string;
}

// ─── Domain types (mirroring Prisma models) ──────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  condition: string;
  priceType: string;
  startPrice: number;
  buyNowPrice: number | null;
  currentBid: number | null;
  watchers: number;
  status: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  maxProxyBid: number | null;
  createdAt: string;
  isWinning: boolean;
}

export interface OrderItemListing {
  id: string;
  title: string;
  condition: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  listingId: string;
  quantity: number;
  priceAtPurchase: number;
  listing?: OrderItemListing;
}

export interface Order {
  id: string;
  buyerId: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentCategoryId: string | null;
  childCategories?: Category[];
  listingCount?: number;
  _count?: {
    listings: number;
  };
}

// ─── Cart types ──────────────────────────────────────────────────────────────

export interface CartListing {
  id: string;
  title: string;
  startPrice: number;
  buyNowPrice: number | null;
  currentBid: number | null;
  priceType: string;
  condition: string;
  status: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  listingId: string;
  quantity: number;
  savedForLater: boolean;
  listing: CartListing;
}

export interface Cart {
  id: string;
  userId: string;
  cartItems: CartItem[];
}

export interface AddToCartPayload {
  listingId: string;
  quantity?: number;
}

export interface UpdateCartItemPayload {
  listingId: string;
  quantity: number;
}

// ─── Request payload types ───────────────────────────────────────────────────

export interface PlaceBidPayload {
  listingId: string;
  amount: number;
  maxProxyBid?: number;
}

export interface CheckoutItem {
  listingId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  items: CheckoutItem[];
}

export interface CreateListingPayload {
  title: string;
  description?: string;
  categoryId?: string;
  condition: string;
  priceType: string;
  startPrice: number;
  buyNowPrice?: number;
  endsAt?: string;
}

// ─── Paginated response wrapper ─────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Base API URL ────────────────────────────────────────────────────────────

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api';

// ─── Core typed fetch wrapper ────────────────────────────────────────────────

/**
 * Generic API client that injects the auth token from localStorage
 * and parses the backend's standard { success, data } envelope.
 *
 * @param endpoint - API path (e.g. '/listings', '/bids')
 * @param options - Standard fetch RequestInit options
 * @returns The `data` field from the backend response, typed as T
 */
export async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }

  const envelope: ApiResponse<T> = await res.json();
  return envelope.data;
}

// ─── Typed wrapper functions ─────────────────────────────────────────────────

/**
 * Fetch a list of users (for admin / lookup purposes).
 * GET /auth/me returns the current user.
 */
export async function getCurrentUser(): Promise<User> {
  return api<User>('/auth/me');
}

/**
 * Fetch paginated listings with optional query filters.
 * GET /listings?page=1&limit=20&status=active
 */
export async function getListings(
  params?: Record<string, string | number>
): Promise<PaginatedResult<Listing>> {
  const query = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  return api<PaginatedResult<Listing>>(`/listings${query}`);
}

/**
 * Fetch a single listing by ID.
 * GET /listings/:id
 */
export async function getListingById(id: string): Promise<Listing> {
  return api<Listing>(`/listings/${id}`);
}

/**
 * Create a new listing (requires auth).
 * POST /listings
 */
export async function createListing(payload: CreateListingPayload): Promise<Listing> {
  return api<Listing>('/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Place a bid on a listing (requires auth).
 * POST /bids
 */
export async function placeBid(payload: PlaceBidPayload): Promise<Bid> {
  return api<Bid>('/bids', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch bid history for a listing.
 * GET /bids/:listingId/history
 */
export async function getBidHistory(listingId: string): Promise<Bid[]> {
  return api<Bid[]>(`/bids/${listingId}/history`);
}

/**
 * Create a mock order (requires auth).
 * POST /orders
 */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return api<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch orders for the current user (requires auth).
 * GET /orders
 */
export async function getOrders(): Promise<Order[]> {
  return api<Order[]>('/orders');
}

/**
 * Fetch all top-level categories.
 * GET /categories
 */
export async function getCategories(): Promise<Category[]> {
  return api<Category[]>('/categories');
}

/**
 * Fetch all categories including nested ones.
 * GET /categories/all
 */
export async function getAllCategories(): Promise<Category[]> {
  return api<Category[]>('/categories/all');
}

// ─── Cart API functions ───────────────────────────────────────────────────────

/**
 * Fetch the current user's cart with listing details.
 * GET /cart
 */
export async function getCart(): Promise<Cart> {
  return api<Cart>('/cart');
}

/**
 * Add an item to the cart.
 * POST /cart/items
 */
export async function addToCart(payload: AddToCartPayload): Promise<CartItem> {
  return api<CartItem>('/cart/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update a cart item's quantity.
 * PUT /cart/items
 */
export async function updateCartItem(payload: UpdateCartItemPayload): Promise<CartItem> {
  return api<CartItem>('/cart/items', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Remove a single item from the cart.
 * DELETE /cart/items/:listingId
 */
export async function removeCartItem(listingId: string): Promise<{ success: boolean; listingId: string }> {
  return api<{ success: boolean; listingId: string }>(`/cart/items/${listingId}`, {
    method: 'DELETE',
  });
}

/**
 * Save an item for later (mark as savedForLater).
 * POST /cart/items/:listingId/save
 */
export async function saveForLater(listingId: string): Promise<{ success: boolean; listingId: string }> {
  return api<{ success: boolean; listingId: string }>(`/cart/items/${listingId}/save`, {
    method: 'POST',
  });
}

/**
 * Restore a saved-for-later item back to the cart.
 * POST /cart/saved/:listingId/restore
 */
export async function restoreFromSaved(listingId: string): Promise<{ success: boolean; listingId: string }> {
  return api<{ success: boolean; listingId: string }>(`/cart/saved/${listingId}/restore`, {
    method: 'POST',
  });
}

/**
 * Clear the entire cart.
 * DELETE /cart/clear
 */
export async function clearCart(): Promise<{ success: boolean }> {
  return api<{ success: boolean }>('/cart/clear', {
    method: 'DELETE',
  });
}
