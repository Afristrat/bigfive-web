'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  type FormEvent
} from 'react';
import {
  designerRelecteur,
  retirerRelecteur,
  type RelecteurState,
  type RetraitRelecteurState
} from '@/actions/relecture';
import { labelClass } from '@/components/form-styles';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { boutonPrincipal } from '@/components/primitives';

export type RelecteurLigne = {
  userId: string;
  adresse: string;
  /** Date de désignation, déjà mise en forme dans la langue de la page. */
  ajouteLe: string;
  /** Case de confirmation, avec l'adresse. */
  confirmer: string;
  /** Nom accessible du bouton, avec l'adresse (boutons tous distincts). */
  retirerAria: string;
};

export type RelecteursLabels = {
  adresse: string;
  designer: string;
  designerAide: string;
  envoi: string;
  ajoute: string;
  deja: string;
  inconnu: string;
  invalide: string;
  erreur: string;
  legende: string;
  colAdresse: string;
  colAjout: string;
  colAction: string;
  vide: string;
  indisponible: string;
  retirer: string;
  retire: string;
  absent: string;
  retraitInvalide: string;
  interdit: string;
  retraitErreur: string;
};

const idleAjout: RelecteurState = { status: 'idle' };
const idleRetrait: RetraitRelecteurState = { status: 'idle' };

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';
const boutonRetrait =
  'appui inline-flex min-h-11 items-center justify-center rounded-controle border border-erreur bg-transparent px-5 py-2 text-base font-medium text-erreur hover:bg-erreur-doux motion-reduce:transition-none';
const champ =
  'block min-h-11 w-full max-w-md rounded-controle border border-trait-fort bg-surface px-3 text-corps text-encre transition-colors duration-courte ease-tenga hover:border-encre focus-visible:border-accent motion-reduce:transition-none';

const soumettre =
  (pending: boolean, run: (data: FormData) => void) =>
  (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => run(data));
  };

/**
 * Relecteurs désignés (super administrateurs seulement) : désignation par
 * adresse, liste et retrait confirmé. Deux états partagés, un par geste ; la
 * liste se met à jour à la revalidation de la page, les régions vivantes
 * restent montées et annoncent le résultat.
 */
