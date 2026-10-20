-- mutation: le responsable retrouve la lecture de la composition (qui est dans quel groupe)
ALTER POLICY group_members_lecture ON app.group_members USING ((SELECT app.suis_admin_tenga()) OR app.mon_role(organization_id) = 'responsable');
