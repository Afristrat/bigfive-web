# Plan de branchement du questionnaire sur la base et sur le moteur

> **Mise à jour du 22/10/2026 (exécution T20).** Numérotation réellement employée : migrations 0019 (M3, passation), 0020 (C0, liste du consultant), 0021 (C2a, binôme), numérotées après le lot mot de passe (0018) car `migrate.sh` refuse un numéro antérieur à la dernière migration appliquée ; tests SQL 39, 40, 41 ; mutations 168 à 175 ; le lot mot de passe est la migration 0018, hors de cette branche. Les épreuves SQL se jouent en production dans une transaction annulée (`supabase/scripts/epreuve-*.sql`), aucune instance de test n'étant autorisée. Partout où ce document écrit 0015, 0016 ou 0017, 38 à 40 ou 156 à 163, lire ces numéros.


21/10/2026. Plan d'implémentation rédigé en lecture seule (aucun fichier de code, de migration ni de catalogue modifié). Il est destiné à des agents d'exécution travaillant sur des fichiers disjoints : chaque étape du § 4 est un brief autonome, à remettre tel quel à un agent.

**Ce qui empêche de livrer ce plan tel quel aux participants.** La bibliothèque de textes porte elle-même la mention « 150 blocs non relus : relecture humaine requise avant tout usage » (`docs/design/bibliotheque-textes/facettes.json`, champ `statut`) et n'existe qu'en français (`"langues": ["fr"]`). Remplacer les textes du paquet `@bigfive-org/results` par ceux de la bibliothèque ne peut donc, aujourd'hui, rien afficher d'interprétatif à un participant sans enfreindre cette mention, et rien du tout en anglais ni en arabe. Le plan retient le défaut le plus sûr (aucun bloc non relu montré à un participant, réglable par variable d'environnement) et le signale à chaque étape concernée ; la décision revient à Amine (§ 6, question 2).

Sources lues : `PASSATION.md` (synthèses du 21/10, décisions G1 à G3 de l'audit du frontend), `docs/design/audit.md`, `docs/design/bases-rapports-individuel-et-binome.md`, `docs/design/roles-et-invitations.md`, `docs/design/plan-invitations-lot2.md`, `docs/plan-implementation-espace-prive.md` (§ 6 et § 10), `docs/design/bibliotheque-textes/` (`construire.py`, `controle.py`, `facettes.json`, `fragments/CONSIGNES.md`), `docs/design/rapport-cabinet/` (`CONTRAT.md`, `moteur/moteur.mjs`, `moteur/regles.json`, `rapport/*.mjs`, `sortie/faits.json`), `supabase/migrations/0001` à `0013` et `0015`, `supabase/tests/README.md`, `web/src/actions/index.ts`, `web/src/app/[locale]/test/*`, `web/src/app/[locale]/result/**`, `web/src/lib/{domain-labels,niveau,access-rules,route-guard,session,account-data,campaign-data}.ts`, `web/src/lib/supabase/server.ts`, `web/src/messages/{fr,en,ar}.js`, `web/src/i18n.ts`, `web/Dockerfile`, `node_modules/@bigfive-org/score/lib/*.js`.

## 1. État réel (lu, pas supposé)

| Sujet | Constat | Preuve |
|---|---|---|
| Questionnaire | Écrit dans MongoDB, jamais dans Supabase ; aucun appel à `app.enregistrer_progression` ni à `app.soumettre_resultat` dans `web/src` | `web/src/actions/index.ts:83-114` (`saveTest`, `insertOne` ligne 100) ; recherche `soumettre_resultat` dans `web/src` : 0 résultat |
| Progression | Dans le `localStorage` du navigateur, sous des clés globales (`inProgress`, `b5data`, `resultId`) | `web/src/app/[locale]/test/survey.tsx:67-75`, `:183-225` |
| Résultat public | `/result/[id]` lit MongoDB par identifiant d'objet, sans connexion, recalcule les scores avec `@bigfive-org/score` et affiche les textes de `@bigfive-org/results` | `web/src/actions/index.ts:37-81` ; `web/src/app/[locale]/result/[id]/page.tsx:52`, `domain.tsx:90`, `:94`, `:101` |
| « Mes résultats » | Préfixe privé déclaré, aucune page | `web/src/lib/route-guard.ts:6-11` (`/mes-resultats`) ; aucun dossier `app/[locale]/mes-resultats` |
| Synthèses de groupe | Aucune page ; la base pose les agrégats à la clôture | `supabase/migrations/0005_groupes_agregats.sql:250-334` |
| Après acceptation d'une invitation | Le participant reçoit `signin_required`, puis atterrit sur `/mon-compte`, qui ne mène à aucune passation | `web/src/actions/invitation-accept.ts:116-124`, `web/src/lib/route-guard.ts:13` |
| MongoDB | Sert aussi aux demandes de présentation : il ne peut pas disparaître avec ce plan | `web/src/actions/presentation.ts:4`, `:45-70` |
| Contexte de construction | L'image Docker ne copie que `web/` : rien de `docs/` (moteur, bibliothèque) n'est disponible à l'exécution | `web/Dockerfile:16` (`COPY . .` depuis `web/`) |
| Numérotation | Le lot mot de passe occupe déjà `0015_mot_de_passe_administrateur.sql`, non publiable | `supabase/migrations/` ; `supabase/tests/README.md:65`, `:97` |

## 2. Écarts entre la base, le moteur et le frontend

Chaque écart est tranché dans une étape (colonne de droite) ; aucun n'est corrigé dans ce document.

| N° | Écart | Côté A | Côté B | Traité par |
|---|---|---|---|---|
| X1 | Trois niveaux contre cinq | Site : `high` si moyenne > 3, `low` si < 3, `neutral` à 3 exactement (`web/src/lib/niveau.ts:5-10`, recopie de `node_modules/@bigfive-org/score/lib/reduce-factors.js:1-10`) ; libellés `results.level.{low,neutral,high}` (`web/src/messages/fr.js:783-787`) | Moteur : cinq niveaux, seuils 2,0 / 2,6 / 3,4 / 4,0 (`docs/design/rapport-cabinet/moteur/moteur.mjs:26-27`, `:44-51` ; `moteur/regles.json:5`) | M1, E |
| X2 | `niveau.ts` est du code mort | Seul `web/tests/unit/niveau.test.ts` l'importe | Le site lit `scoreText` du paquet (`result/[id]/page.tsx:150`, `domain.tsx:73`) | E (suppression) |
| X3 | Forme des scores non fixée | La base accepte tout objet (`0003_campagnes_passation_resultats.sql:643-645`) ; les agrégats lisent `scores.<D>` nombre, ou `scores.<D>.score` (`0005_groupes_agregats.sql:34-36`, `:278-282`) | Le document de bases annonce des « moyennes sur 1 à 5 » (`bases-rapports-individuel-et-binome.md:64`) alors que le moteur prend des sommes de domaine de 24 à 120 et des moyennes de facette de 1 à 5 (`rapport-cabinet/CONTRAT.md`, profils ; `moteur.mjs:166-171`, `:310-311`) | Contrat § 3.1, M3 |
| X4 | Dispersion d'équipe incalculable sur données réelles | La base ne stocke ni minimum ni maximum (`0005_groupes_agregats.sql:22-23`, `:94-96`) | Le moteur classe la dispersion sur l'étendue min-max et compte les personnes par niveau (`moteur.mjs:339-350`, `:371-377`) | D (aucune étiquette de dispersion) |
| X5 | Agrégats par domaine seulement | `group_aggregates.domaine IN ('O','C','E','A','N')` (`0005_groupes_agregats.sql:93`) | Le moteur analyse aussi les facettes d'équipe (`moteur.mjs:339-370`) | D (domaines seuls) |
| X6 | Dérogation au seuil d'anonymat | Base : plancher de 5 inscrit dans la table et réglage `seuil_anonymat` borné à 5 au moins (`0005_groupes_agregats.sql:101-102`, `0001_fondations.sql:259`) | Moteur : agrégat montré sous le seuil pour un cas fictif (`moteur.mjs:483-490`) | D (jamais portée) |
| X7 | Moteur limité au cas fictif | Quatre codes fixes `AM`, `KB`, `SR`, `HT` et contrôle du nombre de personnes (`moteur.mjs:11`, `:120`) | Données réelles : une personne, un binôme ou un groupe quelconque | M1 (portage des fonctions pures seulement) |
| X8 | Consentements absents de la base | Aucune table ni fonction de consentement (`supabase/migrations/*.sql`, recherche `consent` : 0) | Le moteur exige `consentements.{individuel,binome,equipe,organisation}` (`moteur.mjs:126-128`, `:420-436`) ; décision D2 (double consentement du binôme) confirmée par Amine (`bases-rapports-individuel-et-binome.md:245-250`) | C2a |
| X9 | Le consultant ne peut pas trouver un résultat | `app.lire_resultat_individuel` exige un identifiant de participation (`0003:663-689`) ; aucune règle de lecture des participations pour le consultant (`0003:953-956`) | Le rapport individuel côté consultant suppose une liste | C0 |
| X10 | Statut de campagne absent de « mes résultats » | `app.mes_resultats` renvoie le statut de la participation, pas celui de la campagne (`0003:695-720`) | Une participation « ouverte » d'une campagne close mène à un refus 55000 à la soumission (`0003:627-630`) | M3 |
| X11 | Libellés des 30 facettes | `web/src/lib/domain-labels.ts:51-175` | `facettes.json`, champ `libelle.fr` : 23 libellés sur 30 diffèrent (recompté le 21/10 : seuls N6, E3, E4, O2, O5, A4, C5 sont identiques) | E |
| X12 | Nom du domaine C | « Conscienciosité » (`domain-labels.ts:28-30`), dont le commentaire qualifie « Conscience » de contresens (`:12-13`) | « Conscience » dans le rapport cabinet (`rapport-cabinet/rapport/outils.mjs:4`) | E (signalé, `docs/` hors périmètre) |
| X13 | Libellé du niveau du milieu | « milieu » (`moteur.mjs:24`) | « milieu de l'échelle » (`rapport/outils.mjs:3`) | M4 (une seule forme) |
| X14 | Langues | Bibliothèque en français seul (`facettes.json`, `"langues": ["fr"]`) ; aucun texte de niveau de domaine | Catalogues fr, en, ar en parité exigée (`web/tests/unit/messages-parity.test.ts`) | M2, E, § 6 |
| X15 | Bibliothèque non relue | `statut` : « 150 blocs non relus : relecture humaine requise avant tout usage » | Le frontend afficherait ces blocs à de vraies personnes | M2 (garde), § 6 |
| X16 | Parcours public contre plan validé | Le lot 1 prévoyait la « fermeture des liens publics » et le « retrait de MongoDB », l'arbitrage 8 le retrait du partage du lien de résultat (`docs/plan-implementation-espace-prive.md:163`, `:250`) | `/test` et `/result/[id]` sont publics en production ; décision G (« page `/result` ouverte sans connexion ») en attente (`PASSATION.md`, décisions du frontend) | A1, § 6 |
| X17 | Lot mot de passe numéroté 0015 | `0015_mot_de_passe_administrateur.sql`, test `33` (`supabase/tests/README.md:65`, `:97`) | Ce plan prend 0015 et suivantes ; `migrate.sh` refuse une migration numérotée avant la dernière appliquée | P0 |

## 3. Contrats d'interface

### 3.1 Forme des scores remise à `app.soumettre_resultat`

`p_reponses` : objet `{ "<identifiant de question du paquet @bigfive-org/questions>": <entier 1 à 5> }`, 120 clés, valeur déjà orientée par le choix (le paquet encode les affirmations inversées dans `score` du choix). Domaine et facette ne sont jamais pris au client (`web/src/actions/index.ts:20-21`, règle conservée).

`p_scores` (forme `tenga-scores-1`) : les clés de premier niveau `N`, `E`, `O`, `A`, `C` portent `score`, ce qui garde intact le calcul des agrégats de 0005 (sommes de domaine, 24 à 120, comme le radar actuel).

```json
{
  "format": "tenga-scores-1",
  "N": { "score": 72, "count": 24, "moyenne": 3,
         "facettes": { "1": { "score": 12, "count": 4, "moyenne": 3 }, "2": {}, "3": {}, "4": {}, "5": {}, "6": {} } },
  "E": {}, "O": {}, "A": {}, "C": {},
  "meta": { "duree_secondes": 1234 }
}
```

Règles : `score` entier, somme des réponses ; `moyenne = score / count`, arrondie à 6 décimales ; aucun niveau stocké (les seuils sont des conventions non calibrées, décision D4 : le niveau se calcule à la lecture par le moteur, dont la version s'affiche) ; `meta.duree_secondes` est un défaut non validé (indice de fiabilité prévu par `bases-rapports-individuel-et-binome.md` § 7.2, étape 5 ; donnée personnelle de plus, § 6, question 6). `p_questionnaire_version` = `QUESTIONNAIRE_VERSION` (`web/src/lib/question-overrides.ts:8`, `b5-120-ma-2026-10`) ; `p_calcul_version` = `tenga-somme-1`.

### 3.2 Moteur (étape M1, `web/src/lib/moteur/`)

```ts
export type DomainCode = 'N' | 'E' | 'O' | 'A' | 'C';
export type FacetIndex = 1 | 2 | 3 | 4 | 5 | 6;
export type FacetteCode = `${DomainCode}${FacetIndex}`;
export type Niveau = 'bas' | 'plutot_bas' | 'milieu' | 'plutot_haut' | 'haut';
export type ClasseEcart = 'proche' | 'intermediaire' | 'notable';

export type ScoreFacette = { score: number; count: number; moyenne: number };
export type ScoreDomaine = ScoreFacette & { facettes: Record<`${FacetIndex}`, ScoreFacette> };
export type ScoresTenga = { format: 'tenga-scores-1'; meta: { duree_secondes: number | null } } & Record<DomainCode, ScoreDomaine>;

export type Seuils = {
  niveaux: { bas: number; plutot_bas: number; milieu: number; plutot_haut: number };
  ecarts: { proche: number; notable: number };
  tension: { ecart_min: number };
};
export const SEUILS_DEFAUT: Seuils;           // valeurs de regles.json, vérifiées par test
export const VERSION_MOTEUR: 'm-1.0';
export const CALCUL_VERSION: 'tenga-somme-1';

export function calculerScores(
  reponses: Readonly<Record<string, number>>,
  dureeSecondes: number | null
): ScoresTenga;                               // domaine et facette lus dans le paquet, jamais au client
export function lireScores(json: unknown): ScoresTenga | null;   // zod, null si forme inconnue
export function scoresDepuisReponsesMongo(answers: readonly { id: string; score: number }[]): ScoresTenga;
export function niveau(moyenne: number, s?: Seuils['niveaux']): Niveau;
export function ecart(delta: number, s?: Seuils['ecarts']): ClasseEcart;

export type Tension = { id: `${FacetteCode}-${FacetteCode}`; domaine: DomainCode; facettes: [FacetteCode, FacetteCode]; ecart: number };
export type ProfilCalcule = {
  versionMoteur: 'm-1.0';
  domaines: Record<DomainCode, { score: number; moyenne: number; position: number; niveau: Niveau }>;
  facettes: Record<FacetteCode, { score: number; moyenne: number; position: number; niveau: Niveau; blocId: `${FacetteCode}/${Niveau}` }>;
  tensions: Tension[];
};
export function profilDepuisScores(s: ScoresTenga, seuils?: Seuils): ProfilCalcule;  // position = (moyenne - 1) / 4 × 100, jamais affichée en pourcentage

export type EcartsBinome = {
  domaines: { d: DomainCode; ecart: number; classe: ClasseEcart }[];
  facettesNotables: { k: FacetteCode; ecart: number; niveauA: Niveau; niveauB: Niveau }[];
};
export function comparerBinome(a: ProfilCalcule, b: ProfilCalcule, s?: Seuils): EcartsBinome;
```

### 3.3 Bibliothèque (étape M2, `web/src/lib/bibliotheque.ts`)

```ts
export type Audience = 'personne' | 'consultant' | 'administrateur';
export type Accord = 'm' | 'f' | 'n';
export type BlocResolu = { description: readonly string[]; apport: readonly string[]; cout: readonly string[]; question: string };
export type EtatBloc =
  | { etat: 'affiche'; bloc: BlocResolu; nonRelu: boolean }
  | { etat: 'en_relecture' }      // bloc non relu et audience « personne »
  | { etat: 'langue_absente' };   // langue autre que fr
export function blocFacette(id: `${FacetteCode}/${Niveau}`, locale: string, audience: Audience, accord?: Accord): EtatBloc;
export function definitionFacette(code: FacetteCode, locale: string): string | null;
export function avertissementFacette(code: FacetteCode, locale: string): string | null;
export function accorder(texte: string, accord: Accord): string;   // même règle que rapport/outils.mjs:14
export const BIBLIOTHEQUE: { version: string; empreinte: string };
```

Garde : un bloc `non relue` ne s'affiche à l'audience `personne` que si `BIBLIOTHEQUE_NON_RELUS_PERSONNES=afficher` (défaut absent : masqué) ; consultant et administrateur le voient, toujours précédé d'un bandeau « texte non relu ».

### 3.4 Données et actions

```ts
// web/src/lib/mes-resultats-data.ts
export type StatutParticipation = 'ouverte' | 'en_cours' | 'terminee';
export type StatutCampagne = 'brouillon' | 'ouverte' | 'close';
export type MaParticipation = {
  participationId: string; campagneId: string; campagneTitre: string; campagneStatut: StatutCampagne;
  organisationNom: string; organisationSlug: string; statut: StatutParticipation;
  ouverteLe: string; termineeLe: string | null;
  scores: ScoresTenga | null; questionnaireVersion: string | null; calculVersion: string | null;
};
export async function loadMesParticipations(viewer: Viewer): Promise<MaParticipation[]>;
export async function loadMaParticipation(viewer: Viewer, participationId: string): Promise<MaParticipation | null>;

// web/src/lib/passation-data.ts
export type Tentative = { revision: number; reponses: Record<string, number> };
export async function loadTentative(viewer: Viewer, participationId: string): Promise<Tentative | null>; // app.attempts, règle attempts_lecture_proprietaire

// web/src/actions/passation.ts ('use server' : exports async seulement)
export type SubmitOutcome =
  | { status: 'ok'; href: string }
  | { status: 'closed' | 'already' | 'invalid' | 'forbidden' | 'failed' };
export async function submitParticipation(participationId: string, result: DbResult): Promise<SubmitOutcome>;
export type ProgressOutcome =
  | { status: 'ok'; revision: number }
  | { status: 'conflict'; revision: number }
  | { status: 'closed' | 'invalid' | 'failed' };
export async function saveProgress(participationId: string, revision: number, answers: readonly Answer[], questionnaireVersion: string): Promise<ProgressOutcome>;

// web/src/actions/index.ts (ajout)
export async function savePublicTest(result: DbResult): Promise<{ href: string }>;   // enveloppe saveTest, href = /result/<id>

// web/src/app/[locale]/test/survey.tsx (props généralisées)
export type SurveyProps = {
  questions: Question[]; labels: SurveyLabels; locale: string;
  storageKey: string;                                 // « b5 » public, « b5:<participation> » connecté
  onSubmit: (result: DbResult) => Promise<{ href: string } | { error: SurveyError }>;
  initial?: { answers: Answer[]; index: number; revision: number };
  onProgress?: (answers: readonly Answer[], revision: number) => Promise<{ revision: number } | { error: SurveyError }>;
};
export type SurveyError = 'closed' | 'already' | 'conflict' | 'failed';

// web/src/lib/synthese-data.ts
export type LigneAgregat = { groupId: string; groupe: string; portee: 'groupe' | 'complement'; domaine: DomainCode; effectif: number; moyenne: number | null; ecartType: number | null };
export type Synthese = { campagne: { id: string; titre: string; statut: StatutCampagne }; publiee: boolean; lignes: LigneAgregat[]; groupesNonPublies: string[] };
export async function loadSynthese(viewer: Viewer, slug: string, campagneId: string): Promise<Synthese | null>;

// web/src/lib/consultant-data.ts (après C0)
export type ResultatListe = { participationId: string; soumisLe: string };
export async function loadResultatsCampagne(viewer: Viewer, campagneId: string): Promise<ResultatListe[]>;
export async function loadResultatIndividuel(viewer: Viewer, participationId: string): Promise<{ scores: ScoresTenga; soumisLe: string } | null>; // app.lire_resultat_individuel, journalisé par la base
```

Tout chargeur vit dans `web/src/lib` (règle ESLint : `lib/supabase/server.ts` n'est pas importable depuis une page), valide l'identifiant par zod avant toute requête `select` (`makeSelect` concatène la chaîne brute) et lit avec l'identité de la personne (`userClient(viewer.accessToken)`), jamais avec la clé de service.

### 3.5 Catalogues

Les nouveaux espaces de noms vivent dans des modules séparés, un par langue, pour que les étapes parallèles n'écrivent jamais dans le même fichier : `web/src/messages/espace/<nom>.<fr|en|ar>.js`, importés une seule fois par `fr.js`, `en.js`, `ar.js` (étape M4). Espaces : `niveaux` (complet dès M4), `passation`, `mesResultats`, `rapport`, `binome`, `synthese`. Seule l'étape E modifie encore `fr.js`, `en.js`, `ar.js` (espace `results`).

## 4. Étapes (un brief autonome chacune)

### Règles communes à toutes les étapes (à recopier dans chaque brief)

- Dépôt `C:\projets\Tenga assessments\bigfive-web`, application `web/`, base `supabase/`. Production seule : aucun serveur de développement, aucune instance de test sur le poste ; les tests SQL tournent sur serveuria, sur une instance Postgres jetable (`supabase/scripts/jetable.sh`, puis `test-sql.sh` et `mutate-sql.sh`, voir `supabase/tests/README.md`).
- Aucun commit, aucun push, aucun déploiement, aucune migration appliquée : l'orchestrateur s'en charge.
- Fins de ligne mesurées par octets (`python -I -c "print(open(p,'rb').read().count(b'\r\n'))"`) ; `web/src` et `web/tests` sont en LF ; édition des fichiers existants par script Python binaire à ancre unique.
- TypeScript strict, aucun `any`, `type` plutôt qu'`interface`, types de retour sur les exports, objets `const` plutôt qu'`enum`. `'use server'` : seuls des exports `async` et des `type`.
- Français irréprochable, accents sur les majuscules, jamais de tiret cadratin ni demi-cadratin, U+00A0 avant `:` `;` `?` `!` dans les textes visibles français ; arabe à faire relire par un natif avant usage réel ; tout texte nouveau est marqué « défaut non validé par Amine » dans le rapport de l'agent.
- **Ne jamais toucher** : `web/src/app/[locale]/privacy/**`, les fichiers et clés du lot mot de passe, conservé hors de cette branche (branche locale non publiée « tenga-mot-de-passe ») (`actions/auth.ts`, `actions/security.ts`, `lib/security-log.ts`, `lib/sliding-window.ts`, `lib/supabase/server.ts`, `lib/session-cookies.ts`, `lib/admin-data.ts`, `app/[locale]/admin/page.tsx`, clés `login.password`, `account.security`, `admin.locked`), `supabase/migrations/0015_mot_de_passe_administrateur.sql` (ou son nouveau numéro), `docs/design/bibliotheque-textes/{controle.py,construire.py,facettes*.json,fragments/**}`, `docs/design/rapport-cabinet/**`, `web/package.json`, `web/pnpm-lock.yaml`, `web/pnpm-workspace.yaml`, `web/.eslintrc.json`, `web/src/navigation.ts` (fichiers de la branche `tenga-securite-deps`).
- TDD : écrire les tests d'abord, les voir rouges, puis le code. Une mutation volontaire (garde retirée) doit rougir au moins un test ; la consigner dans le rapport.
- Fin d'étape obligatoire : `cd web && npx tsc --noEmit && npx next lint && npx prettier --check <fichiers touchés> && npx vitest run` (tout vert), puis `git diff --name-only` et `git status --short` relevés dans le rapport, qui doivent ne contenir que la liste fermée de l'étape.
- Rapport de l'agent : dix lignes au plus (fichiers, commandes et leur sortie, mutation rouge, défauts non validés, constats hors périmètre non corrigés).

### P0. Préalables (orchestrateur, pas d'agent)

1. Lot invitations livré et déployé (tâches T02 à T10 de `.orchestration/plan.json`), migrations 0012, 0013 et 0014 appliquées en production. Raison : `o/[slug]/page.tsx`, `invitation-accept.ts`, `access-rules.ts` et les catalogues sont en cours de modification par ce lot.
2. Lot mot de passe renuméroté de 0015 à **0018** (`git mv`, en-tête du fichier, `supabase/tests/README.md:65` et `:97`, test `33`), avant l'écriture de la première migration de ce plan (écart X17). Contrôle : `ls supabase/migrations` montre `0018_mot_de_passe_administrateur.sql` et aucun `0015_mot_de_passe*`.
3. Contrôle d'entrée : `cd web && npx tsc --noEmit && npx next lint && npx vitest run` tout vert sur l'arbre de départ, consigné.

### M1. Moteur en TypeScript (vague 1)

- **But** : une seule implémentation des scores, des cinq niveaux, des écarts et des tensions, utilisée par toutes les pages ; portage des fonctions pures de `moteur.mjs`, sans le cas fictif, sans la dérogation au seuil, sans le calibrage organisationnel.
- **Fichiers (liste fermée)** : créer `web/src/lib/moteur/types.ts`, `web/src/lib/moteur/seuils.ts`, `web/src/lib/moteur/scores.ts`, `web/src/lib/moteur/niveaux.ts`, `web/src/lib/moteur/profil.ts`, `web/src/lib/moteur/binome.ts`, `web/src/lib/moteur/index.ts`, `web/tests/unit/moteur-scores.test.ts`, `web/tests/unit/moteur-niveaux.test.ts`, `web/tests/unit/moteur-dore.test.ts`.
- **Contrat** : § 3.1 et § 3.2. `calculerScores` s'appuie sur `getItems('en')` (identifiants communs à toutes les langues) et peut envelopper `@bigfive-org/score`, déjà installé, en ignorant son champ `result` à trois niveaux. Arrondi à 6 décimales avant toute comparaison à un seuil (même règle que `moteur.mjs:36-38`).
- **Tests d'abord** : niveaux aux bornes exactes (1,99 / 2,0 / 2,59 / 2,6 / 3,39 / 3,4 / 3,99 / 4,0 / 5) et flottant piégeux (`83/24 - 71/24`) ; écarts 0,5 proche, 1,0 notable ; `calculerScores` sur 120 réponses à 3 : chaque domaine `score` 72, `moyenne` 3, niveau `milieu` ; réponse d'identifiant inconnu ou valeur hors 1 à 5 : levée d'erreur ; moins de 120 réponses : levée ; égalité de `score` et `count` avec `@bigfive-org/score` sur 50 jeux pseudo-aléatoires à graine fixe ; `lireScores` refuse un objet sans `format`, un domaine manquant, une facette manquante ; **test doré** : lit par `fs` `docs/design/profils-fictifs/profils.json` et `docs/design/rapport-cabinet/sortie/faits.json`, construit pour AM, KB, SR et HT un `ScoresTenga` équivalent, et compare `niveau`, `blocId` et `tensions` de `profilDepuisScores` à `faits.personnes[code]` (aucune différence) ; `SEUILS_DEFAUT` égal à `regles.json.seuils` (lu par `fs`).
- **Acceptation** : `cd web && npx vitest run tests/unit/moteur-*.test.ts` vert ; mutation : remplacer `<` par `<=` dans `niveau` fait rougir `moteur-niveaux` ; `grep -rn "derogation\|AM\b\|fictif" web/src/lib/moteur` : aucune ligne.

### M2. Bibliothèque dans l'application (vague 1)

- **But** : rendre les 150 blocs disponibles à l'exécution (le dossier `docs/` n'est pas dans l'image) avec la garde de relecture.
- **Fichiers** : créer `web/src/data/bibliotheque-facettes.json` (copie octet pour octet de `docs/design/bibliotheque-textes/facettes.json`), `web/src/lib/bibliotheque.ts`, `web/tests/unit/bibliotheque.test.ts` ; modifier `web/.prettierignore` (une ligne : `src/data/bibliotheque-facettes.json`).
- **Contrat** : § 3.3. Ne dépend pas de M1 : les types `FacetteCode` et `Niveau` sont redéclarés localement en `type` littéral, puis remplacés par l'import de `@/lib/moteur` à l'étape B (une ligne, notée dans le brief de B).
- **Tests d'abord** : empreinte SHA-256 de la copie égale à celle de `docs/design/bibliotheque-textes/facettes.json` (lu par `fs`) ; 30 facettes, 5 niveaux, structure 2/2/2/1 ; audience `personne` et bloc `non relue` : `en_relecture` ; même bloc avec `BIBLIOTHEQUE_NON_RELUS_PERSONNES=afficher` : `affiche` avec `nonRelu: true` ; audience `consultant` : `affiche`, `nonRelu: true` ; locale `ar` ou `en` : `langue_absente` ; `accorder` sur `{masculin|féminin|sans accord}` pour `m`, `f`, `n`, valeur inconnue (forme sans accord) ; aucun import de ce module depuis un composant client (étendre l'assertion existante de `client-boundary.test.ts` n'est PAS permis : fichier hors liste ; le test vérifie lui-même l'absence de `'use client'` dans les importeurs par lecture de fichiers).
- **Acceptation** : `npx vitest run tests/unit/bibliotheque.test.ts` vert ; mutation : inverser la garde de relecture fait rougir le test ; `npx prettier --check web/.prettierignore web/src/lib/bibliotheque.ts`.

### M3. Migration 0015 : contrat de passation en base (vague 1, voie SQL)

- **But** : la base refuse un résultat de forme inconnue (défense en profondeur derrière le serveur) et « mes résultats » donne le statut de la campagne (écarts X3 et X10).
- **Fichiers** : créer `supabase/migrations/0015_passation_scores_et_statut.sql`, `supabase/tests/sql/38_passation_scores.sql`, `supabase/tests/mutations/156_scores_sans_controle_de_forme.sql`, `supabase/tests/mutations/157_mes_resultats_sans_statut_campagne.sql` ; modifier `supabase/tests/README.md` (catalogue et § numérotation), `supabase/tests/access-matrix.json` seulement si une fonction exposée change (sinon ne pas toucher).
- **Contenu** : `CREATE OR REPLACE FUNCTION app.soumettre_resultat` (signature inchangée) ajoutant : exactement 120 clés dans `p_reponses`, valeurs entières de 1 à 5 ; `p_scores.format = 'tenga-scores-1'` ; pour chacun des cinq domaines, `score` entier de 24 à 120 et `count = 24`, six facettes de `score` 4 à 20 et `count = 4`, somme des facettes égale au score du domaine ; erreur `22023`. `DROP FUNCTION app.mes_resultats()` puis `CREATE` avec la colonne supplémentaire `campagne_statut text` (le type de retour change), `GRANT EXECUTE … TO authenticated` rétabli. Même discipline que 0003 : `SET LOCAL ROLE tenga_owner`, `SECURITY DEFINER`, `search_path` vide, `END` sans point-virgule.
- **Tests d'abord** (pgTAP, transaction annulée) : soumission valide acceptée ; 119 réponses, valeur 6, valeur 2,5, domaine manquant, `count` faux, somme incohérente, `format` absent : `22023` ; `mes_resultats` renvoie `campagne_statut` `ouverte` puis `close` après clôture ; liste des fonctions exécutables figée (`08_socle_structure.sql`, `13_campagnes_structure.sql`) toujours vraie ; les deux mutations rougissent.
- **Acceptation** : sur instance jetable, `test-sql.sh` vert sur tout le dossier `supabase/tests/sql`, `mutate-sql.sh` : 156 et 157 rouges ; revue `ecc:database-reviewer` puis `ecc:security-reviewer` avant application. Application en production par l'orchestrateur au déploiement de la porte 1 (§ 5), sauvegarde chiffrée vérifiée juste avant (SOP-026), dossier remis à `migrate.sh` excluant le lot mot de passe.

### M4. Catalogues des nouveaux espaces (vague 1)

- **But** : structure des catalogues pour que A, B, C et D écrivent chacun dans leurs propres fichiers.
- **Fichiers** : créer `web/src/messages/espace/{niveaux,passation,mesResultats,rapport,binome,synthese}.{fr,en,ar}.js` (18 fichiers) ; modifier `web/src/messages/fr.js`, `en.js`, `ar.js` (six imports en tête et six clés ajoutées à l'objet, rien d'autre), `web/tests/unit/messages-parity.test.ts` (six espaces ajoutés à la liste `namespaces`).
- **Contenu** : `niveaux` complet : `bas`, `plutot_bas`, `milieu`, `plutot_haut`, `haut`, `echelle` (« lecture de convention, sans comparaison à un groupe »), `versionMoteur` (« Lecture établie avec le moteur {version} »). Une seule forme pour le milieu, « milieu de l'échelle » (écart X13). Les cinq autres espaces ne contiennent qu'une clé `title` provisoire, que chaque étape remplacera dans ses propres fichiers.
- **Tests d'abord** : parité stricte fr/en/ar des six espaces ; `messages-vitrine.test.ts` reste vert.
- **Acceptation** : `npx vitest run tests/unit/messages-parity.test.ts tests/unit/messages-vitrine.test.ts` vert ; `git diff -U0 web/src/messages/fr.js` ne montre que des ajouts.

### A1. Questionnaire connecté sur `app.soumettre_resultat` (vague 2, dépend de M1, M3, M4)

- **But** : un participant invité passe le questionnaire de SA participation, le résultat est rangé dans `app.results` ; plus aucune écriture MongoDB pour le parcours connecté.
- **Parcours public anonyme (défaut retenu, réversible, non validé par Amine)** : `/test` et `/result/[id]` restent publics et continuent d'écrire dans MongoDB, sans changement de principe. Justification : leur fermeture est une décision d'offre en attente (écart X16 ; décision G « page `/result` ouverte sans connexion ») ; elle se fera, une fois tranchée, en une étape séparée (retrait du lien d'accueil, page `/test` réservée, redirection), sans toucher au parcours connecté ; garder ne détruit rien, fermer supprime une vitrine en production. Le parcours public passe par le moteur unique à l'étape E. Sur `/test`, une personne connectée qui a une participation ouverte voit un encart « Vous avez un questionnaire à passer pour <organisation> » qui mène à sa passation, pour qu'aucune réponse de campagne ne parte par erreur dans MongoDB.
- **Fichiers** : créer `web/src/actions/passation.ts`, `web/src/lib/passation-data.ts` (lecture de la participation par `mes_resultats` en attendant B ; fonction `loadParticipationOuverte(viewer, id)` qui ne dépend que de la RPC), `web/src/app/[locale]/mes-resultats/[participation]/questionnaire/page.tsx`, `web/tests/unit/passation-action.test.ts`, `web/tests/unit/survey-props.test.ts` ; modifier `web/src/app/[locale]/test/survey.tsx` (props du § 3.4 : `storageKey`, `onSubmit`, `initial`, `onProgress` optionnel non encore utilisé), `web/src/app/[locale]/test/page.tsx` (passe `savePublicTest` et `storageKey: 'b5'`, encart de participation ouverte), `web/src/actions/index.ts` (ajout de `savePublicTest` seulement), `web/src/messages/espace/passation.{fr,en,ar}.js`.
- **Contrat** : `submitParticipation` : session par `currentViewer` (refus `forbidden` sans session), `testSchema` existant, domaine et facette relus côté serveur, `calculerScores`, puis `rpc('soumettre_resultat', { p_participation, p_reponses, p_scores, p_questionnaire_version, p_calcul_version })` avec le client de la personne ; correspondance des codes par `sqlOutcome` (`web/src/lib/sql-errors.ts`) : `55000` → `closed`, `23505` → `already`, `22023` → `invalid`, `42501` et `P0002` → `forbidden`, sinon `failed` ; `href` = `/mes-resultats/<participation>`. Plafond : réutiliser `limits.saveTest` de `lib/rate-limit.ts` par utilisateur. Le `localStorage` du parcours connecté utilise la clé `b5:<participation>` et est vidé après succès ; l'ancienne clé publique `b5data` reste lue pour la reprise d'un test public en cours (migration douce des clés publiques vers `b5`, une seule lecture).
- **Tests d'abord** : action sans session → `forbidden` sans appel RPC ; réponses invalides → `invalid` sans appel ; ordre `calculerScores` puis RPC ; scores remis conformes à `lireScores` ; `55000` → `closed`, `23505` → `already` ; aucune adresse ni jeton dans le résultat ; `Survey` rendu avec `storageKey` différent n'écrit pas dans `b5data` ; `onSubmit` en erreur conserve la progression locale ; page de passation : participation d'un autre compte (absente de `mes_resultats`) → 404 ; participation `terminee` → redirection vers `/mes-resultats/<id>` ; campagne `close` → message, pas de questionnaire.
- **Acceptation** : commandes de fin d'étape ; `grep -n "insertOne\|connectToDatabase" web/src/actions/passation.ts web/src/lib/passation-data.ts` : aucune ligne ; mutation : retirer le contrôle de session fait rougir `passation-action.test.ts`.

### A2. Progression sur le serveur (vague 3, dépend de A1)

- **But** : la progression d'un participant suit son compte (`app.enregistrer_progression`, révisions), non son navigateur ; reprise sur un autre appareil.
- **Fichiers** : modifier `web/src/actions/passation.ts` (ajout `saveProgress`), `web/src/lib/passation-data.ts` (ajout `loadTentative`), `web/src/app/[locale]/test/survey.tsx` (appel d'`onProgress` à chaque changement d'écran, au plus une requête en vol, file d'attente d'une seule écriture), `web/src/app/[locale]/mes-resultats/[participation]/questionnaire/page.tsx` (passe `initial` depuis la tentative), `web/src/messages/espace/passation.{fr,en,ar}.js` (messages de conflit et de reprise) ; créer `web/tests/unit/passation-progress.test.ts`.
- **Contrat** : révision attendue 0 tant qu'aucune sauvegarde n'existe ; `40001` → `conflict` avec la révision actuelle lue dans le détail (`revision_actuelle=<n>`, `0003:578`, `:587`), l'interface recharge alors la tentative serveur et le dit ; le `localStorage` connecté devient un simple tampon hors ligne.
- **Tests d'abord** : première sauvegarde révision 0 → 1 ; conflit → `conflict` et rechargement ; deux changements rapides → une seule requête en vol ; campagne close → `closed` et arrêt des sauvegardes ; aucune sauvegarde pour le parcours public (`onProgress` absent).
- **Acceptation** : commandes de fin d'étape ; mutation : ignorer le conflit fait rougir le test.

### B. « Mes résultats » avec le moteur unique (vague 2, dépend de M1, M2, M3, M4)

- **But** : historique et lecture de ses propres résultats, par `app.mes_resultats`, en cinq niveaux du moteur, avec les blocs de la bibliothèque selon la garde du § 3.3.
- **Fichiers** : créer `web/src/lib/mes-resultats-data.ts`, `web/src/components/resultats/result-view.tsx` (composant serveur partagé, aussi utilisé par E), `web/src/components/resultats/facet-card.tsx`, `web/src/components/resultats/level-badge.tsx`, `web/src/app/[locale]/mes-resultats/page.tsx`, `web/src/app/[locale]/mes-resultats/[participation]/page.tsx`, `web/tests/unit/mes-resultats-data.test.ts`, `web/tests/unit/result-view.test.ts` ; modifier `web/src/lib/bibliotheque.ts` (remplacer les types redéclarés par l'import de `@/lib/moteur`, une ligne), `web/src/app/[locale]/mon-compte/page.tsx` (un lien « Mes résultats » seulement : fichier partagé avec le lot mot de passe, ajout minimal listé dans le rapport), `web/src/messages/espace/mesResultats.{fr,en,ar}.js`.
- **Contrat** : `ResultView` reçoit `{ profil: ProfilCalcule; locale; audience: Audience; libelles; date: string | null }` et n'importe aucun paquet `@bigfive-org/*`. Il affiche : radar et barres des cinq domaines (sommes de 24 à 120, composants existants `RadarChart`, `ScoreBar`), niveau en toutes lettres (espace `niveaux`), six facettes par domaine avec libellé (`facetLabel`), niveau et, selon `blocFacette`, la description, l'apport, le coût et la question, ou la mention « texte en relecture » ; avertissement de la facette quand la bibliothèque en porte un ; tensions internes en liste ; mention de la version du moteur et de la phrase de convention. Liste `/mes-resultats` : une ligne par participation (`campagneTitre`, `organisationNom`, statut), bouton « Commencer » ou « Reprendre » vers `/mes-resultats/<id>/questionnaire` si la participation n'est pas terminée ET que la campagne est ouverte, « Voir » sinon. `scores` illisibles par `lireScores` : message « résultat enregistré dans un format antérieur », jamais d'erreur 500.
- **Tests d'abord** : chargeur : zod refuse un identifiant non uuid avant toute requête ; ligne sans résultat → `scores: null` ; `ResultView` : cinq niveaux affichés, aucun texte `low|neutral|high`, aucun bloc non relu pour `personne`, bandeau « non relu » pour `consultant`, `langue_absente` en arabe affiche la mention prévue ; page détail : participation absente → 404 ; route privée (préfixe `/mes-resultats` déjà dans `route-guard.ts`).
- **Acceptation** : commandes de fin d'étape ; `grep -rn "@bigfive-org/results\|@bigfive-org/score" web/src/components/resultats web/src/app/[locale]/mes-resultats` : aucune ligne ; mutation : afficher les blocs non relus à `personne` fait rougir `result-view.test.ts`.

### E. Alignement du frontend public `/result` (vague 3, dépend de B)

Tous les choix de cette étape sont des **défauts non validés par Amine** (décisions G1 à G3 de l'audit du frontend), réversibles en une étape.

- **But** : libellés des 30 facettes = ceux de la bibliothèque ; cinq niveaux du moteur ; textes du paquet `@bigfive-org/results` retirés et remplacés par la bibliothèque ; `/result/[id]` inchangée dans son principe (publique, identifiant MongoDB) mais rendue par `ResultView`. `/privacy` intouchée.
- **Fichiers** : modifier `web/src/lib/domain-labels.ts` (libellés français des facettes repris de `facettes.json` champ `libelle.fr`, 23 changements ; anglais et arabe écrits comme traductions de ces libellés, marqués « non relus », arabe à faire relire), `web/src/actions/index.ts` (`getTestResult` renvoie `{ id; timestamp; profil: ProfilCalcule }` par `scoresDepuisReponsesMongo` puis `profilDepuisScores` ; liste des langues prise dans `config/site`, plus dans `getInfo()` du paquet), `web/src/app/[locale]/result/[id]/page.tsx` (rendu par `ResultView`, audience `personne`), `web/src/messages/fr.js`, `en.js`, `ar.js` (espace `results` seulement : retrait de `level.{low,neutral,high}`, `learnMore`, `detailHint` devenus sans objet ; ajout de la mention « textes d'interprétation en relecture »), `web/tests/unit/radar-chart.test.ts` et `web/tests/unit/domain-shape.test.ts` seulement si les libellés y sont figés ; supprimer `web/src/lib/niveau.ts`, `web/tests/unit/niveau.test.ts`, `web/src/app/[locale]/result/[id]/domain.tsx`, `result-body.tsx`, `domain-tabs.tsx` (remplacés par `ResultView`) ; créer `web/tests/unit/result-public.test.ts`, `web/tests/unit/domain-labels.test.ts`.
- **Effet de bord à annoncer** : la page « Méthode et références » utilise `facetLabel` (`web/src/app/[locale]/methode/page.tsx:7`, `:219`) : ses libellés changent aussi. Le nom « Conscienciosité » est conservé (écart X12 signalé pour `docs/`, non corrigé ici).
- **Tests d'abord** : `domain-labels` : pour les 30 codes, `facetLabel(code, 'fr')` égal à `libelle.fr` de `facettes.json` (lu par `fs`) ; parité des trois langues ; page publique : aucun texte provenant du paquet (absence des chaînes de `node_modules/@bigfive-org/results/lib/data/fr` dans le rendu, vérifiée sur trois facettes), cinq niveaux, identifiant inconnu → 404 ; le chemin `/privacy` n'apparaît dans aucun fichier modifié.
- **Acceptation** : commandes de fin d'étape ; `grep -rln "@bigfive-org/results" web/src` : aucune ligne (le retrait de la dépendance de `package.json` attend l'intégration de `tenga-securite-deps`) ; `grep -rn "niveauDeScore\|scoreText" web/src web/tests` : aucune ligne ; `git diff --name-only | grep -i privacy` : vide.

### C0. Migration 0016 : liste des résultats pour le consultant (vague 2, voie SQL, après M3)

- **But** : permettre au consultant affecté et à l'administrateur Tenga de trouver les résultats d'une campagne sans lire les participations (écart X9).
- **Fichiers** : créer `supabase/migrations/0016_liste_resultats_consultant.sql`, `supabase/tests/sql/39_liste_resultats_consultant.sql`, `supabase/tests/mutations/158_liste_ouverte_au_responsable.sql`, `159_liste_sans_journal.sql` ; modifier `supabase/tests/README.md`, `supabase/tests/access-matrix.json`.
- **Contenu** : `app.lister_resultats_campagne(p_campagne uuid) RETURNS TABLE (participation_id uuid, soumis_le timestamptz)`, `SECURITY DEFINER`, réservée à `app.suis_admin_tenga()` ou `COALESCE(app.mon_role(v_org) = 'consultant', false)`, refus `42501` sans distinguer inexistant et interdit, journal `resultat.lister` avec le nombre de lignes, **aucune identité renvoyée** (défaut non validé, § 6, question 4).
- **Tests d'abord** : consultant de l'organisation : lignes ; consultant d'une autre organisation, responsable, participant, anonyme : refus ; identifiants forgés : refus ; journal présent ; mutations rougissent.
- **Acceptation** : comme M3.

### C1. Rapport individuel sur données réelles (vague 3, dépend de B et C0, après D pour `o/[slug]/page.tsx`)

- **But** : rapport individuel (§ 5 de `bases-rapports-individuel-et-binome.md`) en page HTML imprimable, pour la personne elle-même et pour le consultant, à partir de `ProfilCalcule` et de la bibliothèque. Rendu PDF par Gotenberg : lot 6, hors de cette étape.
- **Fichiers** : créer `web/src/lib/rapports/individuel.ts` (construction pure : sections « Lire ce rapport », vue d'ensemble, cinq domaines, carte des 30 facettes, tensions, questions d'entretien issues des blocs), `web/src/lib/consultant-data.ts`, `web/src/components/rapports/rapport-individuel.tsx`, `web/src/app/[locale]/mes-resultats/[participation]/rapport/page.tsx` (audience `personne`), `web/src/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/page.tsx` (liste, consultant et administrateur), `web/src/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/[participation]/page.tsx` (audience `consultant`, lecture par `app.lire_resultat_individuel`, donc journalisée), `web/tests/unit/rapport-individuel.test.ts`, `web/tests/unit/consultant-data.test.ts` ; modifier `web/src/app/[locale]/o/[slug]/page.tsx` (un lien « Résultats » par campagne pour le consultant seulement), `web/src/messages/espace/rapport.{fr,en,ar}.js`.
- **Règles** : situations de travail et synthèse par modèle de langue NON faites (§ 7.2 étapes 8 et 9 : base juridique et choix de modèle d'abord) ; fiabilité : réponses complètes garanties par le schéma, durée affichée seulement si `meta.duree_secondes` existe, sans seuil (aucun indice validé) ; facette O6 retirée de la vue `consultant` (défaut non validé, § 6, question 5) ; aucun accord grammatical tant que D8 est ouverte (forme `n`).
- **Tests d'abord** : test doré : pour le profil AM fictif, les `bloc_ids` cités par `individuel.ts` sont exactement ceux de `faits.json` `personnes.AM.facettes[*].bloc_id` ; aucun mot du lexique interdit de `CONSIGNES.md` dans les textes fixes ; responsable sur la page consultant → 404 ; `loadResultatIndividuel` appelle `lire_resultat_individuel` et jamais un `select` sur `results` ; O6 absente de la vue consultant.
- **Acceptation** : commandes de fin d'étape ; `grep -rn "select('results'\|'results'," web/src/lib/consultant-data.ts` : aucune ligne.

### C2a. Migration 0017 : consentement du binôme (vague 3, voie SQL, après C0)

- **But** : double consentement explicite et révocable (décision D2), limité aux deux personnes et au consultant, sans copie à l'employeur (écart X8).
- **Fichiers** : créer `supabase/migrations/0017_consentement_binome.sql`, `supabase/tests/sql/40_consentement_binome.sql`, mutations `160_binome_un_seul_accord.sql`, `161_binome_lisible_par_responsable.sql`, `162_binome_retrait_ignore.sql`, `163_binome_hors_organisation.sql` ; modifier `supabase/tests/README.md`, `supabase/tests/access-matrix.json`.
- **Contenu** : table `app.binomes (id, organization_id, participation_a, participation_b, propose_par, propose_le, accord_a_le, accord_b_le, retire_le)`, RLS forcée, aucune écriture par l'API (déclencheur `private.refuser_ecriture_api`), deux participations terminées de la MÊME organisation ; `app.proposer_binome(p_a, p_b)` (consultant de l'organisation ou administrateur Tenga) ; `app.repondre_binome(p_binome, p_accord boolean)` (titulaire de l'une des deux participations ; un refus ou un retrait est définitif pour cette proposition) ; `app.mes_binomes()` (propositions me concernant, avec le nom de profil de l'autre personne, nécessaire à un consentement éclairé : défaut non validé) ; `app.lire_binome(p_binome)` : scores des deux participations seulement si les deux accords existent et `retire_le IS NULL`, pour les deux personnes, le consultant de l'organisation et l'administrateur Tenga, journalisée ; jamais le responsable. Purge et suppression de compte : cascade par les participations. Durée de conservation : celle des résultats (défaut non validé).
- **Tests d'abord** : un seul accord → aucune lecture ; deux accords → lecture par A, B, consultant ; responsable, autre participant, consultant d'une autre organisation → refus ; retrait par A → plus de lecture ; participations de deux organisations → refus ; journal présent ; mutations rougissent.
- **Acceptation** : comme M3.

### C2b. Rapport de binôme (vague 4, dépend de C1 et C2a)

- **But** : rapport de binôme (§ 6 de `bases-rapports-individuel-et-binome.md`) : radar superposé, carte des écarts en trois classes, toutes les différences notables, points d'attention documentés, sans aucun score de compatibilité.
- **Fichiers** : créer `web/src/lib/rapports/binome.ts`, `web/src/lib/binome-data.ts`, `web/src/components/rapports/rapport-binome.tsx`, `web/src/components/rapports/binome-consent.tsx` (client : accepter, refuser, retirer), `web/src/actions/binome.ts`, `web/src/app/[locale]/mes-resultats/binomes/page.tsx`, `web/src/app/[locale]/mes-resultats/binomes/[binome]/page.tsx`, `web/src/app/[locale]/o/[slug]/campagnes/[campagne]/binomes/page.tsx` (proposition par le consultant), `web/tests/unit/rapport-binome.test.ts`, `web/tests/unit/binome-actions.test.ts` ; modifier `web/src/messages/espace/binome.{fr,en,ar}.js`.
- **Règles** : calibrage par nature de relation omis (la base ne connaît ni nature, ni sens, ni interdépendance de la relation : `moteur.mjs:290-303` n'a pas d'entrée réelle) ; O6 exclue de tout ce que voit l'autre personne ; lectures croisées et scénarios par modèle : non faits.
- **Tests d'abord** : test doré : pour la relation fictive AM-KB, `comparerBinome` donne les mêmes `facettes_notables` que `faits.json` ; aucune page n'affiche de pourcentage ni le mot « compatibilité » ; sans double accord → 404 ; O6 absente.
- **Acceptation** : commandes de fin d'étape.

### D. Synthèses de groupe (vague 2, dépend de M1, M4)

- **But** : lecture des agrégats photographiés à la clôture, par le responsable, le consultant et l'administrateur Tenga, sans aucune donnée individuelle.
- **Règles de confidentialité appliquées (lues en base, jamais recalculées)** : la page ne lit que `app.group_aggregates` et `app.groups` (règles `0005:516-523`, composition illisible par le responsable depuis `0006:307-308`) ; seuil d'anonymat décidé par la base (5 au moins, `0001:259`, `0005:101-102`), aucun seuil côté application, jamais la dérogation du moteur (écart X6) ; domaines seuls (X5) ; aucune étiquette de dispersion (X4) : l'écart type s'affiche en nombre, avec la phrase « dispersion des réponses, sans étiquette faute de convention » (défaut non validé) ; niveau du groupe = `niveau(moyenne / 24)` du moteur, précédé de « lecture de convention » ; campagne non close : « la synthèse sera disponible à la clôture » ; groupe sans ligne : « non publié : effectif inférieur au seuil d'anonymat », sans effectif.
- **Fichiers** : créer `web/src/lib/synthese-data.ts`, `web/src/components/synthese/group-synthesis.tsx`, `web/src/app/[locale]/o/[slug]/campagnes/[campagne]/synthese/page.tsx`, `web/tests/unit/synthese-data.test.ts`, `web/tests/unit/group-synthesis.test.ts` ; modifier `web/src/app/[locale]/o/[slug]/page.tsx` (un lien « Synthèse » par campagne close), `web/src/messages/espace/synthese.{fr,en,ar}.js`.
- **Tests d'abord** : le chargeur n'interroge que `group_aggregates`, `groups` et `campaigns` (test statique sur le source : aucune occurrence de `results`, `participations`, `group_members`, `lire_resultat_individuel`) ; participant → 404 ; ligne `complement` d'effectif 0 affichée sans moyenne ; aucune valeur minimale ni maximale rendue ; niveaux en cinq classes.
- **Acceptation** : commandes de fin d'étape ; mutation : lire `group_members` dans le chargeur fait rougir le test statique.

### V. Vérifications déployées (après chaque porte du § 5)

Par un agent `ecc:e2e-runner`, Playwright CLI, en production, session demandée en base et jamais affichée, compte et organisation d'essai `zz-essai-questionnaire` créés puis supprimés : invitation acceptée, questionnaire connecté passé en français et en arabe, résultat présent dans `/mes-resultats` en cinq niveaux, aucun document créé dans MongoDB pour ce compte (comptage avant et après dans la collection `results`), reprise de progression sur un second contexte de navigateur (A2), `/test` public inchangé, `/result/<id>` public rendu par `ResultView`, `/privacy` identique octet pour octet à la version précédente (empreinte du HTML), responsable : synthèse visible après clôture d'une campagne de cinq participants d'essai, aucune page individuelle (404) ; consultant : liste et lecture journalisées (ligne `resultat.lire` dans le journal, sans adresse).

## 5. Ordre, dépendances et portes de déploiement

| Vague | Étapes parallèles (fichiers disjoints) | Dépend de |
|---|---|---|
| 0 | P0 | invitations livrées |
| 1 | M1, M2, M3 (voie SQL), M4 | P0 |
| 2 | A1, B, D, C0 (voie SQL) | M1, M2, M3, M4 (D : M1 et M4) |
| 3 | A2, E, C1, C2a (voie SQL) | A1 ; B ; B, C0 et D ; C0 |
| 4 | C2b | C1, C2a |

Disjonction vérifiée par construction : les seuls fichiers touchés par plusieurs étapes sont `survey.tsx` (A1 puis A2, séquentielles), `passation-data.ts` et `actions/passation.ts` (A1 puis A2), `bibliotheque.ts` (M2 puis B), `o/[slug]/page.tsx` (D puis C1), `actions/index.ts` (A1 puis E), `fr.js`/`en.js`/`ar.js` (M4 puis E), `supabase/tests/README.md` et `access-matrix.json` (voie SQL, une étape à la fois) : chaque paire est dans deux vagues différentes.

Portes de déploiement (SOP-014, une porte = commit, push, déploiement, vérification V) : **porte 1** après M1 à M4, A1, A2, B, E, avec la migration 0015 ; **porte 2** après C0, C1, D, avec 0016 ; **porte 3** après C2a, C2b, avec 0017. Avant chaque porte : revue `ecc:code-reviewer`, `ecc:security-reviewer`, `ecc:typescript-reviewer`, `ecc:react-reviewer` par des agents différents de ceux qui ont écrit le code. Retour arrière : redéployer l'image précédente ; les migrations 0015 à 0017 n'effacent rien, leur retrait se fait par une migration suivante.

## 6. Questions ouvertes pour Amine (défaut appliqué entre parenthèses)

1. Parcours public anonyme `/test` et `/result/[id]` : le garder ou le fermer comme le prévoyaient le lot 1 et l'arbitrage 8 (gardé, réversible).
2. Blocs non relus de la bibliothèque : les montrer aux participants avant la relecture de Nezha (non : seuls consultant et administrateur les voient, avec un bandeau).
3. Bibliothèque en français seul : qui rédige l'anglais et l'arabe natifs, et que voit un participant arabophone d'ici là (mention « textes en relecture », sans interprétation).
4. Identité dans la liste du consultant : le pack A (entretien de Nezha) suppose de savoir qui est qui (aucune identité renvoyée).
5. Facette O6 dans la vue du consultant (retirée ; jamais montrée à l'autre personne d'un binôme).
6. Durée de passation conservée dans les scores (conservée dans `meta.duree_secondes`).
7. Décisions G1 à G3 : libellés des 30 facettes, trois ou cinq niveaux, textes du paquet (libellés de la bibliothèque, cinq niveaux, textes du paquet retirés).
8. Nom du profil de l'autre personne montré dans une proposition de binôme (montré, pour un consentement éclairé).
9. Renumérotation du lot mot de passe de 0015 à 0018 (faite en P0, avant la première migration de ce plan).

## 7. Risques et parades

| Risque | Parade |
|---|---|
| Une réponse de campagne part dans MongoDB par le parcours public | Encart de participation ouverte sur `/test` (A1) ; vérification V par comptage MongoDB |
| Rapport d'apparence normale avec des textes non relus | Garde de relecture par audience et par variable d'environnement, testée par mutation (M2, B) |
| Résultat illisible après un changement de seuils | Aucun niveau stocké ; `calcul_version` et `VERSION_MOTEUR` affichés ; `lireScores` tolère et signale une forme antérieure |
| Réidentification par la synthèse | Lecture des seules lignes publiées par la base ; aucune étiquette ni valeur extrême ; test statique des sources lues (D) |
| Lecture individuelle par le responsable | Aucune page individuelle sous `o/[slug]` pour ce rôle (404 testé) ; la base refuse de toute façon (`0003:678`) |
| Migration appliquée avant le lot mot de passe renuméroté | P0 bloque la vague 1 tant que `0018_mot_de_passe*` n'existe pas |
| Fichiers partagés avec le lot mot de passe (`mon-compte/page.tsx`) ou avec `tenga-securite-deps` | Ajouts minimaux listés dans le rapport ; `package.json` et le verrou jamais touchés ; retrait de `@bigfive-org/results` reporté |
| Dérive entre le moteur de `docs/` et celui de l'application | Tests dorés sur `faits.json` et `profils.json` (M1, C1, C2b), seuils comparés à `regles.json` |
| Copie de la bibliothèque périmée après une relecture | Test d'empreinte (M2) : toute relecture dans `docs/` fait rougir la suite tant que la copie n'est pas refaite |
| Promesse du courriel d'invitation (« seul le consultant affecté ») | Inchangée : C0 et C2a n'ouvrent rien au responsable ; à relire si la question 4 est tranchée autrement |
