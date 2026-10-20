#!/bin/sh
# Amorce UNE fois l'administrateur Tenga dans private.tenga_admins (plan § 4).
# S'exécute SUR LE SERVEUR, en SSH, jamais depuis le poste :
#
#   sh seed-admin.sh <tenga-sb|tenga-sb-preprod> <adresse-e-mail>
#
# - Si l'adresse n'a pas de compte, il est créé (inscription fermée : l'API ne
#   crée pas de compte ; ce script le fait en superutilisateur). Le profil naît
#   par le déclencheur de la migration 0002.
# - Refuse de s'exécuter si private.tenga_admins contient déjà une ligne :
#   l'amorçage a lieu une seule fois, et l'attribution de rôles de /admin ne
#   crée jamais d'administrateur Tenga (voir supabase/README.md).
# - L'adresse n'est NI affichée NI journalisée : transmise à psql par une
#   variable, jamais répétée dans la sortie. Les messages d'erreur de psql, qui
#   pourraient la citer, ne sont pas affichés.
# - Une seule transaction : tout ou rien. L'ajout est inscrit au journal
#   (action admin.amorcer, sans adresse).
# Codes de sortie : 0 succès, 1 refus ou échec.

set -eu

stack=${1:?usage: seed-admin.sh <tenga-sb|tenga-sb-preprod> <adresse-e-mail>}
email=${2:?usage: seed-admin.sh <tenga-sb|tenga-sb-preprod> <adresse-e-mail>}
ctr=${TENGA_DB_CONTAINER:-$stack-db}

case "$stack" in
  tenga-sb | tenga-sb-preprod) ;;
  *) echo "seed-admin: pile inconnue : $stack" >&2; exit 1 ;;
esac

# Forme stricte : aucun guillemet, espace ni caractère de contrôle ne passe.
printf '%s' "$email" | grep -Eq '^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,}$' \
  || { echo "seed-admin: REFUS : adresse e-mail invalide" >&2; exit 1; }

dpsql() {
  docker exec -i -e PGOPTIONS="-c client_min_messages=warning" "$ctr" \
    psql -U supabase_admin -d postgres -X -q -v ON_ERROR_STOP=1 "$@"
}

deja=$(dpsql -t -A -c "SELECT count(*) FROM private.tenga_admins" 2>/dev/null) \
  || { echo "seed-admin: ÉCHEC : base injoignable ou migration 0002 non appliquée" >&2; exit 1; }
[ "$deja" = "0" ] \
  || { echo "seed-admin: REFUS : private.tenga_admins contient déjà $deja administrateur(s)" >&2; exit 1; }

# Les autres colonnes de auth.users ont leur valeur par défaut. Le tout est en
# une transaction (--single-transaction) ; stderr n'est pas affiché
# car une erreur de contrainte citerait l'adresse.
if ! dpsql --single-transaction -v "email=$email" -f - >/dev/null 2>&1 <<'SQL'
SELECT lower(:'email') AS adresse \gset

INSERT INTO auth.users
  (instance_id, id, aud, role, email, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
       'authenticated', 'authenticated', :'adresse', now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = :'adresse');

INSERT INTO auth.identities
  (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.email = :'adresse'
  AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

INSERT INTO private.tenga_admins (user_id)
SELECT id FROM auth.users WHERE email = :'adresse';

SELECT private.journaliser(NULL, 'admin.amorcer', 'utilisateur', id)
FROM auth.users WHERE email = :'adresse';
SQL
then
  echo "seed-admin: ÉCHEC : transaction annulée (détail non affiché pour ne pas journaliser l'adresse)" >&2
  exit 1
fi

nb=$(dpsql -t -A -c "SELECT count(*) FROM private.tenga_admins")
[ "$nb" = "1" ] || { echo "seed-admin: ÉCHEC : $nb administrateur(s) après amorçage, attendu 1" >&2; exit 1; }
echo "seed-admin: $stack : 1 administrateur Tenga amorcé (adresse non affichée)"
