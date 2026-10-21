-- mutation: la fonction SECURITY DEFINER perd son search_path figé
ALTER FUNCTION app.consommer_plafond_invitation(uuid, text, integer, integer, integer) RESET search_path;
