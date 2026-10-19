#!/bin/sh
# Restauration d'essai nocturne d'une pile Supabase de Tenga (SOP-026) : la sauvegarde la plus
# récente est restaurée dans un cluster TÉMOIN neuf de la même image que la base, sans réseau,
# plafonné, détruit dans tous les cas ; l'inventaire du témoin est comparé, caractère pour
# caractère, à celui écrit à l'instant du dump ; les tests SQL d'isolation peuvent être
# rejoués sur la copie. Divergence, sauvegarde périmée, témoin muet ou test en échec :
# statut `failed` avec une cause nommée, code 1.
#
#   sh restauration-essai.sh <tenga-sb|tenga-sb-preprod> [options]
#     --dump <fichier.dump>    restaure CE dump en clair au lieu du plus récent du dossier de
#                              travail. Les fichiers `<fichier>.comptes`, `<fichier>.meta`,
#                              `<base>.globals.sql` et `<base>.privileges.sql` (même préfixe,
#                              extension .globals.sql / .privileges.sql au lieu de .dump) doivent
#                              être à côté.
#     --source local|distant   étiquette du statut (défaut local). `distant` = exercice
#                              mensuel depuis la copie hors serveur : le poste d'Amine
#                              rapatrie les `.gpg`, les déchiffre avec la clé du coffre, dépose
#                              le clair dans un dossier 0700 de l'hôte, lance ce script avec
#                              `--dump ... --source distant`, puis efface le clair
#                              (procédure dans registre-effacements.md, § Exercice mensuel).
#     --effacer-apres          efface le clair (dump, rôles, privilèges) après un exercice réussi,
#                              pour le clair déposé par l'exercice mensuel. Pour le clair conservé
#                              par sauvegarde.sh (cas sans --dump), l'effacement est automatique
#                              sur réussite : plus aucun clair ne dort après l'exercice, donc un
#                              second lancement manuel exige une nouvelle sauvegarde. Sur échec,
#                              le clair reste pour l'enquête jusqu'à la sauvegarde suivante.
#     --tests-sql <script>     point d'accroche des tests SQL d'isolation, au contrat de
#                              `supabase/scripts/test-sql.sh` (`sh test-sql.sh <pile>`, conteneur
#                              pris dans TENGA_DB_CONTAINER). Le script est lancé APRÈS une
#                              comparaison réussie, avec `sh <script> <pile>` et les variables
#                              TENGA_DB_CONTAINER = TENGA_TEMOIN = nom du conteneur témoin
#                              (joignable par `docker exec -i "$TENGA_TEMOIN" psql -U
#                              supabase_admin -d postgres`) et TENGA_PILE. Les tests tournent donc
#                              sur la COPIE restaurée, jamais sur la base en service. Code 0 =
#                              tests verts. Sortie conservée dans `last-tests-sql.log`.
#                              Variable équivalente : TENGA_TESTS_SQL.
#
# Ce que ce script prouve et qu'un « fichier présent, statut ok » ne dit jamais : que la
# sauvegarde se restaure, que les données (auth comprise) y sont, que les politiques RLS, les
# déclencheurs et les fonctions y sont. Il refuse en outre de valider une sauvegarde périmée
# (plus de 26 h) : un cron mort en amont ne doit pas être masqué par un exercice vert.
#
# Déchiffrement : l'hôte ne détient PAS la clé privée. L'exercice quotidien restaure le clair
# conservé pour la dernière sauvegarde et vérifie que son jumeau `.gpg` est bien chiffré pour
# la clé du dépôt ; la preuve que le `.gpg` se déchiffre est l'exercice mensuel (--source
# distant), fait depuis le poste qui détient la clé.
#
# Variables facultatives : TENGA_BACKUP_DIR (dossier de la sauvegarde), TENGA_DRILL_DIR
# (dossier du statut de l'exercice, défaut <dossier de sauvegarde>/drill ; en production,
# /data/backups/<pile>-drill pour que docker-watch lise last-status.json), TENGA_AGE_MAX_H.

set -u
umask 077

PILE="${1:-}"
case "$PILE" in
  tenga-sb | tenga-sb-preprod) shift ;;
  *) echo "usage : restauration-essai.sh <tenga-sb|tenga-sb-preprod> [--dump F] [--source local|distant] [--tests-sql S] [--effacer-apres]" >&2; exit 2 ;;
