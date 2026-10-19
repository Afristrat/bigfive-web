#!/bin/sh
# Sauvegarde nocturne d'une pile Supabase de Tenga : dump logique `pg_dump -Fc` de la base
# `postgres` (donc les schémas auth, app, private et public, comptes d'utilisateurs compris),
# contrôlé, chiffré, tourné (une par jour sur 7 jours, une par tranche de 7 jours jusqu'à 34
# jours), copié hors du serveur. SOP-026.
#
#   sh sauvegarde.sh <tenga-sb|tenga-sb-preprod>
#
# Pourquoi `pg_dump -Fc` et non `pg_dumpall` : le dump SQL global du parc ne se restaure pas
# dans un cluster Supabase neuf (les schémas auth et storage pré-créés par l'image font
# échouer les COPY). Le format custom, restauré `--clean --if-exists` sous `supabase_admin`,
# redonne les données, la structure, les politiques RLS, les déclencheurs et les fonctions de
# la production (preuve rejouée chaque nuit par restauration-essai.sh). Deux choses n'y sont
# PAS, et sont donc sauvegardées à part : les rôles (`pg_dumpall --roles-only
# --no-role-passwords`, que les politiques RLS référencent) et les privilèges
# (generer-privileges.sql : sans eux la copie est plus permissive que la production, mesuré).
#
# Ce que le script garantit avant de dire `ok` :
#   1. un seul conteneur de base, sain, dont l'image est lue (jamais supposée) ;
#   2. le dump est stable (l'inventaire lu avant et après est identique) ;
#   3. `pg_restore --list` est non vide et nomme la donnée de chaque table inventoriée ;
#   4. le dump, les rôles et les privilèges sont chiffrés pour la clé publique du dépôt, dont
#      l'empreinte primaire est ÉPINGLÉE ci-dessous ; l'en-tête de chaque fichier chiffré nomme
#      la sous-clé de chiffrement et chaque chiffré est au moins aussi gros que son clair
#      (l'hôte ne peut PAS déchiffrer : la clé privée vit au coffre DPAPI du poste d'Amine) ;
#   5. la rotation est faite ;
#   6. la copie hors serveur est faite ET les empreintes des trois chiffrés sont relues à
#      distance.
# Tout échec écrit `last-status.json` avec une cause nommée et sort en code 1. Une
# interruption (signal, arrêt brutal du script) écrit `interrompu`. Le `ok` n'est écrit
# qu'à la toute fin. Une instance refusée parce qu'une autre tient le verrou ne touche à rien
# (ni verrou, ni journaux, ni statut), sauf si ce verrou a plus de 3 h (`verrou_trop_ancien`).
#
# Rétention (la date vient du NOM du fichier, jamais du mtime) :
#   - une sauvegarde par jour sur les 7 derniers jours (la plus récente du jour) ;
#   - la plus ANCIENNE de chaque tranche de 7 jours d'âge, tranches 1 à 4 (7 à 34 jours) ;
#   - en plus : les 2 plus récentes, et la dernière dont l'exercice de restauration est `ok`.
# Tout le reste est supprimé : la plus vieille sauvegarde a au plus 34 jours (< 35), sauf si
# les sauvegardes s'arrêtent (alors les 2 plus récentes et la dernière validée restent, et le
# statut porte `plus_vieille_jours`). C'est la garantie qu'un compte supprimé disparaît de
# toutes les sauvegardes sous 35 jours (plan § 5). Le clair (nécessaire à l'exercice du
# lendemain) n'est conservé que pour la sauvegarde la plus récente, en 0600, et
# restauration-essai.sh l'efface dès que l'exercice réussit.
#
# Copie hors serveur : miroir `rsync --delete-after`, donc dangereux par nature (un dossier
# local vidé par erreur viderait la copie). Garde-fous : `--max-delete=10`, refus du miroir si
# le local compte moins de .dump.gpg que le distant moins 2, `--timeout=600`. Le vrai filet
# est une rétention côté destination (instantanés ou sauvegarde du DGX-1 lui-même) : le miroir
# seul n'en tient pas lieu, et rien ici ne la configure.
#
# Variables (toutes facultatives) :
#   TENGA_BACKUP_DIR     dossier de travail (défaut /home/serveuria/<pile>-backups). En
#                        production, un dossier /data/backups/<pile> créé une fois par
#                        `sudo mkdir` + `chown serveuria` est lu par docker-watch.
#   TENGA_DRILL_DIR      dossier du statut de l'exercice (défaut <dossier>/drill), lu pour
#                        conserver la dernière sauvegarde validée.
#   TENGA_BACKUP_REMOTE  utilisateur@hôte de la copie hors serveur (défaut : celle du parc,
#                        lue dans ops/infra/backup-pg-all.sh)
#   TENGA_BACKUP_REMOTE_DIR  dossier distant (défaut serveuria-backups/<pile>)
#   TENGA_BACKUP_SSH_KEY clé SSH de cette copie (défaut ~/.ssh/hallab_backup, celle du parc)
#   TENGA_REGISTRE       registre des effacements à copier hors serveur s'il existe (défaut
#                        /home/serveuria/<pile>-effacements/registre.ndjson). Copie SANS
#                        suppression, dans <dossier distant>-effacements, hors du miroir.
#   TENGA_HORS_SITE=non  désactive explicitement la copie hors serveur : le statut est alors
#                        `ok_sans_hors_site` (docker-watch le signale), jamais `ok`.

