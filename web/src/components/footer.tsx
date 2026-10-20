import { Link } from '../navigation';

import { Wordmark } from '@/components/icons';

interface FooterProps {
  footerLinks: {
    label: string;
    href: string;
  }[];
  labels: {
    service: string;
    nav: string;
  };
}

export default function Footer({ footerLinks, labels }: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className='border-t border-trait print:hidden'>
      <div className='conteneur flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between'>
        <div>
          <Wordmark />
          <p className='mt-2 text-petit text-texte-3'>{labels.service}</p>
        </div>
        <nav aria-label={labels.nav}>
          <ul className='flex flex-wrap gap-x-6 gap-y-2'>
            {footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className='inline-flex min-h-6 items-center text-petit font-medium text-texte-2 transition-colors duration-courte hover:text-encre'
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className='conteneur pb-12'>
        <p className='text-legende text-texte-3'>
          <bdi dir='ltr'>© {year} Tenga Conseil</bdi>
        </p>
      </div>
    </footer>
  );
}
