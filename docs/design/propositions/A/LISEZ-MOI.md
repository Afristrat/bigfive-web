# Proposition A : éditorial chaleureux

Pages : `accueil.html`, `accueil-ar.html`, `questionnaire.html`, `resultat.html`, `resultat-ar.html`. Captures pleine page à 1440 et 390 px dans `captures/` (`<page>-<largeur>.png`). Maquettes statiques autonomes (CSS écrit à la main, aucune image externe, seules les polices viennent de Google Fonts).

## L'idée en cinq lignes

1. Un magazine plutôt qu'un formulaire : grands titres en serif de caractère, beaucoup d'air, rythme vertical généreux.
2. Une palette chaude (crème, terre cuite, vert profond) qui évoque un cabinet qui reçoit, sans folklore marocain décoratif.
3. Chaque grand facteur a sa couleur et sa forme (vague, soleil, étoile, deux cercles, trois barres), de l'accueil jusqu'au détail d'une facette.
4. Le graphique mémorable : cinq anneaux concentriques, un par facteur, doublés d'une liste de cartes avec jauge et score ; le détail d'un domaine affiche ses six facettes en jauges à 16 segments.
5. Le questionnaire montre une seule affirmation en grand, cinq choix en cercles de tailles croissantes (grandes tailles aux extrémités), progression « Question 1 sur 120 », sans chronomètre.

## Palette

| Rôle | Valeur |
|---|---|
| Crème (fond) | `#FBF4E8` |
| Crème 2 (bandes) | `#F3E7D3` |
| Sable | `#E8D5B7` |
| Encre (texte) | `#2B2118` |
| Encre atténuée (texte secondaire, 5,8:1 minimum sur crème et sable) | `#5A4A3C` |
| Terre cuite (action, accent) | `#A63D22` (survol `#8C3019`) |
| Vert profond (bandes sombres) | `#1F4D3F` |
| Névrosisme | `#B4472A` |
| Extraversion | `#BF7A12` |
| Ouverture | `#7B4B94` |
| Agréabilité | `#2E7D5B` |
| Conscienciosité | `#2F6490` |

Les couleurs des cinq facteurs servent aux formes et aux jauges (contraste graphique d'au moins 3:1 sur crème) ; les textes restent en encre. Contrastes calculés à la main, à confirmer par un outil avant mise en production.

## Polices

- Titres latins : Fraunces (serif à axe optique, graisses 400 à 800, italique pour l'accent).
- Texte latin : Figtree.
- Arabe : Noto Naskh Arabic pour les titres, IBM Plex Sans Arabic pour le texte. Pages en `dir="rtl"`, propriétés logiques partout (`inline-size`, `inset-inline-start`, `padding-inline`, etc.).

## 21st.dev : ce qui a été utilisé

Limite du compte gratuit : 2 lectures de code par jour. Une seule avait été disponible pour cette session. Seul le code de `hero-05` a donc été lu intégralement ; les autres composants ont été retenus d'après leur description et leur aperçu, et la mise en page est réécrite à la main, pas copiée. À prendre en compte avant de parler de « composants adaptés » au client.

| Slug 21st.dev | Écran | Ce que cela apporte |
|---|---|---|
| `felipemenezes098/hero-05` (Editorial Hero, code lu) | Accueil FR et AR | Principe éditorial : titre serif en grand, texte d'appui et boutons sous le titre, grille 12 colonnes, retenue du texte à `text-balance`. Image remplacée par une fleur SVG. |
| `felipemenezes098/hero-04` (Editorial Collage Hero) | Accueil | Idée d'un visuel composé de formes superposées à droite du titre (devenu la fleur à cinq pétales avec deux étiquettes flottantes). |
| `shadcnui-blocks/progress-10` (Circular Progress with Custom Color) | Résultat | Anneau SVG à couleur et épaisseur réglables, repris en cinq anneaux concentriques. |
| `arihantcodes_1f7b8c4d/radial-chart` (Radial Chart) | Résultat | Barres radiales par catégorie, base du graphique « un anneau par trait ». |
| `ai2/radio-group-tone` (Group Tone Radio) | Questionnaire | Choix en cartes avec point de sélection animé et navigation au clavier ; devenu les cinq cercles de tailles croissantes, teintés selon le sens de la réponse. |
| `ruixen.ui/rating-scale-group` (Rating Scale Group) | Questionnaire | Échelle graduée en cases cliquables avec état actif marqué ; inspire la rangée de cinq choix avec fond et contour à l'état choisi. |
| `ln-dev7/bento-01` (Bento Feature Grid) | Accueil | Tuiles de fonctionnalités avec icône, titre et texte ; devenues les cinq cartes de facteurs (3 + 2 centrées). |
| `ln-dev7/header-17` (Classic Header with Sheet Menu) | En-tête | Navigation centrée, lien discret et bouton en pilule ; adapté en sélecteur de langue en pilule. |
| `efferd/minimal-footer` et `ln-dev7/footer-17` (Minimal Two-Column Footer) | Pied de page | Marque et mention à gauche, liens à droite, ligne de droits en bas. |

## Points forts

- Identité immédiatement reconnaissable (fleur à cinq pétales, anneaux, serif expressive), loin de la règle graduée beige.
- Un seul graphique à retenir, lisible aussi pour un lecteur qui ne connaît pas le modèle (liste et jauges à côté des anneaux).
- Texte conforme à `textes.md` : aucun « gratuit », « open source » ni « scientifiquement validé », aucun chiffre sans source, aucune promesse de confidentialité ; valeurs de résultat marquées « Exemple de restitution, valeurs fictives ».
- Cibles de 44 px minimum, focus visibles (contour vert épais), `prefers-reduced-motion` respecté, aucun débordement horizontal vérifié de 390 à 1440 px.

## Points faibles

- La fleur et les couleurs des facteurs sont des propositions : il n'existe pas de logo validé, le symbole de marque est un substitut.
- Les anneaux ne se comparent pas à l'œil aussi bien que des barres alignées (rayons différents) ; la liste de jauges compense.
- Cinq couleurs plus terre cuite plus vert font une palette dense ; sur les pages réelles il faudra tenir la discipline (couleur des facteurs réservée aux formes).
- Le questionnaire de 120 écrans en serif de grande taille est plus lent à parcourir qu'une page dense ; à tester sur téléphone avec de vrais participants.
- Fraunces est lourde (polices distantes) : prévoir l'auto-hébergement des polices dans l'application.
- Les noms français des facettes d'Extraversion (Cordialité, Grégarité, etc.) sont illustratifs, à aligner sur les libellés du paquet de résultats.
- Les arrondis, ombres pleines et grandes cartes demandent un travail Tailwind soigné pour être reproduits à l'identique ; les maquettes sont en CSS écrit à la main.
- Mesure du contraste faite par calcul, pas encore par audit automatisé.
