// Sections de la page d'accueil sous l'ouverture (identité « encre et safran »),
// rythmées comme un relevé : le point de départ en grandes lignes révélées, les
// trois temps sous de grands numéros, le pic où un profil se forme facteur
// après facteur avec ses six facettes, ce que la recherche établit, le bandeau
// de ce que le questionnaire ne fera pas, le tiers de confiance, la fiche de
// l'instrument (validation comprise), la FAQ courte, puis l'appel final.
// Composants serveur ; seuls le pic (profile-forming) et le moteur de
// mouvement global sont des composants client. Tout le texte est dans le HTML.
import { CSSProperties, ReactElement, ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { ProfileForming } from '@/components/home/profile-forming';
import { ratioDeScore } from '@/components/home/pentagone';
import {
  DomainCode,
  domainCodes,
  domainLabel,
  facetLabel
} from '@/lib/domain-labels';
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
const facettes = [1, 2, 3, 4, 5, 6] as const;

// Profil d'exemple du pic : valeurs fictives, annoncées comme telles.
const profilPic: Record<DomainCode, number> = {
  O: 101,
  C: 84,
  E: 63,
  A: 92,
  N: 49
};

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

const textLink =
  'lien-fleche inline-flex min-h-11 items-center gap-2 text-petit font-medium text-accent underline-offset-4 transition-colors duration-courte ease-tenga hover:text-accent-survol hover:underline';

// Repère de section : un losange safran et un intitulé court. Porte le titre
// de la section quand le texte qui suit est l'énoncé principal.
export function Repere({
  id,
  children,
  sombre = false
}: {
  id?: string;
  children: ReactNode;
  sombre?: boolean;
}): ReactElement {
  return (
    <h2
      id={id}
      className={`flex items-center gap-3 text-petit font-medium [font-family:var(--font-texte)] ${sombre ? 'text-fond/80' : 'text-texte-2'}`}
    >
      <span
        aria-hidden='true'
        className='block size-2 flex-none rotate-45 bg-safran'
      />
      {children}
    </h2>
  );
}

// Titre cinétique : chaque mot dans son masque. Le texte reste un seul titre
// pour les lecteurs d'écran ; sans animation, les mots sont simplement posés.
export function MotsCinetiques({ texte }: { texte: string }): ReactElement {
  const mots = texte.split(/\s+/).filter(Boolean);
  return (
    <>
      {mots.map((mot, i) => (
        <span key={`${mot}-${i}`}>
          <span className='mot'>
            <span style={rang(i)}>{mot}</span>
          </span>
          {i < mots.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}

// Phrases d'un paragraphe, pour les révéler ligne à ligne.
const phrases = (texte: string): string[] =>
  texte.split(/(?<=[.!?؟])\s+/).filter(Boolean);

export async function HomeSections({
  locale
}: HomeSectionProps): Promise<ReactElement> {
  const h = await getTranslations({ locale, namespace: 'home' });
  const f = await getTranslations({ locale, namespace: 'faq' });
  const t = await getTranslations({ locale, namespace: 'frontpage' });
  const n = (value: number): string => formatNombre(value, locale);

  const research = ['structure', 'work', 'groups'] as const;
  const limits = ['diagnosis', 'exam', 'mirror', 'sorting'] as const;
  const steps = ['answer', 'read', 'keep'] as const;
  const depart = phrases(h('stake.problem'));
  const fiche: ReadonlyArray<{ terme: string; valeur: ReactNode }> = [
    { terme: h('sheet.inventory'), valeur: h('sheet.inventoryValue') },
    { terme: h('sheet.origin'), valeur: h('sheet.originValue') },
    { terme: h('sheet.status'), valeur: h('sheet.statusValue') },
    {
      terme: h('sheet.content'),
      valeur: h('sheet.contentValue', {
        items: n(120),
        factors: n(5),
        facets: n(30)
      })
    },
    {
      terme: h('sheet.languages'),
      valeur: (
        <span className='flex flex-wrap gap-x-4'>
          {languages.map((language) => (
            <span key={language.code} lang={language.code}>
              {language.name}
            </span>
          ))}
        </span>
      )
    },
    { terme: h('sheet.duration'), valeur: h('sheet.durationValue') },
    { terme: h('sheet.wording'), valeur: h('sheet.wordingValue') }
  ];

  return (
    <>
      {/* Le point de départ : trois situations courtes, révélées par masque,
          puis la phrase qui les relie, en retrait. */}
      <section
        aria-labelledby='depart'
        className='grid gap-y-8 border-t border-trait py-20 lg:grid-cols-12 lg:py-32'
      >
        <div className='lg:col-span-3'>
          <Repere id='depart'>{h('stake.title')}</Repere>
        </div>
        <div className='lg:col-span-9'>
          <p className='font-display text-geant text-encre'>
            {depart.map((phrase, i) => (
              <span
                key={phrase}
                data-reveal='masque'
                style={rang(i * 2)}
                className={
                  i === depart.length - 1
                    ? 'mt-6 block text-texte-2 lg:ms-[12%]'
                    : 'block'
                }
              >
                {phrase}
              </span>
            ))}
          </p>
          <div className='mt-14 grid gap-6 md:grid-cols-12'>
            <span
              aria-hidden='true'
              data-reveal='volet'
              className='mt-3 block h-[3px] w-24 bg-safran md:col-span-3 md:w-full'
            />
            <p
              data-reveal='monte'
              className='max-w-[36em] text-chapo text-texte-2 md:col-span-8 md:col-start-5'
            >
              {h('stake.answer')}
            </p>
          </div>
        </div>
      </section>

      {/* Trois temps : titre épinglé à gauche, grands numéros à droite, chaque
          ligne réglée par un filet qui se trace. */}
      <section
        aria-labelledby='temps-titre'
        className='grid gap-x-12 gap-y-10 border-t border-trait py-16 lg:grid-cols-12 lg:py-24'
      >
        <div className='lg:col-span-4'>
          <div className='lg:sticky lg:top-24'>
            <h2 id='temps-titre' className='text-geant text-encre'>
              {h('how.title')}
            </h2>
            <p className='mt-5 max-w-[30em] text-chapo text-texte-2'>
              {h('how.intro')}
            </p>
          </div>
        </div>
        <ol role='list' className='lg:col-span-8'>
          {steps.map((key, index) => (
            <li
              key={key}
              data-reveal='monte'
              style={rang(index)}
              className='relative grid grid-cols-[4.5rem_1fr] gap-x-5 py-8 sm:grid-cols-[7rem_1fr] sm:gap-x-8 lg:py-10'
            >
              <span
                aria-hidden='true'
                style={rang(index)}
                className='barre-reglee absolute inset-x-0 top-0 block h-px bg-encre'
              />
              <span
                aria-hidden='true'
                style={rang(index)}
                className='temps-numero chiffres font-display text-[clamp(3.5rem,2.4rem+4vw,6.5rem)] font-semibold leading-[0.85] tracking-[-0.04em] text-trait-fort'
              >
                {n(index + 1)}
              </span>
              <div>
                <h3 className='text-titre-1 text-encre'>
                  {h(`how.${key}.title`)}
                </h3>
                <p className='mt-3 max-w-[34em] text-chapo text-texte-2'>
                  {h(`how.${key}.text`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Le pic : un profil se forme, facteur après facteur, avec ses facettes. */}
      <ProfileForming
        titre={h('factors.title')}
        intro={h('method.measured')}
        lead={h('peak.lead')}
        legende={h('specimenTag')}
        ratios={domainCodes.map((code) => ratioDeScore(profilPic[code]))}
        etapes={domainCodes.map((code) => ({
          code,
          nom: domainLabel(code, locale, 'long'),
          nomCourt: domainLabel(code, locale, 'short'),
          texte: h(`factors.${code}`),
          mention: h('factors.facets'),
          facettes: facettes.map((facet) => facetLabel(code, facet, locale))
        }))}
      />

      {/* Ce que la recherche établit : trois constats numérotés, sans en
          forcer la portée, et le lien vers les références complètes. */}
      <section
        aria-labelledby='recherche-titre'
        className='grid gap-x-12 gap-y-10 border-t border-trait py-16 lg:grid-cols-12 lg:py-24'
      >
        <div className='lg:col-span-5'>
          <h2
            id='recherche-titre'
            className='max-w-[14em] text-titre-1 text-encre'
          >
            {h('research.title')}
          </h2>
          <p className='mt-4 max-w-[30em] text-chapo text-texte-2'>
            {h('research.intro')}
          </p>
          <p className='mt-4'>
            <Link href='/methode' className={textLink}>
              {h('research.link')}
              <ArrowRightIcon size={18} />
            </Link>
          </p>
        </div>
        <ol role='list' className='border-t-2 border-encre lg:col-span-7'>
          {research.map((key, i) => (
            <li
              key={key}
              data-reveal='monte'
              style={rang(i)}
              className='grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-trait py-7'
            >
              <span
                aria-hidden='true'
                className='chiffres pt-0.5 text-petit font-medium text-texte-3'
              >
                {n(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className='text-titre-2 text-encre'>
                  {h(`research.${key}.title`)}
                </h3>
                <p className='mt-2 max-w-[38em] text-texte-2'>
                  {h(`research.${key}.text`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Ce que le questionnaire ne fera pas : le seul bandeau d'encre au
          milieu de la page, pour que les refus se lisent autant que l'offre. */}
      <section
        aria-labelledby='limites-titre'
        className='rounded-panneau bg-encre px-6 py-14 text-fond md:px-12 md:py-20'
      >
        <div className='grid gap-x-12 gap-y-6 lg:grid-cols-12'>
          <h2
            id='limites-titre'
            data-reveal='masque'
            className='text-geant lg:col-span-7'
          >
            {h('limits.title')}
          </h2>
          <p className='text-chapo text-fond/80 lg:col-span-4 lg:col-start-9 lg:self-end'>
            {h('limits.intro')}
          </p>
        </div>
        <ul role='list' className='mt-12 grid gap-x-12 md:grid-cols-2'>
          {limits.map((key, i) => (
            <li
              key={key}
              data-reveal='monte'
              style={rang(i)}
              className='relative grid grid-cols-[1.75rem_1fr] gap-x-3 py-7'
            >
              <span
                aria-hidden='true'
                style={rang(i)}
                className='barre-reglee absolute inset-x-0 top-0 block h-px bg-fond/30'
              />
              <svg
                aria-hidden='true'
                focusable='false'
                viewBox='0 0 24 24'
                width='20'
                height='20'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                className='mt-1 text-safran'
              >
                <path d='M6 6l12 12M18 6L6 18' />
              </svg>
              <div>
                <h3 className='text-titre-3'>{h(`limits.${key}.title`)}</h3>
                <p className='mt-2 text-fond/80'>{h(`limits.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Le tiers de confiance : une seule phrase forte, tenue par un filet. */}
      <section
        aria-labelledby='confiance-titre'
        className='grid gap-y-8 py-20 lg:grid-cols-12 lg:py-32'
      >
        <div className='lg:col-span-3'>
          <Repere id='confiance-titre'>{h('trust.title')}</Repere>
        </div>
        <p
          data-reveal='monte'
          className='border-s-[3px] border-safran ps-6 font-display text-titre-1 font-medium text-encre lg:col-span-9 lg:ps-10'
        >
          {h('trust.text')}
        </p>
      </section>

      {/* Fiche de l'instrument : de quoi vérifier, validation comprise. */}
      <section
        aria-labelledby='fiche-titre'
        className='grid gap-x-12 gap-y-10 border-t border-trait py-16 lg:grid-cols-12 lg:py-24'
      >
        <div className='lg:col-span-4'>
          <h2 id='fiche-titre' className='text-titre-1 text-encre'>
            {h('sheet.title')}
          </h2>
          <p className='mt-4 max-w-[28em] text-chapo text-texte-2'>
            {h('sheet.intro')}
          </p>
          <p className='mt-3'>
            <Link href='/methode' className={textLink}>
              {h('reference.methodLink')}
              <ArrowRightIcon size={18} />
            </Link>
          </p>
        </div>
        <div className='lg:col-span-8'>
          <dl className='border-t-2 border-encre'>
            {fiche.map((ligne, i) => (
              <div
                key={ligne.terme}
                data-reveal='monte'
                style={rang(i)}
                className='grid gap-x-6 gap-y-1 border-b border-trait py-4 sm:grid-cols-[13rem_1fr]'
              >
                <dt className='text-petit font-medium text-texte-3'>
                  {ligne.terme}
                </dt>
                <dd className='text-encre'>{ligne.valeur}</dd>
              </div>
            ))}
            <div
              data-reveal='monte'
              style={rang(fiche.length)}
              className='mt-4 grid gap-x-6 gap-y-1 rounded-panneau bg-avis-doux px-4 py-4 sm:grid-cols-[13rem_1fr] sm:px-0 sm:ps-0'
            >
              <dt className='text-petit font-semibold text-avis sm:ps-4'>
                {h('sheet.validation')}
              </dt>
              <dd className='text-encre sm:pe-4'>
                {h('sheet.validationValue')}
              </dd>
            </div>
          </dl>
          <p className='mt-6 max-w-[44em] text-petit text-texte-3 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2'>
            {t.rich('description.reference', {
              ipip: (chunks) => (
                <a
                  href='https://ipip.ori.org'
                  rel='noopener noreferrer'
                  target='_blank'
                >
                  {chunks}
                </a>
              )
            })}
          </p>
        </div>
      </section>

      <section
        aria-labelledby='faq-titre'
        className='grid gap-x-12 gap-y-6 border-t border-trait py-16 lg:grid-cols-12 lg:py-24'
      >
        <h2
          id='faq-titre'
          className='max-w-[12em] text-titre-1 text-encre lg:col-span-4'
        >
          {h('faq.title')}
        </h2>
        <div className='lg:col-span-8'>
          <div className='divide-y divide-trait border-y border-trait'>
            {faqKeys.map((key) => (
              <details key={key} className='group'>
                <summary className='flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-titre-3 text-encre transition-colors duration-courte ease-tenga hover:text-accent [&::-webkit-details-marker]:hidden'>
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
                    className='flex-none text-texte-3 transition-transform duration-normale ease-tenga group-open:rotate-45 motion-reduce:transition-none'
                  >
                    <path d='M12 5v14M5 12h14' />
                  </svg>
                </summary>
                <p className='colonne-lecture pb-6 text-texte-2'>
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
        </div>
      </section>
    </>
  );
}

// Signature et appel final : le pentagone se ferme une dernière fois autour de
// la phrase de marque, puis les deux actions, aimantées au pointeur.
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
      data-reveal='trace'
      className='relative overflow-hidden rounded-panneau bg-encre px-6 py-16 text-fond md:px-12 md:py-28'
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 600 600'
        className='pointer-events-none absolute -bottom-24 -end-20 w-[300px] opacity-90 md:-end-10 md:bottom-auto md:top-1/2 md:w-[460px] md:-translate-y-1/2'
      >
        <polygon
          points='300,40 547,220 453,510 147,510 53,220'
          pathLength={1}
          className='trace-svg fill-none stroke-safran'
          strokeWidth='3'
          strokeLinejoin='round'
        />
      </svg>
      <div className='relative max-w-[42rem]'>
        <h2 id='signature' className='text-display'>
          {c('signature')}
        </h2>
        <p className='mt-6 max-w-[34em] text-chapo text-fond/80'>
          {h('closing.text')}
        </p>
        <div className='mt-10 flex flex-wrap gap-3'>
          <Link
            href='/test'
            data-aimant=''
            className='appui inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-controle bg-safran px-6 font-semibold text-[#14182B] hover:bg-fond'
          >
            {t('call_to_action')}
            <ArrowRightIcon size={18} />
          </Link>
          <Link
            href='/presentation'
            data-aimant=''
            className='appui inline-flex min-h-12 items-center justify-center rounded-controle border border-fond/40 px-6 font-medium hover:bg-fond/10'
          >
            {p('cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
