'use client';

import { useSearchParams } from 'next/navigation';
import { ListingGrid } from '@/components/listings/ListingGrid';

export default function ListingsPage() {
  const searchParams = useSearchParams();

  const category = searchParams.get('categoryId') || searchParams.get('category') || '';
  const condition = searchParams.get('condition') || '';
  const status = searchParams.get('status') || 'active';
  const search = searchParams.get('q') || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {category ? `Browse: ${category}` : 'Browse Listings'}
          </h1>
          {search && (
            <p className="mt-1 text-sm text-gray-500">
              Results for &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        <ListingGrid
          filters={{
            ...(category ? { categoryId: category } : {}),
            ...(condition ? { condition } : {}),
            status,
            ...(search ? { search } : {}),
          }}
        />
      </div>
    </div>
  );
}
