'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from 'react';
import { Button } from '@nextui-org/button';
import { useTranslations } from 'next-intl';
import {
  requestPresentation,
  type PresentationFormValues,
  type PresentationState
} from '@/actions/presentation';
import {
  labelClass,
  secondaryButtonClass,
  submitButtonClass
} from '@/components/form-styles';
import { Notice } from '@/components/notice';
import { formatNombre } from '@/lib/format';
import {
  EXCHANGE_LOCALES,
  MESSAGE_MAX,
  OBJECTIVES,
  ORGANISATION_SIZES,
  firstInvalidField,
  readFields,
  validateFields,
  type FieldErrors,
  type FieldName
} from '@/lib/presentation-fields';
import { Link } from '@/navigation';

const fieldClass =
  'block min-h-[52px] w-full rounded-controle border-[1.5px] border-trait-fort bg-surface px-3.5 text-corps text-encre transition-colors duration-normale hover:border-accent focus-visible:border-accent aria-[invalid=true]:border-erreur motion-reduce:transition-none';

// Noms natifs : chaque langue s'écrit dans sa propre langue, quelle que soit celle de la page.
const nativeNames: Record<(typeof EXCHANGE_LOCALES)[number], string> = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English'
};

const idOf = (name: FieldName): string => `presentation-${name}`;

