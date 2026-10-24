-- AVERTISSEMENT : la production est la SEULE instance Tenga (aucune préproduction, aucune
-- base jetable). Ce script ne s'exécute qu'APRÈS une sauvegarde vérifiée de la base
-- (fichier présent, taille non nulle, restauration contrôlée). Il tourne tout entier dans
-- une transaction annulée (ROLLBACK final), mais il passe par des écritures réelles
-- (comptes, campagne, accords) et par des ALTER TABLE temporaires (mutation témoin) : ne
-- jamais le lancer sans sauvegarde, jamais hors de ce fichier tel quel.
--
-- Épreuve de la migration 0025 (accord au rapport nominatif du relevé du réseau réel :
-- colonne app.reseau_membres.accord_rapport_le, app.reseau_consentir à quatre arguments,
-- contraintes reseau_membres_rapport_sans_reponse et reseau_membres_opposition_sans_accord,
-- effacement par opposition, retrait et retrait de la réponse, clé d'export) AVANT puis
-- APRÈS l'application de la migration. Avant : elle doit sortir ROUGE avec
-- « migration 0025 non appliquée ». Après : « EPREUVE VERTE ».
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance des
-- compteurs d'identité du journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-rapport-nominatif.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée ni affichée : seuls une organisation, des comptes,
-- une campagne, un groupe et des participations jetables sont créés. Les appels se font
-- sous le rôle réel authenticated avec un jeton simulé (sub, role), comme l'API. Les
-- lectures portent sur les seuls identifiants jetables (la production contient des
-- données réelles). L'interrupteur du relevé est ouvert DANS la transaction seulement.
BEGIN;

-- Appel d'une requête sous un rôle réel : renvoie le résultat en texte ou
-- « ERR:SQLSTATE:message ». Fonction temporaire, détruite avec la transaction.
CREATE FUNCTION pg_temp.comme(p_uid uuid, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  EXECUTE p_sql INTO v;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

CREATE FUNCTION pg_temp.inf(p_uid uuid, p_part uuid, p_opp boolean) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_informer(%L, %L)::text', p_part, p_opp))
$$;
CREATE FUNCTION pg_temp.cons(p_uid uuid, p_part uuid, p_r boolean, p_c boolean, p_rap boolean) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_consentir(%L, %L, %L, %L)::text', p_part, p_r, p_c, p_rap))
$$;
CREATE FUNCTION pg_temp.ret(p_uid uuid, p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_retirer(%L)::text', p_part))
$$;
-- Export de la personne (app.exporter_mes_donnees) sous une identité donnée, en jsonb.
CREATE FUNCTION pg_temp.exp(p_uid uuid) RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', 'select app.exporter_mes_donnees()::text')::jsonb
$$;
-- Trois accords d'une participation, lus dans la table : « R|C|P » (o = posé, n = NULL).
CREATE FUNCTION pg_temp.accords(p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce((SELECT CASE WHEN m.accord_repondre_le IS NULL THEN 'n' ELSE 'o' END || '|'
                        || CASE WHEN m.accord_carte_le IS NULL THEN 'n' ELSE 'o' END || '|'
                        || CASE WHEN m.accord_rapport_le IS NULL THEN 'n' ELSE 'o' END
                     FROM app.reseau_membres m WHERE m.participation_id = p_part), 'absent')
$$;
-- Comparaison nommée : arrêt à la première différence, ligne NOTICE sinon.
CREATE FUNCTION pg_temp.verifier(p_cas text, p_obtenu text, p_attendu text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_obtenu IS DISTINCT FROM p_attendu THEN
    RAISE EXCEPTION 'CAS ROUGE « % » : obtenu « % », attendu « % »', p_cas, p_obtenu, p_attendu;
  END IF;
  RAISE NOTICE 'OK : %', p_cas;
END
$$;

DO $e$
DECLARE
  v_ua    uuid := 'ea000000-0000-4000-8000-000000000001';
  v_ub    uuid := 'ea000000-0000-4000-8000-000000000002';
  v_org   uuid := 'ea000000-0000-4000-8000-0000000000a1';
  v_camp  uuid := 'ea000000-0000-4000-8000-0000000000c1';
  v_grp   uuid := 'ea000000-0000-4000-8000-0000000000e1';
  v_pa    uuid := 'ea000000-0000-4000-8000-0000000000d1';
  v_pb    uuid := 'ea000000-0000-4000-8000-0000000000d2';
  v_r     text;
BEGIN
  -- 1. La migration est appliquée : colonne, contraintes, signature unique, clé d'export.
  IF NOT EXISTS (SELECT 1 FROM pg_attribute a
                  WHERE a.attrelid = 'app.reseau_membres'::regclass AND a.attname = 'accord_rapport_le' AND NOT a.attisdropped) THEN
    RAISE EXCEPTION 'migration 0025 non appliquée : app.reseau_membres.accord_rapport_le n''existe pas';
  END IF;
  IF to_regprocedure('app.reseau_consentir(uuid, boolean, boolean, boolean)') IS NULL THEN
    RAISE EXCEPTION 'migration 0025 non appliquée : app.reseau_consentir à quatre arguments absente';
  END IF;
  IF to_regprocedure('app.reseau_consentir(uuid, boolean, boolean)') IS NOT NULL THEN
    RAISE EXCEPTION 'migration 0025 incomplète : l''ancienne signature à trois arguments subsiste';
  END IF;
  PERFORM pg_temp.verifier('contraintes CHECK présentes',
    (SELECT string_agg(conname, ',' ORDER BY conname COLLATE "C") FROM pg_constraint
      WHERE conrelid = 'app.reseau_membres'::regclass
        AND conname IN ('reseau_membres_opposition_sans_accord', 'reseau_membres_rapport_sans_reponse')),
    'reseau_membres_opposition_sans_accord,reseau_membres_rapport_sans_reponse');
  PERFORM pg_temp.verifier('reseau_consentir : EXECUTE pour authenticated seul',
    (has_function_privilege('authenticated', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
     AND NOT has_function_privilege('public', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
     AND NOT has_function_privilege('service_role', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE'))::text,
    'true');

  -- 2. Données jetables : une organisation, deux participants dans un groupe d'une campagne ouverte.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (v_ua, 'epreuve-rapport-a@example.test', '{"nom": "Alice"}'),
    (v_ub, 'epreuve-rapport-b@example.test', '{"nom": "Bruno"}');
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-rapport', 'Organisation d''épreuve rapport');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES (v_ua, v_org, 'participant'), (v_ub, v_org, 'participant');
  INSERT INTO app.campaigns (id, organization_id, titre) VALUES (v_camp, v_org, 'Épreuve rapport nominatif');
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
    (v_pa, v_camp, v_org, v_ua), (v_pb, v_camp, v_org, v_ub);
  INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES (v_grp, v_camp, v_org, 'Équipe d''épreuve', 1);
  INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
    (v_grp, v_camp, v_org, v_pa), (v_grp, v_camp, v_org, v_pb);
  UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = v_camp;
  UPDATE private.settings SET reseau_releve_ouvert = true;  -- annulé par le ROLLBACK final

  -- 3. Cas : accord au rapport sans accord de réponse, refusé.
  PERFORM pg_temp.verifier('information préalable lue', pg_temp.inf(v_ua, v_pa, false), 'informe');
  PERFORM pg_temp.verifier('cas 1 : rapport sans accord de réponse refusé (22023)',
    pg_temp.cons(v_ua, v_pa, false, false, true), 'ERR:22023:Accord de réponse requis pour le rapport');
  PERFORM pg_temp.verifier('cas 1 : le refus n''a rien écrit', pg_temp.accords(v_pa), 'n|n|n');

  -- 4. Cas : accord au rapport posé avec la réponse, puis retiré seul.
  PERFORM pg_temp.verifier('cas 2 : réponse et rapport accordés', pg_temp.cons(v_ua, v_pa, true, false, true), 'enregistre');
  PERFORM pg_temp.verifier('cas 2 : accords datés, carte non accordée', pg_temp.accords(v_pa), 'o|n|o');
  PERFORM pg_temp.verifier('cas 2 : retrait du seul rapport', pg_temp.cons(v_ua, v_pa, true, false, false), 'enregistre');
  PERFORM pg_temp.verifier('cas 2 : réponse conservée, rapport effacé', pg_temp.accords(v_pa), 'o|n|n');

  -- 5. Cas : accord au rapport posé, puis retrait de la réponse l'efface.
  PERFORM pg_temp.verifier('cas 3 : les trois accords posés', pg_temp.cons(v_ua, v_pa, true, true, true), 'enregistre');
  PERFORM pg_temp.verifier('cas 3 : trois accords datés', pg_temp.accords(v_pa), 'o|o|o');
  PERFORM pg_temp.verifier('cas 3 : retrait de l''accord de réponse', pg_temp.cons(v_ua, v_pa, false, true, false), 'enregistre');
  PERFORM pg_temp.verifier('cas 3 : réponse ET rapport effacés, carte conservée', pg_temp.accords(v_pa), 'n|o|n');

  -- 6. Cas : l'opposition efface les trois accords.
  PERFORM pg_temp.verifier('cas 4 : trois accords reposés', pg_temp.cons(v_ua, v_pa, true, true, true), 'enregistre');
  PERFORM pg_temp.verifier('cas 4 : opposition enregistrée', pg_temp.inf(v_ua, v_pa, true), 'oppose');
  PERFORM pg_temp.verifier('cas 4 : l''opposition remet les trois accords à NULL', pg_temp.accords(v_pa), 'n|n|n');
  PERFORM pg_temp.verifier('cas 4 : après opposition, aucun accord ne se pose',
    pg_temp.cons(v_ua, v_pa, true, true, true), 'ERR:55000:Information préalable requise, sans opposition');

  -- 7. Cas : le retrait efface les trois accords.
  PERFORM pg_temp.verifier('cas 5 : information de Bruno', pg_temp.inf(v_ub, v_pb, false), 'informe');
  PERFORM pg_temp.verifier('cas 5 : trois accords de Bruno', pg_temp.cons(v_ub, v_pb, true, true, true), 'enregistre');
  PERFORM pg_temp.verifier('cas 5 : retrait, aucune réponse supprimée', pg_temp.ret(v_ub, v_pb), '0');
  PERFORM pg_temp.verifier('cas 5 : le retrait remet les trois accords à NULL', pg_temp.accords(v_pb), 'n|n|n');

  -- 8. Cas : un autre utilisateur ne peut pas poser l'accord d'autrui.
  PERFORM pg_temp.verifier('cas 6 : Bruno repose ses accords', pg_temp.cons(v_ub, v_pb, true, false, true), 'enregistre');
  PERFORM pg_temp.verifier('cas 6 : Alice ne pose pas l''accord de Bruno (P0002)',
    pg_temp.cons(v_ua, v_pb, true, true, true), 'ERR:P0002:Participation introuvable');
  PERFORM pg_temp.verifier('cas 6 : rien n''a changé chez Bruno', pg_temp.accords(v_pb), 'o|n|o');
  PERFORM pg_temp.verifier('cas 6 : Alice ne retire pas l''accord de Bruno (P0002)',
    pg_temp.ret(v_ua, v_pb), 'ERR:P0002:Participation introuvable');
  PERFORM pg_temp.verifier('cas 6 : toujours rien de changé chez Bruno', pg_temp.accords(v_pb), 'o|n|o');

  -- 9. Cas : l'ancienne signature à trois arguments échoue.
  v_r := pg_temp.comme(v_ub, 'authenticated', format('select app.reseau_consentir(%L, true, false)::text', v_pb));
  PERFORM pg_temp.verifier('cas 7 : l''ancienne signature à trois arguments échoue (42883)', left(v_r, 10), 'ERR:42883:');
  PERFORM pg_temp.verifier('cas 7 : l''échec n''a rien écrit', pg_temp.accords(v_pb), 'o|n|o');

  -- 10. Cas : l'export de la personne contient accord_rapport_le.
  PERFORM pg_temp.verifier('cas 8 : export de Bruno, accord_rapport_le daté',
    jsonb_typeof(pg_temp.exp(v_ub) -> 'reseau' -> 'membres' -> 0 -> 'accord_rapport_le'), 'string');
  PERFORM pg_temp.verifier('cas 8 : export d''Alice (opposée), accord_rapport_le présent et nul',
    jsonb_typeof(pg_temp.exp(v_ua) -> 'reseau' -> 'membres' -> 0 -> 'accord_rapport_le'), 'null');

  -- 11. Contraintes CHECK, VUES ROUGES D'ABORD (mutation témoin). Le contrôle n'existe que
  -- s'il a été vu échouer : on retire la contrainte, on constate que la ligne interdite passe
  -- (rouge), on la rétablit, on constate que la même ligne est refusée (vert).
  -- 11a. reseau_membres_rapport_sans_reponse.
  v_r := pg_temp.comme(v_ub, 'supabase_admin',
    format('update app.reseau_membres set accord_repondre_le = null where participation_id = %L returning ''modifiee''', v_pb));
  PERFORM pg_temp.verifier('cas 9a : contrainte en place, rapport sans réponse refusé (23514)',
    left(v_r, 10), 'ERR:23514:');
  ALTER TABLE app.reseau_membres DROP CONSTRAINT reseau_membres_rapport_sans_reponse;
  UPDATE app.reseau_membres SET accord_repondre_le = NULL WHERE participation_id = v_pb;
  PERFORM pg_temp.verifier('cas 9a : MUTATION TÉMOIN, contrainte retirée, la ligne interdite passe (rouge vu)',
    pg_temp.accords(v_pb), 'n|n|o');
  UPDATE app.reseau_membres SET accord_rapport_le = NULL WHERE participation_id = v_pb;
  ALTER TABLE app.reseau_membres
    ADD CONSTRAINT reseau_membres_rapport_sans_reponse
      CHECK (accord_rapport_le IS NULL OR accord_repondre_le IS NOT NULL);
  PERFORM pg_temp.verifier('cas 9a : contrainte rétablie, la ligne interdite est refusée',
    left(pg_temp.comme(v_ub, 'supabase_admin',
      format('update app.reseau_membres set accord_rapport_le = now() where participation_id = %L returning ''modifiee''', v_pb)), 10),
    'ERR:23514:');

  -- 11b. reseau_membres_opposition_sans_accord (Alice est opposée, trois accords NULL). La
  -- ligne interdite pose l'accord de réponse seul : elle ne viole que cette contrainte.
  PERFORM pg_temp.verifier('cas 9b : contrainte en place, opposition avec accord refusée (23514)',
    left(pg_temp.comme(v_ua, 'supabase_admin',
      format('update app.reseau_membres set accord_repondre_le = now() where participation_id = %L returning ''modifiee''', v_pa)), 10),
    'ERR:23514:');
  v_r := pg_get_constraintdef((SELECT c.oid FROM pg_constraint c
                                WHERE c.conrelid = 'app.reseau_membres'::regclass AND c.conname = 'reseau_membres_opposition_sans_accord'));
  PERFORM pg_temp.verifier('cas 9b : définition en place couvrant les trois accords',
    (v_r LIKE '%accord_repondre_le IS NULL%' AND v_r LIKE '%accord_carte_le IS NULL%' AND v_r LIKE '%accord_rapport_le IS NULL%')::text,
    'true');
  ALTER TABLE app.reseau_membres DROP CONSTRAINT reseau_membres_opposition_sans_accord;
  UPDATE app.reseau_membres SET accord_repondre_le = now() WHERE participation_id = v_pa;
  PERFORM pg_temp.verifier('cas 9b : MUTATION TÉMOIN, contrainte retirée, opposition + accord passe (rouge vu)',
    pg_temp.accords(v_pa), 'o|n|n');
  UPDATE app.reseau_membres SET accord_repondre_le = NULL WHERE participation_id = v_pa;
  EXECUTE format('ALTER TABLE app.reseau_membres ADD CONSTRAINT reseau_membres_opposition_sans_accord %s', v_r);
  PERFORM pg_temp.verifier('cas 9b : contrainte rétablie à l''identique, la ligne interdite est refusée',
    left(pg_temp.comme(v_ua, 'supabase_admin',
      format('update app.reseau_membres set accord_repondre_le = now() where participation_id = %L returning ''modifiee''', v_pa)), 10),
    'ERR:23514:');

  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
