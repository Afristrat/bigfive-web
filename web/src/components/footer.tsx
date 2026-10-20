import { ReactElement } from 'react';
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
      <div className='conteneur flex flex-wrap items-center justify-between gap-x-7 gap-y-4 py-7 text-petit text-texte-2'>
        <nav aria-label={labels.nav}>
          <ul className='flex flex-wrap gap-x-[22px] gap-y-1.5'>
            {footerLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className='inline-flex min-h-11 items-center hover:text-encre hover:underline'
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>
          <bdi dir='ltr'>© {year} Tenga Conseil</bdi>
        </p>
      </div>
    </footer>
  );
}
