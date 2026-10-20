# Bases des deux rapports Tenga : rapport individuel et rapport de binôme

20 octobre 2026. Ébauche de conception : rien n'est codé, rien n'est généré. Les deux rapports de référence analysés ici sont un rapport « Premium » individuel (32 pages numérotées plus couverture) et un rapport de collaboration à deux personnes (11 pages numérotées plus couverture), édités par Talentobe sous la marque MyPrint, et datés de mai 2026.

**Ce qui empêche de reprendre ces rapports tels quels.** Deux tiers de leur contenu (11 motivations et 11 styles comportementaux) reposent sur des mesures que le questionnaire de Tenga ne contient pas, et leurs pourcentages et leur « potentiel de collaboration » supposent une norme de population que Tenga n'a pas (`voix-de-marque.md` § 2, principe 7). Ce document décrit donc ce qu'il faut garder de leur architecture, ce qu'il faut refuser, et ce que l'on peut construire de mieux sur les 30 facettes que Tenga mesure réellement.

Les décisions qui reviennent à Amine sont regroupées au § 9, chacune avec une recommandation.

## 1. Anatomie des deux documents

| Élément | Rapport Premium (1 personne) | Rapport de collaboration (2 personnes) |
|---|---|---|
| Volume | 32 pages numérotées | 11 pages numérotées, dont 4 sans analyse (introduction, sommaire, à propos, couverture) |
| Personnalité | 13 dimensions en 4 axes (S'exprimer 3, Appréhender 4, Oser 3, S'adapter 3), radar, une jauge bipolaire en pourcentage par dimension, une description et deux conseils par dimension (p. 3 à 11) | Radar superposé des 13 dimensions, symbole « = » sur la dimension la plus proche et « ≠ » sur la plus éloignée, deux similarités et deux différences développées (p. 4 à 6) |
| Motivations | 11 dimensions bipolaires (sur 22 besoins), échelle classée, deux puces « ce qui motive » et deux « ce qui peut décourager » par dimension (p. 12 à 18) | Deux échelles côte à côte, puis les deux besoins principaux de chaque personne (p. 7 et 8) |
| Comportements | 11 thématiques × 4 styles = 44 styles ; une matrice 2×2 par thématique, avec atouts, comportement privilégié, deux questions d'approfondissement (p. 19 à 31) | La liste des 11 thématiques avec le style de chacun (p. 9), deux matrices développées (p. 10) |
| Synthèse | Aucune | Trois jauges : traits partagés 8/13, motivations partagées 7/11, « potentiel de collaboration » 75 % (p. 3) |
| Plan d'action | Aucun | Aucun |

## 2. Rétro-ingénierie : ce qui produit ces rapports

La conclusion principale est que **ces rapports ne sont probablement pas écrits par un modèle de langage au moment de la génération** : ce sont des tables de règles et des bibliothèques de textes. Le « prompt » à reconstituer est donc une spécification, pas une consigne de rédaction. Les cinq indices suivants viennent des documents eux-mêmes.

1. **Le classement des motivations est la distance au pourcentage neutre.** Recalculé sur les 11 pourcentages du Premium (94, 89, 87, 75, 74, 73, 70, 58, 56, 54, 53), l'ordre obtenu en classant par écart à 50 est exactement celui de l'échelle de la page 12/32.
2. **Les textes sont des gabarits à accord de genre et de nombre.** « Il tend à saisir les opportunités risquées, dans la mesure où il s'attend souvent à une issue favorable » (Premium, p. 28) devient « Ils tendent à saisir… dans la mesure où ils s'attendent souvent… » (collaboration, p. 10). La phrase sur la réaction au changement (Premium p. 30, collaboration p. 10) suit le même passage au pluriel. Les étiquettes se déclinent aussi (« Parieuse » et « Parieur », « Résiliente » et « Résilient »).
3. **Les 11 matrices croisent une dimension de personnalité et une dimension de motivation**, ce que le document annonce (p. 19/32) et que les axes confirment : Dominance × Influence (communication), Estime de soi × Compétition (conflit), Perspective × Autonomie (décision), Rigueur × Défi personnel (travail), Empathie × Responsabilité (leadership), Structure × Reconnaissance (apprentissage), Pensée abstraite × Récompense (créativité), Optimisme × Excitation (risque), Extraversion × Relation (groupe), Persévérance × Nouveauté (changement), Esprit critique × Appartenance (règles). 11 thématiques × 4 quadrants = 44 styles ; 13 dimensions de personnalité et 22 besoins de motivation.
4. **Le texte suit le pôle dominant, avec une intensité lexicale qui semble suivre le score** (hypothèse, 13 valeurs seulement) : « très tranquille » à 81 %, « plutôt communicatif », « plutôt intuitif », « plutôt réaliste » entre 61 % et 64 %.
5. **Le rapport de collaboration est une mise en regard de deux rapports individuels**, pas une analyse du duo : mêmes gabarits, mêmes phrases, mise en commun quand deux personnes tombent dans la même case.

