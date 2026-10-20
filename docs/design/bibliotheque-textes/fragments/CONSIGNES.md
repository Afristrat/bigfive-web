# Consignes d'écriture d'un fragment de bibliothèque (français seul)

Tu écris `fragments/<D>.json` (D = N, E, O, A ou C) : les 5 facettes MANQUANTES du domaine D, 5 niveaux chacune. Les 5 facettes déjà écrites (N6, E3, O5, A4, C5) sont dans `facettes-pilote.json` (partie `fr`) : lis-les en entier avant d'écrire, elles fixent le ton, la longueur, la structure et ce que tu dois imiter. Les quatre affirmations réelles de chaque facette sont dans `fragments/affirmations.json` (champ `affirmations_fr`, à recopier à l'identique).

## Forme du fichier

```
{ "facettes": [ {
  "code": "N1", "domaine": "N",
  "libelle": {"fr": "<libellé descriptif exact, court>"},
  "libelle_plateforme": "<titre actuel dans l'application, champ titre_plateforme>",
  "affirmations_fr": [ {"texte": "...", "cotation": "directe|inversée"} x4, recopiées de affirmations.json ],
  "definition": {"fr": "Cette facette porte sur ... (une phrase, vouvoiement)."},
  "avertissement": null  ou {"fr": "..."}   // seulement si le libellé de la plateforme induit en erreur (voir plus bas)
  "niveaux": { "bas": {"fr": {"description": [2 phrases], "apport": [2 phrases], "cout": [2 phrases], "question": "..."}},
               "plutot_bas": {...}, "milieu": {...}, "plutot_haut": {...}, "haut": {...} } } ] }
```
Ne pas écrire le champ `relecture` (ajouté par `construire.py`). Écrire le fichier avec l'outil Write, en UTF-8, sans caractère de contrôle.

## Ce que dit chaque niveau

La description reprend, en les paraphrasant, les quatre affirmations RÉELLES en tenant compte de leur cotation (une affirmation inversée à laquelle on répond « tout à fait » signifie que la tendance contraire domine). Elle commence par « Vos réponses indiquent » ou une tournure équivalente : elle rapporte ce que la personne déclare, non ce qu'elle est ni ce qu'elle fait. « Apport » et « coût » sont des HYPOTHÈSES de lecture, sans étude citée, conditionnelles. La question est ouverte, pour un entretien, et ne suppose pas la réponse. Chaque niveau se distingue réellement des autres (pas de paraphrase de la phrase voisine), « milieu » décrit un équilibre ou une variabilité selon les situations, jamais une absence. Aucune valeur : ni niveau « mieux », ni niveau « pire ».

## Règles vérifiées par `controle.py` (échec = défaut)

Structure exacte par niveau : 2 phrases de `description`, 2 d'`apport`, 2 de `cout`, 1 `question`. Chaque phrase : 240 caractères au plus, finit par un point (la question par « ? »), aucun chiffre, aucun « ! », aucun tiret cadratin ni demi-cadratin. `apport` et `cout` contiennent chacune une tournure d'hypothèse : « peut », « peuvent », « pourrait », « pourraient », « il se peut » ou « vous pouvez ». Aucune phrase d'apport, de coût ou de question répétée entre deux niveaux d'une même facette.

Lexique INTERDIT (mot entier, insensible à la casse) : moyenne, norme(s), percentile(s), meilleur(e), pire, mauvais, bon score, faible(s), fort(e)(s), excellent, score(s), note(s), item(s), passation, test(s), feedback, debrief, coach, psychologue, compatibilité, aptitude(s), compétence(s), prédit, garantit, « vous êtes » (écrire « vous avez », « vous vous décrivez comme », « vos réponses indiquent »), trouble(s), maladie, diagnostic (sauf « non un diagnostic », « pas un diagnostic »), population, « plus que les autres », « que la plupart », « au-dessus de la moyenne ».

Accord : éviter les adjectifs et participes qui s'accordent avec « vous » ; si c'est inévitable, marquer `{masculin|féminin|sans accord}` (exactement trois alternatives, la troisième sans accord). Préférer les formulations qui n'en ont pas besoin.

## Sujets sensibles (marquer par un `avertissement`, ne jamais trancher)

Un `avertissement.fr` est requis quand le titre de la plateforme est plus large ou autre que ce qui est mesuré : E1 (« Bienveillance » mesure la facilité à nouer des liens, non la bienveillance), E2 (« Conformisme » mesure le goût de la compagnie et des foules, non le conformisme), O3 (« Affection » mesure l'intensité et l'écoute des émotions), A5 (« Modestie » : les réponses portent sur l'opinion de soi), N5 (« Immodération » : envies et tentations), O6 (« Libéralisme » : les affirmations portent sur des opinions politiques et morales ; le texte décrit seulement l'ouverture à des positions non conventionnelles ou l'attachement à l'ordre établi, sans jamais parler de vote, de parti ni de politique, et l'avertissement dit qu'une opinion est une donnée sensible, jamais à restituer à un employeur ni à utiliser pour un jugement sur la personne). Pour toute autre facette dont le titre pose un doute, ajouter l'avertissement et l'expliquer en une ou deux phrases.

## Vérification (obligatoire avant de rendre la main)

`cd docs/design/bibliotheque-textes && python -I construire.py --verifier fragments/<D>.json` doit afficher « 5 facette(s), 0 défaut(s) ». Corriger jusqu'à 0. Puis relire à voix intérieure chaque niveau : français irréprochable, accents, ponctuation (espace avant `?` et `:` selon l'usage du pilote), sens exact par rapport aux affirmations et à leur cotation, aucune valeur implicite. Rapport final : liste des 5 codes, le résultat de la commande, et les libellés et avertissements que tu as choisis (pour validation par le propriétaire du produit).
