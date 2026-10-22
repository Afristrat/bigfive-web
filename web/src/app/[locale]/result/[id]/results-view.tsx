import { Report } from '@/actions';
import { useTranslations } from 'next-intl';
import { title } from '@/components/primitives';
import { secondaryButtonClass } from '@/components/form-styles';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import { domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatDate, formatNombre } from '@/lib/format';
import { Link } from '@/navigation';
import { CopyId } from './copy-id';
import { ScoreValue } from './domain';
import { PrintButton } from './print-button';
import { ResultBody } from './result-body';
import { ResultMotion } from './result-motion';
import { ResultRail } from './result-rail';
import styles from './result.module.css';

// Vue du résultat, séparée de la page qui charge le rapport.
interface ResultsProps {
  report: Report;
  locale: string;
  showExpanded: boolean;
}

// Panneau (direction § 8.5) : surface, filet, rayon 10 px, sans ombre.
const carte = 'carte';

export const Results = ({ report, locale, showExpanded }: ResultsProps) => {
  const t = useTranslations('results');
  const f = useTranslations('flow');
  const level: Record<string, string> = {
    low: t('level.low'),
    neutral: t('level.neutral'),
    high: t('level.high')
  };
  const domainOutOf = t('outOf', { max: formatNombre(120, locale) });
  // Ordre fixe N, E, O, A, C : celui du radar et de la liste.
  const domains = domainCodes.flatMap((code) => {
    const domain = report.results.find((item) => item.domain === code);
    return domain ? [{ code, domain }] : [];
  });

  return (
    <ResultMotion locale={locale}>
      <header>
        <h1 className={`${title()} ${styles.titre}`}>{t('title')}</h1>
        <p className={`mt-2 text-petit text-texte-3 ${styles['sous-titre']}`}>
          {formatDate(report.timestamp, locale)}
        </p>
        <p
          className={`mt-6 colonne-lecture text-chapo text-texte-2 ${styles.chapo}`}
        >
          {t('intro')}
        </p>
      </header>

      <ResultRail
        label={f('railLabel')}
        items={[
          { id: 'profil', label: f('railProfile') },
          { id: 'scores', label: f('railScores') },
          { id: 'facettes', label: f('railDetail') },
          { id: 'identifiant', label: f('railId') }
        ]}
      />

      <div className='mt-8 grid gap-4 lg:grid-cols-[11fr_10fr]'>
        <section
          id='profil'
          aria-labelledby='radar-titre'
          className={`${carte} scroll-mt-32 ${styles['carte-profil']}`}
        >
          <h2 id='radar-titre' className='text-titre-2 text-encre'>
            {t('factorsTitle')}
          </h2>
          {domains.length === 5 && (
            <RadarChart
              className='mt-4'
              domains={domains.map(({ code, domain }) => ({
                code,
                label: domainLabel(code, locale, 'short'),
                value: domain.score
              }))}
              min={24}
              max={120}
              locale={locale}
              title={t('radar.title')}
              summary={t('radar.summary', {
                min: formatNombre(24, locale),
                max: formatNombre(120, locale)
              })}
              columnLabels={{
                domain: t('radar.domain'),
                score: t('radar.score')
              }}
            />
          )}
          <p className='mt-4 text-center text-legende text-texte-3'>
            {t('scales', {
              domainMin: formatNombre(24, locale),
              domainMax: formatNombre(120, locale),
              facetMin: formatNombre(4, locale),
              facetMax: formatNombre(20, locale)
            })}
          </p>
        </section>

        <section
          id='scores'
          data-revele
          aria-label={t('factorsTitle')}
          className={`${carte} scroll-mt-32 ${styles['carte-scores']}`}
        >
          <ul className='flex flex-col divide-y divide-trait'>
            {domains.map(({ code, domain }, index) => (
              <li
                key={code}
                className={`break-inside-avoid py-5 first:pt-0 last:pb-0 ${styles.facteur}`}
                style={{ ['--i' as string]: index }}
              >
                <div className='flex items-baseline gap-3'>
                  <span className='text-corps font-semibold text-encre'>
                    {domainLabel(code, locale, 'short')}
                  </span>
                  {level[domain.scoreText] && (
                    <span className='text-petit font-medium text-texte-2'>
                      {level[domain.scoreText]}
                    </span>
                  )}
                  <span className='ms-auto'>
                    <ScoreValue
                      valeur={formatNombre(domain.score, locale)}
                      compte={domain.score}
                      max={formatNombre(120, locale)}
                      spoken={`${t('radar.score')} ${formatNombre(domain.score, locale)} ${domainOutOf}`}
                    />
                  </span>
                </div>
                <div className='mt-2'>
                  <ScoreBar
                    score={domain.score}
                    min={24}
                    max={120}
                    anime
                    gradue
                    rang={index}
                  />
                </div>
                <p className='mt-2 text-petit text-texte-2'>
                  {domain.shortDescription}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ResultBody
        results={report.results}
        locale={locale}
        showExpanded={showExpanded}
        labels={{
          detailTitle: t('detailTitle'),
          detailHint: t('detailHint'),
          facets: t('facets'),
          learnMore: t('learnMore'),
          neuroticismGloss: t('neuroticismGloss'),
          score: t('radar.score'),
          domainOutOf,
          facetOutOf: t('outOf', { max: formatNombre(20, locale) }),
          level
        }}
      />

      <div id='identifiant' data-revele className='scroll-mt-32'>
        <CopyId
          id={report.id}
          title={t('idLabel')}
          hint={t('idHint')}
          copyLabel={t('copyId')}
          copiedLabel={t('copied')}
        />
      </div>

      <div className='mt-6 flex flex-wrap gap-3 print:hidden'>
        <PrintButton label={t('print')} />
        <Link href='/' className={secondaryButtonClass}>
          {t('backHome')}
        </Link>
      </div>
    </ResultMotion>
  );
};
