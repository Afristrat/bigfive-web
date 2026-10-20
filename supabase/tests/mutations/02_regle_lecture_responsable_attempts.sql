-- mutation: le responsable d'organisation reçoit une règle de lecture sur app.attempts
CREATE POLICY zz_mutation ON app.attempts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app.participations p WHERE p.id = participation_id AND app.mon_role(p.organization_id) = 'responsable'));
