# Contrat de coordination : rapport « cabinet » (mandat `../mandat-rapports-cabinet.md`)

Chaque agent n'écrit QUE dans son périmètre. Aucun commit, aucun `git add`, aucun push (le chef de projet commite). Ne jamais toucher : `supabase/scripts/backup/*`, `docs/design/captures/*`, `web/` (sauf mention), `controle.py`, `construire.py`, `facettes-pilote.json`, `CONTRAT.md`, `references-autorisees.json`. Un agent qui découvre un défaut hors périmètre le signale dans son rapport final, sans le corriger.

## Périmètres (disjoints)

| Agent | Écrit seulement dans |
|---|---|
| bib-NE | `docs/design/bibliotheque-textes/fragments/N.json`, `fragments/E.json` |
| bib-OA | `fragments/O.json`, `fragments/A.json` |
| bib-C | `fragments/C.json` |
| moteur | `docs/design/rapport-cabinet/cas/`, `moteur/`, `sortie/faits.json` |
| audit | `docs/design/rapport-cabinet/audit/` |

## Règles de forme (toutes langues : français seul, arabe hors périmètre)

Accents partout, majuscules comprises. Jamais de tiret cadratin ni demi-cadratin. Vouvoiement. Rien n'est inventé : aucune source, aucun chiffre, aucun fait de pays ou de culture non fourni.

## Schéma d'entrée `cas/cas-demo.json` (mandat § 4.3)

```
{ "fictif": true, "etiquette": "CAS FICTIF DE DÉMONSTRATION",
  "organisation": { "nom", "secteur", "taille", "age", "pays": "Maroc", "structure": <liste fermée Mintzberg>, "culture": <liste fermée Cameron et Quinn>, "maturite", "historique" },
  "strategie": { "objectifs": [..], "orientation": "exploration|exploitation|redressement|croissance|conformite", "indicateurs": [..], "arbitrages": [..] },
  "contraintes": [ { "id", "libelle", "type": "budget|delai|reglementation|ressources|culture|heritage|syndical", "durete": "dure|negociable" } ],   // dont droit marocain (loi 09-08, CNDP, loi 65-99) et une contrainte interculturelle
  "interculturel": { "actif": true, "sites": [..], "nationalites": [..], "langues_travail": [..], "rapport_siege_filiale", "part_expatries", "travail_reparti", "fuseaux", "culture_maison_mere", "culture_locale" },
  "personnes": [ { "code": "AM|KB|SR|HT", "nom", "fictif": bool, "fonction", "niveau", "anciennete", "perimetre_decision", "role_equipe", "langue_passation", "consentements": { "individuel": bool, "binome": bool, "equipe": bool, "organisation": bool } } ],
  "relations": [ { "id": "AM-KB", "a", "b", "nature": "ligne|fonctionnel|pairs|client-fournisseur|mentorat|co-direction", "sens": "a->b|b->a|reciproque", "frequence", "interdependance": "mise-en-commun|sequentielle|reciproque" } ],   // exactement les 6 paires de 4 personnes
  "tache": { "description", "nature": "routine|creative|urgence|projet", "echeances": [..], "risques": [..] } }
```
Seul AM est un profil estimé (`fictif: false` mais étiqueté « estimation, pas une mesure ») ; KB, SR, HT sont fictifs. Les scores NE sont PAS saisis : ils viennent de `docs/design/profils-fictifs/profils.json` (champs `domaine` 24 à 120 et `facette` moyennes 1 à 5, par code AM, KB, SR, HT).

## Sortie du moteur `sortie/faits.json` (déterministe, aucun modèle)

