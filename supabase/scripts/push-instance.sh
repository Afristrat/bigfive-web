#!/bin/sh
# Pousse le compose versionné vers le dossier de l'instance sur serveuria et
# (re)crée les conteneurs. Rien ne s'exécute sur le poste : il ne sert qu'à
# transférer les fichiers par SSH.
#
#   sh supabase/scripts/push-instance.sh <tenga-sb|tenga-sb-preprod> <SITE_URL>
#
# Au premier passage, le .env est créé sur le serveur par init-env.sh.
# Ensuite, verify-instance.sh contrôle plafonds, ports et santé.

set -eu

stack=${1:?tenga-sb ou tenga-sb-preprod}
site_url=${2:?SITE_URL}
here=$(cd "$(dirname "$0")/.." && pwd)
host=${TENGA_SSH_HOST:-serveuria@192.168.100.24}
key=${TENGA_SSH_KEY:-$HOME/.ssh/serveurai_mnemo}
remote="/home/serveuria/$stack"

ssh_run() { ssh -i "$key" -o BatchMode=yes "$host" "$@"; }

[ "$(ssh_run hostname)" = "serveuria-MS-7D98" ] || { echo "push-instance: hôte inattendu" >&2; exit 1; }

ssh_run "mkdir -p $remote/db $remote/scripts $remote/volumes/db/data"
tar -C "$here" -cf - compose/docker-compose.yml compose/kong.yml compose/kong-entrypoint.sh compose/db/roles.sql compose/db/schemas.sql \
    scripts/init-env.sh scripts/verify-instance.sh \
    | ssh_run "tar -xf - -C $remote --transform 's,^compose/,,'"

ssh_run "cd $remote && [ -e .env ] || sh scripts/init-env.sh $remote $stack $site_url"
ssh_run "cd $remote && docker compose config --quiet && docker compose up -d --remove-orphans"
# Jamais de verdict pendant la recréation (SOP-028 § 9) : attendre que les
# quatre conteneurs soient sains, trois minutes au plus.
ssh_run "for i in \$(seq 1 36); do
    n=\$(for c in db auth rest kong; do docker inspect -f '{{.State.Health.Status}}' $stack-\$c; done | grep -c '^healthy\$')
    [ \"\$n\" -eq 4 ] && exit 0; sleep 5
done; echo 'push-instance: conteneurs non sains après 3 min' >&2; exit 1"
ssh_run "sh $remote/scripts/verify-instance.sh $stack"
