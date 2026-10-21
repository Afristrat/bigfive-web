-- Socle du lot 1 : structure (contraintes, clés étrangères, déclencheur de
-- profil, verrous) et listes figées (règles, droits sur les tables, fonctions
-- exécutables par l'API). Toute règle ou tout droit ajouté ou retiré fait
-- échouer ce fichier : c'est voulu, la liste se relit en revue.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(28);

-- Règles figées (plan § 7 : « la liste des règles est figée »)
SELECT is(
  (SELECT string_agg(schemaname || '.' || tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','),
                     E'\n' ORDER BY schemaname, tablename, policyname)
     FROM pg_policies WHERE schemaname IN ('app', 'private')),
  $f$app.attempts|attempts_insertion_owner|INSERT|tenga_owner
app.attempts|attempts_lecture_owner|SELECT|tenga_owner
app.attempts|attempts_lecture_proprietaire|SELECT|authenticated
app.attempts|attempts_modification_owner|UPDATE|tenga_owner
app.attempts|attempts_suppression_owner|DELETE|tenga_owner
app.campaigns|campaigns_insertion_owner|INSERT|tenga_owner
app.campaigns|campaigns_lecture|SELECT|authenticated
app.campaigns|campaigns_lecture_owner|SELECT|tenga_owner
app.campaigns|campaigns_modification_owner|UPDATE|tenga_owner
app.group_aggregates|group_aggregates_insertion_owner|INSERT|tenga_owner
app.group_aggregates|group_aggregates_lecture|SELECT|authenticated
app.group_aggregates|group_aggregates_lecture_owner|SELECT|tenga_owner
app.group_members|group_members_insertion_owner|INSERT|tenga_owner
app.group_members|group_members_lecture|SELECT|authenticated
app.group_members|group_members_lecture_owner|SELECT|tenga_owner
app.group_members|group_members_suppression_owner|DELETE|tenga_owner
app.groups|groups_insertion_owner|INSERT|tenga_owner
app.groups|groups_lecture|SELECT|authenticated
app.groups|groups_lecture_owner|SELECT|tenga_owner
app.groups|groups_modification_owner|UPDATE|tenga_owner
app.groups|groups_suppression_owner|DELETE|tenga_owner
app.invitations|invitations_insertion_owner|INSERT|tenga_owner
app.invitations|invitations_lecture_owner|SELECT|tenga_owner
app.invitations|invitations_lecture_responsable|SELECT|authenticated
app.invitations|invitations_modification_owner|UPDATE|tenga_owner
app.invitations|invitations_suppression_owner|DELETE|tenga_owner
app.memberships|memberships_insertion_owner|INSERT|tenga_owner
app.memberships|memberships_lecture|SELECT|authenticated
app.memberships|memberships_lecture_owner|SELECT|tenga_owner
app.memberships|memberships_modification_owner|UPDATE|tenga_owner
app.memberships|memberships_suppression_owner|DELETE|tenga_owner
app.organizations|organizations_insertion_owner|INSERT|tenga_owner
app.organizations|organizations_lecture|SELECT|authenticated
app.organizations|organizations_lecture_owner|SELECT|tenga_owner
app.organizations|organizations_modification_owner|UPDATE|tenga_owner
app.participations|participations_insertion_owner|INSERT|tenga_owner
app.participations|participations_lecture_owner|SELECT|tenga_owner
app.participations|participations_lecture_proprietaire|SELECT|authenticated
app.participations|participations_lecture_responsable|SELECT|authenticated
app.participations|participations_modification_owner|UPDATE|tenga_owner
app.profiles|profiles_insertion_owner|INSERT|tenga_owner
app.profiles|profiles_lecture_owner|SELECT|tenga_owner
app.profiles|profiles_lecture_proprietaire|SELECT|authenticated
app.profiles|profiles_modification_owner|UPDATE|tenga_owner
app.results|results_insertion_owner|INSERT|tenga_owner
app.results|results_lecture_owner|SELECT|tenga_owner
app.results|results_lecture_proprietaire|SELECT|authenticated
app.results|results_suppression_owner|DELETE|tenga_owner
private.agregats_poses|agregats_poses_insertion_owner|INSERT|tenga_owner
private.agregats_poses|agregats_poses_lecture_owner|SELECT|tenga_owner
private.audit_log|audit_insertion_owner|INSERT|tenga_owner
private.audit_log|audit_lecture_owner|SELECT|tenga_owner
private.audit_log|audit_suppression_owner|DELETE|tenga_owner
private.demandes_lien|demandes_insertion_owner|INSERT|tenga_owner
private.demandes_lien|demandes_lecture_owner|SELECT|tenga_owner
private.demandes_lien|demandes_suppression_owner|DELETE|tenga_owner
private.echecs_code|echecs_insertion_owner|INSERT|tenga_owner
private.echecs_code|echecs_lecture_owner|SELECT|tenga_owner
private.echecs_code|echecs_modification_owner|UPDATE|tenga_owner
private.echecs_code|echecs_suppression_owner|DELETE|tenga_owner
private.leurre_connexion|leurre_insertion_owner|INSERT|tenga_owner
private.leurre_connexion|leurre_lecture_owner|SELECT|tenga_owner
private.leurre_connexion|leurre_suppression_owner|DELETE|tenga_owner
private.liens_connexion|liens_insertion_owner|INSERT|tenga_owner
private.liens_connexion|liens_lecture_owner|SELECT|tenga_owner
private.liens_connexion|liens_modification_owner|UPDATE|tenga_owner
private.liens_connexion|liens_suppression_owner|DELETE|tenga_owner
private.settings|settings_lecture|SELECT|tenga_owner
private.settings|settings_modification|UPDATE|tenga_owner
private.tenga_admins|tenga_admins_lecture_owner|SELECT|tenga_owner$f$,
  'liste figée des règles de app et private');

SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname IN ('app', 'private') AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND NOT (roles = ARRAY['tenga_owner']::name[])),
  0, 'aucune règle d''écriture pour un autre rôle que tenga_owner (verrou 2)');

-- Droits figés sur les tables : le rôle connecté lit onze tables, en lecture seule, rien d'autre
SELECT is(
  (SELECT string_agg(n.nspname || '.' || c.relname || '>' || r.rol || '>' || x.privs, E'\n' ORDER BY n.nspname, c.relname, r.rol)
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
     CROSS JOIN LATERAL (SELECT string_agg(pr, ',' ORDER BY pr) AS privs
                           FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS pr
                          WHERE has_table_privilege(r.rol, c.oid, pr)) x
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p', 'v') AND x.privs IS NOT NULL),
  $f$app.attempts>authenticated>SELECT
app.campaigns>authenticated>SELECT
app.group_aggregates>authenticated>SELECT
app.group_members>authenticated>SELECT
app.groups>authenticated>SELECT
app.invitations>authenticated>SELECT
app.memberships>authenticated>SELECT
app.organizations>authenticated>SELECT
app.participations>authenticated>SELECT
app.profiles>authenticated>SELECT
app.results>authenticated>SELECT$f$,
  'droits figés : authenticated lit onze tables (SELECT seul) ; anon et service_role n''ont aucun droit sur les tables');

-- Fonctions exécutables par l'API, figées
SELECT is(
  (SELECT string_agg(n.nspname || '.' || p.proname || '>' || r.rol, E'\n' ORDER BY n.nspname, p.proname, r.rol)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE n.nspname IN ('app', 'private') AND has_function_privilege(r.rol, p.oid, 'EXECUTE')),
  $f$app.accepter_invitation>service_role
app.affecter_membre>authenticated
app.ajouter_admin_tenga>authenticated
app.attribuer_role>authenticated
app.clore_campagne>authenticated
app.consommer_code_connexion>service_role
app.consommer_lien_connexion>service_role
app.consulter_invitation>service_role
app.creer_campagne>authenticated
app.creer_groupe>authenticated
app.creer_organisation>authenticated
app.demander_lien_connexion>service_role
app.derniere_purge>service_role
app.effacer_compte>service_role
app.enregistrer_progression>authenticated
app.exporter_mes_donnees>authenticated
app.informer_responsable>authenticated
app.inviter>authenticated
app.lire_journal>authenticated
app.lire_resultat_individuel>authenticated
app.mes_resultats>authenticated
app.mettre_a_jour_profil>authenticated
app.mon_role>authenticated
app.ouvrir_campagne>authenticated
app.renommer_groupe>authenticated
app.retirer_admin_tenga>authenticated
app.retirer_membre>authenticated
app.retirer_role>authenticated
app.soumettre_resultat>authenticated
app.suis_admin_tenga>authenticated
app.suis_membre>authenticated
app.supprimer_groupe>authenticated
app.supprimer_mon_compte>authenticated$f$,
  'liste figée des fonctions exécutables par l''API');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND has_function_privilege('public', p.oid, 'EXECUTE')),
  0, 'aucune fonction de app ni private n''est exécutable par PUBLIC');

