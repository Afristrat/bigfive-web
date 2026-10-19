-- Inventaire d'une base Tenga, lu par sauvegarde.sh (à l'instant du dump) et par
-- restauration-essai.sh (sur le témoin restauré). Les deux lisent CE fichier, mot pour mot :
-- deux textes divergeraient. Lecture seule, sortie triée en collation C, une ligne par fait.
--
--   T schéma.table=N          lignes de chaque table des schémas app, private, auth, public
--   R schéma.table ...        row level security activée / forcée (tous schémas hors système)
--   P schéma.table.politique  politiques RLS (commande, rôles, empreinte des expressions)
--   G schéma.table.déclencheur  déclencheurs non internes (empreinte de la définition)
--   F schéma.fonction(args)   fonctions et procédures hors extension (empreinte de la définition)
--   I schéma.index            index        K schéma.table.contrainte   contraintes
--   S schéma                  schémas      E extension version         extensions
--   Y schéma.type             types énumérés et domaines
--   Q schéma.séquence=valeur  dernière valeur des séquences
--   O rôle ...                rôles (attributs, jamais de mot de passe)
--   M rôle in groupe          appartenances aux rôles   N rôle base noms+md5   réglages par rôle (jamais les valeurs)
--   C ...                     propriétaires et privilèges (schémas, relations, fonctions,
--                             privilèges par défaut, colonnes) : un restore sans eux rend les
--                             rôles de l'API plus permissifs que la production
--
-- Aucune table n'est nommée en dur : un schéma absent (app ou private avant leur migration)
-- ne produit simplement aucune ligne. Aucune valeur de donnée n'est lue, seulement des comptes.
select l from (
  select 'T ' || n.nspname || '.' || c.relname || '='
         || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text as l
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p') and n.nspname in ('app', 'private', 'auth', 'public')
  union all
  select 'R ' || n.nspname || '.' || c.relname || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'P ' || schemaname || '.' || tablename || '.' || policyname || ' ' || cmd || ' ' || permissive
         || ' ' || md5(roles::text || '|' || coalesce(qual, '') || '|' || coalesce(with_check, ''))
    from pg_policies
  union all
  select 'G ' || n.nspname || '.' || c.relname || '.' || t.tgname || ' ' || md5(pg_get_triggerdef(t.oid))
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where not t.tgisinternal and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'F ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') '
         || md5(pg_get_functiondef(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where p.prokind in ('f', 'p') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
     and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
  union all
  select 'I ' || schemaname || '.' || indexname from pg_indexes
   where schemaname !~ '^pg_' and schemaname <> 'information_schema'
  union all
  select 'K ' || n.nspname || '.' || c.relname || '.' || k.conname || ' ' || k.contype::text
    from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'S ' || nspname from pg_namespace where nspname !~ '^pg_' and nspname <> 'information_schema'
  union all
  select 'E ' || extname || ' ' || extversion from pg_extension
  union all
  select 'Y ' || n.nspname || '.' || t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
   where t.typtype in ('e', 'd') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'Q ' || schemaname || '.' || sequencename || '=' || coalesce(last_value::text, 'neuve')
    from pg_sequences
  union all
  select 'O ' || rolname || ' super=' || rolsuper || ' login=' || rolcanlogin || ' bypassrls=' || rolbypassrls
         || ' createrole=' || rolcreaterole || ' createdb=' || rolcreatedb || ' inherit=' || rolinherit
    from pg_roles where rolname !~ '^pg_'
  union all
  select 'M ' || r.rolname || ' in ' || g.rolname
    from pg_auth_members m join pg_roles r on r.oid = m.member join pg_roles g on g.oid = m.roleid
   where r.rolname !~ '^pg_' and g.rolname !~ '^pg_'
  union all
  select 'N ' || coalesce(r.rolname, '*') || ' ' || coalesce(d.datname, '*') || ' ' || (select string_agg(split_part(x, '=', 1), ',' order by x) from unnest(s.setconfig) x) || ' ' || md5(array_to_string(s.setconfig, ';'))
    from pg_db_role_setting s left join pg_roles r on r.oid = s.setrole left join pg_database d on d.oid = s.setdatabase
   where d.datname is null or d.datname = current_database()
  union all
  select 'C schema ' || n.nspname || ' owner=' || pg_get_userbyid(n.nspowner)
         || ' acl=' || coalesce((select string_agg(a::text, ',' order by a::text) from unnest(coalesce(n.nspacl, acldefault('n', n.nspowner))) a), '-')
    from pg_namespace n where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'C rel ' || n.nspname || '.' || c.relname || ' ' || c.relkind::text || ' owner=' || pg_get_userbyid(c.relowner)
         || ' acl=' || coalesce((select string_agg(a::text, ',' order by a::text) from unnest(coalesce(c.relacl, acldefault((case when c.relkind = 'S' then 's' else 'r' end)::"char", c.relowner))) a), '-')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'C col ' || n.nspname || '.' || c.relname || '.' || a.attname
         || ' acl=' || (select string_agg(x::text, ',' order by x::text) from unnest(a.attacl) x)
    from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
   where a.attacl is not null and not a.attisdropped and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'C fn ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') owner='
         || pg_get_userbyid(p.proowner)
         || ' acl=' || coalesce((select string_agg(a::text, ',' order by a::text) from unnest(coalesce(p.proacl, acldefault('f', p.proowner))) a), '-')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 'C defaut ' || pg_get_userbyid(d.defaclrole) || ' ' || coalesce(n.nspname, '*') || ' ' || d.defaclobjtype::text
         || ' acl=' || (select string_agg(a::text, ',' order by a::text) from unnest(d.defaclacl) a)
    from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace
) x
order by l collate "C";
