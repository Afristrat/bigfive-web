-- mutation: toute personne connectée lit toutes les invitations (adresses comprises)
CREATE POLICY zz_mutation ON app.invitations FOR SELECT TO authenticated USING (true);
