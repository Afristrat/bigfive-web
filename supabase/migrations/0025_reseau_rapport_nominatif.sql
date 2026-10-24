-- 0025 : accord au rapport nominatif du relevé du réseau réel (0023, 0024).
--
-- Besoin : le rapport remis au cabinet Tenga Conseil peut nommer la personne. Cette
-- finalité est distincte de la réponse au relevé et de la carte : elle fait
-- l'objet d'un TROISIÈME accord, daté, indépendant et retirable à tout moment.
-- Sans cet accord, la personne n'apparaît pas nommément dans le rapport.
--
--   app.reseau_membres.accord_rapport_le (timestamptz, NULL = pas d'accord).
--   Contraintes :
--     reseau_membres_opposition_sans_accord (remplacée) : une opposition ne
--       coexiste avec AUCUN des trois accords (réponse, carte, rapport).
--     reseau_membres_rapport_sans_reponse (nouvelle) : l'accord au rapport suppose
--       l'accord de réponse (on ne nomme dans un rapport que qui a répondu au relevé).
--
--   app.reseau_consentir (remplacée) : (p_participation, p_repondre, p_carte,
--     p_rapport) RETURNS text. L'ancienne version à trois arguments est SUPPRIMÉE.
--     p_rapport vrai avec p_repondre faux : 22023 « Accord de réponse requis pour le
--     rapport ». Retirer l'accord de réponse retire donc aussi l'accord au rapport
--     (p_rapport ne peut être vrai alors). Même logique COALESCE(…, now()) que pour
--     la carte : un accord déjà posé garde sa date.
--   app.reseau_informer (opposition) et app.reseau_retirer : mettent aussi
--     accord_rapport_le à NULL.
--   app.reseau_releve, private.reseau_rendu (partagé par app.reseau_lire et
--     app.reseau_exporter), app.exporter_mes_donnees : exposent la clé jumelle
--     « accord_rapport_le » partout où « accord_carte_le » figure, et le booléen
--     « accord_rapport » partout où figure « accord_carte ».
--
-- Fonctions reprises EN ENTIER, corps identique à leur dernière définition (0023
-- pour reseau_releve, reseau_informer, reseau_consentir, reseau_retirer et
-- exporter_mes_donnees ; 0024 pour reseau_rendu) hors les changements ci-dessus ;
-- mêmes verrous (verrou consultatif du groupe, puis verrous de ligne), journal
-- inchangé (private.journaliser appelé comme avant), SECURITY DEFINER, search_path
-- vide, droits identiques (EXECUTE pour authenticated seul).
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Colonne et contraintes ----------------------------------------------------
ALTER TABLE app.reseau_membres ADD COLUMN accord_rapport_le timestamptz;
COMMENT ON COLUMN app.reseau_membres.accord_rapport_le IS
  'Accord daté au rapport nominatif remis au cabinet Tenga Conseil. NULL = pas d''accord. Suppose l''accord de réponse ; exclu par une opposition.';

ALTER TABLE app.reseau_membres DROP CONSTRAINT reseau_membres_opposition_sans_accord;
ALTER TABLE app.reseau_membres
  ADD CONSTRAINT reseau_membres_opposition_sans_accord
    CHECK (oppose_le IS NULL OR (accord_repondre_le IS NULL AND accord_carte_le IS NULL AND accord_rapport_le IS NULL));
ALTER TABLE app.reseau_membres
  ADD CONSTRAINT reseau_membres_rapport_sans_reponse
    CHECK (accord_rapport_le IS NULL OR accord_repondre_le IS NOT NULL);

-- 2. Mon relevé (remplace celle de 0023) -----------------------------------------
CREATE OR REPLACE FUNCTION app.reseau_releve(p_participation uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_groupe   uuid;
  v_statut   text;
  v_moi      app.reseau_membres%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    -- Interrupteur fermé : ma seule ligne de membre (retrait et opposition restent
    -- possibles), jamais la liste de l'équipe ni une donnée d'autrui. Une
    -- participation d'autrui, inexistante ou sans ligne rend « moi » nul.
    SELECT m.* INTO v_moi
      FROM app.reseau_membres m
      JOIN app.participations pa ON pa.id = m.participation_id
     WHERE m.participation_id = p_participation AND pa.user_id = v_uid;
    RETURN pg_catalog.jsonb_build_object(
      'ouvert', false,
      'moi', CASE WHEN v_moi.participation_id IS NULL THEN NULL
                  ELSE pg_catalog.jsonb_build_object(
                         'informe_le', v_moi.informe_le, 'oppose_le', v_moi.oppose_le,
                         'accord_repondre_le', v_moi.accord_repondre_le, 'accord_carte_le', v_moi.accord_carte_le,
                         'accord_rapport_le', v_moi.accord_rapport_le,
                         'nb_reponses', (SELECT pg_catalog.count(*)::integer FROM app.reseau_reponses r
                                          WHERE r.repondant = p_participation)) END);
  END IF;
  SELECT r.campaign_id, r.group_id, r.campagne_statut INTO v_campagne, v_groupe, v_statut
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  SELECT m.* INTO v_moi FROM app.reseau_membres m WHERE m.participation_id = p_participation;
  RETURN pg_catalog.jsonb_build_object(
    'ouvert', true,
    'campagne_ouverte', v_statut = 'ouverte',
    'moi', CASE WHEN v_moi.participation_id IS NULL THEN NULL
                ELSE pg_catalog.jsonb_build_object(
                       'informe_le', v_moi.informe_le, 'oppose_le', v_moi.oppose_le,
                       'accord_repondre_le', v_moi.accord_repondre_le, 'accord_carte_le', v_moi.accord_carte_le,
                       'accord_rapport_le', v_moi.accord_rapport_le) END,
    'membres', CASE WHEN v_moi.participation_id IS NULL OR v_moi.oppose_le IS NOT NULL THEN '[]'::jsonb
                    ELSE COALESCE((
                      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('participation_id', m.participation_id, 'nom', pr.nom)
                                                  ORDER BY pr.nom NULLS LAST, m.participation_id)
                        FROM app.reseau_membres m
                        JOIN app.participations pa ON pa.id = m.participation_id
                        LEFT JOIN app.profiles pr ON pr.user_id = pa.user_id
                       WHERE m.campaign_id = v_campagne AND m.group_id = v_groupe AND m.oppose_le IS NULL
                         AND m.participation_id <> p_participation), '[]'::jsonb) END,
    'reponses', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('cite', r.cite, 'lien', r.lien, 'valeur', r.valeur)
                                  ORDER BY r.cite, r.lien)
        FROM app.reseau_reponses r WHERE r.repondant = p_participation), '[]'::jsonb));
