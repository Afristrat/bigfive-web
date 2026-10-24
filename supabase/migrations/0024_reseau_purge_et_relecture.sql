-- 0024 : corrections de revue du relevé du réseau réel (0023) et de l'atelier de
-- relecture (0022). Trois fonctions redéfinies à l'identique de leur dernière
-- définition, plus les seuls changements ci-dessous ; mêmes signatures, attributs
-- et droits.
--
--   private.purger_quotidien() (dernière définition : 0023) :
--     1. Garde des réponses récentes. En 0023, une ligne de app.reseau_membres
--        était supprimée selon son seul maj_le ; les clés étrangères ON DELETE
--        CASCADE de app.reseau_reponses effaçaient alors les réponses RÉCENTES des
--        autres membres qui citaient cette personne (C inactif depuis 36 mois, cité
--        il y a un mois par A : la réponse de A disparaissait). Désormais, une
--        ligne de membre n'est supprimée que si elle est échue ET qu'aucune
--        réponse ne la cite ni ne vient d'elle ; les réponses échues sont
--        supprimées d'abord (inchangé), il ne reste donc que des réponses non
--        échues au moment du contrôle.
--     2. Verrou de groupe. Avant de supprimer des réponses ou des lignes de
--        membre, la purge prend le verrou consultatif transactionnel de chaque
--        groupe concerné (même clé que reseau_repondre, reseau_retirer,
--        l'opposition et le retrait de l'accord de réponse :
--        hashtextextended(group_id::text, 0)), dans l'ordre croissant des
--        identifiants, AVANT tout verrou de ligne du relevé : même ordre que ces
--        fonctions (groupe, puis lignes), donc pas d'interblocage 40P01 qui
--        annulerait toute la purge du jour. Le verrou ferme aussi la course
--        entre la garde et un envoi concurrent : l'instruction de suppression
--        prend son instantané après le verrou et voit toute réponse validée.
--   app.reseau_lire(p_campagne) (dernière définition : 0023) : mêmes signature,
--   contrôles, journal (reseau.lire) et droits ; le rendu est construit par
--   private.reseau_rendu, partagé avec app.reseau_exporter.
--     3. « informe » valait toujours vrai (informe_le est NOT NULL : une ligne de
--        membre n'existe qu'après lecture de l'information). Il vaut désormais
--        « informé et non opposé », c'est-à-dire citable, comme la liste des
--        membres de app.reseau_releve et le contrôle de app.reseau_repondre.
--     5. Personnes opposées (décision d'Amine du 24/10/2026) : le consultant ne
--        voit plus leur nom ni leur ligne, seulement leur nombre par groupe (clé
--        « oppositions ») ; l'administrateur Tenga garde leurs lignes (nom,
--        « informe » faux, « oppose » vrai) et reçoit le même nombre. Une
--        personne opposée n'a aucun lien (l'opposition les supprime) : les
--        réponses rendues ne changent pas.
--   app.reseau_exporter(p_campagne) (nouvelle) :
--     6. L'export de la route serveur se distingue au journal d'un simple
--        affichage des nombres : mêmes contrôles et même rendu que
--        app.reseau_lire, action reseau.exporter (quantité = réponses rendues).
--        SECURITY DEFINER, search_path vide, EXECUTE pour authenticated seul.
--   app.relire_bloc(p_bloc, p_empreinte, p_verdict, p_commentaire) (dernière
--   définition : 0022) :
--     4. L'expression régulière qui retire les blancs du commentaire était
--        calculée dans DECLARE, avant les contrôles de connexion et de rôle : elle
--        l'est désormais après eux, et la longueur brute du commentaire est
--        bornée avant elle (4 000 caractères, le double du plafond de 2 000
--        après retrait des blancs ; au-delà, même refus 22023, même message).
--        Le commentaire visé est bien celui de relire_bloc : designer_relecteur
--        ne prend aucun commentaire.
--
-- Contraintes tenues : SECURITY DEFINER, search_path vide, objets qualifiés ;
-- propriétaire tenga_owner (migrate.sh) ; droits identiques (REVOKE puis GRANT
-- rejoués à l'identique de 0022 et 0023).
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Purge quotidienne (remplace celle de 0023, à l'identique) : verrou des groupes
-- concernés, puis garde des lignes de membre encore citées ou citantes.
CREATE OR REPLACE FUNCTION private.purger_quotidien()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liens       integer;
  v_journal     integer;
  v_invitations integer;
  v_tentatives  integer;
  v_resultats   integer;
  v_leurre      integer;
  v_compteurs   integer;
  v_echecs      integer;
  v_comptes     integer := 0;
  v_compte      uuid;
  v_reseau_reponses integer;
  v_reseau_membres  integer;
  v_reseau_groupe   uuid;
BEGIN
  -- ponytail: les liens échus se gardent 1 jour après expiration, constante ; à rendre réglable si besoin.
  DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '1 day';
  GET DIAGNOSTICS v_liens = ROW_COUNT;

  DELETE FROM private.audit_log
   WHERE cree_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_journal_mois FROM private.settings s));
  GET DIAGNOSTICS v_journal = ROW_COUNT;

  DELETE FROM private.leurre_connexion WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_leurre = ROW_COUNT;

  DELETE FROM private.demandes_lien WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_compteurs = ROW_COUNT;
  DELETE FROM private.echecs_code WHERE depuis < now() - interval '1 day';
  GET DIAGNOSTICS v_echecs = ROW_COUNT;
  v_compteurs := v_compteurs + v_echecs;
  DELETE FROM private.echecs_mdp WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_echecs = ROW_COUNT;
  v_compteurs := v_compteurs + v_echecs;
  -- Un verrouillage ne s'efface jamais seul ; un blocage échu n'a plus d'objet.
  DELETE FROM private.etat_mdp WHERE verrouille_le IS NULL AND (bloque_jusqu IS NULL OR bloque_jusqu < now());

  DELETE FROM app.invitations WHERE expire_le < now();
  GET DIAGNOSTICS v_invitations = ROW_COUNT;

  DELETE FROM app.attempts WHERE expire_le < now();
  GET DIAGNOSTICS v_tentatives = ROW_COUNT;
  -- Une participation dont la tentative a été purgée redevient « ouverte ».
  UPDATE app.participations p
     SET statut = 'ouverte', commencee_le = NULL
   WHERE p.statut = 'en_cours'
     AND NOT EXISTS (SELECT 1 FROM app.attempts a WHERE a.participation_id = p.id);

  DELETE FROM app.results
   WHERE soumis_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_resultats_mois FROM private.settings s));
  GET DIAGNOSTICS v_resultats = ROW_COUNT;

  -- Relevé du réseau réel (0023) : réponses, puis lignes de membre échues.
  -- Verrou de chaque groupe concerné (0024), dans l'ordre croissant, avant tout
  -- verrou de ligne du relevé : même clé et même ordre que reseau_repondre et
  -- l'opposition (groupe, puis lignes), aucun interblocage.
  FOR v_reseau_groupe IN
    SELECT x.group_id
      FROM (SELECT r.group_id FROM app.reseau_reponses r
             WHERE r.repondu_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s))
            UNION
            SELECT m.group_id FROM app.reseau_membres m
             WHERE m.maj_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s))) x
     ORDER BY x.group_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_reseau_groupe::text, 0));
  END LOOP;
  DELETE FROM app.reseau_reponses
   WHERE repondu_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s));
  GET DIAGNOSTICS v_reseau_reponses = ROW_COUNT;
  DELETE FROM app.reseau_membres
   WHERE maj_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s))
     -- Garde (0024) : jamais une ligne encore citée ou citante (la cascade
     -- effacerait des réponses non échues).
     AND NOT EXISTS (SELECT 1 FROM app.reseau_reponses r
                      WHERE r.cite = reseau_membres.participation_id OR r.repondant = reseau_membres.participation_id);
  GET DIAGNOSTICS v_reseau_membres = ROW_COUNT;

  FOR v_compte IN
    SELECT u.id
    FROM auth.users u
    JOIN app.profiles pr ON pr.user_id = u.id
    WHERE COALESCE(pr.derniere_connexion_le, pr.cree_le)
            < now() - pg_catalog.make_interval(months => (SELECT s.conservation_comptes_vides_mois FROM private.settings s))
      AND NOT EXISTS (SELECT 1 FROM app.results r WHERE r.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM private.tenga_admins ta WHERE ta.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM app.memberships m WHERE m.user_id = u.id AND m.role IN ('responsable', 'consultant'))
  LOOP
    IF private.effacer_compte(v_compte) THEN
      v_comptes := v_comptes + 1;
    END IF;
  END LOOP;

  PERFORM private.purger_historique_relecture();
  PERFORM private.journaliser(NULL, 'purge.liens_connexion', NULL, NULL, NULL, v_liens);
  PERFORM private.journaliser(NULL, 'purge.journal', NULL, NULL, NULL, v_journal);
  PERFORM private.journaliser(NULL, 'purge.invitations', NULL, NULL, NULL, v_invitations);
  PERFORM private.journaliser(NULL, 'purge.tentatives', NULL, NULL, NULL, v_tentatives);
  PERFORM private.journaliser(NULL, 'purge.resultats', NULL, NULL, NULL, v_resultats);
  PERFORM private.journaliser(NULL, 'purge.comptes', NULL, NULL, NULL, v_comptes);
  PERFORM private.journaliser(NULL, 'purge.leurre_connexion', NULL, NULL, NULL, v_leurre);
  PERFORM private.journaliser(NULL, 'purge.compteurs_connexion', NULL, NULL, NULL, v_compteurs);
  PERFORM private.journaliser(NULL, 'purge.reseau_reponses', NULL, NULL, NULL, v_reseau_reponses);
  PERFORM private.journaliser(NULL, 'purge.reseau_membres', NULL, NULL, NULL, v_reseau_membres);
