# Bibliothèque de textes : facettes pilotes (une par domaine)

Version `bib-0.3`, 2026-10-21. Statut : **ébauche, 150 blocs non relus : relecture humaine requise avant tout usage (§ 7.2 étape 7)**.

Cinq facettes sur trente, cinq niveaux chacune, en français et en arabe. Fichier source : `facettes-pilote.json` ; ce document en est une copie lisible, générée par `controle.py --md` : ne pas l’éditer à la main. Les espaces avant les signes doubles du français et dans les guillemets sont à convertir en espaces insécables au moment de l’intégration dans les fichiers de messages (`voix-de-marque.md`).

**Statut des blocs.** La description d’un niveau est tirée des quatre affirmations réelles de la facette (source `ipip-items`). Les rubriques « Ce que cela peut apporter », « Ce que cela peut coûter » et la question sont des **hypothèses de lecture, sans étude citée** (source `hypothese`) : le rapport les introduit par « Hypothèses de lecture, à confirmer en entretien ». Les niveaux sont des conventions de l’outil (`bases-rapports-individuel-et-binome.md` § 7.2), non des positions par rapport à d’autres personnes.

**Accord grammatical.** Le corps de chaque bloc ci-dessous est la forme **sans accord**, celle que reçoit tout profil sans valeur renseignée. Les phrases qui s’accordent portent des marqueurs dans le fichier source et sont listées sous chaque bloc avec leurs trois formes (masculin, féminin, sans accord). Syntaxe : `{masculin|féminin|sans accord}`, exactement trois alternatives ; la forme sans accord est identique au texte d’avant le marquage (prouvé par `--regression`).

## N1 · Inquiétude et appréhension

**Définition.** Cette facette porte sur la tendance à s’inquiéter, à envisager des issues défavorables et à ressentir de l’appréhension.

**Les quatre affirmations du questionnaire (français) :**

- « Je m'inquiète à propos des choses » (cotation directe)
- « Je crains le pire » (cotation directe)
- « J'ai peur de beaucoup de choses » (cotation directe)
- « Je deviens stressé facilement » (cotation directe)

> **Avertissement sur le libellé.** Le titre de cette facette dans l’application est plus large que son contenu : les affirmations portent sur la tendance déclarée à s’inquiéter. Elle ne mesure ni ne dit rien de votre état de santé et n’est pas un diagnostic.

### N1 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous inquiétez rarement et que vous envisagez peu les issues défavorables. Cette lecture porte sur ce que vous déclarez, non sur ce que vous ressentez dans chaque situation.

**Ce que cela peut apporter** (`hypothese`)

- Votre sérénité face à l’incertitude peut aider un groupe à avancer sans s’attarder sur les scénarios sombres.
- Vous pouvez rassurer des interlocuteurs qui s’inquiètent davantage que vous.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous sous-estimiez des risques que d’autres voient clairement.
- Votre apparente sérénité peut aussi donner l’impression que vous prenez à la légère des préoccupations légitimes.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances vous arrive-t-il de ressentir de l’appréhension, et comment la repérez-vous ?

### N1 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’inquiétude vous visite peu, avec quelques situations où l’appréhension apparaît. Elle semble liée à des circonstances précises plutôt qu’à un climat habituel.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aborder la plupart des situations sans que l’inquiétude vous ralentisse.
- Votre appréhension occasionnelle peut vous servir de signal pour préparer ce qui compte vraiment.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’une inquiétude inhabituelle vous prenne au dépourvu, justement parce qu’elle est rare.
- Vous pouvez tarder à demander du soutien quand une préoccupation s’installe.

**Question pour l’entretien** (`hypothese`) : Quelles situations réveillent votre appréhension, et que faites-vous alors ?

### N1 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la sérénité ni vers l’inquiétude. Votre appréhension semble varier selon les enjeux et les périodes, ce que l’entretien de restitution permet de préciser.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez adapter votre niveau de vigilance à l’importance de ce qui est en jeu.
- Votre inquiétude modérée peut vous aider à anticiper sans vous envahir.

**Ce que cela peut coûter** (`hypothese`)

- Vos réactions peuvent sembler difficiles à lire pour votre entourage, selon les jours.
- Vous pouvez hésiter sur le degré d’inquiétude à accorder à une situation nouvelle.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui, selon les périodes, fait passer votre inquiétude d’un niveau à l’autre ?

### N1 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous inquiétez assez souvent et qu’il vous arrive d’envisager des issues défavorables. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre attention aux risques peut vous faire préparer des solutions de repli avant qu’on vous les demande.
- Vous pouvez repérer tôt ce qui risque de mal tourner dans un projet.

**Ce que cela peut coûter** (`hypothese`)

- L’anticipation des difficultés peut vous prendre de l’énergie avant même que la situation se présente.
- Il se peut que vous cherchiez des garanties avant de vous engager.

**Question pour l’entretien** (`hypothese`) : Quand vous envisagez une issue défavorable, qu’est-ce qui vous aide à distinguer ce qui est probable de ce qui est seulement possible ?

### N1 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous inquiétez très souvent et que l’appréhension vous accompagne dans de nombreuses situations. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ; elle peut varier selon la période de vie et le contexte.

**Ce que cela peut apporter** (`hypothese`)

- Votre vigilance peut vous faire détecter très tôt des points de fragilité que d’autres négligent.
- Vous pouvez porter un soin particulier à la préparation et à la vérification.

**Ce que cela peut coûter** (`hypothese`)

- Une inquiétude fréquente peut vous fatiguer et alourdir vos journées.
- Il se peut que vous repoussiez des décisions dont l’issue vous paraît incertaine.

**Question pour l’entretien** (`hypothese`) : Quels appuis (personnes, méthodes, rythme de travail) vous aident aujourd’hui quand l’inquiétude s’installe ?

## N2 · Irritabilité et patience

**Définition.** Cette facette porte sur la facilité avec laquelle l’irritation et l’impatience montent chez vous.

**Les quatre affirmations du questionnaire (français) :**

- « Je me mets en colère facilement » (cotation directe)
- « Je suis irritable facilement » (cotation directe)
- « Je perds patience » (cotation directe)
- « Je ne suis pas facilement agacé » (cotation inversée)

> **Avertissement sur le libellé.** Le titre de cette facette dans l’application est plus large que son contenu : les affirmations portent sur l’irritabilité et la patience au quotidien, non sur la manière dont vous exprimez ou gérez une colère.

### N2 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’impatience vous gagne rarement et que les contrariétés vous agacent peu. Cette lecture porte sur ce que vous déclarez, non sur votre comportement tel que d’autres le perçoivent.

**Ce que cela peut apporter** (`hypothese`)

- Votre patience peut détendre une discussion qui s’échauffe.
- Vous pouvez donner à votre entourage le sentiment qu’on peut aborder un désaccord sans crainte.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous exprimiez tard une contrariété réelle, au point que l’autre ne la découvre qu’après coup.
- Votre calme apparent peut aussi masquer un désaccord que vous n’avez pas dit.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous contrarie malgré tout, et comment le faites-vous savoir ?

### N2 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’irritation reste plutôt rare, avec quelques situations qui vous font perdre patience. Ces moments semblent dépendre du contexte plus que d’une habitude.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez garder une conversation constructive dans la plupart des désaccords.
- Les moments où votre patience s’amenuise peuvent vous indiquer ce qui compte vraiment pour vous.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’un agacement longtemps contenu s’exprime plus vivement que vous ne le souhaitiez.
- Vos interlocuteurs peuvent être surpris par une réaction que rien ne laissait prévoir.

**Question pour l’entretien** (`hypothese`) : Quelles circonstances vous font perdre patience, et que faites-vous alors ?

### N2 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la patience constante ni vers l’irritation fréquente. Votre réaction semble varier selon la situation, ce que l’entretien de restitution permet de préciser.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez moduler votre réaction selon l’enjeu, en laissant passer certaines contrariétés et en relevant d’autres.
- Votre irritation occasionnelle peut servir de signal quand une limite est franchie.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut avoir du mal à prévoir comment vous réagirez à une même contrariété.
- Vous pouvez hésiter entre laisser passer un désaccord et le relever.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances votre patience tient-elle, et dans lesquelles cède-t-elle ?

### N2 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’irritation et l’impatience vous gagnent assez souvent. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre sensibilité aux contrariétés peut vous faire relever rapidement ce qui dysfonctionne.
- Vous pouvez dire tôt ce qui ne va pas, ce qui peut éviter qu’un désaccord s’enkyste.

**Ce que cela peut coûter** (`hypothese`)

- Une irritation fréquente peut tendre vos échanges et user votre énergie.
- Il se peut que certains interlocuteurs hésitent à vous soumettre des nouvelles difficiles.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aide à retrouver votre patience quand une contrariété s’installe ?

### N2 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’irritation vous gagne très facilement et que vous perdez souvent patience. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ; elle peut varier selon la charge de travail et le contexte.

**Ce que cela peut apporter** (`hypothese`)

- Votre exigence peut vous faire réagir vite à ce qui vous paraît injuste ou négligé.
- Vous pouvez porter avec énergie des sujets que d’autres laisseraient s’enliser.

**Ce que cela peut coûter** (`hypothese`)

- Des réactions vives peuvent fatiguer votre entourage et vous fatiguer vous-même.
- Il se peut que des échanges tendus laissent des traces dans des relations auxquelles vous tenez.

**Question pour l’entretien** (`hypothese`) : Quels signes vous préviennent que votre irritation monte, et qu’est-ce qui vous aide à la faire redescendre ?

## N3 · Humeur et estime de soi

**Définition.** Cette facette porte sur la fréquence des moments de tristesse et sur le degré de confort avec vous-même.

**Les quatre affirmations du questionnaire (français) :**

- « Je me sens souvent triste » (cotation directe)
- « Je n'ai pas beaucoup d'estime pour moi » (cotation directe)
- « Il m'arrive souvent de broyer du noir » (cotation directe)
- « Je suis à l'aise avec moi-même » (cotation inversée)

> **Avertissement sur le libellé.** Le titre de cette facette dans l’application est plus large que son contenu : les affirmations portent sur la fréquence déclarée de la tristesse et sur le confort avec soi-même. Elle ne mesure ni ne dit rien de votre état de santé et n’est pas un diagnostic ; en cas de préoccupation personnelle, un professionnel de santé de votre choix est l’interlocuteur approprié.

### N3 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la tristesse vous accompagne rarement et que vous vous sentez à l’aise avec vous-même. Cette lecture porte sur ce que vous déclarez, non sur ce que vous vivez chaque jour.

**Ce que cela peut apporter** (`hypothese`)

- Votre aisance avec vous-même peut vous permettre de recevoir une critique sans la prendre pour une remise en cause personnelle.
- Vous pouvez apporter de la stabilité à un groupe qui traverse une période difficile.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez du mal à comprendre un collègue dont l’humeur est plus changeante que la vôtre.
- Vous pouvez aussi sous-estimer l’effet d’une période éprouvante sur vos proches.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui contribue, selon vous, à ce que vous vous sentiez à l’aise avec vous-même ?

### N3 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les moments de tristesse sont plutôt peu fréquents et que votre estime de vous-même est le plus souvent confortable. Quelques moments de doute ou de baisse d’humeur peuvent exister, sans qu’ils soient habituels.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez traverser la plupart des contrariétés sans que votre confiance en vous en soit durablement ébranlée.
- Vos moments de doute peuvent vous aider à remettre en question une idée ou une méthode.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’un moment de baisse d’humeur vous surprenne précisément parce qu’il est inhabituel.
- Vous pouvez hésiter à en parler, tant il vous paraît passager.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations vous arrive-t-il de douter de vous, et comment en sortez-vous ?

### N3 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers un confort constant avec vous-même ni vers des moments fréquents de tristesse. Votre humeur et le regard que vous portez sur vous semblent varier selon les périodes et les contextes.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vous remettre en question sans perdre confiance dans l’ensemble de vos choix.
- Cette variabilité peut vous rendre sensible aux difficultés des autres.

**Ce que cela peut coûter** (`hypothese`)

- Votre entrain peut sembler irrégulier à votre entourage, qui ne sait pas toujours comment vous aborder.
- Vous pouvez avoir du mal à identifier ce qui fait basculer vos journées d’un côté ou de l’autre.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui fait varier votre humeur et le regard que vous portez sur vous d’une période à l’autre ?

### N3 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que des moments de tristesse et de doute sur vous-même reviennent assez souvent. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ni d’un jugement sur votre valeur ; elle ne dit rien de votre état de santé.

**Ce que cela peut apporter** (`hypothese`)

- Votre sensibilité peut vous faire remarquer les difficultés des autres avant qu’elles ne se disent.
- Votre exigence envers vous-même peut vous pousser à soigner votre travail.

**Ce que cela peut coûter** (`hypothese`)

- Vos moments de doute peuvent vous faire hésiter à vous mettre en avant ou à proposer vos idées.
- Il se peut qu’une critique pèse plus lourd pour vous que son auteur ne l’imaginait.

**Question pour l’entretien** (`hypothese`) : Quels moments ou quelles personnes vous aident à retrouver confiance en vous ?

### N3 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la tristesse et le doute sur vous-même sont très présents, avec des moments où vous broyez du noir. Il s’agit d’une tendance déclarée, jamais d’un diagnostic ; elle ne dit rien de votre état de santé et peut varier selon la période de vie.

**Ce que cela peut apporter** (`hypothese`)

- Votre sensibilité peut vous faire percevoir finement l’ambiance d’un groupe et le moral de ses membres.
- Votre exigence envers vous-même peut vous conduire à soigner votre travail avec rigueur.

**Ce que cela peut coûter** (`hypothese`)

- Des pensées sombres répétées peuvent peser sur votre énergie et votre motivation.
- Il se peut que vous gardiez pour vous des préoccupations que vous hésitez à partager.

**Question pour l’entretien** (`hypothese`) : Quels appuis (personnes, activités, rythme de vie) vous font du bien aujourd’hui quand le moral baisse ?

## N4 · Réserve en situation sociale

**Définition.** Cette facette porte sur l’aisance avec laquelle vous abordez des inconnus, supportez l’attention des autres et traversez des situations sociales délicates.

**Les quatre affirmations du questionnaire (français) :**

- « J'éprouve de la difficulté à aborder les autres » (cotation directe)
- « J'ai peur d'attirer l'attention » (cotation directe)
- « Je me sens seulement à l'aise avec mes amis » (cotation directe)
- « Je ne suis pas dérangé par les situations sociales difficiles » (cotation inversée)

