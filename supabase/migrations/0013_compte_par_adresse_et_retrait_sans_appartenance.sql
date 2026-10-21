-- 0013 : recherche de compte PAR ADRESSE et retrait d'un compte créé sans
-- appartenance (findings I-F2 et I-F3 du lot B2, tâche T14).
--
-- I-F2. Jusqu'ici l'application retrouvait un compte en parcourant la liste
-- d'administration de GoTrue (50 pages de 200, soit 10 000 comptes au plus) :
-- au-delà, un compte existant restait introuvable, l'application tentait de le
-- créer et échouait. app.compte_par_adresse lit le compte directement par son
-- adresse, par l'index partiel users_email_partial_key (prédicat
-- is_sso_user = false, comme app.demander_lien_connexion).
--
-- I-F3. Un compte que l'appel en cours vient de créer et que la suite a laissé
-- orphelin était retiré par l'API d'administration de GoTrue, sans garde-fou :
-- si le compte avait entre-temps reçu un rôle (course), il partait avec. La
-- base ne le retire que s'il n'a AUCUNE appartenance, participation,
-- invitation, campagne créée ni rôle d'administrateur Tenga ; sinon elle
-- répond faux et le compte reste.
--
-- Contraintes tenues :
--   - RLS inchangée : aucune règle ajoutée, retirée ni modifiée (la liste des
--     règles figée par le test 08 ne bouge pas) ; tenga_owner lit déjà toutes
--     les tables citées par ses règles de lecture et supprime déjà dans
--     auth.users (0003) ; aucun droit de colonne nouveau sur auth.users (le
--     test 22 fige les quatre colonnes lisibles).
--   - SECURITY DEFINER nécessaire : service_role n'a aucun droit sur auth.users
--     ni sur app/private (0001), seul tenga_owner (propriétaire) en a.
--   - SET search_path = '' ; objets qualifiés ; REVOKE explicite puis GRANT
--     EXECUTE à service_role seul (ni anon, ni authenticated, ni PUBLIC).
--   - Aucune adresse dans le journal : la ligne de journal du retrait porte
--     l'identifiant du compte (pseudonyme), comme private.effacer_compte.
--   - La recherche n'écrit rien et ne journalise rien (elle est appelée à
--     chaque invitation) ; l'adresse n'est jamais renvoyée, seulement l'identifiant.
--
-- ponytail: pas de verrou consultatif entre le contrôle d'absence
-- d'appartenance et la suppression ; le seul chemin qui rattache un compte
-- créé à l'instant est l'acceptation de ce même appel, déjà terminée (refus
-- définitif) quand on retire. Réexamen : tout nouveau chemin qui attache un
-- compte sans passer par l'appel qui l'a créé.

-- Identifiant du compte d'une adresse, ou NULL. La casse et les espaces
-- autour sont ignorés (GoTrue stocke les adresses en minuscules). Un compte SSO
-- n'est pas retrouvé (même périmètre que la connexion par lien).
CREATE FUNCTION app.compte_par_adresse(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE u.email = pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')))
    AND u.is_sso_user = false
$$;

-- Retire un compte créé par l'appel en cours si, et seulement si, il n'a
-- aucune appartenance. Renvoie vrai si le compte a été retiré, faux s'il
-- n'existe pas ou s'il est rattaché à quoi que ce soit (il est alors conservé).
CREATE FUNCTION app.retirer_compte_sans_appartenance(p_utilisateur uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_utilisateur IS NULL THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM app.memberships m WHERE m.user_id = p_utilisateur)
     OR EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = p_utilisateur)
     OR EXISTS (SELECT 1 FROM app.participations p WHERE p.user_id = p_utilisateur)
     OR EXISTS (SELECT 1 FROM app.invitations i
                WHERE i.invitant_id = p_utilisateur OR i.acceptee_par = p_utilisateur)
     OR EXISTS (SELECT 1 FROM app.campaigns c WHERE c.cree_par = p_utilisateur)
  THEN
    RETURN false;
  END IF;
  DELETE FROM auth.users WHERE id = p_utilisateur;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(p_utilisateur, 'compte.retirer_orphelin', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

-- Défense en profondeur (comme 0008 et 0018) : le REVOKE explicite ne dépend
-- pas des privilèges par défaut de tenga_owner.
REVOKE ALL ON FUNCTION
  app.compte_par_adresse(text), app.retirer_compte_sans_appartenance(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app.compte_par_adresse(text), app.retirer_compte_sans_appartenance(uuid)
  TO service_role;