END
$$;

-- 2. Lecture du relevé d'une campagne.
-- 2.1 Rendu partagé par app.reseau_lire et app.reseau_exporter (aide interne,
-- aucun droit pour l'API ; appelée après leurs contrôles, sous tenga_owner) :
-- « informe » dit l'état réel (informé et non opposé) ; les lignes des
-- personnes opposées ne sont rendues que si p_noms_opposes (administrateur
-- Tenga), leur nombre par groupe toujours (« oppositions »).
CREATE FUNCTION private.reseau_rendu(p_campagne uuid, p_statut text, p_noms_opposes boolean)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'campagne_id', p_campagne,
    'campagne_statut', p_statut,
    'groupes', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'groupe_id', g.id,
               'nom', g.nom,
               'effectif', (SELECT pg_catalog.count(*) FROM app.group_members gm WHERE gm.group_id = g.id),
               'oppositions', (SELECT pg_catalog.count(*) FROM app.reseau_membres o
                                WHERE o.campaign_id = p_campagne AND o.group_id = g.id AND o.oppose_le IS NOT NULL),
               'membres', COALESCE((
                 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                          'participation_id', m.participation_id,
                          'nom', pr.nom,
                          'informe', m.informe_le IS NOT NULL AND m.oppose_le IS NULL,
                          'oppose', m.oppose_le IS NOT NULL,
                          'accord_repondre', m.accord_repondre_le IS NOT NULL,
                          'accord_carte', m.accord_carte_le IS NOT NULL,
                          'a_repondu', EXISTS (SELECT 1 FROM app.reseau_reponses r WHERE r.repondant = m.participation_id))
                          ORDER BY pr.nom NULLS LAST, m.participation_id)
                   FROM app.reseau_membres m
                   JOIN app.participations pa ON pa.id = m.participation_id
                   LEFT JOIN app.profiles pr ON pr.user_id = pa.user_id
                  WHERE m.campaign_id = p_campagne AND m.group_id = g.id
                    AND (m.oppose_le IS NULL OR p_noms_opposes)), '[]'::jsonb),
               'reponses', COALESCE((
                 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                          'de', r.repondant, 'vers', r.cite, 'lien', r.lien, 'valeur', r.valeur)
                          ORDER BY r.repondant, r.cite, r.lien)
                   FROM app.reseau_reponses r WHERE r.campaign_id = p_campagne AND r.group_id = g.id), '[]'::jsonb))
               ORDER BY g.ordre, g.nom, g.id)
        FROM app.groups g WHERE g.campaign_id = p_campagne), '[]'::jsonb))
