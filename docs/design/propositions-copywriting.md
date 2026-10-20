# Propositions de copywriting de Tenga Assessments

> ### État de la vérification (mise à jour du 20 octobre 2026)
>
> **Ce qui n'est pas publiable en l'état, dit d'abord.** R3 et R8 n'ont aucune fiche dans le dossier de preuves : leur contenu n'est pas démontré par le dossier. R5, R6, R7 et R10 portent un écart au dossier (qualificatif, revue ou périmètre) ; une reformulation étiquetée « proposition » figure sous chacune. Aucune phrase n'est retirée et aucun choix n'est fait : la décision reste au client.
>
> **Ce qui est maintenant rattaché** (section 3.1, 12 phrases R1 à R12, et colonne « Preuve » de la section 5, 26 affirmations) :
>
> - **Soutien direct par au moins une fiche (8)** : R1 (P26, P27, P28), R2 (P34, P33 bis), R4 (P1, P2, P4, P5), R5 (P15), R6 (P11 à P14), R7 (P10), R9 (P7, P8, P9, P34), R12 (P6, P1).
> - **Appui indirect seulement (2)** : R10 (P20, hors périmètre entreprise), R11 (P1, P13, P14 ; la référence citée, Judge et Zapata 2015, n'a pas de fiche).
> - **Pas de fiche : non démontré (2)** : R3 (stabilité des traits) et R8 (autre regard que l'auto-évaluation). Les phrases de la section 2 qui reprennent la stabilité des traits (blocs « Ce que la recherche établit » de l'angle A, FAQ « À quoi ça sert » des angles A et B, texte F1) héritent de cette absence de fiche.
> - **Écarts relevés (7)** : R1, R5, R6, R7, R10 (section 3.1) ; affirmations 3 et 19 (section 5). L'affirmation 23 reprend R10 et l'affirmation 9 reprend R6.
> - **Chiffres écartés par le dossier** : le « 95 % » attribué à Eurich (P16) et le « ρ = 0,34 » attribué à Bell 2007 (P11) n'étaient pas retrouvés à la source. Ils ne figurent pas dans ce document ; aucun ne doit y être introduit. Aucun chiffre n'a été ajouté dans les phrases de site : les chiffres lus n'apparaissent que dans les colonnes de preuve.
>
> **Ce qui reste en résumé éditeur seulement** (le corps de l'article n'a pas été lu, donc les limites méthodologiques sont moins complètes) : toutes les fiches citées ci-dessus, sauf P1 et P6 (Sackett et coll. 2022, texte intégral), P34 (Johnson 2014, texte intégral), P16 (HBR, texte intégral), P33 bis (page web), P36 et P37 (textes de loi). Cela concerne en particulier R1, R4 (hors Sackett), R5, R6, R7, R9, R10, R11.
>
> **Trois points à revérifier, signalés par le dossier de preuves** :
>
> 1. **Loi marocaine n° 09-08 (P36)** : le texte du Bulletin officiel n° 5714 a été lu sur une copie PDF hébergée par un tiers non officiel ; le PDF de la CNDP renvoyait une erreur 404 le 20/10/2026. Le texte doit être revérifié sur le Bulletin officiel ou le site de la CNDP, et son état en vigueur confirmé auprès de la CNDP et du Secrétariat général du gouvernement.
> 2. **Règlement (UE) 2016/679, article 22 (P37)** : EUR-Lex était inaccessible (page vide) le 20/10/2026 ; le texte a été lu sur la reproduction de la CNIL. À revérifier sur la source officielle. Les autres dispositions pertinentes du règlement n'ont pas été lues.
> 3. **Écart type de la conscienciosité dans P1 (Sackett et coll. 2022)** : la valeur 0,15 provient d'une extraction de tableau à colonnes mêlées ; elle est cohérente avec le texte (le dossier lui attribue une confiance moyenne) mais exige un contrôle visuel du tableau 3. Le coefficient 0,19 et la valeur 0,31 de Schmidt et Hunter sont, eux, cohérents avec le texte.
>
> Numérotation : P33 et P33 bis sont deux fiches distinctes du dossier. Les numéros de lot (1, 2, 3, 4, 6) sont ceux de `docs/plan-implementation-espace-prive.md` § 6, relus le 20/10/2026.

20 octobre 2026. Document à lire et à valider par Amine. Il PROPOSE ; il ne tranche rien. Tout avis de l'auteur est étiqueté « recommandation ». Aucun texte n'est publié, aucun fichier du dépôt n'est modifié.

**Première phrase qui compte** : à la rédaction initiale, aucun chiffre ni aucune étude de ce document n'avait été lu à la source ; le dossier de preuves (`docs/design/dossier-preuves.md`) a depuis été rapproché des phrases de la section 3.1 et du tableau de la section 5 (voir l'encadré « État de la vérification » ci-dessous). Les passages de la section 2 qui portent encore la mention « source à confirmer » n'ont pas été modifiés : ils renvoient à R1 à R12 dont l'état est donné en section 3.1. Avant publication, chaque phrase doit rester rattachée à une fiche P ; R3 et R8 n'en ont pas.

Conventions :

- Chaque texte proposé est entre guillemets français « » et prêt à coller. Les variables à remplir sont entre accolades : {prénom}, {organisation}, {lien}.
- « Activation » indique à partir de quand une phrase est vraie. Les promesses de confidentialité ne sont vraies qu'avec le lot 1 en production (`plan-implementation-espace-prive.md` § 6) : elles portent la mention [Activation : lot 1]. Les phrases sur les groupes portent [Activation : lot 4], la restitution PDF [Activation : lot 6].
- Rien n'est inventé sur Tenga Conseil : ce que le cabinet doit fournir (références, nombre de consultants, secteurs) est marqué [à compléter par Tenga].
- Registre : vouvoiement, voix de `voix-de-marque.md` (aucun jugement de valeur, aucune comparaison à « la moyenne », « questionnaire » et non « test »). Les écarts à cette voix, quand une piste audacieuse en demande, sont signalés.

---

## 1. Synthèse

### 1.1 Diagnostic du texte actuel

Le texte déjà corrigé dans `web/src/messages/fr.js` est exact et propre. Il n'est pas faux : il est **muet**. Ce que le client ressent comme « trop faible » se vérifie phrase par phrase.

| Texte actuel | Ce qui est faible |
|---|---|
| « Votre personnalité, lue en cinq dimensions. » (`home.title`) | Décrit la méthode, pas ce que la personne ou l'organisation y gagne. Aucun bénéfice, aucun enjeu. Un concurrent, un étudiant ou un curieux pourrait écrire la même ligne. |
| « Un questionnaire de 120 affirmations, sans limite de temps. Il n'y a ni bonne ni mauvaise réponse. » (`home.lead`) | Deux précautions et un nombre : le texte rassure avant d'avoir donné une raison de venir. La seule information de valeur (« sans limite de temps ») est une absence. |
| Bandeau de chiffres « affirmations / domaines / facettes / langues » (`home.stats`) | Des caractéristiques de fabrication, pas des preuves d'utilité. 120, 5, 30 et 3 ne disent pas à quoi cela sert. |
| « Cinq dimensions, chacune décrite comme une tendance et non comme un jugement. » (`home.factors.intro`) | Se définit par ce qu'il n'est pas. Le lecteur apprend la précaution, pas l'intérêt. |
| « Le questionnaire reprend l'IPIP-NEO-120 de John A. Johnson (2014), placé dans le domaine public. » (`home.reference`) | Sigle non développé, référence que seul un spécialiste décode. La preuve est là, mais elle est écrite pour un jury, pas pour un dirigeant. |
| « Tenga Assessments est le service d'évaluation de la personnalité de Tenga Conseil, cabinet de conseil marocain. » (`about.p1`) | Une définition administrative. Aucune raison de faire confiance à ce cabinet plutôt qu'à un autre. |
| « Non. Il décrit des tendances de comportement d'après vos propres réponses. » (`faq.diagnosis`) | Bonne réponse, mais la FAQ n'a que des questions de précaution. Elle ne traite ni « mon employeur voit-il mes réponses ? » ni « à quoi ça sert ? », les deux plus fortes objections. |
| Version publiée avant correction : « test de personnalité gratuit et open source » | Voix d'un projet communautaire. Incompatible avec un cabinet. Déjà retirée du code, encore visible en production (`audit.md`). |

Quatre défauts structurels :

1. **Aucune promesse.** Le site décrit un instrument. Il ne dit à personne ce qui changera pour lui.
2. **Aucune preuve de l'utilité.** La rigueur est réelle (domaine public, 30 facettes, source nommée) mais n'est jamais mise au service d'un argument.
3. **Deux publics, un seul discours.** Le responsable qui commande et la personne qui répond sans l'avoir choisi n'ont ni les mêmes craintes ni les mêmes envies ; le texte parle à personne en particulier.
4. **Aucune voix de cabinet.** Pas de point de vue, pas de position, rien qui fasse penser à une maison qui a des idées sur le travail en équipe.

### 1.2 Positionnement recommandé

**Recommandation.** Se placer comme **le tiers de confiance qui donne à une organisation un langage commun sur la façon de travailler ensemble**, avec la rigueur d'un cabinet (méthode publique, sources nommées, limites dites) et le respect de la personne qui répond. Ni un « test de personnalité », ni un outil de tri : une lecture des tendances de chacun, restituée par un consultant, au service des équipes et des décisions.

Ce positionnement tient parce qu'il repose sur ce que le produit fait réellement : cinq domaines, trente facettes, restitution par un consultant Tenga, règles d'accès qui protègent l'individu (`conception-espace-prive.md` § 7). Il évite deux terrains où Tenga serait attaquable : le recrutement (voir 1.4) et la promesse de performance garantie.

### 1.3 Promesse centrale (options, au choix du client)

| Réf. | Promesse | Force | Risque |
|---|---|---|---|
| PR1 | « Un langage commun pour travailler ensemble. » | Vraie, large, humaine, difficile à contester | Moins tranchante |
| PR2 | « Des décisions d'équipe fondées sur des repères, pas sur des impressions. » | Parle au dirigeant, forte | « Repères » doit rester modeste : le questionnaire ne mesure pas les compétences |
| PR3 | « Comprendre avant de juger. » | Idée de marque courte, mémorable | Abstraite si seule |
| PR4 | « Ce que votre équipe ne s'est jamais dit sur sa façon de travailler. » | Audacieuse, crée de la curiosité | Peut être lue comme intrusive par la personne invitée |

