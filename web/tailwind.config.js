import { nextui } from '@nextui-org/theme';

// Direction « règle graduée » (docs/design/direction.md) : fond pierre presque
// neutre, un seul accent vert cèdre, une famille sans empattement. Les échelles
// alimentent les composants NextUI (default, primary) ; les classes du site
// passent par les jetons CSS de globals.css.
const pierreClair = {
  50: '#F7F6F3',
  100: '#EFEDE8',
  200: '#E4E2DC',
  300: '#CFCCC4',
  400: '#7E837F',
  500: '#636965',
  600: '#4D5350',
  700: '#3B403D',
  800: '#2A2E2C',
  900: '#1A1C1B',
  DEFAULT: '#E4E2DC',
  foreground: '#1A1C1B'
};
const pierreSombre = {
  50: '#181C1B',
  100: '#202523',
  200: '#2C3230',
  300: '#3A403D',
  400: '#6E7571',
  500: '#949A96',
  600: '#B7BDB9',
  700: '#CDD2CE',
  800: '#E0E3DF',
  900: '#ECEDE9',
  DEFAULT: '#2C3230',
  foreground: '#ECEDE9'
};
const cedreClair = {
  50: '#EFF3F2',
  100: '#DDE5E3',
  200: '#BBCCC8',
  300: '#93ADA6',
  400: '#61877E',
  500: '#38695C',
  600: '#1D5446',
  700: '#19473C',
  800: '#163B31',
  900: '#122E27',
  DEFAULT: '#1D5446',
  foreground: '#FFFFFF'
};
const cedreSombre = {
  50: '#13241F',
  100: '#1B2E28',
  200: '#244239',
  300: '#2F5A4D',
  400: '#4B8574',
  500: '#66A894',
  600: '#7CC2AD',
  700: '#9AD3C1',
  800: '#BDE3D7',
  900: '#DFF1EB',
  DEFAULT: '#7CC2AD',
  foreground: '#0F1F1A'
};

const jeton = (nom) => `rgb(var(--c-${nom}) / <alpha-value>)`;

// Courbe unique du site : sortie franche, arrivée douce (entrées, tracés, appui).
const courbe = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-texte)']
      },
      // Trois graisses seulement (400, 500, 600) : les classes plus grasses
      // héritées se ramènent à 600, y compris en arabe.
      fontWeight: {
        bold: '600',
        extrabold: '600',
        black: '600'
      },
      colors: {
        fond: jeton('fond'),
        surface: jeton('surface'),
        creux: jeton('creux'),
        trait: jeton('trait'),
        'trait-fort': jeton('trait-fort'),
        encre: jeton('encre'),
        'texte-2': jeton('texte-2'),
        'texte-3': jeton('texte-3'),
        accent: jeton('accent'),
        'accent-survol': jeton('accent-survol'),
        'accent-doux': jeton('accent-doux'),
        'sur-accent': jeton('sur-accent'),
        piste: jeton('piste'),
        grille: jeton('grille'),
        anneau: jeton('anneau'),
        erreur: jeton('erreur'),
        'erreur-doux': jeton('erreur-doux'),
        avis: jeton('avis'),
        'avis-doux': jeton('avis-doux')
      },
      fontSize: {
        legende: ['0.8125rem', { lineHeight: '1.45' }],
        petit: ['0.875rem', { lineHeight: '1.5' }],
        corps: ['1rem', { lineHeight: '1.6' }],
        chapo: ['1.1875rem', { lineHeight: '1.55' }],
        'titre-3': ['1.1875rem', { lineHeight: '1.35', fontWeight: '600' }],
        question: [
          'clamp(1.25rem, 1.1rem + 0.5vw, 1.375rem)',
          { lineHeight: '1.35', fontWeight: '500', letterSpacing: '-0.005em' }
        ],
        'titre-section': [
          'clamp(1.5rem, 1.2rem + 1vw, 1.875rem)',
          { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.012em' }
        ],
        'titre-2': [
          '1.5rem',
          { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }
        ],
        'titre-1': [
          'clamp(1.875rem, 1.6rem + 1vw, 2.25rem)',
          { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.015em' }
        ],
        display: [
          'clamp(2.25rem, 1.7rem + 2.2vw, 3rem)',
          { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.02em' }
        ]
      },
      borderRadius: {
        petit: '4px',
        controle: '6px',
        panneau: '10px'
      },
      boxShadow: {
        flottant:
          '0 8px 24px -12px rgb(26 28 27 / 0.18), 0 0 0 1px rgb(26 28 27 / 0.06)',
        'flottant-sombre':
          '0 8px 24px -12px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(236 237 233 / 0.08)'
      },
      transitionTimingFunction: {
        tenga: courbe
      },
      transitionDuration: {
        courte: '160ms',
        normale: '200ms',
        longue: '400ms'
      },
      zIndex: {
        entete: '30',
        menu: '40',
        fenetre: '50'
      },
      keyframes: {
        tracer: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' }
        },
        apparaitre: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        tracer: `tracer 400ms ${courbe} both`,
        apparaitre: `apparaitre 200ms ${courbe} both`
      }
    }
  },
  darkMode: 'class',
  plugins: [
    nextui({
      layout: {
        radius: { small: '4px', medium: '6px', large: '10px' },
        borderWidth: { small: '1px', medium: '1px', large: '2px' },
        disabledOpacity: '0.5',
        dividerWeight: '1px',
        fontSize: {
          tiny: '0.8125rem',
          small: '0.875rem',
          medium: '1rem',
          large: '1.1875rem'
        }
      },
      themes: {
        light: {
          colors: {
            background: '#F7F6F3',
            foreground: '#1A1C1B',
            divider: '#DAD7D0',
            focus: '#1D5446',
            overlay: '#1A1C1B',
            content1: { DEFAULT: '#FFFFFF', foreground: '#1A1C1B' },
            content2: { DEFAULT: '#EFEDE8', foreground: '#1A1C1B' },
            content3: { DEFAULT: '#E4E2DC', foreground: '#1A1C1B' },
            content4: { DEFAULT: '#DAD7D0', foreground: '#1A1C1B' },
            default: pierreClair,
            primary: cedreClair,
            secondary: {
              ...pierreClair,
              DEFAULT: '#1A1C1B',
              foreground: '#FFFFFF'
            },
            success: cedreClair,
            warning: { DEFAULT: '#7A4B00', foreground: '#FFFFFF' },
            danger: { DEFAULT: '#A8261B', foreground: '#FFFFFF' }
          }
        },
        dark: {
          colors: {
            background: '#111413',
            foreground: '#ECEDE9',
            divider: '#2C3230',
            focus: '#7CC2AD',
            overlay: '#000000',
            content1: { DEFAULT: '#181C1B', foreground: '#ECEDE9' },
            content2: { DEFAULT: '#202523', foreground: '#ECEDE9' },
            content3: { DEFAULT: '#2C3230', foreground: '#ECEDE9' },
            content4: { DEFAULT: '#3A403D', foreground: '#ECEDE9' },
            default: pierreSombre,
            primary: cedreSombre,
            secondary: {
              ...pierreSombre,
              DEFAULT: '#ECEDE9',
              foreground: '#111413'
            },
            success: cedreSombre,
            warning: { DEFAULT: '#F0C987', foreground: '#2A2214' },
            danger: { DEFAULT: '#F2978C', foreground: '#2A0E0B' }
          }
        }
      }
    })
  ]
};
