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

// Lien stylé en bouton principal (accueil, pages 404 et erreur) : fond d'accent,
// 44 px de haut, rayon 6 px, sans ombre ; appui par légère réduction.
export const boutonPrincipal = tv({
  base: 'appui inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-controle border border-transparent bg-accent px-5 font-medium leading-tight text-sur-accent hover:bg-accent-survol'
});
