import { z } from 'zod';

/**
 * Zod validation schemas matching backend schemas.
 * Used with react-hook-form via @hookform/resolvers.
 */

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;

export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().min(7, 'Phone number is required'),
});

export const checkoutSchema = z.object({
  ...shippingAddressSchema.shape,
  paymentMethod: z.enum(['test_card', 'simulated_wallet', 'platform_credit']).optional().refine(
    (val) => val !== undefined,
    { message: 'Please select a payment method' },
  ),
});

export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ─── Listing Creation Wizard Schemas ──────────────────────────────────────────

export const listingStep1Schema = z.object({
  categoryId: z.string().min(1, 'Please select a category'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(80, 'Title must be under 80 characters'),
  subtitle: z.string().max(150, 'Subtitle must be under 150 characters').optional(),
});

export const listingStep2Schema = z.object({
  condition: z.enum(['new_with_tags', 'new_without_tags', 'new_refurbished', 'very_good', 'good', 'fair']),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description must be under 5000 characters'),
  brand: z.string().max(50, 'Brand must be under 50 characters').optional(),
  itemSpecifics: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      value: z.string().min(1, 'Value is required'),
    })
  ).optional(),
});

export const listingStep3Schema = z.object({
  primaryImage: z.string().min(1, 'At least one image is required'),
  additionalImages: z.array(z.string()).optional(),
});

export const listingStep4Schema = z.object({
  priceType: z.enum(['auction', 'fixed', 'hybrid']),
  startPrice: z.number().positive('Start price must be greater than 0').min(0.01),
  buyNowPrice: z.number().positive('Buy It Now price must be greater than 0').optional().or(z.literal(0)),
  auctionDuration: z.enum(['1_day', '3_days', '7_days', '10_days', '30_days']).optional(),
  shippingCost: z.number().min(0).optional(),
  handlingTime: z.number().int().min(1).max(30),
});

export const listingStep5Schema = z.object({
  returnsAccepted: z.boolean(),
  returnWindow: z.enum(['7_days', '14_days', '30_days', '60_days', '90_days']).optional(),
  shippingType: z.enum(['standard', 'express', 'overnight', 'local_pickup']),
  handlesIntl: z.boolean(),
  paymentMethods: z.array(z.string()).min(1, 'Select at least one payment method'),
});

export const createListingFormSchema = z.object({
  ...listingStep1Schema.shape,
  ...listingStep2Schema.shape,
  ...listingStep3Schema.shape,
  ...listingStep4Schema.shape,
  ...listingStep5Schema.shape,
});

export type ListingStep1FormData = z.infer<typeof listingStep1Schema>;
export type ListingStep2FormData = z.infer<typeof listingStep2Schema>;
export type ListingStep3FormData = z.infer<typeof listingStep3Schema>;
export type ListingStep4FormData = z.infer<typeof listingStep4Schema>;
export type ListingStep5FormData = z.infer<typeof listingStep5Schema>;
export type CreateListingFormData = z.infer<typeof createListingFormSchema>;
