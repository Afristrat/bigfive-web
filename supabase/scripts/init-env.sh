#!/bin/sh
# Crée le .env d'une instance Supabase de Tenga, sur le serveur uniquement.
#
#   sh init-env.sh <dossier> <tenga-sb|tenga-sb-preprod> <SITE_URL>
#
# Génère tous les secrets sur place (aucune valeur ne transite par le poste ni
# par le transcript) et n'affiche que des noms, longueurs et empreintes :
# - mot de passe Postgres ;
# - paire EC P-256 : JWT_KEYS (privée, pour GoTrue) et JWT_JWKS (publique seule,
#   pour PostgREST), SANS clé oct HS256, contrairement au script officiel
#   add-new-auth-keys.sh (SOP-028 : aucune clé héritée dès la naissance) ;
# - jetons internes ES256 anon et service_role, que seul Kong présente ;
# - clés opaques sb_publishable_ et sb_secret_ ;
# - JWT_SECRET, exigé au démarrage par GoTrue mais lu par aucun autre
#   composant ; la certification prouve qu'il n'ouvre rien.
# Refuse d'écraser un .env existant : une régénération est une rotation
# (SOP-001, SOP-028), jamais un effet de bord.

set -eu

dir=${1:?dossier}
stack=${2:?tenga-sb ou tenga-sb-preprod}
site_url=${3:?SITE_URL}

case "$stack" in
    tenga-sb|tenga-sb-preprod) ;;
    *) echo "init-env: pile inconnue « $stack »" >&2; exit 1 ;;
esac

env_file="$dir/.env"
if [ -e "$env_file" ]; then
    echo "init-env: $env_file existe déjà, refus d'écraser (rotation = SOP-001)" >&2
    exit 1
fi

umask 077
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

node -e '
const crypto = require("crypto");
const { privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = privateKey.export({ format: "jwk" });
const kid = crypto.randomUUID();
const priv = { kty: "EC", kid, use: "sig", key_ops: ["sign", "verify"], alg: "ES256", ext: true,
               crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d };
const pub = { kty: "EC", kid, use: "sig", key_ops: ["verify"], alg: "ES256", ext: true,
              crv: jwk.crv, x: jwk.x, y: jwk.y };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function es256(payload) {
  const data = b64({ alg: "ES256", typ: "JWT", kid }) + "." + b64(payload);
  const sig = crypto.sign("SHA256", Buffer.from(data), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return data + "." + sig.toString("base64url");
}
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 5 * 365 * 24 * 3600;
function opaque(prefix) {
  const body = prefix + crypto.randomBytes(17).toString("base64url").slice(0, 22);
  const sum = crypto.createHash("sha256").update("supabase-self-hosted|" + body).digest("base64url").slice(0, 8);
  return body + "_" + sum;
}
const out = {
  POSTGRES_PASSWORD: crypto.randomBytes(32).toString("hex"),
  JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  JWT_KEYS: JSON.stringify([priv]),
  JWT_JWKS: JSON.stringify({ keys: [pub] }),
  ANON_KEY_ASYMMETRIC: es256({ role: "anon", iss: "supabase", iat, exp }),
  SERVICE_ROLE_KEY_ASYMMETRIC: es256({ role: "service_role", iss: "supabase", iat, exp }),
  SUPABASE_PUBLISHABLE_KEY: opaque("sb_publishable_"),
  SUPABASE_SECRET_KEY: opaque("sb_secret_"),
};
for (const [k, v] of Object.entries(out)) console.log(k + "=\x27" + v + "\x27");
' > "$tmp"

{
    echo "# Généré par supabase/scripts/init-env.sh le $(date -u +%Y-%m-%dT%H:%M:%SZ). Ne jamais afficher."
    echo "TENGA_STACK=$stack"
    echo "SITE_URL=$site_url"
    echo "API_EXTERNAL_URL=http://$stack-gw:8000"
    cat "$tmp"
} > "$env_file"
chmod 600 "$env_file"

echo "init-env: $env_file créé (mode $(stat -c %a "$env_file"))"
grep -oE '^[A-Z_]+=' "$env_file" | tr -d '=' | while read -r name; do
    value=$(grep "^$name=" "$env_file" | cut -d= -f2- | sed "s/^'//; s/'\$//")
    printf '  %-28s longueur=%-4s empreinte=%s\n' "$name" "${#value}" "$(printf %s "$value" | sha256sum | cut -c1-12)"
done
