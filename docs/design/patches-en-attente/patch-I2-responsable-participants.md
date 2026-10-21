# Patch I2 : le responsable n'invite que des participants (NON APPLIQUÉ, en attente de la décision d'Amine)

## 1. Application : `web/src/lib/access-rules.ts:118-129`

```ts
/**
 * Rôles que le lecteur peut attribuer dans l'organisation : l'administrateur
 * Tenga les trois, le responsable de l'organisation les participants seuls,
 * personne d'autre. Sert de pré-contrôle avant tout effet de bord.
 */
export function assignableRoles(viewer: OrgViewer | null): readonly OrgRole[] {
  if (!viewer) return [];
  if (viewer.isTengaAdmin) return orgRoles;
  return viewer.roleInOrganization === 'responsable' ? ['participant'] : [];
}
```

Effet induit : `memberInviteRoles` renvoie `[]` pour un responsable ; le formulaire `member-invite-form` ne doit alors pas s'afficher pour lui (à vérifier dans `app/[locale]/o/[slug]/page.tsx`).
Test à adapter : `web/tests/unit/access-rules.test.ts`, bloc `describe('assignableRoles')` (ligne 279) : un responsable obtient `['participant']`.

## 2. Base : nouvelle migration `supabase/migrations/0012_responsable_participants_seuls.sql`

(la 0011 est le lot mot de passe non publiable : appliquer la 0012 avec un dossier qui l'exclut)

```sql
-- 0012 : un responsable d'organisation n'attribue plus que le rôle participant.
-- Consultant et responsable sont nommés par l'administrateur Tenga seul (décision I2).
CREATE OR REPLACE FUNCTION private.peut_attribuer(p_organisation uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    app.suis_admin_tenga()
    OR (p_role = 'participant' AND app.mon_role(p_organisation) = 'responsable'),
    false)
$$;
```

Procédure : sauvegarde chiffrée, épreuve en transaction annulée (un responsable qui tente `app.attribuer_role(..., 'consultant')` doit être refusé), puis `sh scripts/migrate.sh tenga-sb <dossier 0012 seule>`.

## 3. Texte de confidentialité

`web/src/lib/invitation-mail.ts:57-58` reste juste avec cette option (« le consultant Tenga affecté »), aucun changement.

## Option inverse (si Amine garde le droit du responsable)

Remplacer la phrase `privacy` par :
« Ce que nous tenons à vous dire d'abord : votre résultat individuel n'est visible que de vous, des consultants désignés pour {organisation} et de l'équipe d'administration de Tenga Conseil. »
