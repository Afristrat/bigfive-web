-- mutation: un binôme peut réunir deux participations de deux organisations (clé étrangère composite de la seconde participation retirée, contrôle d'organisation de app.proposer_binome retiré)
ALTER TABLE app.binomes DROP CONSTRAINT binomes_participation_b_fkey;
DO $$
DECLARE
  d text := pg_get_functiondef('app.proposer_binome(uuid, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND pa.organization_id = v_org) <> 2$a$, $b$) <> 2$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
