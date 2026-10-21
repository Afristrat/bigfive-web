-- 0008 : ajout et retrait d'un super administrateur Tenga par un super administrateur.
--
-- Décision d'Amine du 21/10/2026 : « je dois aussi pouvoir ajouter un super admin
-- en la personne de Nezha avec moi ». Jusqu'ici la table private.tenga_admins ne
-- s'écrivait que par seed-admin.sh (amorçage unique, refusé dès qu'une ligne existe).
--
--   app.ajouter_admin_tenga(p_utilisateur uuid) RETURNS boolean
--   app.retirer_admin_tenga(p_utilisateur uuid) RETURNS boolean
--
-- Règles, vérifiées dans la base et non dans l'interface :
--   - réservé à un super administrateur (app.suis_admin_tenga()) ;
--   - la cible doit être un compte existant (auth.users) : l'application le crée
--     d'abord par l'API d'administration de GoTrue, comme pour attribuer_role ;
--   - nul ne retire son propre statut (D-R2 de roles-et-invitations.md) ;
--   - le retrait de la dernière ligne reste refusé par le déclencheur
--     tenga_admins_dernier (migration 0007, D-R3) ;
--   - chaque ajout et chaque retrait est inscrit au journal, sans adresse.
-- Les fonctions s'exécutent sous tenga_owner (SECURITY DEFINER) : c'est le seul
-- rôle, avec les superutilisateurs, que le verrou 3 de la migration 0002 laisse
-- écrire dans private.tenga_admins.
-- La table est en RLS forcée et la migration 0002 ne donne à tenga_owner qu'une
-- règle de lecture : sans les deux règles ci-dessous, l'insertion et la
-- suppression seraient refusées (essai du 21/10). Elles ne s'ouvrent qu'à
-- tenga_owner ; l'API reste refusée par le déclencheur tenga_admins_sans_ecriture_api.

CREATE POLICY tenga_admins_insertion_owner ON private.tenga_admins
  FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY tenga_admins_suppression_owner ON private.tenga_admins
  FOR DELETE TO tenga_owner USING (true);

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
  IF p_utilisateur IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur) THEN
    RAISE EXCEPTION 'Compte inconnu' USING ERRCODE = '22023';
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
