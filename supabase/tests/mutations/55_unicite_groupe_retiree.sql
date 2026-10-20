-- mutation: la clé primaire de app.group_members (une personne dans un seul groupe par campagne) est retirée
ALTER TABLE app.group_members DROP CONSTRAINT group_members_pkey;
