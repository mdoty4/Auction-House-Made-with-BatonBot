import { prisma } from '../prisma';
import { checkoutSchema } from '../utils/schemas';

export async function createMockOrderService(buyerId: string, data: any) {
  const validated = checkoutSchema.parse(data);

  let total = 0;
  const orderItems: { listingId: string; quantity: number; priceAtPurchase: number }[] = [];

  for (const item of validated.items) {
    const listing = await prisma.listing.findUnique({
      where: { id: item.listingId },
    });

    if (!listing) {
      throw new Error(`Listing ${item.listingId} not found`);
    }

    const price = Number(listing.currentBid || listing.startPrice);
    total += price * item.quantity;
    orderItems.push({
      listingId: item.listingId,
      quantity: item.quantity,
      priceAtPurchase: price,
    });
  }

  const order = await prisma.order.create({
    data: {
      buyerId,
      totalAmount: total,
      paymentStatus: 'mock_paid',
      status: 'placed',
      orderItems: {
        create: orderItems,
      },
    },
    include: {
      orderItems: true,
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return order;
}

export async function getOrdersService(buyerId: string) {
  return prisma.order.findMany({
    where: { buyerId },
    include: {
      orderItems: {
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              condition: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getOrderService(buyerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      buyerId,
    },
    include: {
      orderItems: {
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              condition: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  return order;
}