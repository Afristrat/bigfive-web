import { startTransition } from 'react';

/**
 * Envoi d'un formulaire à champs CONTRÔLÉS, à poser sur `onSubmit` SANS prop
 * `action`. Avec `action={formAction}`, React 19 demande une réinitialisation
 * native du formulaire à chaque action, refus compris : react-aria vide alors
 * les champs NextUI contrôlés et les listes retombent sur leur option montée.
 * Ici la soumission native est annulée et l'action est lancée dans une
 * transition (`isPending` de `useActionState` reste exact) : aucun
 * `form.reset()` n'est programmé, une saisie refusée reste affichée.
 * Pendant un envoi, une seconde soumission est ignorée. Conséquence assumée :
 * l'envoi exige JavaScript (NextUI l'exige déjà).
 */
export const transitionSubmit =
  (
    pending: boolean,
    run: (data: FormData) => void,
    toData: (form: HTMLFormElement) => FormData = (form) => new FormData(form)
  ) =>
  (event: {
    preventDefault: () => void;
    currentTarget: HTMLFormElement;
  }): void => {
    event.preventDefault();
    if (pending) return;
    const data = toData(event.currentTarget);
    startTransition(() => run(data));
  };
