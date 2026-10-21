'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { removeTengaAdmin, type RemoveState } from '@/actions/admin';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';

export type TengaAdminRow = {
  userId: string;
  address: string;
  /** Date d'ajout, déjà mise en forme dans la langue de la page. */
  addedAt: string;
  isMe: boolean;
  /** Phrase de confirmation, avec l'adresse (la case porte ce nom). */
  confirm: string;
  /** Nom accessible du bouton, avec l'adresse (boutons tous distincts). */
  ariaLabel: string;
};

export type TengaAdminsLabels = {
  caption: string;
  colAddress: string;
  colAdded: string;
  colAction: string;
  you: string;
  selfHelp: string;
  submit: string;
  working: string;
  done: string;
  invalid: string;
  self: string;
  absent: string;
  forbidden: string;
  error: string;
};

const idle: RemoveState = { status: 'idle' };

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';

/**
 * Liste des super administrateurs avec le retrait de chacun. UN état partagé
 * pour toute la liste : la ligne retirée disparaît à la revalidation de la
 * page, mais ce composant (et sa région vivante) reste monté, donc le résultat
 * est annoncé et affiché. Après un retrait, le focus va au titre de la section
 * (`headingId`, `tabIndex=-1`) : la ligne qui le portait n'existe plus. Le
 * refus de la base reste l'ultime protection ; l'interface n'offre pas le
 * retrait de sa propre ligne.
 */
export function TengaAdminsPanel({
  locale,
  headingId,
  rows,
  labels
}: {
  locale: string;
  headingId: string;
  rows: readonly TengaAdminRow[];
  labels: TengaAdminsLabels;
}) {
  const resultId = `${useId()}-resultat`;
  const [state, formAction, pending] = useActionState(removeTengaAdmin, idle);
  // Ligne visée par la dernière soumission (pour marquer la bonne case).
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'removed') {
      document.getElementById(headingId)?.focus();
    }
  }, [state, headingId]);

  const settled = pending ? 'idle' : state.status;
  const text = pending
    ? labels.working
    : {
        idle: null,
        removed: labels.done,
        invalid: labels.invalid,
        self: labels.self,
        absent: labels.absent,
        forbidden: labels.forbidden,
        error: labels.error
      }[settled];
  const ton: MessageTon = pending || settled === 'removed' ? 'info' : 'erreur';

  return (
    <div>
      <LiveMessage id={resultId} ton={ton} className='mt-4 max-w-md'>
        {text ? <p>{text}</p> : null}
      </LiveMessage>
      <div
        role='region'
        aria-labelledby={headingId}
        tabIndex={0}
        className='carte mt-4 overflow-x-auto !p-0'
      >
        <table className='w-full min-w-[640px] text-petit'>
          <caption className='sr-only'>{labels.caption}</caption>
          <thead className='border-b border-trait'>
            <tr>
              <th scope='col' className={th}>
                {labels.colAddress}
              </th>
              <th scope='col' className={th}>
                {labels.colAdded}
              </th>
              <th scope='col' className={th}>
                {labels.colAction}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-trait'>
            {rows.map((row) => {
              const checkInvalid =
                settled === 'invalid' && target === row.userId;
              return (
                <tr key={row.userId}>
                  <th scope='row' className={`${td} text-start font-semibold`}>
                    <bdi dir='ltr'>{row.address}</bdi>
                    {row.isMe && (
                      <span className='ms-2 font-normal text-texte-2'>
                        ({labels.you})
                      </span>
                    )}
                  </th>
                  <td className={`${td} chiffres whitespace-nowrap`}>
                    {row.addedAt}
                  </td>
                  <td className={td}>
                    {row.isMe ? (
                      <p className='max-w-xs text-texte-2'>{labels.selfHelp}</p>
                    ) : (
                      <form
                        noValidate
                        onSubmit={transitionSubmit(pending, (data) => {
                          setTarget(row.userId);
                          formAction(data);
                        })}
                        className='flex max-w-xs flex-col gap-3'
                      >
                        <input type='hidden' name='locale' value={locale} />
                        <input type='hidden' name='userId' value={row.userId} />
                        {/* Toute la ligne est cliquable (cible d'au moins 44 px). */}
                        <label className='flex min-h-[44px] cursor-pointer items-start gap-3 text-petit text-encre'>
                          <input
                            type='checkbox'
                            name='confirmer'
                            value='oui'
                            aria-required='true'
                            aria-invalid={checkInvalid ? true : undefined}
                            aria-describedby={
                              checkInvalid ? resultId : undefined
                            }
                            className='mt-1 size-6 shrink-0 accent-accent'
                          />
                          <span>{row.confirm}</span>
                        </label>
                        <div>
                          <PendingButton
                            pending={pending}
                            color='danger'
                            variant='bordered'
                            label={pending ? labels.working : labels.submit}
                            ariaLabel={row.ariaLabel}
                          />
                        </div>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
