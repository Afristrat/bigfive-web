-- 0020 : liste des résultats d'une campagne pour le consultant (étape C0 du plan
-- de branchement du questionnaire sur le moteur, écart X9).
--
-- Besoin : app.lire_resultat_individuel (0003) exige un identifiant de
-- participation, et aucune règle ne permet au consultant de lire les
-- participations (seul le responsable les lit, 0003 § 2.18). Le consultant ne
-- pouvait donc pas trouver les résultats d'une campagne. Cette migration ajoute
-- la liste, par une fonction contrôlée :
--
--   app.lister_resultats_campagne(p_campagne uuid)
--     RETURNS TABLE (participation_id uuid, soumis_le timestamptz)
--
-- Règles, vérifiées dans la base et non dans l'interface :
--   - réservée à un administrateur Tenga (app.suis_admin_tenga()) ou au
--     consultant de l'organisation de la campagne ; refus 42501 « Réservé au
--     consultant affecté ou à un administrateur Tenga » SANS distinguer une
--     campagne inexistante d'une campagne interdite ; sans identité, « Connexion
--     requise » ; le responsable, un consultant d'une autre organisation, un
--     participant et l'anonyme sont refusés ;
--   - AUCUNE IDENTITÉ renvoyée : ni nom, ni adresse, ni identifiant de compte,
--     seulement l'identifiant opaque de la participation et la date de
--     soumission. DÉFAUT NON VALIDÉ par Amine (plan § 6, question 4) : le pack A
--     (entretien) suppose peut-être de savoir qui est qui ; tant que la décision
--     n'est pas prise, rien d'identifiant ne sort ;
--   - seules les participations TERMINÉES (qui ont un résultat) sont listées,
--     avant comme après la clôture de la campagne ;
--   - chaque consultation autorisée est inscrite au journal (action
--     resultat.lister, ressource de type campagne, quantité = nombre de lignes
--     rendues), AVANT le renvoi ; un refus n'écrit rien ;
--   - triée par date de soumission, puis par identifiant (ordre stable) ; le
--     nombre journalisé et les lignes rendues viennent d'UNE SEULE lecture ;
--   - exécutable par authenticated seulement (ni anon, ni service_role, ni
--     PUBLIC).
--
-- Choix techniques :
--   - SECURITY DEFINER : la fonction s'exécute sous tenga_owner, qui lit
--     app.campaigns, app.participations et app.results (règles *_lecture_owner,
--     0003). Aucun droit ni règle nouveau : aucune table, règle ni déclencheur
--     touché (les listes figées des tests 13 ne bougent pas) ; seule la liste
--     figée des fonctions exécutables du test 08 gagne une ligne.
--   - Les colonnes de RETURNS TABLE sont des variables plpgsql : toute référence
--     de colonne du corps est qualifiée par son alias de table (c., pa., r.).
--   - VOLATILE (elle écrit au journal) : pas de STABLE.
--   - Rejouable (CREATE OR REPLACE, REVOKE puis GRANT).

CREATE OR REPLACE FUNCTION app.lister_resultats_campagne(p_campagne uuid)
RETURNS TABLE (participation_id uuid, soumis_le timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_n   integer;
  v_ids uuid[];
  v_dts timestamptz[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id INTO v_org FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  -- Une seule lecture (READ COMMITTED : deux requêtes pourraient voir deux états
  -- différents si un résultat est soumis entre elles) : les lignes sont figées dans
  -- deux tableaux parallèles, le journal compte ces lignes et l'appelant reçoit
  -- exactement elles, dans l'ordre de la lecture.
  SELECT pg_catalog.array_agg(r.participation_id ORDER BY r.soumis_le, r.participation_id),
         pg_catalog.array_agg(r.soumis_le ORDER BY r.soumis_le, r.participation_id)
    INTO v_ids, v_dts
    FROM app.results r
    JOIN app.participations pa ON pa.id = r.participation_id
   WHERE pa.campaign_id = p_campagne;
  v_n := COALESCE(pg_catalog.cardinality(v_ids), 0);
  PERFORM private.journaliser(v_uid, 'resultat.lister', 'campagne', p_campagne, v_org, v_n);
  RETURN QUERY
    SELECT u.pid, u.dt
      FROM pg_catalog.unnest(v_ids, v_dts) WITH ORDINALITY AS u(pid, dt, ord)
     ORDER BY u.ord;
END
$$;

-- Droits : défense en profondeur (comme 0008, 0010, 0013, 0014 et 0019), puis
-- EXECUTE pour authenticated seul.
REVOKE ALL ON FUNCTION app.lister_resultats_campagne(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION app.lister_resultats_campagne(uuid) TO authenticated;
