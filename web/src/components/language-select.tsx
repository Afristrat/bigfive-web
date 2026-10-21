import { labelClass, selectClass } from '@/components/form-styles';
import {
  invitationLocales,
  isInvitationLocale,
  type InvitationLocale
} from '@/lib/access-rules';

/**
 * Liste déroulante des langues, CONTRÔLÉE par le formulaire parent. Ce parent
 * envoie par `onSubmit` (jamais par la prop `action`) : React ne réinitialise
 * donc pas la liste, la langue choisie reste après un refus.
 */
export function LanguageSelect({
  id,
  label,
  value,
  onChange,
  languages,
  name = 'langue'
}: {
  id: string;
  label: string;
  value: InvitationLocale;
  onChange: (code: InvitationLocale) => void;
  languages: Record<InvitationLocale, string>;
  name?: string;
}) {
  return (
    <div className='max-w-md'>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => {
          if (isInvitationLocale(event.target.value)) {
            onChange(event.target.value);
          }
        }}
        className={selectClass}
      >
        {invitationLocales.map((code) => (
          <option key={code} value={code} lang={code}>
            {languages[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
