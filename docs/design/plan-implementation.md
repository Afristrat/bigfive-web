# Plan d'implémentation de la refonte du design, phase 2

20 octobre 2026. Destinataire : l'agent qui implémentera la direction de `docs/design/direction.md` dans `web/src`. Ce plan s'exécute dans l'ordre, une étape après l'autre ; chaque étape dit quoi changer, fichier par fichier. Les valeurs de jetons et le code des fichiers de fondation sont donnés en entier pour qu'il n'y ait rien à réinterpréter. Branche de départ : `tenga-espace-prive` au commit `905a404` ou postérieur.

## 0. Règles d'exécution

1. **Zones que les lots suivants réécrivent : ne pas y investir.** On n'y applique que les jetons (couleurs, polices, suppression des classes physiques gauche et droite) ; aucune refonte de structure, aucun nouveau composant.

   | Zone | Lot qui la réécrit | Traitement ici |
   |---|---|---|
   | `app/[locale]/compare/**`, `components/bar-chart-generic.tsx` | Lot 2 (suppression de la comparaison) | Rien, sauf ce que le thème change tout seul |
   | `app/[locale]/result/page.tsx`, `app/[locale]/result/get-result.tsx` (recherche par identifiant) | Lot 1 (fermeture des liens publics) | Rien |
   | `components/share-bar.tsx`, `components/email-modal.tsx` | Lot 3 (suppression du partage et de l'envoi du lien) | Tailles d'icônes uniformisées (étape 15) et libellés traduits, rien de plus |
   | Bloc « Important ! » et identifiant du résultat | Lot 1 | Déplacé et neutralisé (étape 16), pas redessiné |
   | `config/site.ts`, entrées de navigation, connexion, menu du compte | Lot 1 (connexion), lot 5 (chemins traduits) | Liste des liens inchangée ; on réserve seulement l'emplacement dans l'en-tête |
   | Noms des dossiers de routes `test/` et `result/` | Lot 5 (`/fr/questionnaire`, `/fr/mes-resultats`) | Ne pas renommer ni déplacer les dossiers de routes |
   | État du questionnaire dans `localStorage` | Lot 2 (progression sur le serveur) | Ne pas toucher à la logique d'état ; séparer seulement l'affichage (étape 13) pour que le lot 2 le réutilise |
   | Textes de `privacy/page.tsx` | Lots 1 et 2 (nouvelle notice) | Mise en page seulement |

2. **Aucune nouvelle dépendance.** On retire `canvas-confetti` et `@types/canvas-confetti`. ApexCharts reste installé tant que `compare/` existe.
3. **Interdits dans tout fichier touché** : `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `space-x-`, `uppercase` ou `.toUpperCase()` sur un libellé, couleur en dur (`#…`, `text-gray-*`, `bg-gray-*`, `text-danger` pour un état non dangereux), `h-screen`. Un fichier touché est corrigé en entier, défauts préexistants compris.
4. **Textes** : tout libellé d'interface passe par `messages/fr.js`, `ar.js`, `en.js` (clés données à l'étape 3). Aucun texte en dur dans le JSX, y compris `aria-label`.
5. **Vérification à chaque étape** : `pnpm lint`, `pnpm typecheck`, `pnpm test` à 0 erreur et 0 avertissement ; `pnpm build` aux étapes 2, 12, 16 et 22. Vérification visuelle sur le site déployé uniquement (pas de serveur de développement local), par Playwright CLI.

## Étape 1. `web/tailwind.config.js` (remplacer le fichier entier)

```js
import { nextui } from '@nextui-org/theme';

const pierreClair = {
  50: '#F7F6F3', 100: '#EFEDE8', 200: '#E4E2DC', 300: '#CFCCC4', 400: '#7E837F',
  500: '#636965', 600: '#4D5350', 700: '#3B403D', 800: '#2A2E2C', 900: '#1A1C1B',
  DEFAULT: '#E4E2DC', foreground: '#1A1C1B'
};
const pierreSombre = {
  50: '#181C1B', 100: '#202523', 200: '#2C3230', 300: '#3A403D', 400: '#6E7571',
  500: '#949A96', 600: '#B7BDB9', 700: '#CDD2CE', 800: '#E0E3DF', 900: '#ECEDE9',
  DEFAULT: '#2C3230', foreground: '#ECEDE9'
};
const cedreClair = {
  50: '#EFF3F2', 100: '#DDE5E3', 200: '#BBCCC8', 300: '#93ADA6', 400: '#61877E',
  500: '#38695C', 600: '#1D5446', 700: '#19473C', 800: '#163B31', 900: '#122E27',
  DEFAULT: '#1D5446', foreground: '#FFFFFF'
};
const cedreSombre = {
  50: '#13241F', 100: '#1B2E28', 200: '#244239', 300: '#2F5A4D', 400: '#4B8574',
  500: '#66A894', 600: '#7CC2AD', 700: '#9AD3C1', 800: '#BDE3D7', 900: '#DFF1EB',
  DEFAULT: '#7CC2AD', foreground: '#0F1F1A'
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
        question: ['1.375rem', { lineHeight: '1.35', fontWeight: '500' }],
        'titre-2': ['1.5rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'titre-1': ['2.25rem', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.015em' }],
        display: ['3rem', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.02em' }]
      },
      borderRadius: {
        petit: '4px',
        controle: '6px',
        panneau: '10px'
      },
      boxShadow: {
        flottant: '0 8px 24px -12px rgb(26 28 27 / 0.18), 0 0 0 1px rgb(26 28 27 / 0.06)',
        'flottant-sombre': '0 8px 24px -12px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(236 237 233 / 0.08)'
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
        radius: { small: '4px', medium: '6px', large: '10px' },
        borderWidth: { small: '1px', medium: '1px', large: '2px' },
        disabledOpacity: '0.5',
        dividerWeight: '1px',
        fontSize: { tiny: '0.8125rem', small: '0.875rem', medium: '1rem', large: '1.1875rem' }
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
            secondary: { ...pierreClair, DEFAULT: '#1A1C1B', foreground: '#FFFFFF' },
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
            secondary: { ...pierreSombre, DEFAULT: '#ECEDE9', foreground: '#111413' },
            success: cedreSombre,
            warning: { DEFAULT: '#F0C987', foreground: '#2A2214' },
            danger: { DEFAULT: '#F2978C', foreground: '#2A0E0B' }
          }
        }
      }
    })
  ]
};
```

