import { tv } from 'tailwind-variants';

export const title = tv({
  base: 'text-encre',
  variants: {
    size: {
      display: 'text-display',
      lg: 'text-titre-1',
      section: 'text-titre-section',
      md: 'text-titre-2',
      sm: 'text-titre-3'
    }
  },
  defaultVariants: { size: 'lg' }
});

export const subtitle = tv({
  base: 'mt-3 text-chapo text-texte-2 colonne-lecture'
});

export const heading = tv({
  base: 'text-titre-2 text-encre'
});

// Lien stylé en bouton principal (accueil, pages 404 et erreur).
export const boutonPrincipal = tv({
  base: 'inline-flex min-h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-controle border-[1.5px] border-transparent bg-accent px-[26px] font-bold leading-tight text-sur-accent shadow-[0_8px_20px_-10px_rgb(var(--c-accent))] transition duration-normale ease-tenga hover:-translate-y-px hover:bg-accent-survol active:translate-y-px'
});
