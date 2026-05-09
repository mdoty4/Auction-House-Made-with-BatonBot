'use client';
import { Listing } from '@/lib/api';
function getSellerStats(sellerId: string) {
  return { name: `Seller ${sellerId.slice(0, 6)}`, memberSince: '2023', ratings: 4.7, totalRatings: 342, positivePercentage: 98, totalSales: 1250, location: 'United States' };
}
function StarRating({ rating, totalRatings }: { rating: number; totalRatings: number }) {
  const fullStars = Math.floor(rating);
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg key={star} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={star <= fullStars ? 'currentColor' : '#E5E7EB'} className="h-4 w-4 text-amber-400">
            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-medium text-blue-600">{rating}</span>
      <span className="text-xs text-gray-500">({totalRatings} ratings)</span>
    </div>
  );
}
export default function SellerInfo({ listing }: { listing: Listing }) {
  const stats = getSellerStats(listing.sellerId);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Seller Information</h3>
      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-lg font-bold text-white">{stats.name.charAt(0)}</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{stats.name}</p>
            <StarRating rating={stats.ratings} totalRatings={stats.totalRatings} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
          <div><p className="text-xs text-gray-500">Positive Feedback</p><p className="text-lg font-bold text-green-600">{stats.positivePercentage}%</p></div>
          <div><p className="text-xs text-gray-500">Total Sales</p><p className="text-lg font-bold text-gray-900">{stats.totalSales.toLocaleString()}</p></div>
          <div><p className="text-xs text-gray-500">Member Since</p><p className="text-sm font-medium text-gray-900">{stats.memberSince}</p></div>
          <div><p className="text-xs text-gray-500">Location</p><p className="text-sm font-medium text-gray-900">{stats.location}</p></div>
        </div>
        <div className="flex gap-3">
          <button className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Contact Seller</button>
          <button className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">View Store</button>
        </div>
      </div>
    </div>
  );
}
