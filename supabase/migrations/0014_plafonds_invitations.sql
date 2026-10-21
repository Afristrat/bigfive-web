-- 0014 : plafonds JOURNALIERS d'invitations tenus EN BASE (tâche T19, suite de
-- T12 et T16).
--
-- Jusqu'ici les plafonds de 300 invitations par jour et par organisation et de
-- 5 e-mails par jour et par adresse destinataire vivaient en mémoire de
-- l'application : ils repartaient à zéro à chaque redémarrage et n'étaient pas
-- partagés entre réplicas. Un compte de responsable compromis pouvait donc
-- envoyer beaucoup d'e-mails au nom de Tenga après un simple redémarrage.
-- Cette migration les tient en base. Les limiteurs en mémoire gardent les
-- rafales (minute, heure), pas les plafonds du jour.
--
-- VALEURS : 300 et 5 sont des DÉFAUTS NON VALIDÉS par Amine. Ils ne sont PAS
-- écrits ici : l'application les transmet en paramètres
-- (web/src/lib/invitation-limits.ts), donc réglables sans migration.
--
-- Objets :
--   private.plafonds_invitations : un événement par ligne (portée, clé,
--     horodatage). La clé n'est JAMAIS une adresse : c'est un HMAC-SHA256,
--     calculé par la base avec la clé secrète de private.settings.cle_hmac_code,
--     du condensat que l'application transmet (elle-même un condensat de
--     l'adresse canonique, jamais l'adresse). Sans la clé de la base, la table
--     ne se rejoue pas contre un dictionnaire d'adresses.
--   app.consommer_plafond_invitation(p_organisation, p_empreinte_destinataire,
--     p_max_organisation, p_max_destinataire, p_fenetre_secondes) RETURNS text
--     service_role seul. VÉRIFIE ET CONSOMME en une seule opération atomique :
--       'accepte'              les deux compteurs sont sous leur plafond, un
--                              événement est ajouté à chacun ;
--       'refuse_organisation'  plafond de l'organisation atteint, rien consommé ;
--       'refuse_destinataire'  plafond du destinataire atteint, rien consommé.
--     Paramètres invalides (NULL, empreinte qui n'est pas 64 caractères
--     hexadécimaux minuscules, plafond hors de 1 à 100000, fenêtre hors de 60 à
--     172800 secondes) : 22023.
--
-- Atomicité et course : un verrou consultatif de transaction par clé (pris dans
-- un ordre fixe : organisation, puis destinataire) sérialise les appels
-- concurrents sur une même organisation ou un même destinataire entre le
-- comptage et l'insertion ; sans lui, deux appels simultanés liraient le même
-- compte et dépasseraient le plafond.
--
-- Pas de croissance illimitée : chaque appel purge d'abord les événements de
-- plus de 48 heures (index sur l'horodatage). La fenêtre maximale acceptée
-- (172 800 secondes) est exactement cette durée de conservation.
-- ponytail: purge opportuniste dans la fonction plutôt que dans
-- private.purger_quotidien(), que la migration 0011 (lot mot de passe, non
-- publiée) redéfinit aussi : la modifier ici créerait une collision. Plafond :
-- tant que le débit d'invitations reste modeste (quelques milliers par jour) ;
-- réexamen : si la table dépasse un million de lignes ou si la purge quotidienne
-- est refondue après la 0011.
--
-- Contraintes tenues : RLS forcée (ENABLE + FORCE, comme le garde-fou DDL) ;
-- tenga_owner seul a des règles, aucun droit de table pour anon, authenticated
-- ni service_role (verrou 2) ; SECURITY DEFINER nécessaire car service_role n'a
-- aucun droit sur private ; SET search_path = '' ; REVOKE explicite puis GRANT
-- EXECUTE à service_role seul. Aucune ligne de journal (volume élevé, aucun
-- renseignement utile : l'invitation créée est déjà journalisée par
-- app.inviter ; l'application journalise les refus côté serveur).

CREATE TABLE private.plafonds_invitations (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  portee  text NOT NULL CHECK (portee IN ('organisation', 'destinataire')),
  cle     bytea NOT NULL CHECK (octet_length(cle) = 32),
  cree_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plafonds_invitations_cle_idx
  ON private.plafonds_invitations (portee, cle, cree_le DESC);
CREATE INDEX plafonds_invitations_cree_le_idx
  ON private.plafonds_invitations (cree_le);
COMMENT ON TABLE private.plafonds_invitations IS
  'Événements d''invitation comptés pour les plafonds journaliers (organisation, destinataire). La clé est un HMAC : jamais d''adresse. Purgée au-delà de 48 heures par app.consommer_plafond_invitation.';

ALTER TABLE private.plafonds_invitations ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;

CREATE POLICY plafonds_lecture_owner ON private.plafonds_invitations FOR SELECT TO tenga_owner USING (true);
CREATE POLICY plafonds_insertion_owner ON private.plafonds_invitations FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY plafonds_suppression_owner ON private.plafonds_invitations FOR DELETE TO tenga_owner USING (true);

CREATE FUNCTION app.consommer_plafond_invitation(
  p_organisation uuid,
  p_empreinte_destinataire text,
  p_max_organisation integer,
  p_max_destinataire integer,
  p_fenetre_secondes integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cle      bytea;
  v_cle_org  bytea;
  v_cle_dest bytea;
  v_depuis   timestamptz;
BEGIN
  IF p_organisation IS NULL
     OR p_empreinte_destinataire IS NULL
     OR p_empreinte_destinataire !~ '^[0-9a-f]{64}$'
     OR p_max_organisation IS NULL OR p_max_organisation NOT BETWEEN 1 AND 100000
     OR p_max_destinataire IS NULL OR p_max_destinataire NOT BETWEEN 1 AND 100000
     OR p_fenetre_secondes IS NULL OR p_fenetre_secondes NOT BETWEEN 60 AND 172800
  THEN
    RAISE EXCEPTION 'paramètres de plafond invalides' USING ERRCODE = '22023';
  END IF;

  SELECT s.cle_hmac_code INTO v_cle FROM private.settings s;
  v_cle_org := extensions.hmac(
    pg_catalog.convert_to('plafond-invitation:organisation:' || p_organisation::text, 'UTF8'), v_cle, 'sha256');
  v_cle_dest := extensions.hmac(
    pg_catalog.convert_to('plafond-invitation:destinataire:' || p_empreinte_destinataire, 'UTF8'), v_cle, 'sha256');

  -- Sérialise les appels concurrents sur les mêmes clés, dans un ordre fixe.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.encode(v_cle_org, 'hex'), 0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.encode(v_cle_dest, 'hex'), 0));

  DELETE FROM private.plafonds_invitations WHERE cree_le < now() - interval '48 hours';

  v_depuis := now() - pg_catalog.make_interval(secs => p_fenetre_secondes);

  IF (SELECT pg_catalog.count(*) FROM private.plafonds_invitations e
       WHERE e.portee = 'organisation' AND e.cle = v_cle_org AND e.cree_le > v_depuis) >= p_max_organisation THEN
    RETURN 'refuse_organisation';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM private.plafonds_invitations e
       WHERE e.portee = 'destinataire' AND e.cle = v_cle_dest AND e.cree_le > v_depuis) >= p_max_destinataire THEN
    RETURN 'refuse_destinataire';
  END IF;

  INSERT INTO private.plafonds_invitations (portee, cle)
  VALUES ('organisation', v_cle_org), ('destinataire', v_cle_dest);
  RETURN 'accepte';
END
$$;

-- Défense en profondeur (comme 0008, 0011 et 0013).
REVOKE ALL ON FUNCTION app.consommer_plafond_invitation(uuid, text, integer, integer, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.consommer_plafond_invitation(uuid, text, integer, integer, integer)
  TO service_role;