esac
DUMP=""
EFFACER_APRES=0
DUMP_PAR_DEFAUT=0
SOURCE="local"
TESTS_SQL="${TENGA_TESTS_SQL:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --dump) DUMP="${2:-}"; [ $# -ge 2 ] && shift 2 || shift ;;
    --source) SOURCE="${2:-}"; [ $# -ge 2 ] && shift 2 || shift ;;
    --tests-sql) TESTS_SQL="${2:-}"; [ $# -ge 2 ] && shift 2 || shift ;;
    --effacer-apres) EFFACER_APRES=1; shift ;;
    *) echo "option inconnue : $1" >&2; exit 2 ;;
  esac
done
case "$SOURCE" in local | distant) ;; *) echo "source inconnue : $SOURCE" >&2; exit 2 ;; esac

ICI="$(cd "$(dirname "$0")" && pwd)"
CONT="$PILE-db"
RACINE="${TENGA_BACKUP_DIR:-/home/serveuria/$PILE-backups}"
DRILL="${TENGA_DRILL_DIR:-$RACINE/drill}"
INVENTAIRE="$ICI/inventaire.sql"
PUB="$ICI/tenga-sauvegarde.pub.asc"
AGE_MAX_H="${TENGA_AGE_MAX_H:-26}"
TEMOIN="tenga-restore-temoin-$PILE"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
DEBUT="$(date +%s)"
case "$SOURCE" in local) STATUT="$DRILL/last-status.json" ;; distant) STATUT="$DRILL/last-status-distant.json" ;; esac
JOURNAL="$DRILL/last-restore.log"
SHA_SCRIPT="$(sha256sum "$0" | cut -d' ' -f1)"
ATTENDU=""
OBTENU=""
AGE_H=0
TERMINE=0
HOME_GPG=""
PROPRIO=0      # 1 seulement une fois le verrou acquis : une instance refusée ne nettoie rien
MOTIF="db-$PILE-[0-9]*T*Z"   # ancré : tenga-sb ne voit jamais les fichiers de tenga-sb-preprod
# Empreinte PRIMAIRE de la clé publique de chiffrement, épinglée (la même que sauvegarde.sh).
EMPREINTE_PRIMAIRE="9ABBCE4C30D69654C24BB1A39309ECF5908A8BEB"

command -v jq >/dev/null 2>&1 || { echo "ÉCHEC restauration d'essai $PILE : jq absent de l'hôte" >&2; exit 1; }
mkdir -p "$DRILL" && chmod 700 "$DRILL" || { echo "ÉCHEC restauration d'essai $PILE : $DRILL inaccessible" >&2; exit 1; }

ecrire_statut() { printf '%s\n' "$1" > "$STATUT.tmp" && mv -f "$STATUT.tmp" "$STATUT"; }
statut_echec() { # $1 = cause nommée
  ecrire_statut "$(jq -nc --arg pile "$PILE" --arg source "$SOURCE" --arg reason "$1" --arg file "$(basename "${DUMP:-aucun}")" \
    --argjson age "${AGE_H:-0}" --arg ts "$TS" --arg sh "$SHA_SCRIPT" \
    '{status:"failed",reason:$reason,pile:$pile,source:$source,file:$file,age_bundle_heures:$age,timestamp:$ts,sha256_script:$sh}')"
}

# Verrou, AVANT tout trap, tout journal et tout nettoyage : une instance refusée ne touche ni
# au verrou, ni au journal, ni au témoin de l'instance vivante. Verrou orphelin (processus
# mort) : repris. Verrou vivant de plus de 3 h : panne, statut failed `verrou_trop_ancien`.
if ! mkdir "$DRILL/.verrou" 2>/dev/null; then
  if [ -r "$DRILL/.verrou/pid" ] && kill -0 "$(cat "$DRILL/.verrou/pid")" 2>/dev/null; then
    if [ -n "$(find "$DRILL/.verrou" -maxdepth 0 -mmin +180)" ]; then
      statut_echec verrou_trop_ancien
      echo "ÉCHEC restauration d'essai $PILE : verrou_trop_ancien (pid $(cat "$DRILL/.verrou/pid") depuis plus de 3 h)" >&2
    else
      echo "ÉCHEC restauration d'essai $PILE : déjà en cours (pid $(cat "$DRILL/.verrou/pid"))" >&2
    fi
    exit 1
  fi
  rm -rf "$DRILL/.verrou"
  mkdir "$DRILL/.verrou" 2>/dev/null || { echo "ÉCHEC restauration d'essai $PILE : verrou repris par une autre instance" >&2; exit 1; }
fi
echo $$ > "$DRILL/.verrou/pid"
PROPRIO=1

