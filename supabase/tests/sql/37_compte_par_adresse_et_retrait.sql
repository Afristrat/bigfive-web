-- Migration 0013 (T14, findings I-F2 et I-F3) : app.compte_par_adresse(text) et
-- app.retirer_compte_sans_appartenance(uuid), exécutables par service_role seul.
-- Recherche : par adresse exacte (casse et espaces ignorés), sans parcours de
-- liste, NULL pour une adresse inconnue, vide, NULL, SSO ou piégée ; ne
-- journalise rien. Retrait : un compte SANS aucune appartenance part (profil en
-- cascade, une ligne de journal au nom de l'identifiant, jamais d'adresse) ; un
-- compte rattaché (appartenance, administrateur Tenga, participation,
-- invitation envoyée, campagne créée) est conservé et la base répond faux ;
-- rejouer, ignorer ou passer NULL répond faux. anon et authenticated refusés.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(40);

CREATE FUNCTION pg_temp.comme(p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  EXECUTE p_sql INTO v;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

CREATE FUNCTION pg_temp.cherche(p_role text, p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_role, format($q$select app.compte_par_adresse(%L)::text$q$, p_email))
$$;

CREATE FUNCTION pg_temp.retire(p_role text, p_id uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_role, format($q$select app.retirer_compte_sans_appartenance(%L)::text$q$, p_id))
$$;

CREATE FUNCTION pg_temp.existe(p_id uuid) RETURNS integer
LANGUAGE sql AS $$
  SELECT (SELECT count(*)::int FROM auth.users WHERE id = p_id)
$$;

-- Personnages. libre, libre2 : aucun lien. membre : membre d'une organisation.
-- admin : administrateur Tenga. partic : une participation, rien d'autre.
-- invitant : a envoyé une invitation. createur : a créé une campagne. sso : compte SSO.
INSERT INTO auth.users (id, email) VALUES
  ('e3000000-0000-4000-8000-000000000001', 'libre@example.test'),
  ('e3000000-0000-4000-8000-000000000002', 'membre@example.test'),
  ('e3000000-0000-4000-8000-000000000003', 'admin@example.test'),
  ('e3000000-0000-4000-8000-000000000004', 'partic@example.test'),
  ('e3000000-0000-4000-8000-000000000005', 'invitant@example.test'),
  ('e3000000-0000-4000-8000-000000000006', 'createur@example.test'),
  ('e3000000-0000-4000-8000-000000000008', 'libre2@example.test');
INSERT INTO auth.users (id, email, is_sso_user) VALUES
  ('e3000000-0000-4000-8000-000000000007', 'sso@example.test', true);
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('e3100000-0000-4000-8000-00000000000a', 'org-t14', 'Organisation T14');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('e3000000-0000-4000-8000-000000000002', 'e3100000-0000-4000-8000-00000000000a', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('e3000000-0000-4000-8000-000000000003');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cree_par) VALUES
  ('e3200000-0000-4000-8000-0000000000a1', 'e3100000-0000-4000-8000-00000000000a', 'Campagne T14', 'ouverte', now(),
   'e3000000-0000-4000-8000-000000000006');
INSERT INTO app.participations (campaign_id, organization_id, user_id) VALUES
  ('e3200000-0000-4000-8000-0000000000a1', 'e3100000-0000-4000-8000-00000000000a', 'e3000000-0000-4000-8000-000000000004');
INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES
  ('e3200000-0000-4000-8000-0000000000a1', 'e3100000-0000-4000-8000-00000000000a', 'cible@example.test',
   'e3000000-0000-4000-8000-000000000005', 'fr', sha256('jeton-t14'), now() + interval '14 days');

-- ===== Structure =====
SELECT has_function('app', 'compte_par_adresse', ARRAY['text'], 'app.compte_par_adresse(text) existe');
SELECT has_function('app', 'retirer_compte_sans_appartenance', ARRAY['uuid'], 'app.retirer_compte_sans_appartenance(uuid) existe');
SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE oid IN ('app.compte_par_adresse(text)'::regprocedure, 'app.retirer_compte_sans_appartenance(uuid)'::regprocedure)
      AND prosecdef AND proconfig = ARRAY['search_path=""']::text[] AND proowner = 'tenga_owner'::regrole),
  2, 'les deux fonctions : SECURITY DEFINER, search_path vide, propriétaire tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE oid IN ('app.compte_par_adresse(text)'::regprocedure, 'app.retirer_compte_sans_appartenance(uuid)'::regprocedure)
      AND has_function_privilege('service_role', oid, 'EXECUTE')),
  2, 'service_role exécute les deux fonctions');
SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE oid IN ('app.compte_par_adresse(text)'::regprocedure, 'app.retirer_compte_sans_appartenance(uuid)'::regprocedure)
      AND (has_function_privilege('anon', oid, 'EXECUTE')
        OR has_function_privilege('authenticated', oid, 'EXECUTE')
        OR has_function_privilege('public', oid, 'EXECUTE'))),
  0, 'ni anon, ni authenticated, ni PUBLIC n''exécutent l''une ou l''autre');
SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE oid IN ('app.compte_par_adresse(text)'::regprocedure, 'app.retirer_compte_sans_appartenance(uuid)'::regprocedure)
      AND pg_get_functiondef(oid) LIKE '%search_path%'),
  2, 'search_path figé dans la définition des deux fonctions');

-- ===== Recherche par adresse =====
SELECT is(pg_temp.cherche('service_role', 'libre@example.test'), 'e3000000-0000-4000-8000-000000000001',
  'recherche : l''adresse exacte donne l''identifiant du compte');
SELECT is(pg_temp.cherche('service_role', '  LIBRE@Example.TEST '), 'e3000000-0000-4000-8000-000000000001',
  'recherche : casse et espaces autour ignorés');
SELECT is(pg_temp.cherche('service_role', 'inconnue@example.test'), NULL,
  'recherche : adresse inconnue, NULL');
SELECT is(pg_temp.cherche('service_role', 'sso@example.test'), NULL,
  'recherche : un compte SSO n''est pas retrouvé');
SELECT is(pg_temp.cherche('service_role', NULL), NULL, 'recherche : adresse NULL, NULL');
SELECT is(pg_temp.cherche('service_role', ''), NULL, 'recherche : adresse vide, NULL');
SELECT is(pg_temp.cherche('service_role', '''" OR ''1''=''1'), NULL, 'recherche : adresse piégée (apostrophes, SQL), NULL');
SELECT is(pg_temp.cherche('service_role', 'libre@example.test%'), NULL, 'recherche : aucun motif (joker %) interprété');
SELECT matches(pg_temp.cherche('anon', 'libre@example.test'), '^ERR:42501:', 'recherche : anon refusé (42501)');
SELECT matches(pg_temp.cherche('authenticated', 'libre@example.test'), '^ERR:42501:', 'recherche : authenticated refusé (42501)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action LIKE 'compte.%'), 0,
  'la recherche ne journalise rien');

-- ===== Retrait d'un compte sans appartenance =====
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000001'), 'true',
  'retrait : un compte sans aucun lien est retiré (vrai)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000001'), 0, 'retrait : le compte n''existe plus');
SELECT is((SELECT count(*)::int FROM app.profiles WHERE user_id = 'e3000000-0000-4000-8000-000000000001'), 0,
  'retrait : son profil est parti en cascade');
SELECT is(pg_temp.cherche('service_role', 'libre@example.test'), NULL, 'retrait : l''adresse n''est plus retrouvée');
SELECT is(
  (SELECT count(*)::int FROM private.audit_log
    WHERE action = 'compte.retirer_orphelin' AND ressource_type = 'utilisateur'
      AND ressource_id = 'e3000000-0000-4000-8000-000000000001' AND acteur = 'e3000000-0000-4000-8000-000000000001'),
  1, 'retrait : une ligne de journal au nom de l''identifiant du compte');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE to_jsonb(audit_log)::text ~* 'example\.test'), 0,
  'retrait : aucune adresse dans le journal');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000001'), 'false', 'retrait rejoué : faux');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-0000000000ff'), 'false', 'retrait d''un identifiant inconnu : faux');
SELECT is(pg_temp.comme('service_role', 'select app.retirer_compte_sans_appartenance(NULL)::text'), 'false', 'retrait de NULL : faux');

-- ===== Un compte rattaché est conservé =====
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000002'), 'false', 'membre : conservé (faux)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000002'), 1, 'membre : toujours présent');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000003'), 'false', 'administrateur Tenga : conservé (faux)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000003'), 1, 'administrateur Tenga : toujours présent');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000004'), 'false', 'participation : conservé (faux)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000004'), 1, 'participation : compte toujours présent');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000005'), 'false', 'invitant : conservé (faux)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000005'), 1, 'invitant : toujours présent');
SELECT is(pg_temp.retire('service_role', 'e3000000-0000-4000-8000-000000000006'), 'false', 'créateur de campagne : conservé (faux)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000006'), 1, 'créateur de campagne : toujours présent');

-- ===== anon et authenticated ne retirent rien =====
SELECT matches(pg_temp.retire('anon', 'e3000000-0000-4000-8000-000000000008'), '^ERR:42501:', 'retrait : anon refusé (42501)');
SELECT matches(pg_temp.retire('authenticated', 'e3000000-0000-4000-8000-000000000008'), '^ERR:42501:', 'retrait : authenticated refusé (42501)');
SELECT is(pg_temp.existe('e3000000-0000-4000-8000-000000000008'), 1, 'les refus n''ont retiré aucun compte');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'compte.retirer_orphelin'), 1,
  'seul le retrait réussi est journalisé (aucune trace des refus ni des conservations)');

SELECT * FROM finish();
