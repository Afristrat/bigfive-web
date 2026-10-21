-- mutation: les verrous consultatifs sont retirés (comptage et insertion non sérialisés)
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.encode(v_cle_org, 'hex'), 0));$a$, $b$PERFORM NULL;$b$);
  n := replace(n, $a$PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.encode(v_cle_dest, 'hex'), 0));$a$, $b$PERFORM NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
