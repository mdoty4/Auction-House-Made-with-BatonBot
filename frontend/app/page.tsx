'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getCategories, Category } from '@/lib/api';
import { ListingGrid } from '@/components/listings/ListingGrid';

// Category icon mapping
const categoryIcons: Record<string, React.ReactNode> = {
  electronics: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  fashion: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M6 2L3 6v14h18V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
    </svg>
  ),
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  sports: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  toys: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
      <path d="M9 14v2a2 2 0 002 2h2a2 2 0 002-2v-2" />
      <path d="M9 20h6" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  ),
  books: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
  vehicles: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M5 17h14v-5l-2-6H7L5 12v5z" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </svg>
  ),
  collectibles: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M12 2l3 7h7l-5.5 4.5 2 7L12 16l-6.5 4.5 2-7L2 9h7z" />
    </svg>
  ),
};

// Default icon for categories without a specific icon
const defaultIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// Get icon for a category based on its slug or name
function getCategoryIcon(category: Category): React.ReactNode {
  const slug = category.slug.toLowerCase();
  const name = category.name.toLowerCase();

  for (const key of Object.keys(categoryIcons)) {
    if (slug.includes(key) || name.includes(key)) {
      return categoryIcons[key];
    }
  }

  return defaultIcon;
}

// CategoryCard component
function CategoryCard({ category }: { category: Category }) {
  const listingCount = category._count?.listings ?? 0;

  return (
    <Link
      href={`/listings?category=${category.slug}`}
      className="group flex flex-col items-center gap-3 rounded-xl border bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg hover:-translate-y-1"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
        {getCategoryIcon(category)}
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {category.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {listingCount > 0 ? `${listingCount} listings` : 'No listings yet'}
        </p>
      </div>
    </Link>
  );
}

export default function Home() {
  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/categories'],
    queryFn: getCategories,
  });


  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(139,92,246,0.3),transparent_50%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Discover, Bid, and Win
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
              Explore thousands of unique items from auction deals to instant buys.
              Your next treasure is waiting.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/listings"
                className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                Browse All Listings
              </Link>
              <Link
                href="/listings/new"
                className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
            <p className="mt-1 text-gray-600">Browse items by your favorite categories</p>
          </div>
          <Link
            href="/listings"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
          >
            View all →
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-xl border bg-white p-6 animate-pulse">
                <div className="h-16 w-16 rounded-full bg-gray-200" />
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-12 w-12 text-gray-400">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No categories yet</h3>
            <p className="mt-2 text-gray-500">Categories will appear here once they are set up.</p>
          </div>
        )}
      </section>

      {/* Featured Listings Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
              <p className="mt-1 text-gray-600">Trending items you don't want to miss</p>
            </div>
            <Link
              href="/listings"
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              Browse all →
            </Link>
          </div>

          <ListingGrid
            filters={{ status: 'active' }}
            emptyMessage="No listings yet. Be the first to list an item!"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to start selling?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
            List your items in minutes and reach millions of potential buyers.
            Whether it's an auction or a fixed price, the choice is yours.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/listings/new"
              className="rounded-lg bg-white px-8 py-3 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              Start Selling Now
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}