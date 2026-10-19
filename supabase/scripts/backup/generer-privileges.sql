-- Génère, depuis la base SOURCE, le script SQL qui rétablit ses privilèges (schémas, tables,
-- vues, séquences, fonctions, privilèges par défaut). Lu par sauvegarde.sh (psql -At), rejoué
-- par restauration-essai.sh (et par toute restauration réelle) APRÈS pg_restore.
--
-- Pourquoi : `pg_dump` ne réécrit pas les privilèges qui, à ses yeux, sont ceux de l'image
-- (pg_init_privs), et `pg_restore --clean` détruit puis recrée les schémas de l'image. Mesuré
-- le 2026-10-19 sur supabase/postgres:17.6.1.136 : sans ce script, le témoin restauré garde
-- les privilèges par défaut de l'image (anon, authenticated et service_role reçoivent tout sur
-- les futures tables du schéma public) et perd les droits d'usage des schémas graphql ; 13
-- tests d'isolation SQL échouent alors sur la copie alors qu'ils passent tous sur la base en
-- service. Une copie plus permissive que la production n'est pas une sauvegarde sûre.
--
-- Principe, objet par objet : retirer tout droit à PUBLIC et à tous les rôles autres que le
-- propriétaire, puis réaccorder exactement les droits de la source. Les droits du propriétaire
-- sont ceux par défaut (acldefault). Sortie : une instruction par ligne, déterministe.
-- Limite assumée : les droits accordés par un rôle autre que le propriétaire (ré-octroi) ne
-- sont pas reproduits ; l'inventaire (lignes C) le verrait comme une divergence.
with objets as (
  -- (ordre, mot-clé, désignation SQL, propriétaire, liste de droits)
  select 10 as ord, 'SCHEMA' as genre, format('%I', n.nspname) as cible, n.nspowner as proprio,
         coalesce(n.nspacl, acldefault('n', n.nspowner)) as acl, null::text as portee
    from pg_namespace n where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 20, case c.relkind when 'S' then 'SEQUENCE' else 'TABLE' end, format('%I.%I', n.nspname, c.relname), c.relowner,
         coalesce(c.relacl, acldefault((case when c.relkind = 'S' then 's' else 'r' end)::"char", c.relowner)), null
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f') and n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  select 30, case p.prokind when 'p' then 'PROCEDURE' else 'FUNCTION' end,
         format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), p.proowner,
         coalesce(p.proacl, acldefault('f', p.proowner)), null
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname !~ '^pg_' and n.nspname <> 'information_schema'
  union all
  -- privilèges par défaut : « ALTER DEFAULT PRIVILEGES FOR ROLE r [IN SCHEMA s] ... TABLES »
  select 40, case d.defaclobjtype when 'r' then 'TABLES' when 'S' then 'SEQUENCES' when 'f' then 'FUNCTIONS'
                                  when 'T' then 'TYPES' when 'n' then 'SCHEMAS' end,
         format('defaut %s %s', d.defaclnamespace, d.defaclobjtype), d.defaclrole, d.defaclacl,
         format('FOR ROLE %I%s', pg_get_userbyid(d.defaclrole), case when d.defaclnamespace <> 0 then format(' IN SCHEMA %I', (select nspname from pg_namespace where oid = d.defaclnamespace)) else '' end)
    from pg_default_acl d
),
retraits as (
  select o.ord, 0 as sous, o.cible, o.genre,
         case when o.ord = 40
              then format('ALTER DEFAULT PRIVILEGES %s REVOKE ALL ON %s FROM PUBLIC%s', o.portee, o.genre, coalesce(r.liste, ''))
              else format('REVOKE ALL ON %s %s FROM PUBLIC%s', o.genre, o.cible, coalesce(r.liste, '')) end as instruction
    from objets o
    left join lateral (select ', ' || string_agg(quote_ident(x.rolname), ', ' order by x.rolname) as liste
                         from pg_roles x where x.rolname !~ '^pg_' and x.oid <> o.proprio) r on true
),
octrois as (
  select o.ord, 1 as sous, o.cible, o.genre,
         case when o.ord = 40
              then format('ALTER DEFAULT PRIVILEGES %s GRANT %s ON %s TO %s%s', o.portee, string_agg(a.privilege_type, ', ' order by a.privilege_type),
                          o.genre, case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end,
                          case when a.is_grantable then ' WITH GRANT OPTION' else '' end)
              else format('GRANT %s ON %s %s TO %s%s', string_agg(a.privilege_type, ', ' order by a.privilege_type), o.genre, o.cible,
                          case when a.grantee = 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end,
                          case when a.is_grantable then ' WITH GRANT OPTION' else '' end) end as instruction
    from objets o cross join lateral aclexplode(o.acl) a
   where a.grantee <> o.proprio
   group by o.ord, o.genre, o.cible, o.portee, a.grantee, a.is_grantable
)
select instruction || ';' from (
  select * from retraits union all select * from octrois
) t
order by ord, genre, cible, sous, instruction collate "C";
