'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

interface Package {
  id: number;
  image: string;
  destination: string;
  country: string;
  href: string;
  badge: string;
  originalPrice: number;
  discountedPrice: number;
}

const packages: Package[] = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Bali',
    country: 'Indonesia',
    href: '/bali',
    badge: 'Best Value',
    originalPrice: 1200,
    discountedPrice: 899,
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Maldives',
    country: 'Maldives',
    href: '/maldives',
    badge: 'Luxury Deal',
    originalPrice: 3000,
    discountedPrice: 2499,
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Phuket',
    country: 'Thailand',
    href: '/phuket',
    badge: 'Best Value',
    originalPrice: 1000,
    discountedPrice: 799,
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Tokyo',
    country: 'Japan',
    href: '/tokyo',
    badge: 'Fastest Visa',
    originalPrice: 2200,
    discountedPrice: 1899,
  },
  {
    id: 5,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Seoul',
    country: 'South Korea',
    href: '/seoul',
    badge: 'Best Value',
    originalPrice: 1600,
    discountedPrice: 1299,
  },
  {
    id: 6,
    image:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8amFwYW58ZW58MHx8MHx8fDA%3D',
    destination: 'Kyoto',
    country: 'Japan',
    href: '/kyoto',
    badge: 'Luxury Deal',
    originalPrice: 2600,
    discountedPrice: 2199,
  },
];

const sortOptions = ['Recommended', 'Price: Low to High', 'Price: High to Low'];

export default function PackageGrid() {
  const savings = (i: Package) => i.originalPrice - i.discountedPrice;
  const [filter, setFilter] = useState<'inc' | 'dec' | ''>('');

  return (
    <div className="w-full px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500 md:text-sm">
          Showing {packages.length} packages for Asia
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 md:text-sm">Sort by:</span>
          <select
            onChange={(e) => {
              if (e.target.value === 'Price: Low to High') {
                setFilter('inc');
              } else if (e.target.value === 'Price: High to Low') {
                setFilter('dec');
              } else {
                setFilter('');
              }
            }}
            className="rounded-lg border border-gray-200 py-1.5 text-sm text-(--color-blue) outline-none md:px-3"
          >
            {sortOptions.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filter === ''
          ? packages.map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-52 w-full bg-gray-100">
                  {i.image && (
                    <Image src={i.image} alt={i.destination} fill className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/30"></div>
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm">
                    {i.badge}
                  </span>
                  <div className="absolute right-0 bottom-0 left-0 px-4 pt-8 pb-3">
                    <p className="text-base font-semibold text-white">
                      {i.destination}, {i.country}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-4">
                  <p className="text-sm text-gray-400 line-through">
                    ${i.originalPrice.toLocaleString()}
                  </p>
                  <p className="text-2xl font-bold text-(--color-blue)">
                    ${i.discountedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">per person · flight + hotel</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-(--color-green)/10 px-2.5 py-1 text-xs font-semibold text-(--color-green)">
                      Save ${savings(i).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          : (filter === 'inc'
              ? [...packages].sort((a, b) => {
                  return a.discountedPrice - b.discountedPrice;
                })
              : [...packages].sort((a, b) => {
                  return b.discountedPrice - a.discountedPrice;
                })
            ).map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-52 w-full bg-gray-100">
                  {i.image && (
                    <Image src={i.image} alt={i.destination} fill className="object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/30"></div>
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm">
                    {i.badge}
                  </span>
                  <div className="absolute right-0 bottom-0 left-0 px-4 pt-8 pb-3">
                    <p className="text-base font-semibold text-white">
                      {i.destination}, {i.country}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-4">
                  <p className="text-sm text-gray-400 line-through">
                    ${i.originalPrice.toLocaleString()}
                  </p>
                  <p className="text-2xl font-bold text-(--color-blue)">
                    ${i.discountedPrice.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">per person · flight + hotel</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-(--color-green)/10 px-2.5 py-1 text-xs font-semibold text-(--color-green)">
                      Save ${savings(i).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
      </div>

      <div className="mt-10 flex justify-center">
        <button className="rounded-xl border border-gray-300 px-8 py-3 text-sm font-medium text-(--color-blue) transition-colors hover:border-(--color-blue)">
          Load More Packages
        </button>
      </div>
    </div>
  );
}
