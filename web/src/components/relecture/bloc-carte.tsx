import clsx from 'clsx';
import type { ReactNode } from 'react';
import {
  VerdictForm,
  type VerdictFormLabels
} from '@/components/relecture/verdict-form';
import type { BlocResolu } from '@/lib/bibliotheque';
import type { BlocAtelier, StatutAtelier } from '@/lib/relecture-atelier';

// Un bloc de la bibliothèque dans l'atelier de relecture : contexte (facette,
// domaine, niveau, fréquence, profils fictifs) en marge, texte en colonne de
// lecture, verdict et historique dessous. Le texte est en français quelle que
// soit la langue de la page : il est marqué comme tel (lang, dir).

export type BlocCarteLabels = {
  statuts: Record<StatutAtelier, string>;
  facette: string;
  domaine: string;
  niveau: string;
  /** Phrase de fréquence, déjà remplie (ou « inconnue »). */
  frequence: string;
  profils: string;
  aucunProfil: string;
  texteModifie: string;
  sections: {
    description: string;
    apport: string;
    cout: string;
    question: string;
  };
  formesAccordees: string;
  masculin: string;
  feminin: string;
  historique: string;
  historiqueVide: string;
  verdict: VerdictFormLabels;
};

export type HistoriqueLigne = {
  id: string;
  statut: StatutAtelier;
  /** Date et heure lues au Maroc, mises en forme. */
  quand: string;
  /** « par … », déjà rempli. */
  qui: string;
  commentaire: string | null;
  /** Mention « sur un texte antérieur », ou null. */
  ancienTexte: string | null;
};

const pastille: Record<StatutAtelier, string> = {
  a_relire: 'bg-creux text-encre',
  a_corriger: 'bg-avis-doux text-avis',
  relu: 'bg-accent-doux text-accent'
};

export function PastilleStatut({
  statut,
  children
}: {
  statut: StatutAtelier;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-legende font-medium',
        pastille[statut]
      )}
    >
      <span
        aria-hidden='true'
        className={clsx(
          'size-1.5 rounded-full',
          statut === 'relu' ? 'bg-safran' : 'bg-current'
        )}
      />
      {children}
    </span>
  );
}

function Section({
  titre,
  textes
}: {
  titre: string;
  textes: readonly string[];
}) {
  return (
    <section className='mt-6 first:mt-0'>
      <h3 className='text-legende font-semibold text-texte-3'>{titre}</h3>
      {textes.map((texte, i) => (
        <p
          key={i}
          lang='fr'
          dir='ltr'
          className='mt-2 text-corps text-encre [text-align:start]'
        >
          {texte}
        </p>
      ))}
    </section>
  );
}

const enLigne = (bloc: BlocResolu): string =>
  [...bloc.description, ...bloc.apport, ...bloc.cout, bloc.question].join(' ');

