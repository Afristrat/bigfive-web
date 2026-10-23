-- mutation: app.attribuer_role n'inscrit plus l'attribution au journal (rougit sur base vivante grâce au journal limité aux lignes du test)
DO $m$
DECLARE
  d text := pg_get_functiondef('app.attribuer_role(uuid,uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'role.attribuer.' || p_role, 'utilisateur', p_utilisateur, p_organisation);$a$,
                  $b$NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
