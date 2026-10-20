-- mutation: inviter tente de créer le groupe inconnu au lieu de le refuser
DO $$
DECLARE
  d text := pg_get_functiondef('app.inviter(uuid, text, text, text, text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$RAISE EXCEPTION 'Groupe introuvable dans cette campagne' USING ERRCODE = 'P0002';$a$, $b$INSERT INTO app.groups (id, campaign_id, organization_id, nom) VALUES (p_groupe, p_campagne, v_org, 'Créé par invitation');$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
