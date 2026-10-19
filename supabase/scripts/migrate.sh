#!/bin/sh
# Applique les migrations SQL versionnées à l'instance Supabase de Tenga.
# S'exécute SUR LE SERVEUR (aucun outil sur le poste) :
#
#   sh migrate.sh <tenga-sb|tenga-sb-preprod> [dossier-des-migrations]
#
# Dossier des migrations : 2e argument, sinon $TENGA_MIGRATIONS_DIR, sinon
# ../migrations à côté du script. Conteneur de base : <pile>-db, sinon
# $TENGA_DB_CONTAINER.
#
# Règles :
#  - fichiers NNNN_nom.sql appliqués dans l'ordre, chacun en une transaction
#    (psql --single-transaction -f -) ; l'inscription dans
#    private.schema_migrations est dans la même transaction ;
#  - chaque transaction prend un verrou consultatif puis revérifie que la
#    version n'a pas été appliquée entre-temps par une exécution concurrente ;
#  - tous les contrôles (noms, empreintes, ordre, mots interdits) ont lieu
#    avant d'appliquer la première migration. Seule la table de suivi,
#    idempotente, est créée avant eux ;
#  - un fichier déjà appliqué dont l'empreinte SHA-256 a changé, ou disparu,
#    fait REFUSER tout le passage (code 1) ;
#  - une migration nouvelle numérotée avant la dernière appliquée est refusée ;
#  - les fichiers sont copiés une fois dans un dossier temporaire : l'empreinte
#    calculée est celle du contenu réellement appliqué ;
#  - un fichier qui pilote lui-même la transaction (BEGIN, COMMIT, ROLLBACK,
#    ABORT, END, START TRANSACTION, \set AUTOCOMMIT) est refusé, commentaires
#    exclus. Convention : dans les corps plpgsql, ne pas écrire « END; » seul
#    (écrire « END » sans point-virgule final) ;
#  - rôle d'exécution : par défaut chaque migration tourne sous
#    SET LOCAL ROLE tenga_owner (propriétaire non superutilisateur, soumis à la
#    RLS). Exception documentée : un fichier dont la PREMIÈRE ligne est
#    « -- migrate:superuser » tourne en supabase_admin (extensions, rôles,
#    déclencheurs d'événement). Les autres n'ont pas le droit de changer de
#    rôle (SET ROLE, RESET ROLE, SET SESSION AUTHORIZATION refusés). Ce n'est
#    pas une frontière de sécurité contre un fichier malveillant, c'est une
#    discipline relue en revue ;
#  - aucune valeur de secret n'est lue ni affichée.
# Codes de sortie : 0 succès, 1 refus ou échec.

set -eu

stack=${1:?usage: migrate.sh <tenga-sb|tenga-sb-preprod> [dossier]}
here=$(cd "$(dirname "$0")" && pwd)
dir=${2:-${TENGA_MIGRATIONS_DIR:-$here/../migrations}}
ctr=${TENGA_DB_CONTAINER:-$stack-db}

case "$stack" in
  tenga-sb | tenga-sb-preprod) ;;
  *) echo "migrate: pile inconnue : $stack" >&2; exit 1 ;;
esac
[ -d "$dir" ] || { echo "migrate: dossier introuvable : $dir" >&2; exit 1; }

