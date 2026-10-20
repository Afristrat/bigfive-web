-- mutation: le gel de la composition est retiré sur app.group_members
DROP TRIGGER group_members_verrou_composition ON app.group_members;
