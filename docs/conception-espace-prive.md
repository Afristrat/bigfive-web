# Conception : espace privé multi-organisations de Tenga Assessments

Version 2 du document, 19 octobre 2026. Statut : les 5 décisions sont prises par Amine (§ 9) ; lot 1 en cours d'écriture.

## 1. Ce qui change

Aujourd'hui, le test est ouvert à tous et sans compte. N'importe qui passe le test, et n'importe quelle personne qui détient le lien d'un résultat peut le lire. La comparaison repose sur des identifiants que l'on se transmet à la main.

Cible : un service privé opéré par Tenga Conseil, où :
- chaque **organisation cliente** dispose de son propre espace, étanche aux autres ;
- chaque **participant** retrouve ses propres résultats après connexion, et seulement les siens ;
- les responsables d'une organisation comparent des **groupes** de personnes de cette organisation (équipe, service, promotion), sous forme d'agrégats uniquement ;
- Tenga Conseil administre les organisations, les campagnes et ses consultants.

## 2. Rôles

| Rôle | Qui | Peut |
|---|---|---|
| Administrateur Tenga | Associés et équipe Tenga Conseil | Créer des organisations, nommer leurs responsables, affecter des consultants, voir le journal d'audit global |
| Consultant Tenga | Consultant affecté à une organisation | Voir les résultats et comparaisons des organisations qui lui sont affectées, préparer les restitutions |
| Responsable d'organisation | RH ou direction du client | Créer des campagnes, inviter des participants, constituer des groupes, voir les comparaisons de groupe (agrégats) et le statut de participation de chacun ; **jamais** un résultat individuel |
| Participant | Collaborateur ou candidat invité | Passer le test, revoir ses résultats, demander la suppression de ses données |

Une même personne peut appartenir à plusieurs organisations, avec un rôle différent dans chacune.

## 3. Parcours

