-- mutation: une colonne de rôle est ajoutée à app.invitations
ALTER TABLE app.invitations ADD COLUMN role text;
