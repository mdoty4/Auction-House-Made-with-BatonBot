'use client';

import { Listing } from '@/lib/api';

interface ItemSpecificsProps {
  listing: Listing;
}

function getSpecs(listing: Listing) {
  const specs: { label: string; value: string }[] = [
    { label: 'Condition', value: listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1) },
    { label: 'Listing Type', value: listing.priceType === 'auction' ? 'Auction' : 'Fixed Price' },
    { label: 'Item ID', value: listing.id.slice(0, 12) + '...' },
    { label: 'Watchers', value: String(listing.watchers) },
    { label: 'Status', value: listing.status.charAt(0).toUpperCase() + listing.status.slice(1) },
    { label: 'Listed On', value: new Date(listing.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
  ];
  if (listing.endsAt) {
    specs.push({ label: 'Ends On', value: new Date(listing.endsAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) });
  }
  return specs;
}

export default function ItemSpecifics({ listing }: ItemSpecificsProps) {
  const specs = getSpecs(listing);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">Item Specifics</h3>
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            {specs.map((spec, index) => (
              <tr key={spec.label} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                <td className="px-4 py-3 font-medium text-gray-600 w-48">{spec.label}</td>
                <td className="px-4 py-3 text-gray-900">{spec.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900">Shipping & Returns</h3>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600 w-48">Shipping</td><td className="px-4 py-3 text-gray-900">Standard Shipping - $4.99</td></tr>
              <tr className="border-b border-gray-100"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">Expedited Shipping</td><td className="px-4 py-3 text-gray-900">Available - $12.99</td></tr>
              <tr className="border-b border-gray-100"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">From</td><td className="px-4 py-3 text-gray-900">United States</td></tr>
              <tr className="border-b border-gray-100"><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">Returns</td><td className="px-4 py-3 text-gray-900">30 days. Buyer pays return shipping.</td></tr>
              <tr><td className="bg-gray-50 px-4 py-3 font-medium text-gray-600">Delivery</td><td className="px-4 py-3 text-gray-900">Estimated 3-5 business days</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}