set -u
umask 077

PILE="${1:-}"
case "$PILE" in
  tenga-sb | tenga-sb-preprod) ;;
  *) echo "usage : sauvegarde.sh <tenga-sb|tenga-sb-preprod>" >&2; exit 2 ;;
esac

# Empreinte PRIMAIRE de la clé publique de chiffrement (tenga-sauvegarde.pub.asc). Épinglée :
# remplacer le fichier public par une autre clé fait échouer la sauvegarde au lieu de
# chiffrer pour quelqu'un d'autre.
EMPREINTE_PRIMAIRE="9ABBCE4C30D69654C24BB1A39309ECF5908A8BEB"

ICI="$(cd "$(dirname "$0")" && pwd)"
CONT="$PILE-db"
RACINE="${TENGA_BACKUP_DIR:-/home/serveuria/$PILE-backups}"
DRILL="${TENGA_DRILL_DIR:-$RACINE/drill}"
PUB="$ICI/tenga-sauvegarde.pub.asc"
INVENTAIRE="$ICI/inventaire.sql"
GEN_PRIVILEGES="$ICI/generer-privileges.sql"
QUOTIDIENNES_JOURS=7
HEBDOMADAIRES=4
TAILLE_MIN=10000      # octets : un dump -Fc d'une base Supabase initialisée dépasse largement
DELAI_DUMP=3600       # secondes : pg_dump et pg_dumpall
MOTIF="db-$PILE-[0-9]*T*Z"   # ancré : tenga-sb ne voit jamais les fichiers de tenga-sb-preprod
DISTANT_DIR="${TENGA_BACKUP_REMOTE_DIR:-serveuria-backups/$PILE}"
REGISTRE="${TENGA_REGISTRE:-/home/serveuria/$PILE-effacements/registre.ndjson}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DEBUT="$(date +%s)"
FICHIER="$RACINE/db-$PILE-$TS.dump"
GLOBALS="$RACINE/db-$PILE-$TS.globals.sql"
PRIVILEGES="$RACINE/db-$PILE-$TS.privileges.sql"
STATUT="$RACINE/last-status.json"
JOURNAL="$RACINE/last-error.log"
VERROU="$RACINE/.verrou"
LISTE="$RACINE/.liste.$$"
AGES="$RACINE/.ages.$$"
HOME_GPG=""
FICHIER_FINAL=""
PROPRIO=0             # 1 seulement une fois le verrou acquis : une instance refusée ne nettoie rien
TERMINE=0
SHA_SCRIPT="$(sha256sum "$0" | cut -d' ' -f1)"
SHA_INVENTAIRE=""

