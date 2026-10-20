# Proposition C : conseil premium, sombre et assuré

20 octobre 2026. Maquettes statiques, aucune modification de `web/` ni du dépôt. Pages : `accueil.html`, `accueil-ar.html`, `questionnaire.html` (variante claire), `resultat.html`, `resultat-ar.html`. Captures pleine page à 1440 et 390 px dans `captures/` (`<page>-<largeur>.png`).

## L'idée en cinq lignes

1. Un rapport de cabinet qui se lit à la lumière d'une lampe : fond bleu nuit presque noir, un seul accent cuivre, jamais de dégradé criard.
2. Des titres en serif élégante (Playfair Display) face à une sans sobre (Hanken Grotesk), des filets fins pour tout séparer, aucune carte arrondie.
3. Les grands chiffres portent l'identité : 120, 5, 30 à l'accueil ; chaque score en gros numéral serif dans la restitution.
4. Le graphique de résultat est une règle graduée par domaine : trait cuivre fin, échelle 24 à 120 avec quadrillage, repère clair du milieu (72, soit 3 sur 5). Jamais le mot « moyenne », conformément à `voix-de-marque.md` § 2.7.
5. Le questionnaire passe en clair (fond ivoire, mêmes accents) pour la lecture longue ; l'en-tête reste nuit pour garder la continuité.

## Palette (valeurs hexadécimales, contrastes calculés selon la formule WCAG 2.2)

| Rôle | Sombre | Clair |
|---|---|---|
| Fond | `#0A1318` | `#F6F2EA` |
| Surface | `#101C23` | `#FFFFFF` |
| Surface relevée | `#15242C` | `#EFE4D3` |
| Filet décoratif | `#25353D` | `#D9D1C3` |
| Contour de contrôle | `#62767F` | `#66767E` |
| Texte principal | `#F1EBE0` (15,81) | `#12202A` (14,86) |
| Texte secondaire | `#BCC6CB` (10,79) | `#3F4E57` (7,71) |
| Texte tertiaire | `#95A4AB` (7,31 sur fond, 6,74 sur surface) | `#586870` (5,18 sur fond, 5,79 sur surface) |
| Accent cuivre | `#D4A373` (8,30) | `#8A5628` (5,46) |
| Accent survol | `#E6BE93` | `#6E4219` |
| Texte sur accent | `#1A1006` (8,29) | `#FFFFFF` |

Contours de contrôle : 3,95 (sombre, sur fond) et 4,21 (clair, sur fond), au-dessus du seuil de 3 du critère 1.4.11. Le texte tertiaire reste au-dessus de 4,5 sur les deux fonds principaux, y compris en sombre. Seul le texte tertiaire sur surface relevée claire (`#EFE4D3`) tombe à 4,60 : limite, à surveiller si on y met du petit texte.

## Polices

- Titres latins : Playfair Display (400, 500, italique 400 et 500), chiffres en `lnum` et `tnum`.
- Texte et interface latins : Hanken Grotesk (400 à 700).
- Arabe, titres : Noto Naskh Arabic (500 à 700) ; arabe, texte : IBM Plex Sans Arabic (400 à 700).
- Chargement par Google Fonts dans la maquette. Pour l'implémentation : `next/font/google` (fichiers servis par l'application), comme le prévoit `direction.md` § 4.1.

## 21st.dev : ce qui a été consulté, et une limite à connaître

Le quota gratuit de lecture de code (2 par jour, `retrieval_limit_reached`, réinitialisation le 21/10/2026 à 00:00) était déjà consommé quand j'ai voulu lire le code de `hero-01`, `bar-chart`, `a11y-radio` et `footer-17`. **Aucun code 21st.dev n'a donc été lu ni copié pour cette proposition** : les composants sont réécrits à la main (HTML et CSS) à partir des fiches de recherche (description, aperçu). Deux aperçus ont été regardés en image (`hero-01`, `c-chart-24`) ; les autres reposent sur leur descriptif seul. À relire avec le code réel après réinitialisation du quota si l'on retient cette direction.

