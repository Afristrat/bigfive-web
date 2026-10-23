-- 0022 : atelier de relecture de la bibliothèque de textes (recommandation 1 du
-- comparatif DISC et Big Five : faire relire les blocs, en commençant par ceux
-- qui apparaissent le plus).
--
-- Conservation : verdict courant conservé et anonymisé : décision d'Amine.
--
-- Besoin : les 150 blocs d'interprétation de la bibliothèque
-- (docs/design/bibliotheque-textes/facettes.json, copie
-- web/src/data/bibliotheque-facettes.json) sont tous « non relue » ; un bloc non
-- relu est masqué à la personne. Jusqu'ici, un bloc ne se marquait « relu »
-- qu'en éditant le fichier du dépôt. L'état de relecture vit désormais en base ;
-- le fichier reste la seule source du TEXTE. La base ne dit que ceci : tel
-- relecteur a jugé, à telle date, le texte d'empreinte E du bloc B « relu » ou
-- « à corriger » (commentaire obligatoire). Un bloc dont le texte change change
-- d'empreinte : aucun verdict ne vaut plus pour lui, il redevient « à relire »
-- (décision d'Amine : validé tel quel). L'empreinte est calculée par
-- l'application (SHA-256, 64 caractères hexadécimaux) ; la base ne connaît pas
-- les textes et ne la vérifie donc pas : une empreinte fausse ne s'applique à
-- aucun texte servi.
--
--   private.relecteurs_bibliotheque : relecteurs désignés par un super
--     administrateur (en plus des super administrateurs, relecteurs de droit).
--     Aucune autre donnée que le compte et la date. Effacé avec le compte.
--
--   app.relectures_blocs : historique en ajout seul. Bloc, empreinte, verdict,
--     commentaire, relecteur, date, drapeau « anonymise » ; colonne « ordre »
--     croissante pour départager deux verdicts de la même transaction. Ni
--     modification, ni suppression, ni vidage, même par une écriture directe d'un
--     superutilisateur, sauf : relecteur passe à NULL pendant l'effacement du
--     compte du relecteur (et seulement alors), et la purge de conservation
--     ci-dessous (seule à pouvoir effacer ou anonymiser). Cette table est la SEULE
--     trace nominative des verdicts, 30 jours au plus : le journal inscrit chaque
--     verdict sans auteur ni identifiant.
--
--   Les deux tables : RLS forcée, aucun droit pour anon, authenticated ni
--   service_role, écriture refusée à l'API (private.refuser_ecriture_api) ;
--   tout passe par les fonctions ci-dessous.
--
-- Conservation de l'historique (décision d'Amine : 30 jours au plus). Les blocs
-- ne sont jamais re-masqués : on garde, par couple (bloc, empreinte), le SEUL
-- verdict courant (le dernier, colonne « ordre ») ; toute autre ligne (verdicts
-- antérieurs et leurs commentaires) est effacée à 30 jours ; sur le verdict
-- courant de plus de 30 jours, relecteur et commentaire sont effacés (bloc,
-- empreinte, verdict et date gardés, anonymise = vrai). La purge est
-- private.purger_historique_relecture() (SECURITY DEFINER, search_path vide ;
-- elle pose le réglage tenga.purge_relecture le temps de ses deux écritures,
-- puis le fait retomber), appelée par private.purger_quotidien() (redéfinie
-- ci-dessous à l'identique de 0018 plus ce seul appel). Le déclencheur
-- d'immuabilité ne laisse passer une suppression ou une anonymisation que dans
-- ce contexte (rôle courant tenga_owner ET réglage posé) et seulement pour une
-- ligne qui y a droit (échue ; non courante pour une suppression ; anonymisation
-- complète, une seule fois). Le réglage seul, posé à la main, ne suffit à aucun
-- autre rôle ; tenga_owner qui le pose ne peut faire que ce que la purge ferait.
-- Aucun droit UPDATE ni DELETE n'est ouvert aux rôles applicatifs.
--
--   app.suis_relecteur() RETURNS boolean
--     Vrai pour un super administrateur ou un relecteur désigné ; faux sans
--     identité. Ne répond que sur l'appelant.
--
--   app.relire_bloc(p_bloc, p_empreinte, p_verdict, p_commentaire) RETURNS uuid
--     Relecteur seulement (42501 « Réservé aux relecteurs de la bibliothèque »).
--     Bloc « N1/bas » (domaine, facette 1 à 6, cinq niveaux), empreinte de 64
--     caractères hexadécimaux, verdict « relu » ou « a_corriger », commentaire
--     de 2 000 caractères au plus, obligatoire pour « a_corriger » : toute autre
--     entrée, 22023 « Relecture invalide : bloc, empreinte, verdict ou
--     commentaire », sans écriture. Le même verdict rejoué par le même relecteur
--     sur le même texte avec le même commentaire n'écrit rien et rend la ligne
--     existante (double clic). Les blancs qui entourent le commentaire sont
--     retirés, espaces Unicode comprises (insécables, fines, idéographique...).
--     Plafond (décision d'Amine) : 200 verdicts écrits par heure glissante et par
--     personne (PT429 « Plafond de verdicts atteint », sans écriture). Verrous
--     consultatifs par personne puis par bloc. Journal relecture.relu ou
--     relecture.a_corriger (type relecture) SANS acteur ni identifiant de verdict
--     (décision 4 d'Amine : 30 jours au plus pour qui a jugé quoi).
--
--   app.historique_relecture() RETURNS TABLE (...)
--     Relecteur seulement. Filtré EN BASE selon app.suis_admin_tenga() (décision
--     d'Amine) : un super administrateur lit tous les verdicts avec le nom de
--     profil et l'adresse du relecteur (NULL si le compte a été effacé ou le
--     verdict anonymisé) ; un relecteur désigné ne lit que SES verdicts, sans nom
--     ni adresse (les colonnes sont NULL), et jamais ceux des autres. Du plus
--     récent au plus ancien, avec est_moi. Chaque lecture est journalisée
--     (relecture.lister, quantité = lignes effectivement rendues). L'état courant
--     de chaque bloc, sans aucune identité, est app.etat_relecture_blocs.
--
--   app.etat_relecture_blocs() RETURNS TABLE (bloc, empreinte, verdict)
--     service_role seulement : le dernier verdict de chaque couple (bloc,
--     empreinte), lu par le serveur pour décider si un bloc s'affiche à la
--     personne et pour montrer l'état de chaque bloc dans l'atelier. Aucune
--     donnée personnelle (ni relecteur, ni commentaire, ni date) ; non journalisé.
--
--   app.frequence_facettes() RETURNS TABLE (facette, score, effectif)
--     Relecteur seulement. Histogramme des scores de facette (format
--     tenga-scores-1) sur l'ensemble des résultats, pour trier les blocs par
--     fréquence d'affichage. Aucune ligne tant que le nombre de résultats est
--     sous private.settings.seuil_anonymat (5 au moins), ni si ce seuil est
--     illisible. Ni identifiant, ni
--     organisation, ni date. Le niveau (et donc le bloc) est déduit par
--     l'application avec ses propres seuils : la base ne les duplique pas.
--
--   app.designer_relecteur(p_utilisateur uuid) RETURNS TABLE (ajoute, langue)
--   app.retirer_relecteur(p_utilisateur uuid) RETURNS boolean
--   app.lister_relecteurs() RETURNS TABLE (user_id, adresse, ajoute_le)
--     Super administrateur seulement (42501 « Réservé aux administrateurs
--     Tenga »). Désigner : compte existant et non suspendu (22023 « Compte
--     inconnu » ou « Compte suspendu ») ; ajoute vrai si ajouté, faux si déjà
--     relecteur ; langue du profil du compte (fr, ar ou en), pour l'avis envoyé
--     par l'application dans la langue du compte. Plafond (décision d'Amine) : 5 désignations par
--     heure glissante et par personne, comptées au journal (PT429 « Plafond de
--     désignations atteint », sans écriture) ; une désignation rejouée n'y compte
--     pas. Retirer : vrai si retiré, faux si absent. Journal relecture.designer,
--     relecture.retirer (type utilisateur) et relecture.lister_relecteurs
--     (quantité). Aucune adresse au journal.
--
--   app.exporter_mes_donnees() (droit d'accès) : redéfinie à l'identique de 0021,
--     plus la clé « relecture » : date de désignation de la personne (NULL si elle
--     n'est pas relectrice désignée) et ses propres verdicts encore en base (bloc,
--     empreinte, verdict, commentaire, date), jamais ceux des autres.
--
-- DÉCISIONS D'AMINE appliquées ici : historique réservé aux super
-- administrateurs ; conservation de 30 jours, verdict courant conservé et
-- anonymisé ; plafonds de 200 verdicts et de 5 désignations par heure et par
-- personne ; avis par e-mail à la désignation ; texte modifié, bloc « à relire ».
-- DÉFAUT NON VALIDÉ par Amine : un relecteur désigné inactif depuis la durée de
-- conservation des comptes vides perd son compte à la purge quotidienne (règle
-- de 0018, inchangée).
-- Résiduel : les verrous consultatifs (plafond, verdicts simultanés) ne
-- s'éprouvent qu'avec deux sessions réelles ; aucune instance de test n'est
-- permise et la production n'accepte que des transactions annulées : la
-- mutation de contrôle (tests/mutations-concurrence) reste à jouer.
--
-- Contraintes tenues : SECURITY DEFINER, search_path vide, objets qualifiés ;
-- propriétaire tenga_owner (migrate.sh) ; EXECUTE pour authenticated seul, sauf
-- app.etat_relecture_blocs (service_role seul) et les fonctions de private
-- (aucun rôle de l'API). Les colonnes de RETURNS TABLE sont des variables
-- plpgsql : toute référence de colonne du corps est qualifiée par son alias de
-- table.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Tables -----------------------------------------------------------------
CREATE TABLE private.relecteurs_bibliotheque (
  user_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  ajoute_le timestamptz NOT NULL DEFAULT pg_catalog.now()
);
COMMENT ON TABLE private.relecteurs_bibliotheque IS
  'Relecteurs de la bibliothèque désignés par un super administrateur. Aucun accès direct par l''API.';
ALTER TABLE private.relecteurs_bibliotheque ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;

CREATE TABLE app.relectures_blocs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordre       bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  bloc        text NOT NULL CHECK (bloc ~ '^[NEOAC][1-6]/(bas|plutot_bas|milieu|plutot_haut|haut)$'),
  empreinte   text NOT NULL CHECK (empreinte ~ '^[0-9a-f]{64}$'),
  verdict     text NOT NULL CHECK (verdict IN ('relu', 'a_corriger')),
  commentaire text CHECK (commentaire IS NULL OR pg_catalog.char_length(commentaire) BETWEEN 1 AND 2000),
  relecteur   uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  cree_le     timestamptz NOT NULL DEFAULT pg_catalog.now(),
  anonymise   boolean NOT NULL DEFAULT false,
  CONSTRAINT relectures_blocs_commentaire_si_a_corriger CHECK (verdict <> 'a_corriger' OR commentaire IS NOT NULL OR anonymise),
  CONSTRAINT relectures_blocs_anonymise_sans_identite CHECK (NOT anonymise OR (commentaire IS NULL AND relecteur IS NULL))
);
CREATE INDEX relectures_blocs_bloc_idx ON app.relectures_blocs (bloc, empreinte, ordre);
-- Clé étrangère relecteur (ON DELETE SET NULL à l'effacement d'un compte) et
-- plafond des verdicts (verdicts d'une personne dans l'heure).
CREATE INDEX relectures_blocs_relecteur_idx ON app.relectures_blocs (relecteur, cree_le) WHERE relecteur IS NOT NULL;
COMMENT ON TABLE app.relectures_blocs IS
  'Historique en ajout seul des verdicts de relecture de la bibliothèque (bloc, empreinte du texte, verdict). Seule trace nominative des verdicts (le journal les inscrit sans auteur), 30 jours au plus : verdicts antérieurs effacés, verdict courant anonymisé au-delà. Aucun texte, aucune donnée sur les personnes évaluées. Aucun accès direct par l''API.';
ALTER TABLE app.relectures_blocs ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;

-- 2. Verrous ----------------------------------------------------------------
-- Verrou 3 du plan § 3.3 : toute écriture venant d'un rôle de l'API est refusée.
CREATE TRIGGER relecteurs_bibliotheque_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON private.relecteurs_bibliotheque
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER relecteurs_bibliotheque_sans_vidage_api
  BEFORE TRUNCATE ON private.relecteurs_bibliotheque
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER relectures_blocs_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.relectures_blocs
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER relectures_blocs_sans_vidage_api
  BEFORE TRUNCATE ON app.relectures_blocs
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- Durée de conservation de l'historique de relecture (décision d'Amine : 30
-- jours au plus ; une valeur plus courte reste permise, jamais plus longue sans
-- sa décision). Lue par le déclencheur et par la purge : une seule source.
CREATE FUNCTION private.duree_historique_relecture()
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT interval '30 days'
$$;

-- L'historique ne se réécrit pas, même par une fonction fautive ou une
-- écriture directe d'un superutilisateur. Exceptions : relecteur passe à NULL
-- pendant l'effacement du compte du relecteur (ON DELETE SET NULL : le compte
-- n'existe plus), et seulement alors ; dans le contexte de la purge
-- (rôle courant tenga_owner ET réglage tenga.purge_relecture, que pose
-- private.purger_historique_relecture le temps de ses écritures), une ligne échue qui
-- n'est plus le verdict courant de son couple (bloc, empreinte) s'efface, et une
-- ligne échue s'anonymise une fois (commentaire et relecteur à NULL). Nommé
-- « relectures_blocs_transition » pour se déclencher APRÈS
-- relectures_blocs_sans_ecriture_api (ordre alphabétique).
CREATE FUNCTION private.verifier_historique_relecture()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_purge boolean;
  v_echu  boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'Historique de relecture en ajout seul' USING ERRCODE = '55000';
  END IF;
  v_purge := current_user = 'tenga_owner'
             AND COALESCE(pg_catalog.current_setting('tenga.purge_relecture', true), '') = 'on';
  v_echu := OLD.cree_le < pg_catalog.now() - private.duree_historique_relecture();
  IF TG_OP = 'DELETE' THEN
    IF v_purge AND v_echu
       AND EXISTS (SELECT 1 FROM app.relectures_blocs d
                    WHERE d.bloc = OLD.bloc AND d.empreinte = OLD.empreinte AND d.ordre > OLD.ordre) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Historique de relecture en ajout seul' USING ERRCODE = '55000';
  END IF;
  IF NEW.id <> OLD.id OR NEW.ordre <> OLD.ordre OR NEW.bloc <> OLD.bloc
     OR NEW.empreinte <> OLD.empreinte OR NEW.verdict <> OLD.verdict OR NEW.cree_le <> OLD.cree_le
     OR (NEW.relecteur IS DISTINCT FROM OLD.relecteur AND NEW.relecteur IS NOT NULL) THEN
    RAISE EXCEPTION 'Historique de relecture en ajout seul' USING ERRCODE = '55000';
  END IF;
  -- L'auteur ne s'efface que si son compte n'existe plus, ou par l'anonymisation
  -- de la purge (éprouvée juste après).
  IF NEW.relecteur IS NULL AND OLD.relecteur IS NOT NULL AND NOT NEW.anonymise
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = OLD.relecteur) THEN
    RAISE EXCEPTION 'Historique de relecture en ajout seul' USING ERRCODE = '55000';
  END IF;
  IF (NEW.commentaire IS DISTINCT FROM OLD.commentaire OR NEW.anonymise <> OLD.anonymise)
     AND NOT (v_purge AND v_echu AND NOT OLD.anonymise AND NEW.anonymise
              AND NEW.commentaire IS NULL AND NEW.relecteur IS NULL) THEN
    RAISE EXCEPTION 'Historique de relecture en ajout seul' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER relectures_blocs_transition
  BEFORE UPDATE OR DELETE ON app.relectures_blocs
  FOR EACH ROW EXECUTE FUNCTION private.verifier_historique_relecture();
-- Le vidage ne passe par aucun déclencheur de ligne : il est refusé à tous, même
-- au propriétaire et au superutilisateur (après relectures_blocs_sans_vidage_api).
CREATE TRIGGER relectures_blocs_vidage_interdit
  BEFORE TRUNCATE ON app.relectures_blocs
  FOR EACH STATEMENT EXECUTE FUNCTION private.verifier_historique_relecture();

-- 3. Règles : tenga_owner seul (les fonctions contrôlées). La modification de
-- l'historique ne sert qu'à l'effacement d'un compte (relecteur à NULL) et à la
-- purge ; la suppression, qu'à la purge : les deux sont bornées par le
-- déclencheur ci-dessus.
CREATE POLICY relecteurs_lecture_owner ON private.relecteurs_bibliotheque FOR SELECT TO tenga_owner USING (true);
CREATE POLICY relecteurs_insertion_owner ON private.relecteurs_bibliotheque FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY relecteurs_suppression_owner ON private.relecteurs_bibliotheque FOR DELETE TO tenga_owner USING (true);
CREATE POLICY relectures_blocs_lecture_owner ON app.relectures_blocs FOR SELECT TO tenga_owner USING (true);
CREATE POLICY relectures_blocs_insertion_owner ON app.relectures_blocs FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY relectures_blocs_modification_owner ON app.relectures_blocs FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY relectures_blocs_suppression_owner ON app.relectures_blocs FOR DELETE TO tenga_owner USING (true);

-- 4. Fonctions --------------------------------------------------------------

-- 4.1 Suis-je relecteur ? (super administrateur ou relecteur désigné)
CREATE FUNCTION app.suis_relecteur()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (app.suis_admin_tenga()
          OR EXISTS (SELECT 1 FROM private.relecteurs_bibliotheque r WHERE r.user_id = auth.uid()))
$$;

-- 4.2 Rendre un verdict sur le texte d'empreinte p_empreinte du bloc p_bloc.
CREATE FUNCTION app.relire_bloc(p_bloc text, p_empreinte text, p_verdict text, p_commentaire text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  -- Blancs retirés aux deux bouts, espaces Unicode comprises (même ensemble que
  -- String.prototype.trim côté application).
  v_com text := NULLIF(pg_catalog.regexp_replace(p_commentaire,
                  '^[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$',
                  '', 'g'), '');
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_relecteur() THEN
    RAISE EXCEPTION 'Réservé aux relecteurs de la bibliothèque' USING ERRCODE = '42501';
  END IF;
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

-- 4.3 Historique, du plus récent au plus ancien (lecture journalisée), filtré
-- selon app.suis_admin_tenga() : tout pour un super administrateur ; pour un
-- relecteur désigné, ses seuls verdicts et aucune identité.
CREATE FUNCTION app.historique_relecture()
RETURNS TABLE (relecture_id uuid, bloc text, empreinte text, verdict text, commentaire text,
               relecteur_nom text, relecteur_adresse text, est_moi boolean, cree_le timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_admin boolean;
  v_n     integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_relecteur() THEN
    RAISE EXCEPTION 'Réservé aux relecteurs de la bibliothèque' USING ERRCODE = '42501';
  END IF;
  v_admin := COALESCE(app.suis_admin_tenga(), false);
  RETURN QUERY
    SELECT r.id, r.bloc, r.empreinte, r.verdict, r.commentaire,
           NULLIF(pr.nom, ''), u.email::text, COALESCE(r.relecteur = v_uid, false), r.cree_le
      FROM app.relectures_blocs r
      LEFT JOIN auth.users u ON v_admin AND u.id = r.relecteur
      LEFT JOIN app.profiles pr ON v_admin AND pr.user_id = r.relecteur
     WHERE v_admin OR r.relecteur = v_uid
     ORDER BY r.ordre DESC;
  -- Quantité = lignes effectivement rendues par la requête ci-dessus.
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM private.journaliser(v_uid, 'relecture.lister', NULL, NULL, NULL, v_n);
END
$$;

-- 4.4 État servi : dernier verdict de chaque couple (bloc, empreinte).
CREATE FUNCTION app.etat_relecture_blocs()
RETURNS TABLE (bloc text, empreinte text, verdict text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (r.bloc, r.empreinte) r.bloc, r.empreinte, r.verdict
    FROM app.relectures_blocs r
   ORDER BY r.bloc, r.empreinte, r.ordre DESC
$$;

-- 4.5 Histogramme des scores de facette, sous condition d'effectif.
CREATE FUNCTION app.frequence_facettes()
RETURNS TABLE (facette text, score numeric, effectif integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_seuil integer := (SELECT s.seuil_anonymat FROM private.settings s);
  v_n     integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_relecteur() THEN
    RAISE EXCEPTION 'Réservé aux relecteurs de la bibliothèque' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.count(*)::integer INTO v_n
    FROM app.results r WHERE r.scores ->> 'format' = 'tenga-scores-1';
  IF v_seuil IS NULL OR v_n < v_seuil THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT d.code || f.i::text,
           (r.scores #>> ARRAY[d.code, 'facettes', f.i::text, 'score'])::numeric,
           pg_catalog.count(*)::integer
      FROM app.results r
      CROSS JOIN pg_catalog.unnest(ARRAY['N', 'E', 'O', 'A', 'C']) AS d(code)
      CROSS JOIN pg_catalog.generate_series(1, 6) AS f(i)
     WHERE r.scores ->> 'format' = 'tenga-scores-1'
       AND pg_catalog.jsonb_typeof(r.scores #> ARRAY[d.code, 'facettes', f.i::text, 'score']) = 'number'
     GROUP BY 1, 2
     ORDER BY 1, 2;
END
$$;

-- 4.6 Désigner un relecteur (super administrateur). Rend la langue du compte :
-- l'application envoie l'avis de désignation dans cette langue.
CREATE FUNCTION app.designer_relecteur(p_utilisateur uuid)
RETURNS TABLE (ajoute boolean, langue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_langue text;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_utilisateur IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur) THEN
    RAISE EXCEPTION 'Compte inconnu' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur AND u.banned_until > pg_catalog.now()) THEN
    RAISE EXCEPTION 'Compte suspendu' USING ERRCODE = '22023';
  END IF;
  v_langue := COALESCE((SELECT pr.langue FROM app.profiles pr WHERE pr.user_id = p_utilisateur), 'fr');
  -- Les désignations d'une même personne se comptent l'une après l'autre (plafond).
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('relecture.designer.' || v_uid::text));
  IF EXISTS (SELECT 1 FROM private.relecteurs_bibliotheque r WHERE r.user_id = p_utilisateur) THEN
    RETURN QUERY SELECT false, v_langue;
    RETURN;
  END IF;
  -- Plafond (décision d'Amine) : 5 désignations par heure glissante et par personne, lues au journal.
  IF (SELECT pg_catalog.count(*) FROM private.audit_log l
       WHERE l.action = 'relecture.designer' AND l.acteur = v_uid
         AND l.cree_le > pg_catalog.now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Plafond de désignations atteint' USING ERRCODE = 'PT429';
  END IF;
  INSERT INTO private.relecteurs_bibliotheque (user_id) VALUES (p_utilisateur)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN QUERY SELECT false, v_langue;
    RETURN;
  END IF;
  PERFORM private.journaliser(v_uid, 'relecture.designer', 'utilisateur', p_utilisateur);
  RETURN QUERY SELECT true, v_langue;
END
$$;

-- 4.7 Retirer un relecteur désigné (super administrateur).
CREATE FUNCTION app.retirer_relecteur(p_utilisateur uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  DELETE FROM private.relecteurs_bibliotheque r WHERE r.user_id = p_utilisateur;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(v_uid, 'relecture.retirer', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

-- 4.8 Liste des relecteurs désignés (super administrateur, lecture journalisée).
CREATE FUNCTION app.lister_relecteurs()
RETURNS TABLE (user_id uuid, adresse text, ajoute_le timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT r.user_id, u.email::text, r.ajoute_le
      FROM private.relecteurs_bibliotheque r
      JOIN auth.users u ON u.id = r.user_id
     ORDER BY r.ajoute_le, r.user_id;
  -- Quantité = lignes effectivement rendues par la requête ci-dessus.
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM private.journaliser(v_uid, 'relecture.lister_relecteurs', NULL, NULL, NULL, v_n);
END
$$;

-- 4.9 Purge de conservation de l'historique (appelée par la purge quotidienne).
-- Efface toute ligne de plus de 30 jours qui n'est plus le verdict courant de
-- son couple (bloc, empreinte), puis anonymise le verdict courant de plus de 30
-- jours. Le réglage tenga.purge_relecture n'est posé que le temps des deux
-- écritures, puis retombe (une clause SET de fonction sur un réglage
-- personnalisé exige un superutilisateur depuis PostgreSQL 15 ; une erreur
-- annule la transaction ou la sous-transaction, et le réglage avec elle).
-- Traces chiffrées sans acteur. Aucun
-- verrou de bloc : une ligne n'est effacée que si un verdict plus récent existe
-- déjà, et la colonne « ordre » ne fait que croître.
CREATE FUNCTION private.purger_historique_relecture()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limite     timestamptz := pg_catalog.now() - private.duree_historique_relecture();
  v_effaces    integer;
  v_anonymises integer;
BEGIN
  PERFORM pg_catalog.set_config('tenga.purge_relecture', 'on', true);
  DELETE FROM app.relectures_blocs r
   WHERE r.cree_le < v_limite
     AND EXISTS (SELECT 1 FROM app.relectures_blocs d
                  WHERE d.bloc = r.bloc AND d.empreinte = r.empreinte AND d.ordre > r.ordre);
  GET DIAGNOSTICS v_effaces = ROW_COUNT;
  UPDATE app.relectures_blocs r
     SET commentaire = NULL, relecteur = NULL, anonymise = true
   WHERE r.cree_le < v_limite AND NOT r.anonymise;
  GET DIAGNOSTICS v_anonymises = ROW_COUNT;
  PERFORM pg_catalog.set_config('tenga.purge_relecture', '', true);
  PERFORM private.journaliser(NULL, 'purge.relectures', NULL, NULL, NULL, v_effaces);
  PERFORM private.journaliser(NULL, 'purge.relectures_anonymisees', NULL, NULL, NULL, v_anonymises);
END
$$;

-- 4.10 Purge quotidienne : redéfinition À L'IDENTIQUE de 0018, plus le seul
-- appel de private.purger_historique_relecture() (le commentaire de 0004 est
-- conservé par CREATE OR REPLACE).
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
END
$$;

-- 4.11 Droit d'accès : app.exporter_mes_donnees() redéfinie À L'IDENTIQUE de
-- 0021 (mêmes signature, attributs, clés et forme), plus la seule clé
-- « relecture » : date de désignation de la personne (NULL si elle n'est pas
-- relectrice désignée) et ses propres verdicts encore en base, du plus ancien
-- au plus récent. Jamais les verdicts des autres. Droits inchangés (section 5).
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

-- 5. Droits : défense en profondeur (comme 0021), puis EXECUTE pour
-- authenticated seul, sauf l'état servi (service_role seul) et les fonctions
-- de private (aucun rôle de l'API).
REVOKE ALL ON FUNCTION app.suis_relecteur() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.relire_bloc(text, text, text, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.historique_relecture() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.etat_relecture_blocs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.frequence_facettes() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.designer_relecteur(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.retirer_relecteur(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.lister_relecteurs() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.exporter_mes_donnees() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.duree_historique_relecture() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.verifier_historique_relecture() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.purger_historique_relecture() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.suis_relecteur() TO authenticated;
GRANT EXECUTE ON FUNCTION app.relire_bloc(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app.historique_relecture() TO authenticated;
GRANT EXECUTE ON FUNCTION app.etat_relecture_blocs() TO service_role;
GRANT EXECUTE ON FUNCTION app.frequence_facettes() TO authenticated;
GRANT EXECUTE ON FUNCTION app.designer_relecteur(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.retirer_relecteur(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.lister_relecteurs() TO authenticated;
GRANT EXECUTE ON FUNCTION app.exporter_mes_donnees() TO authenticated;
