-- mutation: l'échec de l'écriture de la composition est avalé : la participation survit sans sa composition (rollback partiel)
DO $$
DECLARE
  d text := pg_get_functiondef('app.accepter_invitation(text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
    VALUES (v_groupe, v_camp, v_org, v_part);$a$, $b$    BEGIN
      INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
      VALUES (v_groupe, v_camp, v_org, v_part);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    EN$b$ || $b$D;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
