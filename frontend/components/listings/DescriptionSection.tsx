'use client';
import { useState } from 'react';
import { Listing } from '@/lib/api';
export default function DescriptionSection({ listing }: { listing: Listing }) {
  const [expanded, setExpanded] = useState(false);
  const desc = listing.description || 'No description provided.';
  const truncate = desc.length > 300;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Description</h3>{truncate && <button onClick={() => setExpanded(!expanded)} className="text-sm font-medium text-blue-600 hover:text-blue-700">{expanded ? 'Show Less' : 'Read More'}</button>}</div>
      <div className={`mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 ${truncate && !expanded ? 'line-clamp-4' : ''}`}>{truncate && !expanded ? desc.slice(0, 300) + '...' : desc}</div>
      <div className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400"><span>{desc.length} characters</span> <span>&bull;</span> <span>{desc.split(/\s+/).filter(Boolean).length} words</span></div>
    </div>
  );
}
