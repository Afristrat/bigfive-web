// Sections de la page d'accueil sous l'ouverture (direction « règle graduée »,
// § 8.9) : l'enjeu, ce que dit la recherche, ce que le questionnaire ne fait
// pas, le tiers de confiance, le déroulement, les cinq grands facteurs, la
// provenance, la FAQ courte, puis la signature et l'appel final.
// Une seule grammaire : un filet en tête de section, le titre en début de ligne
// (4 colonnes sur 12), le contenu en fin de ligne (8 colonnes) ; des filets
// plutôt que des cartes. Composants serveur : aucun JavaScript client. La FAQ
// est un accordéon natif (details/summary), accessible sans code.
import { ReactElement, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { boutonPrincipal } from '@/components/primitives';
import { secondaryButtonClass } from '@/components/form-styles';
import { domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';
import { Link } from '@/navigation';

interface HomeSectionProps {
  locale: string;
}

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' }
] as const;

const faqKeys = ['science', 'usefulness', 'diagnosis'] as const;

const textLink =
  'inline-flex min-h-11 items-center gap-2 text-petit font-medium text-accent underline-offset-4 transition-colors duration-courte ease-tenga hover:text-accent-survol hover:underline';

// Section à deux colonnes : titre en début de ligne, contenu en fin de ligne.
function Section({
  id,
  titre,
  intro,
  children
}: {
  id: string;
  titre: string;
  intro?: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <section
      aria-labelledby={id}
      className='grid gap-x-8 gap-y-6 border-t border-trait pb-16 pt-10 lg:grid-cols-12 lg:pb-24 lg:pt-12'
    >
      <div className='lg:col-span-4'>
        <h2 id={id} className='max-w-[16em] text-titre-section text-encre'>
          {titre}
        </h2>
        {intro && <p className='mt-3 max-w-[30em] text-texte-2'>{intro}</p>}
      </div>
      <div className='lg:col-span-8'>{children}</div>
    </section>
  );
}

export async function HomeSections({
  locale
}: HomeSectionProps): Promise<ReactElement> {
  const h = await getTranslations({ locale, namespace: 'home' });
  const f = await getTranslations({ locale, namespace: 'faq' });
  const n = (value: number): string => formatNombre(value, locale);

  const research = ['structure', 'work', 'groups'] as const;
  const limits = ['diagnosis', 'exam', 'mirror', 'sorting'] as const;
  const steps = ['answer', 'read', 'keep'] as const;

  return (
    <>
      <Section id='enjeu' titre={h('stake.title')}>
        <p className='max-w-[26em] text-titre-2 font-medium text-encre'>
          {h('stake.problem')}
        </p>
        <p className='mt-6 max-w-[38em] text-chapo text-texte-2'>
          {h('stake.answer')}
        </p>
      </Section>

      <Section
        id='recherche-titre'
        titre={h('research.title')}
        intro={h('research.intro')}
      >
        <ul role='list' className='divide-y divide-trait border-y border-trait'>
          {research.map((key) => (
            <li
              key={key}
              className='grid gap-2 py-5 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-8'
            >
              <h3 className='text-titre-3 text-encre'>
                {h(`research.${key}.title`)}
              </h3>
              <p className='colonne-lecture text-texte-2'>
                {h(`research.${key}.text`)}
              </p>
            </li>
          ))}
        </ul>
        <p className='mt-4'>
          <Link href='/methode' className={textLink}>
            {h('research.link')}
            <ArrowRightIcon size={18} />
          </Link>
        </p>
      </Section>

      <Section
        id='limites-titre'
        titre={h('limits.title')}
        intro={h('limits.intro')}
      >
        <ul
          role='list'
          className='grid gap-x-8 border-t border-trait sm:grid-cols-2'
        >
          {limits.map((key) => (
            <li key={key} className='border-b border-trait py-5'>
              <h3 className='text-titre-3 text-encre'>
                {h(`limits.${key}.title`)}
              </h3>
              <p className='mt-2 text-texte-2'>{h(`limits.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id='confiance-titre' titre={h('trust.title')}>
        <p className='max-w-[34em] text-chapo text-texte-2'>
          {h('trust.text')}
        </p>
      </Section>

      <Section
        id='deroulement-titre'
        titre={h('how.title')}
        intro={h('how.intro')}
      >
        {/* Une vraie suite d'étapes : la numérotation porte l'ordre. */}
        <ol role='list' className='grid gap-8 md:grid-cols-3 md:gap-6'>
          {steps.map((key, index) => (
            <li key={key} className='border-t-2 border-accent pt-4'>
              <span
                aria-hidden='true'
                className='chiffres text-petit font-medium text-texte-3'
              >
                {n(index + 1)}
              </span>
              <h3 className='mt-1 text-titre-3 text-encre'>
                {h(`how.${key}.title`)}
              </h3>
              <p className='mt-2 text-texte-2'>{h(`how.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id='facteurs-titre'
        titre={h('factors.title')}
        intro={h('method.measured')}
      >
        <dl className='grid gap-x-8 border-t border-trait sm:grid-cols-2'>
          {domainCodes.map((code) => (
            <div key={code} className='border-b border-trait py-5'>
              <dt className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                <span className='text-titre-3 text-encre'>
                  {domainLabel(code, locale, 'long')}
                </span>
                <span className='text-legende text-texte-3'>
                  {h('factors.facets')}
                </span>
              </dt>
              <dd className='mt-2 text-texte-2'>{h(`factors.${code}`)}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id='provenance-titre' titre={h('reference.title')}>
        <p className='colonne-lecture text-chapo text-texte-2'>
          {h('reference.text')}
        </p>
        <p className='mt-3 flex flex-wrap gap-x-6'>
          <a
            href='https://ipip.ori.org'
            rel='noopener noreferrer'
            target='_blank'
            className={textLink}
          >
            <bdi dir='ltr'>ipip.ori.org</bdi>
          </a>
          <Link href='/methode' className={textLink}>
            {h('reference.methodLink')}
          </Link>
        </p>
        <div className='mt-10 border-t border-trait pt-6'>
          <h3 className='text-titre-3 text-encre'>{h('languages.title')}</h3>
          <p className='mt-2 text-texte-2'>{h('languages.text')}</p>
          <ul role='list' className='mt-4 flex flex-wrap gap-2'>
            {languages.map((language) => (
              <li
                key={language.code}
                lang={language.code}
                className='rounded-controle border border-trait-fort px-4 py-2 font-medium text-encre'
              >
                {language.name}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id='faq-titre' titre={h('faq.title')}>
        <div className='divide-y divide-trait border-y border-trait'>
          {faqKeys.map((key) => (
            <details key={key} className='group'>
              <summary className='flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-titre-3 text-encre transition-colors duration-courte ease-tenga hover:text-accent [&::-webkit-details-marker]:hidden'>
                <span>{f(`${key}.question`)}</span>
                <svg
                  aria-hidden='true'
                  focusable='false'
                  viewBox='0 0 24 24'
                  width='20'
                  height='20'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.75'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='flex-none text-texte-3 transition-transform duration-normale ease-tenga group-open:rotate-180 motion-reduce:transition-none'
                >
                  <path d='m6 9 6 6 6-6' />
                </svg>
              </summary>
              <p className='colonne-lecture pb-5 text-texte-2'>
                {f(`${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
        <p className='mt-4'>
          <Link href='/faq' className={textLink}>
            {h('faq.all')}
            <ArrowRightIcon size={18} />
          </Link>
        </p>
      </Section>
    </>
  );
}

// Signature et appel final : la phrase de marque, puis le questionnaire pour
// soi et la présentation pour une organisation. Une règle d'accent pleine
// largeur ferme la page, sans animation (le seul tracé est celui du spécimen).
export async function HomeClosing({
  locale
}: HomeSectionProps): Promise<ReactElement> {
  const h = await getTranslations({ locale, namespace: 'home' });
  const c = await getTranslations({ locale, namespace: 'common' });
  const t = await getTranslations({ locale, namespace: 'frontpage' });
  const p = await getTranslations({ locale, namespace: 'presentation' });

  return (
    <section
      aria-labelledby='signature'
      className='border-t-2 border-accent pt-12'
    >
      <h2 id='signature' className='text-titre-1 text-encre'>
        {c('signature')}
      </h2>
      <p className='mt-4 max-w-[36em] text-chapo text-texte-2'>
        {h('closing.text')}
      </p>
      <div className='mt-8 flex flex-wrap gap-3'>
        <Link href='/test' className={boutonPrincipal()}>
          {t('call_to_action')}
          <ArrowRightIcon size={18} />
        </Link>
        <Link href='/presentation' className={secondaryButtonClass}>
          {p('cta')}
        </Link>
      </div>
    </section>
  );
}
