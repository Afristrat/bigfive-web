import { nextui } from '@nextui-org/theme';

// Direction B2 : neutres bleutés et une seule teinte, l'indigo. Les échelles
// alimentent les composants NextUI (default, primary) ; les classes du site
// passent par les jetons CSS de globals.css.
const neutreClair = {
  50: '#F6F6FA',
  100: '#EFEFF8',
  200: '#E3E4F0',
  300: '#DCDDEB',
  400: '#7A7D9B',
  500: '#5F6280',
  600: '#4A4D68',
  700: '#34364F',
  800: '#22243B',
  900: '#121328',
  DEFAULT: '#E3E4F0',
  foreground: '#121328'
};
const neutreSombre = {
  50: '#14152A',
  100: '#1B1C36',
  200: '#292B4A',
  300: '#3A3D63',
  400: '#7B7EA8',
  500: '#A8ABC8',
  600: '#BFC1DA',
  700: '#D3D5E8',
  800: '#E4E5F3',
  900: '#F0F0FB',
  DEFAULT: '#292B4A',
  foreground: '#F0F0FB'
};
const indigoClair = {
  50: '#ECECFB',
  100: '#DEDEF7',
  200: '#C3C3EF',
  300: '#9D9AE0',
  400: '#6F68C7',
  500: '#4A42B0',
  600: '#3730A3',
  700: '#2B2582',
  800: '#211D66',
  900: '#18154B',
  DEFAULT: '#3730A3',
  foreground: '#FFFFFF'
};
const indigoSombre = {
  50: '#171836',
  100: '#23254B',
  200: '#33367A',
  300: '#4F53B0',
  400: '#7679DB',
  500: '#8D90F5',
  600: '#9EA1FF',
  700: '#B8BAFF',
  800: '#D2D3FF',
  900: '#EBEBFF',
  DEFAULT: '#9EA1FF',
  foreground: '#0C0D1B'
};

const jeton = (nom) => `rgb(var(--c-${nom}) / <alpha-value>)`;

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
        point: jeton('point'),
        anneau: jeton('anneau'),
        erreur: jeton('erreur'),
        'erreur-doux': jeton('erreur-doux'),
        avis: jeton('avis'),
        'avis-doux': jeton('avis-doux')
      },
      fontSize: {
        legende: ['0.8125rem', { lineHeight: '1.45' }],
        petit: ['0.9375rem', { lineHeight: '1.5' }],
        corps: ['1.0625rem', { lineHeight: '1.6' }],
        chapo: [
          'clamp(1.125rem, 2vw, 1.3125rem)',
          { lineHeight: '1.55' }
        ],
        'titre-3': [
          '1.25rem',
          { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }
        ],
        question: ['1.375rem', { lineHeight: '1.35', fontWeight: '500' }],
        'titre-section': [
          'clamp(1.75rem, 3.6vw, 2.625rem)',
          { lineHeight: '1.12', fontWeight: '800', letterSpacing: '-0.025em' }
        ],
        'titre-2': [
          'clamp(1.5rem, 2.4vw, 1.875rem)',
          { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }
        ],
        'titre-1': [
          'clamp(2.125rem, 4.2vw, 3.25rem)',
          { lineHeight: '1.06', fontWeight: '800', letterSpacing: '-0.035em' }
        ],
        display: [
          'clamp(2.375rem, 4.8vw, 3.75rem)',
          { lineHeight: '1.04', fontWeight: '800', letterSpacing: '-0.035em' }
        ]
      },
      borderRadius: {
        petit: '10px',
        controle: '16px',
        panneau: '28px'
      },
      boxShadow: {
        carte: 'var(--ombre)',
        flottant:
          '0 1px 2px rgb(18 19 40 / 0.05), 0 10px 28px -14px rgb(18 19 40 / 0.18)',
        'flottant-sombre':
          '0 1px 2px rgb(0 0 0 / 0.4), 0 14px 32px -16px rgb(0 0 0 / 0.7)'
      },
      transitionTimingFunction: {
        tenga: 'cubic-bezier(0.2, 0, 0, 1)'
      },
      transitionDuration: {
        courte: '120ms',
        normale: '180ms',
        longue: '320ms'
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
        tracer: 'tracer 320ms cubic-bezier(0.2, 0, 0, 1) both',
        apparaitre: 'apparaitre 180ms cubic-bezier(0.2, 0, 0, 1) both'
      }
    }
  },
  darkMode: 'class',
  plugins: [
    nextui({
      layout: {
        radius: { small: '10px', medium: '16px', large: '28px' },
        borderWidth: { small: '1px', medium: '1px', large: '2px' },
        disabledOpacity: '0.5',
        dividerWeight: '1px',
        fontSize: {
          tiny: '0.8125rem',
          small: '0.9375rem',
          medium: '1.0625rem',
          large: '1.25rem'
        }
      },
      themes: {
        light: {
          colors: {
            background: '#F6F6FA',
            foreground: '#121328',
            divider: '#DCDDEB',
            focus: '#3730A3',
            overlay: '#121328',
            content1: { DEFAULT: '#FFFFFF', foreground: '#121328' },
            content2: { DEFAULT: '#EFEFF8', foreground: '#121328' },
            content3: { DEFAULT: '#E3E4F0', foreground: '#121328' },
            content4: { DEFAULT: '#DCDDEB', foreground: '#121328' },
            default: neutreClair,
            primary: indigoClair,
            secondary: {
              ...neutreClair,
              DEFAULT: '#121328',
              foreground: '#FFFFFF'
            },
            success: indigoClair,
            warning: { DEFAULT: '#7A4B00', foreground: '#FFFFFF' },
            danger: { DEFAULT: '#A8261B', foreground: '#FFFFFF' }
          }
        },
        dark: {
          colors: {
            background: '#0C0D1B',
            foreground: '#F0F0FB',
            divider: '#2A2C4A',
            focus: '#C4C6FF',
            overlay: '#000000',
            content1: { DEFAULT: '#14152A', foreground: '#F0F0FB' },
            content2: { DEFAULT: '#1B1C36', foreground: '#F0F0FB' },
            content3: { DEFAULT: '#292B4A', foreground: '#F0F0FB' },
            content4: { DEFAULT: '#3A3D63', foreground: '#F0F0FB' },
            default: neutreSombre,
            primary: indigoSombre,
            secondary: {
              ...neutreSombre,
              DEFAULT: '#F0F0FB',
              foreground: '#0C0D1B'
            },
            success: indigoSombre,
            warning: { DEFAULT: '#F0C987', foreground: '#2A2214' },
            danger: { DEFAULT: '#F2978C', foreground: '#2A0E0B' }
          }
        }
      }
    })
  ]
};
