-- 0009 : durcissement de l'ajout et du retrait des super administrateurs (suite de 0008).
--
-- Origine : revue de sécurité indépendante du commit aedacc5.
--
--   I4  Les deux règles de 0008 sur private.tenga_admins étaient WITH CHECK (true)
--       et USING (true) : toute autre fonction SECURITY DEFINER de tenga_owner,
--       présente ou future, qui s'égarerait aurait pu ajouter ou supprimer des
--       super administrateurs. Les règles sont maintenant liées à l'appelant réel :
--       elles n'ouvrent l'écriture que si auth.uid() est un super administrateur.
--   M2  Le contrôle du droit de l'appelant n'était pas atomique : un administrateur
--       retiré en parallèle pouvait encore réussir son geste. Chaque fonction pose
--       maintenant un verrou partagé sur la ligne de l'appelant avant d'écrire : un
--       retrait concurrent de l'appelant attend la fin du geste, ou, s'il a déjà
--       abouti, le verrou ne trouve plus la ligne et le geste est refusé.
--   M3  app.ajouter_admin_tenga acceptait un compte banni (banned_until futur),
--       alors que les autres fonctions le filtrent (voir 0004, demander_lien_connexion).
--
-- Décisions :
--   - auth.uid() lit le réglage de session request.jwt.claims, que SECURITY
--     DEFINER ne change pas : dans une règle ou une fonction exécutée sous
--     tenga_owner, il reste l'identité de l'appelant réel. app.suis_admin_tenga()
--     (0002) lit private.tenga_admins sous tenga_owner par la règle de lecture
--     tenga_admins_lecture_owner (0002) : pas de récursion, cette règle n'appelle
--     aucune fonction.
--   - Les règles enveloppent la fonction dans (SELECT ...) : évaluée une fois par
--     requête, comme exigé par le test 22 (F5) pour les clauses USING.
--   - Un verrou de ligne partagé exige aussi la règle UPDATE de la table : sans
--     elle, la RLS forcée filtrerait la ligne et le verrou ne prendrait rien. La
--     règle tenga_admins_verrou_owner n'existe que pour cela : WITH CHECK (false)
--     interdit toute modification réelle de la table.
--   - Un compte banni est refusé avec le code 22023 et un message propre
--     (« Compte suspendu ») : l'appelant est un super administrateur, il n'y a
--     aucune énumération à craindre. Les autres messages et codes sont inchangés.
--   - Les REVOKE et GRANT de 0008 sont rejoués à l'identique.
--
-- Règles :
--   - l'API reste refusée par le déclencheur tenga_admins_sans_ecriture_api (0002) ;
--   - le retrait de la dernière ligne reste refusé par tenga_admins_dernier (0007) ;
--   - la migration 0008, déjà appliquée, n'est pas modifiée ;
--   - rejouable : DROP POLICY IF EXISTS avant chaque CREATE POLICY, CREATE OR REPLACE
--     pour les fonctions.

DROP POLICY IF EXISTS tenga_admins_insertion_owner ON private.tenga_admins;
CREATE POLICY tenga_admins_insertion_owner ON private.tenga_admins
  FOR INSERT TO tenga_owner WITH CHECK ((SELECT app.suis_admin_tenga()));

DROP POLICY IF EXISTS tenga_admins_suppression_owner ON private.tenga_admins;
CREATE POLICY tenga_admins_suppression_owner ON private.tenga_admins
  FOR DELETE TO tenga_owner USING ((SELECT app.suis_admin_tenga()));

DROP POLICY IF EXISTS tenga_admins_verrou_owner ON private.tenga_admins;
CREATE POLICY tenga_admins_verrou_owner ON private.tenga_admins
  FOR UPDATE TO tenga_owner USING ((SELECT app.suis_admin_tenga())) WITH CHECK (false);

CREATE OR REPLACE FUNCTION app.ajouter_admin_tenga(p_utilisateur uuid)
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
  -- Verrou partagé sur la ligne de l'appelant : un retrait concurrent attend la
  -- fin du geste ; déjà abouti, il ne laisse plus de ligne à verrouiller.
  PERFORM 1 FROM private.tenga_admins a WHERE a.user_id = v_uid FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_utilisateur IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur) THEN
    RAISE EXCEPTION 'Compte inconnu' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur AND u.banned_until > now()) THEN
    RAISE EXCEPTION 'Compte suspendu' USING ERRCODE = '22023';
  END IF;
  INSERT INTO private.tenga_admins (user_id) VALUES (p_utilisateur)
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(v_uid, 'admin.ajouter', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION app.retirer_admin_tenga(p_utilisateur uuid)
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
  -- Verrou partagé sur la ligne de l'appelant (même raison que pour l'ajout).
  PERFORM 1 FROM private.tenga_admins a WHERE a.user_id = v_uid FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_utilisateur IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Nul ne retire son propre statut d''administrateur' USING ERRCODE = '42501';
  END IF;
  DELETE FROM private.tenga_admins WHERE user_id = p_utilisateur;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(v_uid, 'admin.retirer', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION app.ajouter_admin_tenga(uuid), app.retirer_admin_tenga(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.ajouter_admin_tenga(uuid), app.retirer_admin_tenga(uuid) TO authenticated;
