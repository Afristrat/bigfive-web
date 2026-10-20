-- mutation: toute personne connectée reçoit une règle de lecture sur app.group_aggregates
CREATE POLICY zz_mutation ON app.group_aggregates FOR SELECT TO authenticated USING (true);
