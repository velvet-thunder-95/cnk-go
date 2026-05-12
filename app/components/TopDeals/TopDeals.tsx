'use client';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Deal {
  id: number;
  image: string;
  destination: string;
  href: string;
  country: string;
  badge: string;
  originalPrice: number;
  discountedPrice: number;
}

const deals: Deal[] = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmFsaXxlbnwwfDF8MHx8fDA%3D',
    destination: 'Bali',
    href: '/bali',
    country: 'Indonesia',
    badge: 'Best Value',
    originalPrice: 1200,
    discountedPrice: 899,
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1578922746465-3a80a228f223?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFsZGl2ZXN8ZW58MHwxfDB8fHww',
    destination: 'Maldives',
    href: '/maldives',
    country: '',
    badge: 'Luxury Deal',
    originalPrice: 3000,
    discountedPrice: 2499,
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8RHViYWl8ZW58MHwxfDB8fHww',
    destination: 'Dubai',
    href: '/dubai',
    country: 'UAE',
    badge: 'Fastest Visa',
    originalPrice: 1500,
    discountedPrice: 1199,
  },
  {
    id: 4,
    image:
      'https://plus.unsplash.com/premium_photo-1690749740487-01bbb8e51e71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8dG9reW98ZW58MHwxfDB8fHww',
    destination: 'Tokyo',
    href: '/tokyo',
    country: 'Japan',
    badge: 'Best Value',
    originalPrice: 2200,
    discountedPrice: 1899,
  },
];

export function TopDeals() {
  return (
    <section className="w-full px-4 py-8 sm:px-6 lg:mt-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-(--color-blue) sm:text-3xl">
              Top Deals Right Now
            </h2>
            <p className="mt-1 text-sm text-gray-400">Handpicked packages with the best value.</p>
          </div>
          <button
            onClick={() => alert('kjjsn')}
            className="flex items-center gap-1 text-sm font-semibold text-(--color-yellow) transition-opacity hover:opacity-75"
          >
            View all deals
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {deals.map((deal) => {
            const savings = deal.originalPrice - deal.discountedPrice;
            return (
              <Link
                key={deal.id}
                href={deal.href}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/20 bg-white/80 pb-14 duration-300"
              >
                <div className="relative h-52 w-full bg-black/50 sm:h-56 lg:h-60">
                  <Image src={deal.image} alt={deal.destination} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/30" />
                  <span className="absolute top-3 left-3 z-10 rounded-full bg-gray-200/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-sm">
                    {deal.badge}
                  </span>
                  <div className="absolute bottom-0 left-0 pb-4 pl-2">
                    <p className="text-xl font-semibold text-white">
                      {deal.destination}
                      {deal.country ? `, ${deal.country}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 p-4 text-left">
                  <p className="text-sm text-gray-400 line-through">${deal.originalPrice}</p>
                  <p className="text-2xl font-bold text-(--color-blue)">${deal.discountedPrice}</p>
                  <p className="text-sm text-gray-400">per person · flight + hotel</p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-(--color-green)/10 px-2.5 py-1 text-xs font-semibold text-(--color-green)">
                      Save ${savings}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
