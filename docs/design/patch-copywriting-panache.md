# Patch de copywriting : panachage recommandé (NON APPLIQUÉ)

20 octobre 2026. **Rien de ce document n'est appliqué.** Aucun fichier du dépôt (`web/src/messages/fr.js`, `en.js`, `ar.js`, `web/src/lib/login-mail.ts`) n'a été modifié. Ce patch liste, clé par clé, l'ancienne valeur, la nouvelle valeur proposée et la dépendance à un lot. **Le client valide texte par texte** ; une valeur non validée ne s'applique pas.

Source des textes : `docs/design/propositions-copywriting.md`, recommandation 2.5 (panachage) et 1.3 (promesses). Rattachement aux preuves : `docs/design/dossier-preuves.md` (fiches P) et section 3.1 du fichier de copywriting (R1 à R12, écarts au dossier).

## Le panachage retenu par la recommandation

| Surface | Texte | Origine |
|---|---|---|
| Accueil, titre, sous-titre, bouton, blocs | Promesse commerciale PR2 : « Des décisions d'équipe fondées sur des repères, pas sur des impressions » (angle C) | 2.3 et 1.3 |
| Accueil, bas de page | Preuve (angle A) | 2.1 |
| E-mails et pages vues par la personne invitée | Promesse d'usage PR1 : « Un langage commun pour travailler ensemble » (angle B) | 2.2 et 1.3 |
| Signature | PR3 : « Comprendre avant de juger. » | 1.3 |

## Marqueurs et lots

Les numéros de lot sont ceux de `docs/plan-implementation-espace-prive.md` § 6 (relus le 20/10/2026).

| Lot | Contenu qui rend une phrase vraie |
|---|---|
| Lot 1 | Profils, rôles, journal, cloisonnement : le résultat individuel n'est visible que de la personne, du consultant affecté et de l'administration Tenga |
| Lot 2 | Campagnes, invitations personnalisées, progression enregistrée sur le serveur (reprise sur un autre appareil), notice d'information |
| Lot 3 | Mes résultats : export de ses données, suppression de compte |
| Lot 4 | Groupes et agrégats (synthèses de groupe, seuil minimal), vue individuelle du consultant journalisée |
| Lot 6 | Restitution PDF |

- **[Activation : lot N]** : la phrase n'est vraie qu'à partir de ce lot. **NE PAS PUBLIER AVANT LE LOT N.** Quand une phrase dépend de plusieurs lots, tous sont listés ; elle ne se publie qu'au dernier.
- **[Preuve : …]** : fiche P ou référence R qui soutient la phrase, avec l'écart au dossier s'il en reste un. **[Sans fiche]** : le dossier de preuves n'a rien ; la phrase n'est pas démontrée.
- Typographie à l'application : espaces insécables (U+00A0) avant `:` `;` `?` `!` et dans les guillemets français, apostrophes typographiques `’` dans `fr.js` (convention du fichier). Les textes ci-dessous sont donnés en espaces ordinaires.
- Les variables entre accolades ({organisation}, {prénom}, {lien}, {email_contact}, {durée_de_validité}, {code_à_6_chiffres}) sont des variables de gabarit. Aucune valeur chiffrée (seuil minimal, durées) n'est écrite en dur : elle se lit dans les réglages.
- Les textes arabes sont **à relire par un locuteur natif** avant usage.

## Synthèse : ce qui ne peut pas être publié aujourd'hui

| Clé ou gabarit | Bloqué par | Raison |
|---|---|---|
| `home.lead` (valeur proposée) | lots 1 et 4 | « synthèse d'équipe anonymisée » : n'existe pas encore |
| `frontpage.call_to_action` (valeur proposée) | à décider | « Demander une présentation » suppose un parcours de demande ; la valeur actuelle reste la seule vraie aujourd'hui |
| `home.stake.*`, `home.outcome` (blocs C) | lots 1, 4, 6 | confidentialité, groupes, PDF |
| `home.method.research` | R3 sans fiche | stabilité des traits non démontrée par le dossier |
| `faq.employer` | lots 1, 3, 4 | confidentialité, export et suppression, synthèses à seuil |
| `invite.mail.*` | lots 1, 2, 4 | invitation personnalisée, confidentialité, synthèses de groupe |
| `results.intro` (dernière phrase) | lot 1 | consultant qui restitue ; capacité à vérifier (affirmation 17) |
| `test.instructions`, `test.halfway` (reprise « plus tard » sans « sur cet appareil ») | lot 2 | reprise sur serveur |
| Titre, sous-titre, bouton EN et AR | mêmes lots que le français | traduction du même texte |

