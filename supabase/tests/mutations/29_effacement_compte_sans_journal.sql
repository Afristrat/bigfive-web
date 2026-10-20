-- mutation: l'effacement d'un compte ne journalise plus
CREATE OR REPLACE FUNCTION private.effacer_compte(p_utilisateur uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_utilisateur;
  RETURN FOUND;
END
$$;
