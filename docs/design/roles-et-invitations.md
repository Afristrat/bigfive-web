# Rôles, invitations et attribution : règle d'Amine du 20/10/2026 et plan

Statut : **proposition prête à valider par Amine, aucune ligne de code ni de migration écrite.** Chaque défaut ci-dessous est réversible : le relâcher ne demande qu'une ligne dans la fonction concernée et un test.

## 1. Règle posée par Amine (verbatim résumé)

1. Amine est **super administrateur**.
2. Il peut inviter les autres et leur accorder des rôles.
3. **Ceux qui invitent sont ceux qui peuvent attribuer les rôles.**
4. **Un utilisateur ne peut jamais changer son propre rôle.**

## 2. État réel du code au 20/10 (lu, pas supposé)

| Capacité | Qui y a droit aujourd'hui | Source |
|---|---|---|
| Créer une organisation | administrateur Tenga | `app.creer_organisation`, migration 0002 |
| Attribuer un rôle | administrateur Tenga seul | `app.attribuer_role`, 0002 lignes 284 à 302 |
| Retirer un rôle | administrateur Tenga seul | `app.retirer_role`, 0002 lignes 304 à 321 |
| Créer une campagne | administrateur Tenga ou responsable de l'organisation | `app.creer_campagne` via `private.peut_gerer`, 0003 |
| Inviter (une adresse, dans une campagne) | administrateur Tenga ou responsable | `app.inviter`, 0003 lignes 370 à 421 |
| Se donner un rôle à soi-même | **non vérifié : aucune interdiction explicite** (`attribuer_role` n'exclut pas `p_utilisateur = auth.uid()`) | 0002 |
| Interface d'invitation, de campagne | **aucune** : `web/src/actions/admin.ts` (94 lignes) et `web/src/app/[locale]/admin/page.tsx` (231 lignes) ne gèrent que l'organisation et l'attribution de rôle | code |

Écart avec la règle : (3) n'est pas respectée (le responsable invite sans pouvoir attribuer ; seul l'administrateur Tenga attribue), (4) n'est pas imposée.

## 3. Matrice proposée (défauts retenus)

Principe unique : **qui invite attribue, qui n'attribue pas n'invite pas.** Les droits d'invitation et d'attribution se déduisent de la même fonction `private.peut_attribuer(p_organisation, p_role)`.

| Acteur | Invite et attribue | N'invite pas, n'attribue pas |
|---|---|---|
| Super administrateur (table `private.tenga_admins`) | tous les rôles, dans toutes les organisations, y compris `responsable` | |
| Responsable d'une organisation | `consultant` et `participant`, **dans son organisation seulement** | `responsable` (voir défaut D-R1) |
| Consultant | | tout (il lit et accompagne, il n'invite pas) |
| Participant | | tout |

Interdits communs, vérifiés dans la base et non dans l'interface :
- **Personne n'attribue, ne modifie ni ne retire son propre rôle**, super administrateur compris (défaut D-R2). Refus : `p_utilisateur = auth.uid()` lève `42501`.
- **On ne peut pas retirer un rôle supérieur ou égal au sien** (un responsable ne retire pas un autre responsable ; seul un super administrateur le fait).
- **Il reste toujours au moins un super administrateur** : un déclencheur sur `private.tenga_admins` refuse de supprimer la dernière ligne (défaut D-R3). Le statut de super administrateur ne s'attribue que par le script serveur `seed-admin.sh`, jamais par l'interface (déjà vrai, voir le README de `supabase/`).
- Toute attribution, tout retrait, toute invitation est inscrit au journal (déjà le cas pour `role.attribuer.*` et `invitation.creer`).

### Défauts à confirmer ou relâcher (tous réversibles)

| Réf. | Défaut retenu | Pour relâcher |
|---|---|---|
| D-R1 | Un responsable ne nomme pas un autre responsable ; seul un super administrateur le fait | autoriser `responsable` dans `private.peut_attribuer` pour le rôle `responsable` |
| D-R2 | Un super administrateur ne se retire ni ne se rétrograde lui-même | retirer le refus `p_utilisateur = auth.uid()` pour les administrateurs Tenga (déconseillé) |
| D-R3 | Au moins un super administrateur en permanence | impossible à relâcher sans risquer de perdre l'accès : à maintenir |
| D-R4 | Le consultant n'invite pas | ajouter `consultant` à `peut_attribuer` pour le rôle `participant` |

## 4. Plan localisé

### 4.1 Base (migration `0007_roles_invitations.sql`)

1. `private.peut_attribuer(p_organisation uuid, p_role text) RETURNS boolean` : administrateur Tenga, ou responsable de `p_organisation` avec `p_role IN ('consultant','participant')`. Même écriture `COALESCE(..., false)` que `private.peut_gerer` (0003 lignes 262 à 272) pour éviter le piège du NULL.
2. Remplacer le corps de `app.attribuer_role` et `app.retirer_role` (0002) : appel à `private.peut_attribuer`, refus si `p_utilisateur = auth.uid()`, refus si la cible porte un rôle supérieur ou égal à celui de l'appelant.
3. Nouvelle fonction `app.inviter_membre(p_organisation, p_email, p_role, p_prenom, p_langue)` : invitation d'**organisation** pour `consultant` ou `participant` (aujourd'hui `app.inviter` n'existe que pour une campagne, donc pour des participants). Même mécanique de jeton haché que `app.inviter` (0003 lignes 370 à 421), contrôle `private.peut_attribuer`.
4. `app.inviter` : remplacer `private.peut_gerer(v_org)` par `private.peut_attribuer(v_org, 'participant')`, pour que « invite = attribue » soit vrai partout.
5. Déclencheur sur `private.tenga_admins` : refuser la suppression de la dernière ligne.
6. Tests : un fichier `supabase/tests/sql/32_roles_invitations.sql` (matrice complète : chaque acteur contre chaque rôle, auto-attribution, rôle supérieur, dernier administrateur), mutations dans `supabase/tests/mutations/` (une par garde supprimée, toutes doivent rougir), `access-matrix.json` passé en version 6.
7. Revue : `ecc:database-reviewer` puis `ecc:security-reviewer` avant application ; application d'abord sur une instance jetable (la préproduction ayant été arrêtée à la demande d'Amine, voir § 5).

