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
    tagline: string;
  };
}

// Pied de page en deux temps : la marque et ce qu'est le questionnaire en début
// de ligne, les liens en grille en fin de ligne. À son entrée dans l'écran, un
// filet safran ouvre la bordure, la marque se dessine et les liens montent en
// cascade (moteur MotionRuntime).
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
      <div className='conteneur grid gap-x-8 gap-y-10 py-14 text-petit text-texte-2 lg:grid-cols-12 lg:py-20'>
        <div className='lg:col-span-5'>
          <div data-reveal='trace' className='flex items-center gap-3'>
            <Marque trace='revele' className='size-8' />
            <Wordmark />
          </div>
          <p
            data-reveal='monte'
            className='mt-5 max-w-[30em] text-corps text-texte-2'
          >
            {labels.tagline}
          </p>
        </div>
        <nav aria-label={labels.nav} className='lg:col-span-6 lg:col-start-7'>
          <ul className='grid grid-cols-1 gap-x-8 min-[400px]:grid-cols-2 sm:grid-cols-3'>
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
        <p className='border-t border-trait pt-6 text-texte-3 lg:col-span-12'>
          <bdi dir='ltr'>© {year} Tenga Conseil</bdi>
        </p>
      </div>
    </footer>
  );
}
