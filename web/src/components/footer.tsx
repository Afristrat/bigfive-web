import { ReactElement } from 'react';
import { Wordmark } from '@/components/icons';
import { Link } from '../navigation';

interface FooterProps {
  footerLinks: {
    label: string;
    href: string;
  }[];
  labels: {
    nav: string;
  };
}

export default function Footer({
  footerLinks,
  labels
}: FooterProps): ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer className='border-t border-trait print:hidden'>
      <div className='conteneur flex flex-wrap items-center justify-between gap-x-8 gap-y-6 py-12 text-petit text-texte-2'>
        <Wordmark />
        <nav aria-label={labels.nav}>
          <ul className='flex flex-wrap gap-x-6 gap-y-1'>
            {footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className='inline-flex min-h-11 items-center font-medium underline-offset-4 transition-colors duration-courte ease-tenga hover:text-encre hover:underline'
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className='w-full text-texte-3'>
          <bdi dir='ltr'>© {year} Tenga Conseil</bdi>
        </p>
      </div>
    </footer>
  );
}
