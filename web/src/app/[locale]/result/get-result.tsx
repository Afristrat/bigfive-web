'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import { ArrowRightIcon } from '@/components/icons';
import { labelClass, secondaryButtonClass } from '@/components/form-styles';
import { boutonPrincipal } from '@/components/primitives';
import {
  formatAndValidateId,
  formatId,
  ressembleCourriel
} from '@/lib/helpers';
import { Link, useRouter } from '@/navigation';

interface GetResultPageProps {
  labels: {
    champ: string;
    exemple: string;
    invalide: string;
    courriel: string;
    courrielLien: string;
    afficher: string;
    precedent: string;
  };
}

// Champ « identifiant ou adresse » : l'erreur de format n'apparaît qu'à
// l'envoi ou en quittant le champ, jamais pendant la saisie ; elle est reliée
// au champ (aria-describedby) et annoncée. Le dernier résultat ouvert dans ce
// navigateur reste proposé à côté.
export const GetResultPage = ({ labels }: GetResultPageProps) => {
  const router = useRouter();
  const ids = useId();
  const [precedent, setPrecedent] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [verifie, setVerifie] = useState(false);

  const invalide = verifie && saisie !== '' && !formatAndValidateId(saisie);
  const courriel = invalide && ressembleCourriel(saisie);

  useEffect(() => {
    try {
      setPrecedent(localStorage.getItem('resultId'));
    } catch {
      setPrecedent(null);
    }
  }, []);

  const envoyer = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setVerifie(true);
    if (!formatAndValidateId(saisie)) return;
    router.push(`/result/${formatId(saisie)}`);
  };

  return (
    <form onSubmit={envoyer} noValidate>
      <label htmlFor={`${ids}-champ`} className={labelClass}>
        {labels.champ}
      </label>
      <input
        id={`${ids}-champ`}
        type='text'
        dir='ltr'
        inputMode='text'
        autoComplete='off'
        spellCheck={false}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={() => setVerifie(true)}
        aria-invalid={invalide || undefined}
        aria-describedby={`${ids}-aide${invalide ? ` ${ids}-erreur` : ''}`}
        className={clsx(
          'block min-h-11 w-full rounded-controle border bg-surface px-3 font-mono text-corps text-encre transition-colors duration-courte ease-tenga hover:border-encre focus-visible:border-accent motion-reduce:transition-none rtl:text-end',
          invalide ? 'border-erreur' : 'border-trait-fort'
        )}
      />
      <p id={`${ids}-aide`} className='mt-2 text-petit text-texte-3'>
        {labels.exemple}
      </p>
      <p
        id={`${ids}-erreur`}
        role='alert'
        className='mt-2 min-h-[1.5em] text-petit text-erreur'
      >
        {courriel ? (
          <>
            {labels.courriel}{' '}
            <Link href='/mes-resultats' className='font-semibold underline'>
              {labels.courrielLien}
            </Link>
            .
          </>
        ) : invalide ? (
          labels.invalide
        ) : (
          ''
        )}
      </p>
      <div className='mt-4 flex flex-wrap gap-3'>
        <button type='submit' data-aimant='' className={boutonPrincipal()}>
          {labels.afficher}
          <ArrowRightIcon size={18} />
        </button>
        {precedent && (
          <Link href={`/result/${precedent}`} className={secondaryButtonClass}>
            {labels.precedent}
          </Link>
        )}
      </div>
    </form>
  );
};
