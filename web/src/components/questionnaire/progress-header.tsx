'use client';

interface ProgressHeaderProps {
  answered: number;
  total: number;
  current: number;
  label: string; // « Question 4 sur 120 », déjà traduit
}

export function ProgressHeader({
  answered,
  total,
  current,
  label
}: ProgressHeaderProps) {
  // Écran bas (paysage sur téléphone) : l'en-tête ne colle plus, il ne doit
  // pas masquer la question (critère 2.4.11). Le décalage de défilement
  // correspondant est dans globals.css.
  return (
    <div
      data-question={current}
      className='sticky top-16 z-entete -mx-5 bg-fond/95 px-5 py-3 backdrop-blur-sm [@media(max-height:480px)]:static sm:-mx-8 sm:px-8'
    >
      <p
        id='progression-test'
        className='mb-2 text-petit font-medium text-encre chiffres'
      >
        {label}
      </p>
      {/* Gabarit maison plutôt que la barre NextUI : celle-ci se remplit à
          l'envers en arabe. Origine sur le bord de début de ligne. */}
      <div
        role='progressbar'
        aria-labelledby='progression-test'
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        className='h-1 w-full overflow-hidden rounded-petit bg-creux'
      >
        <div
          className='h-full w-full origin-left rounded-petit bg-accent transition-transform duration-longue ease-tenga rtl:origin-right'
          style={{
            transform: `scaleX(${total > 0 ? Math.min(1, answered / total) : 0})`
          }}
        />
      </div>
    </div>
  );
}