> **Avertissement sur le libellé.** Le titre de cette facette dans l’application est plus large que son contenu : les affirmations portent sur l’aisance déclarée en situation sociale, non sur la conscience de soi au sens large. Elle ne dit rien de votre valeur ni de votre état de santé.

### N4 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous abordez les autres sans difficulté, que l’attention ne vous gêne pas et que les situations sociales délicates vous dérangent peu. Cette lecture porte sur ce que vous déclarez, non sur votre comportement tel que d’autres le perçoivent.

**Ce que cela peut apporter** (`hypothese`)

- Votre aisance peut vous permettre de créer des contacts rapidement, y compris avec des inconnus.
- Vous pouvez prendre la parole ou représenter un groupe sans y voir une épreuve.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ne remarquiez pas qu’un interlocuteur plus réservé n’ose pas intervenir.
- Votre aisance peut aussi vous faire sous-estimer l’effort que représente pour d’autres une situation sociale exposée.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations sociales vous sentez-vous le moins à l’aise, malgré tout ?

### N4 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les situations sociales vous mettent le plus souvent à l’aise, avec quelques exceptions. Aborder un inconnu ou attirer l’attention peut vous demander un petit effort dans certains contextes.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aller vers les autres quand l’enjeu l’exige, tout en gardant une certaine retenue.
- Cette retenue légère peut vous conduire à observer une situation avant de vous y engager.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous laissiez passer une occasion de vous présenter parce que le moment vous semblait peu propice.
- Vous pouvez hésiter à prendre la parole devant un groupe que vous connaissez mal.

**Question pour l’entretien** (`hypothese`) : Dans quels contextes aborder quelqu’un vous demande-t-il un effort, et lesquels sont plus naturels pour vous ?

### N4 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers l’aisance en toute situation sociale ni vers la réserve. Votre degré d’aisance semble dépendre des personnes présentes et de l’enjeu, ce que l’entretien de restitution permet de préciser.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vous adapter à des cercles très différents, plus ouverts avec des proches et plus mesurés avec des inconnus.
- Cette souplesse peut vous aider à choisir le moment où prendre la place que vous souhaitez.

**Ce que cela peut coûter** (`hypothese`)

- Votre aisance variable peut donner à votre entourage une image différente de vous selon le contexte.
- Vous pouvez hésiter à aller vers quelqu’un quand vous ne savez pas comment il réagira.

**Question pour l’entretien** (`hypothese`) : Avec quelles personnes ou dans quels lieux votre aisance change-t-elle le plus ?

### N4 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’aborder des inconnus ou attirer l’attention vous demande assez souvent un effort, et que vous vous sentez surtout à l’aise avec des personnes connues. Il s’agit d’une tendance déclarée en situation sociale, jamais d’un diagnostic ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre retenue peut vous donner le temps d’observer et d’écouter avant de vous exprimer.
- Vous pouvez construire des relations de confiance durables avec un cercle restreint.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des occasions de réseau ou de visibilité vous échappent faute d’avoir fait le premier pas.
- Des personnes qui ne vous connaissent pas peuvent interpréter votre réserve comme de la distance.

**Question pour l’entretien** (`hypothese`) : Quelles situations sociales vous demandent le plus d’énergie, et qu’est-ce qui les rend plus faciles ?

### N4 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les situations sociales avec des inconnus, l’attention d’un groupe ou les moments délicats vous mettent très souvent mal à l’aise. Il s’agit d’une tendance déclarée en situation sociale, jamais d’un diagnostic ; elle peut varier selon le contexte et le degré de familiarité.

**Ce que cela peut apporter** (`hypothese`)

- Votre réserve peut vous faire préparer soigneusement vos interventions.
- Vous pouvez investir beaucoup dans la qualité de vos relations proches.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous évitiez des réunions, des événements ou des prises de parole où vous auriez des choses à apporter.
- Cette retenue peut limiter vos occasions de rencontres professionnelles.

**Question pour l’entretien** (`hypothese`) : Quels aménagements (préparation, présence d’une personne connue, format) vous aident à vous exprimer plus facilement ?

## N5 · Envies et tentations

**Définition.** Cette facette porte sur la facilité avec laquelle vous résistez à vos envies ou vous vous laissez tenter.

**Les quatre affirmations du questionnaire (français) :**

- « Je fais des folies » (cotation directe)
- « Je cède rarement à la tentation » (cotation inversée)
- « Je résiste facilement à la tentation » (cotation inversée)
- « Je suis capable de contrôler mes envies » (cotation inversée)

> **Avertissement sur le libellé.** Le titre de cette facette dans l’application est plus large que son contenu : les affirmations portent sur la maîtrise déclarée des envies et des tentations, sans viser aucun domaine précis. Cette lecture ne porte aucun jugement sur vos choix ni sur votre mode de vie.

### N5 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous résistez facilement aux tentations, que vous cédez rarement et que vous faites peu de folies. Cette lecture porte sur ce que vous déclarez, non sur vos choix dans chaque situation.

**Ce que cela peut apporter** (`hypothese`)

- Votre maîtrise de vos envies peut vous aider à tenir un cap ou un budget sur la durée.
- Vous pouvez rester sur un objectif sans que des occasions séduisantes vous en écartent.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez à côté d’une opportunité spontanée parce qu’elle n’était pas prévue.
- Vous pouvez avoir du mal à comprendre un proche qui se laisse volontiers tenter.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations vous accordez-vous une envie, et qu’est-ce qui vous y autorise ?

### N5 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous résistez le plus souvent à vos envies, avec quelques occasions où vous vous laissez tenter. Ces écarts semblent liés à des contextes précis plutôt qu’à une habitude.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tenir vos engagements tout en vous réservant de temps en temps un plaisir ou un écart choisi.
- Cet équilibre peut vous aider à tenir vos objectifs sans que l’effort vous pèse.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’une envie retenue longtemps finisse par s’imposer d’un coup.
- Vous pouvez regretter après coup un écart que vous n’aviez pas prévu.

**Question pour l’entretien** (`hypothese`) : Quelles circonstances vous font céder à une envie, et comment vivez-vous ensuite ce moment ?

### N5 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la retenue ni vers le fait de se laisser tenter. Votre façon de réagir aux envies semble varier selon l’enjeu et le moment, ce que l’entretien de restitution permet de préciser.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tantôt tenir une ligne, tantôt vous accorder une envie, selon ce qui compte à vos yeux.
- Cette souplesse peut vous aider à profiter d’une occasion sans perdre de vue vos priorités.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez du mal à anticiper votre propre décision face à une tentation.
- Vous pouvez hésiter, sur le moment, entre l’envie présente et l’objectif fixé.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui fait pencher votre décision d’un côté ou de l’autre quand une envie se présente ?

### N5 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous laissez assez souvent tenter et que vous vous accordez volontiers des folies. Il s’agit d’une tendance déclarée, sans jugement sur vos choix ni sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre spontanéité peut vous faire saisir une occasion avant qu’elle ne passe.
- Vous pouvez apporter de l’entrain et de l’inattendu dans un groupe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des décisions prises sur l’élan demandent ensuite des ajustements.
- Vous pouvez avoir du mal à tenir un plan qui suppose de renoncer à des occasions séduisantes.

**Question pour l’entretien** (`hypothese`) : Dans quels domaines suivre vos envies vous convient-il, et dans lesquels aimeriez-vous vous donner un cadre ?

### N5 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous cédez très souvent à vos envies et que vous résistez difficilement aux tentations. Il s’agit d’une tendance déclarée, sans jugement sur vos choix ni sur votre valeur ; elle peut varier selon la période de vie et le contexte.

**Ce que cela peut apporter** (`hypothese`)

- Votre élan peut vous faire saisir des occasions que d’autres laissent passer.
- Vous pouvez faire preuve d’une grande spontanéité qui anime votre entourage.

**Ce que cela peut coûter** (`hypothese`)

- Des décisions prises sur l’élan peuvent entrer en tension avec des engagements ou des objectifs de long terme.
- Il se peut que vous ayez besoin de garde-fous (délai de réflexion, avis d’un proche) pour certains choix importants.

**Question pour l’entretien** (`hypothese`) : Quels repères (délai de réflexion, personne de confiance, règle personnelle) vous aident à décider quand une envie est très présente ?

## N6 · Vulnérabilité au stress

**Définition.** Cette facette porte sur la facilité avec laquelle la pression et les événements imprévus vous déstabilisent.

**Les quatre affirmations du questionnaire (français) :**

- « Je panique facilement » (cotation directe)
- « Je peux être dépassé par les événements » (cotation directe)
- « Je me sens incapable de gérer les choses » (cotation directe)
- « Je reste calme sous pression » (cotation inversée)

### N6 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les événements vous déstabilisent rarement et que vous gardez le plus souvent votre calme sous pression. Cette lecture porte sur ce que vous déclarez, non sur ce qui se passe en situation réelle.

**Ce que cela peut apporter** (`hypothese`)

- Votre calme peut aider un groupe à garder le cap dans une situation tendue.
- Vous pouvez décider dans des moments où le groupe hésite encore.

**Ce que cela peut coûter** (`hypothese`)

- Votre aisance sous pression peut vous faire minimiser la tension que ressentent vos interlocuteurs.
- Il se peut que les signaux d’alerte vous parviennent tardivement.

**Question pour l’entretien** (`hypothese`) : Quand la pression monte-t-elle pour vous, et à quoi le remarquez-vous ?

### N6 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous gardez le plus souvent votre calme face aux événements, avec des exceptions. Certaines situations peuvent vous mettre davantage à l’épreuve que d’autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez conserver votre capacité d’agir quand la situation se complique.
- Vos moments d’inconfort peuvent vous servir de signal pour demander de l’aide à temps.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous perceviez tardivement votre propre fatigue quand la pression dure.
- Certaines situations peuvent vous surprendre alors que vous comptiez les traverser sans difficulté.

**Question pour l’entretien** (`hypothese`) : Quelles situations font exception, et qu’ont-elles en commun ?

### N6 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le calme ni vers la sensibilité au stress. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster votre façon de réagir selon l’enjeu.
- Votre sensibilité aux tensions peut vous aider à repérer ce qui ne va pas, sans vous absorber.

**Ce que cela peut coûter** (`hypothese`)

- Vos réactions peuvent sembler difficiles à anticiper pour votre entourage.
- Vous pouvez hésiter sur l’attitude à adopter quand la pression est inhabituelle.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances votre façon de réagir change-t-elle le plus ?

### N6 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la pression et les imprévus peuvent vous affecter assez nettement. Il s’agit d’une tendance de réaction au stress, jamais d’un diagnostic ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre sensibilité aux tensions peut vous faire anticiper des difficultés avant qu’elles n’éclatent.
- Vous pouvez prendre au sérieux des risques qui ne sont pas encore visibles.

**Ce que cela peut coûter** (`hypothese`)

- Une période chargée peut peser rapidement sur votre énergie.
- Dans l’urgence, il se peut que vous ayez besoin de temps pour retrouver vos repères.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aide à retrouver vos repères quand les événements s’accumulent ?

### N6 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la pression et les événements imprévus vous affectent très nettement, et que vous avez parfois le sentiment de ne plus pouvoir tout gérer. Il s’agit d’une tendance de réaction au stress, jamais d’un diagnostic ; elle peut varier selon la période de vie et le contexte de travail.

**Ce que cela peut apporter** (`hypothese`)

- Votre vigilance peut vous faire repérer très tôt les points de fragilité d’un projet.
- Vous pouvez porter une attention particulière à la charge que les autres supportent.

**Ce que cela peut coûter** (`hypothese`)

- Une succession de situations tendues peut vous épuiser avant que vous ayez pu récupérer.
- Il se peut que vous évitiez ou repoussiez des situations dont vous redoutez l’issue.

**Question pour l’entretien** (`hypothese`) : Quels appuis (personnes, méthodes, rythme de travail) vous aident aujourd’hui quand la pression monte ?

*Variantes d’accord de ce bloc (masculin, féminin) :*

- m : Vos réponses indiquent que la pression et les événements imprévus vous affectent très nettement, et que vous vous sentez parfois dépassé par eux.
  f : Vos réponses indiquent que la pression et les événements imprévus vous affectent très nettement, et que vous vous sentez parfois dépassée par eux.

## E1 · Aisance à nouer des liens

**Définition.** Cette facette porte sur la facilité à nouer des contacts et à vous sentir à l’aise avec les autres.

**Les quatre affirmations du questionnaire (français) :**

- « Je me fais des amis facilement » (cotation directe)
- « Je me sens confortable avec les gens » (cotation directe)
- « J'évite le contact avec les autres » (cotation inversée)
- « Je garde les autres à distance » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Bienveillance » est plus large que ce que mesurent les quatre affirmations : elles portent sur la facilité à nouer des liens et à se sentir à l’aise avec les gens, non sur la bienveillance. Ce résultat ne dit rien de votre attitude envers autrui.

### E1 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous évitez souvent le contact, que vous gardez volontiers les autres à distance et que vous nouez rarement des amitiés facilement. Cela décrit une manière d’aborder les contacts, non un manque d’attention pour les autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez choisir avec soin les personnes auxquelles vous vous attachez.
- Votre réserve peut laisser aux autres le temps de s’exprimer, et à vous celui d’observer.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que de nouveaux interlocuteurs ne perçoivent pas votre intérêt pour eux.
- Dans un nouvel environnement, vous pouvez mettre longtemps à constituer un réseau d’appui.

**Question pour l’entretien** (`hypothese`) : Dans quels cadres vous est-il le plus facile d’entrer en relation, et qu’est-ce qui les distingue ?

### E1 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que nouer des liens demande le plus souvent du temps ou un effort, avec des situations où le contact vous vient naturellement. Le cadre et les personnes présentes semblent compter dans votre aisance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez construire des relations durables à partir de quelques échanges choisis.
- Votre prudence au premier contact peut vous aider à observer avant de vous engager.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des occasions de rencontre passent parce que vous attendez de vous sentir à l’aise.
- Votre entourage peut interpréter votre réserve initiale comme du désintérêt.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous met à l’aise avec une personne que vous ne connaissez pas encore ?

