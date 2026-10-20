import { tv } from 'tailwind-variants';

export const title = tv({
  base: 'text-encre',
  variants: {
    size: {
      display: 'text-[2.25rem] leading-[1.1] md:text-display font-semibold',
      lg: 'text-[1.875rem] md:text-titre-1 font-semibold',
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
  base: 'inline-flex h-11 items-center gap-2 rounded-controle bg-accent px-5 font-medium text-sur-accent transition-colors duration-courte hover:bg-accent-survol active:translate-y-px'
});
