'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { Listing } from '@/lib/api';
import { ListingCard } from '@/components/listings/ListingCard';
export default function SimilarItems({ items }: { items: Listing[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => { if (ref.current) ref.current.scrollTo({ left: ref.current.scrollLeft + (dir === 'left' ? -300 : 300), behavior: 'smooth' }); };
  return (
    <div>
      <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-gray-900">Similar Items</h3><p className="mt-1 text-sm text-gray-500">Based on items viewed by other shoppers</p></div><div className="flex gap-2"><button onClick={() => scroll('left')} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg></button><button onClick={() => scroll('right')} className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white hover:bg-gray-50"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg></button></div></div>
      <div ref={ref} className="mt-6 flex gap-4 overflow-x-auto scroll-smooth pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>{items.map((item) => (<div key={item.id} className="w-56 flex-shrink-0"><ListingCard listing={item} /></div>))}</div>
      <div className="mt-4 text-center"><Link href="/listings" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">View all similar items <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg></Link></div>
    </div>
  );
}