### E1 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers l’aisance dans les contacts ni vers la distance. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aller vers les autres ou rester en retrait selon ce que la situation demande.
- Vous pouvez vous adapter à des groupes dont les habitudes de contact diffèrent.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut avoir du mal à prévoir si vous irez vers lui.
- Vous pouvez hésiter sur la bonne distance à adopter avec des personnes nouvelles.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations allez-vous spontanément vers les autres, et dans lesquelles préférez-vous attendre ?

### E1 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous sentez le plus souvent à l’aise avec les gens et que les liens se nouent assez naturellement pour vous. Il existe pourtant des situations où vous préférez garder vos distances.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mettre un groupe à l’aise et faciliter les premiers échanges.
- Votre aisance peut vous aider à constituer un réseau de contacts utiles.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des relations nombreuses vous laissent moins de temps pour entretenir les plus proches.
- Votre naturel peut conduire certains à attendre de vous une disponibilité constante.

**Question pour l’entretien** (`hypothese`) : Comment choisissez-vous les relations que vous entretenez dans la durée ?

### E1 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous faites des amis très facilement, que vous vous sentez à l’aise avec presque tout le monde et que vous gardez rarement les autres à distance. Cela décrit une aisance dans le contact, non la qualité des liens ni votre attitude envers les autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez créer rapidement un climat de confiance dans un groupe nouvellement formé.
- Vous pouvez servir de point de jonction entre des personnes qui ne se connaissent pas.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que l’on vous sollicite de toutes parts, au détriment de votre temps de récupération.
- Votre aisance peut vous faire sous-estimer le temps qu’exige une relation de confiance.

**Question pour l’entretien** (`hypothese`) : Parmi vos nombreux contacts, lesquels comptent le plus pour vous, et comment les entretenez-vous ?

## E2 · Goût de la compagnie et des foules

**Définition.** Cette facette porte sur le goût pour la compagnie nombreuse, les rassemblements et les foules.

**Les quatre affirmations du questionnaire (français) :**

- « J'adore les grandes fêtes » (cotation directe)
- « Je parle à beaucoup de personnes dans les fêtes » (cotation directe)
- « Je préfère être seul » (cotation inversée)
- « J'évite les foules » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Conformisme » ne correspond pas à ce que mesurent les quatre affirmations : elles portent sur le goût de la compagnie, des fêtes et des foules, non sur la tendance à se conformer aux usages ou aux autres. Ce résultat ne dit rien de votre rapport aux règles ni à l’opinion des autres.

### E2 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez le plus souvent la solitude, que vous évitez les foules et que les grandes fêtes vous attirent peu. Cela décrit un goût pour la solitude ou les petits cercles, non un refus des autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez trouver dans les moments de solitude une ressource pour réfléchir et récupérer.
- Vous pouvez concentrer votre énergie sur des échanges en petit nombre et en profondeur.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des rassemblements où se jouent des décisions informelles se déroulent sans vous.
- Un cadre de travail très collectif peut vous coûter beaucoup d’énergie.

**Question pour l’entretien** (`hypothese`) : Quels formats de rencontre vous conviennent, et lesquels vous demandent le plus d’énergie ?

### E2 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une préférence pour les petits groupes et les moments au calme, avec des occasions où une fête ou une foule vous plaît. L’occasion et les personnes présentes semblent compter.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez profiter d’un événement collectif choisi tout en gardant des temps de retrait.
- Vous pouvez avoir des échanges plus suivis en petit comité.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous quittiez un grand rassemblement plus tôt que vos proches ne l’espéraient.
- Votre préférence pour le calme peut passer pour de la distance auprès de ceux qui aiment la foule.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui fait d’un grand rassemblement un moment que vous appréciez, quand c’est le cas ?

### E2 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le goût des foules ni vers celui de la solitude. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apprécier un grand événement un jour et un moment au calme le lendemain.
- Vous pouvez vous adapter à des organisations du travail plus ou moins collectives.

**Ce que cela peut coûter** (`hypothese`)

- Vos proches peuvent ne pas savoir s’ils doivent vous proposer une sortie à plusieurs ou un moment à deux.
- Vous pouvez hésiter entre rejoindre un rassemblement et garder du temps pour vous.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous fait préférer la compagnie nombreuse un jour et le calme un autre ?

### E2 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez le plus souvent les fêtes et les rassemblements, et que vous parlez volontiers à de nombreuses personnes. Il existe toutefois des situations où vous préférez le calme.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez entretenir de l’énergie dans un événement collectif.
- Vous pouvez faire circuler l’information entre des personnes qui ne se côtoient pas.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que de longues périodes de travail isolé vous pèsent.
- Vous pouvez accepter plus d’invitations que votre temps ne le permet.

**Question pour l’entretien** (`hypothese`) : Comment répartissez-vous votre temps entre rencontres nombreuses et moments de calme ?

### E2 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous adorez les grandes fêtes, que vous parlez à beaucoup de monde et que vous évitez rarement les foules. Cela décrit un goût pour la compagnie nombreuse, non un jugement sur vos relations.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez trouver votre énergie dans un cadre animé et la transmettre à ceux qui vous entourent.
- Vous pouvez aisément prendre la parole devant une assemblée nombreuse.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que le travail en solitude ou le silence vous paraisse long.
- Votre goût pour l’animation peut sembler envahissant à ceux qui préfèrent le calme.

**Question pour l’entretien** (`hypothese`) : Comment vivez-vous les périodes où vous avez peu de monde autour de vous ?

## E3 · Affirmation de soi

**Définition.** Cette facette porte sur la prise d’initiative et de direction dans l’action.

**Les quatre affirmations du questionnaire (français) :**

- « J’aime prendre les choses en main » (cotation directe)
- « J’essaie de diriger les autres » (cotation directe)
- « Je prends les choses en main » (cotation directe)
- « J’attends que les autres prennent les choses en main » (cotation inversée)

### E3 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez le plus souvent laisser d’autres prendre la direction des opérations. Cela décrit une préférence d’action, non une absence de capacité à diriger.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez laisser de la place aux idées des autres avant de vous prononcer.
- Vous pouvez être à l’aise dans un rôle d’appui ou d’exécution.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos idées restent dans l’ombre quand la discussion est vive.
- Quand personne ne prend l’initiative, vous pouvez attendre plus longtemps qu’il ne serait utile.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations avez-vous fini par prendre la direction malgré votre préférence, et comment cela s’est-il passé ?

### E3 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une préférence pour accompagner plutôt que mener, avec des moments où vous prenez les choses en main. Le contexte et l’enjeu semblent compter dans votre décision de prendre la direction.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez écouter avant de trancher.
- Vous pouvez prendre la direction quand la situation l’exige, sans en faire une habitude.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que d’autres occupent la place de direction par défaut.
- Votre prise de direction peut surprendre votre entourage, parce qu’elle est occasionnelle.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous décide à prendre la direction quand vous le faites ?

### E3 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la prise de direction ni vers le fait de la laisser à d’autres. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mener ou suivre selon ce que la situation demande.
- Vous pouvez vous adapter à des partages de rôles variés.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut ne pas savoir quel rôle vous convient.
- Dans un groupe qui attend quelqu’un pour décider, il se peut que vous hésitiez à vous avancer.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations préférez-vous mener, et dans lesquelles préférez-vous suivre ?

### E3 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous prenez assez volontiers la direction des opérations. Cette tendance concerne l’action et la prise d’initiative ; elle ne dit rien de la qualité du travail accompli.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez donner un cap quand un groupe tâtonne.
- Vous pouvez décider rapidement quand le temps manque.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos interlocuteurs n’aient pas le temps de proposer avant que vous ayez avancé.
- Votre rythme d’initiative peut être perçu comme de l’impatience.

**Question pour l’entretien** (`hypothese`) : Comment vous assurez-vous que chacun a pu s’exprimer avant que vous ne tranchiez ?

### E3 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous prenez très volontiers la direction des opérations et que vous aimez diriger les autres. Cette tendance concerne l’action et la prise d’initiative ; elle ne dit rien de la qualité du travail accompli.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez rassembler un groupe autour d’un objectif sans attendre qu’on vous le demande.
- Vous pouvez porter une décision difficile et en assumer la responsabilité.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que d’autres renoncent à proposer parce que la place est déjà occupée.
- Quand le rôle de direction est confié à quelqu’un d’autre, vous pouvez avoir du mal à le lui laisser.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations est-il utile pour vous de laisser quelqu’un d’autre diriger ?

## E4 · Niveau d’activité

**Définition.** Cette facette porte sur le rythme et la quantité d’activités que vous menez, au travail comme pendant votre temps libre.

**Les quatre affirmations du questionnaire (français) :**

- « Je suis toujours occupé » (cotation directe)
- « Je suis toujours en mouvement » (cotation directe)
- « Je fais beaucoup de choses pendant mon temps libre » (cotation directe)
- « J'aime prendre ça mollo » (cotation inversée)

### E4 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez prendre les choses à un rythme tranquille et que vous remplissez peu votre temps libre d’activités. Cela décrit un rythme préféré, non un manque d’énergie ni de motivation.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez prendre le temps de la réflexion avant de vous engager dans l’action.
- Vous pouvez préserver vos ressources en limitant le nombre de projets menés de front.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre rythme paraisse lent dans un environnement où tout s’accélère.
- Vous pouvez laisser passer des occasions qui demandent de se mobiliser vite.

**Question pour l’entretien** (`hypothese`) : Quel rythme de travail et de repos vous convient le plus naturellement, et pourquoi ?

### E4 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez un rythme plutôt tranquille, avec des périodes d’intense activité quand la situation le demande. Votre temps libre comporte aussi bien des moments de repos que des activités.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez alterner effort soutenu et récupération sans vous épuiser.
- Vous pouvez accepter un surcroît de travail ponctuel tout en protégeant vos temps de repos.

**Ce que cela peut coûter** (`hypothese`)

- Un rythme soutenu qui se prolonge peut vous demander un effort d’adaptation important.
- Votre entourage plus actif peut vous trouver peu disponible pour des projets supplémentaires.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous pousse à accélérer le rythme quand vous le faites ?

### E4 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers un emploi du temps très rempli ni vers un rythme tranquille. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tenir un emploi du temps chargé ou un rythme calme selon les périodes.
- Vous pouvez vous ajuster au rythme de l’équipe avec laquelle vous travaillez.

**Ce que cela peut coûter** (`hypothese`)

- Votre rythme peut paraître irrégulier à ceux qui attendent une cadence constante.
- Vous pouvez hésiter sur le nombre d’engagements à accepter.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui détermine, selon les périodes, si vous remplissez votre emploi du temps ou si vous le laissez respirer ?

### E4 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous avez le plus souvent un emploi du temps bien rempli et que vous aimez faire beaucoup de choses pendant votre temps libre. Vous avez toutefois des moments où vous préférez ralentir.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mener plusieurs tâches de front quand la charge augmente.
- Votre énergie peut entraîner d’autres personnes dans l’action.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos temps de récupération soient réduits quand l’agenda se remplit.
- Vous pouvez avoir tendance à ajouter des engagements avant d’avoir terminé les précédents.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous de ce que vous acceptez ou refusez quand votre agenda est déjà chargé ?

### E4 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous avez presque toujours quelque chose à faire, que vous restez en mouvement et que vous aimez peu ralentir. Cela décrit un rythme d’activité, non une quantité de travail utile ni la qualité de ce qui est accompli.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez avancer sur de nombreux sujets en parallèle et maintenir une cadence soutenue.
- Vous pouvez donner de l’élan à une équipe qui manque d’entrain.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que le repos vous paraisse difficile, même quand il serait utile.
- Votre rythme peut fatiguer ceux qui ne peuvent pas le suivre.

**Question pour l’entretien** (`hypothese`) : Que se passe-t-il pour vous quand vous devez ralentir ou attendre sans rien faire ?

## E5 · Goût de l’aventure et du risque

**Définition.** Cette facette porte sur l’attrait pour les sensations intenses, l’aventure et la prise de risque.

**Les quatre affirmations du questionnaire (français) :**

- « J'adore les sensations fortes » (cotation directe)
- « Je recherche l'aventure » (cotation directe)
- « J'aime être téméraire » (cotation directe)
- « J'agis de façon téméraire » (cotation directe)

> **Avertissement sur le libellé.** Le titre « Enthousiasme » est plus large que ce que mesurent les quatre affirmations : elles portent sur le goût des sensations intenses, de l’aventure et de la témérité, non sur l’entrain ou la motivation. Ce résultat ne dit rien de votre implication dans votre travail.

### E5 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les sensations intenses, l’aventure et les gestes téméraires vous attirent peu. Cela décrit un attrait, non une absence de courage.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mesurer les risques avant de vous engager dans une situation incertaine.
- Votre goût pour la stabilité peut rassurer un groupe qui doit tenir sur la durée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous laissiez passer des occasions qui demandaient d’accepter une part d’incertitude.
- Vous pouvez trouver déroutante une personne qui propose sans cesse des projets audacieux.

**Question pour l’entretien** (`hypothese`) : Quelle part d’incertitude vous convient dans votre travail et dans vos loisirs ?

### E5 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’aventure vous attire peu en général, avec quelques situations où vous aimez les sensations intenses. Le contexte et le niveau de risque semblent compter.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez saisir une occasion inhabituelle quand elle vous paraît maîtrisable.
- Vous pouvez goûter une expérience nouvelle sans en faire une recherche permanente.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entourage ne sache pas quand vous accepterez une proposition audacieuse.
- Vous pouvez regretter, après coup, d’avoir décliné une occasion qui vous tentait.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances une expérience intense ou aventureuse vous a-t-elle tenté ?

### E5 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le goût du risque ni vers la recherche de stabilité. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez choisir de prendre un risque ou de l’éviter selon l’enjeu.
- Vous pouvez comprendre à la fois ceux qui cherchent l’aventure et ceux qui la redoutent.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut ne pas savoir à quel type de proposition vous répondrez favorablement.
- Vous pouvez hésiter devant une décision qui comporte une part de risque.

**Question pour l’entretien** (`hypothese`) : Selon quels critères décidez-vous qu’une prise de risque en vaut la peine ?

### E5 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez assez volontiers les sensations intenses et l’aventure. Il s’agit d’un attrait pour l’intensité, qui ne dit rien de la manière dont vous évaluez les risques.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez proposer une voie nouvelle quand un groupe tourne en rond.
- Vous pouvez rester à l’aise dans une situation incertaine.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos interlocuteurs jugent vos propositions plus audacieuses qu’ils ne le souhaitent.
- Vous pouvez vous lasser d’un environnement très stable.