command -v jq >/dev/null 2>&1 || { echo "ÉCHEC sauvegarde $PILE : jq absent de l'hôte" >&2; exit 1; }
mkdir -p "$RACINE" && chmod 700 "$RACINE" || { echo "ÉCHEC sauvegarde $PILE : $RACINE inaccessible (le créer une fois, propriétaire serveuria)" >&2; exit 1; }

ecrire_statut() { printf '%s\n' "$1" > "$STATUT.tmp" && mv -f "$STATUT.tmp" "$STATUT"; }

statut_echec() { # $1 = cause nommée
  ecrire_statut "$(jq -nc --arg pile "$PILE" --arg reason "$1" --arg file "$(basename "$FICHIER_FINAL")" --arg ts "$TS" --arg sh "$SHA_SCRIPT" \
    '{status:"failed",reason:$reason,pile:$pile,file:$file,local_ok:($file != "" and $file != "."),timestamp:$ts,sha256_script:$sh}')"
}

# Verrou, AVANT tout trap, tout journal et tout nettoyage : une instance refusée ne touche ni
# au verrou, ni aux journaux, ni aux fichiers de l'instance vivante. Un verrou orphelin
# (processus mort) est repris. Un verrou vivant de plus de 3 h est une panne : statut failed.
if ! mkdir "$VERROU" 2>/dev/null; then
  if [ -r "$VERROU/pid" ] && kill -0 "$(cat "$VERROU/pid")" 2>/dev/null; then
    if [ -n "$(find "$VERROU" -maxdepth 0 -mmin +180)" ]; then
      statut_echec verrou_trop_ancien
      echo "ÉCHEC sauvegarde $PILE : verrou_trop_ancien (pid $(cat "$VERROU/pid") depuis plus de 3 h)" >&2
    else
      echo "ÉCHEC sauvegarde $PILE : déjà en cours (pid $(cat "$VERROU/pid"))" >&2
    fi
    exit 1
  fi
  rm -rf "$VERROU"
  mkdir "$VERROU" 2>/dev/null || { echo "ÉCHEC sauvegarde $PILE : verrou repris par une autre instance" >&2; exit 1; }
fi
echo $$ > "$VERROU/pid"
PROPRIO=1

nettoyer() {
  [ "$PROPRIO" -eq 1 ] || return 0
  rm -f "$FICHIER.tmp" "$GLOBALS.tmp" "$PRIVILEGES.tmp" "$LISTE" "$AGES"
  [ -z "$HOME_GPG" ] || rm -rf "$HOME_GPG"
  rm -rf "$VERROU"
  [ "$TERMINE" -eq 1 ] || { statut_echec interrompu; echo "ÉCHEC sauvegarde $PILE : interrompu" >&2; }
}
trap nettoyer EXIT
trap 'exit 1' INT TERM HUP

echouer() { # cause nommée, statut écrit dans tous les cas, code 1
  TERMINE=1
  statut_echec "$1"
  echo "ÉCHEC sauvegarde $PILE : $1 (journal : $JOURNAL)" >&2
  exit 1
}

: > "$JOURNAL"
# Orphelins d'une exécution tuée net (kill -9, coupure) : temporaires, listes, trousseaux de
# plus de 60 minutes. Le verrou étant à nous, aucune instance vivante ne les utilise.
find "$RACINE" -maxdepth 1 \( -name '*.tmp' -o -name '.liste.*' -o -name '.ages.*' -o -name '.gpg.*' \) -mmin +60 -exec rm -rf {} + 2>>"$JOURNAL"

# 1. Exactement UN conteneur de base, sain. Deux correspondances signalent un déploiement en
# cours ou un dédoublement : sauvegarder « le premier » masquerait le problème.
CANDIDATS="$(docker ps --filter "name=^${CONT}\$" --format '{{.Names}} {{.Image}}')"
[ "$(printf '%s\n' "$CANDIDATS" | grep -c .)" -eq 1 ] || echouer conteneur_non_unique
IMAGE="${CANDIDATS#* }"
[ "$(docker inspect -f '{{.State.Health.Status}}' "$CONT" 2>/dev/null)" = healthy ] || echouer base_non_saine

