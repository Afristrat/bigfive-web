-- mutation: la RLS n'est plus forcée sur app.reseau_reponses (le garde-fou DDL est d'abord désactivé, car il refuserait l'ALTER)
ALTER EVENT TRIGGER garde_ddl_tenga DISABLE;
ALTER TABLE app.reseau_reponses NO FORCE ROW LEVEL SECURITY;
