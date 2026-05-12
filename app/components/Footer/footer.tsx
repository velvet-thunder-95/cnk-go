import Link from 'next/link';

const companyLinks = ['About', 'Careers', 'Press'];
const supportLinks = [
  {
    name: 'Help Center',
    route: '/help',
  },
  {
    name: 'Contact Us',
    route: '/contact',
  },
  {
    name: 'Cancellations',
    route: '/cancellations',
  },
];
export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div>
            <span className="text-xl font-semibold text-(--color-blue) md:text-2xl">
              Instantly Holiday
            </span>
            <p className="mt-2 text-sm text-gray-400 md:text-lg">
              The easiest way to book your next trip.
            </p>
          </div>

          <div className="flex justify-between gap-16">
            <div>
              <p className="mb-4 text-sm font-semibold text-[#1a2e4a] md:text-lg">Company</p>
              <ul className="flex flex-col gap-3">
                {companyLinks.map((link) => (
                  <li key={link}>
                    <Link
                      href={link}
                      className="text-sm text-gray-400 hover:text-(--color-blue) md:text-lg"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 text-sm font-semibold text-[#1a2e4a] md:text-lg">Support</p>
              <ul className="flex flex-col gap-3">
                {supportLinks.map((i) => (
                  <li key={i.name}>
                    <Link
                      href={i.route}
                      className="text-sm text-gray-400 hover:text-(--color-blue) md:text-lg"
                    >
                      {i.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-400 md:text-lg">
            © 2024 Instantly Holiday. All rights reserved.
          </p>
          <div className="flex gap-6">
            <button className="text-xs text-gray-400 hover:text-(--color-blue) md:text-lg">
              Privacy Policy
            </button>
            <button className="text-xs text-gray-400 hover:text-(--color-blue) md:text-lg">
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
