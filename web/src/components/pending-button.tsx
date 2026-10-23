import { Button } from '@nextui-org/button';
import type { ComponentProps } from 'react';
import { submitButtonClass } from '@/components/form-styles';
import styles from '@/components/formulaires.module.css';

/**
 * Bouton d'envoi des formulaires (jamais désactivé : `disabled` ferait perdre
 * le focus, il est seulement déclaré `aria-disabled`) : ni `isLoading` (il désactive le bouton,
 * le focus tombe sur le corps de la page, et le Spinner NextUI porte un nom
 * anglais « Loading »), ni ripple (non neutralisé par prefers-reduced-motion).
 * Le libellé change en fondu ; pendant l'envoi, un trait décoratif parcourt le
 * pied du bouton (immobile sous « réduire les animations »).
 */
export function PendingButton({
  pending,
  label,
  color = 'primary',
  variant,
  ariaLabel
}: {
  pending: boolean;
  label: string;
  color?: ComponentProps<typeof Button>['color'];
  variant?: ComponentProps<typeof Button>['variant'];
  ariaLabel?: string;
}) {
  return (
    <Button
      type='submit'
      color={color}
      variant={variant}
      disableRipple
      aria-disabled={pending ? true : undefined}
      aria-label={ariaLabel}
      className={submitButtonClass}
    >
      <span key={label} className={styles.libelle}>
        {label}
      </span>
      {pending && (
        <span aria-hidden='true' data-attente='' className={styles.attente} />
      )}
    </Button>
  );
}
