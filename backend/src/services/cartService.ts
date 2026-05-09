import { prisma } from '../prisma';
import { addToCartSchema, updateCartItemSchema } from '../utils/schemas';

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function addToCartService(userId: string, data: any) {
  const validated = addToCartSchema.parse(data);
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.upsert({
    where: {
      cartId_listingId: {
        cartId: cart.id,
        listingId: validated.listingId,
      },
    },
    create: {
      cartId: cart.id,
      listingId: validated.listingId,
      quantity: validated.quantity,
      savedForLater: false,
    },
    update: {
      quantity: validated.quantity,
      savedForLater: false,
    },
  });
}

export async function updateCartItemService(userId: string, data: any) {
  const validated = updateCartItemSchema.parse(data);
  const cart = await getOrCreateCart(userId);

  return prisma.cartItem.update({
    where: {
      cartId_listingId: {
        cartId: cart.id,
        listingId: validated.listingId,
      },
    },
    data: {
      quantity: validated.quantity,
    },
  });
}

export async function removeCartItemService(userId: string, listingId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      listingId,
    },
  });
  return { success: true, listingId };
}

export async function saveForLaterService(userId: string, listingId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.updateMany({
    where: {
      cartId: cart.id,
      listingId,
    },
    data: {
      savedForLater: true,
    },
  });
  return { success: true, listingId };
}

export async function moveToCartService(userId: string, listingId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.updateMany({
    where: {
      cartId: cart.id,
      listingId,
    },
    data: {
      savedForLater: false,
    },
  });
  return { success: true, listingId };
}

export async function clearCartService(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
  return { success: true };
}

export async function getCartService(userId: string) {
  const cart = await getOrCreateCart(userId);

  return prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      cartItems: {
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              startPrice: true,
              buyNowPrice: true,
              currentBid: true,
              priceType: true,
              condition: true,
              status: true,
            },
          },
        },
      },
    },
  });
}