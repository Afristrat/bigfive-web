-- mutation: le compteur déchecs par compte nferme plus le code (seuil 5 porté à 6, jamais atteint)
CREATE OR REPLACE FUNCTION app.consommer_code_connexion(p_email text, p_code text, p_pepper text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email  text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_user   uuid;
  v_lien   uuid;
  v_nb     smallint;
  v_depuis timestamptz;
  v_hash   bytea;
BEGIN
  -- Un HMAC factice pour tous : valide p_pepper (22023 s'il est trop court),
  -- et fait pour une adresse inconnue le calcul qu'une adresse connue fait.
  v_hash := private.empreinte_code(gen_random_uuid(), p_code, p_pepper);

  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE u.email = v_email
    AND u.is_sso_user = false
    AND (u.banned_until IS NULL OR u.banned_until <= now());

  IF v_user IS NULL THEN
    -- Écritures factices, comme les écritures d'un échec pour une adresse connue.
    INSERT INTO private.leurre_connexion (empreinte) SELECT v_hash FROM pg_catalog.generate_series(1, 3);
    RETURN NULL;
  END IF;

  -- Un seul essai à la fois par compte : les essais parallèles font la queue
  -- et lisent chacun le compteur écrit par le précédent.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));

  SELECT e.nb, e.depuis INTO v_nb, v_depuis FROM private.echecs_code e WHERE e.user_id = v_user;
  IF v_depuis IS NOT NULL AND v_depuis <= now() - interval '1 hour' THEN
    DELETE FROM private.echecs_code WHERE user_id = v_user;
    v_nb := NULL;
  END IF;
  IF COALESCE(v_nb, 0) >= 6 THEN
    -- Plafond atteint : refus sans regarder le code, quel que soit le lien.
    RETURN NULL;
  END IF;

  IF p_code ~ '^[0-9]{6}$' THEN
    SELECT l.id INTO v_lien
    FROM private.liens_connexion l
    WHERE l.user_id = v_user AND l.consomme_le IS NULL AND l.expire_le > now() AND l.essais < 5
      AND l.code_hash = private.empreinte_code(l.id, p_code, p_pepper)
    ORDER BY l.cree_le DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_lien IS NULL THEN
    INSERT INTO private.echecs_code AS e (user_id, nb, depuis) VALUES (v_user, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET nb = LEAST(e.nb + 1, 5)
    RETURNING e.nb INTO v_nb;
    -- Le budget propre au lien ne s'use que sur le lien le plus récent (jamais
    -- sur tous les liens du compte) : le lien lui-même reste utilisable.
    UPDATE private.liens_connexion SET essais = essais + 1
     WHERE id = (SELECT l.id FROM private.liens_connexion l
                  WHERE l.user_id = v_user AND l.consomme_le IS NULL AND l.expire_le > now() AND l.essais < 5
                  ORDER BY l.cree_le DESC LIMIT 1);
    PERFORM private.journaliser(NULL, 'connexion.echec', 'utilisateur', v_user, NULL, v_nb::integer);
    IF v_nb >= 5 THEN
      PERFORM private.journaliser(NULL, 'connexion.plafond', 'utilisateur', v_user);
    END IF;
    RETURN NULL;
  END IF;
  PERFORM private.finaliser_connexion(v_user, v_lien);
  RETURN v_user;
END
$$;