[ -r "$INVENTAIRE" ] || echouer inventaire_sql_absent
[ -r "$PUB" ] || echouer cle_publique_absente
SHA_INVENTAIRE="$(sha256sum "$INVENTAIRE" | cut -d' ' -f1)"

# Clé de chiffrement : lue dans le fichier public du dépôt, dans un trousseau JETABLE
# (`--homedir`) : ni ~/.gnupg ni aucun autre état de l'hôte n'est touché. Une seule clé
# publique, d'empreinte primaire épinglée ; la sous-clé [e] valide est celle que l'en-tête de
# chaque fichier chiffré doit nommer.
HOME_GPG="$(mktemp -d "$RACINE/.gpg.XXXXXX")" || echouer trousseau_impossible
INFO_CLE="$(LC_ALL=C gpg --homedir "$HOME_GPG" --batch --show-keys --with-colons "$PUB" 2>>"$JOURNAL")"
[ "$(printf '%s\n' "$INFO_CLE" | grep -c '^pub:')" -eq 1 ] || echouer cle_publique_pas_unique
[ "$(printf '%s\n' "$INFO_CLE" | awk -F: '$1 == "fpr" { print $10; exit }')" = "$EMPREINTE_PRIMAIRE" ] || echouer cle_publique_empreinte_inattendue
SOUS_CLE="$(printf '%s\n' "$INFO_CLE" | awk -F: '$1 == "sub" && $2 !~ /[er]/ && $12 ~ /e/ { print $5; exit }')"
[ -n "$SOUS_CLE" ] || echouer cle_publique_sans_sous_cle_valide

psql_src() { docker exec -i "$CONT" psql -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1 "$@"; }
lire_inventaire() { psql_src -f - < "$INVENTAIRE"; }

# 2. Dump stable : l'inventaire (comptes de lignes, structure, séquences) est lu avant et
# après. S'il diffère, la base a bougé pendant la copie et la preuve serait fausse d'une
# ligne : on recommence (3 essais), sinon on échoue. Un pg_dump qui dépasse 1 h est tué.
STABLE=0
ESSAI=1
while [ "$ESSAI" -le 3 ]; do
  AVANT="$(lire_inventaire 2>>"$JOURNAL")" || echouer inventaire_illisible
  [ -n "$AVANT" ] || echouer inventaire_vide
  timeout "$DELAI_DUMP" docker exec "$CONT" pg_dump -U supabase_admin -Fc -d postgres > "$FICHIER.tmp" 2>>"$JOURNAL" \
    || { RC=$?; rm -f "$FICHIER.tmp"; [ "$RC" -eq 124 ] && echouer pg_dump_timeout; echouer pg_dump_echec; }
  APRES="$(lire_inventaire 2>>"$JOURNAL")" || echouer inventaire_illisible
  if [ "$AVANT" = "$APRES" ]; then STABLE=1; break; fi
  rm -f "$FICHIER.tmp"
  ESSAI=$((ESSAI + 1))
  [ "$ESSAI" -le 3 ] && sleep 20
done
[ "$STABLE" -eq 1 ] || echouer inventaire_instable_pendant_le_dump

TAILLE="$(stat -c%s "$FICHIER.tmp")"
[ "$TAILLE" -ge "$TAILLE_MIN" ] || { rm -f "$FICHIER.tmp"; echouer "dump_trop_petit_${TAILLE}"; }

# 3. Contrôle du dump : `pg_restore --list` lit la table des matières sans rien restaurer.
# Non vide, et la donnée de CHAQUE table inventoriée (schémas app, private, auth, public)
# y figure : un dump amputé d'un schéma ne passe pas.
docker exec -i "$CONT" pg_restore --list < "$FICHIER.tmp" > "$LISTE" 2>>"$JOURNAL" || echouer pg_restore_list_echec
ENTREES="$(grep -c -v '^;' "$LISTE" || true)"
[ "${ENTREES:-0}" -gt 0 ] || echouer dump_sans_entrees
MANQUANTES="$(printf '%s\n' "$AVANT" | sed -n 's/^T \([^.]*\)\.\(.*\)=[0-9]*$/\1 \2/p' \
  | while read -r s t; do grep -qF " TABLE DATA $s $t " "$LISTE" || printf '%s.%s ' "$s" "$t"; done)"