# Le témoin est détruit dans tous les cas (sortie normale, échec, signal). `-v` emporte aussi
# le volume anonyme que l'image déclare.
nettoyer() {
  [ "$PROPRIO" -eq 1 ] || return 0
  docker rm -f -v "$TEMOIN" >/dev/null 2>&1 || true
  [ -z "$HOME_GPG" ] || rm -rf "$HOME_GPG"
  rm -rf "$DRILL/.verrou"
  [ "$TERMINE" -eq 1 ] || { statut_echec interrompu; echo "ÉCHEC restauration d'essai $PILE : interrompu" >&2; }
}
trap nettoyer EXIT
trap 'exit 1' INT TERM HUP

echouer() {
  TERMINE=1
  statut_echec "$1"
  echo "ÉCHEC restauration d'essai $PILE ($SOURCE) : $1 (journal : $JOURNAL)" >&2
  exit 1
}

: > "$JOURNAL"
rm -f "$DRILL/last-diff.txt" "$DRILL/last-tests-sql.log"
# Orphelins d'une exécution tuée net : temporaires et trousseaux de plus de 60 minutes.
find "$DRILL" -maxdepth 1 \( -name '*.tmp' -o -name '.gpg.*' \) -mmin +60 -exec rm -rf {} + 2>>"$JOURNAL"

[ -r "$INVENTAIRE" ] || echouer inventaire_sql_absent

# 1. La sauvegarde à restaurer : celle qu'on désigne, sinon la plus récente en clair.
if [ -z "$DUMP" ]; then
  DUMP="$(find "$RACINE" -maxdepth 1 -type f -name "$MOTIF.dump" | sort | tail -1)"
  DUMP_PAR_DEFAUT=1
fi
{ [ -n "$DUMP" ] && [ -f "$DUMP" ]; } || echouer aucun_dump
[ -f "$DUMP.comptes" ] || echouer comptes_absents
[ -f "$DUMP.meta" ] || echouer meta_absente
BASE="${DUMP%.dump}"
[ -f "$BASE.globals.sql" ] || echouer roles_absents
[ -f "$BASE.privileges.sql" ] || echouer privileges_absents

# 2. Fraîcheur : l'âge se lit dans le NOM (db-<pile>-AAAAMMJJTHHMMSSZ.dump), jamais dans le mtime.
HORO="${DUMP##*/db-"$PILE"-}"; HORO="${HORO%.dump}"
printf '%s' "$HORO" | grep -Eq '^[0-9]{8}T[0-9]{6}Z$' || echouer nom_illisible
EPOQUE="$(date -u -d "$(printf '%s' "$HORO" | sed 's/^\(....\)\(..\)\(..\)T\(..\)\(..\)\(..\)Z$/\1-\2-\3 \4:\5:\6/')" +%s 2>/dev/null)" || echouer nom_illisible
AGE_H=$(( ( $(date +%s) - EPOQUE ) / 3600 ))
[ "$AGE_H" -le "$AGE_MAX_H" ] || echouer "dump_perime_${AGE_H}h"

# 3. Intégrité : l'empreinte écrite à la sauvegarde doit être celle du fichier d'aujourd'hui
# (une altération entre la nuit et l'exercice est une cause distincte d'une restauration
# défaillante).
SHA_ATTENDU="$(jq -r '.sha256 // empty' "$DUMP.meta" 2>/dev/null)"
[ -n "$SHA_ATTENDU" ] || echouer meta_illisible
[ "$(sha256sum "$DUMP" | cut -d' ' -f1)" = "$SHA_ATTENDU" ] || echouer empreinte_divergente

# 4. Le jumeau chiffré (exercice local) : présent et chiffré pour la sous-clé du dépôt. L'hôte
# ne peut pas le déchiffrer ; son en-tête, lui, se lit.
CHIFFRE="non_verifie"
if [ "$SOURCE" = local ]; then
  [ -s "$DUMP.gpg" ] || echouer jumeau_chiffre_absent
  HOME_GPG="$(mktemp -d "$DRILL/.gpg.XXXXXX")" || echouer trousseau_impossible
  INFO_CLE="$(LC_ALL=C gpg --homedir "$HOME_GPG" --batch --show-keys --with-colons "$PUB" 2>>"$JOURNAL")"
  [ "$(printf '%s\n' "$INFO_CLE" | grep -c '^pub:')" -eq 1 ] || echouer cle_publique_pas_unique
  [ "$(printf '%s\n' "$INFO_CLE" | awk -F: '$1 == "fpr" { print $10; exit }')" = "$EMPREINTE_PRIMAIRE" ] || echouer cle_publique_empreinte_inattendue
  SOUS_CLE="$(printf '%s\n' "$INFO_CLE" | awk -F: '$1 == "sub" && $2 !~ /[er]/ && $12 ~ /e/ { print $5; exit }')"
  [ -n "$SOUS_CLE" ] || echouer cle_publique_sans_sous_cle_valide
  LC_ALL=C gpg --homedir "$HOME_GPG" --batch --list-packets "$DUMP.gpg" 2>&1 | grep -q "keyid $SOUS_CLE" || echouer jumeau_chiffre_pour_une_autre_cle
  [ -s "$BASE.globals.sql.gpg" ] || echouer roles_chiffres_absents
  [ -s "$BASE.privileges.sql.gpg" ] || echouer privileges_chiffres_absents
  CHIFFRE="oui"
