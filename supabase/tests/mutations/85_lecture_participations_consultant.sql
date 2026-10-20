-- mutation: le consultant reçoit une règle de lecture sur les participations (une personne identifiable)
CREATE POLICY zz_mutation ON app.participations FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'consultant');
