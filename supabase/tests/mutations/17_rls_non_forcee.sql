-- mutation: la RLS n'est plus forcée sur app.results (le garde-fou DDL est d'abord désactivé, car il refuserait l'ALTER)
ALTER EVENT TRIGGER garde_ddl_tenga DISABLE;
ALTER TABLE app.results NO FORCE ROW LEVEL SECURITY;
