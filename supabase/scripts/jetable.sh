#!/bin/sh
# Éprouve les migrations et les tests SQL sur une base JETABLE, SUR LE SERVEUR.
# Tenga n'a qu'un environnement (la production) : toute migration s'essaie ici
# avant d'atteindre tenga-sb. La base naît de zéro, reçoit les migrations dans
# l'ordre (migrate.sh), puis les tests pgTAP (test-sql.sh), puis, avec
# --mutations, les mutations « vu rouge » (mutate-sql.sh). Le conteneur et son
# volume sont détruits à la sortie, succès ou échec : rien ne subsiste.
#
#   sh jetable.sh [--mutations]
#
# Attendu : les dossiers db/, migrations/, tests/ et scripts/ de l'arbre
# supabase (db/ = compose/db du dépôt), à côté du dossier scripts/ de ce script.
# Plafonds identiques à l'instance (SOP-020) : 768 Mio, 256 processus.
# Code de sortie : 0 si migrations et tests sont verts, 1 sinon.

set -eu

here=$(cd "$(dirname "$0")/.." && pwd)
stack=tenga-sb-jetable
ctr=$stack-db
mutations=${1:-}

for f in db/roles.sql db/schemas.sql migrations tests scripts/migrate.sh scripts/test-sql.sh; do
  [ -e "$here/$f" ] || { echo "jetable: introuvable : $here/$f" >&2; exit 1; }
done

nettoyer() { docker rm -f -v "$ctr" >/dev/null 2>&1 || true; }
nettoyer
trap nettoyer EXIT

mdp="jetable-$(date +%s)-$$"
docker run -d --name "$ctr" \
  --memory 768m --memory-reservation 256m --memory-swap 1024m --pids-limit 256 \
  -e POSTGRES_PASSWORD="$mdp" -e POSTGRES_DB=postgres -e POSTGRES_HOST=/var/run/postgresql \
  -v "$here/db/roles.sql:/docker-entrypoint-initdb.d/init-scripts/99-roles.sql:ro" \
  -v "$here/db/schemas.sql:/docker-entrypoint-initdb.d/migrations/99-tenga-schemas.sql:ro" \
  supabase/postgres:17.6.1.136 \
  postgres -c config_file=/etc/postgresql/postgresql.conf -c log_min_messages=fatal \
           -c shared_buffers=128MB -c max_connections=40 -c cron.timezone=Africa/Casablanca >/dev/null

# La première initialisation (migrations de l'image) dépasse 50 s : jusqu'à 5 minutes.
pret=0
for i in $(seq 1 60); do
  if docker exec "$ctr" pg_isready -U postgres -h localhost >/dev/null 2>&1 \
     && docker exec "$ctr" psql -U supabase_admin -d postgres -Atc 'select 1' >/dev/null 2>&1; then
    pret=1; break
  fi
  sleep 5
done
[ "$pret" = 1 ] || { echo "jetable: la base n'est pas prête après 5 minutes" >&2; docker logs --tail 20 "$ctr" >&2 || true; exit 1; }

# Schéma auth : l'image seule n'a pas les colonnes que GoTrue ajoute (banned_until,
# is_sso_user...). On reprend la STRUCTURE (aucune donnée : pg_dump -s) du schéma
# auth de l'instance de production, en lecture seule, puis on remplace celui de
# l'image. Source : $TENGA_AUTH_SOURCE, par défaut tenga-sb-db.
source=${TENGA_AUTH_SOURCE:-tenga-sb-db}
docker exec "$source" pg_dump -U supabase_admin -d postgres -s -n auth > "$here/.auth-structure.sql"
trap 'rm -f "$here/.auth-structure.sql"; nettoyer' EXIT
docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -c 'DROP SCHEMA IF EXISTS auth CASCADE' >/dev/null 2>&1
docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q < "$here/.auth-structure.sql" >/dev/null 2>&1 || true
docker exec "$ctr" psql -U supabase_admin -d postgres -Atc "select count(*) from information_schema.columns where table_schema='auth' and table_name='users' and column_name='banned_until'" | grep -q '^1$'   || { echo "jetable: schéma auth non repris" >&2; exit 1; }

export TENGA_DB_CONTAINER=$ctr
sh "$here/scripts/migrate.sh" "$stack" "$here/migrations"
sh "$here/scripts/test-sql.sh" "$stack" "$here/tests/sql"
sh "$here/scripts/concurrence-dernier-admin.sh" "$ctr"
sh "$here/scripts/concurrence-mdp.sh" "$ctr"
sh "$here/scripts/concurrence-mdp.sh" "$ctr" --sans-verrou
if [ "$mutations" = "--mutations" ]; then
  sh "$here/scripts/mutate-sql.sh" "$stack"
fi
echo "jetable: tout est vert ; la base jetable est détruite à la sortie"
