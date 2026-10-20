-- mutation: le verrou d'immutabilité du groupe de l'invitation est supprimé (group_id modifiable)
DROP TRIGGER invitations_verrou_groupe ON app.invitations;
