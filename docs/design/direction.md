# Direction visuelle de Tenga Assessments

20 octobre 2026. Phase 1 de la refonte. Ce document décide ; il ne propose pas de variantes. Les points qui relèvent d'Amine (marque, logo) sont regroupés au § 12 avec une option par défaut qui permet d'avancer sans attendre. Les textes affichés relèvent de `textes.md` et `voix-de-marque.md`, écrits par la session des textes : ce document ne fixe que leur mise en forme.

## 1. Sujet, public, intention

- **Ce qu'est le produit** : l'outil d'évaluation de la personnalité (modèle des cinq grands facteurs, inventaire IPIP-NEO-120 adapté au Maroc) qu'un cabinet de conseil marocain fait passer aux collaborateurs et candidats de ses clients, puis restitue.
- **Qui le voit** : le participant, une fois, le temps de 120 affirmations, souvent sur téléphone, parfois en arabe ; le dirigeant ou la direction des ressources humaines qui découvre le service ; le consultant Tenga qui s'appuie sur la page de résultat en entretien de restitution.
- **Ce qu'il doit inspirer** : le sérieux d'un instrument de mesure, la chaleur d'un cabinet qui reçoit, la discrétion due à des données personnelles. Marocain par la matière et la langue, jamais par l'ornement : ni zellige en motif, ni arcs, ni calligraphie décorative.
- **L'idée qui le rend reconnaissable** : **la règle graduée**. Chaque score est une position sur une échelle fine, toujours dessinée de la même façon (piste, repère du milieu, trait d'accent, valeur), de l'accueil jusqu'à la dernière facette. Tout le reste reste calme pour que cette règle porte l'identité.

## 2. Ce qui a été écarté, et pourquoi

Premier jet, puis relecture contre les réflexes génériques (skill `frontend-design`) :

| Premier réflexe | Pourquoi il est écarté | Décision |
|---|---|---|
| Fond crème `#F4F1EA`, titres à empattement, accent terre cuite | C'est la signature la plus fréquente des pages générées ; la terre cuite renvoie au folklore de Marrakech | Fond pierre presque neutre `#F7F6F3`, une seule famille sans empattement, accent vert cèdre |
| Bleu SaaS `#006FEE` conservé de NextUI | Couleur d'outil par défaut, sans lien avec le cabinet | Remplacé par le vert cèdre `#1D5446` |
| Rangée de trois cartes « Ouvert, Gratuit, Scientifique » | Motif de gabarit, et promesses fausses pour un service sur invitation | Liste des cinq dimensions en deux colonnes, sans cartes |
| Graphique en barres verticales multicolores | Couleurs sans signification, contrastes à 1,84, illisible en arabe | Règles horizontales monochromes, en HTML, retournées en RTL |
| Questionnaire à curseur horizontal de 1 à 5 | Libellés longs (« Ni en accord ni en désaccord ») qui se chevauchent à 390 pixels | Cinq lignes pleine largeur, cibles de 48 pixels |
| Étiquettes en capitales espacées au-dessus de chaque titre | Tic de gabarit (« eyebrow ») et sans équivalent en arabe | Aucune ; la hiérarchie tient au corps et à la graisse |
| Animation d'entrée sur chaque section | Bruit, et défaut type de page générée | Un seul mouvement signature : la règle qui se trace une fois |

## 3. Couleurs

Un seul accent, une seule famille de gris (pierre, légèrement chaude), aucune couleur décorative. Le vert cèdre évoque le bois de l'Atlas et les menuiseries des médersas sans les représenter ; il est aussi la couleur de la stabilité attendue d'un conseil.

### 3.1 Jetons et rôles, thème clair

