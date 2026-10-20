-- mutation: le rôle connecté reçoit des droits d'écriture sur app.groups
GRANT INSERT, UPDATE, DELETE ON app.groups TO authenticated;
