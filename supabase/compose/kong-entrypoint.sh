#!/bin/sh
# Point d'entrée de Kong, repris du gabarit officiel supabase/docker (juillet
# 2026) sans sa branche héritée : sans clés opaques sb_, Kong refuse de
# démarrer au lieu de retomber sur des clés HS256 (SOP-028).
#
# Traduction des en-têtes :
#   1. un Authorization présent qui n'est pas une clé sb_ passe tel quel
#      (jeton de session ES256 d'une personne connectée) ;
#   2. apikey = clé secrète      -> jeton interne ES256 service_role ;
#   3. apikey = clé publiable    -> jeton interne ES256 anon.
# key-auth a déjà refusé toute autre apikey avant cette traduction.

set -eu

for var in SUPABASE_SECRET_KEY SUPABASE_PUBLISHABLE_KEY SERVICE_ROLE_KEY_ASYMMETRIC ANON_KEY_ASYMMETRIC TENGA_STACK; do
    eval "val=\${$var:-}"
    if [ -z "$val" ]; then
        echo "kong-entrypoint: variable $var absente, démarrage refusé" >&2
        exit 1
    fi
done

export LUA_AUTH_EXPR="\$((headers.authorization ~= nil and headers.authorization:sub(1, 10) ~= 'Bearer sb_' and headers.authorization) or (headers.apikey == '$SUPABASE_SECRET_KEY' and 'Bearer $SERVICE_ROLE_KEY_ASYMMETRIC') or (headers.apikey == '$SUPABASE_PUBLISHABLE_KEY' and 'Bearer $ANON_KEY_ASYMMETRIC'))"

# Substitution des variables dans la configuration déclarative. awk plutôt
# que eval/echo pour préserver les guillemets YAML.
awk '{
  result = ""
  rest = $0
  while (match(rest, /\$[A-Za-z_][A-Za-z_0-9]*/)) {
    varname = substr(rest, RSTART + 1, RLENGTH - 1)
    if (varname in ENVIRON) {
      result = result substr(rest, 1, RSTART - 1) ENVIRON[varname]
    } else {
      result = result substr(rest, 1, RSTART + RLENGTH - 1)
    }
    rest = substr(rest, RSTART + RLENGTH)
  }
  print result rest
}' /home/kong/temp.yml > "$KONG_DECLARATIVE_CONFIG"

exec /entrypoint.sh kong docker-start
