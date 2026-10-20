# Direction B2 : produit moderne, un seul accent

Affinage de la direction B après le retour du client (« trop old school » sur A, B retenue). Cinq pages HTML autonomes (CSS et JavaScript en ligne, aucune dépendance hors polices Google Fonts) : `accueil.html`, `accueil-ar.html`, `questionnaire.html`, `resultat.html`, `resultat-ar.html`. Captures dans `captures/` (1440 et 390 px, thème clair, plus `resultat-sombre-1440.png` obtenue en cliquant sur le bouton de bascule). Le dossier `B` et `web/` n'ont pas été modifiés.

## L'idée

Un produit sobre qui sent le logiciel récent : une seule couleur de marque, du neutre partout ailleurs, de grands chiffres, des cartes à rayon généreux, des ombres fines et beaucoup d'air. Le signal « moderne » vient de la mise en page et du mouvement, pas d'effets : le radar se trace à l'apparition (contour dessiné, puis remplissage, puis marqueurs un à un), les barres se remplissent depuis le bord de début de ligne, et une grille de points discrète s'estompe derrière l'en-tête de l'accueil. Aucune prétention que le test soit piloté par une IA, ni robot, ni cerveau lumineux.

## Palette (hexadécimal)

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#F6F6FA` | `#0C0D1B` |
| Surface (cartes) | `#FFFFFF` | `#14152A` |
| Surface 2 | `#EFEFF8` | `#1B1C36` |
| Texte | `#121328` | `#F0F0FB` |
| Texte secondaire | `#4A4D68` | `#A8ABC8` |
| Filet décoratif | `#DCDDEB` | `#2A2C4A` |
| Bordure de contrôle | `#7A7D9B` | `#7B7EA8` |
| Accent (indigo profond) | `#3730A3` | `#9EA1FF` |
| Accent survol | `#2B2582` | `#B8BAFF` |
| Texte sur accent | `#FFFFFF` | `#0C0D1B` |
| Teinte d'accent (fonds doux) | `#ECECFB` | `#23254B` |
| Piste des barres | `#E3E4F0` | `#292B4A` |

Choix de l'indigo : continuité avec B, que le client a retenue, et sobriété. Les deux thèmes reposent sur le même jeu de variables CSS (`:root` et `:root[data-theme=dark]`) ; le bouton de bascule fonctionne (vérifié : `light` vers `dark`) et le choix est mémorisé.

## Polices

Plus Jakarta Sans (latin, graisses 400 à 800) et IBM Plex Sans Arabic (arabe, 400 à 700), chargées depuis Google Fonts. Chiffres tabulaires pour les scores ; chiffres occidentaux partout, y compris en arabe.

## Ce qui change par rapport à B, et pourquoi

