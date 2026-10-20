#!/bin/sh
# Course entre la CLÔTURE d'une campagne et la SOUMISSION d'un résultat, avec deux
# sessions réelles, SUR LE SERVEUR (préproduction seulement : le script crée puis
# supprime une organisation de test ; le journal en ajout seul garde quelques
# lignes de cette organisation jusqu'à leur purge).
#
#   sh concurrence-cloture.sh <tenga-sb-preprod>                 attendu : aucun résultat ne naît après la clôture
#   sh concurrence-cloture.sh <tenga-sb-preprod> --sans-verrou   preuve « vu rouge » : retire le verrou partagé du
#                                                                contrôle « campagne ouverte » (fonction remplacée
#                                                                puis RESTAURÉE), attendu : un résultat naît hors photographie
#
# Déroulé : la session A clôt la campagne puis garde sa transaction ouverte 4 secondes ;
# la session B soumet un résultat 1,5 seconde après le début de A. Avec le verrou, B attend
# la fin de la clôture, constate que la campagne est close et échoue (55000). Sans verrou,
# B lit « ouverte » (la clôture n'est pas validée) et insère un résultat que la
# photographie, déjà posée, ne contient pas.
# pgTAP ne peut pas simuler deux sessions : ce script lance deux processus psql indépendants.
# Code de sortie : 0 si le résultat est celui attendu, 1 sinon.

set -eu

stack=${1:?usage: concurrence-cloture.sh tenga-sb-preprod [--sans-verrou]}
mode=${2:-}
case "$stack" in
  tenga-sb-preprod) ;;
  *) echo "concurrence-cloture: préproduction seulement (jamais la production)" >&2; exit 1 ;;
esac
ctr=${TENGA_DB_CONTAINER:-$stack-db}
psql_run() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -t -A -v ON_ERROR_STOP=1 "$@"; }

tmp=$(mktemp -d)
nouveau() { cat /proc/sys/kernel/random/uuid; }
org=$(nouveau); ra=$(nouveau); pa=$(nouveau); camp=$(nouveau); part=$(nouveau)
tag=$(echo "$org" | cut -c1-8)
restaurer=0
nettoyer() {
  if [ "$restaurer" = 1 ] && [ -s "$tmp/def.sql" ]; then psql_run < "$tmp/def.sql" > /dev/null || echo "concurrence-cloture: ALERTE : restauration de la fonction a échoué" >&2; fi
  psql_run -c "DELETE FROM app.organizations WHERE id = '$org'" > /dev/null 2>&1 || true
  psql_run -c "DELETE FROM auth.users WHERE id IN ('$ra', '$pa')" > /dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap nettoyer EXIT

if [ "$mode" = "--sans-verrou" ]; then
  psql_run -c "SELECT pg_get_functiondef('private.exiger_campagne_ouverte()'::regprocedure) || ';'" > "$tmp/def.sql"
  restaurer=1
  sed -e 's/FOR SHARE OF c//' "$tmp/def.sql" | psql_run > /dev/null
fi

psql_run > /dev/null <<SQL
INSERT INTO auth.users (id, email) VALUES ('$ra', 'ra-$tag@example.test'), ('$pa', 'pa-$tag@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES ('$org', 'conc-$tag', 'Concurrence $tag');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES ('$ra', '$org', 'responsable'), ('$pa', '$org', 'participant');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le) VALUES ('$camp', '$org', 'Concurrence', 'ouverte', now());
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES ('$part', '$camp', '$org', '$pa');
SQL

# Session A : clôture, puis transaction gardée ouverte 4 secondes.
{
  printf "BEGIN;\nSELECT set_config('request.jwt.claims', '{\"sub\": \"%s\", \"role\": \"authenticated\"}', true);\nSET LOCAL ROLE authenticated;\n" "$ra"
  printf "SELECT app.clore_campagne('%s');\nRESET ROLE;\nSELECT pg_sleep(4);\nCOMMIT;\n" "$camp"
} | psql_run > "$tmp/a.out" 2> "$tmp/a.err" &
pid_a=$!

sleep 1.5

# Session B : soumission d'un résultat par le participant.
{
  printf "BEGIN;\nSELECT set_config('request.jwt.claims', '{\"sub\": \"%s\", \"role\": \"authenticated\"}', true);\nSET LOCAL ROLE authenticated;\n" "$pa"
  printf "SELECT app.soumettre_resultat('%s', '{\"1\": 3}'::jsonb, '{\"O\": 50}'::jsonb, 'v1', 'c1');\nCOMMIT;\n" "$part"
} | psql_run > "$tmp/b.out" 2> "$tmp/b.err" || true

wait "$pid_a" || { echo "concurrence-cloture: ÉCHEC : la clôture a échoué" >&2; cat "$tmp/a.err" >&2; exit 1; }

statut=$(psql_run -c "SELECT statut FROM app.campaigns WHERE id = '$camp'")
apres=$(psql_run -c "SELECT count(*) FROM app.results r JOIN app.campaigns c ON c.id = '$camp' WHERE r.participation_id = '$part' AND r.soumis_le > c.cloture_le")
total=$(psql_run -c "SELECT count(*) FROM app.results WHERE participation_id = '$part'")
refus=non; grep -q 'Campagne non ouverte' "$tmp/b.err" && refus=oui
echo "concurrence-cloture: campagne $statut, résultats nés après la clôture=$apres, résultats=$total, soumission refusée=$refus"

if [ "$mode" = "--sans-verrou" ]; then
  [ "$statut" = close ] && [ "$apres" -ge 1 ] || { echo "concurrence-cloture: ÉCHEC : sans verrou la course n'est pas observée" >&2; exit 1; }
  echo "concurrence-cloture: ROUGE (attendu) : sans verrou, un résultat naît après la clôture, hors photographie"
else
  [ "$statut" = close ] && [ "$apres" = 0 ] && [ "$total" = 0 ] && [ "$refus" = oui ] || { echo "concurrence-cloture: ÉCHEC : un résultat est né pendant ou après la clôture" >&2; cat "$tmp/b.err" >&2; exit 1; }
  echo "concurrence-cloture: VERT : la soumission a attendu la fin de la clôture, puis a été refusée (55000) ; aucun résultat hors photographie"
fi
