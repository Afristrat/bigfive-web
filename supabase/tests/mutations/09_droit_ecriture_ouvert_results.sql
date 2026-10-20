-- mutation: le rôle connecté reçoit des droits d'écriture sur app.results
GRANT INSERT, UPDATE, DELETE ON app.results TO authenticated;