Notes : `overlay` vaut le noir uniquement comme voile semi-transparent des fenêtres (NextUI l'applique avec opacité) ; ce n'est pas un fond. Les anciennes animations `infinite-scroll` et `shadow-pulse` disparaissent.

## Étape 2. `web/src/styles/globals.css` (remplacer le fichier entier)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --c-fond: 247 246 243;
    --c-surface: 255 255 255;
    --c-creux: 239 237 232;
    --c-trait: 218 215 208;
    --c-trait-fort: 126 131 127;
    --c-encre: 26 28 27;
    --c-texte-2: 77 83 80;
    --c-texte-3: 99 105 101;
    --c-accent: 29 84 70;
    --c-accent-survol: 22 67 58;
    --c-accent-doux: 227 237 233;
    --c-sur-accent: 255 255 255;
    --c-erreur: 168 38 27;
    --c-erreur-doux: 251 234 231;
    --c-avis: 122 75 0;
    --c-avis-doux: 251 241 222;
    --font-texte: var(--font-latin), system-ui, sans-serif;
    color-scheme: light;
  }

  .dark {
    --c-fond: 17 20 19;
    --c-surface: 24 28 27;
    --c-creux: 32 37 35;
    --c-trait: 44 50 48;
    --c-trait-fort: 110 117 113;
    --c-encre: 236 237 233;
    --c-texte-2: 183 189 185;
    --c-texte-3: 148 154 150;
    --c-accent: 124 194 173;
    --c-accent-survol: 154 211 193;
    --c-accent-doux: 27 46 40;
    --c-sur-accent: 15 31 26;
    --c-erreur: 242 151 140;
    --c-erreur-doux: 58 30 26;
    --c-avis: 240 201 135;
    --c-avis-doux: 42 34 20;
    color-scheme: dark;
  }

  :root:lang(ar) {
    --font-texte: var(--font-arabe), var(--font-latin), system-ui, sans-serif;
  }

  html {
    scroll-behavior: smooth;
    scroll-padding-top: 5rem;
  }

  body {
    @apply bg-fond text-encre font-sans antialiased text-corps;
  }

  h1, h2, h3 {
    text-wrap: balance;
  }

  p, li, dd {
    text-wrap: pretty;
  }

  /* Arabe : interlignage majoré, aucune approche négative, corps légèrement plus grand. */
  :lang(ar) body { font-size: 1.0625rem; line-height: 1.8; }
  :lang(ar) h1, :lang(ar) h2, :lang(ar) h3, :lang(ar) .text-display {
    letter-spacing: 0;
    line-height: 1.45;
  }

  :focus-visible {
    outline: 2px solid rgb(var(--c-accent));
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  .conteneur {
    @apply mx-auto w-full max-w-6xl px-5 sm:px-8;
  }

  .colonne-lecture {
    @apply max-w-[68ch];
  }
  :lang(ar) .colonne-lecture { max-width: 60ch; }

  .chiffres {
    font-variant-numeric: tabular-nums;
  }

  .texte-riche > * + * { @apply mt-4; }
  .texte-riche h2 { @apply mt-10 text-titre-2 text-encre; }
  .texte-riche h3 { @apply mt-8 text-titre-3 text-encre; }
  .texte-riche p, .texte-riche li { @apply text-texte-2; }
  .texte-riche ul { @apply list-disc ps-6; }
  .texte-riche ol { @apply list-decimal ps-6; }
  .texte-riche a { @apply text-accent underline underline-offset-2 hover:text-accent-survol; }
  .texte-riche blockquote { @apply border-s-2 border-accent ps-4 text-chapo text-encre; }

  /* Règles graduées : visibles en couleurs forcées et à l'impression. */
  .regle-piste, .regle-trait {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  @media (forced-colors: active) {
    .regle-piste { forced-color-adjust: none; background: Canvas; outline: 1px solid CanvasText; }
    .regle-trait { forced-color-adjust: none; background: CanvasText; }
  }
}
```

## Étape 3. Textes d'interface (`web/src/messages/fr.js`, `ar.js`, `en.js`)

**Source unique des textes : `docs/design/textes.md` et `docs/design/voix-de-marque.md`**, rédigés en parallèle par la session chargée des textes. Ce plan ne réécrit aucun texte qu'ils couvrent :

1. Appliquer toutes les propositions de `textes.md` marquées *Activation : immédiate*, avec les noms de clés qu'il donne (`toolbar.home_aria`, `toolbar.open_menu`, `toolbar.close_menu`, `frontpage.seo.image_alt`, `frontpage.description.reference`, `test.back` qui devient « Précédent », `test.seeResults`, `test.instructions`, `results.intro`, `results.print`, `notFound.*`, `error.*`, `about.*`, `faq.*`…). Ne pas appliquer celles marquées *lot N* ni celles qui attendent une décision d'Amine.
2. Libellés des domaines et des facettes : ceux du lexique de `voix-de-marque.md` § 4.1 et § 4.3, pas les titres du paquet `@bigfive-org/results` (« Conscience », « Convivialité » y sont des contresens). Créer `web/src/lib/domain-labels.ts` qui associe chaque code de domaine (`O`, `C`, `E`, `A`, `N`) et chaque facette (code de domaine et numéro 1 à 6) à son libellé FR, AR et EN, forme longue et forme courte. Tous les composants de cette refonte lisent leurs libellés dans ce module, jamais `domain.title` ni `facet.title`.
3. Typographie des fichiers de messages : espaces insécables ` ` avant `:` `;` `!` `?` et dans « », comme l'exige `textes.md` § 0.

Clés supplémentaires propres à la mise en page, absentes de `textes.md`. En arabe, boutons et libellés au nom verbal (مصدر), jamais à l'impératif, conformément à `voix-de-marque.md` § 2.2 :

| Clé | FR | AR | EN |
|---|---|---|---|
| `a11y.skip` | Aller au contenu | الانتقال إلى المحتوى | Skip to content |
| `a11y.mainNav` | Navigation principale | التنقل الرئيسي | Main navigation |
| `theme.toDark` | Passer au thème sombre | التبديل إلى الوضع الداكن | Switch to dark theme |
| `theme.toLight` | Passer au thème clair | التبديل إلى الوضع الفاتح | Switch to light theme |
| `language.label` | Langue | اللغة | Language |
| `footer.service` | Un service de Tenga Conseil | خدمة من Tenga Conseil | A Tenga Conseil service |
| `test.heading` | Questionnaire de personnalité | استبيان الشخصية | Personality questionnaire |
| `test.progress` | Question {current} sur {total} | السؤال {current} من {total} | Question {current} of {total} |
| `test.saving` | Enregistrement… | جارٍ الحفظ… | Saving… |
| `test.dismiss` | Masquer ce message | إخفاء هذه الرسالة | Dismiss this message |
| `test.noTimeLimit` | Sans limite de temps | دون تقيّد بوقت محدّد | No time limit |
| `results.title` | Votre profil de personnalité | ملف شخصيتك | Your personality profile |
| `results.overview` | Vos cinq dimensions | أبعادك الخمسة | Your five dimensions |
| `results.scaleNote` | Le trait vertical marque le milieu de l'échelle de réponse (3 sur 5). | يشير الخط العمودي إلى منتصف سلّم الإجابة (3 من 5). | The vertical mark is the middle of the answer scale (3 out of 5). |
| `results.outOf` | sur {max} | من {max} | out of {max} |
| `results.level.low` | bas | منخفض | low |
| `results.level.neutral` | au milieu | في المنتصف | in the middle |
| `results.level.high` | élevé | مرتفع | high |
| `results.facets` | Facettes | السمات الفرعية | Facets |
| `results.learnMore` | En savoir plus sur cette dimension | مزيد من المعلومات عن هذا البعد | Learn more about this dimension |
| `results.contents` | Sommaire | المحتويات | Contents |
| `results.neuroticismGloss` | Sensibilité aux émotions négatives et au stress ; ce n'est pas un diagnostic. | الحساسية تجاه المشاعر السلبية والضغط، وليست تشخيصًا. | Sensitivity to negative emotions and stress; this is not a diagnosis. |
| `home.specimen` | Exemple de restitution, valeurs fictives | مثال على التقرير، بقيم افتراضية | Sample report, fictitious values |
| `articles.back` | Retour aux articles | العودة إلى المقالات | Back to articles |
| `articles.readingTime` | {minutes} min de lecture | {minutes} د للقراءة | {minutes} min read |
| `articles.empty` | Aucun article n'est encore publié dans cette langue. | لم يُنشر أي مقال بهذه اللغة بعد. | No article has been published in this language yet. |
| `articles.machineTranslated` | Traduction automatique | ترجمة آلية | Machine translation |
| `error.retry` | Réessayer | إعادة المحاولة | Try again |
| `share.facebook` | Partager sur Facebook | المشاركة على فيسبوك | Share on Facebook |
| `share.x` | Partager sur X | المشاركة على X | Share on X |
| `share.mail` | Envoyer le lien par e-mail | إرسال الرابط بالبريد الإلكتروني | Email the link |
| `share.copy` | Copier le lien | نسخ الرابط | Copy link |

Les textes arabes de ce tableau sont à faire relire par la session des textes avant publication (`voix-de-marque.md` § 2.3, arabe natif).

Rendu du titre d'accueil : `frontpage.description.top` contient une balise `<violet>` (`textes.md` § 2). La rendre **sans couleur ni graisse particulière** (`violet: (chunks) => chunks`) : mettre en couleur un seul groupe de mots d'un titre est un tic de gabarit (direction § 2).

Libellés de réponse : l'alignement des échelles FR et AR (`textes.md` § 3.3) attend la décision 12 d'Amine. D'ici là, seule la coquille « Plutot » est corrigée, par surcharge dans `web/src/lib/question-overrides.ts` (le paquet `@bigfive-org/questions`, `data/fr/choices.js`, ne se modifie pas) : ajouter dans `getLocalizedItems` le remplacement des `choices[].text` français « Plutot » par « Plutôt », et un test dans `web/tests/unit/question-overrides.test.ts` qui vérifie qu'aucun choix français ne contient « Plutot ». Une correction orthographique ne change pas la question posée : pas de nouvelle `QUESTIONNAIRE_VERSION`.

## Étape 4. `web/src/config/fonts.ts` (remplacer le fichier entier)

```ts
import { IBM_Plex_Sans_Arabic, Instrument_Sans } from 'next/font/google';

export const fontLatin = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-latin'
});