```
{ "version_moteur": "m-1.0", "bibliotheque": {"version","empreinte"}, "empreinte_entrees": "<sha256 de cas + profils + regles>",
  "conventions": { "niveaux": {...seuils...}, "ecarts": {...}, "dispersion": {...}, "avertissement": "conventions non calibrées, aucune norme de population" },
  "personnes": { "<code>": { "domaines": { "N": {"score","moy","niveau"}, ... },
                 "facettes": { "N1": {"moy","niveau","bloc_id": "N1/<niveau>"}, ... },        // bloc_id = identifiant de bloc de la bibliothèque
                 "tensions": [ { "id", "domaine", "facettes": ["N1","N6"], "ecart", "regle": "<id de règle>" } ],
                 "contribution": { "points_forts_hypothese": [facette..], "couts_hypothese": [facette..] } } },
  "relations": [ { "id","a","b","nature","sens","interdependance",
                   "domaines": [ {"d","ecart","classe": "proche|intermediaire|notable"} ],
                   "facettes_notables": [ {"k","ecart","niveau_a","niveau_b"} ],
                   "calibrage": { "regles": [ {"id": "<id de règle de regles.json>", "declencheur": "...", "poids": "<mot>"} ] } } ],
  "equipe": { "domaines": { "N": {"min","max","etendue","dispersion"} ... }, "facettes_diverses": [...], "facettes_homogenes": [...],
              "couverture": { "<domaine>": {"hauts": [codes], "bas": [codes]} } },
  "organisation": { "n_personnes": 4, "seuil_anonymat": 5, "seuil_atteint": false, "derogation_demonstration": "<texte : agrégat montré malgré un effectif < 5 uniquement parce que le cas est fictif et consenti>",
                    "agregats": { ... }, "adequation": [ { "regle": "<id>", "lecture": "..." } ] },
  "consentements": { "bloquants": [ ... ] } }
```
Chaque niveau, écart, tension se justifie par une règle de `moteur/regles.json` (id, déclencheur chiffré lisible, texte-hypothèse). Seuils par défaut (conventions § 7.2 du document de bases, déjà dans `profils-fictifs/generer.mjs`) : niveau d'une moyenne m sur 1 à 5 : bas < 2,0 ; plutôt bas < 2,6 ; milieu < 3,4 ; plutôt haut < 4,0 ; haut ≥ 4,0 ; écart de deux moyennes : proche ≤ 0,5 ; notable ≥ 1,0 ; sinon intermédiaire ; dispersion d'équipe : homogène ≤ 0,5, diverse ≥ 1,0.

## Format du rapport `sortie/rapport.json` (produit plus tard par le générateur, audité par `audit/`)

```
{ "version", "empreinte_entrees", "etiquette_fictif": "...", "avertissements": [str],
  "niveaux": [ { "id": "n1-individuel|n2-relations|n3-equipe|n4-organisation|n5-accompagnement", "titre",
                 "sections": [ { "id", "titre", "paragraphes": [ { "id", "texte", "statut": "constate|hypothese",
                                  "confiance": "faible|moyenne|elevee", "verification": "<façon de vérifier en entretien>", "bloc_ids": [..] } ] } ] } ],
  "recommandations": [ { "id", "niveau": "n1..n5", "texte", "donnee", "contexte", "preuve": { "niveau": "source|hypothese", "reference_id": null|"<id de references-autorisees.json>" },
                         "risque", "responsable", "horizon", "indicateur" } ],
  "references": [ { "id": "<id de references-autorisees.json>", "citation", "statut": "à vérifier" } ] }
```
Toute chaîne de ce fichier est « texte visible » pour l'audit.

## Commandes de preuve (Node 22, aucun paquet à installer pour les tests de ces dossiers)

- Bibliothèque : `cd docs/design/bibliotheque-textes && python -I construire.py --verifier fragments/<D>.json` doit afficher `0 défaut(s)`.
- Moteur et audit : `node --test "docs/design/rapport-cabinet/<dossier>/*.test.mjs"` (glob entre guillemets : sous Node 22 Windows un dossier nu échoue) doit passer, avec des tests unitaires ET des mutations (une erreur volontaire fait échouer le contrôle).
