import clsx from 'clsx';
import { partDeRegle } from '@/components/score-rule';

interface ScoreBarProps {
  score: number;
  min: number;
  max: number;
  taille?: 'domaine' | 'facette';
  anime?: boolean;
  rang?: number; // position dans la liste, pour le décalage du tracé
}

// Barre de score décorative (la valeur est écrite à côté, en texte). Le trait
// part du bord de début de ligne : il croît vers la gauche en arabe.
export function ScoreBar({
  score,
  min,
  max,
  taille = 'domaine',
  anime = false,
  rang = 0
}: ScoreBarProps) {
  return (
    <span
      aria-hidden='true'
      className={clsx(
        'regle-piste relative block overflow-hidden rounded-petit bg-piste',
        taille === 'domaine' ? 'h-2' : 'h-1.5'
      )}
    >
      <span
        className={clsx(
          'regle-trait absolute inset-y-0 start-0 origin-left rounded-petit bg-accent rtl:origin-right',
          anime && 'animate-tracer'
        )}
        style={{
          width: `${partDeRegle(score, min, max) * 100}%`,
          animationDelay: anime ? `${rang * 60}ms` : undefined
        }}
      />
    </span>
  );
}