END
$$;

-- 3. Information préalable lue ; opposition ou levée (remplace celle de 0023) ----
-- L'opposition efface les TROIS accords.
CREATE OR REPLACE FUNCTION app.reseau_informer(p_participation uuid, p_opposition boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_org      uuid;
  v_groupe   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_opposition IS NULL THEN
    RAISE EXCEPTION 'Choix invalide : vrai ou faux attendu' USING ERRCODE = '22023';
  END IF;
  -- S'opposer reste permis interrupteur fermé (défaut protecteur) ; lire
  -- l'information sans s'opposer exige le relevé ouvert.
  IF NOT p_opposition AND NOT private.reseau_releve_ouvert() THEN
    RAISE EXCEPTION 'Relevé du réseau fermé' USING ERRCODE = '55000';
  END IF;
  SELECT r.campaign_id, r.organization_id, r.group_id INTO v_campagne, v_org, v_groupe
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  -- Opposition : verrou du groupe d'abord, même ordre que reseau_repondre.
  IF p_opposition THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_groupe::text, 0));
  END IF;
  INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id)
  VALUES (p_participation, v_campagne, v_org, v_groupe)
  ON CONFLICT (participation_id) DO NOTHING;
  IF p_opposition THEN
    UPDATE app.reseau_membres m
       SET oppose_le = now(), accord_repondre_le = NULL, accord_carte_le = NULL, accord_rapport_le = NULL, maj_le = now()
     WHERE m.participation_id = p_participation;
    DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation OR r.cite = p_participation;
    PERFORM private.journaliser(v_uid, 'reseau.opposer', 'participation', p_participation, v_org);
    RETURN 'oppose';
  END IF;
  UPDATE app.reseau_membres m SET oppose_le = NULL, maj_le = now() WHERE m.participation_id = p_participation;
  PERFORM private.journaliser(v_uid, 'reseau.informer', 'participation', p_participation, v_org);
  RETURN 'informe';
END
$$;

-- 4. Trois accords indépendants (remplace celle de 0023, ancienne signature supprimée)
DROP FUNCTION app.reseau_consentir(uuid, boolean, boolean);

