-- mutation: app.etat_relecture_blocs rend le dernier verdict par bloc, quel que soit le texte (un texte modifié hérite du verdict)
DO $$
DECLARE
  d text := pg_get_functiondef('app.etat_relecture_blocs()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$SELECT DISTINCT ON (r.bloc, r.empreinte)$a$, $b$SELECT DISTINCT ON (r.bloc)$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
