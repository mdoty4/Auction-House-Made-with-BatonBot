'use client';

import { useCallback } from 'react';
import { Listing, Bid } from '@/lib/api';
import CountdownTimer from '@/components/ui/CountdownTimer';
import BidForm from '@/components/auctions/BidForm';

interface PricingBlockProps {
  listing: Listing;
  onBidPlaced?: (newBid: Bid) => void;
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'N/A';
  const num = typeof price === 'number' ? price : parseFloat(String(price));
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

export default function PricingBlock({ listing, onBidPlaced }: PricingBlockProps) {
  const isAuction = listing.priceType === 'auction';
  const isFixed = listing.priceType === 'fixed';
  const currentBid = listing.currentBid ? (typeof listing.currentBid === 'number' ? listing.currentBid : parseFloat(String(listing.currentBid))) : null;
  const startPrice = typeof listing.startPrice === 'number' ? listing.startPrice : parseFloat(String(listing.startPrice));
  const buyNowPrice = listing.buyNowPrice ? (typeof listing.buyNowPrice === 'number' ? listing.buyNowPrice : parseFloat(String(listing.buyNowPrice))) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {isAuction && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Bid</p>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(currentBid ?? startPrice)}</p>
              {currentBid && currentBid === startPrice && <p className="mt-1 text-xs text-gray-400">No bids yet</p>}
            </div>
            <BidForm listing={listing} onBidPlaced={onBidPlaced} />
            {buyNowPrice && (
              <div className="pt-3">
                <button className="w-full rounded-lg border-2 border-amber-400 bg-amber-50 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                  Buy It Now for {formatPrice(buyNowPrice)}
                </button>
                <p className="mt-1 text-center text-xs text-gray-400">Purchase immediately and skip the auction</p>
              </div>
            )}
          </div>
        )}
        {isFixed && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Price</p>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(buyNowPrice ?? startPrice)}</p>
            </div>
            <button className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">Buy It Now</button>
            <button className="w-full rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Add to Cart</button>
          </div>
        )}
      </div>
      {isAuction && listing.endsAt && <CountdownTimer endsAt={listing.endsAt} listingId={listing.id} />}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Starting Price</p><p className="font-semibold text-gray-900">{formatPrice(startPrice)}</p></div>
          <div><p className="text-gray-500">Listing Type</p><p className="font-semibold text-gray-900 capitalize">{listing.priceType}</p></div>
          {currentBid && <div><p className="text-gray-500">Current Bid</p><p className="font-semibold text-gray-900">{formatPrice(currentBid)}</p></div>}
          {buyNowPrice && <div><p className="text-gray-500">Buy Now Price</p><p className="font-semibold text-gray-900">{formatPrice(buyNowPrice)}</p></div>}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-semibold text-gray-700">Seller Notes</h4>
        <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
          <li className="flex items-start gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>Returns accepted within 30 days</li>
          <li className="flex items-start gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>Shipped with tracking number</li>
          <li className="flex items-start gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"><polyline points="20 6 9 17 4 12" /></svg>Buyer protection applies</li>
        </ul>
      </div>
    </div>
  );
}