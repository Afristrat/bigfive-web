-- 0012 : un responsable d'organisation n'attribue plus que le rôle participant.
-- Décision I2 : consultant et responsable sont nommés par l'administrateur Tenga seul.
--
-- Pourquoi : un consultant lit tous les résultats individuels nominatifs de
-- l'organisation (app.lire_resultat_individuel, 0003). Avec la règle de 0007, un
-- responsable pouvait nommer consultant n'importe quelle adresse, y compris une
-- seconde adresse à lui ou une adresse mal saisie, alors que le courriel promet
-- aux participants que seul « le consultant Tenga affecté » les voit.
--
-- Le COALESCE reste essentiel (même piège que private.peut_gerer, 0003) : sans
-- appartenance app.mon_role renvoie NULL, et « faux OU NULL » vaut NULL.
-- Tous les appelants (app.attribuer_role, app.inviter) passent par cette
-- fonction : il n'y a pas d'autre point à modifier côté base.
CREATE OR REPLACE FUNCTION private.peut_attribuer(p_organisation uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    app.suis_admin_tenga()
    OR (p_role = 'participant' AND app.mon_role(p_organisation) = 'responsable'),
    false)
$$;