**Question pour l’entretien** (`hypothese`) : Comment évaluez-vous les conséquences possibles avant de vous lancer dans une expérience intense ?

### E5 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous adorez les sensations intenses, que vous cherchez l’aventure et que vous aimez agir de façon téméraire. Cela décrit un attrait pour l’intensité et le risque, non un jugement sur votre façon de vivre.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez entrer dans une situation inconnue sans attendre que tout soit certain.
- Vous pouvez entraîner un groupe vers des projets qui sortent de l’ordinaire.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des risques soient pris plus vite que votre entourage ne le souhaiterait.
- Un environnement très cadré ou très routinier peut vous peser.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous de vous lancer ou non quand une situation vous attire par son intensité ?

## E6 · Joie de vivre et regard positif

**Définition.** Cette facette porte sur la joie de vivre, le plaisir ressenti au quotidien et le regard porté sur le bon côté des choses.

**Les quatre affirmations du questionnaire (français) :**

- « Je rayonne de joie » (cotation directe)
- « J'ai beaucoup de plaisir » (cotation directe)
- « J'adore la vie » (cotation directe)
- « Je regarde le bon côté de la vie » (cotation directe)

### E6 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la joie et le plaisir se manifestent peu souvent dans votre quotidien et que vous cherchez peu le bon côté des choses. Cela décrit un ressenti déclaré à un moment donné, qui peut varier selon la période de vie ; ce n’est pas un diagnostic.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez porter un regard réaliste sur une situation sans l’enjoliver.
- Vous pouvez remarquer ce qui ne va pas avant que l’entrain collectif ne le masque.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que peu de moments de la journée vous apportent du plaisir.
- Votre entourage peut interpréter votre réserve comme un manque d’adhésion.

**Question pour l’entretien** (`hypothese`) : Quels moments ou quelles activités vous apportent du plaisir, même discret ?

### E6 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la joie et le plaisir sont présents par moments dans votre quotidien, sans en être la tonalité dominante. Vous gardez un regard plutôt nuancé sur les choses.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apprécier les bons moments avec mesure et sans excès d’enthousiasme.
- Votre regard nuancé peut aider à peser le pour et le contre.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des moments agréables passent sans que vous les remarquiez.
- Vous pouvez avoir du mal à partager l’élan d’un groupe très enthousiaste.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances ressentez-vous le plus de plaisir ou de légèreté ?

### E6 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers une joie très présente ni vers une tonalité plus réservée. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez partager la bonne humeur d’un groupe comme prendre du recul quand la situation l’exige.
- Vous pouvez voir à la fois ce qui va bien et ce qui pose problème.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut avoir du mal à lire votre humeur.
- Vous pouvez hésiter à exprimer votre joie ou vos réserves devant un groupe dont l’humeur est très marquée.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui fait pencher votre humeur du côté du plaisir ou de la réserve selon les jours ?

### E6 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous ressentez le plus souvent du plaisir et de la joie, et que vous regardez volontiers le bon côté des choses. Il y a des moments où ce regard cède la place à plus de réserve.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez donner de l’élan à un groupe par votre bonne humeur.
- Vous pouvez trouver une ressource dans les aspects positifs d’une situation difficile.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entrain prête à confusion quand vous traversez une période pénible.
- Vous pouvez minimiser, sans le vouloir, une difficulté que d’autres jugent sérieuse.

**Question pour l’entretien** (`hypothese`) : Comment tenez-vous compte de ce qui va mal, quand votre regard se porte d’abord sur ce qui va bien ?

### E6 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous rayonnez de joie, que vous avez beaucoup de plaisir et que vous adorez la vie. Cela décrit un ressenti déclaré, qui ne dit rien de la justesse du regard porté sur les situations.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez soutenir l’énergie et la motivation d’un groupe dans une période exigeante.
- Votre goût de la vie peut rendre les échanges avec vous agréables.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre bonne humeur paraisse déplacée à certains quand la situation est grave.
- Vous pouvez avoir du mal à entendre ou à exprimer des préoccupations qui contrastent avec l’ambiance.

**Question pour l’entretien** (`hypothese`) : Comment réagissez-vous quand votre entourage ne partage pas votre humeur du moment ?

## O1 · Imagination et rêverie

**Définition.** Cette facette porte sur la place de l’imagination, de la rêverie et des pensées libres dans votre vie intérieure.

**Les quatre affirmations du questionnaire (français) :**

- « J’ai une imagination débordante » (cotation directe)
- « J’aime me perdre dans mes idées » (cotation directe)
- « J’adore rêvasser » (cotation directe)
- « J’aime me perdre dans mes pensées » (cotation directe)

### O1 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous laissez rarement aller à la rêverie et que votre attention reste le plus souvent sur ce qui est devant vous. Cela décrit une manière d’occuper son esprit, non une absence d’idées neuves.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez garder votre attention sur la tâche en cours sans vous disperser.
- Vous pouvez transmettre une information de façon directe, sans détour par des scénarios imaginaires.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des pistes inattendues vous échappent, faute de temps laissé à l’imagination.
- Un projet qui demande d’inventer à partir de rien peut vous sembler peu naturel.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations avez-vous eu besoin de laisser votre esprit vagabonder pour trouver une solution ?

### O1 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la rêverie vous visite de temps en temps, sans occuper une grande place dans votre quotidien. Votre imagination semble se mettre au service d’un but précis plutôt que de vagabonder librement.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mobiliser votre imagination quand un problème l’exige, puis revenir au concret.
- Vous pouvez imaginer des scénarios sans vous y perdre.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous écourtiez des moments de réflexion libre qui auraient fait mûrir une idée.
- Des interlocuteurs plus rêveurs peuvent avoir l’impression que vous voulez conclure vite.

**Question pour l’entretien** (`hypothese`) : À quelles occasions laissez-vous volontiers votre esprit vagabonder ?

### O1 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la rêverie ni vers une attention tournée vers le présent. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez passer d’un temps de réflexion libre à une tâche concrète selon le moment.
- Vous pouvez imaginer quand la situation s’y prête et vous en tenir aux faits quand elle l’exige.

**Ce que cela peut coûter** (`hypothese`)

- Votre goût pour la rêverie peut varier d’un jour à l’autre, ce qui peut dérouter votre entourage.
- Il se peut que vous hésitiez à consacrer du temps à une idée qui n’a pas encore de forme.

**Question pour l’entretien** (`hypothese`) : Quels moments de la journée ou de la semaine laissez-vous à votre imagination ?

### O1 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût assez marqué pour la rêverie et pour les idées qui naissent quand l’esprit vagabonde. Cette tendance décrit une manière d’occuper son esprit ; elle ne dit rien de la valeur des idées produites.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez proposer des pistes originales quand un groupe tourne en rond.
- Vous pouvez envisager plusieurs issues à une situation avant d’agir.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre attention s’éloigne d’une réunion ou d’une tâche répétitive.
- Vous pouvez avoir besoin de temps pour transformer une idée en plan d’action.

**Question pour l’entretien** (`hypothese`) : Comment faites-vous pour que vos idées arrivent jusqu’à une décision ou une action ?

### O1 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût très marqué pour l’imagination, la rêverie et le fait de se perdre dans ses idées et ses pensées. Cette tendance décrit une manière d’occuper son esprit ; elle ne dit rien de la valeur des idées produites.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez enrichir un projet de scénarios et d’images que d’autres n’auraient pas envisagés.
- Votre vie intérieure peut vous offrir une source d’idées quand l’environnement est pauvre en stimulation.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous perdiez le fil d’une conversation ou d’une consigne quand vos pensées s’emballent.
- Vos idées peuvent rester à l’état de projets imaginés, faute d’étapes concrètes pour les réaliser.

**Question pour l’entretien** (`hypothese`) : Quels repères vous aident à revenir au présent quand vos pensées vous emportent ?

## O2 · Sensibilité artistique

**Définition.** Cette facette porte sur l’intérêt pour l’art, la poésie et les musées, et sur l’attention à la beauté de ce qui nous entoure.

**Les quatre affirmations du questionnaire (français) :**

- « Je crois en l’importance de l’art » (cotation directe)
- « Je perçois de la beauté dans les choses que d’autres pourraient ne pas remarquer » (cotation directe)
- « Je n’aime pas la poésie » (cotation inversée)
- « Je n’apprécie pas visiter des musées d’art » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Sens artistique » peut laisser croire que cette facette mesure un talent ou une culture. Les quatre affirmations portent sur le goût pour l’art et la poésie et sur l’attention à la beauté, non sur ce que vous savez faire ou connaître.

### O2 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’art, la poésie et les musées vous touchent peu, et que vous remarquez rarement de la beauté dans les choses ordinaires. Cela décrit un goût, non une insensibilité ni un manque de culture.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez juger une situation sur ses faits, sans que son apparence pèse sur votre jugement.
- Vous pouvez consacrer votre temps libre à d’autres centres d’intérêt avec constance.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez moins d’affinité avec des collègues pour qui l’esthétique compte dans un projet.
- Un travail où le soin de la forme est déterminant peut vous demander un effort particulier.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances l’aspect esthétique d’un travail a-t-il compté pour vous malgré tout ?

### O2 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un intérêt limité pour l’art, avec quelques exceptions selon les formes ou les occasions. Votre sensibilité à la beauté semble s’éveiller de manière sélective.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apprécier une œuvre ou un lieu qui vous parle, sans chercher à tout explorer.
- Vous pouvez tenir compte de la forme quand elle sert un objectif précis.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez à côté d’une œuvre ou d’un lieu qui vous aurait plu, faute d’y avoir prêté attention.
- Dans un groupe très tourné vers la culture, vous pouvez hésiter à vous exprimer.

**Question pour l’entretien** (`hypothese`) : Quelles formes d’art ou de beauté vous touchent, et lesquelles ne vous disent rien ?

### O2 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers l’attrait pour l’art ni vers le détachement à son égard. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apprécier l’art à l’occasion, sans en faire une priorité.
- Vous pouvez dialoguer avec des personnes très sensibles à l’art comme avec d’autres qui le sont peu.

**Ce que cela peut coûter** (`hypothese`)

- Votre intérêt pour l’art peut dépendre de l’humeur ou du contexte, ce qui peut rendre vos goûts difficiles à cerner pour vos proches.
- Il se peut que vous hésitiez à vous prononcer sur une question de goût.

**Question pour l’entretien** (`hypothese`) : Dans quelles occasions l’art ou la beauté prennent-ils de l’importance pour vous ?

### O2 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un attrait assez marqué pour l’art, la poésie et les lieux culturels, avec une attention à la beauté de ce qui vous entoure. Cette tendance décrit un goût et une sensibilité, non un talent artistique.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez remarquer des détails de forme ou d’ambiance qui échappent à d’autres.
- Vous pouvez apporter un souci d’esthétique à un livrable ou à un espace de travail.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez du temps sur la forme alors que le délai demande d’aller à l’essentiel.
- Vos interlocuteurs peuvent ne pas partager l’importance que vous accordez à l’apparence des choses.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous jusqu’où soigner la forme d’un travail ?

### O2 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un attrait très marqué pour l’art et la poésie, avec une grande attention à la beauté, y compris dans ce que d’autres ne remarquent pas. Cette tendance décrit un goût et une sensibilité, non un talent artistique.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez faire ressortir une dimension sensible ou symbolique dans un projet.
- Vous pouvez donner à d’autres l’envie de regarder les choses autrement.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ressentiez un décalage dans un cadre où l’esthétique est jugée secondaire.
- Vous pouvez avoir du mal à accepter un résultat que vous trouvez négligé, même s’il remplit sa fonction.

**Question pour l’entretien** (`hypothese`) : Comment partagez-vous ce que vous percevez avec des personnes moins attentives à la beauté ?

## O3 · Intensité et écoute des émotions

**Définition.** Cette facette porte sur l’intensité avec laquelle vous vivez vos émotions et sur l’attention que vous portez aux émotions, les vôtres comme celles des autres.

**Les quatre affirmations du questionnaire (français) :**

- « Je vis mes émotions intensément » (cotation directe)
- « Je ressens les émotions des autres » (cotation directe)
- « Je suis rarement sensible à mes réactions émotionnelles » (cotation inversée)
- « Je ne comprends pas les gens qui ont des réactions émotionnelles fortes » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Affection » peut laisser croire que cette facette mesure la tendresse ou l’attachement envers les autres. Les quatre affirmations portent sur l’intensité de vos émotions et sur l’attention portée aux vôtres et à celles d’autrui, non sur l’affection.

### O3 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vivez vos émotions avec retenue, que vous y prêtez peu attention et que vous comprenez mal les réactions émotionnelles intenses des autres. Cela décrit une manière de vivre et de repérer les émotions, non une absence d’émotions ni d’empathie.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez garder une certaine distance dans les situations chargées d’émotion.
- Vous pouvez aborder un désaccord en vous appuyant sur les faits plutôt que sur le ressenti.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous repériez tard ce que vous ressentez vous-même.
- Vous pouvez avoir du mal à comprendre une personne dont la réaction émotionnelle vous surprend.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations avez-vous eu besoin de prêter davantage attention à ce que vous ressentiez ?

### O3 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent des émotions plutôt discrètes, que vous remarquez surtout quand elles s’imposent, et une compréhension partielle des réactions des autres. Les émotions d’autrui semblent vous atteindre selon la situation et la proximité.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez garder votre calme quand l’ambiance se tend.
- Vous pouvez écouter une personne émue sans vous laisser submerger.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des signaux émotionnels discrets de votre entourage vous échappent.
- Vos proches peuvent attendre de vous une réaction plus visible que celle que vous donnez.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aide à repérer ce qu’une autre personne ressent quand elle ne le dit pas ?

### O3 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers une vie émotionnelle intense et attentive ni vers la réserve. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vous adapter à des interlocuteurs plus expressifs comme à d’autres plus réservés.
- Vous pouvez accueillir une émotion sans qu’elle prenne toute la place.

**Ce que cela peut coûter** (`hypothese`)

- Votre manière de réagir peut varier d’une situation à l’autre, ce qui peut la rendre difficile à anticiper pour votre entourage.
- Il se peut que vous hésitiez à partager ce que vous ressentez.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations laissez-vous vos émotions s’exprimer, et dans lesquelles les gardez-vous pour vous ?

