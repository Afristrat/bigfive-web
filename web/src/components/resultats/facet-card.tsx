import type { ReactElement } from 'react';
import { ScoreBar } from '@/components/score-bar';
import { LevelBadge } from '@/components/resultats/level-badge';
import type { EtatBloc } from '@/lib/bibliotheque';
import { formatNombre } from '@/lib/format';
import type { Niveau } from '@/lib/moteur';

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
};

const Paragraphes = ({
  titre,
  textes
}: {
  titre: string;
  textes: readonly string[];
}): ReactElement => (
  <div className='mt-3'>
    <h4 className='text-petit font-bold text-encre'>{titre}</h4>
    {textes.map((texte) => (
      <p key={texte} className='mt-1 text-petit text-texte-2'>
        {texte}
      </p>
    ))}
  </div>
);

export function FacetCard({
  label,
  score,
  niveau,
  niveauLabel,
  etat,
  avertissement,
  locale,
  rang,
  labels
}: FacetCardProps): ReactElement {
  return (
    <li className='break-inside-avoid rounded-controle border border-trait bg-fond p-5'>
      <div className='flex flex-wrap items-baseline justify-between gap-3'>
        <h3 className='text-corps font-bold text-encre'>{label}</h3>
        <LevelBadge niveau={niveau} label={niveauLabel} />
      </div>
      <p className='mt-2 text-end' dir='ltr'>
        <span className='chiffres text-[22px] font-extrabold text-encre'>
          {formatNombre(score, locale)}
        </span>{' '}
        <span className='text-petit font-medium text-texte-2'>
          {labels.facetOutOf}
        </span>
      </p>
      <div className='mt-2'>
        <ScoreBar taille='facette' score={score} min={4} max={20} rang={rang} />
      </div>
      {avertissement && (
        <p className='mt-3 text-petit text-texte-2'>
          <strong className='font-bold text-encre'>
            {labels.avertissement}
          </strong>{' '}
          {avertissement}
        </p>
      )}
      {etat.etat === 'en_relecture' && (
        <p className='mt-3 text-petit text-texte-2'>{labels.enRelecture}</p>
      )}
      {etat.etat === 'langue_absente' && (
        <p className='mt-3 text-petit text-texte-2'>{labels.langueAbsente}</p>
      )}
      {etat.etat === 'affiche' && (
        <div className='mt-3'>
          {etat.nonRelu && (
            <p className='rounded-controle bg-avis-doux p-3 text-petit font-semibold text-avis'>
              {labels.nonRelu}
            </p>
          )}
          <Paragraphes
            titre={labels.description}
            textes={etat.bloc.description}
          />
          <Paragraphes titre={labels.apport} textes={etat.bloc.apport} />
          <Paragraphes titre={labels.cout} textes={etat.bloc.cout} />
          <Paragraphes titre={labels.question} textes={[etat.bloc.question]} />
        </div>
      )}
    </li>
  );
}
