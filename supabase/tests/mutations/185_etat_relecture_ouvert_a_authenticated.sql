-- mutation: l'état servi de la relecture (réservé au serveur) devient exécutable par le rôle connecté
GRANT EXECUTE ON FUNCTION app.etat_relecture_blocs() TO authenticated;
