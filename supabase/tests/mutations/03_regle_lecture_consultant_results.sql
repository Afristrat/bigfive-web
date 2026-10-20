-- mutation: le consultant affecté reçoit une règle de lecture directe sur app.results
CREATE POLICY zz_mutation ON app.results FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'consultant');
