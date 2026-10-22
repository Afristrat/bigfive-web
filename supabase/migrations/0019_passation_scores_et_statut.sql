-- 0019 : contrat de passation tenu EN BASE (étape M3 du plan de branchement du
-- questionnaire sur le moteur, écarts X3 et X10).
--
-- X3. Jusqu'ici app.soumettre_resultat acceptait tout objet comme « scores » et
-- tout objet de nombres (500 clés au plus) comme « réponses » (0003). Les
-- agrégats de la migration 0005 lisent scores.<domaine>.score : une forme
-- inconnue y produisait des moyennes fausses, sans erreur. La base refuse
-- désormais ce que le serveur (qui calcule les scores) ne produirait jamais,
-- en défense en profondeur derrière lui. Forme « tenga-scores-1 » :
--   p_reponses : exactement 120 clés, chaque valeur un ENTIER de 1 à 5 (écriture
--                canonique : 3, jamais 3.0 ni 2.5) ;
--   p_scores   : format = 'tenga-scores-1' ; pour chacun des cinq domaines N, E,
--                O, A, C : score entier de 24 à 120, count = 24, exactement six
--                facettes numérotées 1 à 6, chacune de score entier de 4 à 20 et
--                de count = 4, la somme des six scores de facette étant égale au
--                score du domaine. Les clés « moyenne » et « meta » ne sont pas
--                contrôlées (dérivées ou facultatives) ; les clés inconnues sont
--                conservées telles quelles.
--   Toute violation : 22023.
-- L'ordre des refus de 0003 est conservé : connexion, participation, déjà
-- soumise, campagne ouverte, rôle, versions, réponses de type objet de nombres,
-- scores de type objet ; la forme n'est contrôlée qu'ensuite. Un refus
-- n'écrit rien (rien n'est inséré, la participation reste ouverte).
-- La base ne peut PAS vérifier que les scores correspondent aux réponses : le
-- domaine et la facette de chaque question sont dans le paquet du
-- questionnaire, pas en base. C'est le serveur qui calcule ; ici on ne
-- contrôle que la cohérence interne (bornes, effectifs, sommes).
--
-- X10. app.mes_resultats renvoyait le statut de la participation mais pas celui
-- de la campagne : une participation « ouverte » d'une campagne close menait à
-- un refus 55000 à la soumission. La fonction ajoute la colonne
-- campagne_statut (statut de la campagne). Le type de retour change : CREATE OR
-- REPLACE est impossible, la fonction est supprimée puis recréée ; droits
-- rétablis à l'identique de 0003 (EXECUTE pour authenticated seul).
-- Aucune autre migration ni code de l'application n'appelle app.mes_resultats ;
-- la colonne est ajoutée EN DERNIER, l'ordre des autres colonnes est inchangé.
--
-- Contraintes tenues : SECURITY DEFINER, search_path vide, objets qualifiés ;
-- aucune table, règle ni déclencheur touché (les listes figées des tests 08 et
-- 13 ne bougent pas) ; app.soumettre_resultat garde sa signature, son
-- propriétaire et ses droits (CREATE OR REPLACE les conserve) ; aucune ligne de
-- journal nouvelle.