CREATE FUNCTION app.reseau_consentir(p_participation uuid, p_repondre boolean, p_carte boolean, p_rapport boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_org      uuid;
  v_groupe   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_repondre IS NULL OR p_carte IS NULL OR p_rapport IS NULL THEN
    RAISE EXCEPTION 'Choix invalide : vrai ou faux attendu' USING ERRCODE = '22023';
  END IF;
  IF p_rapport AND NOT p_repondre THEN
    RAISE EXCEPTION 'Accord de réponse requis pour le rapport' USING ERRCODE = '22023';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    RAISE EXCEPTION 'Relevé du réseau fermé' USING ERRCODE = '55000';
  END IF;
  SELECT r.campaign_id, r.organization_id, r.group_id INTO v_campagne, v_org, v_groupe
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  -- Retirer l'accord de réponse supprime des réponses : verrou du groupe d'abord.
  IF NOT p_repondre THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_groupe::text, 0));
  END IF;
  -- Verrou partagé sur la campagne : la clôture attend la fin de ce consentement.
  PERFORM 1 FROM app.campaigns c WHERE c.id = v_campagne AND c.statut = 'ouverte' FOR SHARE OF c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne non ouverte : consentement et réponses fermés' USING ERRCODE = '55000';
  END IF;
  PERFORM 1 FROM app.reseau_membres m
   WHERE m.participation_id = p_participation AND m.oppose_le IS NULL
     FOR UPDATE OF m;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Information préalable requise, sans opposition' USING ERRCODE = '55000';
  END IF;
  -- p_rapport vrai suppose p_repondre vrai (contrôlé plus haut) : retirer l'accord de
  -- réponse met donc aussi l'accord au rapport à NULL.
  UPDATE app.reseau_membres m
     SET accord_repondre_le = CASE WHEN p_repondre THEN COALESCE(m.accord_repondre_le, now()) END,
         accord_carte_le = CASE WHEN p_carte THEN COALESCE(m.accord_carte_le, now()) END,
         accord_rapport_le = CASE WHEN p_rapport THEN COALESCE(m.accord_rapport_le, now()) END,
         maj_le = now()
   WHERE m.participation_id = p_participation;
  IF NOT p_repondre THEN
    DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  END IF;
  PERFORM private.journaliser(v_uid, 'reseau.consentir', 'participation', p_participation, v_org);
  RETURN 'enregistre';
END
$$;

-- 5. Retirer mes réponses (remplace celle de 0023) : les TROIS accords sont retirés.
CREATE OR REPLACE FUNCTION app.reseau_retirer(p_participation uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_groupe uuid;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT r.organization_id, r.group_id INTO v_org, v_groupe FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  -- Verrou du groupe puis de ma ligne AVANT la suppression : un envoi concurrent ne
  -- peut pas laisser de réponses sans accord.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_groupe::text, 0));
  PERFORM 1 FROM app.reseau_membres m WHERE m.participation_id = p_participation FOR UPDATE OF m;
  DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE app.reseau_membres m
     SET accord_repondre_le = NULL, accord_carte_le = NULL, accord_rapport_le = NULL, maj_le = now()
   WHERE m.participation_id = p_participation;
  PERFORM private.journaliser(v_uid, 'reseau.retirer', 'participation', p_participation, v_org, v_n);
  RETURN v_n;
END
$$;

-- 6. Rendu partagé par app.reseau_lire et app.reseau_exporter (remplace celui de
-- 0024) : le booléen « accord_rapport » jouxte « accord_carte ».
CREATE OR REPLACE FUNCTION private.reseau_rendu(p_campagne uuid, p_statut text, p_noms_opposes boolean)
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
                          'accord_rapport', m.accord_rapport_le IS NOT NULL,
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