// Téléchargée seulement quand un glyphe arabe est affiché.
export const fontArabe = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-arabe'
});
```

Vérifier au premier build que les chiffres tabulaires existent dans Instrument Sans (comparer la largeur de « 111 » et de « 888 » en `.chiffres`) ; sinon, donner à la colonne des valeurs de `ScoreRule` une largeur fixe `min-w-[3ch]`.

## Étape 5. Nouveau `web/src/lib/format.ts`

```ts
const regions: Record<string, string> = { fr: 'fr-MA', ar: 'ar-MA', en: 'en-GB' };

export const localeRegionale = (locale: string) => regions[locale] ?? locale;

// Chiffres occidentaux en arabe : usage marocain courant, indépendant de la version ICU.
export const formatNombre = (valeur: number, locale: string) =>
  new Intl.NumberFormat(localeRegionale(locale), { numberingSystem: 'latn' }).format(valeur);

export const formatDate = (date: Date | string, locale: string) =>
  new Intl.DateTimeFormat(localeRegionale(locale), {
    dateStyle: 'long',
    numberingSystem: 'latn'
  }).format(new Date(date));
```

Test unitaire `web/tests/unit/format.test.ts` : `formatDate('2026-10-19', 'ar')` ne contient aucun chiffre arabe oriental (`/[٠-٩]/`) ; `formatDate('2026-10-19', 'fr')` vaut « 19 octobre 2026 ».

## Étape 6. `web/src/app/[locale]/layout.tsx` et `web/src/app/providers.tsx`

`layout.tsx` :

- Importer `fontLatin`, `fontArabe` au lieu de `fontSans` ; `body` reçoit `clsx(fontLatin.variable, fontArabe.variable)` et plus aucune autre classe (le fond, la couleur et la police viennent de `globals.css`).
- `viewport.themeColor` (lignes 68-71) : `#F7F6F3` en clair, `#111413` en sombre.
- `themeProps` (lignes 98-103) : `{ attribute: 'class', defaultTheme: 'system', enableSystem: true, disableTransitionOnChange: true }`.
- Passer `locale` à `Providers`.
- Remplacer le conteneur des lignes 105-111 par :
  - un lien d'évitement en tout premier enfant : `<a href='#contenu' className='sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-fenetre focus:rounded-controle focus:bg-surface focus:px-4 focus:py-2 focus:shadow-flottant'>` avec `a11y.skip` ;
  - `<div className='flex min-h-[100dvh] flex-col'>` ;
  - `<Navbar …/>` ;
  - `<main id='contenu' tabIndex={-1} className='conteneur flex-grow pb-24 pt-10 md:pt-16 focus:outline-none'>` ;
  - `<Footer …/>`.
- `generateMetadata` : `authors` inchangé ; `openGraph.images.alt` et `twitter.images.alt` deviennent le titre SEO traduit au lieu de « People comparing personality tests ».

