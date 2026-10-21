-- mutation: service_role peut exécuter ajouter_admin_tenga
GRANT EXECUTE ON FUNCTION app.ajouter_admin_tenga(uuid) TO service_role;
