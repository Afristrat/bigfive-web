-- Migration 0014 (T19) : plafonds journaliers d'invitations tenus en base :
-- private.plafonds_invitations et app.consommer_plafond_invitation(uuid, text,
-- integer, integer, integer), exécutable par service_role seul.
-- Table : RLS activée et forcée, aucune lecture ni écriture pour anon,
-- authenticated ni service_role, trois règles réservées à tenga_owner, quatre
-- colonnes (jamais d'adresse), clé de 32 octets, portée bornée.
-- Fonction : vérifie ET consomme. 'accepte' ajoute un événement à l'organisation
-- et au destinataire ; 'refuse_organisation' et 'refuse_destinataire' ne
-- consomment RIEN (organisation contrôlée d'abord) ; le destinataire compte
-- toutes organisations confondues ; fenêtre glissante paramétrable (les
-- événements plus anciens que la fenêtre ne comptent plus) ; purge des
-- événements de plus de 48 heures à chaque appel ; paramètres invalides (NULL,
-- empreinte qui n'est pas 64 caractères hexadécimaux minuscules, plafond hors
-- de 1 à 100000, fenêtre hors de 60 à 172800 secondes) : 22023, sans écriture ;
-- l'empreinte reçue n'est jamais stockée telle quelle (HMAC de private.settings) ;
-- aucune ligne de journal. Le verrou consultatif qui évite le dépassement en
-- concurrence est vérifié dans la définition ici ; l'essai en parallèle réel
-- est scripts/concurrence-plafonds.sh (base jetable, à brancher dans jetable.sh).
-- Les valeurs 300 et 5 ne sont pas dans la base : l'application les transmet
-- (défauts non validés par Amine) ; ce test emploie des plafonds de 2 et 3.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(57);

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

-- Appel de la fonction sous un rôle ; les arguments sont passés en texte pour
-- pouvoir fournir NULL et des valeurs hors limites.
CREATE FUNCTION pg_temp.conso(
  p_role text, p_org text, p_dest text, p_max_org text, p_max_dest text, p_fenetre text DEFAULT '86400'
) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_role, format(
    $q$select app.consommer_plafond_invitation(%L::uuid, %L::text, %L::integer, %L::integer, %L::integer)$q$,
    p_org, p_dest, p_max_org, p_max_dest, p_fenetre))
$$;

-- Empreinte transmise par l'application : condensat hexadécimal de 64 caractères.
CREATE FUNCTION pg_temp.d(p_texte text) RETURNS text
LANGUAGE sql AS $$
  SELECT encode(sha256(convert_to(p_texte, 'UTF8')), 'hex')
$$;

-- Clé attendue en table : HMAC de la valeur reçue avec la clé de la base.
CREATE FUNCTION pg_temp.cle(p_portee text, p_valeur text) RETURNS bytea
LANGUAGE sql AS $$
  SELECT extensions.hmac(convert_to('plafond-invitation:' || p_portee || ':' || p_valeur, 'UTF8'),
                         (SELECT s.cle_hmac_code FROM private.settings s), 'sha256')
$$;

CREATE FUNCTION pg_temp.nb(p_portee text, p_valeur text) RETURNS integer
LANGUAGE sql AS $$
  SELECT (SELECT count(*)::int FROM private.plafonds_invitations
           WHERE portee = p_portee AND cle = pg_temp.cle(p_portee, p_valeur))
$$;

-- Organisations (aucune ligne app.organizations n'est requise : la fonction ne
-- lit que la clé) et état initial du journal.
SELECT set_config('t38.audit', (SELECT count(*) FROM private.audit_log)::text, true);

-- ===== Structure =====
SELECT has_table('private', 'plafonds_invitations', 'private.plafonds_invitations existe');
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity AND relowner = 'tenga_owner'::regrole
     FROM pg_class WHERE oid = 'private.plafonds_invitations'::regclass),
  'la table a la RLS activée, forcée, et appartient à tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
     CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS pr
    WHERE has_table_privilege(r.rol, 'private.plafonds_invitations', pr)),
  0, 'anon, authenticated et service_role n''ont aucun droit sur la table');
SELECT is(
  (SELECT string_agg(policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY policyname)
     FROM pg_policies WHERE schemaname = 'private' AND tablename = 'plafonds_invitations'),
  E'plafonds_insertion_owner|INSERT|tenga_owner\nplafonds_lecture_owner|SELECT|tenga_owner\nplafonds_suppression_owner|DELETE|tenga_owner',
  'trois règles, toutes réservées à tenga_owner (pas de modification)');
SELECT is(
  (SELECT array_agg(attname ORDER BY attnum) FROM pg_attribute
    WHERE attrelid = 'private.plafonds_invitations'::regclass AND attnum > 0 AND NOT attisdropped),
  ARRAY['id', 'portee', 'cle', 'cree_le']::name[],
  'quatre colonnes seulement : aucune colonne d''adresse');
