import { CSSProperties, ReactElement } from 'react';
import { Marque } from '@/components/cadre/marque';
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

// Pied de page : à son entrée dans l'écran, un filet safran ouvre la bordure,
// la marque se dessine et les liens montent en cascade (moteur MotionRuntime).
export default function Footer({
  footerLinks,
  labels
}: FooterProps): ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer className='relative border-t border-trait print:hidden'>
      <span
        aria-hidden='true'
        data-reveal='volet'
        className='absolute -top-px start-0 block h-0.5 w-24 bg-safran sm:w-40'
      />
      <div className='conteneur flex flex-wrap items-center justify-between gap-x-8 gap-y-6 py-12 text-petit text-texte-2'>
        <div data-reveal='trace' className='flex items-center gap-2.5'>
          <Marque trace='revele' className='size-6' />
          <Wordmark />
        </div>
        <nav aria-label={labels.nav}>
          <ul className='flex flex-wrap gap-x-6 gap-y-1'>
            {footerLinks.map((item, index) => (
              <li
                key={item.href}
                data-reveal='monte'
                style={{ ['--i' as string]: index + 1 } as CSSProperties}
              >
                <Link
                  href={item.href}
                  className='filet filet-serre inline-flex min-h-11 items-center font-medium transition-colors duration-courte ease-tenga hover:text-encre'
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