1. Dégradé indigo vers corail et titres bicolores supprimés ; un seul accent et du neutre. Demande du client sur le « old school » et lisibilité accrue.
2. Les cinq domaines ne se distinguent plus par cinq couleurs mais par la **forme** (cercle, carré, triangle, losange, hexagone), le **numéro** (01 à 05), l'étiquette et l'ordre. Ces formes sont reprises sur les marqueurs du radar, dans la liste et dans les onglets.
3. Radar : libellés complets (Névrosisme, Extraversion, Ouverture, Agréabilité, Conscienciosité ; العُصابية، الانبساطية، الانفتاح، المقبولية، يقظة الضمير), valeur numérique à côté de chaque axe, aucune coupure (contrôlé sur les captures), tracé plein de 3,5 px avec marqueurs, remplissage translucide en complément seulement. Alternative textuelle : titre et description SVG, plus un tableau visuellement masqué. Une variante dédiée aux écrans de moins de 640 px place les libellés autour du polygone avec une taille de texte plus grande, pour rester lisible à 390 px.
4. Questionnaire : cinq choix de même poids (plus de couleur par option) ; sélection signalée par une coche pleine, une bordure de 3 px et un fond teinté, donc lisible sans la couleur ; cibles de 64 px de haut minimum (148 px en grille) ; focus clavier à anneau de 3 px ; touches 1 à 5 ; « Question n sur 120 » et « Aucune limite de temps ». Sous 640 px, les choix passent en lignes pleine largeur.
5. Accueil : retrait de « Adapté au Maroc », « Fondé sur la recherche », de la phrase sur « les organisations qu'il accompagne » et de la note d'invitation personnelle (non validées). Ne restent que des faits : 120 affirmations, 5 domaines, 30 facettes, sans limite de temps, trois langues, IPIP-NEO-120 de John A. Johnson (2014), domaine public, avec lien vers ipip.ori.org. Aucun « gratuit », « open source », « scientifiquement validé », aucune promesse de confidentialité, aucun chiffre non sourcé. Le titre devient « Votre personnalité, lue en cinq dimensions », descriptif et non promesse.
6. Arabe : propriétés logiques partout (`inline-size`, `margin-inline`, `inset-inline-start`…), radar dessiné en miroir (ordre des axes inversé), barres animées en `inline-size` donc remplies depuis le bord de début (droite en arabe), flèches retournées, chiffres occidentaux.
7. Mouvement : `prefers-reduced-motion` coupe toutes les animations et transitions.
8. En-tête : sous 1240 px, menu natif `<details>` sans JavaScript ; langue et thème restent visibles ; aucun débordement horizontal à 390 px (mesuré, 0 sur les dix captures).

## Contrastes (calculés, formule WCAG)

Texte, seuil 4,5 pour 1. Clair / sombre : texte sur fond 16,95 / 17,04 ; texte sur surface 18,27 / 15,86 ; texte secondaire sur surface 8,23 / 7,97 (sur surface 2 : 7,20 / 7,37) ; accent en texte sur fond 9,21 / 8,26 ; accent sur teinte douce 8,49 / 6,26 ; texte sur bouton accent 9,93 / 8,26 (survol 12,43 / 10,57) ; texte sur choix coché 15,62 / 12,91.

Éléments graphiques, seuil 3 pour 1. Contour du radar et remplissage des barres sur surface 9,93 / 7,69 ; barre sur sa piste 7,86 / 5,85 ; bordure des choix sur surface 4,01 / 4,61 (sur fond 3,72 / 4,95).

Exception assumée : les anneaux et axes de la grille du radar (`#C9CBE0` / `#3A3D63`) valent 1,60 / 1,73 sur la surface. Ils sont décoratifs, toute l'information est portée par les valeurs écrites à chaque axe et par la liste ; à relever si vous voulez qu'ils comptent comme information.

## Limites honnêtes

- Mockups statiques : le questionnaire ne contient que trois affirmations d'exemple ; la progression affiche 1 sur 120 sans parcourir les 120. Les valeurs des résultats sont fictives, et signalées comme telles.
- Le bouton EN est inactif (aucune version anglaise dessinée) ; le questionnaire n'existe qu'en français ; depuis lui, le sélecteur AR renvoie à l'accueil arabe.
- Les captures sont prises thème clair, à 1440 et 390 px ; le thème sombre n'est capturé que pour la page de résultat en 1440 px. L'arabe n'a pas été relu par un locuteur natif (textes repris de B, plus quelques titres nouveaux à faire valider).
- Aucun test avec un lecteur d'écran réel, seulement la structure (rôles, titre et description du radar, tableau masqué).
- Les polices dépendent de Google Fonts ; hors ligne, repli sur les polices système.
- Les libellés des facettes et les descriptions de domaine viennent de B et n'ont pas été revalidés ici. Les liens « Confidentialité », « À propos » et « Questions fréquentes » du pied de page sont des ancres vides.
- Le choix de l'indigo est une proposition ; l'émeraude vif reste possible en changeant seulement les variables d'accent, en revérifiant les contrastes.
