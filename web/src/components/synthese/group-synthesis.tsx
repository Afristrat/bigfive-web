import type { CSSProperties } from 'react';
import { partDeRegle, MILIEU_DE_REGLE } from '@/components/score-rule';
import { domainLabel } from '@/lib/domain-labels';
import { formatNombre, isoler } from '@/lib/format';
import { niveau } from '@/lib/moteur/niveaux';
import type { Niveau } from '@/lib/moteur/types';
import type { GroupeSynthese, LigneDomaine } from '@/lib/synthese-data';

// Lecture d'une synthèse de groupe : domaines seuls, chiffres posés par la base.
// Le niveau est une lecture de convention du moteur (moyenne du score de domaine
// divisée par ses 24 questions), jamais une comparaison à une population. Aucun
// seuil d'anonymat ici : une ligne absente se lit « non publié », sans effectif.
// L'écart type s'affiche en nombre, sans étiquette de dispersion.
//
// Chaque tableau garde sa sémantique (légende, en-têtes de ligne et de
// colonne) ; la règle graduée sous la moyenne n'en est qu'une image, masquée
// aux lecteurs d'écran, qui se trace quand le groupe entre à l'écran. Dans le
// tableau du groupe, un repère fin situe la moyenne du reste de la campagne.

const QUESTIONS_PAR_DOMAINE = 24;
const ECHELLE_MIN = 24;
const ECHELLE_MAX = 120;

export type SyntheseLabels = {
  /** Mention d'anonymat et de seuil, montrée en tête de la synthèse. */
  anonymat: string;
  groupeCaption: string;
  complementCaption: string;
  /** Légende du repère fin : la moyenne du reste de la campagne. */
  repereComplement: string;
  colDomaine: string;
  colEffectif: string;
  colMoyenne: string;
  colEcartType: string;
  ecartTypeAbsent: string;
  colNiveau: string;
  nonPublie: string;
  complementNonPublie: string;
  complementVide: string;
  sansMoyenne: string;
  dispersion: string;
  /** Contient « {niveau} ». */
  niveauLecture: string;
  niveaux: Record<Niveau, string>;
  aucunGroupe: string;
};

type Traduire = (cle: string, valeurs?: Record<string, string>) => string;

/** Libellés de la synthèse, depuis les espaces « synthese » et « niveaux ». */
export const libellesSynthese = (
  t: Traduire,
  tn: Traduire
): SyntheseLabels => ({
  anonymat: t('anonymat'),
  groupeCaption: t('groupeCaption'),
  complementCaption: t('complementCaption'),
  repereComplement: t('repereComplement'),
  colDomaine: t('colDomaine'),
  colEffectif: t('colEffectif'),
  colMoyenne: t('colMoyenne'),
  colEcartType: t('colEcartType'),
  ecartTypeAbsent: t('ecartTypeAbsent'),
  colNiveau: t('colNiveau'),
  nonPublie: t('nonPublie'),
  complementNonPublie: t('complementNonPublie'),
  complementVide: t('complementVide'),
  sansMoyenne: t('sansMoyenne'),
  dispersion: t('dispersion'),
  niveauLecture: t('niveauLecture', { niveau: '{niveau}' }),
  niveaux: {
    bas: tn('bas'),
    plutot_bas: tn('plutot_bas'),
    milieu: tn('milieu'),
    plutot_haut: tn('plutot_haut'),
    haut: tn('haut')
  },
  aucunGroupe: t('aucunGroupe')
});

type Props = {
  groupes: readonly GroupeSynthese[];
  locale: string;
  labels: SyntheseLabels;
};

const th = 'px-4 py-3 text-start text-legende font-medium text-texte-3';
const td = 'px-4 py-4 align-middle';
const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });
const position = (moyenne: number): string =>
  `${partDeRegle(moyenne, ECHELLE_MIN, ECHELLE_MAX) * 100}%`;

/** Règle graduée de 24 à 120 : trait jusqu'à la moyenne, repère du complément. */
function Regle({
  moyenne,
  repere,
  ordre
}: {
  moyenne: number;
  repere: number | null;
  ordre: number;
}) {
  return (
    <span
      aria-hidden='true'
      className='regle-piste relative mt-2 block h-2 w-full min-w-[7rem] rounded-petit bg-creux ring-1 ring-inset ring-trait-fort'
    >
      <span
        style={{ ...rang(ordre), width: position(moyenne) }}
        className='regle-trait barre-reglee absolute inset-y-0 start-0 rounded-petit bg-accent'
      />
      <span
        className='absolute -inset-y-[3px] w-px bg-trait-fort'
        style={{ insetInlineStart: `${MILIEU_DE_REGLE * 100}%` }}
      />
      {repere !== null && (
        <span
          className='regle-trait absolute -inset-y-[5px] w-[3px] -translate-x-1/2 rounded-full bg-safran ring-2 ring-surface rtl:translate-x-1/2 dark:bg-encre'
          style={{ insetInlineStart: position(repere) }}
        />
      )}
    </span>
  );
}

