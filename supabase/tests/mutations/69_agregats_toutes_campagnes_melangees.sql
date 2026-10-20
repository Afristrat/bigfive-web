-- mutation: la photographie compte les résultats de toutes les campagnes, pas seulement ceux de la campagne close
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'WHERE p.campaign_id = p_campagne AND x.v IS NOT NULL', 'WHERE x.v IS NOT NULL');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
