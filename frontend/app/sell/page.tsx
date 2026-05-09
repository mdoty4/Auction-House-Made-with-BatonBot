'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useFormContext, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { api, createListing, Category } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  createListingFormSchema,
  listingStep1Schema,
  listingStep2Schema,
  listingStep3Schema,
  listingStep4Schema,
  listingStep5Schema,
  CreateListingFormData,
} from '@/lib/formSchemas';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { key: 'category', label: 'Category & Title' },
  { key: 'condition', label: 'Condition & Specs' },
  { key: 'media', label: 'Photos' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'policies', label: 'Policies' },
  { key: 'review', label: 'Review' },
] as const;

const CONDITION_OPTIONS = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'new_without_tags', label: 'New without tags' },
  { value: 'new_refurbished', label: 'New refurbished' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
] as const;

const AUCTION_DURATION_OPTIONS = [
  { value: '1_day', label: '1 Day' },
  { value: '3_days', label: '3 Days' },
  { value: '7_days', label: '7 Days' },
  { value: '10_days', label: '10 Days' },
  { value: '30_days', label: '30 Days' },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'credit_card', label: 'Credit/Debit Card' },
  { value: 'apple_pay', label: 'Apple Pay' },
  { value: 'google_pay', label: 'Google Pay' },
] as const;

const DRAFT_KEY = 'listing_draft';

// ─── Draft helpers ────────────────────────────────────────────────────────────

function saveDraft(data: CreateListingFormData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function loadDraft(): Partial<CreateListingFormData> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEY);
}

// ─── Step indicator component ─────────────────────────────────────────────────

