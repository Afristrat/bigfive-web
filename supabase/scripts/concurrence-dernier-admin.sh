#!/bin/sh
# Essai de concurrence réel (deux sessions) : deux administrateurs Tenga, deux
# sessions qui suppriment chacune un administrateur DIFFÉRENT en même temps.
# Attendu : l'une réussit, l'autre est refusée (« Il doit toujours rester un
# administrateur Tenga »), il reste exactement 1 administrateur. Sans le verrou
# de private.garder_dernier_admin, les deux réussiraient et il en resterait 0.
#
#   sh concurrence-dernier-admin.sh <conteneur-de-base-jetable>
#
# À lancer UNIQUEMENT sur la base jetable (jetable.sh l'appelle) : il écrit pour
# de bon dans auth.users et private.tenga_admins.
set -eu
ctr=${1:?usage: concurrence-dernier-admin.sh <conteneur-jetable>}
case "$ctr" in *jetable*) ;; *) echo "concurrence-dernier-admin: réservé à la base jetable" >&2; exit 1 ;; esac
dpsql() { docker exec -i "$ctr" psql -U supabase_admin -d postgres -X -q -At -v ON_ERROR_STOP=1 "$@"; }

dpsql -c "DELETE FROM private.tenga_admins" >/dev/null 2>&1 || true
dpsql <<'SQL'
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'conc1@example.test'),
  ('c0000000-0000-4000-8000-0000000000a2', 'conc2@example.test')
ON CONFLICT DO NOTHING;
INSERT INTO private.tenga_admins (user_id) VALUES
  ('c0000000-0000-4000-8000-0000000000a1'),
  ('c0000000-0000-4000-8000-0000000000a2');
SQL

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
# Session 1 : supprime A1, garde sa transaction ouverte 4 s.
( dpsql -c "BEGIN; DELETE FROM private.tenga_admins WHERE user_id='c0000000-0000-4000-8000-0000000000a1'; SELECT pg_sleep(4); COMMIT;" >"$tmp/s1.out" 2>"$tmp/s1.err" && echo ok >"$tmp/s1.rc" || echo ko >"$tmp/s1.rc" ) &
sleep 1
# Session 2 : supprime A2 pendant que la session 1 est ouverte.
( dpsql -c "BEGIN; DELETE FROM private.tenga_admins WHERE user_id='c0000000-0000-4000-8000-0000000000a2'; COMMIT;" >"$tmp/s2.out" 2>"$tmp/s2.err" && echo ok >"$tmp/s2.rc" || echo ko >"$tmp/s2.rc" ) &
wait

reste=$(dpsql -c "SELECT count(*) FROM private.tenga_admins")
# Remise à zéro : les tests suivants supposent les tables applicatives vides. Le
# garde du dernier administrateur est suspendu le temps de ce nettoyage (base
# jetable, superutilisateur) puis rétabli.
nettoyer_traces() {
  dpsql <<'SQL' >/dev/null
ALTER TABLE private.tenga_admins DISABLE TRIGGER tenga_admins_dernier;
DELETE FROM auth.users WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2');
ALTER TABLE private.tenga_admins ENABLE TRIGGER tenga_admins_dernier;
SQL
}
nettoyer_traces
r1=$(cat "$tmp/s1.rc"); r2=$(cat "$tmp/s2.rc")
refus=$(cat "$tmp/s1.err" "$tmp/s2.err" | grep -c "Il doit toujours rester un administrateur Tenga" || true)
echo "concurrence-dernier-admin: session 1 $r1, session 2 $r2, refus attendus $refus, administrateurs restants $reste"
[ "$reste" = 1 ] && [ "$refus" = 1 ] && { echo "concurrence-dernier-admin: OK (un seul administrateur supprimé, l'autre refusé)"; exit 0; }
echo "concurrence-dernier-admin: ECHEC (attendu : restants 1, refus 1)" >&2; exit 1