---

## 1. Accueil, version française (`web/src/messages/fr.js`)

### 1.1 `home.title` (ligne 18)

- **Ancienne valeur** : `Votre personnalité, lue en cinq dimensions.`
- **Nouvelle valeur proposée** : `Décider sur des repères, pas sur des impressions.` (variante C-T1 de l'angle C, promesse PR2.)
- Variante au choix du client, plus proche de la formule de la promesse : `Des décisions d'équipe fondées sur des repères, pas sur des impressions.`
- **[Activation : aucune.]**
- **[Preuve]** : affirmation 11 de la section 5 : pas de preuve trouvée d'un gain de décision ; P34 écrit que l'outil convient à la recherche, « probablement » pas à des décisions importantes sur des individus. « Repères » doit rester descriptif et ne suggère aucune prédiction (réserve déjà portée par le fichier de copywriting, 1.3).

### 1.2 `home.lead` (ligne 19)

- **Ancienne valeur** : `Un questionnaire de 120 affirmations, sans limite de temps. Il n’y a ni bonne ni mauvaise réponse.`
- **Nouvelle valeur proposée** : `Un questionnaire de 120 affirmations, une synthèse d'équipe anonymisée, un consultant pour en tirer des décisions.` (C-S2.)
- **[Activation : lot 1 et lot 4.] NE PAS PUBLIER AVANT LE LOT 4.** « Synthèse d'équipe anonymisée » : les synthèses de groupe sont au lot 4, le cloisonnement au lot 1. « Un consultant pour en tirer des décisions » : capacité de Tenga à vérifier (affirmation 17 ; aucune fiche).
- **Valeur intermédiaire déjà vraie** (fournie par l'angle A, A-S3, aucune dépendance de lot) : `Un questionnaire de 120 affirmations, sans limite de temps. Nous vous disons d'où il vient, ce qu'il mesure et ce qu'il ne mesure pas.` Preuve : P34 (origine), affirmation 20 (exact, `test.noTimeLimit`).
- Autres variantes C du fichier de copywriting, toutes avec les mêmes dépendances : C-S1 (`... une lecture de groupe ... Chaque personne reste protégée.`), C-S3 (`... sans jamais exposer un individu.`).

### 1.3 `frontpage.call_to_action` (ligne 63)

- **Ancienne valeur** : `Commencer le questionnaire`
- **Nouvelle valeur proposée** : `Demander une présentation` (C-B1, bouton destiné au responsable.)
- **[Activation : à confirmer.]** Le bouton actuel est le seul accès au questionnaire avant les invitations personnalisées (lot 2). Remplacer sa cible suppose (a) un parcours de demande de présentation (formulaire ou adresse, non prévu dans les lots) et (b) que les personnes invitées entrent par leur lien (lot 2). **NE PAS APPLIQUER avant que ces deux conditions soient vraies** ; sinon conserver `Commencer le questionnaire` (C-B3).
- **[Preuve]** : aucune affirmation de fait.

### 1.4 `home.reference.text` (ligne 43), preuve en bas de page (angle A, bloc 2)

- **Ancienne valeur** : `Le questionnaire reprend l’IPIP-NEO-120 de John A. Johnson (2014), placé dans le domaine public.`
- **Nouvelle valeur proposée** : `Les 120 affirmations proviennent de l'IPIP-NEO-120 de John A. Johnson (2014), construit à partir de l'International Personality Item Pool. L'inventaire est placé dans le domaine public : chacun peut le lire, le critiquer et le vérifier.`
- **[Activation : aucune.]**
- **[Preuve : R2 ; P34 (texte intégral, preuve forte) ; P33 bis (page web officielle, preuve forte).]** Référence vérifiée : *Journal of Research in Personality*, 51, 2014, p. 78-89, https://doi.org/10.1016/j.jrp.2014.05.003. Aucun écart.

### 1.5 Blocs d'accueil de l'angle C (clés nouvelles, aucune ancienne valeur)

Les blocs sont à créer sous `home.` ; le choix de la mise en page revient au client. Ancienne valeur : aucune (clés inexistantes).

| Clé nouvelle | Valeur proposée | Activation | Preuve et réserves |
|---|---|---|---|
| `home.stake.title` | `L'enjeu` | aucune | Titre de bloc |
| `home.stake.text` | `Une équipe mal composée, un changement mal compris, une formation qui rate sa cible : bien des décisions humaines se prennent sur une intuition. Tenga Assessments met des repères communs à la disposition de la direction.` | aucune | Aucun coût chiffré (règle du fichier de copywriting). Affirmation 11. |
| `home.outcome.title` | `Ce que vous obtenez` | aucune | Titre |
| `home.outcome.text` | `Une synthèse de groupe : la façon dont une équipe a tendance à fonctionner sur les cinq grands facteurs et trente facettes. Un entretien de restitution avec un consultant Tenga. Des pistes d'usage pour la formation, la composition d'équipe et l'accompagnement du changement.` | **Lot 4 (synthèse de groupe), lot 6 (PDF).** NE PAS PUBLIER AVANT LE LOT 4. | « Composition d'équipe » : R6, écart au dossier (revue de Bell, référence Barrick et coll. 1998 absente) ; piste d'usage, jamais garantie (affirmation 9 : P11 à P14, preuve partielle). Affirmation 17. |
| `home.hidden.title` | `Ce que votre organisation ne voit pas` | aucune | Titre |
| `home.hidden.text` | `Aucun résultat individuel. Les synthèses de groupe ne sont produites qu'à partir d'un nombre minimal de participants. Ce principe protège la sincérité des réponses, donc la qualité de la lecture.` | **Lot 1 et lot 4.** NE PAS PUBLIER AVANT LE LOT 4. | Affirmations 13 (Critique avant le lot 1) et 15. Loi 09-08 (P36) : revérification et relecture juridique requises. |
| `home.trust.title` | `Un tiers de confiance` | aucune | Titre |
| `home.trust.text` | `Tenga Conseil est le tiers entre votre direction et vos équipes. Le consultant restitue, explique et recadre. Il ne transmet rien d'individuel à l'organisation.` | **Lot 1.** NE PAS PUBLIER AVANT LE LOT 1. | Affirmations 13, 17, 24. |
| `home.process.title` | `De la donnée à la décision` | aucune | Titre (F3) |
| `home.process.text` | `1. Cadrer : nous définissons avec votre direction la question à éclairer. 2. Inviter : chaque personne reçoit une invitation personnelle. 3. Répondre : 120 affirmations, sans limite de temps, avec reprise possible. 4. Restituer : un consultant Tenga remet son profil à chaque personne et présente la synthèse de groupe à la direction. 5. Décider : ensemble, nous tirons de la lecture des pistes d'action.` | **Lot 2 (invitation, reprise), lot 4 (synthèse de groupe), lot 6 (PDF).** NE PAS PUBLIER AVANT LE LOT 4. | Décrit un processus, pas un résultat. |

### 1.6 Blocs d'accueil de l'angle A, bas de page (clés nouvelles)

| Clé nouvelle | Valeur proposée | Activation | Preuve et réserves |
|---|---|---|---|
| `home.method.measured` | `Cinq grands facteurs de la personnalité : ouverture à l'expérience, conscienciosité, extraversion, agréabilité, névrosisme. Chacun se décompose en six facettes, soit trente tendances décrites séparément.` | aucune | P34 (120 items, 30 facettes). |
| `home.method.research` | `Les traits du modèle sont étudiés depuis des décennies, dans de nombreuses langues. Ils sont relativement stables à l'âge adulte et entretiennent des liens documentés avec certains comportements au travail. Les ordres de grandeur et les réserves sont détaillés dans notre page Méthode et références.` | aucune de lot, mais **NE PAS PUBLIER en l'état** | **[Sans fiche]** pour « relativement stables à l'âge adulte » (R3). « Nombreuses langues » : R1, écart au dossier, proposition « dans la plupart des cultures étudiées, dans des dizaines de langues ». « Liens documentés avec certains comportements au travail » : P1, P2, P4, P5 (preuve forte, effet modeste). |
| `home.method.limits` | `Il ne pose pas de diagnostic. Il ne mesure ni les compétences, ni l'intelligence, ni la santé. Il décrit des tendances habituelles, d'après vos propres réponses. Il n'est pas conçu pour trier des candidats.` | aucune | Affirmation 19, écart au dossier : « ni l'intelligence, ni la santé » est une affirmation de conception, non démontrée par une fiche. Proposition : `Il décrit des tendances de comportement ; il n'est pas un test de compétences, d'intelligence ni un examen de santé.` « Pas conçu pour trier des candidats » : R9 (P7, P8, P9), engagement de Tenga (décision D7). |
| `home.method.process` | `Vous recevez une invitation personnelle. Vous répondez à votre rythme, sans limite de temps, avec reprise possible. Un consultant Tenga vous restitue ensuite votre profil.` | **Lot 2** (invitation, reprise), **lot 6** (PDF). NE PAS PUBLIER AVANT LE LOT 2. | Affirmations 17 et 21. |

---

## 2. Titre, sous-titre et bouton d'accueil en anglais et en arabe

Lignes : `home.title` (`en.js` 17, `ar.js` 18), `home.lead` (`en.js` 18, `ar.js` 19), `frontpage.call_to_action` (62 dans les deux fichiers). Mêmes dépendances que le français.

### 2.1 Anglais (`web/src/messages/en.js`)

| Clé | Ancienne valeur | Nouvelle valeur proposée | Dépendance |
|---|---|---|---|
| `home.title` | `Your personality, read in five dimensions.` | `Decisions built on reference points, not impressions.` Variante : `Give your teams a common language for working together.` | aucune (même réserve que 1.1) |
| `home.lead` | `A questionnaire of 120 statements, with no time limit. There are no right or wrong answers.` | `A 120-statement personality questionnaire offered by Tenga Conseil to the organisations it advises. It gives leadership a group-level reading of how teams tend to work, without ever exposing an individual's results.` | **[Activation : lot 1 et lot 4.] NE PAS PUBLIER AVANT LE LOT 4.** |
| `frontpage.call_to_action` | `Start the questionnaire` | `Request a presentation` | **[Activation : à confirmer]**, mêmes conditions qu'en 1.3 ; sinon conserver `Start the questionnaire` |

L'anglais emploie l'orthographe britannique (« organisations »), à confirmer par le client (note du fichier de copywriting, 2.6).

### 2.2 Arabe (`web/src/messages/ar.js`), à relire par un locuteur natif

| Clé | Ancienne valeur | Nouvelle valeur proposée | Dépendance |
|---|---|---|---|
| `home.title` | `شخصيتك، مقروءة في خمسة أبعاد.` | `قراراتٌ تقوم على معطيات، لا على انطباعات` Variante : `فريقٌ يفهم أسلوب عمله، يقرّر بوضوح أكبر` | aucune (même réserve que 1.1) ; la variante promet une amélioration, à ne retenir qu'avec l'accord explicite du client |
| `home.lead` | `استبيان من 120 عبارة، دون حدّ للوقت. لا توجد إجابات صحيحة وأخرى خاطئة.` | `استبيان شخصية من 120 عبارة يقدّمه Tenga Conseil للمؤسسات التي يرافقها. يمنح إدارتكم قراءةً جماعية لطريقة اشتغال الفرق، دون أن يُكشف لها أيّ ملف فردي.` | **[Activation : lot 1 et lot 4.] NE PAS PUBLIER AVANT LE LOT 4.** |
| `frontpage.call_to_action` | `بدء الاستبيان` | `طلب عرض تقديمي` | **[Activation : à confirmer]**, mêmes conditions qu'en 1.3 ; sinon conserver `بدء الاستبيان` |

---

## 3. Pages vues par la personne invitée : promesse d'usage PR1 (angle B), version française

### 3.1 `test.instructions` (`fr.js`, bloc `test`)

- **Ancienne valeur** : `Pour chaque affirmation, indiquez dans quelle mesure elle vous décrit tel que vous êtes habituellement, et non tel que vous aimeriez être. Répondez spontanément. Les touches 1 à 5 du clavier permettent de choisir.`
- **Nouvelle valeur proposée, valable aujourd'hui** : `Merci de prendre ce temps. Voici 120 affirmations. Pour chacune, répondez comme vous êtes habituellement, pas comme vous aimeriez être. Il n'y a ni bonne ni mauvaise réponse : une réponse honnête est la plus utile, pour vous d'abord. Prenez le temps que vous voulez ; vous pouvez vous arrêter et reprendre plus tard sur cet appareil. Les touches 1 à 5 du clavier permettent de choisir.`
- **Après le lot 2**, retirer « sur cet appareil » : `... vous pouvez vous arrêter et reprendre plus tard.` **[Activation : lot 2.]** (Affirmation 21 : « sur cet appareil » avant le lot 2.)
- Note d'accessibilité : la phrase sur les touches 1 à 5 figure dans l'ancienne valeur et a été conservée ; le texte du fichier de copywriting (2.2) ne la reprenait pas.
- **[Preuve]** : « aucune limite de temps » exact (affirmation 20). Le « 120 » est un nombre de fabrication (P34) ; il est à lire depuis le total de questions plutôt qu'à écrire en dur.

### 3.2 `test.halfway` (clé nouvelle)

- **Ancienne valeur** : aucune (clé inexistante).
- **Nouvelle valeur proposée** : `La moitié est faite : {half} affirmations sur {total}. Vous pouvez faire une pause, vos réponses sont conservées sur cet appareil.`
- **[Activation : lot 2]** pour retirer « sur cet appareil » (progression enregistrée sur le serveur). Valable aujourd'hui avec la mention « sur cet appareil » (comportement observé : message `test.restored`).
- Les nombres 60 et 120 du fichier de copywriting sont remplacés par {half} et {total} pour ne rien écrire en dur.

### 3.3 `results.intro` (`fr.js`, bloc `results`)

- **Ancienne valeur** : `Ces résultats décrivent vos tendances habituelles, d’après vos propres réponses. Ils ne mesurent ni vos compétences ni votre valeur, et ne constituent pas un diagnostic.`
- **Nouvelle valeur proposée** : `Voici votre profil. Lisez-le d'abord pour vous, avec curiosité : il décrit des tendances, pas des qualités ni des défauts. Rien ici ne vous classe, rien ne mesure vos compétences, rien n'est un diagnostic. Vous pourrez en parler avec le consultant Tenga qui vous restitue le résultat.`
- **[Activation : lot 1]** pour la dernière phrase (l'entretien de restitution existe dès le lot 1 selon le fichier de copywriting, 2.2 bloc 5) ; capacité de Tenga à vérifier (affirmation 17). **NE PAS PUBLIER la dernière phrase avant le lot 1.** Les trois premières phrases sont publiables aujourd'hui.
- **[Preuve]** : « rien ne mesure vos compétences » : voir affirmation 19, écart au dossier (proposition : `rien ne constitue un test de compétences`).

### 3.4 `faq.employer` (clé nouvelle)

- **Ancienne valeur** : aucune. La FAQ actuelle n'a ni cette question ni sa réponse.
- **Question proposée** : `Est-ce que mon employeur voit mes réponses ?`
- **Réponse proposée** (angle B) : `Votre employeur ne voit pas votre résultat individuel. Il reçoit des synthèses de groupe, et seulement lorsqu'un nombre minimal de personnes ont répondu, pour qu'aucune moyenne ne permette de vous reconnaître. Le consultant Tenga de votre organisation, tiers de confiance, peut consulter votre profil pour vous le restituer ; chaque consultation est consignée dans un journal. Vous pouvez à tout moment télécharger vos données ou demander leur suppression.`
- **[Activation, phrase par phrase]** :
  - « ne voit pas votre résultat individuel » : **lot 1** ;
  - synthèses de groupe, nombre minimal : **lot 4** (le seuil se lit dans les réglages, jamais en dur) ;
  - consultation consignée dans un journal : **lot 1** (journal) et **lot 4** (vue individuelle du consultant journalisée) ;
  - télécharger ou supprimer ses données : **lot 3**.
  **NE PAS PUBLIER AVANT LE LOT 4** (la réponse complète) ; publier phrase par phrase est possible si le client scinde la réponse.
- **[Preuve]** : affirmations 13 (**critique** avant le lot 1), 14, 15, 16. Cadre légal P36 (loi 09-08, articles 3, 4, 5, 7 c, 11, 12, 23, 43 et 44) et P37 (RGPD article 22), preuve forte pour le texte cité ; trois points à revérifier signalés par le dossier : copie tierce de la loi 09-08 (état en vigueur non prouvé), EUR-Lex inaccessible, qualification d'un résultat de test (sensible ou non) non tranchée. Relecture juridique requise (décision D5).

### 3.5 `faq.science` (clé nouvelle)

- **Ancienne valeur** : aucune (la FAQ actuelle a `faq.source` : `Les questions et le calcul des scores proviennent de l’International Personality Item Pool (ipip.ori.org), placé dans le domaine public : il s’agit de l’IPIP-NEO-120 de John A. Johnson (2014). Tenga Conseil a adapté quelques formulations au contexte marocain, sans changer ce que mesure chaque question.`).
- **Question proposée** : `Est-ce scientifique ?`
- **Réponse proposée** (angle B) : `Le questionnaire repose sur le modèle des cinq grands facteurs, l'un des plus étudiés en psychologie de la personnalité, et sur un inventaire publié et du domaine public. Il n'a pas pour but de vous évaluer ni de vous classer. Nous sommes honnêtes sur ses limites : il décrit ce que vous en dites vous-même ; certaines formulations ont été adaptées au contexte marocain et leur fiabilité reste à vérifier sur de nombreuses réponses.`
- **[Activation : aucune.]**
- **[Preuve]** : « l'un des plus étudiés » : affirmation 3, écart au dossier ; proposition : `Le modèle des cinq grands facteurs a fait l'objet de très nombreuses études, dont une méta-analyse de 410 échantillons et plus de 400 000 personnes (Judge et coll., 2013).` Inventaire publié et du domaine public : P34, P33 bis. Limites de l'adaptation marocaine : P33 (pas de preuve trouvée pour l'IPIP-NEO-120 en arabe marocain ni en français pour le Maroc) ; affirmation 22.

### 3.6 `faq.usefulness` (clé nouvelle)

- **Ancienne valeur** : aucune.
- **Question proposée** : `À quoi ça sert ?`
- **Réponse proposée** (angle B, **sans** la phrase « Beaucoup de personnes découvrent... », que le fichier de copywriting demande de supprimer tant qu'elle n'est pas observée) : `À vous donner des mots pour décrire votre façon de travailler, et à ouvrir une conversation avec vos collègues. Ce n'est pas une promesse de résultat : c'est un support de dialogue.`
- **[Activation : aucune.]**
- **[Preuve]** : phrase « beaucoup de personnes découvrent » : affirmation 12, **[Sans fiche]**, retirée ici ; à rattacher aux retours des premières campagnes (idée M12).

### 3.7 E-mail d'invitation d'une campagne (gabarit nouveau, `invite.mail.*`)

- **Ancienne valeur** : aucune. Il n'existe pas de gabarit d'invitation dans le dépôt (`web/src/lib/login-mail.ts` ne couvre que la connexion).
- **[Activation : lot 2]** (campagnes et invitations personnalisées), avec **lot 1** et **lot 4** pour les phrases de confidentialité. **NE PAS PUBLIER AVANT LE LOT 4** pour la version complète ci-dessous.
- **Objet proposé** : `Une invitation de {organisation}, en confiance`
- **Corps proposé** (angle B) :

```
Bonjour {prénom},

{organisation} a demandé à Tenga Conseil d'organiser un questionnaire de personnalité pour {groupe}. Une invitation à y répondre vous est adressée.

Ce que vous allez faire : lire 120 affirmations et dire dans quelle mesure elles vous décrivent. Il n'y a pas de bonne réponse et pas de limite de temps. Vous pouvez vous arrêter et reprendre.

Ce que nous tenons à vous dire d'abord : votre résultat individuel n'est visible que de vous, du consultant Tenga affecté à {organisation} et de l'équipe d'administration de Tenga Conseil. {organisation} ne reçoit que des synthèses de groupe. Le questionnaire ne mesure ni vos compétences ni votre valeur et n'est pas un diagnostic.

Quand vous serez prêt, ouvrez ce lien : {lien}

Une question avant de commencer ? Écrivez-nous à {email_contact}. Nous vous répondrons.

Cordialement,
Tenga Conseil
```

- **[Activation, phrase par phrase]** : « Vous pouvez vous arrêter et reprendre » : **lot 2** ; « votre résultat individuel n'est visible que de vous, du consultant ... » : **lot 1** ; « {organisation} ne reçoit que des synthèses de groupe » : **lot 4**.
- **[Preuve]** : affirmations 13 (critique avant le lot 1), 17, 19 (écart au dossier : « ne mesure ni vos compétences ni votre valeur » est une affirmation de conception, voir la proposition en 3.3). Le texte « en confiance » de l'objet est un choix de marque, sans affirmation de fait.

### 3.8 E-mail de lien de connexion (`web/src/lib/login-mail.ts`, objet `texts.fr`)

Cet e-mail existe déjà (hors `fr.js`). Les clés portent les noms du fichier TypeScript.

| Clé | Ancienne valeur | Nouvelle valeur proposée (angle B) |
|---|---|---|
| `texts.fr.subject` | `Votre lien de connexion à Tenga Assessments` | `Votre lien pour retrouver votre espace` |
| `texts.fr.intro` | `Utilisez le bouton ci-dessous pour vous connecter à Tenga Assessments.` | `Voici le lien pour vous connecter.` |
| `texts.fr.action` | `Me connecter` | inchangé : `Me connecter` |
| `texts.fr.codeLabel` | `Si vous ouvrez ce message sur un autre appareil, saisissez ce code sur la page de connexion :` | `Si vous l'ouvrez sur un autre appareil, entrez ce code :` |
| `texts.fr.note` | ``Le lien et le code sont valables ${LOGIN_VALIDITY_MINUTES} minutes et ne servent qu’une seule fois. Si vous n’avez pas fait cette demande, ignorez ce message.`` | ``Ce lien fonctionne une seule fois et reste valable ${LOGIN_VALIDITY_MINUTES} minutes. Ce lien n'a pas été demandé par vous ? Vous pouvez simplement ignorer ce message.`` |

- **[Activation : aucune]** : chaque phrase décrit le comportement actuel (jeton à usage unique, durée lue dans `LOGIN_VALIDITY_MINUTES`). Écart de sens à valider par le client : l'ancienne `note` dit que le **code** aussi ne sert qu'une fois ; la nouvelle ne parle que du lien. Reformulation exacte, si le client veut conserver la précision : ``Le lien et le code fonctionnent une seule fois et restent valables ${LOGIN_VALIDITY_MINUTES} minutes.``
- **[Preuve]** : aucune affirmation de recherche.

---

## 4. Signature : PR3 « Comprendre avant de juger. »

Clé nouvelle `common.signature` (bloc `common` de `fr.js`, ligne 234 ; `en.js` et `ar.js` ne sont pas traités ici, la traduction restant à faire).

- **Ancienne valeur** : aucune (clé inexistante).
- **Nouvelle valeur proposée** : `Comprendre avant de juger.`
- **[Activation : aucune.]** Aucune affirmation de fait. Le fichier de copywriting classe PR3 comme « idée de marque courte, mémorable », abstraite si elle est seule. La place est une décision du client (pied de page, signature des e-mails, bas de la page d'accueil) ; aucun emplacement n'est choisi ici.
- Remarque de cohérence : l'idée de ne pas juger est cohérente avec la voix de marque (« décrire, ne jamais juger »).

---

## 5. Récapitulatif d'application (rien n'est appliqué)

1. **Applicable dès validation du client, sans condition de lot** : `home.title` (fr, en, ar), `home.reference.text`, `home.method.measured`, `home.method.limits` (proposition d'écart à choisir), `test.instructions` (avec « sur cet appareil »), `test.halfway` (avec « sur cet appareil »), `results.intro` sans la dernière phrase, `faq.science` (proposition d'écart à choisir), `faq.usefulness`, e-mail de connexion (3.8), `common.signature`.
2. **Attendre le lot 1** : `results.intro` (dernière phrase), `home.trust.*`.
3. **Attendre le lot 2** : retirer « sur cet appareil » dans `test.instructions` et `test.halfway` ; `home.method.process` ; gabarit d'invitation (avec les lots 1 et 4 pour les phrases de confidentialité) ; bouton d'accueil si le client le retient.
4. **Attendre le lot 3** : phrase sur le téléchargement et la suppression des données.
5. **Attendre le lot 4** : `home.lead` (fr, en, ar), `home.outcome.*`, `home.hidden.*`, `home.process.*`, `faq.employer` complet, gabarit d'invitation complet.
6. **Attendre le lot 6** : toute mention de la restitution PDF (`home.outcome.text`, `home.method.process`, `home.process.text`).
7. **Ne pas publier sans fiche** : `home.method.research` (stabilité des traits, R3 sans fiche).
8. **À revérifier avant toute phrase de confidentialité** : loi 09-08 (copie tierce, état en vigueur), RGPD article 22 (EUR-Lex inaccessible), qualification d'un résultat de test de personnalité, relecture par un juriste (décision D5).
