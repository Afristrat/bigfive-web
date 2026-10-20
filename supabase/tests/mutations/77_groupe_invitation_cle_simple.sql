-- mutation: la clé composite est remplacée par une clé simple sur le groupe (un groupe d'une autre campagne est accepté)
ALTER TABLE app.invitations DROP CONSTRAINT invitations_groupe_fkey;
ALTER TABLE app.invitations ADD CONSTRAINT invitations_groupe_fkey FOREIGN KEY (group_id) REFERENCES app.groups (id);