[ -z "$MANQUANTES" ] || { echo "tables absentes du dump : $MANQUANTES" >> "$JOURNAL"; echouer "table_absente_du_dump"; }

mv -f "$FICHIER.tmp" "$FICHIER" && chmod 600 "$FICHIER"
printf '%s\n' "$AVANT" > "$FICHIER.comptes" && chmod 600 "$FICHIER.comptes"
SHA_DUMP="$(sha256sum "$FICHIER" | cut -d' ' -f1)"
NB_INV="$(printf '%s\n' "$AVANT" | wc -l | tr -d ' ')"
jq -nc --arg pile "$PILE" --arg image "$IMAGE" --arg sha "$SHA_DUMP" --argjson taille "$TAILLE" --arg ts "$TS" --arg inv "$SHA_INVENTAIRE" \
  '{pile:$pile,image:$image,sha256:$sha,size_bytes:$taille,timestamp:$ts,sha256_inventaire_sql:$inv}' > "$FICHIER.meta"

# Rôles : sans mots de passe (les secrets des rôles de service viennent de l'initialisation
# de l'instance, pas de la sauvegarde). Ils sont rejoués avant la restauration dans le témoin.
timeout "$DELAI_DUMP" docker exec "$CONT" pg_dumpall -U supabase_admin --roles-only --no-role-passwords > "$GLOBALS.tmp" 2>>"$JOURNAL" \
  || { RC=$?; [ "$RC" -eq 124 ] && echouer pg_dumpall_timeout; echouer pg_dumpall_roles_echec; }
grep -q '^CREATE ROLE' "$GLOBALS.tmp" || echouer roles_vides
mv -f "$GLOBALS.tmp" "$GLOBALS" && chmod 600 "$GLOBALS"

# Privilèges : script SQL qui rétablit exactement ceux de la base (voir generer-privileges.sql :
# sans lui, un témoin restauré est plus permissif que la production). Rejoué après pg_restore.
[ -r "$GEN_PRIVILEGES" ] || echouer generateur_privileges_absent
docker exec -i "$CONT" psql -U supabase_admin -d postgres -At -v ON_ERROR_STOP=1 -f - < "$GEN_PRIVILEGES" > "$PRIVILEGES.tmp" 2>>"$JOURNAL" \
  || echouer generation_privileges_echec
grep -q "^REVOKE ALL ON SCHEMA" "$PRIVILEGES.tmp" || echouer privileges_vides
mv -f "$PRIVILEGES.tmp" "$PRIVILEGES" && chmod 600 "$PRIVILEGES"

# 4. Chiffrement avant tout transport : `auth.users` est une donnée personnelle (CNDP/RGPD) qui
# ne voyage ni ne dort en clair sur une seconde machine. Sans compression (le dump -Fc l'est
# déjà) : un chiffré plus petit que son clair est donc une troncature. L'en-tête du chiffré
# doit nommer la sous-clé attendue (sans clé secrète, gpg n'affiche que l'en-tête, code 2 : on
# lit la sortie, pas le code).
chiffrer() { # $1 = clair, $2 = fichier chiffré
  LC_ALL=C gpg --homedir "$HOME_GPG" --batch --yes --quiet --trust-model always --compress-algo none \
    --recipient-file "$PUB" --output "$2" --encrypt "$1" 2>>"$JOURNAL" || return 1
  [ -s "$2" ] || return 1
  chmod 600 "$2"
  [ "$(stat -c%s "$2")" -ge "$(stat -c%s "$1")" ] || { echo "chiffré plus petit que le clair : $2" >> "$JOURNAL"; return 1; }
  LC_ALL=C gpg --homedir "$HOME_GPG" --batch --list-packets "$2" 2>&1 | grep -q "keyid $SOUS_CLE"
}
chiffrer "$FICHIER" "$FICHIER.gpg" || echouer chiffrement_dump_echec
chiffrer "$GLOBALS" "$GLOBALS.gpg" || echouer chiffrement_roles_echec
chiffrer "$PRIVILEGES" "$PRIVILEGES.gpg" || echouer chiffrement_privileges_echec
SHA_GPG="$(sha256sum "$FICHIER.gpg" | cut -d' ' -f1)"
FICHIER_FINAL="$FICHIER.gpg"

