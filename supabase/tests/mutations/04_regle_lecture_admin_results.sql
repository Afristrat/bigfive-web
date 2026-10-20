-- mutation: l'administrateur Tenga reçoit une règle de lecture directe sur app.results
CREATE POLICY zz_mutation ON app.results FOR SELECT TO authenticated USING (app.suis_admin_tenga());
