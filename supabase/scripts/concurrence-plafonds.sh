#!/bin/sh
# Essai de concurrence réel (dix sessions) : dix invitations de la même
# organisation, vers dix destinataires différents, au même instant
# (app.consommer_plafond_invitation, plafond d'organisation à 3). Attendu :
# exactement 3 réponses « accepte », 7 « refuse_organisation » et 3 événements
# d'organisation en table : le verrou consultatif par clé sérialise le
# comptage et l'insertion. Sans le verrou, plusieurs sessions lisent le même
# compte et dépassent le plafond.
#
#   sh concurrence-plafonds.sh <conteneur-de-base-jetable> [--sans-verrou]
#
# Avec --sans-verrou, les verrous sont retirés de la fonction pour la durée de
# l'essai (vu rouge) : le script réussit alors SEULEMENT si l'essai constate la
# violation. La fonction est rétablie ensuite.
#
# À lancer UNIQUEMENT sur la base jetable : il écrit pour de bon dans
# private.plafonds_invitations (les lignes de l'essai sont retirées ensuite).
set -eu
ctr=${1:?usage: concurrence-plafonds.sh <conteneur-jetable> [--sans-verrou]}
mode=${2:-}
case "$ctr" in *jetable*) ;; *) echo "concurrence-plafonds: réservé à la base jetable" >&2; exit 1 ;; esac
dpsql() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
org='c1000000-0000-4000-8000-0000000000b1'

debut=$(dpsql -c "SELECT COALESCE(max(id), 0) FROM private.plafonds_invitations")

nettoyer() {
  dpsql -c "DELETE FROM private.plafonds_invitations WHERE id > $debut" >/dev/null
}

if [ "$mode" = "--sans-verrou" ]; then
  dpsql -c "SELECT pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure)" > "$tmp/origine.sql"
  sed 's/PERFORM pg_catalog.pg_advisory_xact_lock([^;]*;/PERFORM pg_catalog.pg_sleep(0.3);/' "$tmp/origine.sql" > "$tmp/mutant.sql"
  cmp -s "$tmp/origine.sql" "$tmp/mutant.sql" && { echo "concurrence-plafonds: mutation sans effet" >&2; exit 1; }
  dpsql -f "$tmp/mutant.sql" >/dev/null
fi

i=0
while [ "$i" -lt 10 ]; do
  ( dpsql -c "SELECT app.consommer_plafond_invitation('$org', encode(sha256(convert_to('conc-plafond-$i', 'UTF8')), 'hex'), 3, 100, 86400)" >"$tmp/r$i.out" 2>"$tmp/s$i.err" ) &
  i=$((i + 1))
done
wait

acceptes=$(cat "$tmp"/r*.out | grep -c '^accepte$' || true)
refuses=$(cat "$tmp"/r*.out | grep -c '^refuse_organisation$' || true)
evenements=$(dpsql -c "SELECT count(*) FROM private.plafonds_invitations WHERE id > $debut AND portee = 'organisation'")

if [ "$mode" = "--sans-verrou" ]; then
  dpsql -f "$tmp/origine.sql" >/dev/null
fi
nettoyer

echo "concurrence-plafonds${mode:+ $mode}: acceptés $acceptes, refusés $refuses, événements d'organisation $evenements"
if [ "$mode" = "--sans-verrou" ]; then
  if [ "$acceptes" != 3 ] || [ "$evenements" != 3 ]; then
    echo "concurrence-plafonds: ROUGE attendu constaté sans le verrou (l'essai détecte bien l'absence de verrou)"; exit 0
  fi
  echo "concurrence-plafonds: ECHEC : l'essai n'a rien vu sans le verrou, il ne prouve rien" >&2; exit 1
fi
[ "$acceptes" = 3 ] && [ "$refuses" = 7 ] && [ "$evenements" = 3 ] && { echo "concurrence-plafonds: OK (3 acceptés, 7 refusés, 3 événements)"; exit 0; }
echo "concurrence-plafonds: ECHEC (attendu : 3 acceptés, 7 refusés, 3 événements)" >&2; exit 1
