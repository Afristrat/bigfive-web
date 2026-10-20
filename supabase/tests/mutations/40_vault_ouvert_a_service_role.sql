-- mutation: service_role retrouve lusage de vault et la lecture de vault.secrets
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT SELECT ON vault.secrets TO service_role;