`providers.tsx` : ajouter la propriété `locale: string` et la transmettre à `NextUIProvider` sous la forme `locale={localeRegionale(locale)}` (fonction de l'étape 5), pour que react-aria formate nombres et sens d'écriture selon la langue.

## Étape 7. `web/src/components/primitives.ts` (remplacer le fichier entier)

Supprimer les variantes de couleur en dégradé. Nouveau contenu :

```ts
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
```

Tous les appels `title()` existants passent ainsi en `titre-1` sans autre modification. Le `font-stretch: 90%` du titre d'accueil s'ajoute à l'appel dans `page.tsx` (`[font-stretch:90%]`, sans effet en arabe).

## Étape 8. `web/src/components/icons.tsx`

- Supprimer `Logo` (pictogramme de cerveau, lignes 6-18) et le remplacer par `Wordmark` :

  ```tsx
  export const Wordmark = ({ className }: { className?: string }) => (
    <span className={clsx('inline-flex items-baseline gap-2', className)}>
      <bdi dir='ltr' className='text-[1.25rem] font-semibold tracking-[-0.01em] text-encre'>Tenga</bdi>
      <bdi dir='ltr' className='text-petit text-texte-3'>Assessments</bdi>
    </span>
  );
  ```

  Commentaire au-dessus : `// Mot-symbole provisoire en attendant le logo de Tenga Conseil (direction § 12, point 1).`
- Toutes les icônes conservées reçoivent une taille par défaut de 20 et un trait de 1,5 quand elles sont dessinées au trait ; `aria-hidden='true'` et `focusable='false'` par défaut.
- `ArrowRightIcon` et `ChevronRightLinearIcon` reçoivent par défaut la classe `rtl:-scale-x-100`.
- Supprimer les icônes devenues inutiles après les étapes 11 à 20 (`LogosOpensource`, `MoneyIcon`, `ExperimentIcon`, `PlusLinearIcon`) ; vérifier par recherche qu'aucune autre importation n'y fait référence.
- `public/` : remplacer `favicon.ico`, `favicon-16x16.png`, `apple-touch-icon*.png`, `icon-*.png`, `logo*.png`, `logo.svg` par une icône provisoire « T » blanc (Instrument Sans 600) sur carré `#1D5446` à coins de 10 % ; à refaire avec le logo officiel.
- `app/manifest.ts` : `name: 'Tenga Assessments'`, `short_name: 'Tenga'`, `description` en français (« Questionnaire de personnalité de Tenga Conseil »), `background_color: '#F7F6F3'`, `theme_color: '#1D5446'`.

## Étape 9. `web/src/components/navbar.tsx`

- `NextUINavbar` : `maxWidth='xl'` remplacé par `classNames={{ base: 'bg-fond/90 backdrop-blur-sm data-[menu-open=true]:bg-fond', wrapper: 'conteneur max-w-6xl h-16', item: 'data-[active=true]:text-encre' }}` et `isBordered={false}` ; ajouter `shouldHideOnScroll={false}` et un filet bas `border-b border-trait` appliqué quand la page a défilé (`isBlurred` reste à `true`).
- Marque (lignes 52-60) : `NextLink` avec `aria-label={t('toolbar.home_aria')}` contenant `<Wordmark />`.
- Liens (lignes 61-77) : conteneur `hidden md:flex gap-6 ms-8` (remplace `ml-2`) dans un `<nav aria-label={t('a11y.mainNav')}>` ; chaque lien `text-[0.9375rem] font-medium text-texte-2 hover:text-encre transition-colors duration-courte` ; actif : `aria-current='page'`, `text-encre` et `after:` filet de 2 px `bg-accent` sous le texte (`relative after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-accent`). Supprimer `text-danger`.
- Zone de fin de ligne (lignes 80-90) : `gap-2` ; ordre : `<LanguageMenu />`, `<ThemeSwitch />`, puis un emplacement vide commenté `{/* Lot 1 : connexion ou menu du compte. */}`.
- Mobile (lignes 92-104) : `pl-4` remplacé par `ps-4` ; `NavbarMenuToggle` avec `aria-label={isMenuOpen ? t('toolbar.close_menu') : t('toolbar.open_menu')}`.
- Menu mobile (lignes 106-124) : liens en `text-titre-3 py-3 text-encre` (remplace `!text-3xl`), actif en `text-accent`.
- Les libellés viennent d'un `useTranslations` côté client ; comme `NextIntlClientProvider` reçoit `messages={{}}` (layout ligne 96), passer les libellés traduits en propriétés depuis `layout.tsx` (objet `labels`), à la manière de `navItems`.

## Étape 10. Sélecteur de langue

- Nouveau `web/src/components/language-menu.tsx` (client) qui remplace `locale-switcher-full.tsx` et `locale-switcher.tsx` (supprimer ces deux fichiers et leurs importations).
- `Dropdown` de NextUI : déclencheur `Button variant='light' size='sm'`, libellé « Français », « العربية » ou « English » au-delà de 768 px, « FR », « ع », « EN » en dessous ; chevron `rtl:-scale-x-100` non nécessaire (chevron vertical). `aria-label={labels.language}`.
- Entrées : `fr`, `ar`, `en` uniquement, chacune `lang` et `dir` propres, coche sur la langue courante. Navigation par `router.replace(pathname, { locale })` comme aujourd'hui.
- Menu : `classNames={{ content: 'rounded-panneau bg-surface shadow-flottant dark:shadow-flottant-sombre' }}`.
- Les autres langues de `config/site.ts` restent routables (direction § 12, point 4).

## Étape 11. `web/src/components/theme-switch.tsx`

- Remplacer l'interrupteur par un `Button isIconOnly variant='light' size='md'` (40 px) ; icône 20 px `text-texte-2` ; `aria-label` = `labels.toDark` ou `labels.toLight` (passés en propriétés).
- Lire `resolvedTheme` (et non `theme`) pour décider de l'icône, puisque le thème par défaut devient `system`.

## Étape 12. `web/src/components/footer.tsx` (réécrire)

- `<footer className='border-t border-trait'>` puis `<div className='conteneur flex flex-col gap-8 py-12 md:flex-row md:items-start md:justify-between'>`.
- Début de ligne : `<Wordmark />` puis `<p className='mt-2 text-petit text-texte-3'>{labels.service}</p>`.
- Fin de ligne : `<nav aria-label=…><ul className='flex flex-wrap gap-x-6 gap-y-2'>`, liens `inline-flex min-h-6 items-center text-petit font-medium text-texte-2 hover:text-encre`.
- Dernière ligne, pleine largeur, `text-legende text-texte-3` : `<bdi dir='ltr'>© {year} Tenga Conseil</bdi>`.
- Supprimer `text-gray-*`, `sm:ml-4 sm:pl-4`, `py-24`.

Fin d'étape : `pnpm build`, déploiement, captures de l'en-tête et du pied en FR et AR, 390 et 1 440.

## Étape 13. Questionnaire : affichage séparé de la logique

Créer `web/src/components/questionnaire/` avec trois composants de présentation, sans état propre, réutilisables par le lot 2 :

1. `progress-header.tsx` : propriétés `answered`, `total`, `current`, `label` (texte déjà traduit « Question 4 sur 120 »). Rendu : bloc collant `sticky top-16 z-entete -mx-5 bg-fond/95 px-5 py-3 backdrop-blur-sm sm:-mx-8 sm:px-8` ; `Progress` de NextUI avec `label={label}`, `valueLabel={label}`, `showValueLabel={false}`, `value={answered}`, `maxValue={total}`, `size='sm'`, `radius='sm'`, `aria-label` absent (le `label` suffit), `classNames={{ base: 'max-w-none gap-2', label: 'text-petit font-medium text-encre chiffres', track: 'h-1 bg-creux', indicator: 'bg-accent transition-transform duration-longue ease-tenga' }}`.
2. `question-block.tsx` : propriétés `question`, `number`, `value`, `onChange`, `isDisabled`, `headingRef`. Rendu :
   - `<section className='animate-apparaitre border-b border-trait py-8 last:border-b-0'>` ;
   - `<h2 id={'q-' + question.id} ref={headingRef} tabIndex={-1} className='text-[1.25rem] md:text-question text-encre focus:outline-none'>` avec `<span className='me-2 text-texte-3 chiffres'>{number}.</span>{question.text}` ;
   - `RadioGroup` avec `aria-labelledby={'q-' + question.id}`, `classNames={{ base: 'mt-5', wrapper: 'gap-2' }}` ;
   - chaque `Radio` avec `classNames={{ base: 'm-0 flex w-full max-w-[44rem] min-h-12 items-center gap-3 rounded-controle border border-trait bg-surface px-4 py-3 transition-colors duration-courte hover:bg-creux data-[selected=true]:border-accent data-[selected=true]:bg-accent-doux data-[focus-visible=true]:outline data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-accent', wrapper: 'border-[1.5px] border-trait-fort group-data-[selected=true]:border-accent', control: 'bg-accent', label: 'text-corps font-medium text-encre group-data-[selected=true]:font-semibold' }}`.
   - Remarque : `border-trait` (1,44) n'est pas porteur d'information ; le contour porteur est celui de la pastille (`border-trait-fort`, 3,86).
3. `survey-nav.tsx` : propriétés `onPrev`, `onNext`, `onSubmit`, `prevDisabled`, `nextDisabled`, `isLast`, `isLoading`, libellés. Rendu : `<div className='mt-10 grid grid-cols-2 gap-3 sm:flex sm:justify-between'>` ; « Précédent » (`test.back`) `Button variant='bordered' className='h-11 border-trait-fort text-encre data-[hover=true]:bg-creux'` ; « Suivant » ou « Voir mes résultats » `Button color='primary' className='h-11 px-5 font-medium data-[pressed=true]:translate-y-px'` ; état désactivé : `data-[disabled=true]:bg-creux data-[disabled=true]:text-texte-3 data-[disabled=true]:opacity-100` ; chargement : `isLoading` avec `labels.saving`.

## Étape 14. `web/src/app/[locale]/test/survey.tsx` et `test/page.tsx`

`survey.tsx`, sans toucher à la logique d'état ni au stockage local :

- Remplacer le rendu des lignes 211-325 par : `ProgressHeader`, avis de restauration, liste de `QuestionBlock`, message d'échec, `SurveyNav`.
- Progression : `answered = answers.length`, `total = questions.length`, `current = Math.min(currentQuestionIndex + 1, total)`, libellé `labels.progress` avec `{current}` et `{total}` remplacés (passer le gabarit depuis `page.tsx`, remplacer côté client). Ne plus afficher `formatTimer(seconds)` ; garder `useTimer` et `timeElapsed`.
- Focus et défilement : à chaque changement de `currentQuestionIndex` (effet), si ce n'est pas le premier rendu, appeler `headingRef.current?.focus({ preventScroll: true })` puis `headingRef.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })`. Supprimer les trois `window.scrollTo(0, 0)` (lignes 134, 141, 147).
- Avis de restauration (lignes 224-251) : `<Notice ton='avis'>` (étape 15) avec le texte `labels.restored`, un `Button variant='light' className='text-accent underline'` portant `labels.newTest` (texte de `textes.md` § 3.1) qui appelle `clearDataInLocalStorage`, et un `Button isIconOnly variant='light' aria-label={labels.dismiss}` avec `CloseIcon`.
- Échec d'enregistrement (lignes 276-289) : `<Notice ton='erreur' titre={labels.saveFailedTitle}>` avec le texte et `Button variant='bordered'` portant `labels.reload`.
- Consigne `test.instructions` (`textes.md` § 3.1) : sur le premier écran seulement (`currentQuestionIndex === 0`), `<p className='mb-2 text-petit text-texte-2'>` sous le bandeau de progression, suivie de `test.noTimeLimit` en `text-texte-3`.
- Supprimer `confetti` (lignes 7 et 177), puis `pnpm remove canvas-confetti @types/canvas-confetti`.
- Supprimer les `.toUpperCase()` (lignes 296, 304, 314).
- Supprimer les `console.log` des lignes 79 et 205.
- Bouton de développement « Skip to end (dev) » : garder, `variant='flat'`, libellé inchangé (visible seulement en développement).

`test/page.tsx` : ajouter `<h1 className='sr-only'>{t('heading')}</h1>` avant `Survey` ; passer les nouveaux libellés (`progress`, `saving`, `dismiss`, `instructions`, `noTimeLimit`). Envelopper `Survey` dans `<div className='mx-auto max-w-[44rem]'>`.

Contrôle : le test `web/tests/e2e/parcours-public.spec.ts` attend un `progressbar`, un `h2` et des `radio` : tous restent présents.

## Étape 15. Nouveaux composants transverses

`web/src/components/notice.tsx` (remplace `alert.tsx`, à supprimer avec ses importations) :

```tsx
import clsx from 'clsx';
import { ReactNode } from 'react';

const tons = {
  info: 'bg-creux text-encre',
  avis: 'bg-avis-doux text-avis',
  erreur: 'bg-erreur-doux text-erreur'
} as const;

interface NoticeProps {
  ton: keyof typeof tons;
  titre?: string;
  children: ReactNode;
  className?: string;
}

export function Notice({ ton, titre, children, className }: NoticeProps) {
  return (
    <div
      role={ton === 'erreur' ? 'alert' : 'status'}
      className={clsx('rounded-controle p-4 text-petit', tons[ton], className)}
    >
      {titre && <p className='mb-1 font-semibold'>{titre}</p>}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 [&_p]:text-encre'>{children}</div>
    </div>
  );
}
```

`web/src/components/score-rule.tsx` (composant serveur, sans `'use client'`) :

```tsx
import clsx from 'clsx';
import { CSSProperties } from 'react';

interface ScoreRuleProps {
  label: string;
  href?: string;
  score: number;
  min: number;
  max: number;
  valeur: string; // « 82 », déjà formaté par formatNombre
  surMax: string; // « sur 120 », déjà traduit
  niveau: string; // « élevé », déjà traduit
  taille?: 'domaine' | 'facette';
  anime?: boolean;
  rang?: number; // position dans la liste, pour le décalage du tracé
}

export function ScoreRule({
  label, href, score, min, max, valeur, surMax, niveau,
  taille = 'domaine', anime = false, rang = 0
}: ScoreRuleProps) {
  const part = Math.min(1, Math.max(0, (score - min) / (max - min)));
  const milieu = 0.5; // réponse moyenne de 3 sur une échelle de 1 à 5
  const hauteur = taille === 'domaine' ? 'h-2' : 'h-1.5';
  return (
    <div className='grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,14rem)_1fr_auto]'>
      <span className='text-corps font-medium text-encre'>
        {href ? <a href={href} className='hover:text-accent'>{label}</a> : label}
      </span>
      <span aria-hidden='true' className={clsx('regle-piste relative col-span-2 rounded-petit bg-creux sm:col-span-1 sm:row-start-1 sm:col-start-2', hauteur)}>
        <span
          className={clsx('regle-trait absolute inset-y-0 start-0 rounded-petit bg-accent origin-left rtl:origin-right', anime && 'animate-tracer')}
          style={{ width: `${part * 100}%`, animationDelay: anime ? `${rang * 40}ms` : undefined } as CSSProperties}
        />
        <span className='absolute -top-[3px] -bottom-[3px] w-px bg-trait-fort' style={{ insetInlineStart: `${milieu * 100}%` }} />
      </span>
      <span className='row-start-1 col-start-2 whitespace-nowrap text-end sm:col-start-3'>
        <span className='chiffres text-corps font-semibold text-encre'>{valeur}</span>{' '}
        <span className='text-petit text-texte-3'>{surMax}</span>{' '}
        <span className='text-petit font-medium text-texte-2'>{niveau}</span>
      </span>
    </div>
  );
}
```

Une liste de règles s'écrit `<ul className='flex flex-col gap-5'>` avec un `<li>` par règle : le texte de chaque `li` (« Extraversion 82 sur 120 élevé ») est l'alternative textuelle.

`web/src/components/share-bar.tsx` (zone du lot 3, minimum) : icônes à 20 px, boutons `isIconOnly variant='light' size='md'`, `aria-label` et infobulles depuis les clés `share.*` (passées en propriétés), `Tooltip` sans `color='secondary'`, propriété `description` traduite.

## Étape 16. Page de résultat

`web/src/app/[locale]/result/[id]/page.tsx` :

- `Results` reçoit `locale`. Structure :
  1. `<header className='flex flex-col gap-2 md:flex-row md:items-end md:justify-between'>` : `h1` `title()` avec `results.title` ; `<p className='text-petit text-texte-3'>` avec `formatDate(report.timestamp, locale)` (remplace le `Chip` de la ligne 70) ; à droite `Button variant='bordered' onPress={() => window.print()}` « Imprimer ou enregistrer en PDF », isolé dans un petit composant client `print-button.tsx`, `print:hidden`.
  2. `<section aria-labelledby='vue-ensemble' className='mt-12'>` : `h2#vue-ensemble` `heading()` avec `results.overview` ; `<ul className='mt-6 flex flex-col gap-5'>` de cinq `ScoreRule` (`label` tiré de `lib/domain-labels.ts`, forme courte ; `min` 24, `max` 120, `anime`, `rang` = index, `href='#domaine-' + domain.domain`, `niveau` = `results.level.{scoreText}`) ; puis `<p className='mt-6 colonne-lecture text-texte-2'>` avec `results.intro` (`textes.md` § 4.2) et `<p className='mt-2 colonne-lecture text-petit text-texte-3'>` avec `results.scaleNote`. Le `h2` de la vue d'ensemble est précédé, dans le `header`, de rien d'autre que la date : pas de bandeau « Important ».
  3. Bloc identifiant et partage (lignes 72-97) déplacé ici, sous la vue d'ensemble, dans `<Notice ton='info' className='mt-10 print:hidden'>` ; `Snippet` passe en `color='default' variant='flat'` ; identifiant dans `<bdi dir='ltr'>`. Aucun autre soin (lot 1).
  4. `DomainTabs` remplacé par `<ResultBody results={report.results} locale={locale} labels={…} />`.
- `generateMetadata` : `alternates.languages` limité à `fr`, `ar`, `en`.

Nouveau `web/src/app/[locale]/result/[id]/result-body.tsx` (serveur) :

- `<div className='mt-16 lg:grid lg:grid-cols-12 lg:gap-12'>` ;
- `<ResultNav />` (client, ci-dessous) en `lg:col-span-3` ;
- `<div className='lg:col-span-9 flex flex-col gap-16'>` contenant un `DomainSection` par domaine.

Nouveau `web/src/app/[locale]/result/[id]/result-nav.tsx` (client) :

- Grand écran : `<nav aria-label={labels.contents} className='hidden lg:block lg:sticky lg:top-24 self-start'>`, titre `text-petit font-medium text-texte-3`, liste de liens `text-petit text-texte-2 hover:text-encre` vers `#domaine-X`, le lien visible portant `aria-current='location'` et `text-encre font-medium border-s-2 border-accent ps-3` (les autres `border-s-2 border-transparent ps-3`). Détection par `IntersectionObserver` sur les sections `[id^="domaine-"]`, `rootMargin: '-30% 0px -60% 0px'`, nettoyé au démontage.
- Mobile : `<nav className='lg:hidden -mx-5 mb-8 overflow-x-auto px-5'>` avec une rangée de liens `whitespace-nowrap rounded-controle border border-trait px-3 py-2 text-petit`.
- `print:hidden`.

`web/src/app/[locale]/result/[id]/domain.tsx` (réécrire, devient composant serveur, nommé `DomainSection`) :

- `<section id={'domaine-' + domain.domain} aria-labelledby={'titre-' + domain.domain} className='scroll-mt-24 border-t border-trait pt-10 first:border-t-0 first:pt-0 break-inside-avoid-page'>` ;
- `h2#titre-X` `heading()` avec le libellé long de `lib/domain-labels.ts` (plus de lien autour du titre) ;
- pour le seul domaine `N`, `<p className='mt-1 text-petit text-texte-3'>` avec `results.neuroticismGloss` (`voix-de-marque.md` § 4.2) ;
- `ScoreRule` du domaine (sans animation) ;
- `<p className='mt-6 colonne-lecture text-chapo text-encre'>` description courte ;
- `<details className='mt-4 colonne-lecture'>` avec `<summary className='cursor-pointer text-petit font-medium text-accent'>` `results.learnMore`, puis le HTML de `domain.description` dans `<div className='texte-riche mt-3'>` (contenu du paquet, rendu comme aujourd'hui par `dangerouslySetInnerHTML`). Si `showExpanded`, ajouter l'attribut `open`.
- `<p className='mt-6 colonne-lecture text-texte-2'>` texte du résultat (supprimer les deux `<br />` des lignes 32-33) ;
- `h3` `text-titre-3 mt-10` `results.facets`, puis `<ul className='mt-4 divide-y divide-trait'>` : par facette, `<li className='py-6 break-inside-avoid'>` contenant `ScoreRule taille='facette' min={4} max={20}` dont le libellé est celui de la facette dans `lib/domain-labels.ts`, puis `<p className='mt-3 colonne-lecture text-texte-2'>` texte de la facette. Plus d'`id` construit sur le titre traduit.
- Le qualificatif vient de `results.level.{facet.scoreText}` ; supprimer l'affichage « But : 10 ( low ) » (ligne 44-46).

Supprimer : `domain-tabs.tsx`, `mbti.tsx` (non utilisé), `components/read-more.tsx`, `components/bar-chart.tsx` (plus aucune importation après cette étape ; vérifier par recherche).

Nouveau `web/src/app/[locale]/result/[id]/loading.tsx` : `h1` squelette (`h-9 w-72 rounded-controle bg-creux`) puis cinq rangées de la géométrie de `ScoreRule` (`h-2` piste pleine largeur `bg-creux`, libellé `h-4 w-32 bg-creux`), `motion-safe:animate-pulse` uniquement.

Impression (ajouter à `globals.css`, couche `components`) :

```css
@media print {
  header, footer, nav, .print\:hidden { display: none !important; }
  main { padding: 0 !important; }
  section[id^='domaine-'] { break-before: auto; }
}
```

Fin d'étape : `pnpm build`, déploiement, test complet passé avec réponses au hasard, captures de la page de résultat en FR et AR, 390 et 1 440, clair et sombre, plus une impression en PDF par `playwright-cli pdf`.

## Étape 17. Accueil, `web/src/app/[locale]/page.tsx` (réécrire)

Textes : uniquement ceux de `textes.md` § 2 marqués *immédiate* ; aucun texte de présentation inventé ici.

- Structure :
  1. `<section className='grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16 pt-6 md:pt-12'>` :
     - `lg:col-span-7` : `h1 className={title({ size: 'display' }) + ' [font-stretch:90%]'}` avec `frontpage.description.top` rendu par `t.rich` et `violet: (chunks) => chunks` (aucune mise en couleur) ; `p className={subtitle()}` avec `frontpage.description.info` ; `Link` de `@/navigation` vers `/test` stylé en bouton principal (`mt-8 inline-flex h-11 items-center gap-2 rounded-controle bg-accent px-5 font-medium text-sur-accent transition-colors duration-courte hover:bg-accent-survol active:translate-y-px`) avec `frontpage.call_to_action` et `ArrowRightIcon` (retournée en RTL). Supprimer la mention `frontpage.no_registration` (obsolète, `textes.md` § 2) ; ne rien mettre à la place avant le lot 1.
     - `lg:col-span-5` : `<figure className='rounded-panneau border border-trait bg-surface p-6 md:p-8'>` : `<ul className='flex flex-col gap-5'>` de cinq `ScoreRule` animées (`anime`, `rang`), libellés courts de `lib/domain-labels.ts`, scores 87, 64, 101, 58, 79 dans l'ordre `N, E, O, A, C`, qualificatif calculé comme le paquet (moyenne des réponses, soit score divisé par 24, supérieure à 3 : élevé ; inférieure : bas ; égale : au milieu) ; `<figcaption className='mt-6 text-legende text-texte-3'>` avec `home.specimen` (« valeurs fictives »). Valeurs déclarées dans une constante commentée `// Valeurs d'exemple, affichées comme telles.` La figure est `aria-describedby` sa légende.
  2. `<section className='mt-24 border-t border-trait pt-12'>` : `<p className='colonne-lecture text-petit text-texte-2 [&_a]:text-accent [&_a]:underline'>` avec `frontpage.description.reference` (`textes.md` § 2, rendu par `t.rich` ou `t.markup` pour garder le lien vers ipip.ori.org).
  3. Articles : bloc rendu seulement si la langue exacte de la page a au moins un article (`posts/` ne contient que `en` et `no` : le bloc n'apparaît donc pas en FR ni en AR) ; `h2` `heading()` avec `toolbar.articles`, puis trois `PostListItem` (étape 19) et un lien discret `frontpage.posts.all`.
- Supprimer : `features`, `titleDescription`, `testsTaken`, le bloc comparaison, `SonarPulse`, `buildCircle`, « Latest posts », « Show all articles ... », `Translated`, les importations de `Chip`, `Tooltip`, `Button`, `NextLink`.
- Supprimer les fichiers `components/features-grid.tsx`, `components/sonar-pulse.tsx`, `components/translated.tsx` (aucune autre importation, vérifié le 20/10/2026 par recherche).
- `generateMetadata` : `alternates.languages` limité à `fr`, `ar`, `en`.

## Étape 18. Pages de contenu

Gabarit commun pour À propos, FAQ, Confidentialité : `<article className='colonne-lecture'>` (la FAQ fait exception, ci-dessous) ; `h1` `title()` ; premier paragraphe `subtitle()` ; corps `texte-riche`.

- `about/page.tsx` : gabarit ; contenu = clés `about.title`, `about.p1` à `about.p4`, `about.contact_faq`, `about.contact_email` de `textes.md` § 6 (`about.p5` attend le lot 1) ; plus aucun texte anglais en dur ni `<br />`.
- `faq/page.tsx` : retirer `'use client'` (la page n'a pas d'état) ; supprimer l'accordéon ; `<div className='grid gap-10 lg:grid-cols-12'>` : `lg:col-span-4` avec `h1` (`faq.title`) et, si `supportEmail`, une phrase de contact ; `lg:col-span-8` avec `<dl className='divide-y divide-trait'>`, chaque entrée `<div className='py-6'>` avec `<dt>` contenant un `<h2 className='text-titre-3 text-encre'>` et `<dd className='mt-2 text-texte-2'>`. Entrées : celles de `textes.md` § 7 marquées *immédiate* (`faq.error` seulement si `supportEmail`, `faq.print`, `faq.source`, `faq.answers`, `faq.diagnosis`).
- `privacy/page.tsx` : gabarit ; `<h2>` et `<ul>` du texte actuel stylés par `texte-riche` ; supprimer les `<br />`. Texte inchangé : il relève d'Amine et d'une relecture juridique (`textes.md` § 9).

## Étape 19. Articles

- Lien « Articles » de l'en-tête et du pied : laissé tel quel en phase 1 ; son retrait en FR et AR est la décision 13 de `voix-de-marque.md`.
- `components/post-card.tsx` remplacé par `components/post-list-item.tsx` : `<li className='py-6'>` contenant `Link` vers l'article, titre `text-titre-3 text-encre hover:text-accent`, description `mt-2 text-texte-2 colonne-lecture`, ligne de métadonnées `mt-3 text-legende text-texte-3` avec `formatDate(post.date, locale)` et `articles.readingTime`. Pas d'image, pas d'avatar. Supprimer `post-card.tsx` après remplacement dans `articles/page.tsx`, `articles/[slug]/page.tsx` et l'accueil.
- `articles/page.tsx` : `h1` `title()` avec `toolbar.articles` ; sous-titre `frontpage.posts.subtitle` (`textes.md` § 2) ; texte d'introduction anglais en dur supprimé ; `<ul className='mt-8 divide-y divide-trait'>` ; état vide `articles.empty` avec lien vers l'accueil. Le repli anglais de la liste reste en place (comportement actuel) ; l'état vide ne s'affiche que si même l'anglais est vide.
- `articles/[slug]/page.tsx` :
  - `article` : supprimer `prose prose-neutral` ; `className='mx-auto max-w-3xl'` ;
  - lien retour : `Link` discret `inline-flex items-center gap-1 text-petit text-texte-2 hover:text-encre`, `ChevronRightLinearIcon` avec `rotate-180 rtl:rotate-0` (remplace `rotate-180 inline-block mr-1`), texte `articles.back` ;
  - mention « AI generated translation » remplacée par `articles.machineTranslated` ;
  - titre : `h1` `title()` au-dessus de l'image, plus incrusté dedans (supprimer le bloc `absolute inset-0` des lignes 124-130) ; image `mt-8 aspect-video w-full rounded-panneau object-cover` ;
  - métadonnées : `formatDate` et `articles.readingTime` (remplace `format(parseISO(...), 'LLLL d, yyyy')` et « min read ») ;
  - corps : `className='texte-riche mt-10'` (remplace `[&>*]:mb-3 … articlePage`) ;
  - étiquettes : `Chip variant='flat' radius='sm'` ;
  - articles liés : liste `PostListItem`.
- Vérifier qu'aucune classe `articlePage` ne reste (ses règles ont disparu de `globals.css` à l'étape 2).

## Étape 20. Pages 404 et erreur

Clés : `notFound.*` et `error.*` de `textes.md` § 8, plus `error.retry` (étape 3).

- `not-found.tsx` : `<section className='colonne-lecture py-16'>` : `h1` `title()` `notFound.title`, `p` `subtitle()` `notFound.text`, `Link` bouton principal vers `/` `notFound.home`. Supprimer l'image et le bouton rouge.
- `error.tsx` : même gabarit, `error.title`, `error.text`, bouton principal `error.retry` (`reset()`), lien secondaire `notFound.home`. Ne plus afficher `error.message` ; afficher `error.digest` s'il existe, en `<p className='mt-4 text-legende text-texte-3 chiffres'><bdi dir='ltr'>{error.digest}</bdi></p>`.
- Libellés côté client : `NextIntlClientProvider` reçoit aujourd'hui `messages={{}}` (`layout.tsx:96`). Lui passer `messages={{ notFound: messages.notFound, error: messages.error }}` (lus par `getMessages`) pour que ces deux pages client utilisent `useTranslations`.
- Supprimer `public/not_found.webp` et `public/error.webp` si plus aucune référence.

## Étape 21. Nettoyage des propriétés physiques restantes

Recherche dans `web/src` (hors zones du § 0) de `\b(ml|mr|pl|pr|left|right)-|text-(left|right)|space-x-|h-screen|text-gray-|bg-gray-|#[0-9a-fA-F]{6}` et correction de chaque occurrence restante dans les fichiers touchés. Les occurrences des zones `compare/`, `result/page.tsx`, `result/get-result.tsx`, `email-modal.tsx` sont laissées et listées dans le message de commit comme « laissées au lot qui supprime ce fichier ».

## Étape 22. Vérification finale et preuve

1. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` : zéro erreur, zéro avertissement.
2. Déploiement par Coolify sur `serveuria`, puis `GET https://tenga.ai-mpower.com/api/health` rend `200`.
3. `pnpm test:e2e` contre le site déployé.
4. Captures « après » dans `docs/design/captures/apres/`, mêmes noms que les captures « avant » (même script Playwright CLI), plus les variantes sombres.
5. Mesure des contrastes rejouée sur le site déployé (script de l'audit) : aucun texte sous 4,5, aucun contour porteur sous 3, en clair et en sombre.
6. Contrôles manuels consignés : navigation complète au clavier du questionnaire (focus sur la question après « Suivant ») ; questionnaire et résultat en arabe à 390 px (règles qui croissent de droite à gauche, boutons espacés, copyright lisible) ; `prefers-reduced-motion` émulé (`playwright-cli set-reduced-motion reduce`) : aucune animation ; `forced-colors` émulé : règles visibles ; zoom 200 % sans défilement horizontal ; impression PDF du résultat.
7. Compte rendu à Amine : captures avant et après côte à côte, liste des écarts restants, décisions du § 12 de la direction encore ouvertes.
