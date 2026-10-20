# Audit de l'existant : interface de Tenga Assessments

20 octobre 2026. Phase 1 de la refonte du design. Document en lecture seule : aucun fichier de `web/` n'a été modifié.

## 0. Ce qu'il faut savoir avant de lire

- **Verdict en une phrase** : l'interface en ligne est le gabarit du projet libre `bigfive-test` à peine retouché (logo de cerveau générique, dégradés violet et rose, promesses « gratuit » et « open source », compteur de 4 millions de tests qui n'est pas celui de Tenga, articles en anglais) ; elle ne dit nulle part qu'elle est un service de Tenga Conseil et ne peut pas être montrée à un client en l'état.
- **Écart entre le site et le code** : la production (https://tenga.ai-mpower.com, `GET /api/health` rend `{"status":"ok"}` le 20/10/2026) tourne sur une version antérieure à la branche `tenga-espace-prive` (commit `905a404`). Les captures montrent donc encore des éléments déjà retirés du code au lot 0 : quatrième carte « Traduit », bandeau des traducteurs, formulaire « We love feedback » de la page À propos. Les références `fichier:ligne` ci-dessous visent le code de la branche, pas la production.
- **Méthode** : captures par Playwright CLI (Chromium, pages complètes) en français et en arabe, à 1 440 et 390 pixels de large ; contrastes mesurés dans la page par script (couleur calculée de chaque texte, mélangée à son fond réel et à l'opacité de ses parents), puis recalculés hors navigateur pour les éléments SVG du graphique ; structure lue par l'arbre d'accessibilité. Un test complet a été passé avec des réponses tirées au hasard, sans aucune donnée personnelle, pour obtenir une page de résultat (identifiant `6ad6a9632e60d8017a950889`).
- **Captures** : toutes dans `docs/design/captures/avant/`, nommées `page-langue-largeur.png` (pleine page), `-ecran1` pour le premier écran seul, `-sombre` pour le thème sombre.

| Page | FR 1 440 | FR 390 | AR 1 440 | AR 390 |
|---|---|---|---|---|
| Accueil | `accueil-fr-1440.png` | `accueil-fr-390.png` | `accueil-ar-1440.png` | `accueil-ar-390.png` |
| Questionnaire | `test-fr-1440.png` | `test-fr-390.png` | `test-ar-1440.png` | `test-ar-390.png` |
| Résultat | `resultat-fr-1440.png` | `resultat-fr-390.png` | `resultat-ar-1440.png` | `resultat-ar-390.png` |
| À propos | `a-propos-fr-1440.png` | `a-propos-fr-390.png` | `a-propos-ar-1440.png` | `a-propos-ar-390.png` |
| FAQ | `faq-fr-1440.png` | `faq-fr-390.png` | `faq-ar-1440.png` | `faq-ar-390.png` |
| Articles | `articles-fr-1440.png` | `articles-fr-390.png` | `articles-ar-1440.png` | `articles-ar-390.png` |

Compléments : `test-question-repondue-fr-1440.png`, `test-fin-fr-1440.png`, `focus-clavier-test-fr-1440.png`, `accueil-fr-1440-sombre.png`, `test-fr-1440-sombre.png`, `resultat-fr-1440-sombre.png`, `resultat-*-ecran1.png`.

Gravité : **bloquant** (empêche de présenter le service à un client ou enfreint WCAG 2.2 AA), **majeur** (dégrade nettement la lecture ou la confiance), **mineur** (finition).

## 1. Identité et motifs de gabarit

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 1.1 | Bloquant | Aucune identité Tenga : le logo est un pictogramme de cerveau tiré d'Iconify, sans nom ni mot-symbole ; le nom « Tenga » n'apparaît que dans le pied de page. Le manifeste annonce encore « Bigfive web » avec la couleur `#ff1cf7`. | `components/icons.tsx:4-18`, `components/navbar.tsx:58`, `app/manifest.ts:5-12` ; toutes les captures |
| 1.2 | Bloquant | Promesses héritées incompatibles avec un cabinet et avec le futur accès sur invitation : « gratuit », « open source », « Aucune inscription requise ». | `app/[locale]/page.tsx:60-76`, `:104-126` ; `messages/fr.js:17-18`, `:36`, `:44` ; `accueil-fr-1440.png` |
| 1.3 | Bloquant | Chiffre non vérifiable présenté comme un fait : « Plus de 4.000.000 personnes ont passé le test ». C'est le compteur du projet d'origine, pas celui de Tenga ; il est en dur dans le code. | `app/[locale]/page.tsx:84-90`, `:134-138` ; `accueil-fr-1440.png` |
| 1.4 | Majeur | Esthétique de gabarit générique : titres en dégradé violet et rose (`#FF1CF7` vers `#b249f8`), cartes en verre dépoli, rangée de trois ou quatre cartes égales, cible pulsante « sonar » entourée de pastilles violettes, bandeau défilant de drapeaux. Aucun de ces motifs ne sert le propos. | `components/primitives.ts:5-41`, `components/features-grid.tsx:9-14`, `components/sonar-pulse.tsx`, `components/translated.tsx`, `app/[locale]/page.tsx:150-240` |
| 1.5 | Majeur | Bouton principal animé en boucle (`animate-shadow-pulse`, halo bleu `#006FEE`), non désactivé pour `prefers-reduced-motion`. L'image clé contient d'ailleurs une faute de syntaxe (`'scale(1),'`). | `app/[locale]/page.tsx:116`, `tailwind.config.js:21-32` |
| 1.6 | Majeur | Bloc « Latest posts » et lien « Show all articles ... » en anglais sur la page française ; les articles n'existent qu'en anglais et en norvégien et s'affichent en anglais en FR et en AR, avec des illustrations générées sans rapport avec un cabinet. | `app/[locale]/page.tsx:244-264`, `posts/` (dossiers `en` et `no` seulement) ; `articles-fr-1440.png` |
| 1.7 | Mineur | Confettis au moment de l'envoi du questionnaire : ton ludique, hors de propos pour une évaluation professionnelle. | `app/[locale]/test/survey.tsx:7`, `:177` |

## 2. Hiérarchie et mise en page

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 2.1 | Majeur | Accueil : quatre `h1` (« Lgagnez… », « Plus de 4.000.000… », « Comparez-vous… », « Latest posts ») ; la page de questionnaire n'en a aucun. | `app/[locale]/page.tsx:97`, `:136`, `:141`, `:244` ; mesure : 4 `h1` à l'accueil, 0 sur `/fr/test` |
| 2.2 | Majeur | Accueil centré de bout en bout, sans grille, avec des vides de 176 à 224 pixels (`mt-44 md:mt-56`, `lg:mt-44`) qui coupent la lecture ; la colonne du titre est limitée à `lg:w-1/2`. | `app/[locale]/page.tsx:95`, `:134`, `:150` ; `accueil-fr-1440.png` |
| 2.3 | Majeur | Résultat : un mur de texte de 9 062 pixels de haut à 1 440 de large. Cinq domaines, trente facettes, chacun avec un graphique en barres de même taille et des paragraphes pleine largeur (plus de 180 caractères par ligne). Aucun sommaire, aucune synthèse. | `resultat-fr-1440.png` ; `app/[locale]/result/[id]/domain.tsx:21-51` |
| 2.4 | Majeur | Résultat : l'information prioritaire pour le participant (son profil) arrive après une date, un avertissement « Important! », un identifiant sur fond rose et cinq icônes de partage. | `app/[locale]/result/[id]/page.tsx:69-100` ; `resultat-fr-1440-ecran1.png` |
| 2.5 | Majeur | Questionnaire : boutons « RETOUR » et « SUIVANT » tassés à gauche sous la troisième question, en capitales forcées par le code ; la progression ne dit pas « question n sur 120 » mais un pourcentage, et affiche un chronomètre qui met inutilement sous pression. | `app/[locale]/test/survey.tsx:213-223`, `:290-323` ; `test-question-repondue-fr-1440.png` |
| 2.6 | Majeur | Mise en page générale : `h-screen` sur le conteneur racine (saut de hauteur sur mobile), pied de page de 300 pixels pour quatre liens, logo du pied isolé à gauche sans texte. | `app/[locale]/layout.tsx:105`, `components/footer.tsx:15-38` |
| 2.7 | Mineur | Filtre des domaines du résultat : barre de six boutons collés (`ButtonGroup`) dont « All » en anglais, remplacée sur mobile par une liste déroulante « Select domain ». Masquer des domaines ne sert pas la lecture ; un sommaire d'ancres suffit. | `app/[locale]/result/[id]/domain-tabs.tsx:21-58` |
| 2.8 | Mineur | Pages FAQ, À propos, Confidentialité : titres à 48 pixels, texte en pleine largeur (jusqu'à 1 232 pixels), sauts de ligne faits avec des `<br />`. | `app/[locale]/faq/page.tsx:34`, `app/[locale]/about/page.tsx:25-61`, `app/[locale]/privacy/page.tsx:11-60` |

## 3. Typographie

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 3.1 | Majeur | Inter partout, chargée sans sous-ensemble arabe : en arabe, le navigateur retombe sur une police système (Arial ou Segoe UI selon le poste). Mesure : `document.fonts` sur `/ar/test` ne contient qu'Inter et Fira Code. Le rendu arabe change donc d'un poste à l'autre. | `config/fonts.ts:1-11`, `app/[locale]/layout.tsx:92` ; `test-ar-390.png`, `resultat-ar-1440-ecran1.png` |
| 3.2 | Mineur | Fira Code déclarée mais jamais appliquée (la variable `--font-mono` n'est pas posée sur `body`, et Tailwind attend `--font-geist-mono`). | `config/fonts.ts:8-11`, `tailwind.config.js:14` |
| 3.3 | Majeur | Pas d'échelle typographique : `title()` saute de 36 à 60 pixels selon les pages, `md` impose `leading-9` (36 pixels) à un corps de 36,8 pixels, les sous-titres sont à `w-1/2`. Seuls les poids 400 et 600 servent. | `components/primitives.ts:3-65` |
| 3.4 | Majeur | Le graphique force `'Inter, sans-serif'` en dur, y compris en arabe. | `components/bar-chart.tsx:27`, `:37` |
| 3.5 | Mineur | Classe `prose` sur l'article alors que le greffon `@tailwindcss/typography` n'est pas installé : elle ne produit rien, d'où des intertitres et listes non stylés. | `app/[locale]/articles/[slug]/page.tsx:90`, `tailwind.config.js:37`, `package.json` |

## 4. Couleur et contrastes (WCAG 2.2 AA)

Mesures sur la production, thème clair, Chromium, 20/10/2026.

| # | Gravité | Élément | Couleurs | Rapport | Seuil | Preuve code |
|---|---|---|---|---|---|---|
| 4.1 | Bloquant | Valeurs blanches dans les barres orange et verte du graphique (12 px, gras) | `#FFFFFF` sur `#f5a524` et `#17c964` à 85 % | 1,84 et 1,98 | 4,5 | `components/bar-chart.tsx:46-48` |
| 4.2 | Bloquant | Valeurs blanches dans les barres violette, bleue, rose | `#FFFFFF` sur barres à 85 % | 3,65 à 3,71 | 4,5 | idem |
| 4.3 | Bloquant | Barres orange et verte sur fond blanc (objet graphique porteur d'information) | barre à 85 % sur `#FFFFFF` | 1,84 et 1,98 | 3 (critère 1.4.11) | idem |
| 4.4 | Bloquant | Contour des boutons radio non cochés | `#D4D4D8` sur `#FFFFFF` | 1,48 | 3 (critère 1.4.11) | `app/[locale]/test/survey.tsx:264-271` (style NextUI par défaut) |
| 4.5 | Majeur | Lien de navigation actif | `#F31260` sur `#FFFFFF` | 4,14 | 4,5 | `components/navbar.tsx:67`, `:116` |
| 4.6 | Majeur | Identifiant du résultat sur fond rose | `#C20E4D` sur `#F31260` à 20 % | 4,39 | 4,5 | `app/[locale]/result/[id]/page.tsx:82-89` |
| 4.7 | Mineur | Bouton « RETOUR » désactivé (exempté par le critère 1.4.3, mais illisible) | blanc à 50 % sur `#006FEE` | 2,22 | sans objet | `app/[locale]/test/survey.tsx:291-297` |
| 4.8 | Conforme | Textes secondaires `text-default-500` et pied de page `text-gray-500` | `#71717A`, `#6B7280` sur blanc | 4,83 | 4,5 | `components/primitives.ts:44`, `components/footer.tsx:25` |
| 4.9 | Conforme | Bouton principal | blanc sur `#006FEE` | 4,66 | 4,5 | `app/[locale]/page.tsx:105-118` |

Autres constats couleur :

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 4.10 | Majeur | Six teintes d'accent concurrentes sans rôle : bleu `#006FEE` (actions), violet `#7828C8` (progression, radios, infobulles), rose `#F31260` (lien actif, identifiant), vert (chiffre d'accueil), orange et vert (graphique). La couleur du domaine change d'un graphique à l'autre et n'a aucun sens. | `components/bar-chart.tsx:47`, `components/navbar.tsx:67`, `app/[locale]/test/survey.tsx:222`, `:261` |
| 4.11 | Majeur | Deux familles de gris mélangées : zinc de NextUI (`default-*`) et gris de Tailwind (`gray-*`). | `components/footer.tsx:25`, `:36` ; `app/[locale]/result/[id]/domain.tsx:44` ; `styles/globals.css:10` |
| 4.12 | Majeur | Thème sombre en noir pur `#000000` (fond par défaut de NextUI) et thème clair imposé (`defaultTheme: 'light'`) sans tenir compte de la préférence du système. `themeColor` déclare `white` et `black`. | `app/[locale]/layout.tsx:68-71`, `:101` ; `accueil-fr-1440-sombre.png` |
| 4.13 | Majeur | Aucun jeton de couleur propre au projet : `nextui()` est appelé sans thème. | `tailwind.config.js:37` |

## 5. Densité, cohérence et états

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 5.1 | Majeur | Icônes de partage de tailles incohérentes (48, 42, 32 pixels) et en noir plein, plus grosses que les titres qu'elles suivent. | `components/share-bar.tsx:45`, `:59`, `:71`, `:84`, `:97` ; `resultat-fr-1440-ecran1.png` |
| 5.2 | Majeur | Bandeau « progression restaurée » : carte jaune avec un bouton icône sans nom et un lien sans `href` porté par `onClick`, donc inatteignable au clavier. | `app/[locale]/test/survey.tsx:224-251` |
| 5.3 | Majeur | Erreur d'enregistrement affichée dans un composant `Code` (police à chasse fixe, `break-all` qui coupe les mots au milieu), sans `role="alert"`. | `components/alert.tsx:9-18`, `app/[locale]/test/survey.tsx:276-289` |
| 5.4 | Majeur | Pages 404 et erreur : texte anglais, bouton « Go back » rouge (couleur de danger pour une action neutre), image décorative lourde ; la page d'erreur affiche `error.message` brut à l'utilisateur. | `app/[locale]/not-found.tsx:17-26`, `app/[locale]/error.tsx:27-42` |
| 5.5 | Mineur | Lien « * Aucune inscription requise » souligné alors qu'il n'est pas un lien. | `app/[locale]/page.tsx:124-126` |
| 5.6 | Mineur | Défilement brutal en haut de page à chaque écran du questionnaire (`window.scrollTo(0, 0)`), sans gestion du focus : le lecteur d'écran reste sur un bouton qui a changé de contexte. | `app/[locale]/test/survey.tsx:134`, `:141`, `:147` |

## 6. Accessibilité (WCAG 2.2 AA), hors contrastes

| # | Gravité | Constat | Critère | Preuve |
|---|---|---|---|---|
| 6.1 | Bloquant | Les groupes de réponses n'ont pas de nom accessible : la question est un `h2` voisin, non relié au `RadioGroup`. Mesure : les trois `radiogroup` de la page ont un `aria-label` vide. Un lecteur d'écran annonce « Fortement en désaccord, 1 sur 5 » sans la question. | 1.3.1, 4.1.2 | `app/[locale]/test/survey.tsx:252-272` |
| 6.2 | Bloquant | Graphiques ApexCharts sans alternative textuelle ; le menu « Download SVG » est dans l'arbre d'accessibilité avec une opacité nulle. | 1.1.1, 1.3.1 | `components/bar-chart.tsx:58-67` |
| 6.3 | Majeur | Pas de lien d'évitement vers le contenu (vérifié : aucun `a[href="#main"]`). Au clavier, mesure faite : huit arrêts dans l'en-tête (logo, cinq liens, thème, langue) avant la première réponse. | 2.4.1 | `app/[locale]/layout.tsx:105-111` ; `focus-clavier-test-fr-1440.png` |
| 6.4 | Majeur | Libellés d'accessibilité en anglais sur les pages FR et AR : « Home », « Open menu », « Select language », « Switch to dark mode », « Progress bar », « Clear data », « Share on facebook », « Copy link ». | 3.1.2 | `components/navbar.tsx:56`, `:101` ; `components/locale-switcher-full.tsx:44` ; `components/theme-switch.tsx:37` ; `app/[locale]/test/survey.tsx:214`, `:235` ; `components/share-bar.tsx:34-99` |
| 6.5 | Majeur | Textes d'interface en dur en anglais : « Read more », « Read less », « All », « Select domain », « Latest posts », toute la FAQ, la page À propos, la politique de confidentialité, la fenêtre d'envoi par e-mail. | 3.1.2 | `components/read-more.tsx:26`, `app/[locale]/result/[id]/domain-tabs.tsx:22`, `:50`, `app/[locale]/faq/page.tsx:7-31`, `app/[locale]/about/page.tsx:26-61`, `components/email-modal.tsx:53-111` |
| 6.6 | Majeur | Ancres du résultat construites sur les titres traduits (`id="Ouverture d'esprit"`, avec espaces et apostrophes) et titres enveloppés dans des liens : fragments fragiles, titres annoncés comme liens. | 1.3.1 | `app/[locale]/result/[id]/domain.tsx:23-27`, `:39-43` |
| 6.7 | Majeur | Animations continues sans arrêt possible (halo du bouton, sonar, pulsations) et non soumises à `prefers-reduced-motion`. | 2.2.2, 2.3.3 (AAA, conseillé) | `app/[locale]/page.tsx:116`, `components/sonar-pulse.tsx:51-53`, `:87-96` |
| 6.8 | Mineur | Date du résultat formatée par le serveur sans langue : « 10/19/2026 » (format américain) en FR comme en AR. | 3.1.1 | `app/[locale]/result/[id]/page.tsx:70` |
| 6.9 | Mineur | `MBTI` : composant présent mais non utilisé, avec un `h2` vide et un texte anglais qui qualifie lui-même le MBTI de pseudoscience. À supprimer. | 1.3.1 | `app/[locale]/result/[id]/mbti.tsx:42-67` |

## 7. Arabe et sens de droite à gauche

`lang="ar"` et `dir="rtl"` sont bien posés sur `<html>` (`app/[locale]/layout.tsx:80`, `:87`) et NextUI retourne correctement l'en-tête. Le reste ne suit pas.

| # | Gravité | Constat | Preuve |
|---|---|---|---|
| 7.1 | Bloquant | Graphique non retourné : axe des valeurs à gauche, domaines lus de gauche à droite, police Inter forcée. | `components/bar-chart.tsx:16-49` ; `resultat-ar-1440-ecran1.png` |
| 7.2 | Majeur | Boutons du questionnaire collés l'un à l'autre : `space-x-4` applique la marge à gauche, ce qui ne marche pas en RTL (il faudrait `gap`). Même défaut sur les pages 404 et erreur. | `app/[locale]/test/survey.tsx:290`, `app/[locale]/not-found.tsx:20`, `app/[locale]/error.tsx:32` ; `test-ar-390.png` |
| 7.3 | Majeur | Propriétés physiques au lieu de logiques : `ml-2`, `pl-4`, `-ml-3`, `left-[85px]`, `left: -120`, `right-8 md:right-4`, `pl-6`, `mr-1`, `sm:ml-4 sm:pl-4`, masque `to_right`. | `components/navbar.tsx:61`, `:92` ; `app/[locale]/page.tsx:178-184`, `:227`, `:258` ; `components/post-card.tsx:27` ; `styles/globals.css:21` ; `app/[locale]/articles/[slug]/page.tsx:102` ; `components/footer.tsx:36` ; `components/translated.tsx:26` |
| 7.4 | Majeur | Chevron « retour aux articles » tourné de 180 degrés en dur : en RTL il pointe dans le mauvais sens. | `app/[locale]/articles/[slug]/page.tsx:101-104` |
| 7.5 | Majeur | Mention « © 2026 Tenga Conseil » réordonnée par l'algorithme bidirectionnel en « Tenga Conseil 2026 © » ; aucun `<bdi>` autour des segments latins (identifiant, nom de marque, adresses). | `components/footer.tsx:37`, `app/[locale]/result/[id]/page.tsx:88` ; `a-propos-ar-1440.png` |
| 7.6 | Majeur | Libellés non traduits en arabe : « Home », « FAQ », « All », sélecteur « Arabic ». | `messages/ar.js:64`, `:72` ; `app/[locale]/result/[id]/domain-tabs.tsx:22` ; `config/site.ts:29` |
| 7.7 | Majeur | Pas de police arabe ni d'interlignage adapté : le corps arabe hérite de `line-height` latin et paraît plus petit que le français à taille égale. | `config/fonts.ts`, `styles/globals.css` |
| 7.8 | Mineur | Chiffres : les dates et nombres ne passent par aucun formateur (`Intl`) ; en arabe marocain l'usage courant est le chiffre occidental (0 à 9), qu'il faut fixer explicitement (`numberingSystem: 'latn'`) plutôt que de dépendre de la version ICU du navigateur. | `app/[locale]/result/[id]/page.tsx:70`, `components/post-card.tsx:45`, `app/[locale]/articles/[slug]/page.tsx:136` |
| 7.9 | Mineur | Sélecteur de langue à drapeaux pour 40 langues : un drapeau désigne un pays, pas une langue (drapeau français pour le français, aucun drapeau pour l'arabe). Le cabinet ne sert que FR, AR et EN. | `components/locale-switcher-full.tsx:24-57`, `config/site.ts:27-83` |

## 8. Contenu visible qui dessert le design

Hors périmètre graphique, mais ces textes sont dans les captures et ruinent toute refonte s'ils restent :

- `messages/fr.js:44` : « Lgagnez à mieux vous connaître… » (faute) ; `:51` : durée annoncée de 10 minutes pour 120 questions, à vérifier sur les temps réels enregistrés (`timeElapsed`).
- `messages/fr.js:77` et `:142` : « Ouverture à l 'experience » (espace et accent).
- `messages/fr.js:194-195` : « Les cinq grands » et « But » pour « Score » ; la page affiche « But : 10 ( low ) », où `low` vient brut du paquet de résultats (`app/[locale]/result/[id]/domain.tsx:45`).
- `messages/fr.js:200` : « toi-même aux autres » (tutoiement isolé).
- Libellés de réponse « Plutot » sans accent : ils viennent du paquet `@bigfive-org/questions` (`data/fr/choices.js`) et se corrigent dans `lib/question-overrides.ts`, pas dans le paquet.
- `messages/fr.js:8` : mots-clés SEO « jordan peterson », « free ».
- Seuils du paquet de score : « élevé » si la moyenne des réponses dépasse 3, « bas » si elle est inférieure, « neutre » seulement à 3 exactement (`node_modules/@bigfive-org/score/lib/reduce-factors.js:1-10`). La catégorie « neutre » est donc presque inatteignable : la refonte doit montrer la position sur l'échelle continue plutôt que trois classes de même poids.

## 9. Synthèse par dimension (notation de la skill `design-system`, sur 10)

| Dimension | Note | Raison principale |
|---|---|---|
| Cohérence des couleurs | 2 | Six accents sans rôle, deux familles de gris |
| Hiérarchie typographique | 3 | Pas d'échelle, quatre `h1` à l'accueil, aucun sur le questionnaire |
| Rythme des espacements | 3 | Vides arbitraires de 176 à 224 pixels, pas d'échelle |
| Cohérence des composants | 3 | Icônes de tailles différentes, boutons en capitales forcées, alerte en police de code |
| Comportement adaptatif | 5 | Lisible à 390, mais graphique comprimé et boutons collés en arabe |
| Thème sombre | 3 | Noir pur, préférence système ignorée |
| Animation | 2 | Animations perpétuelles décoratives, confettis, aucun respect de la réduction des mouvements |
| Accessibilité | 3 | Radios sans nom, graphiques sans alternative, contrastes du graphique à 1,84 |
| Densité d'information | 3 | Accueil vide, résultat saturé |
| Finition | 2 | Textes anglais, fautes, états d'erreur et de reprise bâclés |

## 10. Surcharges appliquées (skill `web-design-guidelines`)

Le référentiel distant (`vercel-labs/web-interface-guidelines`) n'a pas été rechargé pour cet audit, qui porte sur l'interface et non sur une relecture de code fichier par fichier ; les surcharges locales de la skill ont été appliquées : rapport en français, casse de phrase exigée pour les titres français, contrôles RTL et arabe, contrastes mesurés en clair et en sombre, taille des cibles, interfaces de données (alternative textuelle des graphiques, couleur jamais seule porteuse de sens).