SELECT has_function('app', 'consommer_plafond_invitation', ARRAY['uuid', 'text', 'integer', 'integer', 'integer'],
  'app.consommer_plafond_invitation(uuid, text, integer, integer, integer) existe');
SELECT is(
  (SELECT count(*)::int FROM pg_proc
    WHERE oid = 'app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure
      AND prosecdef AND proconfig = ARRAY['search_path=""']::text[] AND proowner = 'tenga_owner'::regrole),
  1, 'SECURITY DEFINER, search_path vide, propriétaire tenga_owner');
SELECT ok(has_function_privilege('service_role',
  'app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure, 'EXECUTE'),
  'service_role exécute la fonction');
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'public']) AS r(rol)
    WHERE has_function_privilege(r.rol,
      'app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure, 'EXECUTE')),
  0, 'ni anon, ni authenticated, ni PUBLIC n''exécutent la fonction');
SELECT ok(
  pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure)
    LIKE '%pg_advisory_xact_lock%',
  'la définition prend un verrou consultatif de transaction (pas de dépassement en concurrence)');

-- ===== Contraintes de la table =====
SELECT throws_ok(
  $q$INSERT INTO private.plafonds_invitations (portee, cle) VALUES ('adresse', sha256('x'))$q$,
  '23514', NULL, 'la portée est bornée à organisation et destinataire');
SELECT throws_ok(
  $q$INSERT INTO private.plafonds_invitations (portee, cle) VALUES ('organisation', '\x0102'::bytea)$q$,
  '23514', NULL, 'la clé fait exactement 32 octets');

-- ===== Accepté : un événement par compteur =====
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('a'), '3', '2'), 'accepte',
  'premier appel : accepte');
SELECT is(pg_temp.nb('organisation', 'e5000000-0000-4000-8000-0000000000a1'), 1, 'un événement pour l''organisation');
SELECT is(pg_temp.nb('destinataire', pg_temp.d('a')), 1, 'un événement pour le destinataire');

-- ===== Plafond de l'organisation (3) =====
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('b'), '3', '2'), 'accepte',
  'organisation : deuxième invitation acceptée');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('c'), '3', '2'), 'accepte',
  'organisation : troisième invitation acceptée (le plafond est inclus)');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('d'), '3', '2'), 'refuse_organisation',
  'organisation : la quatrième est refusée');
SELECT is(pg_temp.nb('organisation', 'e5000000-0000-4000-8000-0000000000a1'), 3,
  'organisation : le refus n''a rien consommé (3 événements)');
SELECT is(pg_temp.nb('destinataire', pg_temp.d('d')), 0,
  'organisation : le destinataire refusé n''a rien consommé');

-- ===== Autre organisation, même destinataire (plafond du destinataire, 2) =====
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('d'), '3', '2'), 'accepte',
  'une autre organisation n''est pas touchée par le plafond de la première');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('a'), '3', '2'), 'accepte',
  'le destinataire déjà invité dans une autre organisation compte (2e événement)');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('a'), '3', '2'), 'refuse_destinataire',
  'destinataire : le troisième e-mail du jour, toutes organisations confondues, est refusé');
SELECT is(pg_temp.nb('organisation', 'e5000000-0000-4000-8000-0000000000a2'), 2,
  'destinataire : le refus n''a pas consommé l''organisation');
SELECT is(pg_temp.nb('destinataire', pg_temp.d('a')), 2, 'destinataire : toujours 2 événements');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('a'), '3', '2'), 'refuse_organisation',
  'les deux plafonds atteints : l''organisation est contrôlée d''abord');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('z'), '3', '2'), 'accepte',
  'un autre destinataire reste libre');

-- ===== Fenêtre glissante =====
UPDATE private.plafonds_invitations SET cree_le = now() - interval '25 hours'
 WHERE portee = 'organisation' AND cle = pg_temp.cle('organisation', 'e5000000-0000-4000-8000-0000000000a1');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a1', pg_temp.d('e'), '3', '2'), 'accepte',
  'fenêtre : les événements de 25 heures ne comptent plus (fenêtre de 24 heures)');
UPDATE private.plafonds_invitations SET cree_le = now() - interval '23 hours'
 WHERE portee = 'organisation' AND cle = pg_temp.cle('organisation', 'e5000000-0000-4000-8000-0000000000a2');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('f'), '3', '2', '86400'), 'refuse_organisation',
  'fenêtre : les événements de 23 heures comptent encore dans une fenêtre de 24 heures');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a2', pg_temp.d('f'), '3', '2', '79200'), 'accepte',
  'fenêtre paramétrable : les événements de 23 heures ne comptent pas dans une fenêtre de 22 heures');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a3', pg_temp.d('g'), '3', '2', '172800'), 'accepte',
  'fenêtre maximale (172 800 secondes) acceptée');

