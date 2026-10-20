# Proposition B : produit moderne et vivant

Maquettes statiques (HTML et CSS écrits à la main, aucune dépendance sauf les polices Google Fonts, aucun serveur). Pages : `accueil.html`, `accueil-ar.html`, `questionnaire.html`, `resultat.html`, `resultat-ar.html`. Captures dans `captures/` (`<page>-1440.png`, `<page>-390.png`, plus `resultat-sombre-1440.png`).

## L'idée en cinq lignes
1. Le radar à cinq axes remplace la règle graduée : c'est la forme du profil, visible dès l'accueil, qui porte l'identité.
2. Une grille bento de cartes à dégradés doux et ombres fines, au lieu d'une page de texte sur fond beige.
3. Deux couleurs franches (indigo et corail), plus une teinte par domaine (violet, corail, indigo, turquoise, ambre) reprise dans les barres, les pastilles et les onglets.
4. Réponses en grosses pastilles tactiles (44 px de hauteur minimale, cercle d'autant plus grand que la réponse est tranchée), progression « Question 1 sur 120 », aucun chronomètre.
5. Langue (FR, AR, EN) et thème clair ou sombre toujours visibles dans l'en-tête ; arabe en `dir="rtl"` avec propriétés logiques.

## Palette
| Rôle | Clair | Sombre |
|---|---|---|
| Fond | `#F5F5FB` | `#0C0D1E` |
| Surface | `#FFFFFF` | `#16172D` |
| Texte | `#14152B` | `#F2F2FF` |
| Texte secondaire | `#4E516D` | `#AEB1D0` |
| Bouton et accent indigo | `#4F52E3` (texte blanc, 5,8 pour 1) | idem ; liens et accents `#A9ACFF` |
| Indigo de marque | `#4338CA` | `#A9ACFF` |
| Corail (décor) | `#FF6B57` | `#FF6B57` |
| Corail texte | `#B5361E` | `#FF9C8D` |
| Domaines N, E, O, A, C | `#8B5CF6`, `#FF6B57`, `#4F52E3`, `#14B8A6`, `#F59E0B` | identiques |

Les rapports de contraste ci-dessus pour le bouton et le texte principal sont calculés à la main ; aucun outil automatique de contrôle (axe, Lighthouse) n'a été passé : à faire avant toute reprise.

## Polices
Plus Jakarta Sans (latin, graisses 400 à 800) et IBM Plex Sans Arabic (arabe, 400 à 700), chargées depuis Google Fonts. Hors ligne, repli sur les polices système.

## 21st.dev : ce qui a réellement été utilisé
Recherches faites avec `search` et `get_inspiration` (une quinzaine de composants repérés). **Limite à signaler : le quota quotidien de `get_component` (2 lectures de code par jour) était déjà épuisé au moment du travail ; le code source d'aucun composant n'a donc pu être lu.** J'ai lu les images d'aperçu de trois d'entre eux (marqués ci-dessous) et m'en suis tenu aux descriptions du catalogue pour les autres. Les composants sont réécrits en CSS pur, pas copiés. Slugs et apports :

| Écran | Slug 21st.dev (id) | Ce que cela apporte | Source consultée |
|---|---|---|---|
| Accueil, bento | `tommyjepsen/feature-section-with-bento-grid` (1327) | Disposition de cartes de largeurs inégales, pastille de section, titre large | aperçu lu |
| Accueil, bento | `ln-dev7/bento-01` (26901) | Principe de tuiles icône, titre, texte | description seule |
| Accueil, hero | `componentry/gradient-hero-01` (31116) | Fond en dégradé chaud, pastille d'annonce, titre massif, deux boutons | description seule |
| Accueil et résultat, radar | `sean0205/c-chart-24` (30666) | Radar dans une carte arrondie, contour lumineux, remplissage en dégradé, sommets cerclés | aperçu lu |
| Accueil et résultat, radar | `arihantcodes_1f7b8c4d/radar-chart` (29837) | Animation d'apparition du radar, halo | description seule |
| Questionnaire, réponses | `ruixen.ui/rating-scale-group` (8241) | Rangée de choix en boîtes arrondies, survol, sélection marquée par un point de couleur | aperçu lu |
| Résultat, barres des facettes | `lavikatiyar/progress-card` (7793) et `shadcnspace/progress-03` (19138) | Barres de progression colorées avec remplissage animé à l'entrée | description seule |
| En-tête, langue | `samsiavoshian2009/language-selector-dropdown` (7450) | Sélecteur de langue compact ; transformé en trois boutons visibles faute de place pour un menu | description seule |
| Pied de page | `arihantcodes_1f7b8c4d/footer-section` (1520) | Pied simple avec liens | description seule |

## Contenu
Textes repris de `textes.md` et `voix-de-marque.md` (titre, sous-titre, cartes, note d'invitation, référence IPIP, lexique des domaines et des facettes, consigne du questionnaire, introduction du résultat). Ni « gratuit », ni « open source », ni « validé », ni chiffre sans source (le seul chiffre est le nombre d'affirmations, 120), ni promesse de confidentialité. Les cinq libellés de réponse suivent la demande (« Fortement en désaccord » à « Fortement en accord »), alors que `textes.md` § 3.3 propose une autre échelle : décision à prendre. Les scores du résultat sont fictifs et signalés par une pastille « Exemple de restitution, valeurs fictives » ; les échelles (domaines 24 à 120, facettes 4 à 20) sont celles de l'IPIP-NEO-120 mais à confirmer contre le calcul réel du produit. Les définitions courtes des domaines et la formulation arabe de certains libellés (« السعي إلى الإنجاز », etc.) viennent du lexique du dossier ; les phrases de définition en arabe sont de moi et demandent une relecture par un locuteur natif.

## Points forts
- Personnalité immédiate : le radar et le bento donnent à l'accueil un caractère de produit récent.
- Le radar est lisible en un coup d'oeil et réutilisé tel quel sur la page de résultat.
- Pastilles de réponse très confortables au pouce ; sélection visible par la couleur, la bordure et la coche, pas par la couleur seule.
- Thème sombre complet, focus visible, mouvement coupé sous `prefers-reduced-motion`, aucun débordement horizontal vérifié à 390, 768, 1000, 1100, 1239 et 1440 px.
- Page de résultat interactive : un clic sur un domaine affiche ses six facettes.

## Points faibles
- Moins austère mais plus « SaaS générique » : indigo et dégradés sont très répandus ; le Maroc n'apparaît que par la langue et le contenu, pas par la forme.
- Le dégradé indigo vers corail dans les titres est une signature d'époque qui vieillira vite.
- Cinq couleurs de domaine plus deux d'accent : riche, mais à surveiller pour rester sobre devant un dirigeant ou une direction des ressources humaines ; les barres ambre et turquoise ont un contraste de 3 pour 1 non vérifié face à leur rail (la valeur chiffrée est toujours écrite à côté).
- Le radar, avec la forme d'un « portrait », invite à comparer des profils et à voir un « bon » ou un « mauvais » contour ; à discuter au regard du lexique de marque (aucun jugement de valeur, aucune norme de population).
- Radar avec codes N, E, O, A, C plutôt que noms entiers, pour rester lisible à 390 px ; les noms sont dans la liste voisine.
- Polices chargées depuis un service tiers : à héberger soi-même en production (RGPD).
- Le sélecteur EN pointe vers `#` : la version anglaise n'est pas maquettée. Pas de menu mobile : la navigation est masquée sous 1240 px.
- Maquettes statiques : pas de logique de test réelle (trois questions bouclent seulement pour la démonstration).
