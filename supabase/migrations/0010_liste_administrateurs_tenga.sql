-- 0010 : liste des super administrateurs Tenga, lisible par un super administrateur.
--
-- Besoin (suite des migrations 0008 et 0009) : l'écran de retrait d'un super
-- administrateur doit montrer qui l'est, et l'ajout d'un administrateur doit
-- pouvoir être notifié aux autres. Jusqu'ici private.tenga_admins n'est lisible
-- par aucun rôle de l'API (schéma private) et auth.users non plus : la liste
-- ne peut sortir que par une fonction contrôlée.
--
--   app.lister_administrateurs_tenga()
--     RETURNS TABLE (user_id uuid, adresse text, ajoute_le timestamptz, est_moi boolean)
--
-- Règles, vérifiées dans la base et non dans l'interface :
--   - réservé à un super administrateur (app.suis_admin_tenga()) : refus 42501
--     « Réservé aux administrateurs Tenga » ; sans identité, « Connexion requise » ;
--   - aucune autre donnée que les quatre colonnes ci-dessus ; est_moi n'est vrai
--     que pour la ligne de l'appelant ;
--   - triée par date d'ajout, puis par identifiant (ordre stable) ;
--   - l'adresse est une donnée personnelle : chaque consultation est inscrite au
--     journal (action admin.lister, quantité = nombre de lignes rendues), sans
--     adresse ;
--   - exécutable par authenticated seulement (ni anon, ni service_role, ni PUBLIC).
--
-- Choix techniques :
--   - SECURITY DEFINER : la fonction s'exécute sous tenga_owner, qui lit
--     private.tenga_admins (règle tenga_admins_lecture_owner, 0002) et
--     auth.users (GRANT SELECT (id, email, banned_until) et règle
--     tenga_owner_lecture, 0002). Aucun droit nouveau n'est accordé.
--   - Les colonnes de sortie de RETURNS TABLE sont des variables plpgsql : toute
--     référence de colonne du corps est donc qualifiée par son alias de table
--     (a., u.), sans quoi plpgsql signalerait une ambiguïté.
--   - auth.users.email est un varchar : converti en text pour correspondre au type
--     déclaré (RETURN QUERY exige des types identiques).
--   - Fonction VOLATILE (elle écrit au journal) : pas de STABLE.
--   - La migration est rejouable (CREATE OR REPLACE, REVOKE puis GRANT).

CREATE OR REPLACE FUNCTION app.lister_administrateurs_tenga()
RETURNS TABLE (user_id uuid, adresse text, ajoute_le timestamptz, est_moi boolean)
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
  SELECT count(*)::integer INTO v_n FROM private.tenga_admins a;
  PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n);
  RETURN QUERY
    SELECT a.user_id, u.email::text, a.ajoute_le, (a.user_id = v_uid)
      FROM private.tenga_admins a
      JOIN auth.users u ON u.id = a.user_id
     ORDER BY a.ajoute_le, a.user_id;
END
$$;

REVOKE ALL ON FUNCTION app.lister_administrateurs_tenga() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lister_administrateurs_tenga() TO authenticated;
