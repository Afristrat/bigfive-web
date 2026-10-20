// Sections de la page d'accueil sous l'en-tête (direction B2) : l'enjeu, ce que
// dit la recherche, ce que le questionnaire ne fait pas, comment cela se passe,
// les cinq grands facteurs, la provenance, la FAQ courte, puis la signature et
// l'appel final. Composants serveur : aucun JavaScript client. La FAQ est un
// accordéon natif (details/summary), accessible au clavier et aux lecteurs
// d'écran sans code.
import { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { DomainShape, domainNumber } from '@/components/domain-shape';
import { title } from '@/components/primitives';
import { domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';
import { Link } from '@/navigation';

interface HomeSectionProps {
  locale: string;
}

const section = 'py-[clamp(2.25rem,5vw,4rem)]';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' }
] as const;

const faqKeys = ['science', 'usefulness', 'diagnosis'] as const;

// Boutons du bandeau final, posés sur le fond d'accent : l'anneau de focus passe
// en couleur de texte sur accent pour rester visible sur ce fond.
const closingPrimary =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-controle border-[1.5px] border-sur-accent bg-surface px-[26px] font-bold leading-tight text-encre transition duration-normale ease-tenga hover:bg-creux focus-visible:outline-sur-accent active:translate-y-px motion-reduce:transition-none';

const closingSecondary =
  'inline-flex min-h-[52px] items-center justify-center rounded-controle border-[1.5px] border-sur-accent px-[26px] py-2 text-base font-bold text-sur-accent transition-colors duration-normale hover:bg-sur-accent/15 focus-visible:outline-sur-accent active:translate-y-px motion-reduce:transition-none rtl:font-semibold';

const textLink =
  'inline-flex min-h-11 items-center gap-2 text-petit font-bold text-accent hover:text-accent-survol hover:underline';

// Pastille numérotée : le chiffre est décoratif, l'ordre vient de la liste.
function Index({ value }: { value: string }): ReactElement {
  return (
    <span
      aria-hidden='true'
      className='text-petit font-extrabold tracking-[0.04em] text-accent'
    >
      {value}
    </span>
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
      <section aria-labelledby='enjeu' className={section}>
        <h2
          id='enjeu'
          className='text-petit font-extrabold tracking-[0.04em] text-accent'
        >
          {h('stake.title')}
        </h2>
        <p className='mt-4 max-w-[24em] text-titre-section text-encre'>
          {h('stake.problem')}
        </p>
        <p className='mt-6 max-w-[38em] text-chapo text-texte-2'>
          {h('stake.answer')}
        </p>
      </section>

      <section
        id='recherche'
        aria-labelledby='recherche-titre'
        className={section}
      >
        <h2 id='recherche-titre' className={title({ size: 'section' })}>
          {h('research.title')}
        </h2>
        <p className='mt-2.5 max-w-[40em] text-texte-2'>
          {h('research.intro')}
        </p>
        <ul role='list' className='mt-8 grid gap-3.5 min-[900px]:grid-cols-3'>
          {research.map((key, index) => (
            <li
              key={key}
              className='carte carte-survol apparition flex flex-col gap-3 p-6'
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <Index value={n(index + 1).padStart(2, '0')} />
              <h3 className='text-titre-3 text-encre'>
                {h(`research.${key}.title`)}
              </h3>
              <p className='text-texte-2'>{h(`research.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <p className='mt-5'>
          <Link href='/methode' className={textLink}>
            {h('research.link')}
            <ArrowRightIcon size={18} />
          </Link>
        </p>
      </section>

      <section aria-labelledby='limites-titre' className={section}>
        <h2 id='limites-titre' className={title({ size: 'section' })}>
          {h('limits.title')}
        </h2>
        <p className='mt-2.5 max-w-[40em] text-texte-2'>{h('limits.intro')}</p>
        <ul role='list' className='mt-8 grid gap-3.5 sm:grid-cols-2'>
          {limits.map((key, index) => (
            <li
              key={key}
              className='carte apparition flex items-start gap-4 p-6'
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <span
                aria-hidden='true'
                className='grid size-[46px] flex-none place-items-center rounded-[15px] bg-accent-doux text-accent'
              >
                <svg
                  viewBox='0 0 24 24'
                  width='22'
                  height='22'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.4'
                  strokeLinecap='round'
                  focusable='false'
                >
                  <path d='M6 6l12 12M18 6L6 18' />
                </svg>
              </span>
              <div>
                <h3 className='text-titre-3 text-encre'>
                  {h(`limits.${key}.title`)}
                </h3>
                <p className='mt-2 text-texte-2'>{h(`limits.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby='deroulement-titre' className={section}>
        <h2 id='deroulement-titre' className={title({ size: 'section' })}>
          {h('how.title')}
        </h2>
        <p className='mt-2.5 max-w-[40em] text-texte-2'>{h('how.intro')}</p>
        <ol role='list' className='mt-8 grid gap-3.5 min-[900px]:grid-cols-3'>
          {steps.map((key, index) => (
            <li
              key={key}
              className='carte apparition flex flex-col gap-3 p-6'
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <span
                aria-hidden='true'
                className='grid size-[46px] place-items-center rounded-full bg-accent text-corps font-extrabold text-sur-accent'
              >
                {n(index + 1)}
              </span>
              <h3 className='text-titre-3 text-encre'>
                {h(`how.${key}.title`)}
              </h3>
              <p className='text-texte-2'>{h(`how.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id='facteurs'
        aria-labelledby='facteurs-titre'
        className={section}
      >
        <h2 id='facteurs-titre' className={title({ size: 'section' })}>
          {h('factors.title')}
        </h2>
        <p className='mt-2.5 max-w-[40em] text-texte-2'>
          {h('method.measured')}
        </p>
        <ul
          role='list'
          className='mt-8 grid gap-3.5 sm:grid-cols-2 min-[1000px]:grid-cols-5'
        >
          {domainCodes.map((code, index) => (
            <li
              key={code}
              className='carte carte-survol apparition flex flex-col gap-3 p-6'
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className='flex items-center justify-between'>
                <span
                  aria-hidden='true'
                  className='grid size-[46px] flex-none place-items-center rounded-[15px] bg-accent-doux text-accent'
                >
                  <DomainShape domain={code} />
                </span>
                <span
                  aria-hidden='true'
                  className='text-petit font-extrabold tracking-[0.04em] text-texte-2'
                >
                  {domainNumber(code)}
                </span>
              </div>
              <h3 className='text-titre-3 text-encre'>
                {domainLabel(code, locale, 'short')}
              </h3>
              <p className='text-texte-2'>{h(`factors.${code}`)}</p>
              <p className='mt-auto pt-1.5 text-petit font-bold text-accent'>
                {h('factors.facets')}
              </p>
            </li>
          ))}
        </ul>
        <div className='mt-3.5 grid gap-3.5 min-[800px]:grid-cols-2'>
          <article className='carte'>
            <h3 className='text-titre-3 text-encre'>{h('languages.title')}</h3>
            <p className='mt-1.5 text-texte-2'>{h('languages.text')}</p>
            <ul role='list' className='mt-[18px] flex flex-wrap gap-2.5'>
              {languages.map((language) => (
                <li
                  key={language.code}
                  lang={language.code}
                  className='rounded-[14px] border-[1.5px] border-trait-fort bg-creux px-5 py-2.5 font-bold'
                >
                  {language.name}
                </li>
              ))}
            </ul>
          </article>
          <article className='carte'>
            <h3 className='text-titre-3 text-encre'>{h('reference.title')}</h3>
            <p className='mt-2.5 text-texte-2'>{h('reference.text')}</p>
            <p className='mt-2.5 flex flex-wrap gap-x-6'>
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
          </article>
        </div>
      </section>

      <section aria-labelledby='faq-titre' className={section}>
        <h2 id='faq-titre' className={title({ size: 'section' })}>
          {h('faq.title')}
        </h2>
        <div className='mt-8 divide-y divide-trait rounded-panneau border border-trait bg-surface px-[clamp(1.25rem,3vw,2rem)]'>
          {faqKeys.map((key) => (
            <details key={key} className='group py-1'>
              <summary className='flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-titre-3 text-encre [&::-webkit-details-marker]:hidden'>
                <span>{f(`${key}.question`)}</span>
                <svg
                  aria-hidden='true'
                  focusable='false'
                  viewBox='0 0 24 24'
                  width='22'
                  height='22'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='flex-none text-accent transition-transform duration-normale motion-reduce:transition-none group-open:rotate-180'
                >
                  <path d='m6 9 6 6 6-6' />
                </svg>
              </summary>
              <p className='colonne-lecture pb-4 text-texte-2'>
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
      </section>
    </>
  );
}

// Bandeau de signature et appel final : le même geste qu'en tête de page, le
// questionnaire pour soi, la présentation pour une organisation.
export async function HomeClosing({
  locale
}: HomeSectionProps): Promise<ReactElement> {
  const h = await getTranslations({ locale, namespace: 'home' });
  const c = await getTranslations({ locale, namespace: 'common' });
  const t = await getTranslations({ locale, namespace: 'frontpage' });
  const p = await getTranslations({ locale, namespace: 'presentation' });

  return (
    <section aria-labelledby='signature' className={section}>
      <div className='carte border-accent bg-accent text-center text-sur-accent'>
        <h2 id='signature' className='text-display text-sur-accent'>
          {c('signature')}
        </h2>
        <p className='mx-auto mt-5 max-w-[36em] text-chapo opacity-90'>
          {h('closing.text')}
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-3'>
          <Link href='/test' className={closingPrimary}>
            {t('call_to_action')}
            <ArrowRightIcon />
          </Link>
          <Link href='/presentation' className={closingSecondary}>
            {p('cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
