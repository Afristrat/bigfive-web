import clsx from 'clsx';
import { partDeRegle } from '@/components/score-rule';

interface ScoreBarProps {
  score: number;
  min: number;
  max: number;
  taille?: 'domaine' | 'facette';
  anime?: boolean;
  rang?: number; // position dans la liste, pour le décalage du tracé
  gradue?: boolean; // graduations au quart, à la moitié et aux trois quarts
}

const GRADUATIONS = ['start-1/4', 'start-1/2', 'start-3/4'] as const;

// Règle graduée décorative (la valeur est écrite à côté, en texte). Le trait
// d'encre part du bord de début de ligne (il croît vers la gauche en arabe) et
// se termine par un repère safran, la pointe du tracé du profil. Les
// graduations découpent la piste comme une règle, par-dessus le trait.
export function ScoreBar({
  score,
  min,
  max,
  taille = 'domaine',
  anime = false,
  rang = 0,
  gradue = false
}: ScoreBarProps) {
  return (
    <span
      aria-hidden='true'
      className={clsx(
        'regle-piste relative block overflow-hidden rounded-full bg-piste',
        taille === 'domaine' ? 'h-2' : 'h-1.5'
      )}
    >
      <span
        className={clsx(
          'regle-trait absolute inset-y-0 start-0 origin-left rounded-full bg-encre rtl:origin-right',
          anime && 'animate-tracer [animation-duration:900ms]'
        )}
        style={{
          width: `${partDeRegle(score, min, max) * 100}%`,
          animationDelay: anime ? `${120 + rang * 70}ms` : undefined
        }}
      >
        <span className='absolute inset-y-0 end-0 w-1.5 rounded-full bg-safran' />
      </span>
      {gradue &&
        GRADUATIONS.map((position) => (
          <span
            key={position}
            className={clsx(
              'absolute inset-y-0 w-0.5 bg-fond print:bg-white',
              position
            )}
          />
        ))}
    </span>
  );
}
