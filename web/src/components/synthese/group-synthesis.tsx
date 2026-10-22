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

const QUESTIONS_PAR_DOMAINE = 24;

export type SyntheseLabels = {
  groupeCaption: string;
  complementCaption: string;
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

type Props = {
  groupes: readonly GroupeSynthese[];
  locale: string;
  labels: SyntheseLabels;
};

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';

function Tableau({
  caption,
  lignes,
  locale,
  labels
}: {
  /** Nom du tableau, groupe compris : il doit être unique dans la page. */
  caption: string;
  lignes: readonly LigneDomaine[];
  locale: string;
  labels: SyntheseLabels;
}) {
  return (
    <div
      role='region'
      aria-label={caption}
      tabIndex={0}
      className='carte mt-3 overflow-x-auto !p-0'
    >
      <table className='w-full min-w-[640px] text-petit'>
        <caption className='sr-only'>{caption}</caption>
        <thead className='border-b border-trait'>
          <tr>
            <th scope='col' className={th}>
              {labels.colDomaine}
            </th>
            <th scope='col' className={th}>
              {labels.colEffectif}
            </th>
            <th scope='col' className={th}>
              {labels.colMoyenne}
            </th>
            <th scope='col' className={th}>
              {labels.colEcartType}
            </th>
            <th scope='col' className={th}>
              {labels.colNiveau}
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-trait'>
          {lignes.map((ligne) => (
            <tr key={ligne.domaine}>
              <th scope='row' className={`${td} text-start font-semibold`}>
                {domainLabel(ligne.domaine, locale)}
              </th>
              <td className={`${td} chiffres`}>
                {formatNombre(ligne.effectif, locale)}
              </td>
              {ligne.moyenne === null ? (
                <td className={td} colSpan={3}>
                  {labels.sansMoyenne}
                </td>
              ) : (
                <>
                  <td className={`${td} chiffres`}>
                    {formatNombre(ligne.moyenne, locale)}
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
                  <td className={td}>
                    {labels.niveauLecture.replace(
                      '{niveau}',
                      labels.niveaux[
                        niveau(ligne.moyenne / QUESTIONS_PAR_DOMAINE)
                      ]
                    )}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupSynthesis({ groupes, locale, labels }: Props) {
  if (groupes.length === 0) {
    return <p className='text-texte-2'>{labels.aucunGroupe}</p>;
  }
  return (
    <div className='flex flex-col gap-10'>
      {groupes.map((groupe) => {
        const titre = locale === 'ar' ? isoler(groupe.nom) : groupe.nom;
        return (
          <section
            key={groupe.id}
            aria-labelledby={`groupe-${groupe.id}`}
            className='carte'
          >
            <h2
              id={`groupe-${groupe.id}`}
              className='text-titre-2 text-encre [overflow-wrap:anywhere]'
            >
              <bdi>{titre}</bdi>
            </h2>
            {!groupe.publie ? (
              <p className='mt-3 text-texte-2'>{labels.nonPublie}</p>
            ) : (
              <>
                <Tableau
                  caption={`${labels.groupeCaption} (${titre})`}
                  lignes={groupe.groupe}
                  locale={locale}
                  labels={labels}
                />
                {groupe.complement.length === 0 ? (
                  <p className='mt-4 text-texte-2'>
                    {labels.complementNonPublie}
                  </p>
                ) : (
                  <>
                    {groupe.complement.every((l) => l.effectif === 0) && (
                      <p className='mt-4 text-texte-2'>
                        {labels.complementVide}
                      </p>
                    )}
                    <Tableau
                      caption={`${labels.complementCaption} (${titre})`}
                      lignes={groupe.complement}
                      locale={locale}
                      labels={labels}
                    />
                  </>
                )}
                <p className='mt-4 text-legende text-texte-2'>
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