| Slug (id) | Écran | Ce que ça apporte | Source de ma lecture |
|---|---|---|---|
| `@felipemenezes098/hero-01` (19066), Centered Serif Hero | Accueil, hero | Le parti pris d'un titre serif très grand, sans fioriture, bouton plein ; je l'ai assombri, aligné à gauche et accompagné d'un spécimen | Aperçu vu |
| `@sean0205/c-chart-24` (30666), Radar Score Chart | Résultat | Étudié puis écarté : le polaire coupe les libellés (« Reliabil », « Scalabi » sur l'aperçu) et n'a pas d'équivalent texte ; gardé l'idée de la grille en anneaux, reprise en motif décoratif derrière l'accueil | Aperçu vu |
| `@kevingirelli/bar-chart` (35239), Bar Chart | Résultat | Barres horizontales accessibles, navigation clavier, libellé de valeur : base de la règle graduée | Descriptif |
| `@a11ypros/a11y-radio` (34672), Accessible Radio Group | Questionnaire | Groupe `fieldset` et légende, état d'aide, ARIA complet : structure `fieldset` + `legend` des cinq choix | Descriptif |
| `@ruixen.ui/rating-scale-group` (8241), Rating Scale Group | Questionnaire | Choix numérotés, état coché très visible ; transposé en lignes pleine largeur avec le numéro 1 à 5 à droite | Descriptif |
| `@mohitsapat/navbar` (32097), NavBar | En-tête | Ordre marque, liens, sélecteur de langue ; on garde, on retire le bouton GitHub | Descriptif |
| `@ln-dev7/footer-17` (26908), Minimal Two-Column Footer | Pied de page | Marque et phrase d'un côté, liens de l'autre, copyright sur une ligne | Descriptif |

## Points forts

- Du caractère immédiat : on ne confond plus ce site avec une application grand public. Le cuivre sur nuit donne l'allure d'un rapport de cabinet.
- Le graphique est lisible sans couleur (valeur écrite, qualificatif en toutes lettres, repère du milieu), retourné proprement en arabe par propriétés logiques seulement, sans bibliothèque.
- Cibles de 44 px ou plus mesurées par script sur les dix captures (aucune cible interactive en dessous), aucun débordement horizontal à 390 ni à 1440 px, focus visible cuivre en deux pixels.
- Aucun chiffre non sourcé : 120, 5 et 30 sont des faits de l'instrument (IPIP-NEO-120, 30 facettes). Pas de « gratuit », pas de promesse de confidentialité ; valeurs d'exemple marquées « Exemple de restitution, valeurs fictives » sur chaque écran qui en montre.

## Points faibles, honnêtement

- **Risque d'austérité inversée** : sombre et cuivre, c'est le code du luxe et de la finance. Pour des collaborateurs qui passent un questionnaire à contrecœur, c'est peut-être trop solennel. La variante claire du questionnaire atténue, mais l'accueil reste intimidant. À tester auprès de participants réels, pas seulement du client.
- **Écart avec `direction.md`** : cette direction remplace le vert cèdre par le cuivre, Instrument Sans par Playfair + Hanken, et réintroduit une serif (écartée au § 2 comme « signature la plus fréquente » pour le fond crème ; ici c'est sur fond nuit, mais le risque de cliché « conseil » existe). Aucune charte Tenga n'étant connue, rien ne vient trancher.
- **Le serif arabe** (Noto Naskh Arabic) pour les titres donne de la tenue mais se marie moins bien avec les chiffres latins en Playfair que le reste de la page ; à regarder de près avec un lecteur natif.
- **Dépendance à Google Fonts** dans les maquettes ; en production, passer par `next/font`.
- **Maquette seulement** : navigation mobile réduite à une rangée de liens, sélecteur de langue limité à FR et arabe (l'anglais n'est pas dessiné), un seul domaine détaillé (Extraversion), textes de description écrits pour la maquette et signalés comme tels. Le thème clair n'existe que pour le questionnaire ; un bouton de bascule reste à concevoir.
- **Contrastes à recalculer** si Tenga impose une couleur de marque (le cuivre clair `#8A5628` est déjà proche de la limite sur fond ivoire).
- Pas de tracé animé de la règle (maquette statique) ; à ajouter comme le décrit `direction.md` § 6 si la direction est retenue.
