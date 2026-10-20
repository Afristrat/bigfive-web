-- mutation: le gel n'exige plus que le groupe soit celui porté par l'invitation (un autre groupe passe)
DO $$
DECLARE
  d text := pg_get_functiondef('private.geler_composition()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND i.campaign_id = NEW.campaign_id AND i.group_id = NEW.group_id$a$, $b$AND i.campaign_id = NEW.campaign_id$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
