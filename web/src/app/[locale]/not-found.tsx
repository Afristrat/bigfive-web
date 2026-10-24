'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { PentagoneTrace } from '@/components/cadre/pentagone-trace';
import { ArrowRightIcon } from '@/components/icons';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { boutonPrincipal, subtitle, title } from '@/components/primitives';
import { PARCOURS_ANONYME_OUVERT } from '@/config/site';

// Page introuvable : le pentagone se trace sans se refermer, un côté manque ;
// le titre monte mot à mot, le texte et le retour suivent.
export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <section className='grid items-center gap-x-12 gap-y-10 py-10 lg:grid-cols-12 lg:py-16'>
      <PentagoneTrace
        part={0.8}
        className='mx-auto max-w-[220px] lg:order-last lg:col-span-5 lg:max-w-[340px]'
      />
      <div className='lg:col-span-7'>
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p
          style={{ ['--i' as string]: 0 }}
          className={subtitle({ class: 'apparait-tard' })}
        >
          {t('text')}
        </p>
        <div
          style={{ ['--i' as string]: 1 }}
          className='apparait-tard mt-8 flex flex-wrap items-center gap-x-6 gap-y-3'
        >
          <Link href='/' data-aimant='' className={boutonPrincipal()}>
            {t('home')}
          </Link>
          {/* Parcours anonyme fermé : plus de raccourci vers le questionnaire. */}
          {PARCOURS_ANONYME_OUVERT && (
            <Link
              href='/test'
              className='lien-fleche inline-flex min-h-11 items-center gap-2 text-petit font-medium text-accent underline-offset-4 hover:text-accent-survol hover:underline'
            >
              {t('test')}
              <ArrowRightIcon size={18} />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
