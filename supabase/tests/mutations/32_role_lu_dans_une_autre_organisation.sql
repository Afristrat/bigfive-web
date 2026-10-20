-- mutation: app.mon_role ne filtre plus sur l'organisation demandée (étanchéité rompue)
CREATE OR REPLACE FUNCTION app.mon_role(p_organisation uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.role FROM app.memberships m WHERE m.user_id = auth.uid() ORDER BY m.cree_le LIMIT 1
$$;
