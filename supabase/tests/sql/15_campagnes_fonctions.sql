-- Lot 2 : fonctions de campagne et d'invitation (créer, ouvrir, clore, inviter).
-- Droit vérifié par la fonction (responsable de l'organisation ou administrateur
-- Tenga), journal à chaque action réussie, aucune trace des refus, jeton haché.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(63);

CREATE FUNCTION pg_temp.comme(p_uid uuid, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  IF p_sql ~* '^\s*select' THEN
    EXECUTE p_sql INTO v;
  ELSE
    EXECUTE p_sql;
    v := 'ok';
  END IF;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

-- Personnages : pa participant A, ra responsable A, ca consultant A, rb responsable B, ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test');
INSERT INTO app.organizations (id, slug, nom, statut) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A', 'active'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B', 'active'),
  ('a1000000-0000-4000-8000-00000000000c', 'org-c', 'Organisation archivée', 'archivee');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');

-- ===== Droits d'exécution =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'X')::text$q$), 'ERR:42501:permission denied for schema app', 'creer_campagne, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'X')::text$q$), 'ERR:42501:permission denied for function creer_campagne', 'creer_campagne, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.inviter('c0000000-0000-4000-8000-0000000000a1', 'x@example.test')::text$q$), 'ERR:42501:permission denied for function inviter', 'inviter, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'X')::text$q$), 'ERR:42501:Connexion requise', 'creer_campagne, rôle connecté sans identité : refusé');

-- ===== Créer =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_campagne, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_campagne, consultant affecté : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_campagne, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-0000000000ff', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_campagne, organisation inexistante : même refus (aucune fuite d''existence)');
SELECT is((SELECT count(*)::int FROM app.campaigns), 0, 'aucune campagne créée par ces refus');
SELECT matches(set_config('zz.ca', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', '  Campagne de test  ', 'ar')::text$q$), true),
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'creer_campagne, responsable : renvoie l''identifiant');
SELECT is((SELECT titre || '|' || langue || '|' || statut || '|' || cree_par::text || '|' || organization_id::text FROM app.campaigns WHERE id = current_setting('zz.ca')::uuid),
  'Campagne de test|ar|brouillon|a0000000-0000-4000-8000-000000000003|a1000000-0000-4000-8000-00000000000a', 'titre nettoyé, langue posée, brouillon, créateur et organisation corrects');
SELECT matches(set_config('zz.cb', pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000b', 'Campagne de B')::text$q$), true),
  '^[0-9a-f-]{36}$', 'creer_campagne, administrateur Tenga : crée dans n''importe quelle organisation');
SELECT is((SELECT langue FROM app.campaigns WHERE id = current_setting('zz.cb')::uuid), 'fr', 'langue par défaut : fr');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000c', 'X')::text$q$),
  'ERR:55000:Organisation archivée : aucune campagne possible', 'creer_campagne : organisation archivée refusée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', 'X', 'de')::text$q$),
  'ERR:22023:Langue inconnue : fr, ar ou en', 'creer_campagne : langue inconnue refusée');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_campagne('a1000000-0000-4000-8000-00000000000a', '   ')::text$q$),
  '^ERR:23514:', 'creer_campagne : titre vide refusé par la base');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'campagne.creer'), 2, 'deux créations journalisées, aucun refus');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'campagne.creer' AND ressource_type = 'campagne' AND ressource_id = current_setting('zz.ca')::uuid
            AND organization_id = 'a1000000-0000-4000-8000-00000000000a' AND acteur = 'a0000000-0000-4000-8000-000000000003'), 1, 'la ligne de journal porte acteur, campagne et organisation');

-- ===== Inviter avant l'ouverture =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.inviter(%L, 'nour@example.test')::text$q$, current_setting('zz.ca'))),
  'ERR:55000:Campagne non ouverte : invitation impossible', 'inviter : une campagne en brouillon n''invite pas');

-- ===== Ouvrir =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'ouvrir_campagne, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'ouvrir_campagne, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'ouvrir_campagne, responsable d''une autre organisation, identifiant forgé : refusé');
SELECT is((SELECT statut FROM app.campaigns WHERE id = current_setting('zz.ca')::uuid), 'brouillon', 'la campagne est restée en brouillon après ces refus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  '', 'ouvrir_campagne, responsable : ouvre');
SELECT is((SELECT statut || '|' || (ouverte_le IS NOT NULL)::text || '|' || (cloture_le IS NULL)::text FROM app.campaigns WHERE id = current_setting('zz.ca')::uuid),
  'ouverte|true|true', 'statut ouverte, date d''ouverture posée, pas de clôture');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:55000:Seule une campagne en brouillon s''ouvre', 'ouvrir_campagne : déjà ouverte, refusé');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'campagne.ouvrir' AND ressource_id = current_setting('zz.ca')::uuid), 1, 'une seule ouverture journalisée');

-- ===== Inviter =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', format($q$select app.inviter(%L, 'nour@example.test')::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'inviter, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.inviter(%L, 'nour@example.test')::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'inviter, consultant affecté : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select app.inviter(%L, 'nour@example.test')::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'inviter, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme(NULL, 'anon', format($q$select app.inviter(%L, 'nour@example.test')::text$q$, current_setting('zz.ca'))),
  'ERR:42501:permission denied for schema app', 'inviter, anonyme : refusé');
