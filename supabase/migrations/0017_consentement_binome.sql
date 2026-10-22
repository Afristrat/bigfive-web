-- 0017 : consentement du binôme (étape C2a du plan de branchement du
-- questionnaire sur le moteur, écart X8, décision D2 des bases des rapports).
--
-- Besoin : un rapport de binôme compare les scores de DEUX personnes. Il n'est
-- licite que si les deux l'ont accepté, explicitement, et peuvent le retirer. La
-- base ne portait aucune notion de consentement. Cette migration ajoute :
--
--   app.binomes : une proposition de binôme entre deux participations
--     TERMINÉES de la MÊME organisation (clés étrangères composites avec
--     l'organisation), un accord par personne, un retrait. RLS forcée, aucune
--     écriture par l'API (déclencheur private.refuser_ecriture_api), aucun droit
--     de table pour anon, authenticated ni service_role : tout passe par les
--     quatre fonctions ci-dessous. Les deux participations sont rangées dans
--     l'ordre croissant des identifiants (participation_a < participation_b) :
--     un couple ne s'écrit qu'une fois, quel que soit le sens de la proposition.
--
--   app.proposer_binome(p_a uuid, p_b uuid) RETURNS uuid
--     Consultant de l'organisation ou administrateur Tenga. Deux participations
--     terminées, de deux personnes différentes, de la même organisation ; une
--     seule proposition en cours par couple. Refus 42501 sans distinguer une
--     participation inexistante d'une participation interdite (le droit est lu
--     sur la première) ; autres entrées invalides : 22023, un seul message.
--
--   app.repondre_binome(p_binome uuid, p_accord boolean) RETURNS text
--     Titulaire de l'une des deux participations. p_accord vrai : accord daté
--     (rejouable sans effet). p_accord faux : refus (avant son propre accord) ou
--     retrait (après) ; DÉFINITIF pour cette proposition. Renvoie « en_attente »,
--     « actif » ou « retire ». Proposition inexistante ou qui ne concerne pas
--     l'appelant : P0002 « Proposition introuvable », même message.
--
--   app.mes_binomes() RETURNS TABLE (...)
--     Les propositions qui concernent l'appelant, avec le nom de profil de
--     l'AUTRE personne tant que la proposition n'est pas retirée (consentement
--     éclairé : on sait avec qui on accepte). DÉFAUT NON VALIDÉ par Amine (plan
--     § 6, question 8). Le statut est « en_attente », « actif » ou « retire » ;
--     l'accord de l'autre personne n'est jamais montré séparément.
--
--   app.lire_binome(p_binome uuid) RETURNS TABLE (...)
--     Les scores des deux participations (jamais les réponses), seulement si les
--     DEUX accords existent et si la proposition n'est pas retirée, pour les deux
--     personnes, le consultant de l'organisation et l'administrateur Tenga. Le
--     responsable de l'organisation, un autre participant, un consultant d'une
--     autre organisation et l'anonyme sont refusés (42501, même message pour une
--     proposition inexistante). Lecture journalisée (binome.lire, quantité = 2)
--     AVANT le renvoi ; un refus n'écrit rien. La facette O6 (opinions, donnée
--     sensible) est retirée de toute ligne qui n'est pas celle de l'appelant :
--     DÉFAUT NON VALIDÉ par Amine (plan § 6, question 5). ATTENTION : le score
--     du domaine O reste renvoyé ; O6 se déduit du score du domaine O moins les
--     cinq autres facettes. Le retrait réel de O6 exige une décision sur le
--     domaine O d'une autre personne (voir le rapport C2a).
--
-- Journal : binome.proposer, binome.accepter, binome.refuser, binome.retirer,
-- binome.lire (ressource de type binome, organisation du binôme). Aucune adresse
-- ni aucun nom.
--
-- Conservation et effacement : une ligne de consentement ne contient aucun score
-- (identifiants et dates seulement). Elle s'efface en cascade avec l'une de ses
-- participations (suppression de compte, d'organisation ou de campagne) ; le
-- compte du consultant qui a proposé peut disparaître sans effacer la
-- proposition (propose_par passe à NULL). Les scores restent soumis à la durée
-- des résultats (purge de app.results) : un résultat purgé rend le binôme
-- illisible (55000), la ligne de consentement subsiste jusqu'à l'effacement de
-- la participation. DÉFAUT NON VALIDÉ par Amine : durée de conservation égale à
-- celle des résultats.
-- ponytail: la ligne de consentement n'est pas purgée avec le résultat, parce
-- que private.purger_quotidien est aussi redéfinie par le lot mot de passe (hors
-- dépôt, collision de numéros). Plafond : tant que le volume de binômes reste de
-- quelques centaines de lignes ; réexamen : à la reprise du lot mot de passe,
-- ajouter la purge des binômes dont un résultat a disparu.
--
-- Contraintes tenues : SECURITY DEFINER pour les quatre fonctions, search_path
-- vide, objets qualifiés ; propriétaire tenga_owner (migrate.sh) ; EXECUTE pour
-- authenticated seul. Les colonnes de RETURNS TABLE sont des variables plpgsql :
-- toute référence de colonne du corps est qualifiée par son alias de table.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Table ------------------------------------------------------------------
CREATE TABLE app.binomes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  participation_a uuid NOT NULL,
  participation_b uuid NOT NULL,
  propose_par     uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  propose_le      timestamptz NOT NULL DEFAULT now(),
  accord_a_le     timestamptz,
  accord_b_le     timestamptz,
  retire_le       timestamptz,
  CONSTRAINT binomes_participation_a_fkey
    FOREIGN KEY (participation_a, organization_id) REFERENCES app.participations (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT binomes_participation_b_fkey
    FOREIGN KEY (participation_b, organization_id) REFERENCES app.participations (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT binomes_ordre_des_participations CHECK (participation_a < participation_b),
  CONSTRAINT binomes_accord_a_apres_proposition CHECK (accord_a_le IS NULL OR accord_a_le >= propose_le),
  CONSTRAINT binomes_accord_b_apres_proposition CHECK (accord_b_le IS NULL OR accord_b_le >= propose_le),
  CONSTRAINT binomes_retrait_apres_proposition CHECK (retire_le IS NULL OR retire_le >= propose_le)
);
-- Une seule proposition EN COURS par couple ; une proposition retirée n'empêche
-- pas d'en faire une nouvelle (le consentement se redonne alors de zéro).
CREATE UNIQUE INDEX binomes_proposition_en_cours_uniq
  ON app.binomes (participation_a, participation_b) WHERE retire_le IS NULL;
CREATE INDEX binomes_participation_a_idx ON app.binomes (participation_a);
CREATE INDEX binomes_participation_b_idx ON app.binomes (participation_b);
CREATE INDEX binomes_organisation_idx ON app.binomes (organization_id);
COMMENT ON TABLE app.binomes IS
  'Consentement du binôme : deux participations terminées de la même organisation, un accord par personne, un retrait définitif. Aucun score. Aucun accès direct par l''API.';

ALTER TABLE app.binomes ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;

-- 2. Verrous ----------------------------------------------------------------
-- Verrou 3 du plan § 3.3 : toute écriture venant d'un rôle de l'API est refusée.
CREATE TRIGGER binomes_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.binomes
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER binomes_sans_vidage_api
  BEFORE TRUNCATE ON app.binomes
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- Le consentement ne se réécrit pas, même par une fonction fautive ou un
-- superutilisateur : les personnes, l'organisation et la date de proposition ne
-- changent jamais ; un accord donné ne se modifie pas (il se retire) ; une
-- proposition retirée est définitive. Seule exception : propose_par passe à NULL
-- quand le compte du consultant qui a proposé est effacé (ON DELETE SET NULL).
-- Nommé « binomes_transition » pour se déclencher APRÈS binomes_sans_ecriture_api
-- (ordre alphabétique).
CREATE FUNCTION private.verifier_transition_binome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.organization_id <> OLD.organization_id
     OR NEW.participation_a <> OLD.participation_a OR NEW.participation_b <> OLD.participation_b
     OR NEW.propose_le <> OLD.propose_le
     OR (NEW.propose_par IS DISTINCT FROM OLD.propose_par AND NEW.propose_par IS NOT NULL) THEN
    RAISE EXCEPTION 'Une proposition de binôme ne change ni de personnes ni d''origine' USING ERRCODE = '55000';
  END IF;
  IF OLD.retire_le IS NOT NULL
     AND (NEW.retire_le IS DISTINCT FROM OLD.retire_le
          OR NEW.accord_a_le IS DISTINCT FROM OLD.accord_a_le
          OR NEW.accord_b_le IS DISTINCT FROM OLD.accord_b_le) THEN
    RAISE EXCEPTION 'Proposition close : un refus ou un retrait est définitif' USING ERRCODE = '55000';
  END IF;
  IF (OLD.accord_a_le IS NOT NULL AND NEW.accord_a_le IS DISTINCT FROM OLD.accord_a_le)
     OR (OLD.accord_b_le IS NOT NULL AND NEW.accord_b_le IS DISTINCT FROM OLD.accord_b_le) THEN
    RAISE EXCEPTION 'Un accord ne se modifie pas : il se retire' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER binomes_transition
  BEFORE UPDATE ON app.binomes
  FOR EACH ROW EXECUTE FUNCTION private.verifier_transition_binome();

-- 3. Règles : tenga_owner seul (les fonctions contrôlées). Aucune règle pour le
-- rôle connecté, aucune pour la suppression (l'effacement en cascade passe).
CREATE POLICY binomes_lecture_owner ON app.binomes FOR SELECT TO tenga_owner USING (true);
CREATE POLICY binomes_insertion_owner ON app.binomes FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY binomes_modification_owner ON app.binomes FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

-- 4. Fonctions --------------------------------------------------------------

-- 4.1 Proposer un binôme (consultant de l'organisation ou administrateur Tenga).
CREATE FUNCTION app.proposer_binome(p_a uuid, p_b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT pa.organization_id INTO v_org FROM app.participations pa WHERE pa.id = p_a;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_b IS NULL OR p_a = p_b
     OR (SELECT pg_catalog.count(*) FROM app.participations pa
           JOIN app.results r ON r.participation_id = pa.id
          WHERE pa.id IN (p_a, p_b) AND pa.organization_id = v_org) <> 2
     OR (SELECT pg_catalog.count(DISTINCT pa.user_id) FROM app.participations pa
          WHERE pa.id IN (p_a, p_b)) <> 2 THEN
    RAISE EXCEPTION 'Binôme invalide : deux participations terminées, de deux personnes différentes, de la même organisation' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM app.binomes b
              WHERE b.participation_a = LEAST(p_a, p_b) AND b.participation_b = GREATEST(p_a, p_b)
                AND b.retire_le IS NULL) THEN
    RAISE EXCEPTION 'Une proposition est déjà en cours pour ces deux personnes' USING ERRCODE = '23505';
  END IF;
  INSERT INTO app.binomes (organization_id, participation_a, participation_b, propose_par)
  VALUES (v_org, LEAST(p_a, p_b), GREATEST(p_a, p_b), v_uid)
  RETURNING id INTO v_id;
  PERFORM private.journaliser(v_uid, 'binome.proposer', 'binome', v_id, v_org);
  RETURN v_id;
END
$$;

-- 4.2 Répondre à une proposition (titulaire de l'une des deux participations).
CREATE FUNCTION app.repondre_binome(p_binome uuid, p_accord boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_cote   text;
  v_acc_a  timestamptz;
  v_acc_b  timestamptz;
  v_retire timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_accord IS NULL THEN
    RAISE EXCEPTION 'Réponse invalide : accord ou refus attendu' USING ERRCODE = '22023';
  END IF;
  SELECT b.organization_id, CASE WHEN pa.user_id = v_uid THEN 'a' ELSE 'b' END,
         b.accord_a_le, b.accord_b_le, b.retire_le
    INTO v_org, v_cote, v_acc_a, v_acc_b, v_retire
    FROM app.binomes b
    JOIN app.participations pa ON pa.id = b.participation_a
    JOIN app.participations pb ON pb.id = b.participation_b
   WHERE b.id = p_binome AND v_uid IN (pa.user_id, pb.user_id)
     FOR UPDATE OF b;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposition introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_retire IS NOT NULL THEN
    RAISE EXCEPTION 'Proposition close : un refus ou un retrait est définitif' USING ERRCODE = '55000';
  END IF;
  IF p_accord THEN
    IF v_cote = 'a' AND v_acc_a IS NULL THEN
      UPDATE app.binomes b SET accord_a_le = now() WHERE b.id = p_binome;
      v_acc_a := now();
      PERFORM private.journaliser(v_uid, 'binome.accepter', 'binome', p_binome, v_org);
    ELSIF v_cote = 'b' AND v_acc_b IS NULL THEN
      UPDATE app.binomes b SET accord_b_le = now() WHERE b.id = p_binome;
      v_acc_b := now();
      PERFORM private.journaliser(v_uid, 'binome.accepter', 'binome', p_binome, v_org);
    END IF;
    IF v_acc_a IS NOT NULL AND v_acc_b IS NOT NULL THEN
      RETURN 'actif';
    END IF;
    RETURN 'en_attente';
  END IF;
  UPDATE app.binomes b SET retire_le = now() WHERE b.id = p_binome;
  IF (v_cote = 'a' AND v_acc_a IS NOT NULL) OR (v_cote = 'b' AND v_acc_b IS NOT NULL) THEN
    PERFORM private.journaliser(v_uid, 'binome.retirer', 'binome', p_binome, v_org);
  ELSE
    PERFORM private.journaliser(v_uid, 'binome.refuser', 'binome', p_binome, v_org);
  END IF;
  RETURN 'retire';
END
$$;

-- 4.3 Mes propositions de binôme. Le nom de l'autre personne n'est montré que
-- tant que la proposition n'est pas retirée.
CREATE FUNCTION app.mes_binomes()
RETURNS TABLE (binome_id uuid, organisation_nom text, ma_participation uuid, propose_le timestamptz,
               statut text, mon_accord_le timestamptz, autre_nom text)
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
    SELECT b.id, o.nom, mine.id, b.propose_le,
           CASE WHEN b.retire_le IS NOT NULL THEN 'retire'
                WHEN b.accord_a_le IS NOT NULL AND b.accord_b_le IS NOT NULL THEN 'actif'
                ELSE 'en_attente' END,
           CASE WHEN mine.id = b.participation_a THEN b.accord_a_le ELSE b.accord_b_le END,
           CASE WHEN b.retire_le IS NULL THEN pr.nom END
      FROM app.binomes b
      JOIN app.participations mine ON mine.user_id = v_uid AND mine.id IN (b.participation_a, b.participation_b)
      JOIN app.participations autre
        ON autre.id = CASE WHEN mine.id = b.participation_a THEN b.participation_b ELSE b.participation_a END
      JOIN app.organizations o ON o.id = b.organization_id
      LEFT JOIN app.profiles pr ON pr.user_id = autre.user_id
     ORDER BY b.propose_le DESC, b.id;
END
$$;

-- 4.4 Lire un binôme : scores des deux participations, deux accords exigés.
CREATE FUNCTION app.lire_binome(p_binome uuid)
RETURNS TABLE (participation_id uuid, cote text, est_la_mienne boolean, scores jsonb,
               questionnaire_version text, calcul_version text, soumis_le timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_pa     uuid;
  v_pb     uuid;
  v_acc_a  timestamptz;
  v_acc_b  timestamptz;
  v_retire timestamptz;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT b.organization_id, b.participation_a, b.participation_b, b.accord_a_le, b.accord_b_le, b.retire_le
    INTO v_org, v_pa, v_pb, v_acc_a, v_acc_b, v_retire
    FROM app.binomes b WHERE b.id = p_binome;
  IF NOT FOUND
     OR NOT (app.suis_admin_tenga()
             OR COALESCE(app.mon_role(v_org) = 'consultant', false)
             OR EXISTS (SELECT 1 FROM app.participations pa WHERE pa.id IN (v_pa, v_pb) AND pa.user_id = v_uid)) THEN
    RAISE EXCEPTION 'Réservé aux deux personnes, au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_retire IS NOT NULL OR v_acc_a IS NULL OR v_acc_b IS NULL THEN
    RAISE EXCEPTION 'Lecture impossible : le consentement des deux personnes est requis' USING ERRCODE = '55000';
  END IF;
  SELECT pg_catalog.count(*)::integer INTO v_n FROM app.results r WHERE r.participation_id IN (v_pa, v_pb);
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'Résultats indisponibles pour ce binôme' USING ERRCODE = '55000';
  END IF;
  PERFORM private.journaliser(v_uid, 'binome.lire', 'binome', p_binome, v_org, v_n);
  RETURN QUERY
    SELECT r.participation_id,
           CASE WHEN r.participation_id = v_pa THEN 'a' ELSE 'b' END,
           r.user_id = v_uid,
           CASE WHEN r.user_id = v_uid THEN r.scores ELSE r.scores #- '{O,facettes,6}' END,
           r.questionnaire_version, r.calcul_version, r.soumis_le
      FROM app.results r
     WHERE r.participation_id IN (v_pa, v_pb)
     ORDER BY CASE WHEN r.participation_id = v_pa THEN 0 ELSE 1 END;
END
$$;

-- 5. Droits : défense en profondeur (comme 0008, 0010, 0013, 0014, 0015 et
-- 0016), puis EXECUTE pour authenticated seul.
REVOKE ALL ON FUNCTION app.proposer_binome(uuid, uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.repondre_binome(uuid, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.mes_binomes() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.lire_binome(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION app.proposer_binome(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.repondre_binome(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION app.mes_binomes() TO authenticated;
GRANT EXECUTE ON FUNCTION app.lire_binome(uuid) TO authenticated;
