// Styles de formulaire partagés par les écrans de connexion, de compte et
// d'administration (direction § 8.4) : champs et boutons de 44 px de haut (cible
// conforme au critère 2.5.8), rayon 6 px, contour fort, anneau de focus de 2 px.
export const inputClassNames = {
  base: 'max-w-md',
  label: 'font-medium text-encre',
  inputWrapper:
    'min-h-11 rounded-controle border border-trait-fort bg-surface shadow-none transition-colors duration-courte ease-tenga motion-reduce:transition-none data-[hover=true]:border-encre group-data-[focus=true]:border-accent group-data-[focus-visible=true]:outline group-data-[focus-visible=true]:outline-2 group-data-[focus-visible=true]:outline-offset-2 group-data-[focus-visible=true]:outline-anneau',
  input: 'text-corps text-encre',
  errorMessage: 'text-erreur'
} as const;

// Le bouton d'envoi rogne son contenu : le trait d'attente (PendingButton)
// court le long de son pied sans en déborder.
export const submitButtonClass =
  'appui relative overflow-hidden h-auto min-h-11 min-w-[140px] rounded-controle px-5 py-2 text-base font-medium data-[pressed=true]:scale-[0.97] motion-reduce:transition-none';

export const selectClass =
  'block min-h-11 w-full max-w-md rounded-controle border border-trait-fort bg-surface px-3 text-corps text-encre transition-colors duration-courte ease-tenga hover:border-encre focus-visible:border-accent motion-reduce:transition-none';

export const labelClass = 'mb-1.5 block font-medium text-encre';

export const secondaryButtonClass =
  'appui inline-flex min-h-11 items-center justify-center rounded-controle border border-trait-fort bg-transparent px-5 py-2 text-base font-medium text-encre hover:bg-creux motion-reduce:transition-none';
