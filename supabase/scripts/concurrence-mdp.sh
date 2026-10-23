#!/bin/sh
# Essai de concurrence réel (dix sessions) : dix essais de mot de passe du même
# administrateur au même instant (app.mdp_tentative, contrôle et débit
# préalable en une opération, revue I1). Attendu : exactement 5 essais admis et
# comptés, un seul blocage journalisé, état « temporaire » : les cinq premiers
# se comptent l'un après l'autre (verrou consultatif par compte) et les
# suivants, arrivés pendant le blocage, sont refusés sans être comptés. Sans le
# verrou, les sessions voient toutes « pas bloqué » et en admettent davantage.
#
#   sh concurrence-mdp.sh <conteneur-de-base-jetable> [--sans-verrou]
#
# Avec --sans-verrou, le verrou est retiré de la fonction pour la durée de
# l'essai (vu rouge) : le script réussit alors SEULEMENT si l'essai constate la
# violation. La fonction est rétablie ensuite.
#
# À lancer UNIQUEMENT sur la base jetable (jetable.sh l'appelle) : il écrit pour
# de bon dans auth.users et private.tenga_admins.
set -eu
ctr=${1:?usage: concurrence-mdp.sh <conteneur-jetable> [--sans-verrou]}
mode=${2:-}
case "$ctr" in *jetable*) ;; *) echo "concurrence-mdp: réservé à la base jetable" >&2; exit 1 ;; esac
dpsql() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
uid='c0000000-0000-4000-8000-0000000000b1'

nettoyer() {
  dpsql <<SQL >/dev/null
ALTER TABLE private.tenga_admins DISABLE TRIGGER tenga_admins_dernier;
DELETE FROM auth.users WHERE id = '$uid';
ALTER TABLE private.tenga_admins ENABLE TRIGGER tenga_admins_dernier;
DELETE FROM private.audit_log WHERE action LIKE 'connexion.mdp.%';
SQL
}

dpsql <<SQL
INSERT INTO auth.users (id, email) VALUES ('$uid', 'conc-mdp@example.test') ON CONFLICT DO NOTHING;
INSERT INTO private.tenga_admins (user_id) VALUES ('$uid') ON CONFLICT DO NOTHING;
SQL

if [ "$mode" = "--sans-verrou" ]; then
  dpsql -c "SELECT pg_get_functiondef('app.mdp_tentative(text)'::regprocedure)" > "$tmp/origine.sql"
  sed 's/PERFORM pg_catalog.pg_advisory_xact_lock([^;]*;/PERFORM pg_catalog.pg_sleep(0.3);/' "$tmp/origine.sql" > "$tmp/mutant.sql"
  cmp -s "$tmp/origine.sql" "$tmp/mutant.sql" && { echo "concurrence-mdp: mutation sans effet" >&2; nettoyer; exit 1; }
  dpsql -f "$tmp/mutant.sql" >/dev/null
fi

i=0
while [ "$i" -lt 10 ]; do
  ( dpsql -c "SELECT tentative FROM app.mdp_tentative('conc-mdp@example.test')" >/dev/null 2>"$tmp/s$i.err" ) &
  i=$((i + 1))
done
wait

echecs=$(dpsql -c "SELECT count(*) FROM private.echecs_mdp WHERE user_id = '$uid'")
blocages=$(dpsql -c "SELECT count(*) FROM private.audit_log WHERE action = 'connexion.mdp.blocage' AND ressource_id = '$uid'")
etat=$(dpsql -c "SELECT CASE WHEN verrouille_le IS NOT NULL THEN 'definitif' WHEN bloque_jusqu > now() THEN 'temporaire' ELSE 'libre' END FROM private.etat_mdp WHERE user_id = '$uid'")

if [ "$mode" = "--sans-verrou" ]; then
  dpsql -f "$tmp/origine.sql" >/dev/null
fi
nettoyer

echo "concurrence-mdp${mode:+ $mode}: essais admis et comptés $echecs, blocages journalisés $blocages, état $etat"
if [ "$mode" = "--sans-verrou" ]; then
  if [ "$echecs" != 5 ] || [ "$blocages" != 1 ]; then
    echo "concurrence-mdp: ROUGE attendu constaté sans le verrou (l'essai détecte bien l'absence de verrou)"; exit 0
  fi
  echo "concurrence-mdp: ECHEC : l'essai n'a rien vu sans le verrou, il ne prouve rien" >&2; exit 1
fi
[ "$echecs" = 5 ] && [ "$blocages" = 1 ] && [ "$etat" = temporaire ] && { echo "concurrence-mdp: OK (cinq essais admis et comptés, un blocage, état temporaire)"; exit 0; }
echo "concurrence-mdp: ECHEC (attendu : 5 essais comptés, 1 blocage, état temporaire)" >&2; exit 1