### O3 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent des émotions assez vives, auxquelles vous prêtez attention, et une réceptivité à ce que ressentent les autres. Cette tendance concerne l’intensité et l’écoute des émotions ; elle ne dit rien de la tendresse que vous éprouvez pour autrui.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez percevoir l’ambiance d’une équipe et repérer une tension naissante.
- Vous pouvez comprendre qu’une personne réagisse vivement sans la juger.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que l’état émotionnel de votre entourage vous touche au point de peser sur votre journée.
- Vous pouvez avoir du mal à garder la distance dans une décision qui affecte des personnes.

**Question pour l’entretien** (`hypothese`) : Comment prenez-vous du recul quand les émotions d’un groupe vous atteignent ?

### O3 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent des émotions très vives, que vous percevez nettement, et une grande réceptivité à celles des autres. Cette tendance concerne l’intensité et l’écoute des émotions ; elle ne dit rien de la tendresse que vous éprouvez pour autrui.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez percevoir avec finesse l’état d’une personne et ajuster votre manière de lui parler.
- Vous pouvez donner de la profondeur à une relation en prenant les émotions au sérieux.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des émotions intenses compliquent une décision ou une conversation difficile.
- Vous pouvez ressentir durablement les tensions de votre entourage, même lorsqu’elles ne vous concernent pas.

**Question pour l’entretien** (`hypothese`) : Quelles habitudes vous aident à vous ressourcer après une période émotionnellement chargée ?

## O4 · Goût de la variété

**Définition.** Cette facette porte sur le goût de la variété et du changement, par opposition à la routine et aux méthodes habituelles.

**Les quatre affirmations du questionnaire (français) :**

- « Je préfère la variété à la routine » (cotation directe)
- « Je préfère m’en tenir à ce que je connais » (cotation inversée)
- « Je n’aime pas les changements » (cotation inversée)
- « Je suis attaché aux méthodes conventionnelles » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Aventure » peut évoquer la recherche de sensations ou le goût du risque. Les quatre affirmations portent sur la préférence entre la variété et la routine, entre les méthodes connues et les méthodes nouvelles, non sur le rapport au risque.

### O4 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez ce que vous connaissez, que vous appréciez la routine et les méthodes éprouvées, et que le changement ne vous attire pas. Cela décrit un goût pour la stabilité, non une réticence à apprendre.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez assurer une régularité dans un travail qui demande des gestes sûrs.
- Vous pouvez vous appuyer sur des méthodes éprouvées pour limiter les erreurs.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’un changement d’organisation vous demande un effort important.
- Vous pouvez hésiter à essayer une méthode nouvelle tant que l’ancienne fonctionne.

**Question pour l’entretien** (`hypothese`) : Quels changements avez-vous finalement accueillis avec satisfaction, et qu’est-ce qui les a rendus acceptables ?

### O4 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une préférence pour le connu et les habitudes, avec une curiosité occasionnelle pour la nouveauté. Votre accueil du changement semble dépendre de ce qu’il apporte.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez adopter une nouveauté quand son intérêt est démontré.
- Vous pouvez offrir un cadre stable à une équipe en période de changement.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous attendiez longtemps avant d’essayer une approche nouvelle.
- Votre réserve face à la nouveauté peut être comprise comme de la résistance.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous convainc d’essayer une méthode nouvelle ?

### O4 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la variété ni vers la routine. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apprécier une routine stable et accueillir un changement quand il a du sens.
- Vous pouvez vous entendre avec des collègues qui aiment bouger comme avec ceux qui préfèrent la stabilité.

**Ce que cela peut coûter** (`hypothese`)

- Votre goût pour la nouveauté peut dépendre de la période, ce qui peut rendre vos préférences difficiles à deviner.
- Il se peut que vous hésitiez entre changer et conserver.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations la routine vous convient-elle, et dans lesquelles la variété vous manque-t-elle ?

### O4 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez assez nettement la variété à la routine et que vous changez volontiers de méthode. Cette tendance décrit un goût pour la variété ; elle ne dit rien de votre rapport au risque.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apporter un souffle nouveau à une équipe installée dans ses habitudes.
- Vous pouvez vous adapter à un changement d’organisation sans trop de résistance.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous perdiez de l’intérêt pour une tâche qui devient répétitive.
- Vous pouvez multiplier les changements au point de fatiguer votre entourage.

**Question pour l’entretien** (`hypothese`) : Comment trouvez-vous de l’intérêt dans les tâches qui reviennent régulièrement ?

### O4 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût très marqué pour la variété, le changement et les méthodes inhabituelles, et peu d’attrait pour la routine. Cette tendance décrit un goût pour la variété ; elle ne dit rien de votre rapport au risque.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez essayer des approches inédites là où les habitudes sont installées.
- Vous pouvez vous sentir à l’aise dans un contexte qui évolue sans cesse.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous quittiez une méthode éprouvée avant d’en avoir tiré le bénéfice.
- Une tâche répétitive mais nécessaire peut vous peser davantage que prévu.

**Question pour l’entretien** (`hypothese`) : Comment faites-vous pour mener à terme une tâche qui n’a plus rien de nouveau ?

## O5 · Curiosité intellectuelle

**Définition.** Cette facette porte sur l’intérêt pour les idées abstraites, la lecture exigeante et les discussions théoriques.

**Les quatre affirmations du questionnaire (français) :**

- « J’adore lire des documents exigeants » (cotation directe)
- « J’évite les discussions philosophiques » (cotation inversée)
- « J’ai des difficultés à comprendre les idées abstraites » (cotation inversée)
- « Je ne suis pas intéressé par les discussions théoriques » (cotation inversée)

### O5 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez les sujets concrets aux discussions abstraites ou théoriques. Cela décrit un intérêt, non une capacité de compréhension.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ramener une discussion aux faits et aux actions possibles.
- Votre travail peut être efficace là où une méthode éprouvée suffit.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez à côté d’idées dont l’intérêt n’apparaît qu’après un détour théorique.
- Une réflexion de fond peut vous sembler éloignée de votre travail réel.

**Question pour l’entretien** (`hypothese`) : Quelles situations de travail vous ont déjà montré l’utilité d’une réflexion plus abstraite ?

### O5 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût marqué pour le concret, avec un intérêt occasionnel pour les idées abstraites. L’intérêt pour la théorie semble dépendre du sujet.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez relier une idée à son application.
- Vous pouvez vous engager dans une réflexion théorique quand elle a un but précis.

**Ce que cela peut coûter** (`hypothese`)

- Un débat d’idées peut être écourté avant d’avoir porté ses fruits.
- Un document très abstrait peut vous demander un effort que vous préférez éviter.

**Question pour l’entretien** (`hypothese`) : Sur quels sujets une réflexion théorique vous paraît-elle utile ?

### O5 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le concret ni vers l’abstrait. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez passer d’une discussion théorique à une question pratique.
- Vous pouvez vous adapter à des interlocuteurs de styles différents.

**Ce que cela peut coûter** (`hypothese`)

- Votre intérêt pour la théorie peut dépendre de votre disponibilité du moment.
- Vous pouvez hésiter sur le niveau d’abstraction à adopter dans une présentation.

**Question pour l’entretien** (`hypothese`) : Quand préférez-vous creuser une idée, et quand préférez-vous passer à l’action ?

### O5 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût assez marqué pour les idées, la lecture exigeante et les discussions théoriques. Cette tendance décrit un intérêt, non un niveau de connaissance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apporter du recul et des cadres de réflexion à un groupe.
- Vous pouvez vous plonger dans un sujet complexe sans vous lasser rapidement.

**Ce que cela peut coûter** (`hypothese`)

- Une discussion théorique peut vous retenir plus longtemps que le projet ne le permet.
- Il se peut que vos interlocuteurs trouvent vos propos éloignés de leurs préoccupations immédiates.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous qu’une réflexion a suffisamment avancé pour passer à l’action ?

### O5 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût très marqué pour les idées abstraites, la lecture exigeante et les discussions théoriques. Cette tendance décrit un intérêt, non un niveau de connaissance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez éclairer un problème par des angles que le groupe n’avait pas envisagés.
- Vous pouvez soutenir un effort de lecture ou de recherche sur la durée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que l’exploration d’idées prenne le pas sur la décision à prendre.
- Votre langage peut devenir difficile à suivre pour qui n’aime pas l’abstraction.

**Question pour l’entretien** (`hypothese`) : Quels moyens utilisez-vous pour rendre vos idées accessibles à ceux qui préfèrent le concret ?

## O6 · Ouverture aux positions non conventionnelles

**Définition.** Cette facette porte sur l’ouverture à des positions non conventionnelles, par opposition à l’attachement aux repères établis.

**Les quatre affirmations du questionnaire (français) :**

- « J’ai tendance voter pour des candidats libéraux » (cotation directe)
- « Je crois qu’il n’y a pas de bien ou de mal absolu » (cotation directe)
- « J’ai tendance à voter pour des candidats conservateurs » (cotation inversée)
- « Je crois que nous devrions être sévères à propos des crimes » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Libéralisme » peut sembler désigner une position précise, alors que le texte décrit seulement l’ouverture à des positions non conventionnelles ou l’attachement à l’ordre établi. Les affirmations touchent à des opinions politiques et morales. Une opinion est une donnée sensible : elle ne doit jamais être restituée à un employeur ni servir à juger une personne.

### O6 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un attachement aux repères établis et aux règles stables, avec la conviction que certaines limites sont claires et que les écarts appellent de la fermeté. Cela décrit un attachement aux repères établis, non un jugement sur vos valeurs.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez offrir un repère stable quand un groupe doute de ses règles.
- Vous pouvez veiller à la continuité des pratiques qui ont fait leurs preuves.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des positions inhabituelles vous semblent difficiles à examiner avec sérénité.
- Vous pouvez avoir du mal à accueillir un point de vue qui remet en cause un cadre que vous jugez établi.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations avez-vous eu intérêt à examiner une position inhabituelle avant de vous prononcer ?

### O6 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent un attachement assez marqué aux repères établis, avec une ouverture occasionnelle à des points de vue différents. Votre accueil des positions inhabituelles semble dépendre du sujet.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez distinguer ce qui mérite d’être conservé de ce qui peut évoluer.
- Vous pouvez examiner une idée nouvelle sans abandonner vos repères.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous jugiez une idée inhabituelle avant de l’avoir écoutée en entier.
- Des interlocuteurs plus ouverts au changement peuvent penser que vous tardez à faire évoluer votre position.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous conduit à réviser un point de vue auquel vous teniez ?

### O6 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers l’attachement aux repères établis ni vers l’ouverture aux positions non conventionnelles. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez dialoguer avec des personnes de sensibilités très différentes.
- Vous pouvez peser les arguments au cas par cas.

**Ce que cela peut coûter** (`hypothese`)

- Vos positions peuvent varier selon les sujets, ce qui peut rendre votre avis difficile à prévoir.
- Il se peut que vous hésitiez à vous prononcer sur une question de principe.

**Question pour l’entretien** (`hypothese`) : Sur quels sujets vos convictions sont-elles les plus arrêtées, et sur lesquels restent-elles ouvertes ?

### O6 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une ouverture assez marquée aux positions non conventionnelles et la conviction que les repères moraux dépendent souvent des situations. Cette tendance décrit une manière d’aborder les questions de principe ; elle ne dit rien de la valeur de vos opinions.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez examiner sans a priori une idée qui sort du cadre habituel.
- Vous pouvez aider un groupe à considérer plusieurs points de vue avant de conclure.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre souplesse déroute des interlocuteurs qui tiennent à des règles claires.
- Vous pouvez avoir du mal à trancher quand toutes les options vous paraissent défendables.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous qu’une règle doit être maintenue plutôt que remise en cause ?

### O6 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une ouverture très marquée aux positions non conventionnelles, la conviction que le bien et le mal n’ont rien d’absolu et peu d’attrait pour la fermeté envers les écarts. Cette tendance décrit une manière d’aborder les questions de principe ; elle ne dit rien de la valeur de vos opinions.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez remettre en question une habitude que plus personne ne questionne.
- Vous pouvez accueillir des points de vue très différents sans chercher à les ranger d’emblée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’un cadre commun soit difficile à tenir si vous en remettez souvent les règles en question.
- Vous pouvez heurter des personnes pour qui certaines règles ne se discutent pas.

**Question pour l’entretien** (`hypothese`) : Quelles règles ou quels principes tenez-vous pour non négociables, malgré votre ouverture ?

## A1 · Confiance envers les autres

**Définition.** Cette facette porte sur la confiance que vous accordez aux autres, à leurs propos comme à leurs intentions.

**Les quatre affirmations du questionnaire (français) :**

- « Je fais confiance aux autres » (cotation directe)
- « Je crois que les autres ont de bonnes intentions » (cotation directe)
- « J'ai confiance en ce que les gens disent » (cotation directe)
- « Je ne fais pas confiance aux autres » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Confiance » désigne ici la confiance envers autrui, non la confiance en soi : les quatre affirmations portent sur ce que vous croyez des intentions et de la parole des autres.

### A1 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous accordez peu spontanément votre confiance aux autres, à leurs propos comme à leurs intentions. Cela décrit une attitude déclarée face à autrui, non un jugement sur les personnes que vous côtoyez.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vérifier une information avant de vous y fier.
- Vous pouvez repérer plus tôt les situations où la prudence s’impose.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos interlocuteurs perçoivent de la méfiance dans vos questions.
- Vous pouvez consacrer du temps à contrôler ce que d’autres auraient simplement confirmé.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aide à accorder votre confiance à quelqu’un, et qu’est-ce qui vous la fait retirer ?

### A1 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une confiance accordée avec réserve : vous attendez souvent d’avoir des éléments avant de croire ce que disent les autres. Les circonstances et la connaissance que vous avez des personnes semblent compter dans cette attitude.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez accorder votre confiance de manière progressive, au fil des preuves.
- Vous pouvez poser des questions utiles avant de vous engager.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que la confiance mette du temps à s’installer dans vos nouvelles relations de travail.
- Des collègues peuvent ressentir cette réserve comme un doute sur leur parole.

**Question pour l’entretien** (`hypothese`) : Quels signes vous font passer de la réserve à la confiance avec une personne nouvelle ?

