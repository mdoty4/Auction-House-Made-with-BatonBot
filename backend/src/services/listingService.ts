import { createListingSchema } from '../utils/schemas';
import { prisma } from '../prisma';

export async function createListingService(sellerId: string, data: any) {
  const validated = createListingSchema.parse(data);
  return prisma.listing.create({
    data: {
      ...validated,
      sellerId,
      currentBid: validated.startPrice,
    },
  });
}

export async function getListingByIdService(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getFilteredListingsService(filters: any, page: number = 1, limit: number = 20) {
  const where: any = {};

  if (filters.category) where.categoryId = filters.category;
  if (filters.condition) where.condition = filters.condition;
  if (filters.minPrice) where.startPrice = { gte: filters.minPrice };
  if (filters.maxPrice) where.startPrice = { lte: filters.maxPrice };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Seller Dashboard Services ───────────────────────────────────────────────

/**
 * Fetch listings owned by a specific seller, filtered by status.
 */
export async function getSellerListingsService(
  sellerId: string,
  status: string,
  page: number = 1,
  limit: number = 20
) {
  const where: any = { sellerId };

  // Map frontend tab key to DB status string (schema uses lowercase strings)
  const statusMap: Record<string, string> = {
    active: 'active',
    sold: 'sold',
    unsold: 'ended',
    ended: 'ended',
    draft: 'draft',
  };

  if (statusMap[status]) {
    where.status = statusMap[status];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Return seller performance metrics.
 */
export async function getSellerMetricsService(sellerId: string) {
  const now = new Date();

  // Get all seller listings
  const allListings = await prisma.listing.findMany({
    where: { sellerId },
    select: {
      status: true,
      watchers: true,
      createdAt: true,
      updatedAt: true,
      buyNowPrice: true,
      currentBid: true,
    },
  });

  const activeListings = allListings.filter((l) => l.status === 'active').length;
  const soldListings = allListings.filter((l) => l.status === 'sold').length;
  const endedListings = allListings.filter((l) => l.status === 'ended').length;
  const totalFinished = soldListings + endedListings;

  // Total views: sum of watchers as a proxy (can be enhanced with a views table later)
  const totalViews = allListings.reduce((sum, l) => sum + l.watchers, 0);

  // Conversion rate: sold / total finished listings
  const conversionRate = totalFinished > 0 ? Math.round((soldListings / totalFinished) * 100) : 0;

  // Average sell time: average of (updatedAt - createdAt) for sold listings
  const soldItems = allListings.filter((l) => l.status === 'sold');
  let avgSellTime = 'N/A';
  if (soldItems.length > 0) {
    const totalMs = soldItems.reduce((sum, l) => {
      return sum + new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime();
    }, 0);
    const avgMs = totalMs / soldItems.length;
    const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
    if (avgDays < 1) {
      const avgHours = Math.round(avgMs / (1000 * 60 * 60));
      avgSellTime = `${avgHours}h`;
    } else {
      avgSellTime = `${avgDays}d`;
    }
  }

  return {
    totalViews,
    activeListings,
    soldListings,
    conversionRate,
    avgSellTime,
    totalRevenue: 0, // Placeholder: will be calculated from orders once integrated
  };
}

/**
 * Update an existing listing (seller only).
 */
export async function updateListingService(sellerId: string, listingId: string, data: any) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Unauthorized: you can only edit your own listings');
  }

  // Only allow edits on DRAFT or ACTIVE listings
  if (listing.status === 'sold') {
    throw new Error('Cannot edit a sold listing');
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: {
      title: data.title ?? listing.title,
      description: data.description ?? listing.description,
      categoryId: data.categoryId ?? listing.categoryId,
      condition: data.condition ?? listing.condition,
      startPrice: data.startPrice ?? listing.startPrice,
      buyNowPrice: data.buyNowPrice ?? listing.buyNowPrice,
      endsAt: data.endsAt ?? listing.endsAt,
    },
  });

  return updated;
}

/**
 * Force-end an active listing (seller only).
 */
export async function endListingService(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Unauthorized: you can only end your own listings');
  }

  if (listing.status !== 'active') {
    throw new Error('Listing is not active');
  }

  // If there's a winning bid, mark as sold, otherwise ended
  const hasBids = listing.currentBid && listing.currentBid > listing.startPrice;
  const newStatus = hasBids ? 'sold' : 'ended';

  return prisma.listing.update({
    where: { id: listingId },
    data: { status: newStatus },
  });
}

/**
 * Relist a sold/ended listing (seller only).
 * Creates a fresh ACTIVE listing with the same details.
 */
export async function relistListingService(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Unauthorized: you can only relist your own listings');
  }

  if (listing.status !== 'sold' && listing.status !== 'ended') {
    throw new Error('Can only relist sold or ended listings');
  }

  // Create a new active listing based on the original
  return prisma.listing.create({
    data: {
      sellerId,
      title: listing.title,
      description: listing.description,
      categoryId: listing.categoryId,
      condition: listing.condition,
      priceType: listing.priceType,
      startPrice: listing.startPrice,
      buyNowPrice: listing.buyNowPrice,
      currentBid: listing.startPrice,
      status: 'active',
      watchers: 0,
      endsAt: listing.endsAt
        ? new Date(new Date().getTime() + (new Date(listing.endsAt).getTime() - new Date(listing.createdAt).getTime()))
        : null,
    },
  });
}

/**
 * Delete a listing permanently (seller only).
 */
export async function deleteListingService(sellerId: string, listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.sellerId !== sellerId) {
    throw new Error('Unauthorized: you can only delete your own listings');
  }

  // Don't allow deletion of sold listings (keep for order history)
  if (listing.status === 'sold') {
    throw new Error('Cannot delete a sold listing');
  }

  await prisma.listing.delete({
    where: { id: listingId },
  });

  return { success: true };
}
