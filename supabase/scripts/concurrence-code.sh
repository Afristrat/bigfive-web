#!/bin/sh
# Essais de code en PARALLÈLE sur un même compte, SUR LE SERVEUR (préproduction
# seulement : le script écrit puis supprime un compte de test, et le journal en
# ajout seul garde quelques lignes « connexion.echec » de ce compte jusqu'à leur purge).
#
#   sh concurrence-code.sh <tenga-sb-preprod>                 attendu : exactement 5 échecs comptés
#   sh concurrence-code.sh <tenga-sb-preprod> --sans-verrou   preuve « vu rouge » : retire le verrou
#                                                             consultatif (fonction remplacée puis
#                                                             RESTAURÉE), attendu : plus de 5 échecs
#
# pgTAP tourne dans une seule transaction annulée et ne peut pas simuler deux
# sessions : ce script lance N processus psql indépendants (une transaction chacun).
# Code de sortie : 0 si le résultat est celui attendu, 1 sinon.

set -eu

stack=${1:?usage: concurrence-code.sh tenga-sb-preprod [--sans-verrou]}
mode=${2:-}
case "$stack" in
  tenga-sb-preprod) ;;
  *) echo "concurrence-code: préproduction seulement (jamais la production)" >&2; exit 1 ;;
esac
ctr=${TENGA_DB_CONTAINER:-$stack-db}
n=${TENGA_CONCURRENCE_N:-16}
psql_run() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -t -A -v ON_ERROR_STOP=1 "$@"; }

tmp=$(mktemp -d)
uid=$(cat /proc/sys/kernel/random/uuid)
email="concurrence-$(echo "$uid" | cut -c1-8)@example.test"
restaurer=0
nettoyer() {
  if [ "$restaurer" = 1 ] && [ -s "$tmp/def.sql" ]; then psql_run < "$tmp/def.sql" > /dev/null || echo "concurrence-code: ALERTE : restauration de la fonction a échoué" >&2; fi
  psql_run -c "DELETE FROM auth.users WHERE id = '$uid'" > /dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap nettoyer EXIT

if [ "$mode" = "--sans-verrou" ]; then
  psql_run -c "SELECT pg_get_functiondef('app.consommer_code_connexion(text,text,text)'::regprocedure) || ';'" > "$tmp/def.sql"
  restaurer=1
  # Sans verrou, et avec une pause après la lecture du compteur pour élargir la course.
  sed -e '/pg_advisory_xact_lock/d' \
      -e "s/  IF COALESCE(v_nb, 0) >= 5 THEN/  PERFORM pg_catalog.pg_sleep(0.4);\n  IF COALESCE(v_nb, 0) >= 5 THEN/" "$tmp/def.sql" | psql_run > /dev/null
fi

psql_run -c "INSERT INTO auth.users (id, email) VALUES ('$uid', '$email')" > /dev/null
code=$(psql_run -c "SELECT code FROM app.demander_lien_connexion('$email')")
faux=000000; [ "$code" = 000000 ] && faux=000001

i=0
while [ "$i" -lt "$n" ]; do
  psql_run -c "SELECT app.consommer_code_connexion('$email', '$faux')" > /dev/null &
  i=$((i + 1))
done
wait

nb=$(psql_run -c "SELECT nb FROM private.echecs_code WHERE user_id = '$uid'")
journal=$(psql_run -c "SELECT count(*) FROM private.audit_log WHERE action = 'connexion.echec' AND ressource_id = '$uid'")
bon=$(psql_run -c "SELECT app.consommer_code_connexion('$email', '$code')")
echo "concurrence-code: $n essais faux en parallèle : compteur=$nb, échecs journalisés=$journal, bon code après plafond=${bon:-refusé}"

if [ "$mode" = "--sans-verrou" ]; then
  [ "$journal" -gt 5 ] || { echo "concurrence-code: ÉCHEC : sans verrou la course n'est pas observée ($journal échecs)" >&2; exit 1; }
  echo "concurrence-code: ROUGE (attendu) : sans verrou, $journal échecs comptés au lieu de 5"
else
  [ "$nb" = 5 ] && [ "$journal" = 5 ] && [ -z "$bon" ] || { echo "concurrence-code: ÉCHEC : le plafond de 5 n'est pas tenu" >&2; exit 1; }
  echo "concurrence-code: VERT : exactement 5 échecs comptés malgré $n essais parallèles, bon code refusé"
fi
