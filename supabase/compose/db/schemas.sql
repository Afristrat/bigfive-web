-- Crée, vides, les deux schémas de Tenga dès l'initialisation : PostgREST
-- refuse de démarrer si le schéma exposé (app) n'existe pas. Droits, tables
-- et règles viennent ensuite des migrations versionnées (supabase/migrations),
-- dont la première est écrite pour tolérer ces schémas déjà présents.
\set ON_ERROR_STOP on

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
