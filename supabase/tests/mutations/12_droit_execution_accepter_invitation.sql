-- mutation: le rôle connecté peut exécuter app.accepter_invitation (réservée au serveur)
GRANT EXECUTE ON FUNCTION app.accepter_invitation(text, uuid) TO authenticated;