SELECT is((SELECT count(*)::int FROM app.invitations), 0, 'aucune invitation créée par ces refus');

SELECT matches(set_config('zz.i1', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
  format($q$select concat_ws(' ', invitation, jeton, expire) from app.inviter(%L, '  Nour@Example.TEST ', '  Nour  ', 'Bienvenue', NULL)$q$, current_setting('zz.ca'))), true),
  '^[0-9a-f-]{36} [A-Za-z0-9_-]{43} ', 'inviter, responsable : renvoie l''identifiant, un jeton de 43 caractères base64url (32 octets) et l''expiration');
SELECT is((SELECT email || '|' || prenom || '|' || message || '|' || langue || '|' || invitant_id::text FROM app.invitations),
  'nour@example.test|Nour|Bienvenue|ar|a0000000-0000-4000-8000-000000000003', 'adresse normalisée, prénom nettoyé, langue de la campagne, invitant correct');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.i1'), ' ', 2), 'UTF8'))), 1,
  'la ligne stocke l''empreinte SHA-256 du jeton');
SELECT is((SELECT count(*)::int FROM app.invitations i WHERE i::text LIKE '%' || split_part(current_setting('zz.i1'), ' ', 2) || '%'), 0,
  'le jeton ne figure pas en clair dans la table');
SELECT is((SELECT expire_le - cree_le FROM app.invitations), interval '14 days', 'l''invitation expire 14 jours après sa création');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'invitation.creer' AND acteur = 'a0000000-0000-4000-8000-000000000003'), 1, 'la création est journalisée');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal');

-- Réinviter la même adresse renouvelle le jeton (une seule invitation en attente)
SELECT matches(set_config('zz.i2', pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select concat_ws(' ', invitation, jeton, expire) from app.inviter(%L, 'nour@example.test', 'Nour', NULL, 'en')$q$, current_setting('zz.ca'))), true),
  '^[0-9a-f-]{36} [A-Za-z0-9_-]{43} ', 'inviter, administrateur Tenga : réinvite la même adresse');
SELECT is((SELECT count(*)::int FROM app.invitations), 1, 'toujours une seule invitation en attente pour cette adresse');
SELECT is(split_part(current_setting('zz.i2'), ' ', 1), split_part(current_setting('zz.i1'), ' ', 1), 'c''est la même invitation, renouvelée');
SELECT isnt(split_part(current_setting('zz.i2'), ' ', 2), split_part(current_setting('zz.i1'), ' ', 2), 'le jeton est nouveau');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.i1'), ' ', 2), 'UTF8'))), 0,
  'l''ancien jeton ne correspond plus à rien');
SELECT is((SELECT langue || '|' || invitant_id::text FROM app.invitations), 'en|a0000000-0000-4000-8000-000000000008', 'langue et invitant mis à jour par la réinvitation');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select invitation::text from app.inviter(%L, 'pas-une-adresse')$q$, current_setting('zz.ca'))),
  '^ERR:23514:', 'inviter : adresse invalide refusée par la base');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select invitation::text from app.inviter(%L, 'x@example.test', NULL, NULL, 'de')$q$, current_setting('zz.ca'))),
  'ERR:22023:Langue inconnue : fr, ar ou en', 'inviter : langue inconnue refusée');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select invitation::text from app.inviter(%L, 'x@example.test', NULL, %L)$q$, current_setting('zz.ca'), repeat('m', 1001))),
  '^ERR:23514:', 'inviter : message de plus de 1000 caractères refusé');
SELECT is((SELECT count(*)::int FROM app.invitations), 1, 'les refus n''ont créé aucune invitation');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'invitation.creer'), 2, 'création et réinvitation journalisées, aucun refus');

-- ===== Clore =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'clore_campagne, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'clore_campagne, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'clore_campagne, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.cb'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'clore_campagne, responsable A sur une campagne de B : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.cb'))),
  'ERR:55000:Seule une campagne ouverte se clôt', 'clore_campagne : un brouillon ne se clôt pas');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.ca'))),
  '', 'clore_campagne, responsable : clôt');
SELECT is((SELECT statut || '|' || (cloture_le IS NOT NULL)::text FROM app.campaigns WHERE id = current_setting('zz.ca')::uuid), 'close|true', 'statut close, date de clôture posée');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE campaign_id = current_setting('zz.ca')::uuid), 0, 'la clôture efface les invitations restées sans réponse (adresses comprises)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'campagne.clore' AND ressource_id = current_setting('zz.ca')::uuid AND quantite = 0), 1, 'la clôture est journalisée avec le nombre de participations terminées');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:55000:Seule une campagne ouverte se clôt', 'clore_campagne : déjà close, refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.ouvrir_campagne(%L)::text$q$, current_setting('zz.ca'))),
  'ERR:55000:Seule une campagne en brouillon s''ouvre', 'ouvrir_campagne : une campagne close ne se rouvre pas');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select invitation::text from app.inviter(%L, 'tard@example.test')$q$, current_setting('zz.ca'))),
  'ERR:55000:Campagne non ouverte : invitation impossible', 'inviter : une campagne close n''invite plus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$update app.campaigns set statut = 'ouverte' where id = %L$q$, current_setting('zz.ca'))),
  'ERR:42501:permission denied for table campaigns', 'une campagne close ne se rouvre pas par écriture directe');

SELECT * FROM finish();
