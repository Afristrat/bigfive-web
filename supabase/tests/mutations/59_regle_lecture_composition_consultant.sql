-- mutation: le consultant reçoit une règle de lecture sur la composition des groupes (app.group_members)
CREATE POLICY zz_mutation ON app.group_members FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'consultant');
