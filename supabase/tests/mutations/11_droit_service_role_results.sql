-- mutation: le rôle de service (qui contourne la RLS) reçoit le droit de lire app.results
GRANT SELECT ON app.results TO service_role;