$$;

-- 2.2 Affichage (remplace celle de 0023 : mêmes contrôles, même journal ; rendu
-- par private.reseau_rendu). Consultant de l'organisation ou administrateur
-- Tenga. Le responsable ne lit rien.
CREATE OR REPLACE FUNCTION app.reseau_lire(p_campagne uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_statut text;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.count(*)::integer INTO v_n FROM app.reseau_reponses r WHERE r.campaign_id = p_campagne;
  PERFORM private.journaliser(v_uid, 'reseau.lire', 'campagne', p_campagne, v_org, v_n);
  RETURN private.reseau_rendu(p_campagne, v_statut, app.suis_admin_tenga());
END
$$;

-- 2.3 Export (nouvelle) : mêmes contrôles et même rendu, journalisé
-- reseau.exporter (quantité = réponses rendues) avant le renvoi.
CREATE FUNCTION app.reseau_exporter(p_campagne uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_statut text;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.count(*)::integer INTO v_n FROM app.reseau_reponses r WHERE r.campaign_id = p_campagne;
  PERFORM private.journaliser(v_uid, 'reseau.exporter', 'campagne', p_campagne, v_org, v_n);
  RETURN private.reseau_rendu(p_campagne, v_statut, app.suis_admin_tenga());
END
$$;

-- 3. Rendre un verdict (remplace celle de 0022, à l'identique) : longueur brute du
-- commentaire bornée, puis blancs retirés, après les contrôles de connexion et de
-- rôle.
CREATE OR REPLACE FUNCTION app.relire_bloc(p_bloc text, p_empreinte text, p_verdict text, p_commentaire text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_com text;
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_relecteur() THEN
    RAISE EXCEPTION 'Réservé aux relecteurs de la bibliothèque' USING ERRCODE = '42501';
  END IF;
  -- Longueur brute bornée avant l'expression régulière (0024) : le double du
  -- plafond de 2 000 caractères après retrait des blancs.
  IF COALESCE(pg_catalog.char_length(p_commentaire) > 4000, false) THEN
    RAISE EXCEPTION 'Relecture invalide : bloc, empreinte, verdict ou commentaire' USING ERRCODE = '22023';
  END IF;
  -- Blancs retirés aux deux bouts, espaces Unicode comprises (même ensemble que
  -- String.prototype.trim côté application).
  v_com := NULLIF(pg_catalog.regexp_replace(p_commentaire,
             '^[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$',
             '', 'g'), '');
  IF p_bloc IS NULL OR p_bloc !~ '^[NEOAC][1-6]/(bas|plutot_bas|milieu|plutot_haut|haut)$'
     OR p_empreinte IS NULL OR p_empreinte !~ '^[0-9a-f]{64}$'
     OR p_verdict IS NULL OR p_verdict NOT IN ('relu', 'a_corriger')
     OR (p_verdict = 'a_corriger' AND v_com IS NULL)
     OR COALESCE(pg_catalog.char_length(v_com) > 2000, false) THEN
    RAISE EXCEPTION 'Relecture invalide : bloc, empreinte, verdict ou commentaire' USING ERRCODE = '22023';
  END IF;
  -- Les verdicts d'une même personne se comptent l'un après l'autre (plafond),
  -- deux verdicts simultanés sur un même bloc se rangent l'un après l'autre.
  -- Toujours dans cet ordre : personne, puis bloc.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('relecture.personne.' || v_uid::text));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('relecture.' || p_bloc));
  SELECT r.id INTO v_id
    FROM app.relectures_blocs r
   WHERE r.bloc = p_bloc AND r.empreinte = p_empreinte
     AND r.ordre = (SELECT pg_catalog.max(d.ordre) FROM app.relectures_blocs d
                     WHERE d.bloc = p_bloc AND d.empreinte = p_empreinte)
     AND r.verdict = p_verdict AND r.relecteur = v_uid
     AND r.commentaire IS NOT DISTINCT FROM v_com;
  IF FOUND THEN
    RETURN v_id;
  END IF;
  -- Plafond (décision d'Amine) : 200 verdicts écrits par heure glissante et par personne.
  IF (SELECT pg_catalog.count(*) FROM app.relectures_blocs r
       WHERE r.relecteur = v_uid AND r.cree_le > pg_catalog.now() - interval '1 hour') >= 200 THEN
    RAISE EXCEPTION 'Plafond de verdicts atteint' USING ERRCODE = 'PT429';
  END IF;
  INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, commentaire, relecteur)
  VALUES (p_bloc, p_empreinte, p_verdict, v_com, v_uid)
  RETURNING id INTO v_id;
  -- Journal sans auteur ni identifiant : la table reste la seule trace nominative.
  PERFORM private.journaliser(NULL, 'relecture.' || p_verdict, 'relecture', NULL);
  RETURN v_id;
END
$$;

-- 4. Droits : identiques à ceux de 0022 et 0023 (défense en profondeur, puis
-- EXECUTE pour authenticated seul ; la purge n'est exécutable par aucun rôle de
-- l'API). Le rendu partagé est fermé à l'API ; l'export suit app.reseau_lire.
REVOKE ALL ON FUNCTION private.purger_quotidien() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.reseau_rendu(uuid, text, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION app.reseau_lire(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_exporter(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.relire_bloc(text, text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION app.reseau_lire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_exporter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.relire_bloc(text, text, text, text) TO authenticated;
