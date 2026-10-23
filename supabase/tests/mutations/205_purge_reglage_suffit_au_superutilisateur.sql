-- mutation: le déclencheur de l'historique ne vérifie plus le rôle tenga_owner : le réglage de purge posé à la main suffit à un superutilisateur
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$current_user = 'tenga_owner'
             AND $a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
