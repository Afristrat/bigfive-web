-- mutation: la règle du responsable sur app.participations ne tient plus compte de l'organisation
ALTER POLICY participations_lecture_responsable ON app.participations USING (true);
