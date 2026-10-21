'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Input } from '@nextui-org/input';
import {
  addTengaAdmin,
  assignRole,
  createOrganization,
  type AdminState
} from '@/actions/admin';
import {
  inputClassNames,
  labelClass,
  selectClass
} from '@/components/form-styles';
import { LanguageSelect } from '@/components/language-select';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';
import { isInvitationLocale, type InvitationLocale } from '@/lib/access-rules';

// Les trois formulaires ont des champs CONTRÔLÉS (React 19 vide les champs
// après chaque action de formulaire) et sont soumis à la main
// (`transitionSubmit`) : une saisie refusée reste affichée. Validation côté
// serveur (zod) : `validationBehavior='aria'` et `noValidate` évitent un
// blocage natif sans message ; l'erreur est annoncée par la région vivante et
// reliée au champ par `aria-invalid` et `aria-describedby`.

const idle: AdminState = { status: 'idle' };

type Texts = {
  working: string;
  done: string;
  invalid: string;
  exists: string;
  error: string;
};

type Outcome = {
  settled: AdminState['status'];
  text: string | null;
  ton: MessageTon;
};

/** Texte et ton du résultat ; pendant l'envoi, l'ancien résultat est tu. */
const outcomeOf = (
  state: AdminState,
  pending: boolean,
  success: 'created' | 'assigned' | 'granted',
  texts: Texts
): Outcome => {
  const settled = pending ? 'idle' : state.status;
  if (pending) return { settled, text: texts.working, ton: 'info' };
  if (settled === 'idle') return { settled, text: null, ton: 'info' };
  if (settled === success) return { settled, text: texts.done, ton: 'info' };
  const text =
    settled === 'exists'
      ? texts.exists
      : settled === 'invalid'
        ? texts.invalid
        : texts.error;
  return { settled, text, ton: 'erreur' };
};

type Feedback = {
  invalid: string;
  exists: string;
  error: string;
};

export type OrganizationFormLabels = Feedback & {
  nameLabel: string;
  slugLabel: string;
  slugHelp: string;
  submit: string;
  done: string;
  working: string;
  requiredLegend: string;
};

export function OrganizationForm({
  locale,
  labels
}: {
  locale: string;
  labels: OrganizationFormLabels;
}) {
  const resultId = `${useId()}-resultat`;
  const [state, formAction, pending] = useActionState(createOrganization, idle);
  const [nom, setNom] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (state.status === 'created') {
      setNom('');
      setSlug('');
    }
  }, [state]);

  const { settled, text, ton } = outcomeOf(state, pending, 'created', labels);
  const nomInvalid = settled === 'invalid';
  const slugInvalid = settled === 'invalid' || settled === 'exists';

  return (
    <form
      noValidate
      onSubmit={transitionSubmit(pending, formAction)}
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <p className='text-petit text-texte-2'>{labels.requiredLegend}</p>
      <Input
        name='nom'
        label={labels.nameLabel}
        labelPlacement='outside'
        placeholder=' '
        isRequired
        maxLength={160}
        value={nom}
        onValueChange={setNom}
        isInvalid={nomInvalid}
        aria-describedby={nomInvalid ? resultId : undefined}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <Input
        name='slug'
        label={labels.slugLabel}
        description={labels.slugHelp}
        labelPlacement='outside'
        placeholder=' '
        isRequired
        minLength={3}
        maxLength={40}
        pattern='[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]'
        autoCapitalize='none'
        spellCheck={false}
        dir='ltr'
        value={slug}
        onValueChange={setSlug}
        isInvalid={slugInvalid}
        aria-describedby={slugInvalid ? resultId : undefined}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <LiveMessage id={resultId} ton={ton} className='max-w-md'>
        {text ? <p>{text}</p> : null}
      </LiveMessage>
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.working : labels.submit}
        />
      </div>
    </form>
  );
}

type RoleCode = 'responsable' | 'consultant' | 'participant';
const roleCodes: readonly RoleCode[] = [
  'responsable',
  'consultant',
  'participant'
];
const isRoleCode = (value: string): value is RoleCode =>
  roleCodes.some((code) => code === value);

export type RoleFormLabels = Feedback & {
  emailLabel: string;
  organizationLabel: string;
  /** Option vide désactivée : l'organisation est choisie, jamais présélectionnée. */
  organizationPlaceholder: string;
  roleLabel: string;
  /** Option vide désactivée : aucun privilège n'est présélectionné. */
  rolePlaceholder: string;
  languageLabel: string;
  roles: Record<RoleCode, string>;
  languages: Record<InvitationLocale, string>;
  submit: string;
  done: string;
  working: string;
  requiredLegend: string;
};