fi

ATTENDU="$(cat "$DUMP.comptes")"
[ -n "$ATTENDU" ] || echouer comptes_vides

# 5. Le témoin : même image que la base en service (sinon celle écrite dans les métadonnées).
IMAGE="$(docker inspect -f '{{.Config.Image}}' "$CONT" 2>/dev/null || true)"
[ -n "$IMAGE" ] || IMAGE="$(jq -r '.image // empty' "$DUMP.meta")"
[ -n "$IMAGE" ] || echouer image_introuvable
docker rm -f -v "$TEMOIN" >/dev/null 2>&1 || true
MDP="verif-$(date +%s)-$$-$(od -An -N6 -tx1 /dev/urandom | tr -d ' \n')"
# Le mot de passe passe par l'environnement, jamais par la ligne de commande. Témoin sans
# privilège superflu : toutes les capacités retirées sauf les cinq que l'entrypoint de l'image
# exige pour passer de root à postgres (chown du répertoire de données, setuid/setgid).
POSTGRES_PASSWORD="$MDP" docker run -d --name "$TEMOIN" --network none --memory 768m --memory-swap 768m --pids-limit 256 \
  --cap-drop ALL --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER --cap-add SETUID --cap-add SETGID \
  --security-opt no-new-privileges -e POSTGRES_PASSWORD "$IMAGE" >/dev/null 2>>"$JOURNAL" || echouer temoin_non_demarre
# L'entrypoint de l'image démarre un serveur TEMPORAIRE pour son initialisation puis le
# redémarre : `pg_isready` répond déjà pendant le premier, et une restauration lancée à cet
# instant meurt avec lui. Trois réponses consécutives, deux secondes d'écart.
STABLE=0
for _ in $(seq 1 90); do
  if docker exec "$TEMOIN" pg_isready -U postgres -q 2>/dev/null; then STABLE=$((STABLE + 1)); else STABLE=0; fi
  [ "$STABLE" -ge 3 ] && break
  sleep 2
done
[ "$STABLE" -ge 3 ] || echouer temoin_injoignable

docker cp "$DUMP" "$TEMOIN":/tmp/a-verifier.dump 2>>"$JOURNAL" || echouer copie_impossible
docker cp "$BASE.globals.sql" "$TEMOIN":/tmp/roles.sql 2>>"$JOURNAL" || echouer copie_roles_impossible
docker cp "$BASE.privileges.sql" "$TEMOIN":/tmp/privileges.sql 2>>"$JOURNAL" || echouer copie_privileges_impossible
PSQL_T() { PGPASSWORD="$MDP" docker exec -i -e PGPASSWORD "$TEMOIN" psql -U supabase_admin -h localhost -d postgres "$@"; }

# 6. Rôles d'abord (les politiques RLS y font référence), puis les données. Les rôles de
# l'image existent déjà : « role already exists » est attendu et ignoré (journalisé).
PSQL_T -q -f /tmp/roles.sql >> "$JOURNAL" 2>&1 || true
# Seule erreur attendue : « role already exists ». Mesuré le 2026-10-19 sur l'image
# supabase/postgres:17.6.1.136 : pg_restore --clean --if-exists ne produit AUCUNE erreur (celles
# sur le schéma storage et la clé de auth.users, vues avec l'image 15.8, n'existent plus).
# Toute autre erreur est donc comptée et fait échouer.
PGPASSWORD="$MDP" docker exec -e PGPASSWORD "$TEMOIN" pg_restore -U supabase_admin -h localhost -d postgres \
  --clean --if-exists /tmp/a-verifier.dump >> "$JOURNAL" 2>&1 || true
# Privilèges rétablis APRÈS les données (generer-privileges.sql) : pg_restore ne les rend pas
# tous, et sans eux la copie est plus permissive que la production.
PSQL_T -q -v ON_ERROR_STOP=1 -1 -f /tmp/privileges.sql >> "$JOURNAL" 2>&1 || echouer privileges_non_rejoues
ERREURS_INATTENDUES="$(grep -i 'error' "$JOURNAL" | grep -v -e 'role ".*" already exists' \
  -e 'errors ignored on restore' | wc -l | tr -d ' ')"

