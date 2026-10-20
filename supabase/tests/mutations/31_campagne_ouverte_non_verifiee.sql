-- mutation: le déclencheur « campagne ouverte » laisse tout passer (la fonction reste en place)
CREATE OR REPLACE FUNCTION private.exiger_campagne_ouverte()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN NEW;
END
$$;