1. **Création** : un administrateur Tenga crée l'organisation (nom, identifiant d'URL, logo facultatif) et désigne un ou plusieurs responsables.
2. **Campagne** : le responsable crée une campagne (titre, langue par défaut, date de clôture, groupe cible), puis importe une liste d'adresses e-mail ou génère un lien d'invitation.
3. **Invitation** : chaque participant reçoit un e-mail, envoyé par Resend, avec un lien personnel à usage unique.
4. **Connexion sans mot de passe** : le lien ouvre une session. Pour les connexions suivantes, le participant saisit son adresse et reçoit un nouveau lien. Il n'y a aucun mot de passe à stocker ni à réinitialiser.
5. **Information** : avant le test, le participant lit une notice courte (finalité, destinataires, durée de conservation). Son résultat individuel n'est visible que par lui, par le consultant Tenga affecté et par les administrateurs Tenga ; son organisation ne voit que des agrégats.
6. **Passation** : le questionnaire est identique à l'actuel (120 questions, version adaptée au Maroc), avec sauvegarde de la progression sur le serveur. Une coupure ou un redéploiement ne fait plus rien perdre, et la passation peut se reprendre sur un autre appareil.
7. **Résultat** : visible uniquement par le participant connecté et par les personnes autorisées. Il n'existe plus de lien public par identifiant.
8. **Comparaison** : le responsable ou le consultant choisit un groupe et voit la moyenne et la dispersion par dimension et par facette ; seul le consultant voit en plus la position de chaque participant.
9. **Restitution** : le consultant produit une synthèse (individuelle ou d'équipe) exportable en PDF au nom de Tenga Conseil.

## 4. Adresses du site (réponse à la question sur `/test`)

Non, `/test` n'est pas obligatoire : c'est un héritage du projet d'origine. Next.js et next-intl permettent des chemins traduits par langue. Proposition :

| Usage | Français | Arabe | Anglais |
|---|---|---|---|
| Passation | `/fr/questionnaire` | `/ar/questionnaire` | `/en/assessment` |
| Mes résultats | `/fr/mes-resultats` | `/ar/my-results` | `/en/my-results` |
| Espace organisation | `/fr/o/{organisation}` | `/ar/o/{organisation}` | `/en/o/{organisation}` |
| Comparaison de groupe | `/fr/o/{organisation}/groupes/{groupe}` | idem | idem |
| Invitation | `/i/{jeton}` (sans langue, redirige vers la langue de la campagne) | | |
| Connexion | `/fr/connexion` | `/ar/login` | `/en/login` |

Pour l'arabe, je propose de garder des chemins en caractères latins : une URL en caractères arabes s'affiche encodée (`%D8%A7…`) dès qu'on la copie dans un e-mail ou un document. Les anciens chemins (`/test`, `/result/…`) redirigent vers les nouveaux.

## 5. Données (MongoDB, base `tenga` existante)

| Collection | Contenu principal | Clés et index |
|---|---|---|
| `organizations` | nom, identifiant d'URL, statut, consultants affectés | identifiant d'URL unique |
| `users` | e-mail (unique, en minuscules), nom, langue préférée | e-mail unique |
| `memberships` | utilisateur, organisation, rôle | couple (utilisateur, organisation) unique |
| `groups` | organisation, nom, membres | organisation |
| `campaigns` | organisation, titre, groupe, dates, langue | organisation |
| `invitations` | campagne, e-mail, jeton haché, expiration, utilisation | jeton haché unique, expiration (index TTL) |
| `sessions` | utilisateur, jeton haché, expiration | expiration (index TTL) |
| `attempts` | passation en cours : réponses, page courante | (utilisateur, campagne) unique |
| `results` | utilisateur, organisation, campagne, réponses, version du questionnaire, date | organisation, utilisateur |
| `audit_log` | qui, quoi, quand, sur quelle ressource | date, organisation |

**Règle d'isolation** : toute lecture ou écriture passe par une seule fonction serveur, qui vérifie la session, l'appartenance à l'organisation et le rôle, puis ajoute le filtre `organizationId` à la requête. Aucune page ni action n'interroge la base sans elle. Des tests automatisés prouvent qu'un responsable de l'organisation A ne peut lire aucune donnée de l'organisation B, même en forgeant les identifiants.

Les jetons d'invitation et de session ne sont stockés que hachés, comme des mots de passe : une fuite de la base ne permet pas d'usurper une session.

## 6. Authentification : recommandation

| Option | Avantages | Inconvénients |
|---|---|---|
| **A. Auth.js (NextAuth v5), lien magique par e-mail via Resend, adaptateur MongoDB** | Reste dans la pile actuelle (Next.js et MongoDB), sans nouveau service à héberger, et Resend est déjà configuré | Rôles et organisations à coder nous-mêmes (prévu de toute façon) |
| B. Supabase (pile par défaut d'AI-MPower) | Authentification et sécurité au niveau des lignes clés en main | Migration de MongoDB vers Postgres, une instance Supabase de plus à exploiter, réécriture de la couche données |
| C. Authentification maison | Contrôle total | Surface de sécurité à maintenir seuls : à écarter |

**Recommandation : option A.** Elle livre le même résultat avec le moins de changements, sur une base déjà en place et testée.

## 7. Confidentialité et conformité

- **Lien de subordination** : un salarié peut difficilement refuser un test demandé par son employeur. D'où la règle retenue : l'employeur ne voit jamais un résultat individuel, seulement des agrégats ; le consultant Tenga, tiers de confiance, fait la restitution.
- **Seuil d'anonymat** : un agrégat n'est affiché que pour un groupe d'au moins 5 résultats (seuil réglable), pour éviter qu'une moyenne révèle une personne.
- **Droits** : depuis son espace, le participant télécharge ses données et peut demander leur suppression ; le responsable de l'organisation en est informé.
- **Conservation** (décision 4, valeurs par défaut réglables par variable d'environnement) : résultats 3 ans, invitations 14 jours, sessions 30 jours d'inactivité, journal des consultations 1 an, comptes de participants sans résultat 1 an sans connexion. Appliquées automatiquement (index TTL et purge quotidienne).
- **Journal d'audit** : il trace chaque consultation d'un résultat individuel par une autre personne que son propriétaire.
- Le brouillon de politique de confidentialité sera mis à jour en conséquence. La déclaration auprès de la CNDP reste un préalable à l'ouverture aux clients.

## 8. Livraison par lots, chacun déployé et vérifié sur tenga.ai-mpower.com

1. **Socle** : connexion par lien magique, comptes, organisations, rôles, journal d'audit, administration Tenga minimale ; fermeture des liens publics de résultat.
2. **Campagnes et invitations** : création, import des adresses, e-mails Resend, passation rattachée à la campagne, sauvegarde de la progression sur le serveur, notice d'information.
3. **Mes résultats** : historique du participant, gestion du partage, export et suppression.
4. **Groupes et comparaisons** : constitution des groupes, agrégats avec seuil d'anonymat, vue individuelle réservée au consultant.
5. **Chemins traduits** et redirections des anciennes adresses.
6. **Restitution** : synthèse managériale et export PDF au nom de Tenga Conseil.

Chaque lot est livré avec ses tests Playwright sur les parcours critiques, dont l'étanchéité entre organisations, plus une vérification manuelle sur le site déployé.

## 9. Décisions d'Amine

1. Authentification : **option A**, lien magique par e-mail via Resend et MongoDB, réalisée avec **Better Auth 1.x stable** (Auth.js v5 n'est encore publié qu'en bêta, `5.0.0-beta.32`, vérifié le 19/10/2026).
2. Résultat individuel : **jamais visible par le responsable d'organisation** ; seulement par le participant, le consultant Tenga affecté et les administrateurs Tenga.
3. Accès : **aucun test sans compte** ; test uniquement sur invitation personnelle (prénom, organisation, personne qui invite, message, langue), valable 14 jours ; inscription libre fermée.
4. Conservation : durées du § 7, appliquées par défaut et réglables.
5. Noms des chemins du § 4 : **validés** (lot 5). Domaine : `tenga.ai-mpower.com` en attendant que Tenga Conseil dispose de son propre nom de domaine.