**Recommandation** : PR2 en promesse commerciale (page d'accueil, destinée au responsable) et PR1 en promesse d'usage (e-mails et pages vues par la personne invitée). PR3 sert de signature.

### 1.4 Leviers psychologiques retenus

Chaque levier est rattaché à un choix de texte précis dans les sections suivantes. Nomenclature de `marketing-psychology` : modèles cités par leur nom.

| Levier | Choix de texte qui l'applique |
|---|---|
| **Aversion à la perte** (loss aversion) | Angle C : « Ce que coûte une décision d'équipe prise sans repères » plutôt que « ce que vous gagnez ». Attention : jamais de chiffre de coût sans source. |
| **Autorité** (authority bias) | Angle A : nommer l'instrument, son auteur, sa revue, ses limites. Angle C : « restitué par un consultant Tenga ». |
| **Pratfall effect** (avouer une limite renforce la crédibilité) | Dire ce que le questionnaire ne fait pas (pas de diagnostic, pas de mesure des compétences, pas un outil de tri). La dissonance cognitive sert l'angle D : une phrase qui heurte une évidence (« vous ne vous êtes jamais décrits ») crée l'envie de résoudre la tension. |
| **Preuve sociale** (social proof) | Aucune aujourd'hui : zéro témoignage, zéro chiffre de clients. Le document propose comment la fabriquer honnêtement (section 4). Rien n'est inventé. |
| **Réciprocité** (reciprocity) | Offrir d'abord : exemple de restitution fictif, livre blanc, démonstration au dirigeant. |
| **Effet de cadrage** (framing) | « Trente facettes » plutôt que « 120 questions » ; « un échange » plutôt que « un test ». |
| **Ancrage** (anchoring) | La rigueur d'abord (« une méthode publiée depuis 2014 »), puis l'usage. |
| **Effet Zeigarnik** et **gradient de but** (goal-gradient) | Questionnaire : « Vous en êtes à la moitié », reprise « là où vous en étiez » ; le travail interrompu reste en tête, la fin proche motive. |
| **Bénéfice immédiat** (immediate benefit) | Page de résultat : dire dans la première ligne ce que la personne va comprendre tout de suite. |
| **Clarté sur l'effort** (activation energy, BJ Fogg) | « Sans limite de temps », « reprise possible », « un seul lien » : réduire la friction perçue pour la personne invitée. |
| **Effet de pure exposition** (mere exposure) et **cohérence** (commitment and consistency) | E-mail d'invitation : petit engagement (« ouvrez le lien, vous choisirez ensuite »). Newsletter régulière (section 4). |
| **Aversion à l'ambiguïté** | Dire qui voit quoi, noir sur blanc, avant le premier bouton. |

### 1.5 Ce que le client doit savoir avant de choisir (angles morts)

Cinq points que le client n'a pas demandés et qui conditionnent la crédibilité.

1. **Ce que la recherche soutient le mieux n'est pas ce que « l'utilité » évoque d'instinct.** Les liens les mieux documentés entre traits et résultats concernent la performance au travail en général et, plus modestement, la conduite d'équipes ; la preuve que « restituer un profil améliore une équipe » est beaucoup moins directe (voir tableau des affirmations, section 5). Le texte le plus solide est donc celui qui promet un langage et des repères, pas un gain.
2. **Aucune norme de population.** Le calcul actuel ne compare personne à personne (`voix-de-marque.md` § 2.7). Tout texte de type « situez-vous par rapport aux autres » serait faux. Les textes proposés évitent cette formule.
3. **L'adaptation marocaine n'est pas validée.** La cohérence interne des formulations adaptées reste à vérifier sur des passations réelles (`voix-de-marque.md` § 7.6). « Validé » ne peut donc être écrit que pour l'instrument d'origine, pas pour la version de Tenga.
4. **Le recrutement est le terrain le plus risqué.** Des questionnaires auto-déclarés peuvent être embellis par un candidat qui sait l'enjeu, et leur usage en sélection est débattu dans la littérature (voir section 3). **Recommandation** : positionner Tenga Assessments sur le développement, les équipes et la compréhension mutuelle, et écrire noir sur blanc qu'il n'est pas un outil de tri. C'est aussi une protection juridique et de réputation (CNDP).
5. **La meilleure preuve d'utilité sera celle de Tenga, pas celle de la littérature.** Quelques campagnes pilotes, avec une question de fin de restitution (« Cela vous a-t-il aidé à mieux travailler avec les autres ? »), donneront à Tenga ses propres chiffres, publiables avec taille d'échantillon. Si des concurrents publient déjà ce type de mesure, c'est à vérifier avant d'en faire un argument de différenciation. Voir idée M12.

---

## 2. Les angles de discours

Quatre angles, contrastés. Chacun est complet et indépendant : le client peut en retenir un, ou panacher (voir « recommandation » en 2.5).

Rappel des clés de `fr.js` auxquelles les textes se substituent : `home.title`, `home.lead`, `frontpage.call_to_action`, blocs de la page d'accueil, `test.instructions`, `results.intro`, `home.factors.*`, `about.*`, `faq.*`. Les e-mails sont les gabarits du lot 2.

---

### 2.1 Angle A : « La preuve »

**Idée.** Le sérieux se prouve par la précision : une méthode publiée, une source nommée, des limites avouées. Le ton est celui d'un cabinet d'audit ou d'une revue : peu d'adjectifs, beaucoup de références, des limites dites.
**Pour qui.** Le responsable prudent, la DRH, le directeur juridique, l'universitaire consulté par la direction. Rassure aussi la personne invitée qui cherche « d'où ça vient ».
**Risques.** Froideur. Si la preuve est mal sourcée, l'angle s'effondre : tout ce qui est écrit doit passer par une fiche P. Peu d'émotion pour la personne invitée.
**Leviers.** Autorité, pratfall effect (limites avouées), ancrage (rigueur d'abord).

#### Titre d'accueil (3 variantes)

- A-T1 : « Une méthode publiée, des sources citées, des limites dites. »
- A-T2 : « Ce que la recherche sait de la personnalité au travail, et ce qu'elle ne sait pas. »
- A-T3 : « Cinq dimensions, trente facettes, une méthode que vous pouvez vérifier. »

#### Sous-titre (3 variantes)

- A-S1 : « Tenga Conseil propose aux organisations qu'il accompagne un questionnaire de personnalité de 120 affirmations, fondé sur le modèle des cinq grands facteurs et sur un inventaire du domaine public. Chaque source est consultable. »
- A-S2 : « Un instrument publié en 2014 dans une revue scientifique, restitué par un consultant, avec ses limites expliquées dès cette page. »
- A-S3 : « Un questionnaire de 120 affirmations, sans limite de temps. Nous vous disons d'où il vient, ce qu'il mesure et ce qu'il ne mesure pas. »

#### Bouton d'appel à l'action (3 variantes)

- A-B1 : « Consulter la méthode et les références »
- A-B2 : « Accéder à mon espace »
- A-B3 : « Commencer le questionnaire »

#### Cinq blocs de la page d'accueil

1. **Ce qui est mesuré.**
   « Cinq grands facteurs de la personnalité : ouverture à l'expérience, conscienciosité, extraversion, agréabilité, névrosisme. Chacun se décompose en six facettes, soit trente tendances décrites séparément. »
2. **D'où vient le questionnaire.**
   « Les 120 affirmations proviennent de l'IPIP-NEO-120 de John A. Johnson (2014), construit à partir de l'International Personality Item Pool. L'inventaire est placé dans le domaine public : chacun peut le lire, le critiquer et le vérifier. » [Source à confirmer par le dossier de preuves : Johnson 2014, *Journal of Research in Personality*.]
3. **Ce que la recherche établit.**
   « Les traits du modèle sont étudiés depuis des décennies, dans de nombreuses langues. Ils sont relativement stables à l'âge adulte et entretiennent des liens documentés avec certains comportements au travail. Les ordres de grandeur et les réserves sont détaillés dans notre page Méthode et références. » [Sources à confirmer : voir section 3, R1 à R5. Aucun chiffre n'est cité volontairement.]
4. **Ce que le questionnaire ne fait pas.**
   « Il ne pose pas de diagnostic. Il ne mesure ni les compétences, ni l'intelligence, ni la santé. Il décrit des tendances habituelles, d'après vos propres réponses. Il n'est pas conçu pour trier des candidats. »
5. **Comment cela se passe.**
   « Vous recevez une invitation personnelle. Vous répondez à votre rythme, sans limite de temps, avec reprise possible. Un consultant Tenga vous restitue ensuite votre profil. » [Activation : lot 2 pour l'invitation ; lot 6 pour la restitution PDF.]

#### Texte d'introduction du questionnaire

« Vous allez lire 120 affirmations. Pour chacune, indiquez dans quelle mesure elle vous décrit tel que vous êtes habituellement, et non tel que vous aimeriez être. Il n'y a ni bonne ni mauvaise réponse, et aucune limite de temps. Les réponses spontanées sont les plus utiles : elles donnent une description plus fidèle de vos tendances. Vous pouvez vous interrompre et reprendre plus tard. »

#### Message d'encouragement à mi-parcours

« Vous en êtes à la moitié : 60 affirmations sur 120. Continuez de répondre avec la même spontanéité. »

#### Introduction de la page de résultat

« Voici votre profil selon les cinq grands facteurs. Il décrit des tendances habituelles, calculées d'après vos propres réponses. Il ne mesure pas des compétences et ne constitue pas un diagnostic. Chaque domaine est détaillé en six facettes ; vous pouvez consulter pour chacun la définition et la source. »

#### Cinq descriptions courtes des domaines

- **Ouverture à l'expérience** : « Intérêt pour les idées, la nouveauté et l'imagination. Un score plus élevé décrit une tendance à explorer ; un score plus bas, une préférence pour le familier et le concret. »
- **Conscienciosité** : « Organisation, sens du devoir, persévérance. Décrit la façon dont une personne planifie, s'astreint et tient ses engagements. »
- **Extraversion** : « Goût de la compagnie, énergie dans l'action, expression des émotions positives. Décrit où une personne puise son énergie dans les échanges. »
- **Agréabilité** : « Coopération, confiance, souci d'autrui. Décrit la manière dont une personne se positionne entre accord et affirmation face aux autres. »
- **Névrosisme** : « Sensibilité aux émotions négatives et au stress. C'est une tendance d'humeur ; ce n'est pas un diagnostic. »

#### E-mail d'invitation d'une campagne

Objet : « {organisation} vous invite à répondre à un questionnaire de personnalité »

« Bonjour {prénom},

{responsable}, de {organisation}, a demandé à Tenga Conseil d'organiser un questionnaire de personnalité pour {groupe}. Une invitation à y répondre vous est adressée.

Ce que c'est : 120 affirmations, fondées sur un inventaire du domaine public (IPIP-NEO-120, John A. Johnson, 2014). Il n'y a ni bonne ni mauvaise réponse, et aucune limite de temps. Vous pouvez vous interrompre et reprendre.

Ce que ce n'est pas : un diagnostic, une évaluation de vos compétences ni un outil de sélection.

Qui voit quoi : [Activation : lot 1] votre résultat individuel n'est visible que de vous, du consultant Tenga affecté à {organisation} et de l'équipe d'administration de Tenga Conseil. {organisation} ne reçoit que des synthèses de groupe.

Pour commencer : {lien}

Une question ? Écrivez-nous à {email_contact}. La méthode complète et ses références : {lien_méthode}.

Tenga Conseil »

#### E-mail de lien de connexion

Objet : « Votre lien de connexion Tenga Assessments »

« Bonjour,

Voici votre lien de connexion : {lien}

Il ne peut être utilisé qu'une seule fois et expire dans {durée_de_validité}. Si vous l'ouvrez sur un autre appareil, saisissez ce code : {code_à_6_chiffres}.

Vous n'avez pas demandé ce lien ? Ignorez ce message : rien ne se produira.

Tenga Conseil »

#### À propos de Tenga Conseil

« Tenga Conseil est un cabinet de conseil marocain. Il accompagne des organisations dans [à compléter par Tenga : domaines d'intervention]. Tenga Assessments est son service de questionnaires de personnalité. Nous avons choisi un instrument dont la méthode est publique et dont chaque source peut être consultée, parce qu'un outil qui touche à la personne doit pouvoir être contrôlé. Les résultats sont restitués par un consultant, jamais livrés seuls. Nous disons aussi ce qu'ils ne permettent pas : poser un diagnostic, mesurer des compétences ou trier des candidats. »

#### FAQ (trois entrées)

**Est-ce que mon employeur voit mes réponses ?**
« Non. [Activation : lot 1] Votre résultat individuel n'est visible que de vous, du consultant Tenga affecté à votre organisation et de l'équipe d'administration de Tenga Conseil. Chaque consultation par une autre personne que vous est consignée dans un journal. Votre organisation reçoit uniquement des synthèses de groupe, et seulement à partir d'un nombre minimal de participants, afin qu'aucune moyenne ne permette de deviner une personne. »

**Est-ce scientifique ?**
« Le modèle des cinq grands facteurs est l'un des cadres les plus étudiés en psychologie de la personnalité. Le questionnaire reprend l'IPIP-NEO-120 de John A. Johnson (2014), publié dans une revue scientifique et placé dans le domaine public. Deux réserves : l'instrument d'origine n'est pas le NEO PI-R commercial, dont il mesure des facettes proches ; et certaines formulations ont été adaptées au contexte marocain, sans que leur cohérence ait encore été vérifiée sur un grand nombre de réponses. Références complètes : page Méthode et références. » [Sources à confirmer par le dossier de preuves.]

**À quoi ça sert ?**
« À obtenir une description structurée de vos tendances habituelles de comportement, utile pour parler de la façon de travailler ensemble. Ce que la recherche soutient le plus solidement : les traits sont relativement stables et liés à certains comportements professionnels. Ce qu'elle ne permet pas de promettre : qu'un profil améliore à lui seul une équipe. L'intérêt tient à la conversation que le profil rend possible, avec un consultant, pas au profil seul. » [Sources à confirmer : voir section 3.]

---

### 2.2 Angle B : « L'humain »

**Idée.** Comprendre comment chacun fonctionne, pour travailler ensemble sans malentendu. Le ton est chaleureux sans familiarité, centré sur la personne qui répond : elle est un interlocuteur, pas un échantillon.
**Pour qui.** La personne invitée, avant tout ; le dirigeant sensible aux enjeux de climat d'équipe ; les responsables de formation.
**Risques.** Mièvrerie, ou promesse de « bien-être » que rien ne démontre. Si l'angle est trop doux, le responsable qui paie n'y voit pas de rigueur.
**Leviers.** Réciprocité, bénéfice immédiat, clarté sur l'effort, cohérence (petit engagement).

#### Titre d'accueil (3 variantes)

- B-T1 : « Comprendre comment chacun fonctionne, pour mieux travailler ensemble. »
- B-T2 : « Vous ne travaillez pas de la même façon. C'est une bonne nouvelle. »
- B-T3 : « Une façon de se dire, sans se juger. »

> Note : B-T2 emploie « bonne nouvelle », qui est une affirmation de valeur. Elle reste défendable (la diversité des styles n'est pas un défaut), mais elle déroge à la règle « décrire, ne jamais juger » de la voix actuelle. Décision du client.

#### Sous-titre (3 variantes)

- B-S1 : « Un questionnaire de 120 affirmations, sans limite de temps, proposé par Tenga Conseil. Il décrit vos tendances habituelles ; il ne vous classe pas. »
- B-S2 : « Chacun a sa manière de décider, de communiquer, de gérer la pression. Ce questionnaire aide à la nommer, et à en parler avec ses collègues. »
- B-S3 : « Vos réponses vous appartiennent. Elles servent d'abord à vous faire mieux connaître vos tendances. »

#### Bouton d'appel à l'action (3 variantes)

- B-B1 : « Commencer le questionnaire »
- B-B2 : « Accéder à mon espace »
- B-B3 : « Reprendre là où j'en étais »

#### Cinq blocs de la page d'accueil

1. **Se connaître.**
   « Chacun agit selon des tendances qu'il connaît mal. Le questionnaire les décrit en cinq grands domaines et trente facettes, dans un langage simple. »
2. **Se comprendre entre collègues.**
   « Une réunion qui s'éternise, un message jugé trop sec, une décision prise trop vite : bien des frictions viennent de façons différentes d'agir, pas de mauvaise volonté. Mettre des mots dessus apaise souvent la discussion. » [Affirmation générale d'expérience de conseil ; à rattacher au besoin à la littérature sur la conflictualité (non sourcée à ce jour).]
3. **Un profil, pas une étiquette.**
   « Aucun résultat n'est bon ou mauvais. Nous ne parlons jamais de « type » ni de « note ». Un domaine est une tendance, pas une identité. »
4. **Vos réponses sont à vous.**
   « [Activation : lot 1] Votre résultat individuel n'est visible que de vous, du consultant Tenga de votre organisation et de l'équipe d'administration de Tenga Conseil. Votre organisation ne reçoit que des synthèses de groupe. »
5. **Accompagné, pas seul avec un graphique.**
   « Un consultant Tenga vous restitue votre profil et répond à vos questions. Le résultat n'est pas un verdict ; c'est le début d'un échange. » [Activation : restitution = lot 6 pour le PDF ; l'entretien existe dès le lot 1.]

#### Texte d'introduction du questionnaire

« Merci de prendre ce temps. Voici 120 affirmations. Pour chacune, répondez comme vous êtes habituellement, pas comme vous aimeriez être. Il n'y a ni bonne ni mauvaise réponse : une réponse honnête est la plus utile, pour vous d'abord. Prenez le temps que vous voulez ; vous pouvez vous arrêter et reprendre plus tard. »

#### Message d'encouragement à mi-parcours

« La moitié est faite : 60 affirmations sur 120. Vous pouvez faire une pause, vos réponses sont conservées. »

#### Introduction de la page de résultat

« Voici votre profil. Lisez-le d'abord pour vous, avec curiosité : il décrit des tendances, pas des qualités ni des défauts. Rien ici ne vous classe, rien ne mesure vos compétences, rien n'est un diagnostic. Vous pourrez en parler avec le consultant Tenga qui vous restitue le résultat. »

#### Cinq descriptions courtes des domaines

- **Ouverture à l'expérience** : « Votre goût pour les idées nouvelles et l'imagination. Certaines personnes aiment explorer ; d'autres préfèrent ce qui a fait ses preuves. Les deux manières ont leur utilité. »
- **Conscienciosité** : « Votre façon de vous organiser et de tenir ce que vous entreprenez. Certains planifient tout ; d'autres improvisent mieux. »
- **Extraversion** : « La façon dont vous puisez votre énergie dans les échanges. Certains se ressourcent avec les autres ; d'autres, dans le calme. »
- **Agréabilité** : « Votre façon de coopérer, de faire confiance, de prendre soin des autres. Certains privilégient l'harmonie ; d'autres, la franchise. »
- **Névrosisme** : « La sensibilité aux émotions négatives et au stress, plus ou moins vive selon les personnes. C'est une tendance d'humeur ; ce n'est pas un diagnostic. »

#### E-mail d'invitation d'une campagne

Objet : « Une invitation de {organisation}, en confiance »

« Bonjour {prénom},

{organisation} a demandé à Tenga Conseil d'organiser un questionnaire de personnalité pour {groupe}. Une invitation à y répondre vous est adressée.

Ce que vous allez faire : lire 120 affirmations et dire dans quelle mesure elles vous décrivent. Il n'y a pas de bonne réponse et pas de limite de temps. Vous pouvez vous arrêter et reprendre.

Ce que nous tenons à vous dire d'abord : [Activation : lot 1] votre résultat individuel n'est visible que de vous, du consultant Tenga affecté à {organisation} et de l'équipe d'administration de Tenga Conseil. {organisation} ne reçoit que des synthèses de groupe. Le questionnaire ne mesure ni vos compétences ni votre valeur et n'est pas un diagnostic.

Quand vous serez prêt, ouvrez ce lien : {lien}

Une question avant de commencer ? Écrivez-nous à {email_contact}. Nous vous répondrons.

Cordialement,
Tenga Conseil »

#### E-mail de lien de connexion

Objet : « Votre lien pour retrouver votre espace »

« Bonjour,

Voici le lien pour vous connecter : {lien}

Il fonctionne une seule fois et reste valable {durée_de_validité}. Si vous l'ouvrez sur un autre appareil, entrez ce code : {code_à_6_chiffres}.

Ce lien n'a pas été demandé par vous ? Vous pouvez simplement ignorer ce message.

Tenga Conseil »

#### À propos de Tenga Conseil

« Tenga Conseil est un cabinet de conseil marocain. Nous accompagnons des organisations dans [à compléter par Tenga : domaines d'intervention]. Nous avons créé Tenga Assessments parce que nous voyons chaque jour combien les équipes gagnent à mieux se comprendre, et combien un outil mal utilisé peut blesser. Notre règle : décrire, ne jamais juger. Un consultant restitue chaque profil, et la personne reste la première destinataire de son résultat. »

#### FAQ (trois entrées)

**Est-ce que mon employeur voit mes réponses ?**
« Votre employeur ne voit pas votre résultat individuel. [Activation : lot 1] Il reçoit des synthèses de groupe, et seulement lorsqu'un nombre minimal de personnes ont répondu, pour qu'aucune moyenne ne permette de vous reconnaître. Le consultant Tenga de votre organisation, tiers de confiance, peut consulter votre profil pour vous le restituer ; chaque consultation est consignée dans un journal. Vous pouvez à tout moment télécharger vos données ou demander leur suppression. »

**Est-ce scientifique ?**
« Le questionnaire repose sur le modèle des cinq grands facteurs, l'un des plus étudiés en psychologie de la personnalité, et sur un inventaire publié et du domaine public. Il n'a pas pour but de vous évaluer ni de vous classer. Nous sommes honnêtes sur ses limites : il décrit ce que vous en dites vous-même ; certaines formulations ont été adaptées au contexte marocain et leur fiabilité reste à vérifier sur de nombreuses réponses. » [Sources à confirmer.]

**À quoi ça sert ?**
« À vous donner des mots pour décrire votre façon de travailler, et à ouvrir une conversation avec vos collègues. Beaucoup de personnes découvrent que ce qu'elles prenaient pour des désaccords étaient des façons différentes de faire. Ce n'est pas une promesse de résultat : c'est un support de dialogue. » [À rattacher à des retours mesurés des participants de Tenga dès les premières campagnes (idée M12). La phrase « beaucoup de personnes découvrent » est à supprimer tant qu'elle n'est pas observée.]

---

### 2.3 Angle C : « La décision »

**Idée.** Donner aux dirigeants des repères pour décider : composer une équipe, former, conduire un changement, parler à quelqu'un. Le questionnaire est un instrument de gouvernance humaine, restitué par un cabinet.
**Pour qui.** Le dirigeant, le directeur des ressources humaines, le sponsor d'un programme de transformation.
**Risques.** Faire croire que le profil « décide » : il ne le fait pas, et une promesse de performance non démontrée serait attaquable. Peut effrayer la personne invitée si l'on parle d'« équipe » comme d'un portefeuille. Il faut donc la rassurer par ailleurs (angle B dans les pages de la personne invitée).
**Leviers.** Aversion à la perte, autorité, ancrage, effet de cadrage.

#### Titre d'accueil (3 variantes)

- C-T1 : « Décider sur des repères, pas sur des impressions. »
- C-T2 : « Former, composer, accompagner : un langage commun pour vos équipes. »
- C-T3 : « Avant de réorganiser une équipe, regardez comment elle fonctionne. »

#### Sous-titre (3 variantes)

- C-S1 : « Tenga Conseil restitue à votre direction une lecture de groupe de la façon de travailler de vos équipes, fondée sur les cinq grands facteurs de la personnalité. Chaque personne reste protégée. »
- C-S2 : « Un questionnaire de 120 affirmations, une synthèse d'équipe anonymisée, un consultant pour en tirer des décisions. »
- C-S3 : « Une organisation décide mieux quand elle sait comment ses équipes ont tendance à agir. Tenga Assessments vous donne cette lecture, sans jamais exposer un individu. »

#### Bouton d'appel à l'action (3 variantes)

- C-B1 : « Demander une présentation »
- C-B2 : « Accéder à mon espace »
- C-B3 : « Commencer le questionnaire »

#### Cinq blocs de la page d'accueil

1. **L'enjeu.**
   « Une équipe mal composée, un changement mal compris, une formation qui rate sa cible : bien des décisions humaines se prennent sur une intuition. Tenga Assessments met des repères communs à la disposition de la direction. » [Aucun coût chiffré : voir note de risque.]
2. **Ce que vous obtenez.**
   « Une synthèse de groupe : la façon dont une équipe a tendance à fonctionner sur les cinq grands facteurs et trente facettes. Un entretien de restitution avec un consultant Tenga. Des pistes d'usage pour la formation, la composition d'équipe et l'accompagnement du changement. » [Activation : synthèse de groupe = lot 4 ; PDF = lot 6.]
3. **Ce que votre organisation ne voit pas.**
   « Aucun résultat individuel. Les synthèses de groupe ne sont produites qu'à partir d'un nombre minimal de participants. Ce principe protège la sincérité des réponses, donc la qualité de la lecture. » [Activation : lot 1 et lot 4.] (Argument : la confidentialité est ici un moyen de fiabilité, non une concession.)
4. **Un tiers de confiance.**
   « Tenga Conseil est le tiers entre votre direction et vos équipes. Le consultant restitue, explique et recadre. Il ne transmet rien d'individuel à l'organisation. »
5. **De la donnée à la décision.**
   « Quatre étapes : 1. Cadrer la question avec la direction. 2. Inviter les équipes et recueillir les réponses. 3. Restituer, en groupe puis individuellement. 4. En tirer des décisions avec un consultant. » (Frise. Voir format F3, section 3.)

#### Texte d'introduction du questionnaire

« Votre organisation a demandé à Tenga Conseil de réaliser cette lecture. Les 120 affirmations décrivent des façons d'agir ; répondez comme vous êtes habituellement. Il n'y a ni bonne ni mauvaise réponse. Votre résultat individuel ne sera pas transmis à votre direction. [Activation : lot 1] Prenez le temps qu'il vous faut : vous pouvez reprendre à tout moment. »

#### Message d'encouragement à mi-parcours

« Moitié du questionnaire : 60 affirmations sur 120. Votre sincérité est ce qui rend la lecture utile à votre équipe. »

> Note : cette formule rend la personne comptable de la qualité du groupe, ce qui peut peser. Variante plus douce : « Moitié du questionnaire. Vous pouvez faire une pause quand vous le souhaitez. »

#### Introduction de la page de résultat

« Voici votre profil individuel, que vous êtes la première personne à lire, avant le consultant Tenga de votre organisation. [Activation : lot 1] Il décrit vos tendances habituelles ; il ne mesure pas vos compétences. Il servira, avec ceux de vos collègues, à produire une lecture de groupe pour votre organisation, sans que votre nom y figure. »

#### Cinq descriptions courtes des domaines

- **Ouverture à l'expérience** : « Curiosité et goût de la nouveauté. En équipe, une forte présence de cette tendance oriente vers l'exploration ; une faible, vers la stabilité des méthodes. Les deux ont leur place. »
- **Conscienciosité** : « Organisation et persévérance. En équipe, elle se voit dans la planification, le respect des échéances et la rigueur du suivi. »
- **Extraversion** : « Énergie dans les échanges et l'action. En équipe, elle influence le rythme des réunions, la prise de parole et la visibilité des idées. »
- **Agréabilité** : « Coopération et confiance. En équipe, elle se lit dans la manière d'aborder le désaccord, entre recherche d'harmonie et franchise. »
- **Névrosisme** : « Sensibilité au stress et aux émotions négatives. En équipe, elle éclaire la façon de vivre la pression et le changement ; ce n'est pas un diagnostic. »

#### E-mail d'invitation d'une campagne

Objet : « {organisation} : questionnaire de personnalité, une invitation personnelle »

« Bonjour {prénom},

La direction de {organisation} a confié à Tenga Conseil une lecture de la façon dont les équipes travaillent. Une invitation personnelle à y participer vous est adressée.

Le principe : 120 affirmations, sans limite de temps, avec reprise possible. Les réponses de chacun servent à produire une lecture de groupe ; la direction ne reçoit jamais de résultat individuel. [Activation : lots 1 et 4]

Votre résultat vous est restitué, à vous, avec un consultant Tenga. Il décrit des tendances ; il ne mesure ni les compétences ni la performance, et n'est pas utilisé pour une décision vous concernant.

Pour participer : {lien}

Vos questions sur la confidentialité sont légitimes : la réponse détaillée figure sur {lien_faq}, ou écrivez-nous à {email_contact}.

Tenga Conseil »

> Note : la phrase « n'est pas utilisé pour une décision vous concernant » est un engagement fort. Il suppose un engagement contractuel de l'organisation cliente, à faire valider par un juriste (décision à prendre D5).

#### E-mail de lien de connexion

Objet : « Votre accès à Tenga Assessments »

« Bonjour,

Pour accéder à votre espace : {lien}

Ce lien est à usage unique et reste valable {durée_de_validité}. Sur un autre appareil, utilisez ce code : {code_à_6_chiffres}.

Vous n'êtes pas à l'origine de cette demande ? Aucune action n'est nécessaire.

Tenga Conseil »

#### À propos de Tenga Conseil

« Tenga Conseil est un cabinet de conseil marocain. Il accompagne des dirigeants dans [à compléter par Tenga : domaines d'intervention]. Tenga Assessments répond à une question que les dirigeants nous posent souvent : comment mes équipes ont-elles tendance à fonctionner, et que faire de cette lecture ? Nous restituons, nous expliquons et nous recadrons. Nous ne remettons jamais à une organisation le résultat individuel d'un de ses collaborateurs. »

#### FAQ (trois entrées)

**Est-ce que mon employeur voit mes réponses ?**
« Non. [Activation : lot 1] Votre employeur ne reçoit que des synthèses de groupe, à partir d'un nombre minimal de participants. Le consultant Tenga de votre organisation peut consulter votre profil pour vous le restituer ; chaque consultation est consignée. Ce cloisonnement existe pour deux raisons : vous protéger, et garantir que les réponses sont sincères. »

**Est-ce scientifique ?**
« Le questionnaire s'appuie sur le modèle des cinq grands facteurs, largement étudié en psychologie de la personnalité, et sur l'IPIP-NEO-120 de John A. Johnson (2014), du domaine public. Pour une direction, la bonne question est : à quoi la littérature permet-elle de s'attendre, et à quoi non ? La page Méthode et références y répond, sources à l'appui. » [Sources à confirmer.]

**À quoi ça sert ?**
« À donner à la direction des repères communs sur la façon dont les équipes ont tendance à agir, pour préparer une formation, composer une équipe, accompagner un changement. Le questionnaire ne dit pas qui recruter, ni qui promouvoir, et nous recommandons de ne pas l'utiliser ainsi. » [Sources à confirmer pour tout usage « composer une équipe » : voir R6 en section 3.]

---

### 2.4 Angle D : l'audacieux, « La conversation qui manque »

**Idée.** Provocation maîtrisée : l'équipe qui travaille ensemble depuis des années ne s'est jamais décrite. Le questionnaire n'est pas un test mais le prétexte d'une conversation absente. Le ton assume un point de vue, des phrases courtes, un peu de tension.
**Pour qui.** Dirigeants à l'aise avec un discours direct ; responsables de transformation ; communication de marque pour un public qui lit LinkedIn.
**Risques.** Trop direct pour la personne invitée qui n'a rien demandé (« vous ne vous êtes jamais dit »). Risque de promesse implicite de transformation. À réserver aux pages visibles du responsable, jamais à celles de la personne invitée. Demande l'accord explicite du client sur le ton.
**Leviers.** Effet Zeigarnik (la conversation inachevée reste en tête), dissonance, aversion à la perte (ce que le silence coûte), cadrage.

#### Titre d'accueil (3 variantes)

- D-T1 : « Vous travaillez ensemble depuis des années. Vous ne vous êtes jamais vraiment décrits. »
- D-T2 : « Cent vingt phrases pour ouvrir la conversation que votre équipe n'a jamais eue. »
- D-T3 : « Le malentendu coûte plus cher que le désaccord. »

> Notes : D-T3 est une formule de marque, mais elle affirme un coût. Elle est **non démontrée** ; la garder impose de la présenter comme une conviction du cabinet (« Nous le constatons ») et non comme un fait. D-T1 et D-T2 ne contiennent aucune affirmation chiffrée.

#### Sous-titre (3 variantes)

- D-S1 : « On sait qui fait quoi. On ne sait pas toujours pourquoi chacun le fait ainsi. Tenga Assessments, c'est cent vingt affirmations, un consultant, et la fin de quelques malentendus. »
- D-S2 : « Un questionnaire de personnalité n'est pas un verdict. C'est un prétexte pour dire ce que l'on n'ose pas dire à voix haute. »
- D-S3 : « Cinq dimensions, trente facettes, et une question : comment travaillons-nous vraiment ensemble ? »

> Note : « la fin de quelques malentendus » (D-S1) est une promesse de résultat non démontrée. Variante prudente : « et de quoi parler autrement ».

#### Bouton d'appel à l'action (3 variantes)

- D-B1 : « Ouvrir la conversation »
- D-B2 : « Commencer le questionnaire »
- D-B3 : « Demander une présentation »

#### Cinq blocs de la page d'accueil

1. **Le silence.**
   « Dans la plupart des équipes, personne n'a jamais dit à voix haute comment il préfère travailler. Chacun suppose. »
2. **Le malentendu.**
   « Ce que l'on prend pour du désintérêt est parfois du recul. Ce que l'on prend pour de l'autorité est parfois de la rigueur. Ce que l'on prend pour de la froideur est parfois de la réserve. Il suffit souvent de savoir. » [Exemples illustratifs du cabinet, non issus d'une étude ; à marquer comme tels.]
3. **La conversation.**
   « Cent vingt affirmations, cinq dimensions, trente facettes. Un langage pour dire les choses simplement. Un consultant pour tenir la conversation à une juste hauteur. »
4. **La règle du jeu.**
   « Votre résultat individuel reste le vôtre. [Activation : lot 1] Votre organisation reçoit des synthèses de groupe et rien d'autre. »
5. **Ce n'est pas un verdict.**
   « Pas de diagnostic, pas de classement, pas de bonne note. Une photographie de tendances, à regarder ensemble. Pas un outil de tri. »

#### Texte d'introduction du questionnaire

« Cent vingt phrases, aucun piège. Dites si elles vous ressemblent. Pas comme vous aimeriez être : comme vous êtes. Prenez le temps. Personne ne vous attend. »

> Note : registre volontairement court ; « Personne ne vous attend » est une assurance (pas de limite de temps), exacte aujourd'hui.

#### Message d'encouragement à mi-parcours

« À mi-chemin. Le plus honnête reste à venir. »

> Note : ironique, mais « le plus honnête » peut inquiéter. Variante : « À mi-chemin. Soixante réponses, soixante autres à venir. »

#### Introduction de la page de résultat

« Voici ce que vous avez dit de vous. Rien de plus : une photographie de tendances, pas un jugement. À regarder d'abord seul, puis à discuter avec un consultant. Aucun domaine n'est bon ou mauvais. »

#### Cinq descriptions courtes des domaines

- **Ouverture à l'expérience** : « Le goût de l'inconnu, ou celui du connu. »
- **Conscienciosité** : « La manière de tenir ce que l'on a promis. »
- **Extraversion** : « D'où vient votre énergie : des autres, ou de vous. »
- **Agréabilité** : « Entre harmonie et franchise, où vous placez-vous d'habitude ? »
- **Névrosisme** : « La sensibilité au stress. Une tendance, pas un diagnostic. »

#### E-mail d'invitation d'une campagne

Objet : « Une conversation que {organisation} souhaite ouvrir »

« Bonjour {prénom},

{organisation} a demandé à Tenga Conseil d'ouvrir une conversation sur la façon dont les équipes travaillent. La vôtre commence par une invitation à répondre à 120 affirmations.

Pas de bonne réponse. Pas de limite de temps. Pas de résultat individuel pour votre direction. [Activation : lot 1]

Votre résultat vous est restitué à vous, avec un consultant Tenga.

Quand vous voulez : {lien}

Tenga Conseil »

#### E-mail de lien de connexion

Objet : « Votre lien, une seule fois »

« Bonjour,

{lien}

Ce lien ne fonctionne qu'une fois et reste valable {durée_de_validité}. Sur un autre appareil : {code_à_6_chiffres}.

Ce n'était pas vous ? Ignorez ce message.

Tenga Conseil »

#### À propos de Tenga Conseil

« Tenga Conseil est un cabinet de conseil marocain. Nous aimons les questions que personne ne pose en réunion. Tenga Assessments en est une : comment travaillons-nous vraiment ensemble ? Nous avons choisi un instrument sérieux, public et vérifiable, et nous nous interdisons de l'employer pour trier des personnes. » [Compléter : domaines d'intervention, par Tenga.]

#### FAQ (trois entrées)

**Est-ce que mon employeur voit mes réponses ?**
« Non. [Activation : lot 1] Il voit des synthèses de groupe, jamais un résultat individuel. C'est la règle du jeu, et nous la tenons même quand un client insiste. » [À valider : « même quand un client insiste » est un engagement de Tenga, à confirmer par Amine.]

**Est-ce scientifique ?**
« Le modèle des cinq grands facteurs est l'un des plus étudiés en psychologie de la personnalité. Notre questionnaire est l'IPIP-NEO-120 de John A. Johnson, du domaine public, publié en 2014. Pas de formule magique : un instrument vérifiable, avec ses limites écrites sur notre page Méthode. » [Sources à confirmer.]

**À quoi ça sert ?**
« À mettre des mots sur la manière dont chacun travaille, pour que l'équipe en parle. Ce n'est pas un oracle : un profil ne dit pas ce que vous valez, ni ce que vous ferez. Il ouvre une discussion que le quotidien n'ouvre pas. »

---

### 2.5 Recommandation sur les angles (étiquetée)

**Recommandation.** Ne pas choisir un seul angle pour tout le site. Les deux publics ont des besoins opposés. Proposition de panachage :

| Surface | Angle recommandé | Pourquoi |
|---|---|---|
| Page d'accueil (le responsable y arrive en premier) | **C** pour le titre et la promesse, **A** pour la preuve en bas de page | Le dirigeant achète une décision, puis vérifie la rigueur |
| E-mail d'invitation, introduction du questionnaire, FAQ confidentialité | **B** | La personne invitée a besoin d'être mise en confiance avant tout |
| Page « Méthode et références », À propos | **A** | Autorité et transparence |
| Newsletter, LinkedIn, conférences | **D**, avec modération | La provocation sert la notoriété, pas la passation |

Angle D : excellent pour des supports de notoriété ; à écarter pour toute page que la personne invitée lit avant de répondre.

---

### 2.6 Version arabe et anglaise des éléments d'accueil de l'angle recommandé (C)

> Tous les textes arabes sont **à relire par un locuteur natif** avant usage (arabe moderne standard, rédigé pour un lecteur marocain, impératifs évités selon `voix-de-marque.md` § 2). Chiffres occidentaux (120). Marque en caractères latins.

**Titre (promesse PR2)**

- AR : « قراراتٌ تقوم على معطيات، لا على انطباعات » *(à relire par un locuteur natif)*
- AR, variante : « فريقٌ يفهم أسلوب عمله، يقرّر بوضوح أكبر » *(à relire par un locuteur natif)*
- EN : "Decisions built on reference points, not impressions."
- EN, variant: "Give your teams a common language for working together."

**Sous-titre**

- AR : « استبيان شخصية من 120 عبارة يقدّمه Tenga Conseil للمؤسسات التي يرافقها. يمنح إدارتكم قراءةً جماعية لطريقة اشتغال الفرق، دون أن يُكشف لها أيّ ملف فردي. » *(à relire par un locuteur natif)*
- EN : "A 120-statement personality questionnaire offered by Tenga Conseil to the organisations it advises. It gives leadership a group-level reading of how teams tend to work, without ever exposing an individual's results."

**Bouton d'appel à l'action**

- AR (responsable) : « طلب عرض تقديمي » *(à relire par un locuteur natif)*
- AR (personne invitée) : « بدء الاستبيان » (déjà retenu dans `textes.md`)
- EN (leader): "Request a presentation"
- EN (invited person): "Start the questionnaire"

Notes de traduction : en arabe, « repères » est rendu par « معطيات » (données, éléments d'appui) et non par une calque ; la première variante évite « اتخاذ القرار » en cascade. « Lecture de groupe » : « قراءة جماعية ». « Dossier individuel » : « ملف فردي ». L'anglais emploie « organisations » (orthographe britannique, cohérente avec « tenga.ai-mpower.com », à confirmer par le client).

---

## 3. Preuves de l'utilité des assessments

**Statut.** Le dossier de preuves (`docs/design/dossier-preuves.md`, 20 octobre 2026) existe désormais et a été rapproché de chaque phrase ci-dessous. À la rédaction initiale, les références étaient données de mémoire, par auteurs, année et revue, avec la mention « source à confirmer » ; elles sont maintenant remplacées par les références lues dans le dossier, ou marquées « pas de fiche : non démontré ». Aucun chiffre n'est repris dans les phrases de site : un chiffre n'entre dans un texte qu'après lecture de la source par l'auteur du dossier, et il figure ici dans les fiches seulement.

**Ce que la littérature permet de dire, et ce qu'elle ne permet pas.** Elle permet de dire que les traits existent, sont mesurables, relativement stables, et liés à des comportements professionnels et relationnels, avec des ordres de grandeur le plus souvent modestes. Elle ne permet pas de promettre qu'un profil restitué améliore une équipe (preuve plus indirecte), ni qu'un questionnaire auto-déclaré est un outil de sélection fiable (point débattu). Le texte le plus convaincant est celui qui dit les deux.

### 3.1 Phrases de site prêtes à l'emploi

Pour chaque phrase : la phrase proposée (inchangée), les références d'origine, les fiches P du dossier de preuves qui la soutiennent (numéro, mode de lecture, état des preuves, niveau de confiance), la réserve, puis, s'il y en a un, l'écart au dossier avec une reformulation « proposition ». Les DOI sont ceux des fiches. « Résumé éditeur » : le corps de l'article n'a pas été lu. « Pas de fiche : non démontré » : le dossier n'a rien sur cette référence ni sur cette idée.

**R1.** « La structure en cinq grands facteurs a été retrouvée dans de nombreuses langues et cultures. »

- Références d'origine : McCrae et Costa, 1997, *American Psychologist* ; Goldberg, 1990, *Journal of Personality and Social Psychology*. **Aucune des deux n'a de fiche : non démontré pour ces deux références.**
- Fiches qui soutiennent la phrase :
  - **P26** (McCrae, Terracciano et coll., 2005a, *Journal of Personality and Social Psychology*, 88(3), https://doi.org/10.1037/0022-3514.88.3.547) : résumé éditeur ; preuve partielle ; confiance moyenne. Chiffres lus : 50 cultures, 11 985 cibles ; structure américaine « clairement répliquée dans la plupart des cultures et reconnaissable dans toutes ».
  - **P27** (McCrae, Terracciano, 2005b, *Journal of Personality and Social Psychology*, 89(3), https://doi.org/10.1037/0022-3514.89.3.407) : résumé éditeur ; preuve partielle ; confiance moyenne. Chiffres lus : 51 cultures, N = 12 156 ; équivalence d'échelle « grossière ».
  - **P28** (Schmitt, Allik, McCrae, Benet-Martínez, 2007, *Journal of Cross-Cultural Psychology*, https://doi.org/10.1177/0022022106297299) : résumé éditeur ; preuve partielle ; confiance moyenne. Chiffres lus : 28 langues, 17 837 personnes, 56 nations ; structure « robuste dans les grandes régions du monde ».
- Réserve (confirmée par le dossier) : **P33** (pas de preuve trouvée) : aucune étude d'invariance de mesure de l'IPIP-NEO-120 pour le Maroc, l'arabe ou le français marocains. **P30** (Chraibi et coll., 2025, 1 537 personnes au Maroc, BFI à 44 items, résumé éditeur, preuve partielle, confiance moyenne à faible) concerne un autre questionnaire. P26 repose sur des évaluations de tiers par des étudiants, non sur des auto-questionnaires en entreprise.
- Écart au dossier de preuves : les deux références citées (McCrae et Costa 1997 ; Goldberg 1990) ne figurent pas au dossier ; ce sont P26, P27 et P28 qui soutiennent la phrase, et leur qualificatif est « dans la plupart des cultures » et « équivalence grossière ».
- Proposition de référence : McCrae et Terracciano (2005), Schmitt et coll. (2007). Proposition de phrase, plus exacte : « La structure en cinq grands facteurs a été retrouvée dans la plupart des cultures étudiées, dans des dizaines de langues. »

**R2.** « Le questionnaire reprend l'IPIP-NEO-120, publié par John A. Johnson en 2014 et placé dans le domaine public. »

- Référence vérifiée : John A. Johnson, « Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120 », *Journal of Research in Personality*, 51, 2014, p. 78-89. https://doi.org/10.1016/j.jrp.2014.05.003. Le volume et les pages, à vérifier dans la version précédente, sont confirmés.
- Fiches : **P34** (texte intégral ; preuve forte pour les propriétés psychométriques de base en anglais ; confiance élevée) et **P33 bis** (page web du site officiel https://ipip.ori.org/ ; preuve forte ; confiance élevée ; « The items and scales are in the public domain »).
- Chiffres lus (P34, non repris dans la phrase) : 120 items, 30 facettes ; alphas des facettes de 0,63 à 0,88 ; corrélation de 0,66 avec le NEO PI-R (0,91 corrigée de l'imprécision).
- Réserve (confirmée) : l'instrument mesure des facettes proches de celles du NEO PI-R sans être celui-ci ; r = 0,66 est la valeur lue. Le site de l'IPIP déclare le domaine public mais ne fournit pas d'avis juridique (P33 bis). L'auteur écrit que l'outil convient à la recherche mais « probablement » pas à des décisions importantes sur des individus (P34).

**R3.** « Les traits de personnalité sont relativement stables à l'âge adulte, tout en évoluant lentement avec l'expérience. »

- Références d'origine : Roberts et DelVecchio, 2000, *Psychological Bulletin* ; Roberts, Walton et Viechtbauer, 2006, *Psychological Bulletin*.
- **Pas de fiche : non démontré.** Aucune de ces deux références n'est au dossier, et aucune fiche ne mesure la stabilité des traits. Le seul travail du dossier sur le changement de traits est **P20** (Roberts et coll., 2017, *Psychological Bulletin*, https://doi.org/10.1037/bul0000088 ; résumé éditeur ; preuve partielle ; confiance moyenne : 207 études, d = 0,37 en moyenne sur 24 semaines pour des interventions, principalement cliniques), qui ne dit rien de la stabilité naturelle.
- Réserve : aucun chiffre de stabilité à citer. La même idée figure dans la section 2 (angle A bloc 3 et FAQ, angle B FAQ), dans le texte F1 et aux affirmations 5 et 23 de la section 5.

**R4.** « Parmi les cinq facteurs, la conscienciosité est celui dont le lien avec la performance professionnelle est le plus régulièrement observé ; l'ampleur de ce lien est modeste. »

- Références vérifiées :
  - **P1** : Sackett, Zhang, Berry, Lievens, « Revisiting meta-analytic estimates of validity in personnel selection », *Journal of Applied Psychology*, 107(11), 2022, p. 2040-2068, https://doi.org/10.1037/apl0000994 (texte intégral ; preuve forte pour une association positive et modeste ; confiance élevée).
  - **P2** : Barrick, Mount, Judge, 2001, *International Journal of Selection and Assessment*, 9, p. 9-30, https://doi.org/10.1111/1468-2389.00160 (résumé éditeur ; preuve forte pour la direction de l'effet ; confiance moyenne à élevée).
  - **P5** : Barrick, Mount, 1991, *Personnel Psychology*, https://doi.org/10.1111/j.1744-6570.1991.tb00688.x (résumé éditeur ; preuve partielle : direction, sans grandeur lue ; confiance moyenne).
  - **P4** : Judge, Rodell, Klinger, Simon, Crawford, 2013, *Journal of Applied Psychology*, 98(6), p. 875-925, https://doi.org/10.1037/a0033901 (résumé éditeur ; preuve forte, effet modeste).
- Chiffres lus, non repris dans la phrase : conscienciosité 0,19 (mesures générales) à 0,25 (mesures contextualisées au travail) ; les quatre autres traits 0,05 à 0,10 (mesures générales) ; 0,19 correspond à environ 3,6 % de variance partagée (calcul du dossier) ; écart type résiduel 0,15 (à contrôler, voir « État de la vérification »).
- « Modeste » : **confirmé par P1** (texte intégral). « Le plus régulièrement observé » : confirmé par P5 (« consistent relations with all job performance criteria for all occupational groups ») et par P1 (0,19 contre 0,05 à 0,10 pour les autres traits).
- Réserve : la grandeur dépend des corrections statistiques (0,31 chez Schmidt et Hunter 1998 ; 0,19 chez Sackett et coll. ; 0,26 corrigée par Judge et coll. 2013) ; ne citer aucune de ces valeurs sans préciser l'étude. Aucun écart sur la phrase telle qu'écrite.

**R5.** « Les traits sont associés à la façon dont une personne émerge comme leader et est perçue comme efficace. »

- Référence vérifiée : **P15** : Timothy A. Judge, Joyce E. Bono, Remus Ilies, Megan W. Gerhardt, *Journal of Applied Psychology*, 87(4), 2002, p. 765-780, https://doi.org/10.1037/0021-9010.87.4.765 ; résumé PubMed https://pubmed.ncbi.nlm.nih.gov/12184579/. Résumé éditeur ; preuve forte pour l'association ; confiance moyenne à élevée.
- Chiffres lus : 73 échantillons, 222 corrélations ; extraversion 0,31, conscienciosité 0,28, ouverture 0,24, névrosisme −0,24, agréabilité 0,08 ; corrélation multiple 0,48 (environ 23 % de variance, calcul du dossier).
- Réserve : corrélation, non causalité ; pas de preuve trouvée dans le résumé pour un effet causal d'un test.
- Écart au dossier de preuves (P15) : la phrase écrit « perçue comme efficace ». Le dossier lit « leadership » (émergence et efficacité) sans avoir lu les coefficients séparés pour l'émergence et pour l'efficacité, ni la part des mesures d'auto-évaluation ; l'émergence (être perçu comme leader) est un critère différent de l'efficacité réelle. Le qualificatif « perçue » n'est donc pas confirmé pour l'efficacité.
- Proposition : « Les traits sont associés à l'émergence d'un leader et à l'efficacité du leadership ; il s'agit d'une association, non d'une cause. »

**R6.** « La composition d'une équipe, en termes de traits, est liée à son fonctionnement, selon la tâche à accomplir. »

- Références d'origine : Barrick, Stewart, Neubert et Mount, 1998, *Journal of Applied Psychology* ; Bell, 2007, *Journal of Management*. **Barrick, Stewart, Neubert et Mount 1998 n'a pas de fiche.**
- Fiches qui soutiennent la phrase :
  - **P11** : Suzanne T. Bell, « Deep-level composition variables as predictors of team performance: a meta-analysis », ***Journal of Applied Psychology***, 92(3), 2007, p. 595-615, https://doi.org/10.1037/0021-9010.92.3.595 ; PubMed https://pubmed.ncbi.nlm.nih.gov/17484544/. Résumé éditeur ; preuve partielle, contradictoire entre laboratoire (effets négligeables) et terrain (agréabilité minimale d'équipe, conscienciosité et ouverture moyennes « strong predictors ») ; confiance moyenne. Aucun coefficient lu.
  - **P12** : Peeters, van Tuijl, Rutte, Reymen, 2006, *European Journal of Personality*, https://doi.org/10.1002/per.588 (résumé éditeur ; preuve partielle ; confiance moyenne à élevée). Chiffres lus : agréabilité moyenne ρ = 0,24, conscienciosité moyenne ρ = 0,20 ; variabilité de l'agréabilité ρ = −0,12 et de la conscienciosité ρ = −0,24 ; 106 à 527 équipes.
  - **P13** : Prewett et coll., 2009, *Human Performance*, https://doi.org/10.1080/08959280903120253 (résumé éditeur ; preuve partielle) : le lien dépend du critère, du type de tâche et du mode d'agrégation, ce qui soutient « selon la tâche à accomplir ».
  - **P14** : Mount, Barrick, Stewart, 1998, *Human Performance*, https://doi.org/10.1080/08959285.1998.9668029 (résumé éditeur ; preuve partielle) : 11 études, N = 1 586, performance individuelle et non d'équipe.
- Réserve : effets variables selon la tâche et le niveau d'analyse ; à ne pas transformer en recette.
- Écart au dossier de preuves (P11) : Bell (2007) est publié dans le *Journal of Applied Psychology*, pas dans le *Journal of Management* ; l'article cité « Barrick, Stewart, Neubert et Mount, 1998 » n'est pas au dossier (le dossier contient Mount, Barrick et Stewart 1998, article différent, P14). Le chiffre ρ = 0,34 pour l'agréabilité attribué à Bell n'a pas été retrouvé et n'est pas retenu.
- Proposition de références : Bell (2007), *Journal of Applied Psychology* ; Peeters et coll. (2006) ; Prewett et coll. (2009). La phrase elle-même est soutenue en l'état.

**R7.** « Les traits sont liés à des résultats de vie importants : relations, santé, parcours professionnel. »

- Référence vérifiée : **P10** : Roberts, Kuncel, Shiner, Caspi, Goldberg, *Perspectives on Psychological Science*, 2007, https://doi.org/10.1111/j.1745-6916.2007.00047.x. Résumé éditeur ; preuve partielle (hors périmètre emploi) ; confiance moyenne. Aucun coefficient lu.
- Citation lue : l'ampleur des effets des traits sur la mortalité, le divorce et la réussite professionnelle est « indistinguishable » de celle du statut socio-économique et des capacités cognitives.
- Réserve (confirmée) : éviter toute comparaison chiffrée.
- Écart au dossier de preuves (P10) : le dossier lit trois critères, **mortalité, divorce, réussite professionnelle**. « Relations » et « santé » sont des généralisations de « divorce » et de « mortalité » que le résumé lu ne formule pas.
- Proposition : « Les traits sont liés à des résultats de vie importants, dont la mortalité, le divorce et la réussite professionnelle, avec une ampleur du même ordre que celle du statut socio-économique et des capacités cognitives. »

**R8.** « Le questionnaire repose sur ce que vous dites de vous ; l'avis de proches ou de collègues apporte un second éclairage. »

- Référence d'origine : Connelly et Ones, 2010, *Psychological Bulletin*.
- **Pas de fiche : non démontré.** Aucune fiche ne porte sur la validité des évaluations par des tiers. Contact indirect, à ne pas surinterpréter : P34 (texte intégral) rapporte des corrélations de domaines avec des évaluations par des proches (BFI : 0,48 et 0,46 ; Mini-Markers : 0,43 et 0,40) sans que le dossier en tire la conclusion de la phrase.
- Réserve : soutient l'idée d'un retour à 360 degrés, non proposé aujourd'hui. P17 (Smither, London, Reilly, 2005, 24 études, résumé éditeur) indique que l'amélioration après un retour multisource est « généralement petite ».

**R9.** « Lorsque l'enjeu est élevé, par exemple en recrutement, des réponses peuvent être embellies ; c'est pourquoi nous ne recommandons pas ce questionnaire pour sélectionner des candidats. »

- Fiches :
  - **P9** : Birkeland, Manson, Kisamore, Brannick, Smith, 2006, *International Journal of Selection and Assessment*, https://doi.org/10.1111/j.1468-2389.2006.00354.x (résumé éditeur ; preuve forte que les scores montent en contexte de candidature, partielle sur la conséquence pour la validité ; confiance moyenne à élevée). Chiffres lus : 33 études ; candidats contre non-candidats, d = 0,44 (stabilité émotionnelle), 0,45 (conscienciosité), 0,11 (extraversion), 0,13 (ouverture).
  - **P7** : Morgeson et coll., 2007, *Personnel Psychology*, https://doi.org/10.1111/j.1744-6570.2007.00089.x (résumé éditeur ; preuve partielle ; opinion d'experts) : la validité des tests auto-déclarés est « très faible » pour la sélection à enjeu élevé.
  - **P8** : Ones, Dilchert, Viswesvaran, Judge, 2007, *Personnel Psychology*, https://doi.org/10.1111/j.1744-6570.2007.00099.x (résumé éditeur ; preuve partielle) : la distorsion n'annule pas, selon eux, les propriétés psychométriques.
  - **P34** (texte intégral) : l'auteur de l'IPIP-NEO-120 écrit que l'outil « probablement » ne devrait pas servir à des décisions importantes sur des individus.
- Réserve (confirmée) : le débat P7/P8 reste ouvert dans les sources lues ; P9 compare des groupes et ne mesure pas le biais individuel. « Nous ne recommandons pas » est un engagement de Tenga, non un résultat de recherche (décision D7).

**R10.** « Un profil décrit une tendance habituelle, pas un destin : des personnes peuvent faire évoluer volontairement certains de leurs traits. »

- Référence d'origine : Hudson et Fraley, 2015, *Journal of Personality and Social Psychology*. **Pas de fiche pour cette référence : non démontré.**
- Appui indirect : **P20** (Roberts et coll., 2017, voir R3).
- Écart au dossier de preuves (P20) : P20 montre des changements de traits associés à des **interventions**, principalement cliniques, d = 0,37 en moyenne sur 24 semaines, surtout en stabilité émotionnelle ; il ne montre pas que des personnes font évoluer « volontairement » leurs traits par elles-mêmes, et il est hors périmètre entreprise. L'ampleur (0,37) ne doit pas être suggérée.
- Proposition : « Des interventions, le plus souvent thérapeutiques, sont associées à des changements mesurables de certains traits, principalement la stabilité émotionnelle. Un profil décrit une tendance habituelle, non un destin. »

**R11.** « L'effet des traits sur la performance dépend de la situation de travail. »

- Référence d'origine : Judge et Zapata, 2015, *Academy of Management Journal*. **Pas de fiche pour cette référence : non démontré.**
- Appuis indirects, pour la même idée : **P1** (texte intégral) : conscienciosité 0,25 en mesure contextualisée au travail contre 0,19 en mesure générale (extraversion 0,21 contre 0,10) ; **P13** (résumé éditeur) : lien dépendant du critère, du flux de travail et de l'agrégation ; **P14** (résumé éditeur) : stabilité émotionnelle et agréabilité plus liées à la performance dans le travail en équipe que dans les interactions à deux.
- Réserve : appuie l'honnêteté du « ça dépend » ; les appuis ci-dessus sont d'autres études que celle citée.
- Proposition de référence (appui lu, à adopter ou écarter) : Sackett et coll. (2022) au lieu de Judge et Zapata (2015).

**R12.** « Les traits de personnalité ne sont qu'un élément parmi d'autres pour comprendre le travail : les compétences, l'expérience et le contexte comptent aussi. »

- Références vérifiées : **P6** : Schmidt et Hunter, « The validity and utility of selection methods in personnel psychology », *Psychological Bulletin*, 1998, https://doi.org/10.1037/0033-2909.124.2.262 (résumé éditeur) et Sackett et coll. 2022 (P1, texte intégral). Preuve forte pour le classement relatif ; confiance élevée.
- Chiffres lus (Sackett 2022, tableau 3), non repris dans la phrase : entretien structuré 0,42 ; tests de connaissances du poste 0,40 ; biodata 0,38 ; échantillons de travail 0,33 ; tests d'aptitude cognitive 0,31 ; tests d'intégrité 0,31 ; centres d'évaluation 0,29 ; conscienciosité contextualisée 0,25 ; conscienciosité générale 0,19 ; entretien non structuré 0,19.
- Réserve (confirmée) : ne pas reprendre les valeurs de Schmidt et Hunter (0,51 pour l'entretien structuré, 0,31 pour la conscienciosité), révisées à la baisse par Sackett et coll. Le dossier chiffre les compétences et les méthodes de sélection, non « l'expérience » ni « le contexte » en tant que tels (pour le contexte, voir R11 : appuis indirects seulement). Aucun écart sur les chiffres.

**Recommandation.** Pour l'accueil : R1, R3, R4 (avec « modeste ») et R12. Pour la FAQ « limites » : R8, R9, R10, R11. Pour les responsables : R5 et R6, présentés comme des pistes d'usage et non des résultats garantis.

### 3.2 Formats de preuve (au choix du client)

| Format | Principe | Effort | Réserve |
|---|---|---|---|
| F1. Bloc « Ce que dit la recherche » sur l'accueil | Trois phrases (R1, R3, R4) avec un lien « Méthode et références » | Faible | Chaque phrase doit pointer vers sa fiche P |
| F2. Page « Méthode et références » | Instrument, modèle, domaines et facettes, adaptation marocaine, limites, bibliographie complète | Moyen | Une page qui s'affiche peu mais fait autorité (ancrage) |
| F3. Frise « de la donnée à la décision » | Cinq étapes visuelles : cadrer, inviter, répondre, restituer, décider | Moyen | La frise décrit un processus, pas un résultat |
| F4. Comparaison avec les pratiques d'évaluation courantes | Tableau qualitatif : entretien, test d'aptitudes, retour à 360 degrés, questionnaire de personnalité ; ce que chacun apporte, ses limites | Moyen | À rédiger sur sources lues ; ne jamais comparer nommément à un concurrent sans source |
| F5. FAQ « limites » | Cinq questions franches (auto-déclaration, falsification, culture, causalité, changement) | Faible | Pratfall effect : avouer une limite renforce la confiance |
| F6. Spécimen de restitution fictif | Un rapport d'équipe d'exemple, valeurs inventées et déclarées telles | Moyen | Légende « Exemple, valeurs fictives » déjà utilisée dans la direction visuelle |
| F7. Charte d'usage éthique | « Nos engagements » en sept lignes (ex. : pas de tri de candidats, pas de résultat individuel à l'organisation) | Faible | Chaque engagement doit être tenu en production |
| F8. Baromètre d'utilité Tenga | Après les premières campagnes, publier ce que les participants disent de la restitution, avec taille d'échantillon | Élevé (délai) | Seule preuve propre à Tenga ; exige un volume suffisant |

#### Texte prêt à coller pour F1

Titre : « Ce que dit la recherche »

« Le modèle des cinq grands facteurs est étudié depuis des décennies. La structure en cinq facteurs a été retrouvée dans de nombreuses langues et cultures. Les traits sont relativement stables à l'âge adulte. Parmi eux, la conscienciosité est le facteur dont le lien avec la performance professionnelle est le plus régulièrement observé, avec une ampleur modeste. Ces résultats décrivent des tendances de groupe ; ils ne prédisent pas une personne. Références complètes : Méthode et références. » [Sources à confirmer : R1, R3, R4.]

#### Texte prêt à coller pour F3 (frise)

Titre : « De la donnée à la décision »

« 1. Cadrer : nous définissons avec votre direction la question à éclairer.
2. Inviter : chaque personne reçoit une invitation personnelle.
3. Répondre : 120 affirmations, sans limite de temps, avec reprise possible.
4. Restituer : un consultant Tenga remet son profil à chaque personne et présente la synthèse de groupe à la direction.
5. Décider : ensemble, nous tirons de la lecture des pistes d'action. » [Activation : étape 4 de groupe = lot 4 ; PDF = lot 6.]

#### Texte prêt à coller pour F5 (FAQ limites, cinq entrées)

**Le questionnaire se fonde sur ce que je dis de moi. Est-ce fiable ?**
« Il décrit l'image que vous avez de vous. C'est une information précieuse, mais partielle : les proches perçoivent parfois d'autres aspects. C'est pourquoi la restitution est un échange, pas un verdict. » [R8]

**Peut-on « tricher » ?**
« Oui, notamment quand l'enjeu est élevé, comme pour un recrutement. C'est une raison de ne pas utiliser ce questionnaire pour trier des candidats, ce que nous ne recommandons pas. Dans un cadre de développement, où l'on n'a rien à gagner à embellir, la difficulté est bien moindre. » [R9]

**Cela vaut-il pour toutes les cultures ?**
« Le modèle a été retrouvé dans de nombreuses langues. Notre version arabe et nos formulations adaptées au contexte marocain n'ont pas encore été validées sur un grand nombre de réponses : nous le disons. » [R1 ; limite de Tenga]

**Mon profil va-t-il me coller à la peau ?**
« Non. Il décrit des tendances habituelles, relativement stables, mais pas figées. » [R3, R10]

**Un profil suffit-il pour décider ?**
« Non. Les traits sont un élément parmi d'autres : les compétences, l'expérience et le contexte comptent. Le questionnaire éclaire une conversation ; il ne la remplace pas. » [R11, R12]

---

## 4. Idées marketing

Issues de la banque d'idées de `marketing-ideas`, adaptées à un cabinet de conseil marocain ou africain : cycle de vente long, confiance personnelle, réseau, langue (français, arabe, anglais), réticence à confier des données sur la personnalité. Les numéros renvoient à la banque lorsque l'idée y figure. Aucune idée ne promet de résultat chiffré : « effet attendu » est qualitatif.

| # | Idée | Effort | Levier psychologique | Effet attendu |
|---|---|---|---|---|
| M1 | **Livre blanc** : « Lire la personnalité au travail : ce que la recherche permet, ce qu'elle ne permet pas » (appuyé sur le dossier de preuves) | Moyen | Autorité, pratfall effect | Pièce d'ancrage pour tous les échanges avec un DRH ; référence à citer |
| M2 | **Page « Méthode et références »** publique (F2) | Moyen | Autorité, transparence | Réduit la crainte de la « boîte noire » ; rassure le juridique |
| M3 | **Démonstration pour dirigeants** : 45 minutes, le dirigeant répond lui-même, restitution commentée | Moyen | Réciprocité, effet IKEA (ce que l'on a construit a plus de valeur), cohérence | Expérience vécue plutôt que promise ; fort potentiel de conversion, faible volume |
| M4 | **Offre pilote** : une équipe, une campagne, restitution, bilan d'utilité rempli par les participants | Moyen | Réduction du risque perçu, ancrage | Premier terrain de preuve ; matière première du baromètre (M12) |
| M5 | **Spécimen de rapport d'équipe** fictif et téléchargeable (F6) | Faible | Clarté sur l'effort, réciprocité | Le client voit le livrable avant de s'engager |
| M6 | **Petit-déjeuner ou webinaire** « Les équipes ne se heurtent pas sur les idées, mais sur les façons de faire » (idée de la banque : webinaires) | Moyen | Preuve sociale, autorité | Constitue un fichier qualifié de DRH et dirigeants |
| M7 | **Partenariats** avec des associations de DRH et des écoles de gestion (à identifier et vérifier : par exemple l'Association nationale des gestionnaires et formateurs des ressources humaines, la CGEM, des écoles de commerce) | Moyen | Preuve sociale par association, autorité | Accès à des prescripteurs ; crédibilité déléguée. Chaque nom est à vérifier avant tout contact. |
| M8 | **Lettre d'information mensuelle** : une idée, une source, une question à poser à son équipe | Faible (régulier) | Effet de pure exposition, réciprocité | Présence dans la durée ; amorce des échanges (banque : e-mail du fondateur, #47) |
| M9 | **Études de cas anonymisées**, avec accord écrit du client | Moyen | Preuve sociale, histoire | Possible uniquement après les premières campagnes ; ne rien inventer |
| M10 | **Mini-diagnostic d'équipe**, gratuit ou payant (décision D12) | Moyen | Réciprocité (gratuit) ou signal de valeur et engagement (payant) | Le gratuit attire plus, le payant qualifie mieux ; à arbitrer par le client |
| M11 | **Rapport annuel « Le travail en équipe au Maroc »** (banque : rapports annuels) | Élevé | Autorité, preuve sociale | N'existe que si Tenga dispose d'un échantillon suffisant, anonymisé et conforme CNDP ; sinon à écarter |
| M12 | **Baromètre d'utilité perçue** : une question à la fin de chaque restitution, résultats publiés avec taille d'échantillon | Moyen (délai) | Preuve sociale vérifiable | Seule preuve propre à Tenga ; renforce toutes les autres idées |
| M13 | **Intervention en conférence** (banque : conference speaking, #70) avec sondage en direct sur la salle | Moyen | Autorité, rareté de l'accès | Visibilité auprès des dirigeants ; la salle devient le premier cas |
| M14 | **Podcast ou entretien** comme invité (banque : #107) | Faible | Autorité, familiarité | Visibilité, voix humaine du cabinet, en arabe comme en français |
| M15 | **Guide pratique du manager** : « Parler de personnalité sans étiqueter » (banque : livre, #104) | Élevé | Autorité, réciprocité | Pièce de fond ; sert aussi de contenu pour la formation |
| M16 | **Cercle de dirigeants clients** (déjeuners trimestriels) (banque : parrainage, #137) | Moyen | Appartenance, rareté | Recommandation de pair à pair, canal décisif au Maroc ; à réserver aux clients réels |
| M17 | **Atelier de restitution ouvert** : « Comprendre son profil », sur inscription, en petit groupe | Moyen | Réciprocité, effet IKEA | Donne une expérience concrète à des prescripteurs ; produit des témoignages |
| M18 | **Profil fictif interactif** sur le site (banque : ingénierie comme marketing, #15) : le visiteur explore un profil exemple, domaine par domaine | Moyen | Clarté sur l'effort, curiosité | Comprendre le livrable sans donner ses données |
| M19 | **Charte d'usage éthique** publiée (F7) | Faible | Pratfall effect, autorité | Position de marque claire face aux outils critiqués ; protège la réputation |
| M20 | **Contenus dans la langue du client** (banque : langage du client, #139) : version arabe rédigée pour des lecteurs marocains, pas traduite | Moyen | Familiarité, confiance | Rend le service crédible auprès des dirigeants arabophones |

**Recommandation.** Un parcours minimal qui ne dépend d'aucune preuve fabriquée : M2, M3, M4, M5, M19, puis M12 dès que les premières campagnes existent. M1 et M8 en tâche de fond. M11 seulement si le volume le permet.

---

## 5. Tableau des affirmations

Niveau de risque d'image si l'affirmation était contestée publiquement par un client, un confrère ou un universitaire. « R » renvoie à la section 3.1. La colonne « Fiche P et état du dossier » donne l'état exact du dossier de preuves du 20 octobre 2026 (preuve forte, preuve partielle, pas de preuve trouvée) et la colonne « Chiffre lu » le chiffre lu à la source, s'il y en a un. Les colonnes « Risque » et « Recommandation » sont inchangées : la décision reste au client.

| # | Affirmation (texte proposé) | Où | Fiche P et état du dossier | Chiffre lu | Risque | Recommandation |
|---|---|---|---|---|---|---|
| 1 | Méthode publique, domaine public, chaque source consultable | A | **P33 bis** (page web du site officiel ; preuve forte ; confiance élevée) et **P34** (texte intégral). « Chaque source consultable » est un engagement de Tenga | « The items and scales are in the public domain » | Faible | Garder |
| 2 | Instrument publié en 2014 dans une revue scientifique | A, D | **P34** (texte intégral ; preuve forte ; confiance élevée) : *Journal of Research in Personality*, 51, 2014, p. 78-89 | 120 items, 30 facettes | Faible, confirmée | Garder |
| 3 | Le modèle des cinq facteurs est l'un des plus étudiés en psychologie de la personnalité | A, B, C, D | **Pas de fiche qui énonce ce classement.** Volume lu seulement : P4, P15, P2 (résumés éditeur). Preuve partielle, indirecte | 410 échantillons, 406 029 personnes (P4) ; 73 échantillons (P15) ; 15 méta-analyses (P2) | Faible | Garder |
| 4 | Structure retrouvée dans de nombreuses langues et cultures | A (F1) | **P26, P27, P28** (résumés éditeur ; preuve partielle). Maroc et IPIP-NEO-120 : **pas de preuve trouvée** (P33) | 50 cultures, 11 985 cibles (P26) ; 51 cultures, équivalence « grossière » (P27) ; 28 langues, 56 nations, 17 837 personnes (P28) | Moyen (arabe marocain non démontré) | Garder avec la réserve écrite dans la FAQ |
| 5 | Traits relativement stables à l'âge adulte | A (F1) | **Pas de fiche : non démontré** (R3). P20 ne mesure pas la stabilité | Aucun | Faible | Garder |
| 6 | Conscienciosité : lien régulier mais modeste avec la performance | A (F1) | **P1** (texte intégral ; preuve forte, effet modeste ; confiance élevée), P2, P4, P5 (résumés). « Modeste » : confirmé par P1 | ρ = 0,19 (mesures générales) à 0,25 (contextualisées) ; autres traits 0,05 à 0,10 ; environ 3,6 % de variance (calcul) | Moyen | Garder si « modeste » est confirmé par lecture ; sinon supprimer |
| 7 | Questionnaire « validé » ou « fiable » | aucun (interdit) | Instrument d'origine, en anglais : **P34** (texte intégral ; preuve forte) et **P35** (résumé éditeur ; preuve partielle à forte ; échantillon américain). Version adaptée, arabe, français, Maroc : **pas de preuve trouvée** (P33). P34 : l'outil ne devrait « probablement » pas servir à des décisions importantes sur des individus | Alphas des facettes 0,63 à 0,88 ; r = 0,66 avec le NEO PI-R (0,91 corrigé) ; N = 320 128 (P35) | Élevé | Ne jamais écrire |
| 8 | « Un profil améliore la performance des équipes » | aucun (évité) | **Pas de preuve trouvée** pour l'effet d'une restitution de profil (dossier § 3, point 7). Association entre composition d'équipe et performance : P11 à P14, preuve partielle | Aucun pour la restitution | Élevé | Ne pas écrire |
| 9 | Composition d'équipe liée à son fonctionnement | C | **P11 à P14** (résumés éditeur ; preuve partielle, hétérogène). Laboratoire : effets négligeables ; terrain : prédicteurs « forts » selon l'auteur de P11, sans coefficient lu | ρ = 0,24 (agréabilité moyenne), 0,20 (conscienciosité moyenne), −0,12 et −0,24 (variabilité), P12 | Moyen | Garder comme piste, jamais comme garantie |
| 10 | « Le malentendu coûte plus cher que le désaccord » | D-T3 | **Pas de fiche : pas de preuve trouvée** | Aucun | Élevé | Écarter, ou présenter comme conviction du cabinet |
| 11 | « Des décisions fondées sur des repères » | C-T1 | **Pas de preuve trouvée** d'un gain de décision. P34 : l'outil convient à la recherche, « probablement » pas à des décisions importantes sur des individus. « Repères » reste descriptif | Aucun | Moyen | Garder, sans suggérer une prédiction |
| 12 | « Beaucoup de personnes découvrent que leurs désaccords étaient des façons de faire » | B (FAQ) | **Pas de fiche : pas de preuve trouvée** (aucune étude ouverte sur l'effet d'un rapport de personnalité) | Aucun | Moyen | Supprimer jusqu'à observation (M12) |
| 13 | « Votre employeur ne voit jamais votre résultat individuel » | A à D | Fait technique, **non couvert par le dossier**. Règle décidée (`conception-espace-prive.md` § 9.2) ; aujourd'hui, tout détenteur d'un lien lit le résultat. Cadre légal : **P36** (loi 09-08, art. 3, 4, 5, 7 c, 11, 12, 23, 43-44) et **P37** (RGPD, art. 22), preuve forte pour le texte cité ; qualification d'un résultat de test de personnalité (donnée sensible ou non) non tranchée ; loi 09-08 à revérifier | Aucun | **Critique** avant le lot 1 | Ne publier qu'après déploiement du lot 1 et relecture juridique |
| 14 | « Chaque consultation est consignée dans un journal » | A, B, C | Fait technique, **non couvert par le dossier**. Prévue par le lot 1 (journal d'audit) ; preuve en production à produire. Cadre : P36 art. 23 (mesures de sécurité) | Aucun | Élevé | Publier après vérification par requête |
| 15 | « Synthèses de groupe à partir d'un nombre minimal de participants » | B, C, D | Fait technique, **non couvert par le dossier**. Seuil prévu (lot 4) ; aucune fiche ne fixe de seuil | Aucun | Élevé avant le lot 4 | Publier au lot 4 |
| 16 | « Vous pouvez télécharger vos données ou demander leur suppression » | B | Fait technique, **non couvert par le dossier**. P36 : droit d'accès, y compris à la logique du traitement (art. 7 c) lu ; droits de rectification, de suppression et de portabilité non lus. Preuve partielle pour le cadre légal | Aucun | Élevé avant le lot 3 (et risque CNDP) | Publier au lot 3 |
| 17 | « Restitué par un consultant Tenga » | A, B, C | **Pas de fiche** sur la capacité de Tenga. Contexte lu, non spécifique aux tests de personnalité : P18 (retour d'information, preuve forte mais hétérogène), P17, P21 (coaching) | d = 0,41, plus d'un tiers des interventions réduisent la performance (P18) ; δ = 0,36 (P21) | Moyen | Vérifier la capacité avant de promettre |
| 18 | « Nous ne recommandons pas ce questionnaire pour trier des candidats » | A, C, D | **P9** (preuve forte : les scores montent en candidature), **P7, P8** (preuve partielle, débat ouvert), **P34** (texte intégral). Engagement de Tenga | d = 0,44 (stabilité émotionnelle), 0,45 (conscienciosité), P9 | Moyen | Décision D7 du client |
| 19 | « Il ne mesure ni les compétences, ni l'intelligence, ni la santé » | A, B | **Pas de fiche qui l'énonce** : affirmation de conception, exacte dans `fr.js` (`faq.diagnosis`). Appui partiel : P6 (corrélation aptitude et personnalité de l'ordre de 0,10, d'après Meriac et coll. cité par Sackett) ; P34 : aucune validité prédictive sur la performance établie dans l'article | Environ 0,10 (P6, via Sackett) | Faible | Garder |
| 20 | « Sans limite de temps » | tous | Fait produit, hors dossier. Exact (`test.noTimeLimit`) | Aucun | Faible | Garder |
| 21 | « Reprise possible » | tous | Fait produit, hors dossier. Aujourd'hui, sur le même appareil ; sur serveur au lot 2 | Aucun | Moyen avant le lot 2 | Préciser « sur cet appareil » avant le lot 2 |
| 22 | « Certaines formulations adaptées au contexte marocain, même facette » | A, B | « Même facette » : vérifié par `question-overrides.ts` (hors dossier). Fiabilité de la version adaptée : **pas de preuve trouvée** (P33). L'IPIP indique que l'exactitude de ses traductions n'a pas été vérifiée par le projet | Aucun | Faible si limitée à « même facette » | Garder tel quel, ne pas ajouter « validé » |
| 23 | « Un profil décrit une tendance, pas un destin » | B, F5 | Reprend R10 : **pas de fiche pour la référence citée** ; P20 en appui indirect (résumé éditeur ; preuve partielle ; hors périmètre entreprise). Stabilité (R3) : pas de fiche | d = 0,37 en moyenne sur 24 semaines, interventions principalement cliniques (P20) | Faible | Garder |
| 24 | « Même quand un client insiste, nous ne remettons pas de résultat individuel » | D | Engagement de Tenga, **non couvert par le dossier** | Aucun | Élevé si un jour contredit | Décision d'Amine |
| 25 | Comparaison avec « les pratiques d'évaluation courantes » (F4) | A | **P6** et **P1** (texte intégral ; preuve forte pour le classement relatif ; confiance élevée). Le retour à 360 degrés : P17 (résumé éditeur ; amélioration « généralement petite ») | Entretien structuré 0,42 ; tests de connaissances 0,40 ; biodata 0,38 ; échantillons de travail 0,33 ; aptitude cognitive 0,31 ; intégrité 0,31 ; centres d'évaluation 0,29 ; conscienciosité 0,25 (contextualisée) et 0,19 (générale) | Moyen | À écrire sur sources lues |
| 26 | « Aucun concurrent… » ou toute allégation visant un outil nommé | aucun | **Pas de fiche** sur un outil concurrent nommé. Seule fiche sur un autre outil : P25 (MBTI, revue théorique, résumé éditeur, preuve partielle) | Aucun | Élevé | Ne pas écrire sans source |

**Écarts au dossier de preuves, section 5.**

- **Ligne 3.** Écart au dossier de preuves : aucune fiche n'établit que le modèle est « l'un des plus étudiés » ; le dossier a seulement lu des volumes (P4, P15, P2). Proposition : « Le modèle des cinq grands facteurs a fait l'objet de très nombreuses études, dont une méta-analyse de 410 échantillons et plus de 400 000 personnes (Judge et coll., 2013). »
- **Ligne 9** (reprise de R6). Écart au dossier de preuves : « forts prédicteurs » est le terme de l'auteur de P11, dont aucun coefficient n'a été lu ; les seuls coefficients lus viennent de P12. Proposition : « Dans les équipes de terrain, une agréabilité et une conscienciosité moyennes plus élevées sont associées à une meilleure performance collective (ρ = 0,24 et 0,20, Peeters et coll., 2006), avec des effets variables selon le contexte. »
- **Ligne 19.** Écart au dossier de preuves : « ni l'intelligence, ni la santé » est une affirmation de conception, non un résultat de recherche ; aucune fiche ne la démontre. Proposition : « Il décrit des tendances de comportement ; il n'est pas un test de compétences, d'intelligence ni un examen de santé. »
- **Ligne 23** (reprise de R10). Voir l'écart R10 en section 3.1 et sa proposition.

---

## 6. Décisions à prendre

Chaque décision revient au client. La recommandation est étiquetée et n'engage pas.

1. **Quel angle (ou quel panachage) ?** Options : A, B, C, D, ou la répartition de 2.5.
   *Recommandation* : panachage de 2.5 (C pour l'accueil, B pour la personne invitée, A pour la preuve, D en notoriété).
2. **Quel ton ?** Institutionnel sobre (A), chaleureux (B), directif (C), tranché (D).
   *Recommandation* : sobre et humain ; l'audace réservée aux supports de notoriété.
3. **Tutoiement ou vouvoiement ?** Les textes sont écrits au vouvoiement. Un tutoiement, courant dans certaines start-up, donnerait par exemple « Réponds comme tu es habituellement, pas comme tu aimerais être. »
   *Recommandation* : vouvoiement en français partout ; en arabe, adresse neutre au nom verbal (règle de `voix-de-marque.md`). Le tutoiement fait perdre du poids face à un dirigeant et peut gêner la personne invitée.
4. **Quelle promesse centrale ?** PR1 à PR4 (1.3).
   *Recommandation* : PR2 pour le responsable, PR1 pour la personne invitée, PR3 en signature.
5. **Mentionner la confidentialité, et quand ?** Les phrases promettant que l'employeur ne voit pas le résultat sont fausses aujourd'hui (tout détenteur du lien lit le résultat) ; elles deviennent vraies au lot 1, et leur forme juridique reste à valider (CNDP, relecture par un juriste).
   *Recommandation* : oui, en place centrale (ancrage de la confiance), mais publiées seulement au déploiement du lot 1, avec la valeur du seuil et des durées lue depuis les réglages, jamais écrite en dur.
6. **Positionnement face aux autres outils ?** Options : silence ; différenciation par les critères (méthode publique, pas de typologie, restitution par un consultant) ; comparaison nommée.
   *Recommandation* : la différenciation par les critères, sans nommer d'outil, tant qu'aucune comparaison n'est sourcée. Une allégation nommée contre un outil du marché est le risque d'image le plus élevé (affirmation 26).
7. **Usage en recrutement : exclu ou toléré ?**
   *Recommandation* : exclu et écrit (R9). C'est cohérent avec la littérature, avec la CNDP et avec le positionnement de développement ; cela retire aussi à Tenga un argument commercial, qu'il faut assumer.
8. **Mentionner « domaine public » dans un message premium ?** Cela donne la transparence mais évoque la gratuité de l'instrument.
   *Recommandation* : oui, comme preuve de vérifiabilité, jamais comme argument de prix.
9. **Afficher une durée de réponse ?** Aucune mesure de médiane à ce jour.
   *Recommandation* : « sans limite de temps » seulement.
10. **Quelle place aux preuves de la section 3 ?** F1 à F8.
    *Recommandation* : F1, F2, F5, F7 d'abord (faibles ou moyens, sans donnée nouvelle) ; F6 et F3 ensuite ; F8 dès que des campagnes existent.
11. **Les provocations (angle D) : lesquelles tolérer ?** D-T1 et D-T2 ne contiennent aucune allégation ; D-T3 en contient une.
    *Recommandation* : D-T2 en titre de newsletter ou de conférence, pas sur la page vue par la personne invitée.
12. **Mini-diagnostic (M10) : gratuit ou payant ?** Gratuit : réciprocité, volume. Payant : qualification, signal de valeur.
    *Recommandation* : payant à prix symbolique, qui qualifie sans fermer la porte. Le prix est une décision commerciale d'Amine.
13. **Mentionner AI-MPower ?** Le service est proposé par Tenga Conseil, hébergé sur un domaine d'AI-MPower.
    *Recommandation* : ne pas mentionner AI-MPower dans les textes destinés aux personnes invitées ; décision sur la page À propos à votre appréciation.
14. **Langues : anglais ?** Les textes anglais d'accueil sont fournis pour l'angle C.
    *Recommandation* : garder français, arabe et anglais (point 8 de `voix-de-marque.md` § 7), l'anglais dépendant de la clientèle visée.
15. **« Névrosisme » ou « Stabilité émotionnelle » ?** Les descriptions de domaine proposées emploient « Névrosisme » avec sa glose.
    *Recommandation* : conserver « Névrosisme » tant que le score n'est pas inversé dans le code (`voix-de-marque.md` § 7.1).
16. **Témoignages et cas clients : quelle règle ?** Il n'en existe aucun aujourd'hui.
    *Recommandation* : n'afficher aucun témoignage ni chiffre de clients avant d'en disposer réellement ; fabriquer la preuve par le pilote (M4) et le baromètre (M12).
17. **Compléments à fournir par Tenga Conseil pour le texte « À propos ».** Domaines d'intervention, références de clients autorisées, nombre de consultants, titre des intervenants.
    *Recommandation* : écrire « consultant Tenga » seulement ; ne citer aucun titre sans vérification (`voix-de-marque.md` § 5.1).

---

## Annexe : ce qui dépendait du dossier de preuves, et ce qui en dépend encore

État au 20 octobre 2026, après lecture du dossier `docs/design/dossier-preuves.md` :

- **Fait** : rattachement de R1 à R12 aux fiches P (section 3.1), avec mode de lecture, état des preuves et références vérifiées. R3 et R8 n'ont aucune fiche.
- **Fait** : confirmation que « modeste » (R4, affirmation 6) est fidèle à P1 (ρ = 0,19 à 0,25, soit environ 3,6 % de variance partagée pour 0,19).
- **Fait** : volumes, pages et revues de R2 (P34), R4 (P1), R5 (P15), R6 (P11, revue corrigée), R7 (P10), R9 (P7, P8, P9). Restent sans vérification : les références de R1 (McCrae et Costa 1997 ; Goldberg 1990), R3, R6 (Barrick, Stewart, Neubert et Mount 1998), R8, R10 (Hudson et Fraley 2015) et R11 (Judge et Zapata 2015), faute de fiche.
- **Reste à faire** : contrôle visuel de l'écart type 0,15 de P1 ; revérification de la loi 09-08 (copie tierce) et de l'article 22 du RGPD (EUR-Lex inaccessible) ; lecture des corps d'articles pour les fiches en résumé éditeur.
- **Reste à faire** : rédaction de F4 (comparaison avec les pratiques courantes, sur les chiffres de P6) et de F2.
- Tout chiffre à insérer dans un texte de site : aucun n'est donné ici ; un chiffre n'entre dans une phrase qu'avec sa fiche et après validation du client.
