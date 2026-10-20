-- mutation: demander_lien_connexion cherche ladresse sans is_sso_user = false (index partiel perdu)
CREATE OR REPLACE FUNCTION app.demander_lien_connexion(p_email text, p_pepper text DEFAULT NULL)
RETURNS TABLE (envoyer boolean, jeton text, code text, langue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email   text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_octets  bytea := extensions.gen_random_bytes(36);
  v_jeton   text := pg_catalog.translate(pg_catalog.encode(pg_catalog.substr(v_octets, 1, 32), 'base64'), '+/=', '-_');
  -- Réduction modulo 10^6 d'un entier de 32 bits : biais relatif inférieur à 3e-4, sans conséquence pour 5 essais.
  v_code    text := pg_catalog.lpad((((pg_catalog.get_byte(v_octets, 32)::bigint << 24)
                     | (pg_catalog.get_byte(v_octets, 33)::bigint << 16)
                     | (pg_catalog.get_byte(v_octets, 34)::bigint << 8)
                     | pg_catalog.get_byte(v_octets, 35)::bigint) % 1000000)::text, 6, '0');
  v_user    uuid;
  v_langue  text;
  v_lien    uuid := gen_random_uuid();
  v_hash    bytea;
  v_plafond boolean := false;
BEGIN
  v_hash := private.empreinte_code(v_lien, v_code, p_pepper);

  -- is_sso_user = false : requête couverte par users_email_partial_key.
  SELECT u.id, p.langue INTO v_user, v_langue
  FROM auth.users u
  JOIN app.profiles p ON p.user_id = u.id
  WHERE u.email = v_email
    AND (u.banned_until IS NULL OR u.banned_until <= now());

  IF v_user IS NOT NULL THEN
    IF (SELECT pg_catalog.count(*) FROM private.demandes_lien d
         WHERE d.user_id = v_user AND d.cree_le > now() - interval '15 minutes') >= 3 THEN
      v_plafond := true;
      -- Une seule trace par compte et par 15 minutes (pas d'inondation du journal).
      IF NOT EXISTS (SELECT 1 FROM private.audit_log a
                      WHERE a.action = 'connexion.plafond' AND a.ressource_id = v_user
                        AND a.cree_le > now() - interval '15 minutes') THEN
        PERFORM private.journaliser(NULL, 'connexion.plafond', 'utilisateur', v_user);
      END IF;
    END IF;
  ELSE
    -- Lecture factice du compteur, comme pour une adresse connue.
    PERFORM pg_catalog.count(*) FROM private.demandes_lien d
     WHERE d.user_id = gen_random_uuid() AND d.cree_le > now() - interval '15 minutes';
  END IF;

  IF v_user IS NULL OR v_plafond THEN
    INSERT INTO private.leurre_connexion (empreinte) SELECT v_hash FROM pg_catalog.generate_series(1, 2);
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  INSERT INTO private.liens_connexion (id, user_id, jeton_hash, code_hash, expire_le)
  VALUES (v_lien, v_user,
          pg_catalog.sha256(pg_catalog.convert_to(v_jeton, 'UTF8')),
          v_hash,
          now() + interval '15 minutes');
  INSERT INTO private.demandes_lien (user_id) VALUES (v_user);
  RETURN QUERY SELECT true, v_jeton, v_code, v_langue;
END
$$;