export function RoleForm({
  locale,
  organizations,
  labels
}: {
  locale: string;
  organizations: { id: string; nom: string }[];
  labels: RoleFormLabels;
}) {
  const base = useId();
  const resultId = `${base}-resultat`;
  const [state, formAction, pending] = useActionState(assignRole, idle);
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [role, setRole] = useState<RoleCode | ''>('');
  const [language, setLanguage] = useState<InvitationLocale>(
    isInvitationLocale(locale) ? locale : 'fr'
  );

  useEffect(() => {
    if (state.status === 'assigned') {
      setEmail('');
      setOrganisation('');
      setRole('');
    }
  }, [state]);

  const { settled, text, ton } = outcomeOf(state, pending, 'assigned', {
    ...labels,
    exists: labels.exists
  });
  const invalid = settled === 'invalid';
  const described = invalid ? resultId : undefined;
  const unavailable = pending || organizations.length === 0;

  return (
    <form
      noValidate
      onSubmit={transitionSubmit(unavailable, formAction)}
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <p className='text-petit text-texte-2'>{labels.requiredLegend}</p>
      <Input
        name='email'
        type='email'
        label={labels.emailLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        dir='ltr'
        isRequired
        value={email}
        onValueChange={setEmail}
        isInvalid={invalid}
        aria-describedby={described}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <div className='max-w-md'>
        <label htmlFor={`${base}-organisation`} className={labelClass}>
          {labels.organizationLabel}
          <span aria-hidden='true'> *</span>
        </label>
        <select
          id={`${base}-organisation`}
          name='organisation'
          aria-required='true'
          value={organisation}
          onChange={(event) => setOrganisation(event.target.value)}
          aria-invalid={invalid && organisation === '' ? true : undefined}
          aria-describedby={
            invalid && organisation === '' ? resultId : undefined
          }
          className={selectClass}
        >
          <option value='' disabled>
            {labels.organizationPlaceholder}
          </option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom}
            </option>
          ))}
        </select>
      </div>
      <div className='max-w-md'>
        <label htmlFor={`${base}-role`} className={labelClass}>
          {labels.roleLabel}
          <span aria-hidden='true'> *</span>
        </label>
        <select
          id={`${base}-role`}
          name='role'
          aria-required='true'
          value={role}
          onChange={(event) =>
            setRole(isRoleCode(event.target.value) ? event.target.value : '')
          }
          aria-invalid={invalid && role === '' ? true : undefined}
          aria-describedby={invalid && role === '' ? resultId : undefined}
          className={selectClass}
        >
          <option value='' disabled>
            {labels.rolePlaceholder}
          </option>
          {roleCodes.map((code) => (
            <option key={code} value={code}>
              {labels.roles[code]}
            </option>
          ))}
        </select>
      </div>
      <LanguageSelect
        id={`${base}-langue`}
        label={labels.languageLabel}
        value={language}
        onChange={setLanguage}
        languages={labels.languages}
      />
      <LiveMessage id={resultId} ton={ton} className='max-w-md'>
        {text ? <p>{text}</p> : null}
      </LiveMessage>
      <div>
        <PendingButton
          pending={unavailable}
          label={pending ? labels.working : labels.submit}
        />
      </div>
    </form>
  );
}

export type AdminGrantFormLabels = {
  emailLabel: string;
  confirmLabel: string;
  languageLabel: string;
  languages: Record<InvitationLocale, string>;
  submit: string;
  done: string;
  working: string;
  requiredLegend: string;
  invalidFields: string;
  alreadyAdmin: string;
  failed: string;
};

export function AdminGrantForm({
  locale,
  labels
}: {
  locale: string;
  labels: AdminGrantFormLabels;
}) {
  const base = useId();
  const resultId = `${base}-resultat`;
  const [state, formAction, pending] = useActionState(addTengaAdmin, idle);
  const [email, setEmail] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [language, setLanguage] = useState<InvitationLocale>(
    isInvitationLocale(locale) ? locale : 'fr'
  );

  useEffect(() => {
    if (state.status === 'granted') {
      setEmail('');
      setConfirmation('');
    }
  }, [state]);

  const { settled, text, ton } = outcomeOf(state, pending, 'granted', {
    working: labels.working,
    done: labels.done,
    invalid: labels.invalidFields,
    exists: labels.alreadyAdmin,
    error: labels.failed
  });
  const emailInvalid = settled === 'invalid' || settled === 'exists';
  const confirmationInvalid = settled === 'invalid';

  return (
    <form
      noValidate
      onSubmit={transitionSubmit(pending, formAction)}
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <p className='text-petit text-texte-2'>{labels.requiredLegend}</p>
      <Input
        name='email'
        type='email'
        label={labels.emailLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        dir='ltr'
        isRequired
        value={email}
        onValueChange={setEmail}
        isInvalid={emailInvalid}
        aria-describedby={emailInvalid ? resultId : undefined}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <Input
        name='confirmation'
        type='email'
        label={labels.confirmLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        dir='ltr'
        isRequired
        value={confirmation}
        onValueChange={setConfirmation}
        isInvalid={confirmationInvalid}
        aria-describedby={confirmationInvalid ? resultId : undefined}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <LanguageSelect
        id={`${base}-langue`}
        label={labels.languageLabel}
        value={language}
        onChange={setLanguage}
        languages={labels.languages}
      />
      <LiveMessage id={resultId} ton={ton} className='max-w-md'>
        {text ? <p>{text}</p> : null}
      </LiveMessage>
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.working : labels.submit}
        />
      </div>
    </form>
  );
}
