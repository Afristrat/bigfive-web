-- mutation: service_role peut exécuter retirer_admin_tenga
GRANT EXECUTE ON FUNCTION app.retirer_admin_tenga(uuid) TO service_role;