-- Verrou 4 : deux fonctions seulement créent des rôles (attribution réservée aux administrateurs ; acceptation d'invitation, rôle de participant uniquement, appelable par le serveur seul)
SELECT is(
  (SELECT string_agg(p.proname, ',' ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private')
      AND p.prosrc ~* 'insert\s+into\s+app\.memberships'),
  'accepter_invitation,attribuer_role', 'seules app.attribuer_role et app.accepter_invitation insèrent dans app.memberships (verrou 4)');

-- Toutes les fonctions SECURITY DEFINER de app et private ont un search_path vide
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND p.prosecdef
      AND NOT ('search_path=""' = ANY (COALESCE(p.proconfig, '{}')))),
  0, 'toute fonction SECURITY DEFINER de app et private a un search_path vide');

-- Cadre : fixtures
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'deux@example.test');

-- Déclencheur de profil
SELECT is(
  (SELECT langue FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000001'),
  'fr', 'un compte créé reçoit un profil, langue par défaut fr');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('a0000000-0000-4000-8000-000000000003', 'trois@example.test', '{"langue":"ar","nom":"  Yasmine  "}');
SELECT is(
  (SELECT langue || '|' || nom FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000003'),
  'ar|Yasmine', 'la langue et le nom des métadonnées sont repris, nom nettoyé');

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES ('a0000000-0000-4000-8000-000000000004', 'quatre@example.test', '{"langue":"xx"}');
SELECT is(
  (SELECT langue FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000004'),
  'fr', 'une langue inconnue des métadonnées retombe sur fr');

-- Comme GoTrue : le rôle supabase_auth_admin crée le compte, le profil naît quand même
SET LOCAL ROLE supabase_auth_admin;
DO $$ BEGIN
  INSERT INTO auth.users (id, email) VALUES ('a0000000-0000-4000-8000-000000000005', 'cinq@example.test');
  PERFORM set_config('zz.gotrue', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.gotrue', SQLSTATE || ' ' || SQLERRM, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.gotrue'), 'ok', 'supabase_auth_admin crée un compte sans erreur');
SELECT ok(EXISTS (SELECT 1 FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000005'),
  'le profil du compte créé par supabase_auth_admin existe');

-- Contraintes
INSERT INTO app.organizations (id, slug, nom) VALUES ('a1000000-0000-4000-8000-000000000001', 'org-a', 'Organisation A');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom) VALUES ('org-a', 'Doublon')$$,
  '23505', NULL, 'identifiant d''URL unique');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom) VALUES ('Org-Majuscule', 'X')$$,
  '23514', NULL, 'identifiant d''URL : majuscules refusées');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom) VALUES ('a', 'X')$$,
  '23514', NULL, 'identifiant d''URL : trop court refusé');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom) VALUES ('org--double', 'X')$$,
  '23514', NULL, 'identifiant d''URL : double tiret refusé');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom) VALUES ('-org-tiret', 'X')$$,
  '23514', NULL, 'identifiant d''URL : tiret en tête refusé');