dpsql() { docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$ctr" psql -U supabase_admin -d postgres -X -q -v ON_ERROR_STOP=1 "$@"; }
fail() { echo "migrate: REFUS : $*" >&2; exit 1; }

# Instructions de transaction, à n'importe quelle position d'une ligne
# (début de ligne ou après un point-virgule), insensible à la casse.
motif_transaction='(^|;)[[:space:]]*((commit|rollback|abort)([^[:alnum:]_]|$)|(begin|end)[[:space:]]*;|(begin|start|end)[[:space:]]+(transaction|work)|begin[[:space:]]+(isolation|read|deferrable|not)|prepare[[:space:]]+transaction)|^[[:space:]]*\\set[[:space:]]+autocommit'
motif_role='(^|;)[[:space:]]*(set|reset)[[:space:]]+(local[[:space:]]+|session[[:space:]]+)?(role|session[[:space:]]+authorization)([^[:alnum:]_]|$)'

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/m"

# 1. Table de suivi (idempotente). Le schéma private n'est jamais lisible par l'API.
dpsql --single-transaction -f - <<'SQL' || fail "impossible de préparer la table de suivi"
DO $tenga$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('tenga.schema_migrations')); END $tenga$;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS private.schema_migrations (
  version     text PRIMARY KEY CHECK (version ~ '^[0-9]{4}$'),
  nom         text NOT NULL,
  sha256      text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  applique_le timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.schema_migrations FORCE ROW LEVEL SECURITY;
SQL

# 2. État appliqué : « version sha256 » par ligne.
dpsql -t -A -F ' ' -c "SELECT version, sha256 FROM private.schema_migrations ORDER BY version" > "$tmp/appliquees"

# 3. Contrôles complets sur une copie unique de chaque fichier.
: > "$tmp/liste"
for f in "$dir"/*.sql; do
  [ -e "$f" ] || break
  base=$(basename "$f")
  case "$base" in
    *[!a-z0-9_.]*) fail "nom invalide : $base (caractères permis : a-z, 0-9, _ et .)" ;;
  esac
  printf '%s' "$base" | grep -Eq '^[0-9]{4}_[a-z0-9_]+\.sql$' \
    || fail "nom invalide : $base (attendu NNNN_nom.sql)"
  cp "$f" "$tmp/m/$base"
  sed 's/--.*$//' "$tmp/m/$base" | grep -Eiq "$motif_transaction" \
    && fail "$base pilote lui-même la transaction (BEGIN, COMMIT, ROLLBACK, ABORT, END, START TRANSACTION, \\set AUTOCOMMIT)"
  if [ "$(head -n 1 "$tmp/m/$base")" = "-- migrate:superuser" ]; then
    echo "superuser" > "$tmp/m/$base.role"
  else
    echo "tenga_owner" > "$tmp/m/$base.role"
    sed 's/--.*$//' "$tmp/m/$base" | grep -Eiq "$motif_role" \
      && fail "$base change de rôle (SET ROLE, RESET ROLE, SET SESSION AUTHORIZATION) sans la ligne « -- migrate:superuser »"
  fi
  printf '%s %s\n' "$base" "$(sha256sum "$tmp/m/$base" | cut -d' ' -f1)" >> "$tmp/liste"
done

versions_vues=""
while read -r base sha; do
  v=${base%%_*}
  case " $versions_vues " in *" $v "*) fail "numéro $v en double" ;; esac
  versions_vues="$versions_vues $v"
done < "$tmp/liste"

max_appliquee=""
while read -r v sha_base; do
  [ -n "$v" ] || continue
  ligne=$(grep -E "^${v}_" "$tmp/liste" || true)
  [ -n "$ligne" ] || fail "la migration appliquée $v n'existe plus dans $dir"
  sha_fichier=${ligne#* }
  [ "$sha_fichier" = "$sha_base" ] \
    || fail "empreinte modifiée pour ${ligne%% *} (en base ${sha_base%${sha_base#????????}}..., fichier ${sha_fichier%${sha_fichier#????????}}...) : une migration appliquée ne se modifie jamais, ajouter une nouvelle migration"
  max_appliquee=$v
done < "$tmp/appliquees"

while read -r base sha; do
  v=${base%%_*}
  if ! grep -q "^$v " "$tmp/appliquees" && [ -n "$max_appliquee" ] && [ "$v" -lt "$max_appliquee" ]; then
    fail "$base est numérotée avant la dernière migration appliquée ($max_appliquee)"
  fi
done < "$tmp/liste"

# 4. Application, une transaction par fichier, depuis la copie hachée.
nb_appliquees=0
nb_a_jour=0
while read -r base sha; do
  v=${base%%_*}
  nom=${base#*_}
  nom=${nom%.sql}
  if grep -q "^$v " "$tmp/appliquees"; then
    nb_a_jour=$((nb_a_jour + 1))
    continue
  fi
  echo "migrate: application de $base"
  {
    printf "DO \$tenga\$ BEGIN PERFORM pg_advisory_xact_lock(hashtext('tenga.schema_migrations')); IF EXISTS (SELECT 1 FROM private.schema_migrations WHERE version = '%s') THEN RAISE EXCEPTION 'migration déjà appliquée par une exécution concurrente'; END IF; END \$tenga\$;\n" "$v"
    if [ "$(cat "$tmp/m/$base.role")" = "tenga_owner" ]; then
      printf 'SET LOCAL ROLE tenga_owner;\n'
    fi
    cat "$tmp/m/$base"
    printf '\nRESET ROLE;\n'
    printf "INSERT INTO private.schema_migrations (version, nom, sha256) VALUES ('%s', '%s', '%s');\n" "$v" "$nom" "$sha"
  } > "$tmp/flux.sql"
  dpsql --single-transaction -f - < "$tmp/flux.sql" || fail "échec de $base (transaction annulée)"
  nb_appliquees=$((nb_appliquees + 1))
done < "$tmp/liste"

echo "migrate: $stack : $nb_appliquees appliquée(s), $nb_a_jour déjà à jour"
