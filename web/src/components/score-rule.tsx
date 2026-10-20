import clsx from 'clsx';

interface ScoreRuleProps {
  label: string;
  href?: string;
  score: number;
  min: number;
  max: number;
  valeur: string; // « 82 », déjà formaté par formatNombre
  surMax: string; // « sur 120 », déjà traduit
  niveau: string; // « élevé », déjà traduit
  taille?: 'domaine' | 'facette';
  anime?: boolean;
  rang?: number; // position dans la liste, pour le décalage du tracé
}

// Réponse moyenne de 3 sur une échelle de 1 à 5 : frontière entre « bas » et
// « élevé » dans le paquet de score.
export const MILIEU_DE_REGLE = 0.5;

// Part de la piste couverte par le trait, bornée à [0, 1].
export function partDeRegle(score: number, min: number, max: number): number {
  if (!(max > min) || Number.isNaN(score)) return 0;
  return Math.min(1, Math.max(0, (score - min) / (max - min)));
}

export function ScoreRule({
  label,
  href,
  score,
  min,
  max,
  valeur,
  surMax,
  niveau,
  taille = 'domaine',
  anime = false,
  rang = 0
}: ScoreRuleProps) {
  const part = partDeRegle(score, min, max);
  const hauteur = taille === 'domaine' ? 'h-2' : 'h-1.5';
  return (
    <div className='grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,14rem)_1fr_auto]'>
      <span className='text-corps font-medium text-encre'>
        {href ? (
          <a
            href={href}
            className='underline decoration-trait-fort underline-offset-4 hover:text-accent hover:decoration-accent'
          >
            {label}
          </a>
        ) : (
          label
        )}
      </span>
      <span
        aria-hidden='true'
        className={clsx(
          'regle-piste relative col-span-2 rounded-petit bg-creux ring-1 ring-inset ring-trait-fort sm:col-span-1 sm:col-start-2 sm:row-start-1',
          hauteur
        )}
      >
        {/* Origine sur le bord de début de ligne : le trait croît vers la gauche en arabe. */}
        <span
          className={clsx(
            'regle-trait absolute inset-y-0 start-0 origin-left rounded-petit bg-accent rtl:origin-right',
            anime && 'animate-tracer'
          )}
          style={{
            width: `${part * 100}%`,
            animationDelay: anime ? `${rang * 40}ms` : undefined
          }}
        />
        <span
          className='absolute -bottom-[3px] -top-[3px] w-px bg-trait-fort'
          style={{ insetInlineStart: `${MILIEU_DE_REGLE * 100}%` }}
        />
      </span>
      <span className='col-start-2 row-start-1 whitespace-nowrap text-end sm:col-start-3'>
        <span className='chiffres text-corps font-semibold text-encre'>
          {valeur}
        </span>{' '}
        <span className='text-petit text-texte-3'>{surMax}</span>{' '}
        <span className='text-petit font-medium text-texte-2'>{niveau}</span>
      </span>
    </div>
  );
}
