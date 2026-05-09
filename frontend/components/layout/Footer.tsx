import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Auction House</h3>
            <p className="mt-2 text-sm text-gray-500">
              A full-featured auction marketplace for buying and selling unique items.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Quick Links</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <Link
                  href="/listings"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link
                  href="/listings/new"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  Sell an Item
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Support</h3>
            <ul className="mt-2 space-y-2">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t pt-6 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Auction House. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}