#!/bin/sh
# Contrôle « vu rouge » par mutation (plan § 7), SUR LE SERVEUR.
#
#   sh mutate-sql.sh <tenga-sb|tenga-sb-preprod> [dossier-mutations] [dossier-tests-sql]
#
# Dossiers : 2e et 3e arguments, sinon $TENGA_MUTATIONS_DIR et $TENGA_TESTS_DIR,
# sinon ../tests/mutations et ../tests/sql à côté du script. Conteneur :
# <pile>-db, sinon $TENGA_DB_CONTAINER.
#
# Principe : chaque fichier tests/mutations/NN_nom.sql contient UNE altération
# du schéma (règle retirée ou ajoutée, droit ouvert, déclencheur supprimé,
# fonction sans journalisation, contrainte retirée...). Pour chaque mutation,
# le script rejoue les tests SQL, chacun dans une transaction annulée dont la
# mutation est appliquée en premier :
#   BEGIN; sentinelle; <mutation>; <fichier de test>; contrôle; ROLLBACK;
# Rien n'est jamais conservé. Une mutation doit faire échouer AU MOINS UN test
# (une ligne « not ok ») ; l'arrêt au premier fichier rouge est la règle
# (TENGA_MUTATION_TOUT=1 rejoue tous les fichiers pour cartographier).
#
# Avant les mutations, le TÉMOIN sans mutation doit être entièrement vert
# (test-sql.sh). Une mutation qui ne s'applique pas (erreur SQL à elle seule)
# est INVALIDE, une mutation qui ne fait rien échouer est SURVIVANTE : dans les
# deux cas le script sort en erreur. Il refuse aussi moins de
# $TENGA_MUTATIONS_MIN mutations (12 par défaut).
# Code de sortie : 0 si le témoin est vert et toutes les mutations sont rouges.

set -eu

stack=${1:?usage: mutate-sql.sh <tenga-sb|tenga-sb-preprod> [dossier-mutations] [dossier-tests]}
here=$(cd "$(dirname "$0")" && pwd)
mdir=${2:-${TENGA_MUTATIONS_DIR:-$here/../tests/mutations}}
tdir=${3:-${TENGA_TESTS_DIR:-$here/../tests/sql}}
ctr=${TENGA_DB_CONTAINER:-$stack-db}
minimum=${TENGA_MUTATIONS_MIN:-12}
tout=${TENGA_MUTATION_TOUT:-0}

case "$stack" in
  tenga-sb | tenga-sb-preprod) ;;
  *) echo "mutate-sql: pile inconnue : $stack (jamais la production)" >&2; exit 1 ;;
esac
[ -d "$mdir" ] || { echo "mutate-sql: dossier introuvable : $mdir" >&2; exit 1; }
[ -d "$tdir" ] || { echo "mutate-sql: dossier introuvable : $tdir" >&2; exit 1; }

# Même détection que test-sql.sh : un fichier ne pilote pas la transaction.
motif_transaction='(^|;)[[:space:]]*((commit|rollback|abort)([^[:alnum:]_]|$)|(begin|end)[[:space:]]*;|(begin|start|end)[[:space:]]+(transaction|work)|begin[[:space:]]+(isolation|read|deferrable|not)|prepare[[:space:]]+transaction)|^[[:space:]]*\\set[[:space:]]+autocommit'

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

psql_run() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -t -A -v ON_ERROR_STOP=1; }

# 1. Témoin : aucune mutation, tous les tests verts.
echo "== témoin sans mutation"
if ! sh "$here/test-sql.sh" "$stack" "$tdir" > "$tmp/temoin.txt" 2>&1; then
  cat "$tmp/temoin.txt"
  echo "mutate-sql: ÉCHEC : le témoin sans mutation n'est pas vert, les mutations n'ont aucun sens" >&2
  exit 1
fi
tail -n 1 "$tmp/temoin.txt"

# 2. Mutations.
nb=0
nb_rouges=0
echec=0
echo "== mutations"
for m in "$mdir"/*.sql; do
  [ -e "$m" ] || break
  mbase=$(basename "$m")
  if sed 's/--.*$//' "$m" | grep -Eiq "$motif_transaction"; then
    echo "mutate-sql: REFUS : $mbase pilote lui-même la transaction" >&2
    exit 1
  fi
  nb=$((nb + 1))

  # La mutation seule doit s'appliquer.
  if ! { printf 'BEGIN;\n'; cat "$m"; printf '\nROLLBACK;\n'; } | psql_run > /dev/null 2> "$tmp/seule.err"; then
    echec=1
    echo "INVALIDE   $mbase : la mutation ne s'applique pas"
    sed 's/^/             /' "$tmp/seule.err"
    continue
  fi

  tue=""
  for f in "$tdir"/*.sql; do
    [ -e "$f" ] || break
    base=$(basename "$f")
    if {
      printf 'BEGIN;\n'
      printf 'CREATE TEMP TABLE __sentinelle () ON COMMIT DROP;\n'
      cat "$m"
      printf '\n'
      cat "$f"
      printf "\nSELECT CASE WHEN to_regclass('pg_temp.__sentinelle') IS NULL THEN 'SENTINELLE-PERDUE' ELSE 'SENTINELLE-OK' END;\n"
      printf 'ROLLBACK;\n'
    } | psql_run > "$tmp/sortie.tap" 2> /dev/null; then
      statut_psql=0
    else
      statut_psql=1
    fi
    ko=$(grep -c '^not ok ' "$tmp/sortie.tap" || true)
    # Le fichier échoue s'il compte un « not ok », ou si psql sort en erreur
    # (test-sql.sh le déclarerait en ECHEC de la même façon : la mutation a
    # déjà été validée seule plus haut, l'erreur vient donc des tests).
    if [ "$ko" -gt 0 ]; then
      if [ -z "$tue" ]; then
        premier=$(grep -m 1 '^not ok ' "$tmp/sortie.tap" | sed 's/^not ok [0-9]* - //')
        tue="$base ($ko not ok) : $premier"
      fi
      [ "$tout" = 1 ] || break
    elif [ "$statut_psql" -ne 0 ]; then
      if [ -z "$tue" ]; then
        tue="$base (arrêt sur erreur psql, aucun not ok)"
      fi
      [ "$tout" = 1 ] || break
    fi
  done

  if [ -n "$tue" ]; then
    nb_rouges=$((nb_rouges + 1))
    echo "ROUGE      $mbase : $tue"
  else
    echec=1
    echo "SURVIVANTE $mbase : aucun test n'a échoué, une règle, un droit ou un verrou n'est pas protégé par les tests"
  fi
done

echo "mutate-sql: $stack : $nb mutation(s), $nb_rouges rouge(s)"
if [ "$nb" -lt "$minimum" ]; then
  echo "mutate-sql: ÉCHEC : $nb mutation(s) au lieu de $minimum au moins" >&2
  exit 1
fi
exit "$echec"
