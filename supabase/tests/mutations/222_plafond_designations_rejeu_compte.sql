-- mutation: une désignation rejouée passe par le plafond : au plafond, elle est refusée au lieu de rendre faux
DO $m$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$  IF EXISTS (SELECT 1 FROM private.relecteurs_bibliotheque r WHERE r.user_id = p_utilisateur) THEN
    RETURN QUERY SELECT false, v_langue;
    RETURN;
  END IF;
$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