-- 7. Droit d'accès (remplace la définition de 0023, à l'identique) : la ligne de
-- membre exportée gagne « accord_rapport_le ».
CREATE OR REPLACE FUNCTION app.exporter_mes_donnees()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_export jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'exporte_le', now(),
    'compte', pg_catalog.jsonb_build_object(
      'id', v_uid,
      'email', (SELECT u.email FROM auth.users u WHERE u.id = v_uid),
      'administrateur_tenga', app.suis_admin_tenga()),
    'profil', (SELECT pg_catalog.to_jsonb(p) - 'user_id' FROM app.profiles p WHERE p.user_id = v_uid),
    'appartenances', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'organisation', o.nom, 'identifiant', o.slug, 'role', m.role, 'depuis', m.cree_le) ORDER BY m.cree_le, o.slug)
      FROM app.memberships m JOIN app.organizations o ON o.id = m.organization_id
      WHERE m.user_id = v_uid), '[]'::jsonb),
    'participations', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', p.id, 'campagne', c.titre, 'organisation', o.nom, 'statut', p.statut,
               'ouverte_le', p.ouverte_le, 'commencee_le', p.commencee_le, 'terminee_le', p.terminee_le)
               ORDER BY p.ouverte_le, p.id)
      FROM app.participations p
      JOIN app.campaigns c ON c.id = p.campaign_id
      JOIN app.organizations o ON o.id = p.organization_id
      WHERE p.user_id = v_uid), '[]'::jsonb),
    'tentatives', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', a.participation_id, 'questionnaire_version', a.questionnaire_version,
               'reponses', a.reponses, 'revision', a.revision, 'mis_a_jour_le', a.mis_a_jour_le,
               'expire_le', a.expire_le) ORDER BY a.cree_le, a.participation_id)
      FROM app.attempts a WHERE a.user_id = v_uid), '[]'::jsonb),
    'resultats', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', r.participation_id, 'reponses', r.reponses, 'scores', r.scores,
               'questionnaire_version', r.questionnaire_version, 'calcul_version', r.calcul_version,
               'soumis_le', r.soumis_le) ORDER BY r.soumis_le, r.participation_id)
      FROM app.results r WHERE r.user_id = v_uid), '[]'::jsonb),
    'reseau', pg_catalog.jsonb_build_object(
      'membres', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rm.participation_id, 'campagne', c.titre, 'organisation', o.nom,
                 'informe_le', rm.informe_le, 'oppose_le', rm.oppose_le,
                 'accord_repondre_le', rm.accord_repondre_le, 'accord_carte_le', rm.accord_carte_le,
                 'accord_rapport_le', rm.accord_rapport_le,
                 'maj_le', rm.maj_le) ORDER BY rm.informe_le, rm.participation_id)
        FROM app.reseau_membres rm
        JOIN app.participations p ON p.id = rm.participation_id
        JOIN app.campaigns c ON c.id = rm.campaign_id
        JOIN app.organizations o ON o.id = rm.organization_id
        WHERE p.user_id = v_uid), '[]'::jsonb),
      'reponses', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rr.repondant, 'personne_citee', pc.nom, 'lien', rr.lien,
                 'valeur', rr.valeur, 'repondu_le', rr.repondu_le) ORDER BY rr.repondu_le, rr.repondant, rr.cite, rr.lien)
        FROM app.reseau_reponses rr
        JOIN app.participations p ON p.id = rr.repondant
        JOIN app.participations pcit ON pcit.id = rr.cite
        LEFT JOIN app.profiles pc ON pc.user_id = pcit.user_id
        WHERE p.user_id = v_uid), '[]'::jsonb)),
    'binomes', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'binome', b.id, 'organisation', o.nom, 'ma_participation', mine.id,
               'propose_le', b.propose_le,
               'mon_accord_le', CASE WHEN mine.id = b.participation_a THEN b.accord_a_le ELSE b.accord_b_le END,
               'statut', CASE WHEN b.retire_le IS NOT NULL THEN 'retire'
                              WHEN b.accord_a_le IS NOT NULL AND b.accord_b_le IS NOT NULL THEN 'actif'
                              ELSE 'en_attente' END,
               'retire_le', b.retire_le) ORDER BY b.propose_le, b.id)
      FROM app.binomes b
      JOIN app.participations mine ON mine.user_id = v_uid AND mine.id IN (b.participation_a, b.participation_b)
      JOIN app.organizations o ON o.id = b.organization_id), '[]'::jsonb),
    'relecture', pg_catalog.jsonb_build_object(
      'ajoute_le', (SELECT rb.ajoute_le FROM private.relecteurs_bibliotheque rb WHERE rb.user_id = v_uid),
      'verdicts', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'bloc', v.bloc, 'empreinte', v.empreinte, 'verdict', v.verdict,
                 'commentaire', v.commentaire, 'cree_le', v.cree_le) ORDER BY v.ordre)
        FROM app.relectures_blocs v WHERE v.relecteur = v_uid), '[]'::jsonb)),
    'journal', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('action', l.action, 'date', l.cree_le) ORDER BY l.id)
      FROM private.audit_log l WHERE l.acteur = v_uid), '[]'::jsonb)
  ) INTO v_export;
  PERFORM private.journaliser(v_uid, 'compte.exporter', 'utilisateur', v_uid);
  RETURN v_export;
END
$$;

-- 8. Droits : identiques à ceux de 0023 et 0024 (défense en profondeur, puis EXECUTE
-- pour authenticated seul). Les fonctions redéfinies à signature inchangée
-- conservent leurs droits ; ils sont rejoués par sûreté. Le rendu partagé reste
-- fermé à l'API ; la nouvelle signature de reseau_consentir reçoit ses droits.
REVOKE ALL ON FUNCTION app.reseau_releve(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_informer(uuid, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_consentir(uuid, boolean, boolean, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_retirer(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.reseau_rendu(uuid, text, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION app.exporter_mes_donnees() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION app.reseau_releve(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_informer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_consentir(uuid, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_retirer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.exporter_mes_donnees() TO authenticated;
