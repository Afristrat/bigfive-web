-- mutation: app.soumettre_resultat n'éprouve plus la forme des réponses ni des scores (nombre de réponses, valeurs, format, domaines, facettes, sommes)
DO $$
DECLARE
  d text := pg_get_functiondef('app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$pg_catalog.jsonb_object_keys(p_reponses)) <> 120$a$, $b$pg_catalog.jsonb_object_keys(p_reponses)) < 0$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet (nombre de réponses)';
  END IF;
  d := n;
  n := replace(n, $a$e.value::text !~ '^[1-5]$'$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet (valeurs des réponses)';
  END IF;
  d := n;
  n := replace(n, $a$(p_scores ->> 'format') IS DISTINCT FROM 'tenga-scores-1'$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet (format)';
  END IF;
  d := n;
  n := replace(n, $a$FOREACH v_dom IN ARRAY ARRAY['N', 'E', 'O', 'A', 'C'] LOOP$a$, $b$FOREACH v_dom IN ARRAY ARRAY[]::text[] LOOP$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet (domaines)';
  END IF;
  EXECUTE n;
END $$;