-- ===== Purge des événements de plus de 48 heures =====
INSERT INTO private.plafonds_invitations (portee, cle, cree_le) VALUES
  ('organisation', sha256('purge-ancien'), now() - interval '49 hours'),
  ('destinataire', sha256('purge-ancien-2'), now() - interval '72 hours'),
  ('organisation', sha256('purge-recent'), now() - interval '47 hours');
SELECT is(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a4', pg_temp.d('h'), '3', '2'), 'accepte',
  'purge : l''appel réussit');
SELECT is((SELECT count(*)::int FROM private.plafonds_invitations WHERE cree_le < now() - interval '48 hours'), 0,
  'purge : plus aucun événement de plus de 48 heures');
SELECT is((SELECT count(*)::int FROM private.plafonds_invitations WHERE cle = sha256('purge-recent')), 1,
  'purge : l''événement de 47 heures est conservé');

-- ===== Paramètres invalides : 22023, sans écriture =====
SELECT set_config('t38.avant', (SELECT count(*) FROM private.plafonds_invitations)::text, true);
SELECT matches(pg_temp.conso('service_role', NULL, pg_temp.d('i'), '3', '2'), '^ERR:22023:', 'invalide : organisation NULL');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', NULL, '3', '2'), '^ERR:22023:', 'invalide : empreinte NULL');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', 'adresse@example.test', '3', '2'), '^ERR:22023:',
  'invalide : une adresse n''est pas une empreinte');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', upper(pg_temp.d('i')), '3', '2'), '^ERR:22023:',
  'invalide : empreinte en majuscules');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i') || '0', '3', '2'), '^ERR:22023:',
  'invalide : empreinte de 65 caractères');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '0', '2'), '^ERR:22023:', 'invalide : plafond d''organisation à 0');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '100001', '2'), '^ERR:22023:', 'invalide : plafond d''organisation à 100001');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), NULL, '2'), '^ERR:22023:', 'invalide : plafond d''organisation NULL');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '3', '0'), '^ERR:22023:', 'invalide : plafond de destinataire à 0');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '3', NULL), '^ERR:22023:', 'invalide : plafond de destinataire NULL');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '3', '2', '59'), '^ERR:22023:', 'invalide : fenêtre de 59 secondes');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '3', '2', '172801'), '^ERR:22023:',
  'invalide : fenêtre de 172 801 secondes (plus longue que la conservation)');
SELECT matches(pg_temp.conso('service_role', 'e5000000-0000-4000-8000-0000000000a5', pg_temp.d('i'), '3', '2', NULL), '^ERR:22023:', 'invalide : fenêtre NULL');
SELECT is((SELECT count(*)::text FROM private.plafonds_invitations), current_setting('t38.avant'),
  'aucun paramètre invalide n''a écrit quoi que ce soit');

-- ===== Aucune adresse ni empreinte reçue dans la table =====
SELECT is((SELECT count(*)::int FROM private.plafonds_invitations WHERE cle = decode(pg_temp.d('a'), 'hex')), 0,
  'l''empreinte reçue n''est pas stockée telle quelle (la clé est un HMAC de la base)');
SELECT is((SELECT count(*)::int FROM private.plafonds_invitations p
            WHERE to_jsonb(p)::text ~* (pg_temp.d('a') || '|' || 'e5000000-0000-4000-8000-0000000000a1')), 0,
  'aucune ligne ne contient l''empreinte reçue ni l''identifiant de l''organisation en clair');

-- ===== anon et authenticated : refusés, rien d'écrit =====
SELECT set_config('t38.avant', (SELECT count(*) FROM private.plafonds_invitations)::text, true);
SELECT matches(pg_temp.conso('anon', 'e5000000-0000-4000-8000-0000000000a6', pg_temp.d('j'), '3', '2'), '^ERR:42501:', 'anon refusé (42501)');
SELECT matches(pg_temp.conso('authenticated', 'e5000000-0000-4000-8000-0000000000a6', pg_temp.d('j'), '3', '2'), '^ERR:42501:', 'authenticated refusé (42501)');
SELECT is((SELECT count(*)::text FROM private.plafonds_invitations), current_setting('t38.avant'),
  'les refus d''anon et d''authenticated n''ont rien écrit');
SELECT matches(pg_temp.comme('service_role', 'select count(*)::text from private.plafonds_invitations'), '^ERR:42501:',
  'service_role ne lit pas la table directement (42501)');
SELECT matches(pg_temp.comme('authenticated', 'select count(*)::text from private.plafonds_invitations'), '^ERR:42501:',
  'authenticated ne lit pas la table (42501)');
SELECT matches(pg_temp.comme('anon', 'select count(*)::text from private.plafonds_invitations'), '^ERR:42501:',
  'anon ne lit pas la table (42501)');

-- ===== Aucune ligne de journal =====
SELECT is((SELECT count(*)::text FROM private.audit_log), current_setting('t38.audit'),
  'aucun appel (accepté, refusé, invalide) n''écrit dans le journal');

SELECT * FROM finish();
