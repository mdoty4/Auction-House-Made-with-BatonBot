import { prisma } from '../prisma';
import { placeBidSchema } from '../utils/schemas';

export async function placeBidService(bidderId: string, data: any) {
  const validated = placeBidSchema.parse(data);

  const listing = await prisma.listing.findUnique({
    where: { id: validated.listingId },
  });

  if (!listing) throw new Error('Listing not found');

  const currentBidValue = listing.currentBid ? Number(listing.currentBid) : 0;
  if (validated.amount <= currentBidValue) throw new Error('Bid too low');

  const newBid = await prisma.bid.create({
    data: {
      listingId: validated.listingId,
      bidderId,
      amount: validated.amount,
      maxProxyBid: validated.maxProxyBid || validated.amount,
    },
  });

  await prisma.listing.update({
    where: { id: validated.listingId },
    data: { currentBid: validated.amount },
  });

  return newBid;
}

export async function getBidHistoryService(listingId: string) {
  const bids = await prisma.bid.findMany({
    where: { listingId },
    orderBy: { createdAt: 'desc' },
    include: {
      bidder: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return bids;
}