### 4.2 Application (`web/`)

| Fichier | Contenu |
|---|---|
| `web/src/actions/admin.ts` | ajouter `creerCampagne`, `inviterParticipants` (liste d'adresses, plafonnée), `inviterMembre`, `attribuerRole` et `retirerRole` ; chaque action relit la session et laisse la base décider |
| `web/src/app/[locale]/admin/organisations/[slug]/page.tsx` (nouveau) | vue d'une organisation : membres et rôles, campagnes, invitations en attente, formulaire d'invitation |
| `web/src/app/[locale]/admin/page.tsx` | lien de chaque organisation vers sa page, retrait de la saisie libre d'un identifiant utilisateur pour le rôle |
| `web/src/lib/login-mail.ts` (modèle) | nouveau `invitation-mail.ts` dans les trois langues, même gabarit |
| `web/src/app/[locale]/i/[jeton]/page.tsx` (nouveau) | acceptation : `app.consulter_invitation` puis `app.accepter_invitation` (déjà en base, 0003) |
| `web/src/messages/{fr,en,ar}.js` | textes (CRLF : édition ligne par ligne, SOP-022) ; arabe relu par un natif avant usage |
| `web/src/lib/access-rules.ts` | règles d'accès des nouvelles routes, test de matrice associé |

Hors périmètre de ce document : le retrait de MongoDB (lot 2 applicatif complet), « mes résultats » (lot 3), la vue du consultant (lot 4).

## 5. Contrainte posée par Amine le 20/10

Amine ne veut **plus d'environnement de préproduction** : « je ne veux plus de production et de pré-production alignées, supprime la pré-production ». Elle est supprimée (application Coolify, pile `tenga-sb-preprod`, DNS, tâches planifiées). Il n'existe qu'un seul environnement, `tenga.ai-mpower.com`. La migration `0007` touche les droits d'accès : elle s'éprouve par `test-sql.sh` sur une **instance Postgres jetable** créée sur serveuria et détruite après le test, puis s'applique à `tenga-sb` (sauvegarde chiffrée vérifiée juste avant, SOP-026). Le parcours de bout en bout se vérifie en production avec un compte de test créé puis supprimé.

## 6. Ce qui reste à décider par Amine

Seulement les quatre défauts D-R1 à D-R4 ci-dessus. Sans réponse, **le plan retient les défauts tels qu'écrits**, et la migration peut être rédigée sans attendre.