# 5. Rotation. On construit la liste de ce qu'on GARDE, puis on supprime le reste : l'inverse fait
# disparaître un fichier à la première expression fausse. Âge en jours calendaires UTC lu dans
# le NOM (0 = aujourd'hui). Gardées : la plus récente de chaque jour d'âge < 7, la plus
# ANCIENNE de chaque tranche de 7 jours (1 à 4, soit 7 à 34 jours), les 2 plus récentes, et la
# dernière dont l'exercice de restauration est ok.
AUJOURDHUI="$(date -u -d "$(date -u +%Y%m%d)" +%s)"
find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump.gpg" -printf '%f\n' | sort -r | while IFS= read -r f; do
  jour="${f#db-"$PILE"-}"; jour="${jour%%T*}"
  epoque="$(date -u -d "$jour" +%s 2>/dev/null)" || continue
  printf '%s %s\n' "$(( (AUJOURDHUI - epoque) / 86400 ))" "$f"
done > "$AGES"
VALIDEE=""
if [ -r "$DRILL/last-status.json" ]; then
  VALIDEE="$(jq -r 'select(.status == "ok" and .source == "local") | .file // empty' "$DRILL/last-status.json" 2>/dev/null)"
  [ -z "$VALIDEE" ] || VALIDEE="$VALIDEE.gpg"
fi
A_GARDER="$({
  awk -v j="$QUOTIDIENNES_JOURS" '$1 < j && !vu[$1]++ { print $2 }' "$AGES"
  awk -v n="$HEBDOMADAIRES" '{ t = int($1 / 7) } t >= 1 && t <= n { d[t] = $2 } END { for (k in d) print d[k] }' "$AGES"
  head -2 "$AGES" | cut -d' ' -f2
  [ -z "$VALIDEE" ] || printf '%s\n' "$VALIDEE"
} | sort -u)"
[ -n "$A_GARDER" ] || echouer rotation_selection_vide
printf '%s\n' "$A_GARDER" | grep -qxF "$(basename "$FICHIER.gpg")" || echouer rotation_a_supprime_la_sauvegarde_du_jour
find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump.gpg" -printf '%f\n' | while IFS= read -r f; do
  printf '%s\n' "$A_GARDER" | grep -qxF "$f" && continue
  base="${f%.dump.gpg}"
  rm -f "$RACINE/$base.dump.gpg" "$RACINE/$base.dump" "$RACINE/$base.dump.comptes" "$RACINE/$base.dump.meta" \
        "$RACINE/$base.globals.sql" "$RACINE/$base.globals.sql.gpg" "$RACINE/$base.privileges.sql" "$RACINE/$base.privileges.sql.gpg"
done
# Orphelins : tout fichier d'une sauvegarde dont le chiffré du dump n'existe plus.
find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.*" -printf '%f\n' | while IFS= read -r f; do
  [ -f "$RACINE/${f%%.*}.dump.gpg" ] || rm -f "$RACINE/$f"
done
# Le clair (dump, rôles, privilèges) ne sert qu'à l'exercice du lendemain : seule la sauvegarde
# du jour le garde.
find "$RACINE" -maxdepth 1 -type f \( -name "$MOTIF.dump" -o -name "$MOTIF.globals.sql" -o -name "$MOTIF.privileges.sql" \) -printf '%f\n' \
  | while IFS= read -r f; do
      case "$f" in "db-$PILE-$TS".*) continue ;; esac
      rm -f "$RACINE/$f"
    done
