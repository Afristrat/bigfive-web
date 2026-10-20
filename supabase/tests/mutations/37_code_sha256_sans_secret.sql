-- mutation: lempreinte du code redevient un SHA-256 simple, sans secret
CREATE OR REPLACE FUNCTION private.empreinte_code(p_lien uuid, p_code text, p_pepper text)
RETURNS bytea
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_cle bytea;
BEGIN
  IF p_pepper IS NOT NULL THEN
    IF pg_catalog.char_length(p_pepper) < 32 THEN
      RAISE EXCEPTION 'p_pepper trop court : 32 caractères au moins' USING ERRCODE = '22023';
    END IF;
    v_cle := pg_catalog.convert_to(p_pepper, 'UTF8');
  ELSE
    SELECT s.cle_hmac_code INTO v_cle FROM private.settings s;
  END IF;
  RETURN pg_catalog.sha256(pg_catalog.convert_to(p_lien::text || ':' || COALESCE(p_code, ''), 'UTF8'));
END
$$;
