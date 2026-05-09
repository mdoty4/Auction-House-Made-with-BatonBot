'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <span>Auction House</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden space-x-8 md:flex">
          <Link
            href="/listings"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Browse Listings
          </Link>
          <Link
            href="/listings/new"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Sell Item
          </Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/cart"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Cart
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {user.email}
              </Link>
              <button
                onClick={logout}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}