interface FieldProps {
  name: FieldName;
  label: string;
  hint?: string;
  error?: string;
  children: (aria: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

function Field({ name, label, hint, error, children }: FieldProps) {
  const id = idOf(name);
  const describedBy =
    [hint ? `${id}-aide` : '', error ? `${id}-erreur` : '']
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-aide`} className='mb-1.5 text-petit text-texte-2'>
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy
      })}
      {error && (
        <p
          id={`${id}-erreur`}
          className='mt-1.5 text-petit font-semibold text-erreur'
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function PresentationForm({ locale }: { locale: string }) {
  const t = useTranslations('presentation');
  const [state, formAction, pending] = useActionState(requestPresentation, {
    status: 'idle'
  } as PresentationState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [length, setLength] = useState(0);
  const openedAt = useRef(0);
  const elapsed = useRef<HTMLInputElement>(null);
  const success = useRef<HTMLElement>(null);

  // Instant d'ouverture mesuré dans le navigateur (durée, pas date : l'horloge
  // du poste n'a pas à être juste).
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const serverFields = state.status === 'invalid' ? state.fields : null;
  const errors: FieldErrors = clientErrors ?? serverFields ?? {};
  const values: PresentationFormValues =
    state.status === 'idle' || state.status === 'success' ? {} : state.values;

  // Focus sur le premier champ en erreur, dans l'ordre du formulaire.
  useEffect(() => {
    const first = firstInvalidField(clientErrors ?? serverFields ?? {});
    if (first) document.getElementById(idOf(first))?.focus();
  }, [clientErrors, serverFields]);

  useEffect(() => {
    if (state.status === 'success') success.current?.focus();
  }, [state.status]);

  const stamp = () => {
    if (elapsed.current) {
      elapsed.current.value = String(Date.now() - openedAt.current);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    stamp();
    const checked = validateFields(
      readFields(new FormData(event.currentTarget))
    );
    if (!checked.ok) {
      // Aucune action serveur : les erreurs s'affichent sans aller-retour.
      event.preventDefault();
      setClientErrors(checked.fields);
      return;
    }
    setClientErrors(null);
  };

  const message = (name: FieldName): string | undefined => {
    const code = errors[name];
    return code ? t(`errors.${code}`) : undefined;
  };

  if (state.status === 'success') {
    return (
      <section
        ref={success}
        tabIndex={-1}
        role='status'
        aria-labelledby='presentation-succes'
        className='carte colonne-lecture focus:outline-none'
      >
        <h2 id='presentation-succes' className='text-titre-2 text-encre'>
          {t('success.title')}
        </h2>
        <p className='mt-3 text-texte-2'>{t('success.text')}</p>
        <h3 className='mt-6 text-titre-3 text-encre'>
          {t('success.nextTitle')}
        </h3>
        <ol className='mt-2 list-decimal space-y-1.5 ps-6 text-texte-2'>
          <li>{t('success.step1')}</li>
          <li>{t('success.step2')}</li>
        </ol>
        <Link href='/' className={`${secondaryButtonClass} mt-7`}>
          {t('success.back')}
        </Link>
      </section>
    );
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      onChange={stamp}
      noValidate
      className='relative mt-8 flex max-w-xl flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <input ref={elapsed} type='hidden' name='elapsed' defaultValue='0' />
      {/* Piège à robots : invisible et hors du parcours au clavier. */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute top-auto h-px w-px overflow-hidden opacity-0 [inset-inline-start:-9999px]'
      >
        <label>
          {t('honeypot')}
          <input type='text' name='website' tabIndex={-1} autoComplete='off' />
        </label>
      </div>

      <p className='text-petit text-texte-2'>{t('requiredNote')}</p>

      {hasErrors && (
        <Notice ton='erreur'>
          <p>{t('summary')}</p>
        </Notice>
      )}
      {state.status === 'retry' && (
        <Notice ton='erreur'>
          <p>{t('retry')}</p>
        </Notice>
      )}
      {state.status === 'failed' && (
        <Notice ton='erreur'>
          <p>{t('failed')}</p>
        </Notice>
      )}

      <Field name='name' label={t('fields.name')} error={message('name')}>
        {(aria) => (
          <input
            {...aria}
            name='name'
            type='text'
            required
            aria-required='true'
            maxLength={120}
            autoComplete='name'
            defaultValue={values.name}
            className={fieldClass}
          />
        )}
      </Field>

      <Field
        name='organisation'
        label={t('fields.organisation')}
        error={message('organisation')}
      >
        {(aria) => (
          <input
            {...aria}
            name='organisation'
            type='text'
            required
            aria-required='true'
            maxLength={160}
            autoComplete='organization'
            defaultValue={values.organisation}
            className={fieldClass}
          />
        )}
      </Field>

      <Field name='role' label={t('fields.role')} error={message('role')}>
        {(aria) => (
          <input
            {...aria}
            name='role'
            type='text'
            required
            aria-required='true'
            maxLength={120}
            autoComplete='organization-title'
            defaultValue={values.role}
            className={fieldClass}
          />
        )}
      </Field>

      <Field name='email' label={t('fields.email')} error={message('email')}>
        {(aria) => (
          <input
            {...aria}
            name='email'
            type='email'
            required
            aria-required='true'
            maxLength={200}
            autoComplete='email'
            inputMode='email'
            dir='ltr'
            defaultValue={values.email}
            className={fieldClass}
          />
        )}
      </Field>

      <Field name='size' label={t('fields.size')} error={message('size')}>
        {(aria) => (
          <select
            {...aria}
            name='size'
            required
            aria-required='true'
            defaultValue={values.size ?? ''}
            className={fieldClass}
          >
            <option value=''>{t('choose')}</option>
            {ORGANISATION_SIZES.map((value) => (
              <option key={value} value={value}>
                {t(`sizes.${value}`)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        name='objective'
        label={t('fields.objective')}
        error={message('objective')}
      >
        {(aria) => (
          <select
            {...aria}
            name='objective'
            required
            aria-required='true'
            defaultValue={values.objective ?? ''}
            className={fieldClass}
          >
            <option value=''>{t('choose')}</option>
            {OBJECTIVES.map((value) => (
              <option key={value} value={value}>
                {t(`objectives.${value}`)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        name='exchangeLocale'
        label={t('fields.exchangeLocale')}
        error={message('exchangeLocale')}
      >
        {(aria) => (
          <select
            {...aria}
            name='exchangeLocale'
            required
            aria-required='true'
            defaultValue={
              values.exchangeLocale ??
              EXCHANGE_LOCALES.find((code) => code === locale) ??
              'fr'
            }
            className={fieldClass}
          >
            {EXCHANGE_LOCALES.map((code) => (
              <option key={code} value={code} lang={code}>
                {nativeNames[code]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        name='message'
        label={t('fields.message')}
        hint={t('fields.messageHint', {
          max: formatNombre(MESSAGE_MAX, locale)
        })}
        error={message('message')}
      >
        {(aria) => (
          <>
            <textarea
              {...aria}
              name='message'
              rows={5}
              maxLength={MESSAGE_MAX}
              defaultValue={values.message}
              onChange={(event) => setLength(event.currentTarget.value.length)}
              className={`${fieldClass} min-h-[140px] py-3`}
            />
            <p className='mt-1 text-petit text-texte-2'>
              {t('fields.messageCount', {
                count: formatNombre(length, locale),
                max: formatNombre(MESSAGE_MAX, locale)
              })}
            </p>
          </>
        )}
      </Field>

      <div>
        <label className='flex min-h-11 items-start gap-3'>
          <input
            id={idOf('consent')}
            name='consent'
            type='checkbox'
            required
            aria-required='true'
            aria-invalid={errors.consent !== undefined}
            aria-describedby={
              errors.consent
                ? `${idOf('consent')}-erreur presentation-information`
                : 'presentation-information'
            }
            className='mt-0.5 size-6 flex-none accent-accent'
          />
          <span className='font-semibold text-encre'>{t('consent')}</span>
        </label>
        {errors.consent && (
          <p
            id={`${idOf('consent')}-erreur`}
            className='mt-1.5 text-petit font-semibold text-erreur'
          >
            {message('consent')}
          </p>
        )}
      </div>

      <div>
        <Button
          type='submit'
          color='primary'
          isLoading={pending}
          className={submitButtonClass}
        >
          {pending ? t('sending') : t('submit')}
        </Button>
      </div>

      {/* Texte juridique à valider par le client (usage et durée de conservation). */}
      <p id='presentation-information' className='text-petit text-texte-2'>
        {t('information')}
      </p>
    </form>
  );
}
