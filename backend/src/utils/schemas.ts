import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function validate<T extends z.ZodType>(schema: T) {
  return (req: { body: unknown }): z.infer<T> => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    return result.data;
  };
}

export const createListingSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  condition: z.enum([
    'new', 'used', 'refurbished',
    'new_with_tags', 'new_without_tags', 'new_refurbished',
    'very_good', 'good', 'fair',
  ]),
  priceType: z.enum(['auction', 'fixed', 'hybrid']),
  startPrice: z.number().positive(),
  buyNowPrice: z.number().positive().optional(),
  endsAt: z.string().datetime().optional(),
});

export const filterListingsSchema = z.object({
  category: z.string().optional(),
  condition: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'ending_soon']).default('newest'),
});

export const placeBidSchema = z.object({
  listingId: z.string(),
  amount: z.number().positive(),
  maxProxyBid: z.number().positive().optional(),
});

export const addToCartSchema = z.object({
  listingId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export const updateCartItemSchema = z.object({
  listingId: z.string(),
  quantity: z.number().int().positive(),
});

export const checkoutItemSchema = z.object({
  listingId: z.string(),
  quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
});