export function BlocCarte({
  locale,
  atelier,
  profils,
  historique,
  labels
}: {
  locale: string;
  atelier: BlocAtelier;
  /** Profils fictifs : code et nom fictif. */
  profils: readonly { code: string; nom: string }[];
  historique: readonly HistoriqueLigne[];
  labels: BlocCarteLabels;
}) {
  const { bloc, statut } = atelier;
  const ancre = `bloc-${bloc.id.replace('/', '-')}`;
  const titreId = `${ancre}-titre`;

  return (
    <article
      id={ancre}
      data-bloc={bloc.id}
      data-reveal='monte'
      aria-labelledby={titreId}
      className='relative grid gap-x-8 gap-y-8 border-t border-trait py-10 lg:grid-cols-12 lg:py-12'
    >
      <header className='lg:col-span-4'>
        <p className='flex flex-wrap items-center gap-3'>
          <bdi
            dir='ltr'
            className='chiffres font-display text-petit font-medium text-texte-3'
          >
            {bloc.id}
          </bdi>
          <PastilleStatut statut={statut}>
            {labels.statuts[statut]}
          </PastilleStatut>
        </p>
        <h2 id={titreId} tabIndex={-1} className='mt-3 text-titre-3 text-encre'>
          {labels.facette}
        </h2>
        <p className='mt-1 text-petit text-texte-2'>{labels.domaine}</p>
        <p className='text-petit font-medium text-encre'>{labels.niveau}</p>

        <p className='chiffres mt-5 text-petit text-texte-2'>
          {labels.frequence}
        </p>
        <div className='mt-4'>
          <p className='text-legende text-texte-3'>{labels.profils}</p>
          {profils.length === 0 ? (
            <p className='mt-1 text-petit text-texte-2'>{labels.aucunProfil}</p>
          ) : (
            <ul role='list' className='mt-2 flex flex-wrap gap-2'>
              {profils.map((p) => (
                <li
                  key={p.code}
                  className='inline-flex items-baseline gap-1.5 rounded-controle border border-trait px-2 py-0.5 text-petit'
                >
                  <span className='font-display font-medium text-encre'>
                    {p.code}
                  </span>
                  <bdi className='text-texte-2'>{p.nom}</bdi>
                </li>
              ))}
            </ul>
          )}
        </div>
        {atelier.texteModifie && (
          <p className='mt-5 rounded-controle bg-avis-doux px-3 py-2 text-petit text-avis'>
            {labels.texteModifie}
          </p>
        )}
      </header>

      <div className='lg:col-span-8'>
        <div className='colonne-lecture'>
          <Section
            titre={labels.sections.description}
            textes={bloc.texte.description}
          />
          <Section titre={labels.sections.apport} textes={bloc.texte.apport} />
          <Section titre={labels.sections.cout} textes={bloc.texte.cout} />
          <Section
            titre={labels.sections.question}
            textes={[bloc.texte.question]}
          />
          {bloc.accords && (
            <details className='group mt-6 rounded-controle border border-trait px-4 py-3'>
              <summary className='flex min-h-11 cursor-pointer items-center text-petit font-medium text-encre'>
                {labels.formesAccordees}
              </summary>
              <h4 className='mt-3 text-legende font-semibold text-texte-3'>
                {labels.masculin}
              </h4>
              <p lang='fr' dir='ltr' className='mt-1 text-petit text-texte-2'>
                {enLigne(bloc.accords.m)}
              </p>
              <h4 className='mt-4 text-legende font-semibold text-texte-3'>
                {labels.feminin}
              </h4>
              <p lang='fr' dir='ltr' className='mt-1 text-petit text-texte-2'>
                {enLigne(bloc.accords.f)}
              </p>
            </details>
          )}
        </div>

        <div className='mt-8 max-w-xl border-t border-trait pt-6'>
          <VerdictForm
            locale={locale}
            bloc={bloc.id}
            empreinte={bloc.empreinte}
            titreId={titreId}
            labels={labels.verdict}
          />
          <details className='mt-6' open={atelier.statut === 'a_corriger'}>
            <summary className='flex min-h-11 cursor-pointer items-center text-petit font-medium text-encre'>
              {labels.historique}
            </summary>
            {historique.length === 0 ? (
              <p className='mt-2 text-petit text-texte-2'>
                {labels.historiqueVide}
              </p>
            ) : (
              <ol role='list' className='mt-2 flex flex-col gap-4'>
                {historique.map((h) => (
                  <li key={h.id} className='border-s-2 border-trait ps-4'>
                    <p className='flex flex-wrap items-center gap-x-3 gap-y-1 text-petit text-texte-2'>
                      <PastilleStatut statut={h.statut}>
                        {labels.statuts[h.statut]}
                      </PastilleStatut>
                      <span className='chiffres'>{h.quand}</span>
                      <span>{h.qui}</span>
                      {h.ancienTexte && (
                        <span className='text-texte-3'>{h.ancienTexte}</span>
                      )}
                    </p>
                    {h.commentaire && (
                      <p
                        dir='auto'
                        className='mt-1.5 whitespace-pre-line text-petit text-encre [overflow-wrap:anywhere]'
                      >
                        {h.commentaire}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </details>
        </div>
      </div>
    </article>
  );
}