### A1 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers une confiance spontanée envers les autres ni vers la méfiance. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez accorder ou retenir votre confiance selon la personne et l’enjeu.
- Vous pouvez croire sur parole dans certains cas et vérifier dans d’autres.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut ne pas savoir à quoi s’attendre de votre part.
- Il se peut que vous hésitiez à vous fier à quelqu’un quand les signaux sont ambigus.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations faites-vous confiance d’emblée, et dans lesquelles préférez-vous vérifier ?

### A1 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous accordez assez volontiers votre confiance et que vous prêtez le plus souvent de bonnes intentions aux autres. Cette attitude se décrit sans préjuger de ce que les autres font réellement.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez faciliter la coopération en partant d’un a priori favorable.
- Vous pouvez créer un climat où les autres osent s’exprimer.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous releviez tardivement un écart entre ce qui est dit et ce qui est fait.
- Une déception peut survenir quand une attente de loyauté n’est pas satisfaite.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous qu’une information mérite d’être vérifiée malgré votre confiance ?

### A1 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous faites très volontiers confiance aux autres, à ce qu’ils disent comme à leurs intentions. Cette attitude se décrit sans préjuger de la fiabilité des personnes concernées.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez nouer rapidement des relations de travail fondées sur la bonne foi.
- Vous pouvez inciter les autres à se montrer ouverts avec vous.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous acceptiez des affirmations sans les confronter aux faits quand l’enjeu est élevé.
- Vous pouvez avoir à reprendre un engagement si quelqu’un n’a pas tenu parole.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations vérifier ce qu’on vous dit vous paraît-il utile malgré votre confiance ?

## A2 · Usage des autres à ses propres fins

**Définition.** Cette facette est mesurée par quatre affirmations sur ce que vous déclarez de vos propres pratiques : utiliser les autres pour vos fins, tricher pour avancer, profiter des autres, entraver leurs plans.

**Les quatre affirmations du questionnaire (français) :**

- « J'utilise les autres pour mes propres fins » (cotation inversée)
- « Je triche pour avancer » (cotation inversée)
- « Je profite des autres » (cotation inversée)
- « J'entrave les plans des autres » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Moralité » est beaucoup plus large que ce qui est mesuré : les quatre affirmations portent seulement sur ce que vous déclarez de vos pratiques, non sur votre valeur morale ni sur votre honnêteté. Ce résultat repose sur votre seule déclaration ; il ne doit jamais servir à juger une personne.

### A2 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez volontiers des pratiques où les autres servent vos propres fins : en tirer parti, contourner une règle, gêner un projet. Cela rapporte ce que vous déclarez sur vous-même ; ce n’est ni un jugement moral ni une mesure d’honnêteté, et une grande franchise peut produire ce type de réponse.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez avoir un sens aigu de vos intérêts et des occasions à saisir.
- Vous pouvez négocier avec lucidité, en sachant ce que vous cherchez.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certains collègues vous prêtent plus d’arrière-pensées que vous n’en avez.
- Des relations de travail peuvent gagner en confiance si vos buts sont dits ouvertement.

**Question pour l’entretien** (`hypothese`) : Quand vos intérêts et ceux d’un collègue divergent, comment procédez-vous ?

### A2 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous reconnaissez parfois, dans votre manière d’avancer, de tirer parti d’une situation ou d’autrui. Cela rapporte ce que vous déclarez sur vous-même ; ce n’est ni un jugement moral ni une mesure d’honnêteté.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez saisir une occasion quand elle se présente, sans vous en excuser.
- Vous pouvez défendre vos intérêts avec pragmatisme.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre pragmatisme soit lu comme de l’opportunisme par des collègues qui vous connaissent peu.
- Des collaborations peuvent se tendre si vos interlocuteurs ignorent ce que vous cherchez.

**Question pour l’entretien** (`hypothese`) : Comment arbitrez-vous entre un avantage personnel et l’intérêt d’un collègue ?

### A2 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la reconnaissance de pratiques tournées vers vos seuls buts ni vers leur rejet complet. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez défendre vos intérêts tout en tenant compte de ceux des autres.
- Vous pouvez adapter votre manière d’agir aux règles propres à chaque situation.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre ligne de conduite semble varier selon les enjeux.
- Vous pouvez hésiter entre avancer pour vous et laisser la place à un autre.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations vous autorisez-vous à passer avant un autre, et dans lesquelles y renoncez-vous ?

### A2 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous déclarez le plus souvent ne pas utiliser les autres pour vos fins, ni profiter d’eux, ni entraver leurs plans. Cela traduit ce que vous déclarez sur vous-même, sans constituer un jugement moral ni une mesure d’honnêteté.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez inspirer la confiance de collègues qui attendent de la loyauté dans l’échange.
- Vous pouvez privilégier des gains partagés plutôt que des gains obtenus aux dépens d’autrui.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous laissiez passer des occasions que d’autres saisissent plus ouvertement.
- Vous pouvez tarder à demander ce dont vous avez besoin.

**Question pour l’entretien** (`hypothese`) : Comment défendez-vous vos intérêts quand ils s’opposent à ceux d’un collègue ?

### A2 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous écartez très nettement l’idée d’utiliser les autres, de tricher pour avancer, d’en profiter ou de gêner leurs plans. Cela rapporte ce que vous déclarez sur vous-même ; ni un niveau haut ni un niveau bas ne permet de conclure sur la conduite réelle.

**Ce que cela peut apporter** (`hypothese`)

- Vos collègues peuvent trouver vos actes lisibles et prévisibles.
- Vous pouvez favoriser des relations fondées sur la réciprocité.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez du mal à défendre vos intérêts quand cela suppose de faire passer un autre au second plan.
- Dans un environnement très compétitif, votre réserve peut vous laisser en retrait.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aiderait à défendre vos intérêts sans craindre de nuire à quelqu’un ?

## A3 · Souci d’aider les autres

**Définition.** Cette facette porte sur le plaisir d’aider les autres, l’attention à leurs sentiments et le temps que vous leur consacrez.

**Les quatre affirmations du questionnaire (français) :**

- « J'adore aider les autres » (cotation directe)
- « Je me préoccupe des autres » (cotation directe)
- « Je suis indifférent aux sentiments des autres » (cotation inversée)
- « Je ne prends pas de temps pour les autres » (cotation inversée)

### A3 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que l’aide aux autres et l’attention à leurs sentiments tiennent peu de place dans votre manière d’agir. Cela décrit où vous placez votre énergie, non une absence de bienveillance ni un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez concentrer votre temps et votre énergie sur vos propres objectifs.
- Vous pouvez dire non sans difficulté quand une demande dépasse ce que vous souhaitez donner.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des collègues en quête de soutien ne pensent pas à se tourner vers vous.
- Vous pouvez passer à côté de signaux que votre entourage aurait voulu vous voir relever.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances avez-vous choisi de consacrer du temps à quelqu’un, et qu’est-ce qui vous y a conduit ?

### A3 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aidez les autres surtout quand la demande est claire ou que la personne vous est proche. Le temps disponible et le lien avec la personne semblent compter dans votre décision d’aider.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aider de façon ciblée, là où votre aide pèse vraiment.
- Vous pouvez préserver votre temps pour ce qui vous est confié.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entourage ignore que vous pouvez vous rendre disponible en cas de besoin.
- Une demande restée implicite peut vous échapper.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous décide à consacrer du temps à une personne qui n’a rien demandé ?

### A3 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers un souci marqué d’aider les autres ni vers un recentrage sur vous-même. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aider quand la situation l’appelle et vous retirer quand elle ne l’appelle pas.
- Vous pouvez équilibrer votre temps entre vos tâches et celles des autres.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entourage ne sache pas s’il peut compter sur vous.
- Vous pouvez hésiter à vous engager quand une demande d’aide empiète sur votre propre charge.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous d’aider quelqu’un ou de consacrer votre temps à autre chose ?

### A3 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez assez volontiers aider les autres et que vous vous préoccupez de ce qu’ils ressentent. Cela décrit une orientation vers autrui, sans préjuger de la qualité de l’aide apportée.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez remarquer qu’un collègue traverse une période difficile.
- Vous pouvez créer un climat où demander de l’aide paraît naturel.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre disponibilité grignote le temps prévu pour vos propres tâches.
- Vous pouvez avoir du mal à refuser une demande qui arrive à contretemps.

**Question pour l’entretien** (`hypothese`) : Comment protégez-vous le temps nécessaire à vos propres priorités quand on vous sollicite ?

### A3 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous adorez aider les autres, que vous vous préoccupez beaucoup d’eux et que vous prenez le temps de le faire. Cette tendance concerne l’attention portée aux autres ; elle ne dit rien de l’efficacité de l’aide.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez devenir une personne vers qui l’on se tourne spontanément en cas de difficulté.
- Vous pouvez soutenir un collectif dans les périodes de tension.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre énergie s’épuise à force de répondre aux besoins des autres.
- Vous pouvez tarder à poser des limites, au détriment de vos propres échéances.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations est-il utile pour vous de limiter votre disponibilité envers les autres ?

## A4 · Coopération

**Définition.** Cette facette est mesurée par quatre affirmations qui portent sur la confrontation ouverte : dispute, cris, insultes, représailles.

**Les quatre affirmations du questionnaire (français) :**

- « J’adore une bonne dispute » (cotation inversée)
- « Je crie sur les gens » (cotation inversée)
- « J’insulte les gens » (cotation inversée)
- « Je me venge » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Coopération » est plus large que ce qui est mesuré : un résultat haut décrit surtout l’absence de confrontation ouverte, il ne dit pas si vous coopérez bien.

### A4 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’un désaccord peut parfois s’exprimer chez vous avec vivacité : ton qui monte, riposte, goût du débat musclé. Cela décrit une manière d’exprimer un désaccord, non un jugement sur votre rapport aux autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez dire clairement un désaccord sans le laisser s’enliser.
- Vous pouvez défendre vos intérêts ou ceux de votre équipe sans détour.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre vivacité soit perçue comme une agression, même sans que vous l’ayez voulu.
- Une riposte peut entretenir un conflit qui se serait éteint seul.

**Question pour l’entretien** (`hypothese`) : Quand un désaccord monte en tension, qu’est-ce qui vous aide à reprendre une discussion calme ?

### A4 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’un désaccord peut parfois s’exprimer chez vous assez vivement. Cela décrit une manière d’exprimer un désaccord, non un jugement sur votre rapport aux autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aborder un sujet délicat plutôt que de l’éviter.
- Votre franchise peut faire avancer une discussion bloquée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certaines de vos réactions soient interprétées plus durement que vous ne le pensiez.
- Une réponse vive peut fermer une discussion que vous vouliez ouvrir.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations votre réaction a-t-elle été plus vive que vous ne l’auriez souhaité ?

### A4 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la confrontation ouverte ni vers son évitement. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez choisir entre exprimer un désaccord et le laisser passer.
- Vous pouvez adapter votre façon de réagir à la personne et à l’enjeu.

**Ce que cela peut coûter** (`hypothese`)

- Votre façon de réagir peut sembler difficile à anticiper.
- Vous pouvez hésiter entre confronter et temporiser.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous d’exprimer un désaccord ou de le laisser passer ?

### A4 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous évitez le plus souvent la confrontation ouverte et la riposte. Quand un désaccord survient, il semble se traiter chez vous sans élever le ton.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez maintenir un climat apaisé quand un désaccord survient.
- Vous pouvez désamorcer une tension avant qu’elle ne s’installe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certains désaccords ne soient pas exprimés alors qu’il serait utile de les traiter.
- Vos interlocuteurs peuvent ignorer que vous avez un avis différent.

**Question pour l’entretien** (`hypothese`) : Quels désaccords restent en vous sans être exprimés, et que se passe-t-il ensuite ?

### A4 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous écartez très nettement la dispute, les cris, l’insulte et la riposte. Les tensions semblent s’exprimer chez vous sans confrontation ouverte.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez maintenir des relations de travail stables, même quand la discussion est difficile.
- Vous pouvez garder la maîtrise de votre ton quand le ton monte autour de vous.

**Ce que cela peut coûter** (`hypothese`)

- Un désaccord important peut rester sans réponse parce que la confrontation est évitée.
- Il se peut que votre réserve laisse à d’autres le soin de défendre des positions qui vous importent.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous permettrait d’exprimer un désaccord important sans que la relation en souffre ?

## A5 · Opinion de soi et mise en avant

**Définition.** Cette facette porte sur l’opinion que vous avez de vous-même et sur la tendance à la mettre en avant devant les autres.

**Les quatre affirmations du questionnaire (français) :**

- « Je crois être meilleur que les autres » (cotation inversée)
- « J'ai une haute estime de moi-même » (cotation inversée)
- « J'ai une très bonne opinion de moi-même » (cotation inversée)
- « Je me vante de mes qualités » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Modestie » est plus large que ce qui est mesuré : les quatre affirmations portent sur l’opinion que vous déclarez avoir de vous-même et sur le fait de la mettre en avant. Un résultat haut décrit une opinion de soi plus réservée, non une valeur ni un manque de confiance en soi.

### A5 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous avez une haute opinion de vous-même et que vous la mettez volontiers en avant. Cela décrit l’opinion que vous déclarez avoir de vous, non la réalité de vos résultats ni votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aborder des responsabilités importantes avec assurance.
- Vous pouvez présenter clairement vos réalisations.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre assurance soit perçue comme de la supériorité par certains interlocuteurs.
- Vous pouvez avoir moins de raisons de chercher l’avis des autres sur votre travail.

**Question pour l’entretien** (`hypothese`) : Comment recueillez-vous un regard extérieur sur ce que vous faites ?

### A5 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une opinion plutôt favorable de vous-même, que vous exprimez assez volontiers. Cela décrit l’opinion que vous déclarez avoir de vous, non la réalité de vos résultats.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez parler de vos réussites sans gêne quand le sujet s’y prête.
- Vous pouvez avancer vos idées avec aplomb.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certains collègues trouvent que vous parlez beaucoup de vous.
- Vous pouvez prêter peu d’attention aux apports des autres dans un succès commun.

**Question pour l’entretien** (`hypothese`) : Comment faites-vous place, dans votre discours, à ce que d’autres ont apporté ?

### A5 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers une haute opinion de vous-même exprimée ouvertement ni vers une grande retenue à ce sujet. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez parler de vos réussites ou rester discret selon le contexte.
- Vous pouvez ajuster ce que vous dites de vous à votre interlocuteur.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entourage ait du mal à cerner l’opinion que vous avez de vous.
- Vous pouvez hésiter sur la part de vos réussites qu’il convient de mettre en avant.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations jugez-vous utile de mettre vos réalisations en avant, et dans lesquelles préférez-vous les taire ?