SELECT throws_ok($$INSERT INTO app.organizations (slug, nom, statut) VALUES ('org-statut', 'X', 'supprimee')$$,
  '23514', NULL, 'statut d''organisation borné');

INSERT INTO app.memberships (user_id, organization_id, role)
VALUES ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'participant');
SELECT throws_ok(
  $$INSERT INTO app.memberships (user_id, organization_id, role) VALUES ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'responsable')$$,
  '23505', NULL, 'un seul rôle par personne et par organisation (arbitrage 6)');
SELECT throws_ok(
  $$INSERT INTO app.memberships (user_id, organization_id, role) VALUES ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'administrateur')$$,
  '23514', NULL, 'rôle borné à responsable, consultant, participant');
SELECT throws_ok(
  $$INSERT INTO app.memberships (user_id, organization_id, role) VALUES ('a0000000-0000-4000-8000-0000000000ff', 'a1000000-0000-4000-8000-000000000001', 'participant')$$,
  '23503', NULL, 'une appartenance exige un compte existant');
SELECT throws_ok($$UPDATE app.profiles SET langue = 'de' WHERE user_id = 'a0000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'langue de profil bornée à fr, ar, en');

-- Journal sans adresse e-mail : les seules colonnes texte sont bornées par un format sans arobase
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid = 'private.audit_log'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND a.atttypid = 'text'::regtype),
  'action,ressource_type', 'les seules colonnes texte du journal sont action et ressource_type, bornées par un format sans arobase');
SELECT throws_ok($$INSERT INTO private.audit_log (action) VALUES ('quelquun@example.test')$$,
  '23514', NULL, 'une adresse e-mail ne passe pas dans la colonne action');

-- Suppression de compte : cascade complète, journal conservé (identifiant pseudonyme)
-- Un second administrateur existe : la migration 0007 interdit de supprimer le dernier.
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000002');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000001');
INSERT INTO private.liens_connexion (user_id, jeton_hash, code_hash, expire_le)
VALUES ('a0000000-0000-4000-8000-000000000001', sha256('x'), sha256('y'), now() + interval '15 minutes');
INSERT INTO private.audit_log (acteur, action) VALUES ('a0000000-0000-4000-8000-000000000001', 'test.cascade');
DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000001';
SELECT is(
  (SELECT (SELECT count(*) FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM private.tenga_admins WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM private.liens_connexion WHERE user_id = 'a0000000-0000-4000-8000-000000000001'))::int,
  0, 'supprimer un compte efface profil, appartenances, administration et liens en cascade');
SELECT is(
  (SELECT count(*)::int FROM private.audit_log WHERE acteur = 'a0000000-0000-4000-8000-000000000001' AND action = 'test.cascade'),
  1, 'le journal garde la ligne, avec un identifiant devenu pseudonyme');

-- Déclencheur contre l'écriture par l'API (verrou 3) : présent et actif sur les quatre tables
SELECT is(
  (SELECT count(DISTINCT t.tgrelid)::int FROM pg_trigger t
    WHERE t.tgrelid IN ('app.profiles'::regclass, 'app.organizations'::regclass, 'app.memberships'::regclass, 'private.tenga_admins'::regclass)
      AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'),
  4, 'le déclencheur refuser_ecriture_api est actif sur profils, organisations, appartenances, administrateurs');
SELECT is(
  (SELECT count(*)::int FROM pg_trigger t WHERE t.tgrelid = 'private.audit_log'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O'),
  2, 'le journal porte ses deux déclencheurs de protection, actifs');

SELECT * FROM finish();