CREATE OR REPLACE FUNCTION app.soumettre_resultat(p_participation uuid, p_reponses jsonb, p_scores jsonb,
                                                  p_questionnaire_version text, p_calcul_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_camp    uuid;
  v_statut  text;
  v_cstatut text;
  v_dom     text;
  v_d       jsonb;
  v_fs      jsonb;
  v_f       jsonb;
  v_i       integer;
  v_score   integer;
  v_fscore  integer;
  v_somme   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT p.organization_id, p.campaign_id, p.statut INTO v_org, v_camp, v_statut
  FROM app.participations p WHERE p.id = p_participation AND p.user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_statut = 'terminee' THEN
    RAISE EXCEPTION 'Résultat déjà soumis' USING ERRCODE = '23505';
  END IF;
  SELECT c.statut INTO v_cstatut FROM app.campaigns c WHERE c.id = v_camp;
  IF v_cstatut <> 'ouverte' THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;
  IF app.mon_role(v_org) IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Rôle de participant requis' USING ERRCODE = '42501';
  END IF;
  IF p_questionnaire_version IS NULL OR p_questionnaire_version !~ '^[A-Za-z0-9._-]{1,40}$'
     OR p_calcul_version IS NULL OR p_calcul_version !~ '^[A-Za-z0-9._-]{1,40}$' THEN
    RAISE EXCEPTION 'Version du questionnaire ou du calcul invalide' USING ERRCODE = '22023';
  END IF;
  IF p_reponses IS NULL OR pg_catalog.jsonb_typeof(p_reponses) <> 'object'
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_reponses)) > 500
     OR pg_catalog.jsonb_path_exists(p_reponses, '$.* ? (@.type() != "number")') THEN
    RAISE EXCEPTION 'Réponses invalides : un objet de nombres, 500 au plus' USING ERRCODE = '22023';
  END IF;
  IF p_scores IS NULL OR pg_catalog.jsonb_typeof(p_scores) <> 'object' THEN
    RAISE EXCEPTION 'Scores invalides : un objet est attendu' USING ERRCODE = '22023';
  END IF;

  -- Forme des réponses : 120 clés, entiers de 1 à 5.
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_reponses)) <> 120
     OR EXISTS (SELECT 1 FROM pg_catalog.jsonb_each(p_reponses) e WHERE e.value::text !~ '^[1-5]$') THEN
    RAISE EXCEPTION 'Réponses invalides : 120 entiers de 1 à 5 attendus' USING ERRCODE = '22023';
  END IF;

  -- Forme des scores : tenga-scores-1, cinq domaines de six facettes.
  IF (p_scores ->> 'format') IS DISTINCT FROM 'tenga-scores-1' THEN
    RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
  END IF;
  FOREACH v_dom IN ARRAY ARRAY['N', 'E', 'O', 'A', 'C'] LOOP
    v_d := p_scores -> v_dom;
    IF v_d IS NULL OR pg_catalog.jsonb_typeof(v_d) <> 'object' THEN
      RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
    END IF;
    -- L'expression de contrôle est évaluée avant la conversion (CASE), jamais
    -- l'inverse : un texte qui n'est pas un entier ne doit pas lever 22P02.
    v_score := CASE WHEN (v_d -> 'score')::text ~ '^[0-9]{1,3}$' THEN (v_d -> 'score')::text::integer END;
    IF v_score IS NULL OR v_score NOT BETWEEN 24 AND 120
       OR (v_d -> 'count')::text IS DISTINCT FROM '24' THEN
      RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
    END IF;
    v_fs := v_d -> 'facettes';
    IF v_fs IS NULL OR pg_catalog.jsonb_typeof(v_fs) <> 'object'
       OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v_fs)) <> 6 THEN
      RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
    END IF;
    v_somme := 0;
    FOR v_i IN 1..6 LOOP
      v_f := v_fs -> (v_i::text);
      IF v_f IS NULL OR pg_catalog.jsonb_typeof(v_f) <> 'object' THEN
        RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
      END IF;
      v_fscore := CASE WHEN (v_f -> 'score')::text ~ '^[0-9]{1,2}$' THEN (v_f -> 'score')::text::integer END;
      IF v_fscore IS NULL OR v_fscore NOT BETWEEN 4 AND 20
         OR (v_f -> 'count')::text IS DISTINCT FROM '4' THEN
        RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
      END IF;
      v_somme := v_somme + v_fscore;
    END LOOP;
    IF v_somme <> v_score THEN
      RAISE EXCEPTION 'Scores invalides : forme tenga-scores-1 attendue' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores,
                           questionnaire_version, calcul_version)
  VALUES (p_participation, v_org, v_uid, p_reponses, p_scores, p_questionnaire_version, p_calcul_version);
  DELETE FROM app.attempts WHERE participation_id = p_participation;
  UPDATE app.participations
     SET statut = 'terminee', terminee_le = now(), commencee_le = COALESCE(commencee_le, now())
   WHERE id = p_participation;
  PERFORM private.journaliser(v_uid, 'resultat.soumettre', 'participation', p_participation, v_org);
  RETURN p_participation;
END
$$;

-- Le type de retour change (colonne ajoutée) : suppression puis création.
DROP FUNCTION app.mes_resultats();

CREATE FUNCTION app.mes_resultats()
RETURNS TABLE (participation_id uuid, campagne_id uuid, campagne_titre text, organisation_nom text,
               organisation_slug text, statut text, ouverte_le timestamptz, terminee_le timestamptz,
               scores jsonb, questionnaire_version text, calcul_version text, campagne_statut text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.campaign_id, c.titre, o.nom, o.slug, p.statut, p.ouverte_le, p.terminee_le,
           r.scores, r.questionnaire_version, r.calcul_version, c.statut
    FROM app.participations p
    JOIN app.campaigns c ON c.id = p.campaign_id
    JOIN app.organizations o ON o.id = p.organization_id
    LEFT JOIN app.results r ON r.participation_id = p.id
    WHERE p.user_id = v_uid
    ORDER BY p.ouverte_le DESC, p.id;
END
$$;

-- Droits : défense en profondeur (comme 0008, 0011, 0013 et 0014), puis
-- EXECUTE rétabli à l'identique de 0003 (authenticated seul).
REVOKE ALL ON FUNCTION app.mes_resultats() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION app.mes_resultats() TO authenticated;
