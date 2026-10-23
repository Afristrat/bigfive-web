-- mutation: le rôle connecté reçoit le droit de lire app.reseau_reponses directement (hors des fonctions)
GRANT SELECT ON app.reseau_reponses TO authenticated;