function StepIndicator({ currentStep, stepKey }: { currentStep: number; stepKey: string }) {
  return (
    <div className="mb-8">
      {/* Desktop progress bar */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.key === stepKey;
          const isCompleted = idx < currentStep;
          const isUpcoming = idx > currentStep;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-0">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : isActive
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-5 w-5">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1">
                  <div
                    className={`h-full w-full rounded transition-colors ${
                      idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {STEPS.find((s) => s.key === stepKey)?.label}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Category & Title ────────────────────────────────────────────────

function Step1CategoryTitle() {
  const { register, control, formState: { errors } } = useFormContext<CreateListingFormData>();
  const { data: categories } = useQuery({
    queryKey: ['/categories'],
    queryFn: () => api<Category[]>('/categories'),
  });

  const flatCategories = categories?.flatMap((cat) => [
    { id: cat.id, name: cat.name },
    ...(cat.childCategories?.map((child) => ({ id: child.id, name: `${cat.name} > ${child.name}` })) ?? []),
  ]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Category & Title</h2>
        <p className="mt-1 text-sm text-gray-500">Select a category and write a compelling title for your listing.</p>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="categoryId"
          {...register('categoryId')}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          <option value="">Select a category...</option>
          {flatCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          placeholder="e.g. Vintage Leica M3 Camera - Excellent Condition"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.title && (
            <p className="text-sm text-red-600">{errors.title.message}</p>
          )}
          <p className="ml-auto text-xs text-gray-400">5-80 characters</p>
        </div>
      </div>

      {/* Subtitle */}
      <div>
        <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700">
          Subtitle (optional)
        </label>
        <input
          id="subtitle"
          type="text"
          {...register('subtitle')}
          placeholder="Brief highlight or tagline"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        />
        {errors.subtitle && (
          <p className="mt-1 text-sm text-red-600">{errors.subtitle.message}</p>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-800">💡 Title Tips</h4>
        <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
          <li>Include brand, model, and key features</li>
          <li>Be specific but concise</li>
          <li>Avoid all caps and excessive punctuation</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step 2: Condition & Specs ────────────────────────────────────────────────

function Step2ConditionSpecs() {
  const { register, formState: { errors }, control } = useFormContext<CreateListingFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itemSpecifics',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Condition & Specifications</h2>
        <p className="mt-1 text-sm text-gray-500">Describe the item's condition and add relevant specifications.</p>
      </div>

      {/* Condition */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONDITION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={option.value}
                {...register('condition')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.condition && (
          <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={6}
          placeholder="Provide a detailed description of your item. Include any flaws, accessories, or unique features..."
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
          <p className="ml-auto text-xs text-gray-400">20-5000 characters</p>
        </div>
      </div>

      {/* Brand */}
      <div>
        <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
          Brand (optional)
        </label>
        <input
          id="brand"
          type="text"
          {...register('brand')}
          placeholder="e.g. Apple, Nike, Sony"
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        />
      </div>

      {/* Item Specifics */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Item Specifics (optional)
        </label>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type="text"
                {...register(`itemSpecifics.${index}.name`)}
                placeholder="Name (e.g. Color)"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              />
              <input
                type="text"
                {...register(`itemSpecifics.${index}.value`)}
                placeholder="Value (e.g. Black)"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => append({ name: '', value: '' })}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Specification
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Media Upload ─────────────────────────────────────────────────────

function Step3MediaUpload() {
  const { register, formState: { errors }, watch, setValue } = useFormContext<CreateListingFormData>();
  const primaryImage = watch('primaryImage');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length > 0 && !primaryImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setValue('primaryImage', result);
        };
        reader.readAsDataURL(fileArray[0]);
      }

      const additional = fileArray.slice(1);
      const urls: string[] = [];
      additional.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          urls.push(e.target?.result as string);
          if (urls.length === additional.length) {
            setValue('additionalImages', urls);
            setPreviewUrls(urls);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [primaryImage, setValue]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Photos</h2>
        <p className="mt-1 text-sm text-gray-500">Upload clear photos of your item. The first photo will be the main listing image.</p>
      </div>

      {/* Primary image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Main Photo <span className="text-red-500">*</span>
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          {primaryImage ? (
            <div className="relative w-full">
              <img
                src={primaryImage}
                alt="Primary listing"
                className="mx-auto h-48 w-full max-w-sm rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setValue('primaryImage', '', { shouldValidate: true });
                }}
                className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white transition-colors hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-gray-400">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <label
                  htmlFor="primary-file"
                  className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                >
                  Click to upload
                </label>{' '}
                or drag and drop
              </p>
              <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
              <input
                id="primary-file"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
            </>
          )}
        </div>
        {errors.primaryImage && (
          <p className="mt-1 text-sm text-red-600">{errors.primaryImage.message}</p>
        )}
      </div>

      {/* Additional images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Photos (optional)
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
        >
          <p className="text-sm text-gray-600">
            <label
              htmlFor="additional-file"
              className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
            >
              Add more photos
            </label>
          </p>
          <input
            id="additional-file"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Preview additional images */}
        {previewUrls.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border bg-gray-100">
                <img src={url} alt={`Additional ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
        <h4 className="text-sm font-semibold text-amber-800">📸 Photo Tips</h4>
        <ul className="mt-2 list-inside list-disc text-sm text-amber-700">
          <li>Use good lighting for clear photos</li>
          <li>Photo from multiple angles</li>
          <li>Include close-ups of any flaws or defects</li>
          <li>Show the item in use when possible</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step 4: Pricing ──────────────────────────────────────────────────────────

function Step4Pricing() {
  const { register, formState: { errors }, watch } = useFormContext<CreateListingFormData>();
  const priceType = watch('priceType');

  const getEndsAt = (duration: string | undefined): string | undefined => {
    if (!duration) return undefined;
    const daysMap: Record<string, number> = {
      '1_day': 1,
      '3_days': 3,
      '7_days': 7,
      '10_days': 10,
      '30_days': 30,
    };
    const days = daysMap[duration];
    if (!days) return undefined;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Pricing</h2>
        <p className="mt-1 text-sm text-gray-500">Choose a format and set your prices.</p>
      </div>

      {/* Price Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Listing Format <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { value: 'auction', label: 'Auction', desc: 'Buyers bid, highest wins' },
            { value: 'fixed', label: 'Buy It Now', desc: 'Fixed price, instant purchase' },
            { value: 'hybrid', label: 'Auction + Buy It Now', desc: 'Bidding with instant buy option' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                priceType === option.value
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value={option.value}
                {...register('priceType')}
                className="sr-only"
              />
              <span className="text-sm font-semibold text-gray-900">{option.label}</span>
              <span className="mt-1 text-xs text-gray-500">{option.desc}</span>
            </label>
          ))}
        </div>
        {errors.priceType && (
          <p className="mt-1 text-sm text-red-600">{errors.priceType.message}</p>
        )}
      </div>

      {/* Start Price */}
      <div>
        <label htmlFor="startPrice" className="block text-sm font-medium text-gray-700">
          {priceType === 'fixed' ? 'Price' : 'Starting Bid'} <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-gray-400">$</span>
          <input
            id="startPrice"
            type="number"
            step="0.01"
            min="0.01"
            {...register('startPrice', { valueAsNumber: true })}
            placeholder="0.00"
            className="block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          />
        </div>
        {errors.startPrice && (
          <p className="mt-1 text-sm text-red-600">{errors.startPrice.message}</p>
        )}
      </div>

      {/* Buy Now Price (for auction/hybrid) */}
      {(priceType === 'auction' || priceType === 'hybrid') && (
        <div>
          <label htmlFor="buyNowPrice" className="block text-sm font-medium text-gray-700">
            Buy It Now Price (optional)
          </label>
          <div className="relative mt-1">
            <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-gray-400">$</span>
            <input
              id="buyNowPrice"
              type="number"
              step="0.01"
              min="0.01"
              {...register('buyNowPrice', { valueAsNumber: true })}
              placeholder="0.00"
              className="block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            />
          </div>
          {errors.buyNowPrice && (
            <p className="mt-1 text-sm text-red-600">{errors.buyNowPrice.message}</p>
          )}
        </div>
      )}

      {/* Auction Duration */}
      {(priceType === 'auction' || priceType === 'hybrid') && (
        <div>
          <label htmlFor="auctionDuration" className="block text-sm font-medium text-gray-700">
            Auction Duration
          </label>
          <select
            id="auctionDuration"
            {...register('auctionDuration')}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            <option value="">Select duration...</option>
            {AUCTION_DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Shipping Cost */}
      <div>
        <label htmlFor="shippingCost" className="block text-sm font-medium text-gray-700">
          Shipping Cost (optional)
        </label>
        <div className="relative mt-1">
          <span className="absolute left-4 top-1/2 flex -translate-y-1/2 text-gray-400">$</span>
          <input
            id="shippingCost"
            type="number"
            step="0.01"
            min="0"
            {...register('shippingCost', { valueAsNumber: true })}
            placeholder="0.00"
            className="block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          />
        </div>
      </div>

      {/* Handling Time */}
      <div>
        <label htmlFor="handlingTime" className="block text-sm font-medium text-gray-700">
          Handling Time (days)
        </label>
        <select
          id="handlingTime"
          {...register('handlingTime', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          {[1, 2, 3, 4, 5, 7].map((days) => (
            <option key={days} value={days}>
              {days} business {days === 1 ? 'day' : 'days'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Step 5: Policies ─────────────────────────────────────────────────────────

function Step5Policies() {
  const { register, formState: { errors }, watch } = useFormContext<CreateListingFormData>();
  const returnsAccepted = watch('returnsAccepted');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Policies</h2>
        <p className="mt-1 text-sm text-gray-500">Set your return, shipping, and payment policies.</p>
      </div>

      {/* Returns */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Accept Returns</h3>
            <p className="mt-1 text-xs text-gray-500">Buyers feel more confident when returns are accepted.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              {...register('returnsAccepted')}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-blue-600">
              <div className="ml-1 mt-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>

        {returnsAccepted && (
          <div className="mt-4">
            <label htmlFor="returnWindow" className="block text-sm font-medium text-gray-700">
              Return Window
            </label>
            <select
              id="returnWindow"
              {...register('returnWindow')}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              <option value="7_days">7 days</option>
              <option value="14_days">14 days</option>
              <option value="30_days">30 days</option>
              <option value="60_days">60 days</option>
              <option value="90_days">90 days</option>
            </select>
          </div>
        )}
      </div>

      {/* Shipping Type */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Shipping Method</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            { value: 'standard', label: 'Standard', desc: '5-10 business days' },
            { value: 'express', label: 'Express', desc: '2-3 business days' },
            { value: 'overnight', label: 'Overnight', desc: 'Next business day' },
            { value: 'local_pickup', label: 'Local Pickup', desc: 'Buyer picks up' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="radio"
                value={option.value}
                {...register('shippingType')}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-medium text-gray-700">{option.label}</span>
                <span className="block text-xs text-gray-400">{option.desc}</span>
              </div>
            </label>
          ))}
        </div>
        {errors.shippingType && (
          <p className="mt-1 text-sm text-red-600">{errors.shippingType.message}</p>
        )}
      </div>

      {/* International Shipping */}
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">International Shipping</h3>
            <p className="mt-1 text-xs text-gray-500">Expand your market by shipping worldwide.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              {...register('handlesIntl')}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-blue-600">
              <div className="ml-1 mt-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Accepted Payment Methods</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center rounded-lg border border-gray-200 px-4 py-3 transition-colors hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
            >
              <input
                type="checkbox"
                value={option.value}
                {...register('paymentMethods')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.paymentMethods && (
          <p className="mt-1 text-sm text-red-600">{errors.paymentMethods.message}</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 6: Review ───────────────────────────────────────────────────────────

function Step6Review() {
  const { watch } = useFormContext<CreateListingFormData>();
  const data = watch();

  const conditionLabel = CONDITION_OPTIONS.find((c) => c.value === data.condition)?.label ?? data.condition;
  const durationLabel = AUCTION_DURATION_OPTIONS.find((d) => d.value === data.auctionDuration)?.label ?? 'Not set';
  const shippingLabel = {
    standard: 'Standard (5-10 days)',
    express: 'Express (2-3 days)',
    overnight: 'Overnight',
    local_pickup: 'Local Pickup',
  }[data.shippingType ?? 'standard'] ?? 'Standard';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Your Listing</h2>
        <p className="mt-1 text-sm text-gray-500">Review all details before publishing your listing.</p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-blue-600">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Basic Information
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Title</dt>
              <dd className="font-medium text-gray-900">{data.title || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Subtitle</dt>
              <dd className="font-medium text-gray-900">{data.subtitle || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Category</dt>
              <dd className="font-medium text-gray-900">{data.categoryId ? 'Selected' : '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Condition & Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-green-600">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Condition & Details
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">Condition</dt>
              <dd className="font-medium text-gray-900">{conditionLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Brand</dt>
              <dd className="font-medium text-gray-900">{data.brand || '—'}</dd>
            </div>
            <div className="sm:col-span-3">
              <dt className="text-xs text-gray-500">Description</dt>
              <dd className="mt-1 max-h-20 overflow-y-auto rounded-lg bg-gray-50 p-3 text-gray-700">
                {data.description || '—'}
              </dd>
            </div>
          </dl>
          {data.itemSpecifics && data.itemSpecifics.length > 0 && (
            <div className="mt-3">
              <dt className="text-xs text-gray-500">Specifications</dt>
              <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
                {data.itemSpecifics.map((spec, idx) => (
                  <div key={idx} className="rounded bg-gray-50 px-3 py-2">
                    <span className="text-gray-500">{spec.name}:</span>{' '}
                    <span className="font-medium text-gray-900">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-purple-600">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Photos
          </h3>
          {data.primaryImage ? (
            <div className="flex gap-2">
              <img
                src={data.primaryImage}
                alt="Primary"
                className="h-20 w-20 rounded-lg border object-cover"
              />
              {(data.additionalImages ?? []).map((url: string, idx: number) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Additional ${idx + 1}`}
                  className="h-20 w-20 rounded-lg border object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No photos uploaded</p>
          )}
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-amber-600">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            Pricing
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">Format</dt>
              <dd className="font-medium text-gray-900 capitalize">{data.priceType}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">
                {data.priceType === 'fixed' ? 'Price' : 'Starting Bid'}
              </dt>
              <dd className="font-medium text-gray-900">
                ${typeof data.startPrice === 'number' ? data.startPrice.toFixed(2) : '0.00'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Buy It Now</dt>
              <dd className="font-medium text-gray-900">
                {data.buyNowPrice ? `$${data.buyNowPrice.toFixed(2)}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Duration</dt>
              <dd className="font-medium text-gray-900">{durationLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Shipping</dt>
              <dd className="font-medium text-gray-900">
                {data.shippingCost ? `$${data.shippingCost.toFixed(2)}` : 'Free'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Handling</dt>
              <dd className="font-medium text-gray-900">{data.handlingTime} day(s)</dd>
            </div>
          </dl>
        </div>

        {/* Policies */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-red-600">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Policies
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-500">Returns</dt>
              <dd className="font-medium text-gray-900">{data.returnsAccepted ? 'Accepted' : 'Not accepted'}</dd>
            </div>
            {data.returnsAccepted && data.returnWindow && (
              <div>
                <dt className="text-xs text-gray-500">Return Window</dt>
                <dd className="font-medium text-gray-900 capitalize">{data.returnWindow.replace('_', ' ')}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Shipping</dt>
              <dd className="font-medium text-gray-900">{shippingLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">International</dt>
              <dd className="font-medium text-gray-900">{data.handlesIntl ? 'Yes' : 'No'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-500">Payment Methods</dt>
              <dd className="font-medium text-gray-900 capitalize">
                {data.paymentMethods?.join(', ') || '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs text-gray-500">
          By publishing this listing, you agree to our Terms of Service and confirm that the information provided is accurate and truthful.
        </p>
      </div>
    </div>
  );
}

// ─── Main Sell Page (Wizard) ──────────────────────────────────────────────────

const defaultValues: Partial<CreateListingFormData> = {
  categoryId: '',
  title: '',
  subtitle: '',
  condition: 'new_with_tags',
  description: '',
  brand: '',
  itemSpecifics: [],
  primaryImage: '',
  additionalImages: [],
  priceType: 'auction',
  startPrice: 0,
  buyNowPrice: undefined,
  auctionDuration: '7_days',
  shippingCost: 0,
  handlingTime: 3,
  returnsAccepted: false,
  returnWindow: '30_days',
  shippingType: 'standard',
  handlesIntl: false,
  paymentMethods: ['paypal', 'credit_card'],
};

export default function SellPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  // Current step state
  const [currentStep, setCurrentStep] = useState(0);
  const [stepKey, setStepKey] = useState<string>(STEPS[0].key);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Create form with full schema but validate per-step
  const methods = useForm<CreateListingFormData>({
    resolver: zodResolver(createListingFormSchema) as any,
    defaultValues: { ...defaultValues, ...loadDraft() },
    mode: 'onChange',
  });

  const { handleSubmit, formState: { errors }, reset, trigger, watch } = methods;

  // Create listing mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateListingFormData) => {
      // Map form data to API payload
      const endsAtMap: Record<string, number> = {
        '1_day': 1,
        '3_days': 3,
        '7_days': 7,
        '10_days': 10,
        '30_days': 30,
      };

      const payload = {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId || undefined,
        condition: data.condition as 'new' | 'used' | 'refurbished',
        priceType: data.priceType as 'auction' | 'fixed' | 'hybrid',
        startPrice: data.startPrice,
        buyNowPrice: data.buyNowPrice || undefined,
        endsAt: data.auctionDuration
          ? new Date(Date.now() + (endsAtMap[data.auctionDuration] || 7) * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      };

      return createListing(payload);
    },
    onSuccess: () => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/listings/seller'] });
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      setSubmitError(error.message || 'Failed to create listing');
      setIsSubmitting(false);
    },
  });

  // Save draft on every change
  useEffect(() => {
    const subscription = methods.watch((values) => {
      saveDraft(values as CreateListingFormData);
    });
    return () => subscription.unsubscribe();
  }, [methods.watch]);

  // Validate current step fields
  const validateStep = useCallback(
    (step: number): Promise<boolean> => {
      return new Promise((resolve) => {
        switch (step) {
          case 0: // Step 1: Category & Title
            methods.trigger(['categoryId', 'title', 'subtitle']).then(resolve);
            break;
          case 1: // Step 2: Condition & Specs
            methods.trigger(['condition', 'description', 'brand', 'itemSpecifics']).then(resolve);
            break;
          case 2: // Step 3: Media
            methods.trigger(['primaryImage', 'additionalImages']).then(resolve);
            break;
          case 3: // Step 4: Pricing
            methods.trigger(['priceType', 'startPrice', 'buyNowPrice', 'auctionDuration', 'shippingCost', 'handlingTime']).then(resolve);
            break;
          case 4: // Step 5: Policies
            methods.trigger(['returnsAccepted', 'returnWindow', 'shippingType', 'handlesIntl', 'paymentMethods']).then(resolve);
            break;
          case 5: // Step 6: Review - no validation needed
            resolve(true);
            break;
          default:
            resolve(false);
        }
      });
    },
    [methods]
  );

  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      setStepKey(STEPS[nextIdx].key);
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      setStepKey(STEPS[prevIdx].key);
    }
  }, [currentStep]);

  const onFinalSubmit = handleSubmit(async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    createMutation.mutate(data);
  });

  // Render current step
  const renderStep = () => {
    switch (stepKey) {
      case 'category':
        return <Step1CategoryTitle />;
      case 'condition':
        return <Step2ConditionSpecs />;
      case 'media':
        return <Step3MediaUpload />;
      case 'pricing':
        return <Step4Pricing />;
      case 'policies':
        return <Step5Policies />;
      case 'review':
        return <Step6Review />;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Listing</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Follow the steps to publish your item for sale
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} stepKey={stepKey} />

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="ml-3 text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          )}

          {/* Draft saved indicator */}
          <div className="mb-4 flex items-center justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Draft auto-saved
            </span>
          </div>

          {/* Form */}
          <FormProvider {...methods}>
            <form onSubmit={onFinalSubmit}>
              <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
                {renderStep()}
              </div>
            </form>
          </FormProvider>

          {/* Navigation Buttons */}
          <div className="mt-6 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <polyline points="15,18 9,12 15,6" />
                </svg>
                Back
              </span>
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <span className="flex items-center gap-2">
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinalSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Publishing...
                    </>
                  ) : (
                    <>
                      Publish Listing
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <polyline points="22,4 12,14.01 9,11.01" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            )}
          </div>

          {/* Save as Draft */}
          {currentStep < STEPS.length - 1 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-500 transition-colors hover:text-gray-700"
              >
                Save as draft & exit
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}