### A5 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous avez plutôt une opinion réservée de vous-même et que vous mettez rarement vos qualités en avant. Cela décrit l’opinion que vous déclarez avoir de vous, non la réalité de vos résultats ni un manque de confiance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez laisser la place aux réussites des autres.
- Vous pouvez accueillir une critique sans la vivre comme une atteinte.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos réalisations restent peu visibles de votre hiérarchie.
- Votre contribution à un projet peut être moins reconnue que celle de collègues plus démonstratifs.

**Question pour l’entretien** (`hypothese`) : Comment faites-vous connaître votre contribution quand elle compte pour un projet ?

### A5 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous écartez très nettement l’idée de vous placer au-dessus des autres, d’avoir de vous-même une opinion très haute ou de vous vanter. Cela décrit l’opinion que vous déclarez avoir de vous ; ce n’est ni un manque de confiance en vous ni un manque d’ambition.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez travailler en équipe sans chercher à attirer l’attention.
- Vous pouvez reconnaître ouvertement l’apport d’autres personnes.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous évitiez de parler d’une réussite alors que la valoriser serait utile.
- Dans un contexte où l’on attend de chacun qu’il se mette en avant, votre retenue peut passer inaperçue.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aiderait à présenter vos réalisations quand le contexte l’exige ?

## A6 · Compassion envers les personnes en difficulté

**Définition.** Cette facette porte sur la compassion que vous éprouvez envers les personnes démunies ou dans le besoin, et sur la place que leurs difficultés prennent dans vos pensées.

**Les quatre affirmations du questionnaire (français) :**

- « Je compatis avec les sans-abri » (cotation directe)
- « Je compatis avec les gens plus démunis que moi » (cotation directe)
- « Je ne suis pas intéressé par les problèmes des autres » (cotation inversée)
- « Je tente de ne pas penser aux gens dans le besoin » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Sympathie » peut faire penser à l’amabilité dans les relations : les quatre affirmations portent en réalité sur la compassion envers les sans-abri, les personnes plus démunies et celles qui sont dans le besoin.

### A6 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les difficultés des personnes dans le besoin retiennent peu votre attention et que vous préférez ne pas y penser. Cela décrit où vous portez votre attention, non une absence de sensibilité ni un jugement sur vos valeurs.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez garder la distance utile pour décider dans des situations pénibles.
- Votre attention peut rester disponible pour vos propres objectifs.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez à côté de la détresse de certains collègues ou clients.
- Des interlocuteurs sensibles à ces sujets peuvent vous trouver distant.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations la difficulté d’une personne pèse-t-elle sur vos décisions ?

### A6 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la situation des personnes démunies vous touche de façon inégale, selon les cas. Certaines situations semblent retenir votre attention, d’autres beaucoup moins.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez choisir les causes auxquelles vous consacrez votre énergie.
- Vous pouvez garder du recul face à des situations difficiles.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des situations de précarité vous échappent quand elles ne sont pas à proximité.
- Une cause qui compte pour vos proches peut vous sembler éloignée.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui fait qu’une situation difficile retient votre attention plus qu’une autre ?

### A6 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers une compassion marquée pour les personnes en difficulté ni vers un détachement à leur égard. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vous mobiliser pour une cause tout en gardant du recul.
- Vous pouvez adapter votre degré d’implication à ce que la situation exige.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre implication paraisse variable à votre entourage.
- Vous pouvez hésiter sur la place à donner à ces situations dans vos décisions.

**Question pour l’entretien** (`hypothese`) : Dans quels cas la difficulté d’autrui vous mobilise-t-elle, et dans quels cas vous laisse-t-elle plus en retrait ?

### A6 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous compatissez assez volontiers avec les personnes démunies ou dans le besoin. Cela décrit la place que ces situations prennent dans vos pensées, non ce que vous faites concrètement.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez porter attention aux personnes vulnérables dans votre environnement de travail.
- Vous pouvez apporter un regard humain dans des décisions qui touchent des personnes.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des situations difficiles pèsent sur votre humeur au-delà du moment.
- Vous pouvez avoir du mal à garder la distance nécessaire pour trancher.

**Question pour l’entretien** (`hypothese`) : Comment conciliez-vous votre souci des personnes en difficulté et les contraintes d’une décision ?

### A6 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous compatissez très volontiers avec les sans-abri et les personnes plus démunies, et que vous ne détournez pas votre pensée de ceux qui sont dans le besoin. Cette tendance concerne la sensibilité déclarée, sans préjuger des actions menées.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez maintenir l’attention du groupe sur les personnes les plus vulnérables.
- Vous pouvez inspirer un engagement durable pour une cause.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ressentiez une charge émotionnelle importante face aux situations de détresse.
- Vous pouvez avoir du mal à vous détacher d’un problème qui touche une personne démunie.

**Question pour l’entretien** (`hypothese`) : Comment préservez-vous votre énergie face à des situations de détresse ?

## C1 · Confiance déclarée dans sa maîtrise des tâches

**Définition.** Cette facette porte sur la confiance que vous déclarez dans votre façon de mener vos tâches à bien, non sur ce que vous réalisez effectivement.

**Les quatre affirmations du questionnaire (français) :**

- « J'accomplis mes tâches avec succès » (cotation directe)
- « J'excelle dans ce que je fais » (cotation directe)
- « Je gère les tâches facilement » (cotation directe)
- « Je sais comment faire avancer les choses » (cotation directe)

> **Avertissement sur le libellé.** Cette facette mesure une confiance déclarée en sa propre maîtrise des tâches, non un savoir-faire démontré ni une performance réelle. Le titre « Auto-efficacité » ne doit jamais être lu comme une évaluation de ce que la personne sait faire.

### C1 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez rarement dans l’idée de réussir vos tâches, d’y exceller ou de les gérer facilement. Il s’agit d’une confiance déclarée, non d’un constat sur ce que vous réalisez réellement ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre prudence à l’égard de votre propre travail peut vous conduire à vérifier et à préparer avec soin.
- Vous pouvez accueillir plus volontiers les retours et les conseils des autres.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous renonciez à des responsabilités que vous pourriez assumer.
- Un doute durable sur votre travail peut vous coûter de l’énergie et vous conduire à sous-estimer vos réussites.

**Question pour l’entretien** (`hypothese`) : Sur quelles tâches vous sentez-vous le plus en confiance, et qu’est-ce qui l’explique ?

### C1 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous doutez assez souvent de mener vos tâches à bien, avec des exceptions dans certains domaines. Cette confiance peut varier selon la familiarité que vous avez avec la tâche.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez demander de l’aide ou un avis avant de vous engager dans une tâche nouvelle.
- Votre exigence envers votre propre travail peut vous pousser à progresser.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous hésitiez à vous proposer pour une tâche dont les contours sont encore flous.
- Vous pouvez attribuer vos réussites aux circonstances plutôt qu’à votre action.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui renforce votre confiance lorsque vous abordez une tâche nouvelle ?

### C1 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la confiance ni vers le doute à l’égard de vos tâches. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster votre assurance à la difficulté réelle de la tâche.
- Vous pouvez reconnaître vos limites sans renoncer à agir.

**Ce que cela peut coûter** (`hypothese`)

- Votre confiance peut varier d’une tâche à l’autre, ce qui peut rendre votre posture moins lisible pour autrui.
- Il peut vous être difficile d’estimer à l’avance le temps et l’effort qu’une tâche vous demandera.

**Question pour l’entretien** (`hypothese`) : Pour quelles tâches votre confiance change-t-elle le plus, et qu’est-ce qui la fait varier ?

### C1 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez le plus souvent dans l’idée de réussir vos tâches et de savoir faire avancer les choses. Ce que vous déclarez est une confiance en vous, qui ne prouve pas à elle seule la qualité de ce qui est réalisé.

**Ce que cela peut apporter** (`hypothese`)

- Votre confiance peut vous aider à prendre une tâche en charge sans attendre qu’on vous le demande.
- Elle peut rassurer des collègues qui ont besoin de sentir une tâche bien tenue.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous sous-estimiez la difficulté d’une tâche inhabituelle.
- Vous pouvez tarder à solliciter un avis extérieur quand une tâche dépasse ce que vous aviez prévu.

**Question pour l’entretien** (`hypothese`) : Comment vérifiez-vous, au-delà de votre propre impression, que votre travail répond à ce qui est attendu ?

### C1 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez presque toujours dans l’idée de réussir vos tâches, d’y exceller et de les gérer facilement. Il s’agit d’une confiance déclarée, qui ne dit rien à elle seule de la qualité réelle du travail accompli.

**Ce que cela peut apporter** (`hypothese`)

- Votre confiance peut vous permettre d’entreprendre des tâches exigeantes et d’entraîner d’autres personnes.
- Elle peut vous aider à poursuivre quand les premiers résultats tardent.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous mesuriez mal vos limites ou la complexité d’une situation nouvelle.
- Votre assurance peut décourager des collègues de vous signaler une difficulté ou une erreur.

**Question pour l’entretien** (`hypothese`) : Quelles informations extérieures vous amèneraient à réviser votre jugement sur la qualité de votre travail ?

## C2 · Organisation et rangement

**Définition.** Cette facette porte sur le goût du rangement et sur l’habitude de remettre les choses à leur place.

**Les quatre affirmations du questionnaire (français) :**

- « J'aime faire du rangement » (cotation directe)
- « J'oublie souvent de remettre les choses à leur place » (cotation inversée)
- « Je laisse ma chambre en désordre » (cotation inversée)
- « Je laisse traîner les choses » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Organisation » est plus large que ce qui est mesuré : les affirmations portent sur le rangement et l’ordre matériel de l’environnement personnel, non sur la planification ni sur l’organisation du travail.

### C2 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez peu ranger et que les objets restent souvent là où vous les avez laissés. Cela concerne l’ordre matériel de votre environnement, non votre façon d’organiser votre travail ni de planifier.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tolérer un espace en mouvement, où les choses restent à portée de main.
- Vous pouvez consacrer votre temps à ce qui vous importe plutôt qu’au rangement.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous perdiez du temps à retrouver un document ou un objet.
- Un espace partagé peut devenir source de tension si l’ordre compte davantage pour les autres que pour vous.

**Question pour l’entretien** (`hypothese`) : Quel degré de désordre vous convient, et à partir de quand commence-t-il à vous gêner ?

### C2 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous rangez par moments, mais que les objets traînent assez souvent. Votre rapport à l’ordre peut dépendre de la période et du temps dont vous disposez.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez vous adapter à des lieux dont l’ordre n’est pas le vôtre.
- Vous pouvez ranger de façon ciblée quand une situation l’exige.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que le désordre s’installe progressivement avant que vous ne le remarquiez.
- Vous pouvez avoir à rattraper un rangement en urgence avant une visite ou une échéance.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances prenez-vous le temps de ranger, et qu’est-ce qui vous y décide ?

### C2 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers l’ordre ni vers la souplesse dans le rangement. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster votre niveau d’ordre à l’usage que vous faites d’un lieu.
- Vous pouvez partager un espace avec des personnes aux habitudes différentes sans que cela vous pèse.

**Ce que cela peut coûter** (`hypothese`)

- Votre niveau d’ordre peut varier d’un lieu ou d’une période à l’autre, ce qui peut dérouter vos proches.
- Vous pouvez hésiter sur le niveau d’ordre à viser dans un espace commun.

**Question pour l’entretien** (`hypothese`) : Dans quels lieux ou à quels moments tenez-vous le plus à l’ordre ?

### C2 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous rangez le plus souvent et que vous remettez en général les choses à leur place. Cela concerne l’ordre matériel de votre environnement, non la manière dont vous menez votre travail.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez retrouver rapidement ce dont vous avez besoin.
- Votre sens de l’ordre peut rendre un espace partagé plus aisé à utiliser.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que le désordre d’autrui vous gêne ou vous distraie davantage que lui.
- Vous pouvez consacrer du temps au rangement au détriment d’une tâche plus urgente.

**Question pour l’entretien** (`hypothese`) : Que ressentez-vous lorsque vous travaillez dans un espace que d’autres n’ont pas rangé comme vous l’auriez fait ?

### C2 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous aimez ranger et que vous laissez presque toujours chaque chose à sa place. Cela concerne l’ordre matériel de votre environnement, non la planification ni l’organisation de votre activité.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez créer autour de vous un cadre matériel stable, où chacun retrouve ses repères.
- Votre soin peut réduire les oublis et les recherches d’objets.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous éprouviez de l’inconfort dans un lieu en désordre que vous ne maîtrisez pas.
- Vous pouvez en venir à ranger à la place des autres, au risque de créer de l’agacement.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui change pour vous quand un lieu reste en désordre malgré vos efforts ?

## C3 · Respect des engagements et des règles

**Définition.** Cette facette porte sur ce que vous déclarez de votre façon de tenir vos promesses, de dire la vérité et de suivre les règles.

**Les quatre affirmations du questionnaire (français) :**

- « Je tiens mes promesses » (cotation directe)
- « Je dis la vérité » (cotation directe)
- « J'enfreins les règles » (cotation inversée)
- « Je ne tiens pas mes promesses » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Respect » est plus large que ce qui est mesuré : les affirmations portent sur les promesses tenues, le fait de dire la vérité et le suivi des règles, tels que la personne les déclare. Il ne s’agit ni du respect envers autrui ni d’une vérification de l’honnêteté.

### C3 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez peu dans les affirmations sur le fait de tenir vos promesses, de dire la vérité et de respecter les règles. Cette lecture rapporte la façon dont vous vous percevez ; elle ne dit rien de votre honnêteté ni de votre intégrité.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez remettre en question une règle ou un engagement dont le sens vous échappe.
- Votre regard sur les règles peut amener un groupe à vérifier si elles servent encore leur but.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre entourage ait du mal à savoir sur quels engagements compter.
- Vous pouvez vous trouver en décalage avec un cadre qui exige un suivi strict des règles.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations un engagement ou une règle vous paraît-il difficile à tenir, et pourquoi ?

