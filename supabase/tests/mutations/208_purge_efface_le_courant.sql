-- mutation: le déclencheur laisse la purge effacer le verdict courant d'un bloc
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$
       AND EXISTS (SELECT 1 FROM app.relectures_blocs d
                    WHERE d.bloc = OLD.bloc AND d.empreinte = OLD.empreinte AND d.ordre > OLD.ordre) THEN$a$, $b$ THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
