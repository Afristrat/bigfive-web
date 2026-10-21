-- mutation: l'empreinte reçue est stockée telle quelle (sans HMAC de la base)
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$VALUES ('organisation', v_cle_org), ('destinataire', v_cle_dest);$a$, $b$VALUES ('organisation', v_cle_org), ('destinataire', pg_catalog.decode(p_empreinte_destinataire, 'hex'));$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
