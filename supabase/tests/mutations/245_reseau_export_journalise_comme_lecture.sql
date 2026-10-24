-- mutation: app.reseau_exporter inscrit l'export au journal comme un simple affichage (reseau.lire)
DO $m$
DECLARE
  d text := pg_get_functiondef('app.reseau_exporter(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'reseau.exporter'$a$, $b$'reseau.lire'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
