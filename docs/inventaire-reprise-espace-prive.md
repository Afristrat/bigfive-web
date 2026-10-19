# Reprise de la branche abandonnée `espace-prive` pour le lot 1

19 octobre 2026. Inventaire en lecture seule de la branche `espace-prive` (balise `archive/espace-prive-v1-better-auth`, commits `96bf508` et `b29310d`), selon la règle du plan § 6 : reprendre les règles d'accès pures et leurs tests, l'envoi Resend et ses gabarits FR, AR et EN, les textes, la protection contre les redirections externes ; jeter Better Auth, MongoDB et les règles de conservation en TypeScript. Les extraits se lisent par `git show archive/espace-prive-v1-better-auth:<chemin>`.

## À reprendre ou adapter (chemins sous `web/src/`)

| Fichier | Verdict | À couper ou changer |
|---|---|---|
| `lib/access-rules.ts` et `.test.ts` (22 tests) | Reprendre en l'adaptant | Passer au rôle unique par organisation (`:12-17`) ; administrateurs lus dans `tenga_admins`, plus dans l'environnement (`:20-32`) ; retirer l'aperçu consultant de `decideTestMode` (`:124-147`, arbitrage 7) ; réécrire le test « rôles multiples » (`:161-166`) |
| `lib/mailer.ts` | Reprendre | Ajouter des tests (`escapeHtml`, `canonicalAddress`, `buildLinkMail`) ; `:38` un envoi sans clé échoue en silence : le rendre visible |
| `lib/access.ts` | N'extraire que `safeInternalPath` et `localizedPath` (`:33-45`) | Module neutre et tests ; tout le reste dépend de MongoDB ou Better Auth |
| `lib/auth-emails.ts` | Reprendre `sendMagicLinkMail` | Lien `/c/{jeton}` et code à 6 chiffres (plan § 4) ; invitation au lot 2 ; supprimer `sendResultLinkMail` |
| `messages/fr.js`, `en.js`, `ar.js` | Reprendre `login.*`, `emails.magicLink.*`, `roles.*`, `invitation.*`, `toolbar.login/logout/my_results/organization/admin` | Supprimer `emails.resultLink.*` et `shareEmail.*` |
| `schemas/index.ts` | Reprendre `magicLinkSchema` | Les schémas d'organisation et d'invitation servent aux lots 1 et 2 |
| `components/login-form.tsx`, `app/[locale]/connexion/page.tsx`, `actions/auth.ts` | Adapter | Brancher sur le service de lien `/c/{jeton}`, qui reste à écrire |
| `lib/sign-in-eligibility.ts` | Reprendre la seule règle `decideSignInEligibility` | Transport réécrit en SQL |
| `lib/rate-limit.ts` | Adapter | Compteurs `magicLink*` : mémoire ou base, à trancher |
| `app/[locale]/admin/page.tsx`, `layout.tsx`, `components/navbar.tsx`, `lib/auth-nav.ts` | Adapter | Retirer `org-data`, `getTengaAdmin` par environnement, liens publics de résultats |

## À jeter

`lib/auth.ts`, `lib/org-data.ts`, `lib/retention.ts`, `db/index.ts`, `db/indexes.ts`, `actions/index.ts`, `actions/org.ts`, `app/api/auth/[...all]/route.ts`, `app/[locale]/invitation/[id]/page.tsx`, les pages `compare`, `mes-resultats`, `o/[slug]`, `result`, `test` de la branche (réécrites aux lots 2 à 4), `components/email-modal.tsx`, `share-bar.tsx`, `org-forms.tsx`, `pnpm-lock.yaml`. À garder de `lib/auth.ts` sous une autre forme : durées (15 min, 14 jours, `:30-31`), limite de débit (`:131-142`), réponse identique (`:143-147`).

## Défauts de l'ancienne branche à ne pas reprendre

- `lib/auth.ts:156-160` : un échec d'envoi rend une erreur 500 pour une adresse éligible et une réponse silencieuse pour une adresse inconnue, ce qui contredit la réponse identique exigée par le plan (§ 4).
- Aucun test pour `safeInternalPath`, `localizedPath`, `decideTestMode`, `decideSignInEligibility` et le limiteur de débit.

## Ordre d'extraction au lot 1

1. `access-rules` et ses tests.
2. `mailer`.
3. Redirections sûres.
4. Clés de messages de connexion.
5. `sendMagicLinkMail`.
6. Limiteur.
7. Écrans et action de connexion.
8. Règle d'éligibilité.
