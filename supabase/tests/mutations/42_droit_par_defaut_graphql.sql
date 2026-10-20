-- mutation: un droit par défaut est rouvert à anon dans le schéma graphql
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT SELECT ON TABLES TO anon;
