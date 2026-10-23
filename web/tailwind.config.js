import { nextui } from '@nextui-org/theme';

// Identité « encre et safran » : papier de relevé gris bleuté, encre bleu de
// nuit, safran réservé au tracé du profil. Les échelles alimentent les
// composants NextUI (default, primary) ; les classes du site passent par les
// jetons CSS de globals.css.
const papierClair = {
  50: '#EEF0F3',
  100: '#E3E6EB',
  200: '#D3D8E0',
  300: '#BEC4CF',
  400: '#7A8197',
  500: '#5C637B',
  600: '#454C66',
  700: '#323952',
  800: '#222840',
  900: '#11162B',
  DEFAULT: '#D3D8E0',
  foreground: '#11162B'
};
const papierSombre = {
  50: '#141A2E',
  100: '#1B2238',
  200: '#262E4A',
  300: '#343D5C',
  400: '#6B7494',
  500: '#9299B4',
  600: '#B8BDCF',
  700: '#CED2DF',
  800: '#E1E3EB',
  900: '#EDEEF3',
  DEFAULT: '#262E4A',
  foreground: '#EDEEF3'
};
const encreClair = {
  50: '#EEF0F8',
  100: '#DCE1F1',
  200: '#B9C2E3',
  300: '#8E9CD0',
  400: '#5D6FB7',
  500: '#3A4C9E',
  600: '#24348F',
  700: '#1E2B78',
  800: '#192361',
  900: '#131B4A',
  DEFAULT: '#24348F',
  foreground: '#FFFFFF'
};
const safranSombre = {
  50: '#2A2416',
  100: '#3A311A',
  200: '#57451F',
  300: '#7A5F25',
  400: '#A9822F',
  500: '#D49E3A',
  600: '#F2B544',
  700: '#F6C76E',
  800: '#F9DA9C',
  900: '#FCEDCF',
  DEFAULT: '#F2B544',
  foreground: '#14182B'
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
        sans: ['var(--font-texte)'],
        display: ['var(--font-titre)']
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
        safran: jeton('safran'),
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
        geant: [
          'clamp(1.875rem, 1rem + 3.4vw, 3.75rem)',
          { lineHeight: '1.04', fontWeight: '600', letterSpacing: '-0.03em' }
        ],
        'titre-1': [
          'clamp(1.875rem, 1.6rem + 1vw, 2.25rem)',
          { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.015em' }
        ],
        display: [
          'clamp(2.5rem, 1.4rem + 4.6vw, 5.25rem)',
          { lineHeight: '0.98', fontWeight: '700', letterSpacing: '-0.035em' }
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
            background: '#EEF0F3',
            foreground: '#11162B',
            divider: '#CDD2DB',
            focus: '#24348F',
            overlay: '#11162B',
            content1: { DEFAULT: '#FFFFFF', foreground: '#11162B' },
            content2: { DEFAULT: '#E3E6EB', foreground: '#11162B' },
            content3: { DEFAULT: '#D3D8E0', foreground: '#11162B' },
            content4: { DEFAULT: '#CDD2DB', foreground: '#11162B' },
            default: papierClair,
            primary: encreClair,
            secondary: {
              ...papierClair,
              DEFAULT: '#11162B',
              foreground: '#FFFFFF'
            },
            success: encreClair,
            warning: { DEFAULT: '#7A4B00', foreground: '#FFFFFF' },
            danger: { DEFAULT: '#A8261B', foreground: '#FFFFFF' }
          }
        },
        dark: {
          colors: {
            background: '#0D1121',
            foreground: '#EDEEF3',
            divider: '#262E4A',
            focus: '#F2B544',
            overlay: '#000000',
            content1: { DEFAULT: '#141A2E', foreground: '#EDEEF3' },
            content2: { DEFAULT: '#1B2238', foreground: '#EDEEF3' },
            content3: { DEFAULT: '#262E4A', foreground: '#EDEEF3' },
            content4: { DEFAULT: '#343D5C', foreground: '#EDEEF3' },
            default: papierSombre,
            primary: safranSombre,
            secondary: {
              ...papierSombre,
              DEFAULT: '#EDEEF3',
              foreground: '#0D1121'
            },
            success: safranSombre,
            warning: { DEFAULT: '#F0C987', foreground: '#2A2214' },
            danger: { DEFAULT: '#F2978C', foreground: '#2A0E0B' }
          }
        }
      }
    })
  ]
};
