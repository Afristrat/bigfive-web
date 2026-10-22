// Sections de la page d'accueil sous l'ouverture (identité « encre et safran ») :
// l'enjeu en grandes lignes révélées, le déroulement relié par un fil qui se
// trace, ce que le questionnaire mesure et ne mesure pas, le pic où un profil
// se forme facteur après facteur, le tiers de confiance et la provenance avec
// leurs chiffres réels, la FAQ courte, puis la signature et l'appel final.
// Composants serveur ; seuls le pic (profile-forming) et le moteur de
// mouvement global sont des composants client. Tout le texte est dans le HTML.
import { CSSProperties, ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { ProfileForming } from '@/components/home/profile-forming';
import { ratioDeScore } from '@/components/home/pentagone';
import { DomainCode, domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre, localeRegionale } from '@/lib/format';
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
  const n = (value: number): string => formatNombre(value, locale);
  const regionale = localeRegionale(locale);

  const research = ['structure', 'work', 'groups'] as const;
  const limits = ['diagnosis', 'exam', 'mirror', 'sorting'] as const;
  const steps = ['answer', 'read', 'keep'] as const;
  const enjeu = phrases(h('stake.problem'));
  const chiffres = [
    { valeur: 120, label: h('figures.items') },
    { valeur: 5, label: h('figures.factors') },
    { valeur: 30, label: h('figures.facets') },
    { valeur: 3, label: h('figures.languages') }
  ];

  return (
    <>
      {/* L'enjeu : trois phrases courtes, révélées par masque, la dernière en
          retrait vers la fin de ligne. */}
      <section
        aria-labelledby='enjeu'
        className='border-t border-trait py-16 lg:py-28'
      >
        <h2
          id='enjeu'
          className='text-petit font-medium text-texte-3 [font-family:var(--font-texte)]'
        >
          {h('stake.title')}
        </h2>
        <p className='mt-6 text-geant text-encre font-display'>
          {enjeu.map((phrase, i) => (
            <span
              key={phrase}
              data-reveal='masque'
              style={rang(i * 2)}
              className={
                i === enjeu.length - 1
                  ? 'mt-4 block text-texte-2 lg:ms-[16%]'
                  : 'block'
              }
            >
              {phrase}
            </span>
          ))}
        </p>
        <div className='mt-12 grid gap-6 lg:grid-cols-12'>
          <span
            aria-hidden='true'
            data-reveal='volet'
            className='mt-4 block h-[3px] w-full bg-safran lg:col-span-3'
          />
          <p
            data-reveal='monte'
            className='max-w-[36em] text-chapo text-texte-2 lg:col-span-7 lg:col-start-5'
          >
            {h('stake.answer')}
          </p>
        </div>
      </section>

      {/* Comment cela se passe : trois étapes reliées par un fil tracé. */}
      <section
        aria-labelledby='deroulement-titre'
        className='border-t border-trait py-16 lg:py-24'
      >
        <div className='grid gap-6 lg:grid-cols-12'>
          <h2
            id='deroulement-titre'
            className='text-titre-section text-encre lg:col-span-5'
          >
            {h('how.title')}
          </h2>
          <p className='text-chapo text-texte-2 lg:col-span-5 lg:col-start-7'>
            {h('how.intro')}
          </p>
        </div>
        <div data-reveal='trace' className='relative mt-12'>
          <span
            aria-hidden='true'
            className='barre-verticale absolute start-[7px] top-2 block h-[calc(100%-1rem)] w-0.5 bg-safran md:hidden'
          />
          <span
            aria-hidden='true'
            className='barre-reglee absolute inset-x-0 top-[7px] hidden h-0.5 bg-safran md:block'
          />
          <ol role='list' className='grid gap-10 md:grid-cols-3 md:gap-8'>
            {steps.map((key, index) => (
              <li
                key={key}
                data-reveal='monte'
                style={rang(index * 3 + 2)}
                className='relative ps-8 md:ps-0 md:pt-10'
              >
                <span
                  aria-hidden='true'
                  className='absolute start-0 top-0 block size-4 rotate-45 border-2 border-safran bg-fond'
                />
                <span
                  aria-hidden='true'
                  className='chiffres font-display text-geant leading-none text-trait-fort'
                >
                  {n(index + 1)}
                </span>
                <h3 className='mt-3 text-titre-2 text-encre'>
                  {h(`how.${key}.title`)}
                </h3>
                <p className='mt-2 text-texte-2'>{h(`how.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Ce que dit la recherche, face à ce que le questionnaire ne fait pas. */}
      <section
        aria-labelledby='recherche-titre'
        className='border-t border-trait py-16 lg:py-24'
      >
        <div className='grid gap-x-16 gap-y-16 lg:grid-cols-2'>
          <div>
            <h2
              id='recherche-titre'
              className='max-w-[18em] text-titre-section text-encre'
            >
              {h('research.title')}
            </h2>
            <p className='mt-3 max-w-[32em] text-texte-2'>
              {h('research.intro')}
            </p>
            <ul role='list' className='mt-8 border-t-2 border-encre'>
              {research.map((key, i) => (
                <li
                  key={key}
                  data-reveal='monte'
                  style={rang(i)}
                  className='border-b border-trait py-6'
                >
                  <h3 className='text-titre-3 text-encre'>
                    {h(`research.${key}.title`)}
                  </h3>
                  <p className='mt-2 text-texte-2'>
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
          </div>
          <div className='lg:pt-24'>
            <h2
              id='limites-titre'
              className='max-w-[18em] text-titre-section text-encre'
            >
              {h('limits.title')}
            </h2>
            <p className='mt-3 max-w-[32em] text-texte-2'>
              {h('limits.intro')}
            </p>
            <ul role='list' className='mt-8'>
              {limits.map((key, i) => (
                <li
                  key={key}
                  data-reveal='monte'
                  style={rang(i)}
                  className='relative py-6'
                >
                  <span
                    aria-hidden='true'
                    style={rang(i)}
                    className='barre-reglee absolute inset-x-0 top-0 block h-px bg-trait-fort'
                  />
                  <h3 className='text-titre-3 text-encre'>
                    {h(`limits.${key}.title`)}
                  </h3>
                  <p className='mt-2 text-texte-2'>{h(`limits.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Le pic : un profil se forme, facteur après facteur. */}
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
          mention: h('factors.facets')
        }))}
      />

      {/* Pour qui : le tiers de confiance, puis la provenance chiffrée. */}
      <section
        aria-labelledby='confiance-titre'
        className='border-t border-trait py-16 lg:py-28'
      >
        <div className='grid gap-8 lg:grid-cols-12'>
          <h2
            id='confiance-titre'
            className='text-titre-section text-encre lg:col-span-4'
          >
            {h('trust.title')}
          </h2>
          <p
            data-reveal='masque'
            className='font-display text-titre-1 font-medium text-encre lg:col-span-8'
          >
            {h('trust.text')}
          </p>
        </div>
      </section>

      <section
        aria-labelledby='provenance-titre'
        className='border-t border-trait py-16 lg:py-24'
      >
        <dl className='grid grid-cols-2 gap-x-6 gap-y-10 border-b border-trait pb-12 md:grid-cols-4'>
          {chiffres.map((chiffre, i) => (
            <div
              key={chiffre.label}
              data-reveal='monte'
              style={rang(i)}
              className='flex flex-col-reverse gap-2'
            >
              <dt className='text-petit font-medium text-texte-2'>
                {chiffre.label}
              </dt>
              <dd className='chiffres font-display text-[clamp(3rem,2rem+5vw,6rem)] font-semibold leading-none tracking-[-0.04em] text-encre'>
                <span
                  data-compteur={chiffre.valeur}
                  data-locale={regionale}
                  aria-hidden='true'
                >
                  {n(chiffre.valeur)}
                </span>
                <span className='sr-only'>{n(chiffre.valeur)}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className='mt-12 grid gap-10 lg:grid-cols-12'>
          <div className='lg:col-span-7'>
            <h2 id='provenance-titre' className='text-titre-section text-encre'>
              {h('reference.title')}
            </h2>
            <p className='mt-4 max-w-[38em] text-chapo text-texte-2'>
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
          </div>
          <div className='lg:col-span-4 lg:col-start-9'>
            <h3 className='text-titre-3 text-encre'>{h('languages.title')}</h3>
            <p className='mt-2 text-texte-2'>{h('languages.text')}</p>
            <ul role='list' className='mt-4 grid gap-2'>
              {languages.map((language, i) => (
                <li
                  key={language.code}
                  lang={language.code}
                  data-reveal='volet'
                  style={rang(i)}
                  className='border-b border-trait py-2 font-display text-titre-2 text-encre'
                >
                  {language.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby='faq-titre'
        className='grid gap-x-8 gap-y-6 border-t border-trait py-16 lg:grid-cols-12 lg:py-24'
      >
        <h2
          id='faq-titre'
          className='max-w-[14em] text-titre-section text-encre lg:col-span-4'
        >
          {h('faq.title')}
        </h2>
        <div className='lg:col-span-8'>
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
                    className='flex-none text-texte-3 transition-transform duration-normale ease-tenga group-open:rotate-45 motion-reduce:transition-none'
                  >
                    <path d='M12 5v14M5 12h14' />
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
      className='relative overflow-hidden rounded-panneau bg-encre px-6 py-16 text-fond md:px-12 md:py-24'
    >
      <svg
        aria-hidden='true'
        viewBox='0 0 600 600'
        className='pointer-events-none absolute -bottom-24 -end-20 w-[300px] opacity-90 md:-end-10 md:bottom-auto md:top-1/2 md:w-[440px] md:-translate-y-1/2'
      >
        <polygon
          points='300,40 547,220 453,510 147,510 53,220'
          pathLength={1}
          className='trace-svg fill-none stroke-safran'
          strokeWidth='3'
          strokeLinejoin='round'
        />
      </svg>
      <div className='relative max-w-[40rem]'>
        <h2 id='signature' className='text-geant'>
          {c('signature')}
        </h2>
        <p className='mt-5 max-w-[36em] text-chapo opacity-80'>
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
