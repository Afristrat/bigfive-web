#!/bin/sh
# Exécute les tests pgTAP (tests/sql/*.sql) sur l'instance, SUR LE SERVEUR.
#
#   sh test-sql.sh <tenga-sb|tenga-sb-preprod> [dossier-des-tests-sql]
#
# Dossier : 2e argument, sinon $TENGA_TESTS_DIR, sinon ../tests/sql à côté du
# script. Conteneur : <pile>-db, sinon $TENGA_DB_CONTAINER.
#
# Chaque fichier est enveloppé par ce script dans une transaction annulée :
#   BEGIN; CREATE TEMP TABLE __sentinelle ... ON COMMIT DROP; <fichier>;
#   contrôle de la sentinelle; ROLLBACK;
# Rien n'est jamais conservé. Les fichiers ne pilotent pas la transaction
# (BEGIN, COMMIT, ROLLBACK, ABORT, END, START TRANSACTION, \set AUTOCOMMIT
# refusés, commentaires exclus). Si malgré tout un fichier validait la
# transaction (par exemple par \gexec), la sentinelle temporaire disparaît et
# le contrôle final échoue.
# Un fichier échoue si une ligne « not ok » apparaît, si le plan est absent ou
# non tenu, si un test est « # SKIP » ou « # TODO », si la sentinelle est
# perdue, ou si psql sort en erreur.
# Code de sortie : 0 si tout est vert, 1 sinon.

set -eu

stack=${1:?usage: test-sql.sh <tenga-sb|tenga-sb-preprod> [dossier]}
here=$(cd "$(dirname "$0")" && pwd)
dir=${2:-${TENGA_TESTS_DIR:-$here/../tests/sql}}
ctr=${TENGA_DB_CONTAINER:-$stack-db}

case "$stack" in
  tenga-sb | tenga-sb-preprod | tenga-sb-jetable) ;;
  *) echo "test-sql: pile inconnue : $stack" >&2; exit 1 ;;
esac
[ -d "$dir" ] || { echo "test-sql: dossier introuvable : $dir" >&2; exit 1; }

# Instructions de transaction, à n'importe quelle position d'une ligne
# (début de ligne ou après un point-virgule), insensible à la casse.
motif_transaction='(^|;)[[:space:]]*((commit|rollback|abort)([^[:alnum:]_]|$)|(begin|end)[[:space:]]*;|(begin|start|end)[[:space:]]+(transaction|work)|begin[[:space:]]+(isolation|read|deferrable|not)|prepare[[:space:]]+transaction)|^[[:space:]]*\\set[[:space:]]+autocommit'

# Copie restaurée par la restauration d'essai (TENGA_TEMOIN = le conteneur de la
# copie) : les tests supposent les tables applicatives vides, alors que la
# production contient de vraies données. On les vide SUR LA COPIE SEULE. Garde
# stricte : le conteneur visé doit être exactement celui que le script de
# restauration désigne comme témoin, et jamais une instance vivante de Tenga.
# session_replication_role = replica suspend les déclencheurs (dont les gardes
# du dernier administrateur et du vidage) : la copie est jetable.
if [ -n "${TENGA_TEMOIN:-}" ]; then
  if [ "$TENGA_TEMOIN" != "$ctr" ] || [ "$ctr" = "tenga-sb-db" ] || [ "$ctr" = "tenga-sb-preprod-db" ]; then
    echo "test-sql: REFUS : le vidage n'est permis que sur la copie témoin (conteneur $ctr, témoin $TENGA_TEMOIN)" >&2
    exit 1
  fi
  docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -v ON_ERROR_STOP=1 <<'SQL'
SET session_replication_role = replica;
DO $vidage$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename FROM pg_catalog.pg_tables
     WHERE (schemaname IN ('app', 'private') AND tablename NOT IN ('settings', 'schema_migrations'))
        OR (schemaname = 'auth' AND tablename = 'users')
  LOOP
    EXECUTE pg_catalog.format('TRUNCATE %I.%I CASCADE', t.schemaname, t.tablename);
  END LOOP;
END
$vidage$;
SQL
  echo "test-sql: copie témoin $ctr : données applicatives vidées avant les tests"
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

nb_fichiers=0
nb_ok=0
nb_ko=0
echec=0

for f in "$dir"/*.sql; do
  [ -e "$f" ] || break
  base=$(basename "$f")
  if sed 's/--.*$//' "$f" | grep -Eiq "$motif_transaction"; then
    echo "test-sql: REFUS : $base pilote lui-même la transaction" >&2
    exit 1
  fi
  nb_fichiers=$((nb_fichiers + 1))
  sortie="$tmp/$base.tap"
  if {
        printf 'BEGIN;\n'
        printf 'CREATE TEMP TABLE __sentinelle () ON COMMIT DROP;\n'
        cat "$f"
        printf "\nSELECT CASE WHEN to_regclass('pg_temp.__sentinelle') IS NULL THEN 'SENTINELLE-PERDUE' ELSE 'SENTINELLE-OK' END;\n"
        printf 'ROLLBACK;\n'
      } | docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -t -A -v ON_ERROR_STOP=1 > "$sortie" 2> "$tmp/$base.err"; then
    statut_psql=0
  else
    statut_psql=1
  fi
  ok=$(grep -c '^ok ' "$sortie" || true)
  ko=$(grep -c '^not ok ' "$sortie" || true)
  saut=$(grep -Ec '# (SKIP|TODO)' "$sortie" || true)
  plan=$(grep -E '^1\.\.[0-9]+$' "$sortie" | head -n 1 | sed 's/^1\.\.//' || true)
  sentinelle=ok
  grep -qx 'SENTINELLE-OK' "$sortie" || sentinelle=perdue
  nb_ok=$((nb_ok + ok))
  nb_ko=$((nb_ko + ko))
  if [ "$statut_psql" -ne 0 ] || [ "$ko" -ne 0 ] || [ "$saut" -ne 0 ] || [ -z "$plan" ] || [ "$plan" -ne "$ok" ] \
      || [ "$sentinelle" != ok ] || grep -q '^# Looks like' "$sortie"; then
    echec=1
    echo "ECHEC  $base : $ok ok, $ko not ok, $saut SKIP/TODO, plan ${plan:-absent}, sentinelle $sentinelle, psql=$statut_psql"
    grep -v '^ok ' "$sortie" || true
    cat "$tmp/$base.err" >&2
  else
    echo "VERT   $base : $ok/$plan"
  fi
done

[ "$nb_fichiers" -gt 0 ] || { echo "test-sql: aucun test dans $dir" >&2; exit 1; }
echo "test-sql: $stack : $nb_fichiers fichier(s), $nb_ok ok, $nb_ko not ok"
exit "$echec"