| Jeton CSS | Valeur | Rôle |
|---|---|---|
| `--c-fond` | `#F7F6F3` | Fond de page |
| `--c-surface` | `#FFFFFF` | Panneaux, champs, menus, zone du questionnaire |
| `--c-creux` | `#EFEDE8` | Piste des règles, survol neutre, bloc de code |
| `--c-trait` | `#DAD7D0` | Filets de séparation (décoratifs, non porteurs d'information) |
| `--c-trait-fort` | `#7E837F` | Contours de contrôles (radios, champs), repère du milieu des règles |
| `--c-encre` | `#1A1C1B` | Texte principal, titres |
| `--c-texte-2` | `#4D5350` | Texte courant secondaire, paragraphes de résultat |
| `--c-texte-3` | `#636965` | Métadonnées, légendes, aide (jamais sur `--c-creux` pour du petit texte : 4,80) |
| `--c-accent` | `#1D5446` | Bouton principal, trait des règles, lien, anneau de focus, choix coché |
| `--c-accent-survol` | `#16433A` | Survol et appui du bouton principal |
| `--c-accent-doux` | `#E3EDE9` | Fond du choix coché, fond du lien actif de navigation |
| `--c-sur-accent` | `#FFFFFF` | Texte sur `--c-accent` |
| `--c-erreur` | `#A8261B` | Texte et contour d'erreur |
| `--c-erreur-doux` | `#FBEAE7` | Fond d'un message d'erreur |
| `--c-avis` | `#7A4B00` | Texte d'un avis (progression restaurée) |
| `--c-avis-doux` | `#FBF1DE` | Fond d'un avis |

### 3.2 Thème sombre

Fond teinté, jamais noir pur ; l'accent s'éclaircit pour garder son contraste.

| Jeton CSS | Valeur |
|---|---|
| `--c-fond` | `#111413` |
| `--c-surface` | `#181C1B` |
| `--c-creux` | `#202523` |
| `--c-trait` | `#2C3230` |
| `--c-trait-fort` | `#6E7571` |
| `--c-encre` | `#ECEDE9` |
| `--c-texte-2` | `#B7BDB9` |
| `--c-texte-3` | `#949A96` |
| `--c-accent` | `#7CC2AD` |
| `--c-accent-survol` | `#9AD3C1` |
| `--c-accent-doux` | `#1B2E28` |
| `--c-sur-accent` | `#0F1F1A` |
| `--c-erreur` | `#F2978C` |
| `--c-erreur-doux` | `#3A1E1A` |
| `--c-avis` | `#F0C987` |
| `--c-avis-doux` | `#2A2214` |

### 3.3 Contrastes calculés (formule WCAG 2.2, luminance relative)

| Paire | Clair | Sombre | Exigence |
|---|---|---|---|
| Encre sur fond | 15,85 | 15,76 | 4,5 |
| Encre sur surface | 17,13 | 14,63 | 4,5 |
| Texte 2 sur fond / surface / creux | 7,28 / 7,87 / 6,73 | 9,70 / 9,01 / 8,14 | 4,5 |
| Texte 3 sur fond / surface / creux | 5,20 / 5,62 / 4,80 | 6,46 / 6,00 / 5,42 | 4,5 |
| Accent (texte, lien) sur fond / surface | 8,07 / 8,72 | 8,98 / 9,50 | 4,5 |
| Texte du bouton sur accent | 8,72 | 8,27 | 4,5 |
| Texte du bouton sur accent au survol | 11,06 | 10,12 | 4,5 |
| Accent sur accent doux (choix coché) | 7,29 | 6,93 | 4,5 |
| Encre sur accent doux | 14,32 | 12,16 | 4,5 |
| Trait fort sur surface / fond (contour de radio) | 3,86 / 3,57 | 3,64 / 3,92 | 3 (critère 1.4.11) |
| Trait de la règle (accent) sur piste creux | 7,45 | 7,54 | 3 (critère 1.4.11) |
| Erreur sur fond d'erreur | 6,09 | 6,94 | 4,5 |
| Texte d'erreur blanc sur erreur (bouton destructif) | 7,10 | sans objet | 4,5 |
| Avis sur fond d'avis | 6,61 | 10,03 | 4,5 |

Non porteurs d'information, donc sans exigence : `--c-trait` sur surface (1,44 et 1,32) et la piste `--c-creux` sur surface (1,17 et 1,11). La règle reste lisible sans la piste, parce que le trait d'accent et la valeur écrite portent l'information.

### 3.4 Correspondance avec NextUI

NextUI lit ses couleurs dans le thème passé au greffon `nextui()`. La palette ci-dessus y est injectée (code exact dans le plan d'implémentation, étape 1) :

- `background` = fond, `foreground` = encre, `content1` = surface, `divider` = trait, `focus` = accent ;
- `primary` = accent (échelle 50 à 900 dérivée), `danger` = erreur, `warning` = avis, `success` = accent ;
- `secondary` = encre : toute trace de violet restante (pages de comparaison que le lot 2 supprimera) devient neutre sans y toucher ;
- `default` = échelle pierre, réordonnée pour que `default-500`, très utilisé par NextUI pour le texte secondaire, vaille `--c-texte-3` et passe 4,5.

## 4. Typographie

### 4.1 Familles

| Usage | Police | Fichiers chargés | Pourquoi |
|---|---|---|---|
| Latin (FR, EN), interface et texte | **Instrument Sans**, variable, axes `wght` 400 à 700 et `wdth` 75 à 100 | 1 fichier variable, sous-ensembles `latin` et `latin-ext` | Grotesque contemporaine au dessin net, plus de caractère qu'Inter sans être une police de mode ; l'axe de chasse donne aux grands titres un resserrement sans seconde famille |
| Arabe | **IBM Plex Sans Arabic**, poids 400, 500, 600 | 3 fichiers statiques, sous-ensemble `arabic` | Arabe sans empattement dessiné pour l'interface, lisible en petit corps, hauteur d'œil compatible avec un latin grotesque, sobriété adaptée à un cabinet |

Vérifié dans `next/dist/compiled/@next/font/dist/google/font-data.json` (Next.js 15.5 installé) : Instrument Sans existe avec les axes cités et les sous-ensembles `latin`, `latin-ext` ; IBM Plex Sans Arabic existe avec les poids 100 à 700 et le sous-ensemble `arabic`. Licence SIL Open Font License pour les deux.

Chargement par `next/font/google` (fichiers servis par l'application, aucun appel à Google à l'exécution) :

- Instrument Sans : `preload: true`, `display: 'swap'`, variable `--font-latin` ;
- IBM Plex Sans Arabic : `preload: false` (téléchargée seulement si un glyphe arabe est affiché), `display: 'swap'`, variable `--font-arabe` ;
- Fira Code et Inter sont retirées.

Pile appliquée : `--font-texte` vaut `var(--font-latin), system-ui, sans-serif` et, sous `:lang(ar)`, `var(--font-arabe), var(--font-latin), system-ui, sans-serif`. Les segments latins d'une page arabe (identifiant, « Tenga ») gardent ainsi la police latine.

À vérifier pendant l'implémentation, avant de s'y fier : présence des chiffres tabulaires (`tnum`) dans Instrument Sans ; sinon, colonne de valeurs en largeur fixe (`min-width` en `ch`).

### 4.2 Échelle (base 16 pixels)

| Jeton | Taille | Interligne latin | Interligne arabe | Graisse | Approche (latin seulement) | Usage |
|---|---|---|---|---|---|---|
| `display` | 3 rem (2,25 rem sous 768 px) | 1,05 | 1,35 | 600, chasse 90 | −0,02 em | Titre de l'accueil seulement |
| `titre-1` | 2,25 rem (1,875 rem sous 768 px) | 1,15 | 1,45 | 600 | −0,015 em | `h1` de chaque page |
| `titre-2` | 1,5 rem | 1,25 | 1,5 | 600 | −0,01 em | Domaines, sections |
| `titre-3` | 1,1875 rem | 1,35 | 1,6 | 600 | 0 | Facettes, questions FAQ |
| `question` | 1,375 rem (1,25 rem sous 768 px) | 1,35 | 1,6 | 500 | −0,005 em | Énoncé du questionnaire |
| `chapo` | 1,1875 rem | 1,55 | 1,8 | 400 | 0 | Paragraphe d'introduction |
| `corps` | 1 rem (1,0625 rem en arabe) | 1,6 | 1,8 | 400 | 0 | Texte courant |
| `petit` | 0,875 rem (0,9375 rem en arabe) | 1,5 | 1,7 | 400 ou 500 | 0 | Métadonnées, aide, pied |
| `legende` | 0,8125 rem | 1,45 | 1,7 | 500 | 0 | Graduations des règles, dates |

Règles :

- Trois graisses seulement : 400, 500, 600. Jamais 700 ni plus en arabe.
- Aucune approche négative ni capitales forcées en arabe ; aucun italique en arabe.
- Largeur de lecture : 68 caractères au plus (`max-w-[68ch]`), 60 en arabe.
- `text-wrap: balance` sur les titres, `text-wrap: pretty` sur les paragraphes.
- Casse de phrase partout (« Voir mes résultats », jamais « VOIR MES RÉSULTATS »).
- Valeurs numériques : `font-variant-numeric: tabular-nums`.

## 5. Espacements, grille, rayons, ombres

- **Échelle d'espacement** (pixels) : 4, 8, 12, 16, 24, 32, 48, 64, 96. Ce sont les pas Tailwind `1, 2, 3, 4, 6, 8, 12, 16, 24` ; aucune autre valeur arbitraire.
- **Conteneur** : `max-w-6xl` (1 152 px), marges latérales 20 px sous 640, 32 px au-delà. Pages de lecture et questionnaire : colonne de 44 rem au plus.
- **Grille** : 12 colonnes à partir de 1 024 px, une seule colonne en dessous, sans exception.
- **Rythme vertical** : 96 px entre sections de l'accueil sur grand écran, 64 sur mobile ; 48 entre domaines du résultat ; le bas d'une section reçoit 8 px de plus que le haut.
- **Rayons** : 4 px pour les petits éléments (pastilles, case de focus), 6 px pour les contrôles (boutons, champs, choix), 10 px pour les panneaux. Jamais de forme en pilule pour un bouton, jamais de rayon de 16 px ou plus.
- **Ombres** : aucune sur les contenus. Une seule, pour ce qui flotte (menu de langue, menu mobile, info-bulle) : `0 8px 24px -12px rgb(26 28 27 / 0.18), 0 0 0 1px rgb(26 28 27 / 0.06)` ; en sombre `0 8px 24px -12px rgb(0 0 0 / 0.5), 0 0 0 1px rgb(236 237 233 / 0.08)`.
- **Filets** : 1 px `--c-trait` pour séparer ; c'est le seul moyen de regrouper, plutôt que des cartes.
- **Niveaux d'empilement** : en-tête 30, menus 40, fenêtres 50 ; aucune autre valeur.

## 6. Mouvement

- **Durées** : `--duree-courte` 120 ms (couleurs, survol), `--duree` 180 ms (changement de question, ouverture d'un menu), `--duree-longue` 320 ms (tracé des règles).
- **Courbe unique** : `cubic-bezier(0.2, 0, 0, 1)`.
- **Propriétés animées** : `opacity` et `transform` seulement.
- **Le mouvement signature** : au chargement de la page, le trait d'accent des cinq règles de la vue d'ensemble du résultat et du spécimen de l'accueil se trace depuis le début de la piste (`scaleX` de 0 à 1, origine sur le bord de début de ligne, donc à droite en arabe), décalé de 40 ms d'une règle à l'autre. Une seule fois par page, jamais en boucle, en CSS seul. Les règles des facettes, plus bas dans la page, sont statiques.
- **Changement de question** : la nouvelle question apparaît en fondu avec un déplacement vertical de 4 px, 180 ms. Le passage automatique sur mobile garde son délai de 700 ms (comportement existant), qui devient l'occasion de montrer le choix coché.
- **Appui** : boutons `translate-y-px` à l'appui ; pas d'agrandissement.
- **Supprimé** : halo pulsant, sonar, bandeau défilant, confettis.
- **`prefers-reduced-motion: reduce`** : toutes les durées passent à 0,01 ms, les règles s'affichent tracées, le défilement redevient instantané.

## 7. Règles de droite à gauche (arabe)

1. Propriétés logiques exclusivement : `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`, `rounded-s` ; aucune classe `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right` dans le code refondu. Espacement entre éléments par `gap`, jamais `space-x-*`.
2. Icônes directionnelles (flèches, chevrons) retournées par `rtl:-scale-x-100` ; les icônes non directionnelles (thème, copie, impression) ne le sont pas.
3. Règles graduées : le début de l'échelle est au bord de début de ligne (à droite en arabe), le trait croît vers la gauche. Obtenu sans code particulier par une boîte en flux et `transform-origin` sur le côté de début (`origin-left rtl:origin-right`).
4. Segments en écriture latine isolés par `<bdi>` : identifiant de résultat, « Tenga Conseil », adresses, ligne de copyright entière. L'année et le symbole © restent dans un même `<bdi dir="ltr">`.
5. Chiffres : chiffres occidentaux en arabe, usage marocain courant, imposés par `Intl.NumberFormat('ar-MA', { numberingSystem: 'latn' })` et `Intl.DateTimeFormat('ar-MA', { numberingSystem: 'latn', dateStyle: 'long' })` ; en français `fr-MA`. Un seul module de formatage (`lib/format.ts`).
6. Ponctuation : le point d'exclamation et le point final se placent à gauche en arabe d'eux-mêmes, à condition de ne jamais concaténer un libellé traduit et une ponctuation en dur dans le JSX.
7. Interlignage arabe majoré (tableau § 4.2) et corps arabe majoré d'un seizième.
8. Vérification : chaque écran est capturé en `ar` à 390 et 1 440 pixels avant d'être déclaré fini.

## 8. Composants

Pour chaque composant : décision, puis référence 21st.dev retenue et ce qu'on en garde. Les fiches 21st.dev ont été consultées par recherche dans le catalogue (métadonnées et aperçu) ; le code de deux d'entre elles a été lu (Segmented Progress Questionnaire et Rank Bars), le quota gratuit de lectures du jour étant de deux. Aucun code de 21st.dev n'est copié : ces références sont bâties sur shadcn/ui et Radix, alors que le projet reste sur NextUI 2 ; on en reprend la structure et les choix d'accessibilité.

### 8.1 En-tête

- Hauteur 64 px, collant, fond `--c-fond` à 92 % avec `backdrop-blur-sm`, filet bas `--c-trait` affiché seulement après défilement.
- Début de ligne : mot-symbole « Tenga » (Instrument Sans 600, 1,25 rem) suivi de « Assessments » (400, `--c-texte-3`, 0,875 rem), en attendant un logo (§ 12).
- Navigation : liens 0,9375 rem, 500, `--c-texte-2` ; lien actif en `--c-encre` avec un filet d'accent de 2 px sous le texte (`aria-current="page"`), jamais en rouge.
- Fin de ligne : sélecteur de langue puis bouton de thème. Place réservée, vide en phase 1, pour « Connexion » ou le menu du compte du lot 1.
- Sous 768 px : mot-symbole, sélecteur de langue compact, bouton menu (« Ouvrir le menu » ou « Fermer le menu ») ; le menu plein écran liste les liens en `titre-3`, pas en 3 rem.
- Lien d'évitement « Aller au contenu » en premier élément focalisable.
- **Référence** : NavBar, mohitsapat, https://21st.dev/@mohitsapat/components/navbar (id 32097). On garde : l'ordre logo, liens, sélecteur de langue, menu mobile repliable. On ne garde pas : le bouton GitHub, le bouton d'appel à l'action dans l'en-tête.

### 8.2 Sélecteur de langue

- Bouton qui affiche le nom de la langue courante dans sa langue (« Français », « العربية », « English ») et ouvre un menu de trois entrées, chacune avec `lang` et `dir` propres. Aucun drapeau.
- Mobile : même bouton, libellé court (« FR », « ع », « EN »).
- Les autres langues restent routables mais ne figurent plus dans le sélecteur (§ 12, point 4).
- **Référence** : Language Selector Dropdown, samsiavoshian2009, https://21st.dev/@samsiavoshian2009/components/language-selector-dropdown (id 7450). On garde : menu court avec libellé natif. On rejette : les drapeaux.

### 8.3 Bouton de thème

- Bouton icône de 40 px (cible conforme au critère 2.5.8), icône 20 px, libellé accessible traduit (« Passer au thème sombre »). Thème par défaut : celui du système.

### 8.4 Boutons

| Variante | Apparence | Usage |
|---|---|---|
| Principal | Fond `--c-accent`, texte `--c-sur-accent`, 500, hauteur 44 px, rayon 6 px, marge interne 20 px | Une seule action principale par écran : commencer, suivant, voir mes résultats |
| Secondaire | Contour 1 px `--c-trait-fort`, texte `--c-encre`, fond transparent, survol `--c-creux` | Précédent, imprimer |
| Discret | Texte `--c-accent`, souligné au survol, sans fond | Liens d'action dans le texte (« Recommencer ») |
| Destructif | Fond `--c-erreur`, texte blanc | Réservé aux lots suivants (suppression de compte) |

États : survol 120 ms ; appui `translate-y-px` ; focus anneau 2 px `--c-accent` décalé de 2 px ; désactivé fond `--c-creux`, texte `--c-texte-3`, curseur interdit, sans transparence ; chargement : libellé conservé, indicateur à l'emplacement de l'icône, `aria-busy`.

Icônes : celles de `components/icons.tsx` (SVG en ligne), uniformisées à 20 px et trait de 1,5 px. Pas de nouvelle bibliothèque d'icônes.

- **Référence** : coss Button, https://21st.dev/@coss.com/components/coss-button (id 11382). On garde : la taxonomie de variantes (plein, contour, discret, destructif), l'état de chargement qui garde le libellé, l'anneau de focus visible. Réalisation : `Button` de NextUI avec les classes ci-dessus.

### 8.5 Panneaux (remplacent les cartes)

- Une seule forme : surface `--c-surface`, filet 1 px `--c-trait`, rayon 10 px, marge interne 24 px (32 au-delà de 768 px), sans ombre.
- Usage limité : zone du questionnaire, avis et erreurs. Ailleurs, on regroupe par filets et espacement. Jamais de panneau dans un panneau.

### 8.6 Questionnaire

Structure d'un écran (une question sur mobile, trois au-delà de 768 px, comme aujourd'hui) :

1. **Bandeau de progression**, collant sous l'en-tête : texte « Question 4 sur 120 » (`petit`, 500, chiffres tabulaires) en début de ligne ; dessous, barre continue de 4 px, piste `--c-creux`, trait `--c-accent`. `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="120"`, `aria-valuenow` = nombre de réponses, `aria-valuetext="Question 4 sur 120"`. Pas de pourcentage affiché : il doublerait l'information. Le chronomètre n'est plus affiché ; la durée continue d'être mesurée et enregistrée.
2. **Question** : `h2` de style `question`, précédé du numéro « 4. » en `--c-texte-3`. Le groupe de réponses est nommé par ce titre (`aria-labelledby`), ce qui équivaut au couple `fieldset` et `legend` sans doubler le groupe que NextUI rend déjà.
3. **Choix** : cinq lignes pleine largeur (largeur maximale 44 rem), hauteur minimale 48 px, espacées de 8 px ; chaque ligne est une étiquette entièrement cliquable avec la pastille radio (20 px, contour 1,5 px `--c-trait-fort`) en début de ligne et le libellé (`corps`, 500). Survol : fond `--c-creux`. Coché : fond `--c-accent-doux`, contour 1,5 px `--c-accent`, pastille pleine `--c-accent`, libellé `--c-encre` 600. Focus : anneau 2 px `--c-accent` sur la ligne. Clavier : flèches pour changer de choix (comportement react-aria conservé).
4. **Navigation** : en bas, `justify-between` ; « Précédent » (secondaire) en début de ligne, « Suivant » (principal) en fin de ligne, remplacé à la dernière page par « Voir mes résultats ». Libellés en casse de phrase. Sur mobile, les deux boutons occupent chacun la moitié de la largeur.
5. **Changement d'écran** : après « Suivant », le focus se place sur le `h2` de la première nouvelle question (`tabIndex={-1}`), puis défilement doux vers elle (instantané si mouvement réduit).
6. **Progression restaurée** : avis en ligne au-dessus de la première question, `role="status"`, fond `--c-avis-doux`, texte `--c-avis`, un vrai bouton discret « recommencer depuis le début » (texte de `textes.md` § 3.1) et un bouton de fermeture nommé (« Masquer ce message »).
7. **Échec d'enregistrement** : message `role="alert"` au-dessus de la navigation, fond `--c-erreur-doux`, titre `titre-3` `--c-erreur`, texte `--c-encre`, bouton secondaire « Recharger la page ». Police du texte, pas de police de code.
8. **Envoi** : le bouton passe en chargement (« Enregistrement… ») ; pas de confettis.

- **Références** :
  - Segmented Progress Questionnaire, sean0205, https://21st.dev/@sean0205/components/questionnaire-segmented-progress (id 29790), code lu. On garde : `fieldset` et `legend` qui nomment le groupe ; `role="progressbar"` avec un `aria-valuetext` qui dit « Question n sur m » ; chaque choix comme étiquette pleine largeur avec la radio intégrée ; erreur en ligne en `role="alert"` ; actions précédent et suivant aux deux extrémités ; fin de parcours sans cadre nouveau. On ne garde pas : la barre segmentée (illisible à 120 segments), lucide-react.
  - Accessible Radio Group, a11ypros, https://21st.dev/@a11ypros/components/a11y-radio (id 34672). On garde : regroupement par `fieldset`, texte d'aide et d'erreur reliés.
  - Progress Bar, ddoemonn, https://21st.dev/@ddoemonn/components/progress-bar (id 23549). On garde : barre linéaire étiquetée, transition de remplissage douce, coupée en mouvement réduit.

### 8.7 Règle graduée (composant signature)

Un seul composant, `ScoreRule`, rendu côté serveur en HTML et CSS, sans bibliothèque de graphiques.

- **Rangée** : grille `[minmax(8rem,14rem)_1fr_auto]` au-delà de 640 px ; en dessous, libellé et valeur sur une ligne, règle pleine largeur dessous.
- **Libellé** : nom du domaine ou de la facette (`corps`, 500, `--c-encre`), lien d'ancre vers sa section dans la vue d'ensemble.
- **Piste** : hauteur 8 px (domaines) ou 6 px (facettes), `--c-creux`, rayon 4 px.
- **Trait** : de l'origine de l'échelle jusqu'au score, `--c-accent`, même rayon. Largeur = `(score − min) / (max − min)`, avec min 24 et max 120 pour un domaine (24 questions notées de 1 à 5), min 4 et max 20 pour une facette (4 questions).
- **Repère du milieu** : trait vertical de 1 px, `--c-trait-fort`, hauteur 14 px, à 72 (domaines) ou 12 (facettes), c'est-à-dire la réponse moyenne de 3 ; c'est la frontière entre « bas » et « élevé » du paquet de score.
- **Valeur** : « 82 » en `corps` 600 chiffres tabulaires, suivi de « sur 120 » en `petit` `--c-texte-3`, puis le qualificatif traduit (« élevé », « bas », « au milieu ») en `petit` 500. Le texte porte l'information ; la couleur n'en porte aucune.
- **Couleur** : un seul accent pour tous les domaines. Les domaines se distinguent par leur nom, pas par une couleur.
- **Accessibilité** : la piste et le trait sont `aria-hidden` ; la rangée est un élément de liste dont le texte suffit (« Extraversion, 82 sur 120, élevé »). Pas de `role="meter"` (prise en charge inégale par les lecteurs d'écran).
- **Mouvement** : tracé décrit au § 6, activé par une propriété `anime` du composant.
- **Impression** : `print-color-adjust: exact` sur piste et trait.
- **Références** :
  - Rank Bars, eugeneshilow, https://21st.dev/@eugeneshilow/components/rank-bars (id 29452), code lu. On garde : la grille libellé, piste, valeur en chiffres tabulaires ; l'échelle partant de l'origine ; le tracé par `scaleX` décalé par rangée, coupé en mouvement réduit. On corrige : `transform-origin: left` en dur (remplacé par une origine logique), la palette catégorielle (remplacée par l'accent unique), la colonne de libellé fixe à 200 px.
  - Skill Level Meters, cnippet-dev, https://21st.dev/@cnippet-dev/components/v-meter-6 (id 18996). On garde : la pile de jauges étiquetées pour les facettes.
  - Meter, hero_ui, https://21st.dev/@hero_ui/components/heroui-meter (id 19526). On garde : l'idée d'une valeur formatée accompagnant toujours la jauge. HeroUI est le nouveau nom de NextUI ; le composant n'existe pas dans NextUI 2.6 installé, d'où la réalisation maison.

### 8.8 Page de résultat

Ordre de lecture :

1. **En-tête de page** : `h1` « Votre profil de personnalité » ; dessous, la date (formatée selon la langue) en `petit` `--c-texte-3`. En fin de ligne, sur grand écran : bouton secondaire « Imprimer ou enregistrer en PDF ».
2. **Vue d'ensemble** : `h2` « Vos cinq dimensions », puis les cinq règles de domaine, puis la phrase d'introduction `results.intro` de `textes.md` § 4.2 (« Ces résultats décrivent vos tendances habituelles… ») et, en `petit`, la légende de l'échelle : « Le trait vertical marque le milieu de l'échelle de réponse (3 sur 5). » Jamais le mot « moyenne », qui laisserait croire à une comparaison avec d'autres personnes : le calcul n'utilise aucune norme (`voix-de-marque.md` § 2.7). Les libellés des domaines et facettes suivent le lexique de `voix-de-marque.md` § 4 ; « Névrosisme » est accompagné de sa glose.
3. **Sommaire collant** au-delà de 1 024 px : colonne de 3 sur 12 en début de ligne, liste des cinq domaines en liens d'ancre, l'entrée lue surlignée (`aria-current="location"`) ; sous 1 024 px, rangée de liens défilante horizontalement sous la vue d'ensemble. Il remplace la barre de boutons « All » et la liste déroulante « Select domain ».
4. **Un bloc par domaine** (colonne de 9 sur 12, texte limité à 68 caractères) : `h2` du domaine avec `id` stable fondé sur la lettre du domaine (`domaine-O`, `domaine-C`…) ; règle du domaine ; description courte en `chapo` ; « En savoir plus sur cette dimension » en élément natif `details` et `summary` (traduit) ; texte du résultat ; puis `h3` « Facettes » et les six facettes : règle de facette puis texte, séparées par des filets.
5. **Bloc identifiant et partage** : relégué après la vue d'ensemble, en avis neutre. Le lot 1 le supprime ; aucun soin supplémentaire.
6. **Impression** : en-tête, pied, sommaire, actions masqués ; un domaine ne commence pas en bas de page (`break-before: auto`, `break-inside: avoid` sur l'en-tête de domaine et chaque facette).

### 8.9 Accueil

L'accès deviendra uniquement sur invitation (lot 2) : l'accueil devient une page de présentation du service, sans promesse de gratuité.

Textes : ceux de `textes.md` § 2 (session des textes) ; la mise en page ne crée aucun texte de présentation.

1. **Ouverture**, grille 7 et 5 colonnes : à gauche (début de ligne), titre `display` (`frontpage.description.top`, sans mot mis en couleur), `chapo` (`frontpage.description.info`, qui dit « sans limite de temps »), bouton principal « Commencer le questionnaire ». À droite, un **spécimen** : panneau qui montre cinq règles de domaine avec la légende « Exemple de restitution, valeurs fictives » ; c'est le produit lui-même, pas une illustration. Valeurs fixées dans le code : 87, 64, 101, 58, 79.
2. **Source** : sous un filet, la référence de l'inventaire (`frontpage.description.reference` : IPIP-NEO-120, Johnson 2014, domaine public, lien vers ipip.ori.org) en `petit`.
3. **Articles** : affiché seulement s'il existe au moins un article dans la langue exacte de la page (aucun en FR ni en AR aujourd'hui) ; liste de trois titres avec date et description, sans images.

Une liste des cinq dimensions avec une phrase de définition chacune serait utile, mais aucune définition validée n'existe : celles du paquet de résultats contiennent des contresens (`voix-de-marque.md` § 4.3). Elle s'ajoutera quand `textes.md` les fournira, au format d'une liste de définitions en deux colonnes, sans cartes.

Retirés : cartes « Ouvert, Gratuit, Scientifique », compteur de 4 000 000 de tests, cible pulsante, bandeau des langues, bloc « Latest posts » en anglais.

- **Référence** : Editorial Hero, felipemenezes098, https://21st.dev/@felipemenezes098/components/hero-05 (id 19075). On garde : accroche en début de ligne, titre et texte alignés sur la grille, appels à l'action sous le texte. On remplace : l'image pleine largeur par le spécimen de résultat.

### 8.10 Pages de contenu (À propos, FAQ, Confidentialité, article)

- Colonne de lecture unique de 68 caractères, alignée en début de ligne dans le conteneur ; `h1` `titre-1`, puis `chapo`.
- **FAQ** : deux colonnes au-delà de 1 024 px : début de ligne, titre et phrase d'introduction avec l'adresse de contact ; fin de ligne, liste de définitions où chaque question est un `h3` suivi de sa réponse, séparées par des filets. Toutes les réponses sont visibles (quatre à six questions ne justifient pas un accordéon).
- **Article** : retour aux articles en lien discret avec chevron retourné en RTL ; image d'en-tête au format 16:9 sous le titre, pas de titre incrusté dans l'image ; métadonnées (date, durée de lecture) formatées selon la langue ; styles de texte riche définis dans `globals.css` sous `.texte-riche` (intertitres, listes, citations avec `border-s-2` accent, liens soulignés), puisque `prose` est inopérant.
- **Liste des articles** : liste éditoriale : titre `titre-3`, description, date ; filets entre les entrées ; pas de vignettes.
- **Références** :
  - FAQ Two Column, mohammadshehadeh, https://21st.dev/@mohammadshehadeh/components/faq-05 (id 26656). On garde : introduction en début de ligne, questions en fin de ligne, filet vertical, empilement sur mobile, propriétés logiques. On ne garde pas : l'accordéon.
  - Blog Cards, sumonadotwork, https://21st.dev/@sumonadotwork/components/blog-cards (id 9321). On garde : liste textuelle titre, date, description, avec séparateurs.

### 8.11 Pied de page

- Filet haut `--c-trait`, marge interne 48 px.
- Début de ligne : mot-symbole, puis « Un service de Tenga Conseil » en `petit` `--c-texte-3`.
- Fin de ligne : liens À propos, FAQ, Confidentialité, Articles en `petit` 500, cibles d'au moins 24 px de haut.
- Ligne finale : « © 2026 Tenga Conseil » dans un `<bdi dir="ltr">`.
- **Référence** : Minimal Two-Column Footer, ln-dev7, https://21st.dev/@ln-dev7/components/footer-17 (id 26908). On garde : marque et phrase en début de ligne, liens en fin de ligne, copyright sur une ligne. On ne garde pas : les icônes de réseaux sociaux.

### 8.12 Pages 404 et erreur

- Même gabarit que les pages de contenu : `h1` (« Page introuvable » ; « Une erreur est survenue »), une phrase qui dit quoi faire, bouton principal « Revenir à l'accueil », bouton secondaire « Réessayer » sur la page d'erreur. Pas d'image. La page d'erreur n'affiche jamais `error.message`, seulement son `digest` s'il existe, en `petit`, pour le support.

### 8.13 Avis et messages

Un composant `Notice` à trois tons : `info` (fond `--c-creux`, texte `--c-encre`), `avis` (fond et texte d'avis), `erreur` (fond et texte d'erreur). Rayon 6 px, marge interne 16 px, titre facultatif en 600, `role="status"` ou `role="alert"` selon le ton.

## 9. États

- **Chargement** : la page de résultat est rendue côté serveur ; un `loading.tsx` affiche un squelette de la vue d'ensemble (cinq rangées de la géométrie exacte des règles, piste `--c-creux`, sans scintillement en mouvement réduit).
- **Vide** : liste d'articles vide dans une langue : le bloc n'est pas rendu à l'accueil ; la page Articles dit « Aucun article n'est encore publié en français. » avec un lien vers l'accueil.
- **Erreur** : § 8.6 (7) et § 8.12.

## 10. Accessibilité, critères retenus

Contrastes du § 3.3 ; cibles d'au moins 24 px (44 px pour les choix et boutons du questionnaire) ; focus visible partout (anneau 2 px accent, décalage 2 px, jamais supprimé) ; lien d'évitement ; un seul `h1` par page ; groupes de réponses nommés ; libellés d'accessibilité traduits ; rien ne dépend de la couleur seule ; zoom à 200 % sans perte ; `forced-colors: active` : la piste et le trait des règles reçoivent `forced-color-adjust: none` avec des couleurs système (`CanvasText` sur `Canvas`) pour rester visibles.

## 11. Pile technique

- On reste sur **NextUI 2 et Tailwind 3.4** : thème injecté dans `nextui()`, jetons en variables CSS dans `globals.css`, utilitaires Tailwind qui pointent sur ces variables.
- **Écart assumé** : le graphique de résultat quitte ApexCharts pour un composant HTML et CSS. Raisons : retournement RTL impossible proprement avec ApexCharts, absence d'alternative textuelle, contrastes imposés par sa palette, rendu côté client seulement (pas d'impression fiable, page vide sans JavaScript), poids de la bibliothèque. ApexCharts reste installé tant que les pages de comparaison existent ; le lot 2 les supprime, la dépendance part avec elles.
- `canvas-confetti` est retiré.
- Aucune nouvelle dépendance.

## 12. Décisions qui reviennent à Amine, avec l'option par défaut

Les décisions de texte (gratuité, durée annoncée, promesses de confidentialité, « Névrosisme » ou « Stabilité émotionnelle », échelles de réponse, langues, articles) sont instruites par la session des textes dans `voix-de-marque.md` § 7 ; la mise en page s'y conforme et ne les reprend pas ici. Restent les décisions propres au design :

| # | Sujet | Option par défaut retenue pour avancer | Pourquoi |
|---|---|---|---|
| 1 | Logo et identité de Tenga Conseil | Aucun logo n'existe dans le dépôt et aucune trace publique de la marque n'a été trouvée (recherche du 20/10/2026). Par défaut : mot-symbole typographique « Tenga » en Instrument Sans 600, et icône de site provisoire « T » blanc sur carré vert cèdre. À remplacer par le logo officiel dès qu'il existe. | Avancer sans inventer une identité ; le mot-symbole se remplace par un fichier SVG sans toucher au reste |
| 2 | Couleur d'accent | Vert cèdre `#1D5446` | Si Tenga a déjà une couleur de marque, elle remplace l'accent dans les deux thèmes ; les contrastes du § 3.3 sont à recalculer |
| 3 | Polices | Instrument Sans et IBM Plex Sans Arabic | Si une charte existe, ses polices remplacent celles-ci à condition d'avoir un arabe de même qualité |
| 4 | Langues du sélecteur | Le sélecteur ne montre que FR, AR, EN ; les 39 autres langues restent accessibles par leur adresse en attendant la décision 8 de `voix-de-marque.md` | Retirer des langues routables change le site, pas seulement son apparence |
| 5 | Chronomètre du questionnaire | Masqué ; la durée reste mesurée et enregistrée | Un chronomètre visible pousse à répondre vite, et contredit « sans limite de temps » (`textes.md` § 2) |
| 6 | Thème sombre | Conservé, et réglé par défaut sur la préférence du système | Le supprimer simplifierait la maintenance ; le garder respecte les réglages du participant |