export function RelecteursPanel({
  locale,
  headingId,
  lignes,
  labels
}: {
  locale: string;
  headingId: string;
  /** null : liste indisponible (la désignation reste possible). */
  lignes: readonly RelecteurLigne[] | null;
  labels: RelecteursLabels;
}) {
  const id = useId();
  const adresseId = `${id}-adresse`;
  const aideId = `${id}-aide`;
  const ajoutId = `${id}-ajout`;
  const retraitId = `${id}-retrait`;
  const [ajout, designer, ajoutEnCours] = useActionState(
    designerRelecteur,
    idleAjout
  );
  const [retrait, retirer, retraitEnCours] = useActionState(
    retirerRelecteur,
    idleRetrait
  );
  const [adresse, setAdresse] = useState('');
  const [cible, setCible] = useState<string | null>(null);

  useEffect(() => {
    if (ajout.status === 'ajoute' || ajout.status === 'deja') setAdresse('');
  }, [ajout]);
  useEffect(() => {
    if (retrait.status === 'retire')
      document.getElementById(headingId)?.focus();
  }, [retrait, headingId]);

  const etatAjout = ajoutEnCours ? 'idle' : ajout.status;
  const texteAjout = ajoutEnCours
    ? labels.envoi
    : {
        idle: null,
        ajoute: labels.ajoute,
        deja: labels.deja,
        inconnu: labels.inconnu,
        invalide: labels.invalide,
        erreur: labels.erreur
      }[etatAjout];
  const tonAjout: MessageTon =
    ajoutEnCours || etatAjout === 'ajoute' || etatAjout === 'deja'
      ? 'info'
      : 'erreur';
  const adresseInvalide = etatAjout === 'invalide' || etatAjout === 'inconnu';

  const etatRetrait = retraitEnCours ? 'idle' : retrait.status;
  const texteRetrait = retraitEnCours
    ? labels.envoi
    : {
        idle: null,
        retire: labels.retire,
        absent: labels.absent,
        invalide: labels.retraitInvalide,
        interdit: labels.interdit,
        erreur: labels.retraitErreur
      }[etatRetrait];
  const tonRetrait: MessageTon =
    retraitEnCours || etatRetrait === 'retire' || etatRetrait === 'absent'
      ? 'info'
      : 'erreur';

  return (
    <div className='mt-6 grid gap-10 lg:grid-cols-12'>
      <form
        noValidate
        onSubmit={soumettre(ajoutEnCours, designer)}
        className='flex flex-col gap-3 lg:col-span-5'
      >
        <input type='hidden' name='locale' value={locale} />
        <div>
          <label htmlFor={adresseId} className={labelClass}>
            {labels.adresse}
          </label>
          <input
            id={adresseId}
            type='email'
            name='email'
            dir='ltr'
            autoComplete='off'
            spellCheck={false}
            required
            aria-required='true'
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            aria-invalid={adresseInvalide ? true : undefined}
            aria-describedby={adresseInvalide ? `${aideId} ${ajoutId}` : aideId}
            className={champ}
          />
          <p id={aideId} className='mt-1.5 max-w-md text-legende text-texte-3'>
            {labels.designerAide}
          </p>
        </div>
        <div>
          <button
            type='submit'
            aria-disabled={ajoutEnCours ? true : undefined}
            className={boutonPrincipal()}
          >
            {labels.designer}
          </button>
        </div>
        <LiveMessage id={ajoutId} ton={tonAjout} className='max-w-md'>
          {texteAjout ? <p>{texteAjout}</p> : null}
        </LiveMessage>
      </form>

      <div className='lg:col-span-7'>
        <LiveMessage id={retraitId} ton={tonRetrait} className='mb-4 max-w-md'>
          {texteRetrait ? <p>{texteRetrait}</p> : null}
        </LiveMessage>
        {lignes === null ? (
          <p className='text-texte-2'>{labels.indisponible}</p>
        ) : lignes.length === 0 ? (
          <p className='text-texte-2'>{labels.vide}</p>
        ) : (
          <div
            role='region'
            aria-labelledby={headingId}
            tabIndex={0}
            className='overflow-x-auto rounded-panneau border border-trait bg-surface'
          >
            <table className='w-full min-w-[560px] text-petit'>
              <caption className='sr-only'>{labels.legende}</caption>
              <thead className='border-b border-trait'>
                <tr>
                  <th scope='col' className={th}>
                    {labels.colAdresse}
                  </th>
                  <th scope='col' className={th}>
                    {labels.colAjout}
                  </th>
                  <th scope='col' className={th}>
                    {labels.colAction}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-trait'>
                {lignes.map((ligne) => {
                  const caseInvalide =
                    etatRetrait === 'invalide' && cible === ligne.userId;
                  return (
                    <tr key={ligne.userId}>
                      <th
                        scope='row'
                        className={`${td} break-all text-start font-semibold`}
                      >
                        <bdi dir='ltr'>{ligne.adresse}</bdi>
                      </th>
                      <td className={`${td} chiffres whitespace-nowrap`}>
                        {ligne.ajouteLe}
                      </td>
                      <td className={td}>
                        <form
                          noValidate
                          onSubmit={soumettre(retraitEnCours, (data) => {
                            setCible(ligne.userId);
                            retirer(data);
                          })}
                          className='flex max-w-xs flex-col gap-3'
                        >
                          <input type='hidden' name='locale' value={locale} />
                          <input
                            type='hidden'
                            name='userId'
                            value={ligne.userId}
                          />
                          {/* Toute la ligne est cliquable (cible d'au moins 44 px). */}
                          <label className='flex min-h-[44px] cursor-pointer items-start gap-3 text-petit text-encre'>
                            <input
                              type='checkbox'
                              name='confirmer'
                              value='oui'
                              aria-required='true'
                              aria-invalid={caseInvalide ? true : undefined}
                              aria-describedby={
                                caseInvalide ? retraitId : undefined
                              }
                              className='mt-1 size-6 shrink-0 accent-accent'
                            />
                            <span>{ligne.confirmer}</span>
                          </label>
                          <div>
                            <button
                              type='submit'
                              aria-label={ligne.retirerAria}
                              aria-disabled={retraitEnCours ? true : undefined}
                              className={boutonRetrait}
                            >
                              {labels.retirer}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
