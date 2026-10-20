-- mutation: le responsable d'organisation reçoit une règle de lecture sur app.results
CREATE POLICY zz_mutation ON app.results FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'responsable');