[ -f "$FICHIER.gpg" ] && [ -f "$FICHIER" ] || echouer rotation_a_supprime_la_sauvegarde_du_jour
NB_GARDEES="$(find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump.gpg" | wc -l | tr -d ' ')"
PLUS_VIEILLE="$(find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump.gpg" -printf '%f\n' | while IFS= read -r f; do
  jour="${f#db-"$PILE"-}"; jour="${jour%%T*}"; e="$(date -u -d "$jour" +%s 2>/dev/null)" || continue
  echo $(( (AUJOURDHUI - e) / 86400 ))
done | sort -n | tail -1)"

# 6. Copie HORS SERVEUR, sur la machine qui reçoit déjà celles du parc (même clé, même
# destination que ops/infra/backup-pg-all.sh). Seuls les fichiers chiffrés, les comptes, les
# métadonnées et le statut partent : jamais le clair. Miroir : la rétention distante est celle
# de l'hôte (voir l'en-tête pour les garde-fous et leur limite).
HORS_SITE="desactive"
DESTINATION="aucune"
REGISTRE_ETAT="absent"
if [ "${TENGA_HORS_SITE:-oui}" != non ]; then
  REMOTE="${TENGA_BACKUP_REMOTE:-$(grep -o '^REMOTE=.*' "$HOME/ops/infra/backup-pg-all.sh" 2>/dev/null | cut -d= -f2- | tr -d '"')}"
  CLE_SSH="${TENGA_BACKUP_SSH_KEY:-$HOME/.ssh/hallab_backup}"
  [ -n "$REMOTE" ] || echouer aucune_destination_hors_site
  # utilisateur@hôte, sans espace ni tiret initial : la valeur passe à ssh et à rsync.
  printf '%s' "$REMOTE" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9.-]*$' || echouer destination_hors_site_invalide
  printf '%s' "$DISTANT_DIR" | grep -Eq '^[A-Za-z0-9_][A-Za-z0-9._/-]*$' || echouer dossier_distant_invalide
  [ -r "$CLE_SSH" ] || echouer cle_ssh_hors_site_illisible
  DESTINATION="$REMOTE:$DISTANT_DIR"
  SSH_OPTS="ssh -i $CLE_SSH -o BatchMode=yes -o ConnectTimeout=20 -o ServerAliveInterval=30 -o ServerAliveCountMax=4"
  $SSH_OPTS -- "$REMOTE" "mkdir -p $DISTANT_DIR && chmod 700 $DISTANT_DIR" 2>>"$JOURNAL" || echouer copie_hors_site_mkdir_echec
  # Garde du miroir : un local anormalement pauvre ne doit jamais vider la copie.
  NB_LOCAL="$(find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump.gpg" | wc -l | tr -d ' ')"
  NB_DISTANT="$($SSH_OPTS -- "$REMOTE" "find $DISTANT_DIR -maxdepth 1 -type f -name '$MOTIF.dump.gpg' | wc -l" 2>>"$JOURNAL" | tr -d ' ')"
  printf '%s' "$NB_DISTANT" | grep -Eq '^[0-9]+$' || echouer copie_hors_site_comptage_illisible
  [ "$NB_LOCAL" -ge $((NB_DISTANT - 2)) ] || { echo "miroir refusé : local $NB_LOCAL, distant $NB_DISTANT" >> "$JOURNAL"; echouer miroir_refuse_local_trop_petit; }
  rsync -a --delete-after --max-delete=10 --timeout=600 -e "$SSH_OPTS" \
    --include="$MOTIF.dump.gpg" --include="$MOTIF.globals.sql.gpg" --include="$MOTIF.privileges.sql.gpg" \
    --include="$MOTIF.dump.comptes" --include="$MOTIF.dump.meta" --exclude='*' \
    "$RACINE/" "$REMOTE:$DISTANT_DIR/" 2>>"$JOURNAL" || echouer copie_hors_site_rsync_echec
  # Les trois chiffrés du jour, relus à distance : mêmes empreintes que le local.
  TROIS="db-$PILE-$TS.dump.gpg db-$PILE-$TS.globals.sql.gpg db-$PILE-$TS.privileges.sql.gpg"
  LOCAL_SHA="$(cd "$RACINE" && sha256sum $TROIS)"
  DISTANT_SHA="$($SSH_OPTS -- "$REMOTE" "cd $DISTANT_DIR && sha256sum $TROIS" 2>>"$JOURNAL")"
  [ -n "$DISTANT_SHA" ] && [ "$DISTANT_SHA" = "$LOCAL_SHA" ] || echouer copie_hors_site_empreinte_divergente
  HORS_SITE="oui"
  # Registre des effacements (s'il existe) : copié à part, SANS suppression, hors du miroir.
  if [ -f "$REGISTRE" ]; then
    $SSH_OPTS -- "$REMOTE" "mkdir -p ${DISTANT_DIR}-effacements && chmod 700 ${DISTANT_DIR}-effacements" 2>>"$JOURNAL" || echouer copie_registre_mkdir_echec
    rsync -a --timeout=600 -e "$SSH_OPTS" "$REGISTRE" "$REMOTE:${DISTANT_DIR}-effacements/" 2>>"$JOURNAL" || echouer copie_registre_echec
    REG_LOCAL="$(sha256sum "$REGISTRE" | cut -d' ' -f1)"
    REG_DISTANT="$($SSH_OPTS -- "$REMOTE" "sha256sum ${DISTANT_DIR}-effacements/$(basename "$REGISTRE")" 2>>"$JOURNAL" | cut -d' ' -f1)"
    [ "$REG_LOCAL" = "$REG_DISTANT" ] || echouer copie_registre_empreinte_divergente
    REGISTRE_ETAT="copie"
  fi