Ce que l'on ne peut pas reconstituer : la formule du « potentiel de collaboration » de 75 %, et la règle de choix des deux similarités et des deux différences développées. Ni l'une ni l'autre n'est publiée dans le document.

### Reconstitution de la spécification (à implanter, pas à demander à un modèle)

```
ENTRÉES   : score par dimension, 0 à 100, orienté vers un pôle nommé
RÈGLE 1   : pôle dominant = côté de 50 ; intensité = |score - 50|
RÈGLE 2   : classement = tri décroissant sur l'intensité
RÈGLE 3   : texte = bibliothèque[dimension][pôle] avec variantes de genre et de nombre
RÈGLE 4   : style comportemental = quadrant (dimension de personnalité × dimension de motivation)
RÈGLE 5   : binôme = même case => « partagé », sinon « différent »
SORTIE    : pages assemblées dans un ordre fixe
```

Cette spécification a une qualité (reproductibilité totale) et deux défauts (effet de seuil, absence de synthèse) que le § 3 détaille. Le § 7 en garde la qualité et corrige les défauts.

## 3. Faiblesses relevées, avec la preuve

| N° | Observation | Preuve dans les documents | Conséquence pour Tenga |
|---|---|---|---|
| F1 | Promesse de prédiction non fondée | Introduction : les résultats « permettent donc de prédire le comportement de ces personnes dans diverses situations » (p. 1/11 ; formulation identique au singulier, p. 1/32), et l'évaluation est « fiable et conforme aux théories psychologiques contemporaines », sans source | Le dossier de preuves dit l'inverse : validité de la conscienciosité de 0,19 à 0,25, et l'auteur de l'IPIP-NEO-120 écrit que l'outil ne devrait « probablement » pas servir à des décisions importantes sur des individus (`dossier-preuves.md` § 1). Tenga reprend les formulations de la page « Méthode et références », pas celles-ci |
| F2 | Score de compatibilité invérifiable | « Potentiel de collaboration 75 % », placé sous la rubrique « comportements » et décrit comme « synergie comportementale » (p. 3/11). À la lecture de la page 9, 5 styles sur 11 sont identiques ; la formule n'est pas publiée | Aucun score de compatibilité. Le dossier de preuves classe « la composition d'une équipe par la personnalité améliore la performance » en preuve partielle et hétérogène, et « renforce la cohésion » en pas de preuve trouvée |
| F3 | Effet de seuil : des étiquettes fermes tirées de scores proches du neutre | Sur les 11 styles du Premium, 6 reposent sur au moins une entrée à 10 points ou moins de 50 % (2 à 5 points ou moins : Style de travail 54 %, Groupe 53 %). Exemple : « il a un fort besoin d'appartenance » (p. 31/32) à partir de 58 %. Le document admet lui-même (p. 5/32 et 13/32) que ces cas sont « particulièrement susceptibles de nécessiter des informations supplémentaires » | Un style n'est affiché que si les deux entrées sont hors de la zone du milieu ; sinon « à explorer en entretien » |
| F4 | « Partagé » signifie « du même côté de 50 % » (hypothèse) | 8 traits partagés sur 13 (p. 3/11), mais 49 % et 51 % compteraient comme différents ; seuls 2 des 8 traits partagés et 2 des 5 écarts sont développés, sans règle de choix | Écart mesuré en points d'échelle, trois classes (proche, intermédiaire, notable), et toutes les différences notables sont traitées |
| F5 | Conseils tournés vers la personne, lecture de pensée, valence cachée | « Conseils pour travailler avec Med Amine » (p. 5 à 11) ; « pourrait penser que Bentara réagit de manière excessive » (p. 6/11) ; l'humilité (93 %) traitée comme un manque (« Aidez-le à voir les avantages à sortir de sa zone de confort », p. 10/32) malgré l'engagement « sans jugement » | Le dossier de preuves lit que le retour centré sur la personne est moins efficace que le retour centré sur la tâche (Kluger et DeNisi, 1996, d = 0,41 en moyenne, plus d'un tiers des interventions ayant réduit la performance). Tenga formule par situation de travail, jamais par jugement sur la personne |
| F6 | Description sans intégration | Aucune synthèse transversale, aucun plan d'action, aucune hiérarchie des priorités | C'est la première place où l'IA apporte quelque chose (§ 6) |
| F7 | Aucune incertitude dans le corps du rapport | Pas d'indice de cohérence des réponses ; une seule phrase sur une pertinence de 12 à 24 mois, sans source | Fiabilité de la lecture en page dédiée ; aucune durée de validité écrite tant qu'elle n'est pas sourcée |
| F8 | Propriété intellectuelle | « Ce rapport contient des éléments de propriété intellectuelle de Talentoday » (p. 11/11 et 32/32), marque MyPrint® | Aucun texte, aucun nom de style, aucune des 44 appellations ne sont repris. Les 13 dimensions, les 22 besoins et les matrices de croisement sont des constructions de l'éditeur : Tenga bâtit les siennes sur l'IPIP-NEO-120. Cette limite est un fait lu dans les documents, pas un avis juridique |

## 4. Ce que Tenga possède et ce qui lui manque

| Atout | Source dans le dépôt |
|---|---|
| 5 domaines, 30 facettes, 4 affirmations par facette, 120 au total | `dossier-preuves.md` (fiche Johnson 2014) |
| Scores stockés par l'application (moyennes sur 1 à 5) avec `questionnaire_version` et `calcul_version` | `supabase/migrations/0003_campagnes_passation_resultats.sql` |
| Règle : l'employeur ne voit jamais un résultat individuel ; seuil d'anonymat de 5 pour les agrégats | `conception-espace-prive.md` § 7, migration 0005 |
| Voix : vouvoiement, « décrire, ne jamais juger », jamais de comparaison avec la moyenne, pas de diagnostic | `voix-de-marque.md` § 2 |
| Dossier de preuves de 37 fiches, dont équipes (Peeters 2006, Bell 2007), leadership (Judge 2002), feedback (Kluger et DeNisi 1996) | `dossier-preuves.md` § 2 |
| Rendu PDF prévu au lot 6 (Gotenberg, arabe éprouvé d'abord) | `plan-implementation-espace-prive.md` ligne 168 |

| Manque | Conséquence |
|---|---|
| Aucune norme de population (IPIP : ni manuel d'interprétation ni norme) | Pas de pourcentage d'« inclination », pas de percentile, pas de « plus que la moyenne ». Le milieu de l'échelle (3 sur 5) est une convention de l'outil, pas un point d'équilibre entre personnes |
| Aucune mesure de motivation ni de comportement | Pas de pages « motivations » ni « styles comportementaux » honnêtes avec le seul questionnaire actuel (§ 9, D1) |
| Facettes de 4 affirmations seulement | Un décalage d'une affirmation déplace une facette de 6,25 points sur 100 ; les alphas des facettes vont de 0,63 à 0,88. L'affichage se fait par niveaux, jamais par pourcentage précis |
| Aucune étude d'invariance de mesure pour le Maroc | Limite à dire dans chaque rapport, en français comme en arabe |

## 5. Rapport 1 : le rapport individuel

Nom de travail, à décider par Tenga Conseil (§ 9, D6). Cible : 16 à 22 pages, en français et en arabe natifs, remis avec l'entretien de restitution.

| Page | Contenu | Production |
|---|---|---|
| Couverture | Nom, date, versions du questionnaire et du calcul | Déterministe |
| Lire ce rapport | Ce qu'il décrit, ce qu'il ne dit pas (ni aptitude, ni diagnostic, ni prédiction), limites sourcées, qui a reçu ce document | Texte fixe, relu par Tenga Conseil |
| Vue d'ensemble | Radar des 5 domaines, « ce qui ressort » (6 lignes), trois questions pour l'entretien | Règles, puis synthèse IA contrôlée |
| Cinq domaines (une page chacun) | Position sur l'échelle de vos réponses, 6 facettes en niveaux avec zone d'incertitude, « ce que cela peut apporter, ce que cela peut coûter » (double face, aucun jugement), à explorer | Bibliothèque + personnalisation IA contrôlée |
| Carte des 30 facettes | Une page, avec les tensions internes d'un domaine (par exemple une extraversion haute portée par l'affirmation de soi mais pas par la sociabilité) | Règles déterministes |
| Situations de travail | Réunion, urgence, désaccord, apprentissage, changement, décision : six situations dérivées des facettes, chacune étiquetée « hypothèse à confirmer » | Table facette vers situation + IA contrôlée |
| Ce que dit la recherche | Uniquement les liens sourcés (conscienciosité et performance 0,19 à 0,25, leadership, etc.) avec leur grandeur, et la phrase « cela ne dit rien de votre performance » | Textes tirés de la page Méthode, jamais générés |
| Fiabilité de cette lecture | Cohérence des réponses, durée de passation, réponses manquantes, limites (invariance non étudiée pour le Maroc) | Déterministe |
| Annexe consultant | Guide d'entretien : points à explorer, tensions, divergences possibles avec l'auto-perception ; remis ou non à la personne selon le consultant | IA contrôlée |
| Méthode | Lien vers la page « Méthode et références », glossaire | Fixe |

## 6. Rapport 2 : le rapport de binôme

Cible : 10 à 14 pages. Rapport entre deux personnes qui ont **toutes deux** donné un consentement explicite et révocable (§ 9, D2).

| Page | Contenu | Production |
|---|---|---|
| Lire ce rapport | Support de conversation, pas un verdict. Aucun score de compatibilité, avec la raison : aucune étude lue ne le fonde. Pas un outil de sélection ni de décision RH (engagement D7 de Tenga) | Texte fixe |
| Vue d'ensemble | Radar superposé des 5 domaines, trois phrases : ce qui vous rapproche, ce qui vous distingue, ce qui mérite une conversation | Règles + IA contrôlée |
| Carte des écarts | Les 30 facettes classées par écart, trois classes (proche, intermédiaire, notable), toutes les différences notables traitées | Déterministe |
| Points d'attention documentés | Écart de conscienciosité et agréabilité minimale, avec leur source (Peeters 2006, Bell 2007) et la mention « résultats au niveau d'équipes, non de binômes » | Textes tirés du dossier de preuves |
| Scénarios de collaboration | Quatre contextes choisis par le consultant ou le binôme : déroulé probable (hypothèse), friction possible, un geste utile pour chacun, une phrase d'ouverture | IA contrôlée |
| Pré-mortem et accords | Trois façons dont la collaboration pourrait se gripper et les signaux précoces ; trois accords à négocier, que le binôme modifie | IA contrôlée |
| Lectures croisées | « Il se peut que A lise tel comportement de B comme… » dans les deux sens, sans lecture de pensée et sans hiérarchie | IA contrôlée, auditée |
| Fiabilité | Fiabilité de chacun des deux profils, écarts inférieurs au bruit de mesure non rapportés | Déterministe |
| Méthode | Lien vers la page Méthode | Fixe |

## 7. Le moteur commun

### 7.1 Principes

Le calcul reste un script (réflexe déterministe d'abord) ; le modèle de langage n'intervient que pour intégrer et reformuler des faits déjà calculés, et son texte passe un audit avant d'entrer dans un rapport.

### 7.2 Chaîne de production

1. **Entrées.** `scores` par facette (moyenne de 4 affirmations, de 1 à 5), versions, langue. Aucun champ de genre n'est collecté : la bibliothèque est rédigée sans accord (vouvoiement et formulations épicènes en français, formes non genrées en arabe selon `voix-de-marque.md` § 2).
2. **Position.** `position = (moyenne - 1) / 4 × 100`, jamais affichée en pourcentage précis.
3. **Niveau.** Cinq niveaux : bas (moyenne de 1 à 2), plutôt bas (2 à 2,6), milieu (2,6 à 3,4), plutôt haut (3,4 à 4), haut (4 à 5). **Convention, à calibrer** dès qu'une norme de population existe ; la page du rapport dit « réponses proches du milieu de l'échelle », jamais « équilibré ».
4. **Écart de binôme.** Différence des moyennes de facette : proche si |Δ| ≤ 0,5, notable si |Δ| ≥ 1,0, intermédiaire entre les deux. **Convention à calibrer** (une affirmation d'écart sur une facette de 4 affirmations vaut 0,25).
5. **Fiabilité.** Indices calculés par script : réponses manquantes, durée de passation, régularité des paires d'affirmations de sens opposé (acquiescence). **Chaque indice doit être validé sur des données réelles avant d'être publié** : aucun n'est établi dans le dossier de preuves.
6. **Sélection.** Tri par écart au milieu, départage par ordre fixe des domaines. Aucune étiquette de style quand l'une des deux entrées est dans la zone du milieu (réponse à F3).
7. **Bibliothèque.** Un bloc de texte par (facette, niveau, langue), rédigé hors ligne avec un modèle puis relu par un humain, chacun portant un identifiant d'affirmation relié au dossier de preuves ou marqué « hypothèse ».
8. **Synthèse contrôlée.** Un modèle reçoit uniquement des faits et des identifiants de blocs, et rend un JSON conforme au schéma.
9. **Audit.** Contrôles déterministes (lexique interdit, chaque chiffre du texte présent dans les entrées, aucune comparaison avec une population, glossaire respecté, langue) puis un second modèle qui vérifie chaque phrase contre la liste des affirmations autorisées. Deux régénérations au plus ; au troisième échec, le rapport sort avec la bibliothèque seule : **un rapport n'est jamais bloqué, jamais dégradé en silence** (le mode de repli est indiqué dans la page « Fiabilité »).
10. **Rendu.** PDF par Gotenberg (lot 6), français et arabe, lecture de droite à gauche vérifiée en arabe.
11. **Traçabilité.** On conserve l'empreinte des entrées, les versions de la bibliothèque et des prompts, et l'identifiant du modèle, pour pouvoir rejouer un rapport.

### 7.3 Choix de modèle et données personnelles

Passerelle agnostique (LiteLLM de la plateforme), aucun modèle imposé : le modèle se choisit sur l'éval du § 8. Les scores de personnes sont des données personnelles : l'exécution se fait **sur un modèle auto-hébergé** par défaut ; tout appel à un fournisseur externe suppose une base juridique à instruire d'abord (règle max(RGPD, CNDP), à valider par Tenga Conseil, non tranchée ici).

### 7.4 Ce que l'IA apporte de plus tranchant

| Apport | Pourquoi les rapports de référence ne l'ont pas | Comment on le contrôle |
|---|---|---|
| Tensions internes entre facettes d'un même domaine | 13 dimensions contre 30 facettes : la différence est structurelle | Règle déterministe, aucune IA nécessaire pour la détecter ; l'IA ne fait que la reformuler |
| Guide d'entretien pour le consultant | Les rapports décrivent, personne ne prépare la conversation | Questions générées à partir des tensions et des écarts, audit de lexique |
| Scénarios et pré-mortem du binôme | Les rapports de collaboration comparent, ils n'anticipent pas | Étiquetés « hypothèse », centrés sur la tâche (F5) |
| Auditeur d'affirmations | Les rapports de référence affirment sans source (F1) | Second passage contre la liste d'affirmations autorisées |
| Entretien de restitution conversationnel (décision D3) | Un document fixe ne répond pas aux questions de la personne | Dialogue ancré sur les blocs du rapport, audit en temps réel, passage à un humain (§ 9 bis) |
| Bilingue natif | Traduction mot à mot incompatible avec `voix-de-marque.md` § 2, principe 3 | Rédaction directe en arabe, contrôle du sens par glossaire |
| Reproductibilité | Un texte généré qui change à chaque rendu est invérifiable | Versions et empreintes (étape 11) |

## 8. Prompts de départ

Ces textes sont des points de départ à évaluer, pas des versions arrêtées. Les valeurs entre crochets sont des variables.

### 8.1 Synthèse individuelle (exécution)

```
RÔLE
Tu rédiges, pour un rapport de personnalité du cabinet Tenga Conseil, la synthèse d'une
personne à partir de faits déjà calculés. Tu ne mesures rien, tu n'interprètes pas au-delà
des faits fournis.

LANGUE ET VOIX
Langue : [fr|ar]. En français : vouvoiement, phrases courtes, un message par phrase,
aucun point d'exclamation, aucun accord de genre (formulations épicènes). En arabe :
arabe littéral moderne rédigé directement, formes non genrées, chiffres occidentaux.
Registre descriptif : « vous tendez à », « plutôt », « il se peut que ».

CE QUE TU REÇOIS (JSON)
facettes[] : {code, libellé, niveau, position}, tensions[], blocs_autorisés[] {id, texte},
fiabilité {indices}, versions.

CE QUE TU PRODUIS (JSON conforme au schéma fourni)
ressort[] (6 phrases au plus), tensions_lues[], questions_entretien[] (3), hypothèses[]
(chacune avec l'identifiant du bloc dont elle dérive).

RÈGLES ABSOLUES
1. N'affirme que ce que contiennent les blocs autorisés ou les faits reçus. Si un fait
   manque, écris « non évalué ici ».
2. Chaque nombre de ta réponse doit figurer dans les faits reçus.
3. Ne compare jamais la personne à d'autres, à une moyenne ou à une norme.
4. N'emploie aucun de ces mots : moyenne, norme, percentile, meilleur, pire, bon score,
   mauvais score, faible, fort (sauf citation d'un bloc), diagnostic, trouble, aptitude,
   compétence, prédit, garantit, « vous êtes ».
5. Chaque phrase sur le travail est une hypothèse : ajoute « à confirmer en entretien ».
6. Aucun jugement de valeur sur un niveau, aucune lecture de pensée sur autrui.
7. Si l'indice de fiabilité est dégradé, commence par le dire et limite la synthèse.

EXEMPLE DE PHRASE ATTENDUE
« Vos réponses se situent plutôt haut sur l'affirmation de soi et plutôt bas sur la
sociabilité : à confirmer en entretien, cela peut faciliter la prise de parole en réunion
sans aller de pair avec un besoin de contacts nombreux. »
EXEMPLE DE PHRASE REFUSÉE
« Vous êtes un leader naturel, bien meilleur que la moyenne. »
```

### 8.2 Synthèse de binôme (écarts avec 8.1)

```
Reçoit en plus : écarts[] {facette, niveauA, niveauB, delta, classe}, points_documentés[]
{id, texte, portée: "niveau équipe"}, contexte_scénario (choisi par le consultant).
Produit : rapprochements[] (5 au plus), écarts_notables[] (tous), scénarios[] (un par
contexte : déroulé, friction, geste pour chacun, phrase d'ouverture), pré_mortem[] (3),
accords[] (3, modifiables).
Règles ajoutées :
- Aucun score de compatibilité, aucun pourcentage de « synergie ».
- Chaque conseil porte sur une situation ou une tâche, jamais sur un jugement de la personne.
- Toute lecture croisée s'écrit « il se peut que X lise ce comportement comme… », dans les
  deux sens, avec la même longueur et le même ton.
- Tout point documenté est cité avec sa portée « résultats au niveau d'équipes ».
```

### 8.3 Rédaction de la bibliothèque (hors ligne, relue par un humain)

```
Pour la facette [code] au niveau [niveau], rédige trois blocs : description (2 phrases),
« ce que cela peut apporter » (2 puces), « ce que cela peut coûter » (2 puces),
et une question d'exploration. Voix, lexique interdit et règles 3 à 6 du § 8.1.
Chaque bloc porte un champ source : identifiant de fiche du dossier de preuves, ou
« hypothèse » si aucun support. N'invente aucun nombre. Rends un JSON, une entrée par bloc.
```

### 8.4 Auditeur d'affirmations

```
Tu reçois un texte et la liste des affirmations autorisées (identifiants et textes).
Pour chaque phrase du texte, réponds : couverte par l'identifiant X, ou NON COUVERTE avec
la raison. Signale aussi toute comparaison avec une population, tout jugement de valeur
et tout mot du lexique interdit. Rends un JSON ; ne réécris rien.
```

## 9. Décisions qui reviennent à Amine

État au 20 octobre 2026 : Amine a confirmé les six décisions D1 à D6, après lecture du document. D3 est précisée par deux packs (§ 9 bis). Les conventions de D4 restent à valider par un psychométricien : la confirmation vaut accord sur la démarche, pas validation des seuils.

| N° | Décision | Recommandation | Raison |
|---|---|---|---|
| D1 | Motivations et styles comportementaux | Ne pas les produire avec le questionnaire actuel ; couvrir le besoin par les « situations de travail » (hypothèses dérivées des facettes). Instruire à part l'ajout d'un instrument de motivation (sources, droits d'usage, validation en arabe et en français) | Les inventer à partir de facettes serait de la fausse mesure ; l'ajout d'un instrument est une décision d'offre |
| D2 | Consentement du binôme | Double consentement explicite, révocable, limité aux deux personnes et au consultant, sans copie à l'employeur, durée de conservation fixée | Cohérent avec la règle « l'employeur ne voit jamais un résultat individuel » ; à faire valider juridiquement (RGPD et CNDP) |
| D3 | Qui conduit l'entretien de restitution | **Décidé par Amine le 20 octobre 2026** : deux packs. Pack A : retour personnalisé de Nezha Bentara, préparé et assisté en arrière-plan par un avatar. Pack B : entretien conduit par l'avatar entraîné par Nezha. Cadrage au § 9 bis | Le retour centré sur la personne est moins efficace sans cadrage (Kluger et DeNisi 1996). Le dossier de preuves ne contient aucune étude sur une restitution conduite par une IA : le bénéfice attendu du pack B (disponibilité, coût) est une hypothèse, à mesurer pendant un pilote |
| D4 | Conventions de niveaux et d'écarts | Les valider par un psychométricien, puis les recalibrer dès qu'une norme existe | Les seuils du § 7.2 sont des conventions, pas des résultats |
| D5 | Place dans l'offre commerciale, prix, positionnement | Ne rien figer avant D1 à D3 | Décision d'Amine ; ce document ne la prend pas |
| D6 | Noms des deux rapports | À proposer par Tenga Conseil | Identité de marque ; éviter tout rapprochement avec MyPrint |

Ces rapports s'insèrent dans le plan existant comme une suite du lot 4 (groupes) et du lot 6 (rendu PDF), plus une migration de consentement propre au binôme. Leur numérotation reste à inscrire dans `plan-implementation-espace-prive.md` après vos décisions.

## 9 bis. Restitution : deux packs et leur cadrage

Décision d'Amine du 20 octobre 2026.

| | Pack A : retour personnalisé de Nezha, assistée par l'avatar | Pack B : entretien par l'avatar entraîné par Nezha |
|---|---|---|
| Qui parle à la personne | Nezha Bentara elle-même | Un avatar, entraîné sur son approche |
| Rôle de l'IA | Prépare le guide d'entretien, les tensions à explorer, les questions, un brouillon de compte rendu : l'annexe consultant du § 5, en arrière-plan | Conduit le dialogue, à partir du rapport |
| Ce que la personne voit | Un entretien avec une consultante, et un compte rendu validé par elle | Un assistant conversationnel, étiqueté comme tel |
| Capacité | Limitée par le temps de Nezha ; l'assistance réduit sa préparation, sans que ce document en chiffre le gain | Non limitée par une personne, limitée par la qualité du dialogue |
| Textes `upcoming` (« un consultant Tenga ») | Restent exacts | À remplacer par une formulation propre au pack B |

Le tarif, le nom et la présentation commerciale des deux packs relèvent de D5 et ne sont pas traités ici. Les deux packs doivent être présentés comme deux prestations différentes, sans suggérer que le pack B est un entretien avec Nezha.

**Les cinq conditions.** Elles pèsent surtout sur le pack B ; le tableau indique ce qui s'applique au pack A.

| N° | Condition | Recommandation | Pack A |
|---|---|---|---|
| C1 | Accord de Nezha | Consentement écrit et révocable pour son image, sa voix et sa manière de conduire un entretien, avec le périmètre (usages, durée). Il n'est pas acquis par la décision d'Amine : il reste à obtenir d'elle | Accord sur l'entraînement de l'assistant à partir de son approche |
| C2 | Transparence | La personne sait dès le premier écran qu'elle parle à une IA. Recommandation : « Assistant Tenga, entraîné sur l'approche de Nezha Bentara » plutôt que « Nezha ». Sans cela, la personne croit confier ses résultats à une personne identifiée et le texte de confiance de la voix de marque cesse d'être exact | La personne est informée que l'IA a préparé l'entretien |
| C3 | Ancrage | Le dialogue ne parle qu'à partir des blocs du rapport et des faits calculés. Le même audit que pour les rapports (lexique interdit, chaque nombre présent dans les entrées, aucune comparaison avec une population) s'applique en temps réel. Aucune improvisation sur la santé, l'aptitude ou une décision d'emploi | Le brouillon passe le même audit et Nezha le valide avant remise |
| C4 | Passage à un humain | Bouton permanent, et déclenchement automatique sur des signaux de détresse, avec un consultant humain joignable dans un délai annoncé. La mention « ce n'est pas un diagnostic » ne suffit pas, en particulier pour le névrosisme | Acquis par construction |
| C5 | Données | La voix, l'image et les transcriptions sont des données personnelles : hébergement auto-hébergé, durée de conservation fixée, suppression de la transcription possible par la personne. La plateforme voix de Dīwān permet de cloner une voix déposée sur Sawt, piste à instruire pour la voix. Aucune solution souveraine d'avatar animé n'a été inventoriée ici : elle est à inventorier avant de promettre une image | S'applique aux notes et brouillons conservés |

**Ordre recommandé.** Le pack A n'a besoin que de l'annexe consultant et de C1 pour l'assistance : il peut précéder le pack B. Le pack B attend C1 à C5 et un pilote qui mesure la qualité du dialogue contre le pack A, puisque le dossier de preuves ne dit rien d'une restitution conduite par une IA.

Ces conditions sont des recommandations d'encadrement, pas un avis juridique : le droit à l'image et à la voix, l'information de la personne sur l'usage d'une IA et la base légale du traitement sont à faire instruire par Tenga Conseil avant le pilote.

## 10. Étapes suivantes sans rien décider

1. Rédiger la bibliothèque de textes pour une seule facette par domaine (5 facettes) et la faire relire, pour tester le gabarit avant de produire les 30.
2. Construire le jeu d'évaluation : 12 profils synthétiques (extrêmes, milieu, tension interne, réponses manquantes, incohérence) et 6 binômes (proches, opposés, tous au milieu, un profil peu fiable).
3. Écrire les contrôles déterministes de l'audit, puis les désactiver un à un pour vérifier qu'au moins un test échoue (la pratique « vu rouge » du plan).
4. Choisir le modèle sur cette éval, pas sur sa réputation.
5. Obtenir l'accord écrit de Nezha (C1), puis outiller le pack A (annexe consultant), avant d'ouvrir le chantier de l'avatar du pack B.
