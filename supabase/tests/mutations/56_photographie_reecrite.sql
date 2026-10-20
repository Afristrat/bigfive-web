-- mutation: la photographie peut être posée plusieurs fois (contrôle « déjà posée » retiré, marqueur réécrit)
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(replace(d, 'IF EXISTS (SELECT 1 FROM private.agregats_poses a WHERE a.campaign_id = p_campagne) THEN', 'IF false THEN'), 'INSERT INTO private.agregats_poses (campaign_id) VALUES (p_campagne);', 'INSERT INTO private.agregats_poses (campaign_id) VALUES (p_campagne) ON CONFLICT (campaign_id) DO UPDATE SET pose_le = now();');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