# 7. L'inventaire du témoin contre celui écrit à l'instant du dump. Même requête, mot pour mot.
OBTENU="$(PSQL_T -At -v ON_ERROR_STOP=1 -f - < "$INVENTAIRE" 2>>"$JOURNAL")" || echouer inventaire_illisible
[ -n "$OBTENU" ] || echouer inventaire_vide
if [ "$OBTENU" != "$ATTENDU" ]; then
  diff "$DUMP.comptes" - > "$DRILL/last-diff.txt" 2>&1 <<EOF
$OBTENU
EOF
  grep '^[<>]' "$DRILL/last-diff.txt" | head -10 >&2
  echouer "comptes_divergents_$(grep -c '^[<>]' "$DRILL/last-diff.txt")_lignes"
fi
[ "$ERREURS_INATTENDUES" -eq 0 ] || echouer "erreurs_inattendues_${ERREURS_INATTENDUES}"

# 8. Tests SQL d'isolation rejoués sur la copie, si demandés.
TESTS="non_demandes"
if [ -n "$TESTS_SQL" ]; then
  [ -r "$TESTS_SQL" ] || echouer tests_sql_introuvables
  if TENGA_DB_CONTAINER="$TEMOIN" TENGA_TEMOIN="$TEMOIN" TENGA_PILE="$PILE" sh "$TESTS_SQL" "$PILE" > "$DRILL/last-tests-sql.log" 2>&1; then
    TESTS="ok"
  else
    tail -20 "$DRILL/last-tests-sql.log" >&2
    echouer tests_sql_echec
  fi
fi

compte() { printf '%s\n' "$OBTENU" | grep -c "^$1 " || true; }
LIGNES="$(printf '%s\n' "$OBTENU" | sed -n 's/^T [^=]*=//p' | awk '{ s += $1 } END { print s + 0 }')"
DUREE=$(( $(date +%s) - DEBUT ))
# Le clair ne dort pas : sur réussite, on l'efface (dump, rôles, privilèges) quand c'est le clair
# conservé par la sauvegarde, ou quand --effacer-apres le demande. Les comptes et les
# métadonnées restent (ils ne contiennent aucune donnée de personne). Sur échec, le clair reste
# pour l'enquête et la sauvegarde suivante l'efface.
EFFACE="non"
if [ "$EFFACER_APRES" -eq 1 ] || [ "$DUMP_PAR_DEFAUT" -eq 1 ]; then
  rm -f "$DUMP" "$BASE.globals.sql" "$BASE.privileges.sql"
  { [ ! -e "$DUMP" ] && [ ! -e "$BASE.globals.sql" ] && [ ! -e "$BASE.privileges.sql" ]; } && EFFACE="oui"
fi
TERMINE=1
ecrire_statut "$(jq -nc --arg pile "$PILE" --arg source "$SOURCE" --arg file "$(basename "$DUMP")" --arg image "$IMAGE" \
  --argjson age "$AGE_H" --argjson tables "$(compte T)" --argjson lignes "$LIGNES" --argjson politiques "$(compte P)" \
  --argjson declencheurs "$(compte G)" --argjson fonctions "$(compte F)" --argjson inventaire "$(printf '%s\n' "$OBTENU" | wc -l | tr -d ' ')" \
  --arg chiffre "$CHIFFRE" --arg efface "$EFFACE" --arg empreinte "$EMPREINTE_PRIMAIRE" --arg tests "$TESTS" --argjson duree "$DUREE" --arg ts "$TS" --arg sh "$SHA_SCRIPT" \
  '{status:"ok",pile:$pile,source:$source,file:$file,image:$image,age_bundle_heures:$age,tables_comparees:$tables,
    lignes_comparees:$lignes,politiques:$politiques,declencheurs:$declencheurs,fonctions:$fonctions,
    lignes_inventaire_identiques:$inventaire,jumeau_chiffre:$chiffre,clair_efface:$efface,empreinte_cle:$empreinte,tests_sql:$tests,duration_seconds:$duree,
    timestamp:$ts,sha256_script:$sh}')"
echo "Restauration d'essai OK ($SOURCE) : $(basename "$DUMP") restauré dans un cluster neuf, $(compte T) tables, $LIGNES lignes, $(compte P) politiques, $(compte G) déclencheurs, $(compte F) fonctions identiques, dump de ${AGE_H} h, tests SQL : $TESTS, clair effacé : $EFFACE"