### C3 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez par moments dans ces affirmations, avec des situations où promesses et règles pèsent moins. Cette lecture rapporte la façon dont vous vous percevez, non votre honnêteté.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez faire preuve de souplesse quand une règle ne convient pas à la situation.
- Vous pouvez signaler qu’un engagement n’est plus réaliste plutôt que de le maintenir par principe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certains engagements pris dans l’élan soient ensuite difficiles à honorer.
- Vous pouvez avoir à clarifier régulièrement ce que votre entourage peut attendre de vous.

**Question pour l’entretien** (`hypothese`) : Quels types d’engagements ou de règles tenez-vous le plus facilement, et lesquels moins ?

### C3 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers un respect strict des engagements et des règles ni vers une grande souplesse à leur égard. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez distinguer les règles qui comptent de celles qui peuvent être adaptées.
- Vous pouvez tenir vos engagements tout en reconnaissant quand une situation demande de les revoir.

**Ce que cela peut coûter** (`hypothese`)

- Votre manière de traiter une règle peut varier d’un contexte à l’autre, ce qui peut surprendre votre entourage.
- Vous pouvez hésiter sur la conduite à suivre quand un engagement et une règle entrent en conflit.

**Question pour l’entretien** (`hypothese`) : Dans quels contextes tenez-vous un engagement ou une règle sans aucune marge, et dans lesquels vous en accordez-vous une ?

### C3 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez le plus souvent dans les affirmations sur le fait de tenir vos promesses, de dire la vérité et de suivre les règles. Cette lecture rapporte la façon dont vous vous percevez ; elle n’établit rien sur votre comportement observé.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez inspirer confiance à des collègues qui ont besoin de s’appuyer sur des engagements clairs.
- Vous pouvez aider un groupe à respecter un cadre commun.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez du mal à vous écarter d’une règle quand la situation y inviterait.
- Vous pouvez vous sentir mal à l’aise avec des collègues dont les engagements sont plus souples que les vôtres.

**Question pour l’entretien** (`hypothese`) : Comment réagissez-vous quand un engagement que vous avez pris devient impossible à tenir ?

### C3 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez presque toujours dans les affirmations sur le fait de tenir vos promesses, de dire la vérité et de ne pas enfreindre les règles. Cette lecture rapporte la façon dont vous vous percevez ; une déclaration ne constitue pas une preuve de comportement.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez servir de repère dans un groupe où les engagements comptent beaucoup.
- Vous pouvez contribuer à instaurer un climat où chacun sait ce qui est attendu.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous ayez du mal à comprendre un écart à la règle quand il a des raisons légitimes.
- Vous pouvez vous imposer une exigence élevée qui rend un engagement abandonné difficile à vivre pour vous.

**Question pour l’entretien** (`hypothese`) : Que faites-vous lorsque deux règles ou deux engagements se contredisent ?

## C4 · Effort et engagement au travail

**Définition.** Cette facette porte sur le temps et l’énergie que vous déclarez consacrer à votre travail, y compris au-delà de ce qui est attendu.

**Les quatre affirmations du questionnaire (français) :**

- « Je travaille dur » (cotation directe)
- « Je fais plus que ce que l'on attend de moi » (cotation directe)
- « Je fais juste assez de travail pour m'en sortir » (cotation inversée)
- « Je mets peu de temps et d'efforts dans mon travail » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Persévérance » est plus large que ce qui est mesuré : les affirmations portent sur l’effort fourni, le travail au-delà de l’attendu et le fait de ne faire que le nécessaire, non sur la ténacité face aux obstacles. Un niveau élevé n’est pas un idéal : un engagement soutenu se lit toujours avec la charge qu’il représente.

### C4 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez dans l’idée de faire juste ce qu’il faut et de mettre peu de temps et d’effort dans votre travail. Cette lecture porte sur la place que vous donnez au travail, qui peut être un choix délibéré, et non sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez préserver du temps et de l’énergie pour votre vie en dehors du travail.
- Vous pouvez concentrer votre effort sur ce qui compte vraiment plutôt que de le disperser.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre investissement paraisse limité à des collègues ou à un responsable qui attendent davantage.
- Vous pouvez passer à côté d’occasions qui demandent un engagement plus soutenu.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui détermine, pour vous, la place que le travail doit occuper dans votre vie ?

### C4 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous limitez le plus souvent à ce qui est demandé, avec des périodes où vous vous investissez davantage. Cet investissement peut dépendre de l’intérêt de la tâche et de ce qui est en jeu pour vous.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez doser votre effort selon l’enjeu et garder des réserves.
- Vous pouvez vous mobiliser pleinement quand un sujet vous importe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des tâches jugées secondaires reçoivent moins d’attention que ce qu’en attendent d’autres.
- Vous pouvez avoir à expliquer vos priorités à un entourage qui interprète votre effort mesuré comme un désintérêt.

**Question pour l’entretien** (`hypothese`) : Pour quels sujets acceptez-vous de dépasser ce qui est demandé, et pourquoi ceux-là ?

### C4 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers un investissement soutenu ni vers un investissement mesuré dans votre travail. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez adapter votre investissement à la période et aux priorités.
- Vous pouvez fournir un effort soutenu quand il le faut, puis relâcher.

**Ce que cela peut coûter** (`hypothese`)

- Votre niveau d’investissement peut varier d’une période à l’autre, ce qui peut rendre votre disponibilité difficile à anticiper.
- Vous pouvez hésiter sur le moment où il convient de vous engager davantage.

**Question pour l’entretien** (`hypothese`) : À quels signes reconnaissez-vous qu’une situation mérite que vous vous investissiez davantage ?

### C4 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous travaillez avec application et que vous faites souvent un peu plus que ce qui est attendu. Cet investissement peut varier selon les périodes.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez soutenir un effort dans la durée sur un sujet qui compte pour votre équipe.
- Votre application peut contribuer à la qualité d’un travail commun.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que la charge s’accumule sans que vous la signaliez.
- Vous pouvez vous fatiguer sur la durée si l’effort supplémentaire devient la règle plutôt que l’exception.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous de ce qui mérite un effort supplémentaire et de ce qui n’en mérite pas ?

### C4 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez très nettement dans l’idée de travailler dur et de faire régulièrement plus que ce que l’on attend de vous. Il s’agit d’un investissement déclaré, qui ne dit rien de la qualité des résultats et n’est pas à lire comme une qualité en soi.

**Ce que cela peut apporter** (`hypothese`)

- Votre engagement peut permettre de mener à terme un projet qui demande un effort soutenu.
- Il peut entraîner une équipe lors d’une période chargée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut qu’un investissement soutenu sur la durée entraîne une fatigue ou un épuisement que vous remarquez tardivement.
- Vous pouvez porter une charge de travail qui empiète sur votre vie personnelle, ou fixer à votre entourage des attentes difficiles à suivre.

**Question pour l’entretien** (`hypothese`) : Que se passerait-il, pour vous et pour votre travail, si vous réduisiez pendant un temps votre niveau d’investissement ?

## C5 · Autodiscipline

**Définition.** Cette facette porte sur la préparation, la mise en route des tâches et la régularité avec laquelle vous menez vos projets à terme.

**Les quatre affirmations du questionnaire (français) :**

- « Je suis toujours préparé » (cotation directe)
- « Je réalise mes projets » (cotation directe)
- « Je perds mon temps » (cotation inversée)
- « J’ai de la difficulté à commencer les tâches » (cotation inversée)

### C5 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent une difficulté fréquente à vous mettre au travail et à mener vos projets jusqu’au bout. Ce que vous déclarez ici concerne la mise en route et la continuité, non votre valeur ni votre intelligence.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez rester disponible à l’imprévu plutôt que de suivre un plan à la lettre.
- Vous pouvez saisir une occasion qui n’était pas prévue.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des échéances approchent sans que le travail soit avancé.
- Les tâches difficiles à démarrer peuvent s’accumuler.

**Question pour l’entretien** (`hypothese`) : Quelles conditions (échéance, présence d’autrui, découpage de la tâche) vous aident à démarrer ?

*Variantes d’accord de ce bloc (masculin, féminin) :*

- m : Vous pouvez rester ouvert à l’imprévu plutôt que de suivre un plan à la lettre.
  f : Vous pouvez rester ouverte à l’imprévu plutôt que de suivre un plan à la lettre.

### C5 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’il peut vous arriver de peiner à démarrer ou à poursuivre ce que vous aviez prévu. Cela peut dépendre de l’intérêt que vous trouvez à la tâche.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster un plan quand les circonstances changent.
- Vous pouvez vous engager pleinement dans ce qui vous mobilise.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des tâches peu motivantes soient repoussées.
- Vous pouvez avoir besoin d’un cadre extérieur pour tenir un calendrier.

**Question pour l’entretien** (`hypothese`) : Sur quels types de tâches repoussez-vous le plus souvent, et pourquoi ?

### C5 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la discipline ni vers la souplesse. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez alterner entre planification et improvisation.
- Vous pouvez tenir un plan sans vous y enfermer.

**Ce que cela peut coûter** (`hypothese`)

- Votre régularité peut varier d’une période à l’autre.
- Vos collègues peuvent ne pas savoir sur quel degré de préparation compter.

**Question pour l’entretien** (`hypothese`) : Dans quelles périodes tenez-vous le plus régulièrement vos engagements, et qu’ont-elles en commun ?

### C5 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous préparez le plus souvent et que vous menez à terme ce que vous avez prévu. Démarrer une tâche semble vous demander rarement un effort particulier.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tenir un engagement dans la durée.
- Vous pouvez rendre un projet plus fiable par votre préparation.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous teniez un plan alors que la situation justifierait de le changer.
- Vous pouvez avoir du mal à travailler avec un rythme moins planifié que le vôtre.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations est-il utile pour vous de lâcher le plan prévu ?

### C5 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous préparez presque toujours et que vous menez très régulièrement vos projets à terme. Démarrer une tâche ne semble vous poser, selon vos réponses, presque aucune difficulté.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mener un projet exigeant jusqu’à son terme.
- Vous pouvez donner à votre équipe des points d’appui prévisibles.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que l’imprévu vous demande un effort particulier.
- Vous pouvez assumer sans partage une charge de préparation que le groupe pourrait partager.

**Question pour l’entretien** (`hypothese`) : Que se passe-t-il pour vous quand un plan préparé avec soin doit être abandonné ?

*Variantes d’accord de ce bloc (masculin, féminin) :*

- m : Vous pouvez porter seul une charge de préparation que le groupe pourrait partager.
  f : Vous pouvez porter seule une charge de préparation que le groupe pourrait partager.

## C6 · Réflexion avant d’agir

**Définition.** Cette facette porte sur la tendance, que vous déclarez, à réfléchir avant d’agir plutôt qu’à vous lancer sans y penser.

**Les quatre affirmations du questionnaire (français) :**

- « Je me lance dans des choses sans réfléchir » (cotation inversée)
- « Je prends des décisions impulsives » (cotation inversée)
- « Je me précipite dans l'action » (cotation inversée)
- « J'agis sans penser » (cotation inversée)

> **Avertissement sur le libellé.** Le titre « Prudence » est plus large que ce qui est mesuré : les quatre affirmations portent sur l’impulsivité (se lancer, décider, se précipiter, agir sans réfléchir). Un niveau élevé décrit une réflexion préalable, non une aversion pour le risque ; un niveau bas décrit une action rapide, non une imprudence.

### C6 · Bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous reconnaissez souvent dans l’idée de vous lancer, de décider et d’agir sans réfléchir longuement au préalable. Cela décrit un rythme d’action rapide, déclaré par vous, non un jugement sur la qualité de vos décisions.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez saisir rapidement une occasion qui ne durerait pas.
- Vous pouvez débloquer une situation où le groupe tarde à décider.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certaines conséquences ne soient aperçues qu’après coup.
- Vous pouvez avoir à revenir sur une décision prise avant d’avoir réuni toutes les informations.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations agir vite vous a-t-il servi, et dans lesquelles auriez-vous aimé prendre plus de temps ?

### C6 · Plutôt bas (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous agissez assez souvent sans longue réflexion préalable, mais pas toujours. Votre rythme peut varier selon l’enjeu et la pression du moment.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez décider rapidement lorsque la situation l’exige.
- Vous pouvez garder de la spontanéité tout en pesant les enjeux importants.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des détails vous échappent dans les décisions prises dans l’urgence.
- Vous pouvez laisser peu de temps à votre entourage pour s’exprimer avant que vous n’agissiez.

**Question pour l’entretien** (`hypothese`) : Pour quelles décisions prenez-vous le temps de réfléchir, et pour lesquelles préférez-vous agir directement ?

### C6 · Milieu de l’échelle (non relue)

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la réflexion préalable ni vers l’action rapide. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez adapter le temps de réflexion à l’importance de ce qui est en jeu.
- Vous pouvez passer de la réflexion à l’action sans vous attarder ni vous précipiter.

**Ce que cela peut coûter** (`hypothese`)

- Votre façon de décider peut varier d’une situation à l’autre, ce qui peut étonner votre entourage.
- Vous pouvez hésiter sur le temps de réflexion à accorder à une décision dont l’enjeu est incertain.

**Question pour l’entretien** (`hypothese`) : Quels éléments vous indiquent qu’une situation mérite plus de réflexion avant d’agir ?

### C6 · Plutôt haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous réfléchissez le plus souvent avant d’agir et que vous vous lancez rarement sans y penser. Il peut vous arriver d’agir plus vite dans certaines situations.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez anticiper des conséquences avant qu’elles ne se produisent.
- Vous pouvez apporter au groupe un regard posé au moment de décider.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre délai de réflexion paraisse long à des personnes qui attendent une réponse rapide.
- Vous pouvez laisser passer une occasion qui demandait de réagir vite.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations vous arrive-t-il d’agir plus vite que d’habitude, et qu’en retirez-vous ?

### C6 · Haut (non relue)

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous réfléchissez presque toujours avant d’agir et que vous vous reconnaissez très peu dans l’idée de décider sur un coup de tête. Il s’agit d’un mode d’action déclaré, qui ne dit rien de la qualité des décisions ni d’un rapport au risque.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez éviter des erreurs qu’un examen préalable permet de repérer.
- Vous pouvez donner de la stabilité aux décisions d’un groupe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que le besoin de réfléchir longuement retarde une décision pour laquelle une action rapide aurait suffi.
- Vous pouvez avoir du mal à suivre un rythme d’action plus spontané que le vôtre.

**Question pour l’entretien** (`hypothese`) : Comment savez-vous que vous avez assez réfléchi pour passer à l’action ?

