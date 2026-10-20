#!/bin/sh
# Amorce UNE fois l'administrateur Tenga dans private.tenga_admins (plan § 4).
# S'exécute SUR LE SERVEUR, en SSH, jamais depuis le poste :
#
#   SEED_ADMIN_EMAIL='<adresse-e-mail>' sh seed-admin.sh <tenga-sb|tenga-sb-preprod>
#
# L'adresse se donne de préférence par la variable SEED_ADMIN_EMAIL ou, à défaut,
# par la première ligne de l'entrée standard : ainsi elle n'apparaît dans aucune
# liste de processus (ps). Un second argument <adresse-e-mail> reste accepté
# mais il est visible dans ps le temps de l'exécution : à éviter.
#
# - Si l'adresse n'a pas de compte, il est créé (inscription fermée : l'API ne
#   crée pas de compte ; ce script le fait en superutilisateur). Le profil naît
#   par le déclencheur de la migration 0002.
# - Refuse de s'exécuter si private.tenga_admins contient déjà une ligne :
#   l'amorçage a lieu une seule fois, et l'attribution de rôles de /admin ne
#   crée jamais d'administrateur Tenga (voir supabase/README.md). Le contrôle
#   est refait DANS la transaction, après un verrou EXCLUSIVE sur la table :
#   deux exécutions simultanées ne peuvent pas amorcer deux administrateurs.
# - L'adresse n'est NI affichée NI journalisée, et ne figure dans aucun
#   argument de commande : elle est transmise à psql par son entrée standard
#   (\set), jamais en argument de docker exec ni de psql. Les messages d'erreur
#   de psql, qui pourraient la citer, ne sont pas affichés.
# - Une adresse contenant autre chose que lettres, chiffres et . _ % + - @
#   (retour à la ligne, caractère de contrôle, guillemet, espace) est refusée.
# - Une seule transaction : tout ou rien. L'ajout est inscrit au journal
#   (action admin.amorcer, sans adresse).
# Codes de sortie : 0 succès, 1 refus ou échec.

set -eu

usage="usage: SEED_ADMIN_EMAIL=<adresse> seed-admin.sh <tenga-sb|tenga-sb-preprod>"
stack=${1:?$usage}
email=${2:-${SEED_ADMIN_EMAIL:-}}
if [ -z "$email" ] && [ ! -t 0 ]; then
  IFS= read -r email || true
fi
[ -n "$email" ] || { echo "seed-admin: $usage" >&2; exit 1; }
ctr=${TENGA_DB_CONTAINER:-$stack-db}

case "$stack" in
  tenga-sb | tenga-sb-preprod) ;;
  *) echo "seed-admin: pile inconnue : $stack" >&2; exit 1 ;;
esac

# Liste blanche de caractères : tout le reste (dont \n, \r, tabulation, octets de
# contrôle, guillemets, espace) est refusé. Contrôle fait avant toute autre
# vérification, car grep, lui, ne juge que ligne par ligne.
case $email in
  *[!A-Za-z0-9._%+@-]*)
    echo "seed-admin: REFUS : adresse e-mail invalide" >&2; exit 1 ;;
esac
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

# Entrée standard de psql = « \set email '<adresse>' » puis le script. L'adresse a
# passé la liste blanche : aucune apostrophe ni antislash ne peut y figurer.
# Les autres colonnes de auth.users ont leur valeur par défaut. Le tout est en
# une transaction (--single-transaction) ; stderr n'est pas affiché car une
# erreur de contrainte citerait l'adresse.
if ! {
  printf '\\set email %s\n' "'$email'"
  cat <<'SQL'
-- Verrou en tête de transaction : le second exécutant attend, puis voit la ligne.
LOCK TABLE private.tenga_admins IN EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM private.tenga_admins) THEN
    RAISE EXCEPTION 'administrateur deja amorce';
  END IF;
END
$$;

SELECT lower(:'email') AS adresse \gset

-- GoTrue lit ces colonnes comme des chaînes non nulles : un NULL fait échouer
-- toute l'API d'administration (« converting NULL to string is unsupported »,
-- erreur 500 sur /admin/users). On les pose donc à la chaîne vide, comme le fait
-- GoTrue lui-même pour un compte créé par son API.
INSERT INTO auth.users
  (instance_id, id, aud, role, email, email_confirmed_at, encrypted_password,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   email_change_token_current, phone_change, phone_change_token,
   reauthentication_token,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
       'authenticated', 'authenticated', :'adresse', now(), '',
       '', '', '', '', '', '', '', '',
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
} | dpsql --single-transaction -f - >/dev/null 2>&1
then
  echo "seed-admin: ÉCHEC : transaction annulée (détail non affiché pour ne pas journaliser l'adresse)" >&2
  exit 1
fi

nb=$(dpsql -t -A -c "SELECT count(*) FROM private.tenga_admins")
[ "$nb" = "1" ] || { echo "seed-admin: ÉCHEC : $nb administrateur(s) après amorçage, attendu 1" >&2; exit 1; }
echo "seed-admin: $stack : 1 administrateur Tenga amorcé (adresse non affichée)"