function Tableau({
  caption,
  titre,
  lignes,
  reperes,
  locale,
  labels
}: {
  /** Nom du tableau, groupe compris : il doit être unique dans la page. */
  caption: string;
  /** Intitulé visible au-dessus du tableau. */
  titre: string;
  lignes: readonly LigneDomaine[];
  /** Moyennes du reste de la campagne, par domaine, pour le repère fin. */
  reperes?: ReadonlyMap<string, number>;
  locale: string;
  labels: SyntheseLabels;
}) {
  return (
    <div className='mt-6'>
      <h3 className='text-titre-3 text-encre'>{titre}</h3>
      <div
        role='region'
        aria-label={caption}
        tabIndex={0}
        className='mt-3 overflow-x-auto rounded-panneau border border-trait'
      >
        <table className='w-full min-w-[600px] text-petit'>
          <caption className='sr-only'>{caption}</caption>
          <thead className='border-b border-trait bg-creux/60'>
            <tr>
              <th scope='col' className={th}>
                {labels.colDomaine}
              </th>
              <th scope='col' className={`${th} w-[34%]`}>
                {labels.colMoyenne}
              </th>
              <th scope='col' className={th}>
                {labels.colEcartType}
              </th>
              <th scope='col' className={th}>
                {labels.colNiveau}
              </th>
              <th scope='col' className={th}>
                {labels.colEffectif}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-trait'>
            {lignes.map((ligne, i) => (
              <tr key={ligne.domaine}>
                <th
                  scope='row'
                  className={`${td} text-start text-corps font-semibold text-encre`}
                >
                  {domainLabel(ligne.domaine, locale)}
                </th>
                {ligne.moyenne === null ? (
                  <td className={`${td} text-texte-2`} colSpan={3}>
                    {labels.sansMoyenne}
                  </td>
                ) : (
                  <>
                    <td className={td}>
                      <span className='chiffres text-titre-3 text-encre'>
                        {formatNombre(ligne.moyenne, locale)}
                      </span>
                      <Regle
                        moyenne={ligne.moyenne}
                        repere={reperes?.get(ligne.domaine) ?? null}
                        ordre={i}
                      />
                    </td>
                    <td className={`${td} chiffres`}>
                      {ligne.ecartType === null ? (
                        <>
                          <span aria-hidden='true'>–</span>
                          <span className='sr-only'>
                            {labels.ecartTypeAbsent}
                          </span>
                        </>
                      ) : (
                        formatNombre(ligne.ecartType, locale)
                      )}
                    </td>
                    <td className={`${td} text-texte-2`}>
                      {labels.niveauLecture.replace(
                        '{niveau}',
                        labels.niveaux[
                          niveau(ligne.moyenne / QUESTIONS_PAR_DOMAINE)
                        ]
                      )}
                    </td>
                  </>
                )}
                <td className={`${td} chiffres text-texte-2`}>
                  {formatNombre(ligne.effectif, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Icône de cadenas (mention d'anonymat), décorative. */
function Cadenas() {
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 20 20'
      width={18}
      height={18}
      fill='none'
      stroke='currentColor'
      strokeWidth={1.6}
      strokeLinecap='round'
      strokeLinejoin='round'
      className='mt-0.5 shrink-0 text-accent'
    >
      <rect x='4' y='9' width='12' height='8' rx='1.5' />
      <path d='M7 9V6.5a3 3 0 0 1 6 0V9' />
    </svg>
  );
}

export function GroupSynthesis({ groupes, locale, labels }: Props) {
  if (groupes.length === 0) {
    return <p className='text-texte-2'>{labels.aucunGroupe}</p>;
  }
  return (
    <div className='flex flex-col gap-8'>
      <p className='flex max-w-[68ch] items-start gap-3 rounded-panneau border border-trait bg-accent-doux/50 px-4 py-3 text-petit text-encre'>
        <Cadenas />
        <span>{labels.anonymat}</span>
      </p>
      {groupes.map((groupe, index) => {
        const titre = locale === 'ar' ? isoler(groupe.nom) : groupe.nom;
        const complementPublie = groupe.complement.some(
          (l) => l.moyenne !== null
        );
        const reperes = new Map(
          groupe.complement.flatMap((l) =>
            l.moyenne === null ? [] : [[l.domaine, l.moyenne] as const]
          )
        );
        return (
          <section
            key={groupe.id}
            aria-labelledby={`groupe-${groupe.id}`}
            data-reveal='monte'
            style={rang(Math.min(index, 3))}
            className='carte'
          >
            <h2
              id={`groupe-${groupe.id}`}
              className='flex items-baseline gap-3 text-titre-2 text-encre [overflow-wrap:anywhere]'
            >
              <span
                aria-hidden='true'
                className='chiffres font-display text-petit font-medium text-texte-3'
              >
                {formatNombre(index + 1, locale).padStart(2, '0')}
              </span>
              <bdi>{titre}</bdi>
            </h2>
            {!groupe.publie ? (
              <p className='mt-4 flex items-start gap-3 text-texte-2'>
                <Cadenas />
                <span>{labels.nonPublie}</span>
              </p>
            ) : (
              <>
                <Tableau
                  caption={`${labels.groupeCaption} (${titre})`}
                  titre={labels.groupeCaption}
                  lignes={groupe.groupe}
                  reperes={complementPublie ? reperes : undefined}
                  locale={locale}
                  labels={labels}
                />
                {complementPublie && (
                  <p className='mt-3 flex items-center gap-2 text-legende text-texte-2'>
                    <span
                      aria-hidden='true'
                      className='inline-block h-3 w-[3px] rounded-full bg-safran dark:bg-encre'
                    />
                    {labels.repereComplement}
                  </p>
                )}
                {groupe.complement.length === 0 ? (
                  <p className='mt-6 text-texte-2'>
                    {labels.complementNonPublie}
                  </p>
                ) : (
                  <>
                    {groupe.complement.every((l) => l.effectif === 0) && (
                      <p className='mt-6 text-texte-2'>
                        {labels.complementVide}
                      </p>
                    )}
                    <Tableau
                      caption={`${labels.complementCaption} (${titre})`}
                      titre={labels.complementCaption}
                      lignes={groupe.complement}
                      locale={locale}
                      labels={labels}
                    />
                  </>
                )}
                <p className='mt-6 border-t border-trait pt-4 text-legende text-texte-2'>
                  {labels.dispersion}
                </p>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