elif [ -f "$REGISTRE" ]; then
  REGISTRE_ETAT="present_non_copie"
fi

# 7. Le `ok`, enfin : tout ce qui précède est réel. Le statut est ensuite recopié à distance
# (information pour qui lit la copie hors serveur ; la supervision lit le statut local).
# Sans copie hors serveur (désactivée à dessein), le statut n'est JAMAIS `ok`.
DUREE=$(( $(date +%s) - DEBUT ))
STATUT_FINAL="ok"
[ "$HORS_SITE" = oui ] || STATUT_FINAL="ok_sans_hors_site"
TERMINE=1
ecrire_statut "$(jq -nc --arg status "$STATUT_FINAL" --arg pile "$PILE" --arg file "$(basename "$FICHIER_FINAL")" --argjson taille "$TAILLE" \
  --arg sha "$SHA_DUMP" --arg shag "$SHA_GPG" --arg image "$IMAGE" --arg cle "$SOUS_CLE" --arg empreinte "$EMPREINTE_PRIMAIRE" --arg hs "$HORS_SITE" \
  --arg dest "$DESTINATION" --argjson duree "$DUREE" --arg ts "$TS" --arg sh "$SHA_SCRIPT" --arg inv "$SHA_INVENTAIRE" \
  --argjson lignes "$NB_INV" --argjson entrees "$ENTREES" --argjson gardees "$NB_GARDEES" --argjson vieille "${PLUS_VIEILLE:-0}" --arg registre "$REGISTRE_ETAT" \
  '{status:$status,pile:$pile,file:$file,size_bytes:$taille,sha256_dump:$sha,sha256_gpg:$shag,image:$image,
    chiffre_pour:$cle,empreinte_cle:$empreinte,entrees_toc:$entrees,lignes_inventaire:$lignes,hors_site:$hs,destination:$dest,
    sauvegardes_gardees:$gardees,plus_vieille_jours:$vieille,registre_effacements:$registre,
    duration_seconds:$duree,timestamp:$ts,sha256_script:$sh,sha256_inventaire_sql:$inv}')"
if [ "$HORS_SITE" = oui ]; then
  $SSH_OPTS -- "$REMOTE" "cat > $DISTANT_DIR/last-status.json" < "$STATUT" 2>>"$JOURNAL" || echo "AVERTISSEMENT : statut non recopié à distance" >&2
fi
echo "Sauvegarde ${STATUT_FINAL} : $(basename "$FICHIER_FINAL") ($TAILLE octets, ${DUREE}s, $NB_INV lignes d'inventaire, $NB_GARDEES gardées dont la plus vieille a ${PLUS_VIEILLE:-0} j, hors site : $HORS_SITE)"
