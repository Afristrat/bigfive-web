-- mutation (concurrence) : app.relire_bloc ne prend plus le verrou consultatif par personne : deux
-- sessions simultanées d'une même personne peuvent dépasser le plafond de 200 verdicts par heure.
-- NON DÉTECTABLE par les tests en transaction annulée (une seule session) : elle survit au test 42.
-- Rangée hors de tests/mutations pour ne pas faire échouer mutate-sql.sh (une mutation survivante le
-- fait sortir en erreur). À éprouver avec deux sessions réelles sur une instance de test, non permise
-- à ce jour : résiduel déclaré.
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('relecture.personne.' || v_uid::text));
$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
