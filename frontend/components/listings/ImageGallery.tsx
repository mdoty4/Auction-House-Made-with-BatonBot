'use client';

import { useState } from 'react';

interface ImageGalleryProps {
  listingId: string;
  title: string;
}

export default function ImageGallery({ listingId, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState<{ show: boolean; x: number; y: number }>({
    show: false,
    x: 0,
    y: 0,
  });

  // Generate placeholder "images" since the schema doesn't have an image model yet.
  // In production, these would come from a ListingImage relation.
  const placeholders = [
    {
      id: 'main',
      gradient: 'from-gray-100 to-gray-200',
      label: 'Main View',
    },
    {
      id: 'angle-1',
      gradient: 'from-gray-50 to-gray-100',
      label: 'Angle 1',
    },
    {
      id: 'angle-2',
      gradient: 'from-gray-100 to-gray-150',
      label: 'Angle 2',
    },
    {
      id: 'detail',
      gradient: 'from-gray-50 to-gray-150',
      label: 'Detail',
    },
  ];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ show: true, x, y });
  };

  return (
    <div className="space-y-3">
      {/* Main Image Display */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-200 bg-white cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoom((z) => ({ ...z, show: false }))}
      >
        {/* Image placeholder with gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${placeholders[activeIndex].gradient} flex items-center justify-center`}
        >
          <div className="text-center space-y-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-24 w-24 text-gray-300"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm text-gray-400">{placeholders[activeIndex].label}</p>
            <p className="text-xs text-gray-300 max-w-[200px] mx-auto">
              Product images will appear here when uploaded
            </p>
          </div>
        </div>

        {/* Zoom overlay */}
        {zoom.show && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              background: `radial-gradient(circle at ${zoom.x}% ${zoom.y}%, rgba(0,0,0,0.1) 0%, transparent 60%)`,
            }}
          />
        )}

        {/* Navigation arrows */}
        {placeholders.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev - 1 + placeholders.length) % placeholders.length)
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white transition-colors disabled:opacity-0"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() =>
                setActiveIndex((prev) => (prev + 1) % placeholders.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Image counter */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {activeIndex + 1} / {placeholders.length}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {placeholders.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {placeholders.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(index)}
              className={`relative flex-shrink-0 aspect-square w-20 overflow-hidden rounded-lg border-2 transition-all ${
                index === activeIndex
                  ? 'border-blue-600 ring-2 ring-blue-600/20'
                  : 'border-transparent hover:border-gray-300'
              }`}
              aria-label={`View ${img.label}`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${img.gradient} flex items-center justify-center`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-6 w-6 text-gray-300"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}