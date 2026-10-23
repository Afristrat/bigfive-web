import type { ReactElement } from 'react';
import clsx from 'clsx';
import { ScoreBar } from '@/components/score-bar';
import { LevelBadge } from '@/components/resultats/level-badge';
import type { EtatBloc } from '@/lib/bibliotheque';
import { formatNombre } from '@/lib/format';
import type { Niveau } from '@/lib/moteur';
import styles from './result-motion.module.css';

export type FacetCardLabels = {
  facetOutOf: string;
  description: string;
  apport: string;
  cout: string;
  question: string;
  avertissement: string;
  enRelecture: string;
  langueAbsente: string;
  nonRelu: string;
};

type FacetCardProps = {
  label: string;
  /** Somme des quatre réponses de la facette, de 4 à 20. */
  score: number;
  niveau: Niveau;
  niveauLabel: string;
  etat: EtatBloc;
  avertissement: string | null;
  locale: string;
  rang: number;
  labels: FacetCardLabels;
  /** Niveau de titre de la facette dans la page (h3 par défaut). */
  titre?: 'h3' | 'h4';
  /**
   * Présentation animée (page de résultat) : règle graduée qui se trace, pose
   * en cascade et compteur. Faux pour le rapport imprimable.
   */
  anime?: boolean;
};

const Rubrique = ({
  titre,
  textes
}: {
  titre: string;
  textes: readonly string[];
}): ReactElement => (
  <div>
    <p className='text-legende font-semibold text-encre'>{titre}</p>
    {textes.map((texte) => (
      <p key={texte} className='mt-1.5 text-petit text-texte-2'>
        {texte}
      </p>
    ))}
  </div>
);

// Une facette, mise en page comme une ligne de relevé : le nom et la valeur sur
// une même ligne de base, le curseur de niveau, la règle graduée, puis les
// textes de la bibliothèque (description, apport et coût côte à côte, et la
// question, portée par un filet safran). Aucun encadré : les facettes se
// séparent par des filets.
export function FacetCard({
  label,
  score,
  niveau,
  niveauLabel,
  etat,
  avertissement,
  locale,
  rang,
  labels,
  titre: Titre = 'h3',
  anime = false
}: FacetCardProps): ReactElement {
  return (
    <li
      className={clsx(
        'break-inside-avoid border-t border-trait py-6',
        anime && styles.cascade
      )}
      style={anime ? { ['--i' as string]: rang } : undefined}
    >
      <div className='flex items-baseline justify-between gap-4'>
        <Titre className='text-titre-3 text-encre'>{label}</Titre>
        <p className='flex-none'>
          <span dir='ltr' className='inline-block whitespace-nowrap'>
            <span
              className='chiffres font-display text-[1.625rem] font-semibold leading-none tracking-[-0.03em] text-encre'
              data-compte={anime ? score : undefined}
            >
              {formatNombre(score, locale)}
            </span>{' '}
            <span className='text-petit font-medium text-texte-3'>
              {labels.facetOutOf}
            </span>
          </span>
        </p>
      </div>
      <div className='mt-2'>
        <LevelBadge niveau={niveau} label={niveauLabel} />
      </div>
      <div className='mt-3'>
        <ScoreBar
          taille='facette'
          score={score}
          min={4}
          max={20}
          rang={anime ? rang + 2 : rang}
          anime={anime}
          gradue={anime}
        />
      </div>
      {avertissement && (
        <p className='mt-4 text-petit text-texte-2'>
          <strong className='font-semibold text-encre'>
            {labels.avertissement}
          </strong>{' '}
          {avertissement}
        </p>
      )}
      {etat.etat === 'en_relecture' && (
        <p className='mt-4 text-petit text-texte-3'>{labels.enRelecture}</p>
      )}
      {etat.etat === 'langue_absente' && (
        <p className='mt-4 text-petit text-texte-3'>{labels.langueAbsente}</p>
      )}
      {etat.etat === 'affiche' && (
        <div className='mt-5 flex flex-col gap-5'>
          {etat.nonRelu && (
            <p className='rounded-controle bg-avis-doux px-4 py-3 text-petit font-semibold text-avis'>
              {labels.nonRelu}
            </p>
          )}
          <Rubrique titre={labels.description} textes={etat.bloc.description} />
          <div className='grid gap-5 sm:grid-cols-2'>
            <Rubrique titre={labels.apport} textes={etat.bloc.apport} />
            <Rubrique titre={labels.cout} textes={etat.bloc.cout} />
          </div>
          <div className='border-s-2 border-safran ps-4'>
            <p className='text-legende font-semibold text-texte-2'>
              {labels.question}
            </p>
            <p className='mt-1.5 text-corps text-encre'>{etat.bloc.question}</p>
          </div>
        </div>
      )}
    </li>
  );
}
