#!/bin/sh
# Vérifie une instance Supabase de Tenga, sur le serveur. Lecture seule.
#
#   sh verify-instance.sh <tenga-sb|tenga-sb-preprod>
#
# Contrôles :
#   1. quatre conteneurs sains, plafonds conformes au plan (§ 2.2, SOP-020) ;
#   2. aucun port publié, aucune étiquette Traefik (§ 2.3) ;
#   3. passerelle joignable par son alias depuis le réseau coolify ;
#   4. certification SOP-028 : clés sb_ acceptées, jetons HS256 forgés refusés
#      par GoTrue ET par PostgREST (avec le JWT_SECRET réel comme avec un
#      secret quelconque), JWKS en ES256 seul, aucun secret dans la base.
# N'affiche aucune valeur de secret. Code de sortie : 0 si tout passe.

set -u

stack=${1:?tenga-sb ou tenga-sb-preprod}
dir="/home/serveuria/$stack"
env_file="$dir/.env"
pass=0
fail=0

ok() { pass=$((pass + 1)); printf '  OK      %s\n' "$1"; }
ko() { fail=$((fail + 1)); printf '  ÉCHEC   %s\n' "$1"; }
check() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else ko "$1 : obtenu « $2 », attendu « $3 »"; fi; }

envval() { grep "^$1=" "$env_file" | cut -d= -f2- | sed "s/^'//; s/'\$//"; }

echo "== $stack : conteneurs et plafonds"
# nom mémoire réservée mémoire+échange processus (octets)
for spec in "db 805306368 268435456 1073741824 256" \
            "auth 134217728 33554432 268435456 128" \
            "rest 268435456 100663296 402653184 384" \
            "kong 268435456 134217728 402653184 128"; do
    set -- $spec
    c="$stack-$1"
    state=$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo absent)
    check "$c santé" "$state" healthy
    caps=$(docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.MemoryReservation}} {{.HostConfig.MemorySwap}} {{.HostConfig.PidsLimit}}' "$c" 2>/dev/null)
    check "$c plafonds" "$caps" "$2 $3 $4 $5"
    check "$c ports publiés" "$(docker port "$c" 2>/dev/null | wc -l)" 0
    check "$c étiquettes traefik" "$(docker inspect -f '{{json .Config.Labels}}' "$c" | grep -c traefik)" 0
done

echo "== $stack : réseau"
# Requête depuis un conteneur jetable du réseau coolify, comme l'application
# (node:22-alpine, déjà présente sur le serveur ; l'image de Kong n'a pas curl).
# Adresse et en-têtes passent par l'entrée standard, jamais en argument : une
# clé en argument serait lisible dans la liste des processus de l'hôte.
#   req <url> [en-tête...]   -> corps suivi du code HTTP
req() {
    { for line in "$@"; do printf '%s\n' "$line"; done; } |
        docker run --rm -i --network coolify node:22-alpine node -e '
let input = "";
process.stdin.on("data", (d) => (input += d)).on("end", async () => {
  const [url, ...lines] = input.split("\n").filter(Boolean);
  const headers = {};
  for (const l of lines) { const i = l.indexOf(":"); headers[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  try {
    const r = await fetch(url, { headers });
    process.stdout.write((await r.text()).replace(/\s+/g, " ") + " " + r.status);
  } catch (e) { process.stdout.write("erreur-reseau 000"); }
});'
}
probe() { req "$@" | sed 's/.* \([0-9]*\)$/\1/'; }
check "passerelle joignable par l'alias $stack-gw" "$(probe "http://$stack-gw:8000/auth/v1/.well-known/jwks.json")" 200

echo "== $stack : certification des clés (SOP-028)"
gw="http://$stack-gw:8000"
pub=$(envval SUPABASE_PUBLISHABLE_KEY)
sec=$(envval SUPABASE_SECRET_KEY)
jwt_secret=$(envval JWT_SECRET)

# Jeton HS256 service_role forgé, iat en UTC (SOP-028, annexe A).
forge() {
    # Le secret passe par l'environnement, pas par la ligne de commande.
    FORGE_SECRET=$1 node -e '
const c = require("crypto");
const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const d = b({ alg: "HS256", typ: "JWT" }) + "." + b({ role: "service_role", iss: "supabase", aud: "authenticated", sub: "00000000-0000-0000-0000-000000000000", iat: now, exp: now + 300 });
process.stdout.write(d + "." + c.createHmac("sha256", process.env.FORGE_SECRET).update(d).digest("base64url"));
'
}
forged_real=$(forge "$jwt_secret")
forged_any=$(forge "$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')")

admin="$gw/auth/v1/admin/users?per_page=1"
check "admin GoTrue sans apikey" "$(probe "$admin")" 401
check "admin GoTrue apikey bidon" "$(probe "$admin" 'apikey: sb_secret_bidon')" 401
check "admin GoTrue clé publiable" "$(probe "$admin" "apikey: $pub")" 403
check "admin GoTrue clé secrète" "$(probe "$admin" "apikey: $sec")" 200
check "admin GoTrue HS256 forgé (JWT_SECRET réel)" \
    "$(probe "$admin" "apikey: $pub" "Authorization: Bearer $forged_real")" 403
check "admin GoTrue HS256 forgé (secret quelconque)" \
    "$(probe "$admin" "apikey: $pub" "Authorization: Bearer $forged_any")" 403

# PostgREST : une table inconnue rend 404 PGRST205 une fois l'authentification
# passée, et 401 PGRST301 si le jeton est refusé. Un 401 n'est une preuve de
# fermeture que s'il porte PGRST301.
rest="$gw/rest/v1/table_inconnue"
rest_code() { req "$@" | sed -n 's/.*"code":"\(PGRST[0-9]*\)".* \([0-9]*\)$/\2 \1/p'; }
check "PostgREST sans apikey" "$(probe "$rest")" 401
check "PostgREST clé secrète" "$(rest_code "$rest" "apikey: $sec")" "404 PGRST205"
check "PostgREST HS256 forgé (JWT_SECRET réel)" \
    "$(rest_code "$rest" "apikey: $pub" "Authorization: Bearer $forged_real")" "401 PGRST301"
check "PostgREST HS256 forgé (secret quelconque)" \
    "$(rest_code "$rest" "apikey: $pub" "Authorization: Bearer $forged_any")" "401 PGRST301"

jwks=$(req "$gw/auth/v1/.well-known/jwks.json" | sed 's/ [0-9]*$//')
check "JWKS : algorithmes publiés" "$(printf %s "$jwks" | jq -r '[.keys[].alg] | unique | join(",")')" ES256
check "JWKS : aucune clé symétrique" "$(printf %s "$jwks" | jq '[.keys[] | select(.kty == "oct")] | length')" 0
check "JWKS : aucune partie privée" "$(printf %s "$jwks" | jq '[.keys[] | select(has("d"))] | length')" 0

residue=$(docker exec "$stack-db" psql -U postgres -At -c "select coalesce(current_setting('app.settings.jwt_secret', true), '')" 2>/dev/null)
check "base : aucun app.settings.jwt_secret" "${#residue}" 0

echo "== $stack : $pass contrôle(s) réussi(s), $fail échec(s)"
[ "$fail" -eq 0 ]
