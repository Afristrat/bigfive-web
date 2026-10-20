// Styles de formulaire de la direction B2, partagés par les écrans de connexion,
// de compte et d'administration : champs et boutons de 52 px de haut (cible
// d'au moins 44 px, WCAG 2.5.8), contour fort, anneau de focus de 3 px.
export const inputClassNames = {
  base: 'max-w-md',
  label: 'font-semibold text-encre',
  inputWrapper:
    'min-h-[52px] rounded-controle border-[1.5px] border-trait-fort bg-surface shadow-none transition-colors duration-normale motion-reduce:transition-none data-[hover=true]:border-accent group-data-[focus=true]:border-accent group-data-[focus-visible=true]:outline group-data-[focus-visible=true]:outline-[3px] group-data-[focus-visible=true]:outline-offset-2 group-data-[focus-visible=true]:outline-anneau',
  input: 'text-corps text-encre',
  errorMessage: 'text-erreur'
} as const;

export const submitButtonClass =
  'h-auto min-h-[52px] min-w-[140px] rounded-controle px-[26px] py-2 text-base font-bold data-[pressed=true]:translate-y-px motion-reduce:transition-none rtl:font-semibold';

export const selectClass =
  'block min-h-[52px] w-full max-w-md rounded-controle border-[1.5px] border-trait-fort bg-surface px-3.5 text-corps text-encre transition-colors duration-normale hover:border-accent focus-visible:border-accent motion-reduce:transition-none';

export const labelClass = 'mb-1.5 block font-semibold text-encre';

export const secondaryButtonClass =
  'inline-flex min-h-[52px] items-center justify-center rounded-controle border-[1.5px] border-trait-fort bg-surface px-[26px] py-2 text-base font-bold text-encre transition-colors duration-normale hover:bg-creux active:translate-y-px motion-reduce:transition-none rtl:font-semibold';
