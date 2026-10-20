# Bibliothèque de textes : facettes pilotes (une par domaine)

Version `bib-0.2`, 2026-10-20. Statut : **ébauche pilote, non relue : relecture humaine requise avant tout usage (§ 7.2 étape 7)**.

Cinq facettes sur trente, cinq niveaux chacune, en français et en arabe. Fichier source : `facettes-pilote.json` ; ce document en est une copie lisible, générée par `controle.py --md` : ne pas l’éditer à la main. Les espaces avant les signes doubles du français et dans les guillemets sont à convertir en espaces insécables au moment de l’intégration dans les fichiers de messages (`voix-de-marque.md`).

**Statut des blocs.** La description d’un niveau est tirée des quatre affirmations réelles de la facette (source `ipip-items`). Les rubriques « Ce que cela peut apporter », « Ce que cela peut coûter » et la question sont des **hypothèses de lecture, sans étude citée** (source `hypothese`) : le rapport les introduit par « Hypothèses de lecture, à confirmer en entretien ». Les niveaux sont des conventions de l’outil (`bases-rapports-individuel-et-binome.md` § 7.2), non des positions par rapport à d’autres personnes.

**Accord grammatical.** Le corps de chaque bloc ci-dessous est la forme **sans accord**, celle que reçoit tout profil sans valeur renseignée. Les phrases qui s’accordent portent des marqueurs dans le fichier source et sont listées sous chaque bloc avec leurs trois formes (masculin, féminin, sans accord). Syntaxe : `{masculin|féminin|sans accord}`, exactement trois alternatives ; la forme sans accord est identique au texte d’avant le marquage (prouvé par `--regression`).

## N6 · Vulnérabilité au stress / الهشاشة أمام الضغط

**Définition.** Cette facette porte sur la facilité avec laquelle la pression et les événements imprévus vous déstabilisent.

**التعريف.** تتناول هذه السمة الفرعية مدى سهولة أن يربكك الضغط والأحداث غير المتوقعة.

**Les quatre affirmations du questionnaire (français) :**

- « Je panique facilement » (cotation directe)
- « Je peux être dépassé par les événements » (cotation directe)
- « Je me sens incapable de gérer les choses » (cotation directe)
- « Je reste calme sous pression » (cotation inversée)

### N6 · Bas / منخفض

**Description** (`ipip-items`, fr)

Vos réponses indiquent que les événements vous déstabilisent rarement et que vous gardez le plus souvent votre calme sous pression. Cette lecture porte sur ce que vous déclarez, non sur ce qui se passe en situation réelle.

**Ce que cela peut apporter** (`hypothese`)

- Votre calme peut aider un groupe à garder le cap dans une situation tendue.
- Vous pouvez décider dans des moments où le groupe hésite encore.

**Ce que cela peut coûter** (`hypothese`)

- Votre aisance sous pression peut vous faire minimiser la tension que ressentent vos interlocuteurs.
- Il se peut que les signaux d’alerte vous parviennent tardivement.

**Question pour l’entretien** (`hypothese`) : Quand la pression monte-t-elle pour vous, et à quoi le remarquez-vous ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الأحداث نادرًا ما تُربكك، وإلى أن هدوءك يبقى حاضرًا في الغالب تحت الضغط. تعبّر هذه القراءة عمّا تصرّح به إجاباتك، لا عمّا يحدث في الموقف الفعلي.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يساعد هدوؤك المجموعة على الحفاظ على وجهتها في موقف متوتر.
- قد يتاح لك اتخاذ القرار في لحظات يتردد فيها المحيطون بك.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يدفعك اطمئنانك تحت الضغط إلى التقليل من التوتر الذي يشعر به محاوروك.
- ربما تصلك إشارات الإنذار متأخرة.

**سؤال للجلسة** (`hypothese`) : متى يبدأ الضغط في الارتفاع لديك، ومن أي علامة يظهر لك ذلك؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : تشير إجاباتك إلى أن الأحداث نادرًا ما تُربكك، وإلى أنك تحتفظ بهدوئك في الغالب تحت الضغط.
  f : تشير إجاباتك إلى أن الأحداث نادرًا ما تُربكك، وإلى أنك تحتفظين بهدوئك في الغالب تحت الضغط.

### N6 · Plutôt bas / منخفض نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous gardez le plus souvent votre calme face aux événements, avec des exceptions. Certaines situations peuvent vous mettre davantage à l’épreuve que d’autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez conserver votre capacité d’agir quand la situation se complique.
- Vos moments d’inconfort peuvent vous servir de signal pour demander de l’aide à temps.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous perceviez tardivement votre propre fatigue quand la pression dure.
- Certaines situations peuvent vous surprendre alors que vous comptiez les traverser sans difficulté.

**Question pour l’entretien** (`hypothese`) : Quelles situations font exception, et qu’ont-elles en commun ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن هدوءك يبقى حاضرًا في الغالب أمام الأحداث، مع استثناءات. قد تكون بعض المواقف أصعب عليك من غيرها.

**ما قد يتيحه ذلك** (`hypothese`)

- غالبًا ما تبقى قدرتك على التصرف قائمة حين تتعقد الأمور.
- قد تكون لحظات الانزعاج إشارة تدفعك إلى طلب المساعدة في الوقت المناسب.

**ما قد يكلّفه ذلك** (`hypothese`)

- ربما يتأخر إدراكك لإرهاقك حين يطول الضغط.
- قد تفاجئك مواقف كان المتوقع لديك أن تمرّ دون صعوبة.

**سؤال للجلسة** (`hypothese`) : ما المواقف التي تشكّل استثناءً، وما الذي يجمع بينها؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : قد تفاجئك مواقف كنت تتوقع أن تمرّ دون صعوبة.
  f : قد تفاجئك مواقف كنتِ تتوقعين أن تمرّ دون صعوبة.

### N6 · Milieu de l’échelle / قرب المنتصف

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le calme ni vers la sensibilité au stress. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster votre façon de réagir selon l’enjeu.
- Votre sensibilité aux tensions peut vous aider à repérer ce qui ne va pas, sans vous absorber.

**Ce que cela peut coûter** (`hypothese`)

- Vos réactions peuvent sembler difficiles à anticiper pour votre entourage.
- Vous pouvez hésiter sur l’attitude à adopter quand la pression est inhabituelle.

**Question pour l’entretien** (`hypothese`) : Dans quelles circonstances votre façon de réagir change-t-elle le plus ?

**الوصف** (`ipip-items`, ar)

تقع إجاباتك قرب منتصف المقياس: فهي لا تميل بوضوح إلى الهدوء ولا إلى الحساسية للضغط. لا تقول النتيجة القريبة من المنتصف وحدها الكثير: وتفيد جلسة عرض النتائج في توضيح معناها.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يتغير أسلوب تفاعلك بحسب أهمية الموقف.
- قد تساعدك حساسيتك للتوتر على رصد ما لا يسير على ما يرام دون أن تستغرقك.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يرى المحيطون بك أن ردود فعلك يصعب توقعها.
- قد يصعب عليك تحديد الموقف المناسب حين يكون الضغط غير معتاد.

**سؤال للجلسة** (`hypothese`) : ما الظروف التي يختلف فيها تفاعلك أكثر من غيرها؟

### N6 · Plutôt haut / مرتفع نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent que la pression et les imprévus peuvent vous affecter assez nettement. Il s’agit d’une tendance de réaction au stress, jamais d’un diagnostic ni d’un jugement sur votre valeur.

**Ce que cela peut apporter** (`hypothese`)

- Votre sensibilité aux tensions peut vous faire anticiper des difficultés avant qu’elles n’éclatent.
- Vous pouvez prendre au sérieux des risques qui ne sont pas encore visibles.

**Ce que cela peut coûter** (`hypothese`)

- Une période chargée peut peser rapidement sur votre énergie.
- Dans l’urgence, il se peut que vous ayez besoin de temps pour retrouver vos repères.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous aide à retrouver vos repères quand les événements s’accumulent ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الضغط والأحداث غير المتوقعة قد يؤثران فيك بوضوح. يتعلق الأمر بميل في التفاعل مع الضغط، وليس بتشخيص ولا بحكم على قيمتك.

**ما قد يتيحه ذلك** (`hypothese`)

- قد تتيح لك حساسيتك للتوتر توقّع الصعوبات قبل أن تظهر.
- قد تجعلك حساسيتك أكثر انتباهًا إلى مخاطر لم تظهر بعد.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تثقل عليك فترة مزدحمة بسرعة.
- قد يلزمك في الحالات الطارئة وقت لاستعادة اتزانك.

**سؤال للجلسة** (`hypothese`) : ما الذي يساعدك على استعادة اتزانك حين تتراكم الأحداث؟

### N6 · Haut / مرتفع

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

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الضغط والأحداث غير المتوقعة تؤثر فيك بوضوح شديد، وإلى شعور أحيانًا بأن الأمور تفوق ما يمكن تدبّره. يتعلق الأمر بميل في التفاعل مع الضغط، وليس بتشخيص، وقد يتغير بحسب مرحلة الحياة وسياق العمل.

**ما قد يتيحه ذلك** (`hypothese`)

- قد تتيح لك يقظتك رصد نقاط الهشاشة في مشروع ما مبكرًا جدًّا.
- قد توليك حساسيتك اهتمامًا خاصًّا بالعبء الذي يحمله الآخرون.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تؤدي سلسلة من المواقف المتوترة إلى إنهاكك قبل أن يتاح لك التعافي.
- ربما يقودك الخوف من النتيجة إلى تجنّب بعض المواقف أو تأجيلها.

**سؤال للجلسة** (`hypothese`) : ما السند (أشخاص، أساليب، إيقاع عمل) الذي يعينك اليوم حين يرتفع الضغط؟

## E3 · Affirmation de soi / توكيد الذات

**Définition.** Cette facette porte sur la prise d’initiative et de direction dans l’action.

**التعريف.** تتناول هذه السمة الفرعية المبادرة وتولّي القيادة في العمل.

**Les quatre affirmations du questionnaire (français) :**

- « J’aime prendre les choses en main » (cotation directe)
- « J’essaie de diriger les autres » (cotation directe)
- « Je prends les choses en main » (cotation directe)
- « J’attends que les autres prennent les choses en main » (cotation inversée)

### E3 · Bas / منخفض

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez le plus souvent laisser d’autres prendre la direction des opérations. Cela décrit une préférence d’action, non une absence de capacité à diriger.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez laisser de la place aux idées des autres avant de vous prononcer.
- Vous pouvez être à l’aise dans un rôle d’appui ou d’exécution.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos idées restent dans l’ombre quand la discussion est vive.
- Quand personne ne prend l’initiative, vous pouvez attendre plus longtemps qu’il ne serait utile.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations avez-vous fini par prendre la direction malgré votre préférence, et comment cela s’est-il passé ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى تفضيل أن يتولى غيرك زمام الأمور في الغالب. يصف هذا تفضيلًا في طريقة العمل، ولا يدل على غياب القدرة على القيادة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يتسع المجال لأفكار الآخرين قبل أن يُسمع رأيك.
- قد تكون راحتك في دور الدعم أو التنفيذ.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تبقى أفكارك في الظل حين يحتدم النقاش.
- حين لا يبادر أحد، قد يطول انتظارك أكثر مما يلزم.

**سؤال للجلسة** (`hypothese`) : ما المواقف التي انتهى بك الأمر فيها إلى القيادة رغم تفضيلك، وكيف جرى ذلك؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : ما المواقف التي تولّيتَ فيها القيادة رغم تفضيلك، وكيف جرى ذلك؟
  f : ما المواقف التي تولّيتِ فيها القيادة رغم تفضيلك، وكيف جرى ذلك؟

### E3 · Plutôt bas / منخفض نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent une préférence pour accompagner plutôt que mener, avec des moments où vous prenez les choses en main. Le contexte et l’enjeu semblent compter dans votre décision de prendre la direction.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez écouter avant de trancher.
- Vous pouvez prendre la direction quand la situation l’exige, sans en faire une habitude.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que d’autres occupent la place de direction par défaut.
- Votre prise de direction peut surprendre votre entourage, parce qu’elle est occasionnelle.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous décide à prendre la direction quand vous le faites ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى تفضيل مرافقة الآخرين على قيادتهم، مع لحظات يكون زمام الأمور فيها بيدك. يبدو أن السياق وأهمية الموقف يؤثران في قرارك بتولي القيادة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يمنح ميلك إلى الإصغاء قراراتك مزيدًا من الاتزان.
- قد يكون بوسعك تولّي القيادة حين يقتضي الموقف ذلك، دون أن يصبح ذلك عادة.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يشغل غيرك موقع القيادة بحكم الغياب.
- قد تفاجئ مبادرتك المحيطين بك لأنها عرضية.

**سؤال للجلسة** (`hypothese`) : ما الذي يدفعك إلى تولي القيادة حين يحدث ذلك؟

### E3 · Milieu de l’échelle / قرب المنتصف

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la prise de direction ni vers le fait de la laisser à d’autres. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez mener ou suivre selon ce que la situation demande.
- Vous pouvez vous adapter à des partages de rôles variés.

**Ce que cela peut coûter** (`hypothese`)

- Votre entourage peut ne pas savoir quel rôle vous convient.
- Dans un groupe qui attend quelqu’un pour décider, il se peut que vous hésitiez à vous avancer.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations préférez-vous mener, et dans lesquelles préférez-vous suivre ?

**الوصف** (`ipip-items`, ar)

تقع إجاباتك قرب منتصف المقياس: فهي لا تميل بوضوح إلى تولي القيادة ولا إلى تركها للآخرين. لا تقول النتيجة القريبة من المنتصف وحدها الكثير: وتفيد جلسة عرض النتائج في توضيح معناها.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك القيادة أو المتابعة بحسب ما يتطلبه الموقف.
- قد يكون بوسعك التكيف مع توزيعات متنوعة للأدوار.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد لا يعرف المحيطون بك الدور الذي يلائمك.
- في مجموعة تنتظر من يحسم، قد يصعب عليك التقدم.

**سؤال للجلسة** (`hypothese`) : ما مواقف القيادة التي تلائمك، وما مواقف المتابعة التي تلائمك؟

### E3 · Plutôt haut / مرتفع نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous prenez assez volontiers la direction des opérations. Cette tendance concerne l’action et la prise d’initiative ; elle ne dit rien de la qualité du travail accompli.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez donner un cap quand un groupe tâtonne.
- Vous pouvez décider rapidement quand le temps manque.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vos interlocuteurs n’aient pas le temps de proposer avant que vous ayez avancé.
- Votre rythme d’initiative peut être perçu comme de l’impatience.

**Question pour l’entretien** (`hypothese`) : Comment vous assurez-vous que chacun a pu s’exprimer avant que vous ne tranchiez ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى ميل واضح إلى تولّي زمام الأمور عن طيب خاطر. يتعلق هذا الميل بالمبادرة والفعل، ولا يقول شيئًا عن جودة العمل المنجز.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك منح مجموعة متعثرة وجهة.
- قد يكون بوسعك الحسم بسرعة حين يضيق الوقت.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد لا يجد محاوروك الوقت لاقتراح أفكارهم قبل أن تتقدم الأمور بمبادرتك.
- قد يُفهم إيقاع مبادرتك على أنه نفاد صبر.

**سؤال للجلسة** (`hypothese`) : كيف يتحقق لك أن كل شخص قد عبّر عن رأيه قبل الحسم؟

### E3 · Haut / مرتفع

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous prenez très volontiers la direction des opérations et que vous aimez diriger les autres. Cette tendance concerne l’action et la prise d’initiative ; elle ne dit rien de la qualité du travail accompli.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez rassembler un groupe autour d’un objectif sans attendre qu’on vous le demande.
- Vous pouvez porter une décision difficile et en assumer la responsabilité.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que d’autres renoncent à proposer parce que la place est déjà occupée.
- Quand le rôle de direction est confié à quelqu’un d’autre, vous pouvez avoir du mal à le lui laisser.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations est-il utile pour vous de laisser quelqu’un d’autre diriger ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى ميل واضح جدًّا إلى تولّي زمام الأمور وإلى حب قيادة الآخرين. يتعلق هذا الميل بالمبادرة والفعل، ولا يقول شيئًا عن جودة العمل المنجز.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك جمع المجموعة حول هدف دون أن يُطلب منك ذلك.
- قد يكون بوسعك حمل قرار صعب وتحمّل مسؤوليته.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يتخلى آخرون عن الاقتراح لأن المكان مشغول أصلًا.
- حين يُسند دور القيادة إلى شخص آخر، قد يصعب عليك تركه له.

**سؤال للجلسة** (`hypothese`) : في أي مواقف يكون مفيدًا لك أن يقود غيرك؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : تشير إجاباتك إلى أنك تتولى زمام الأمور بحماس وتحب قيادة الآخرين.
  f : تشير إجاباتك إلى أنكِ تتولين زمام الأمور بحماس وتحبين قيادة الآخرين.

## O5 · Curiosité intellectuelle / الفضول الفكري

**Définition.** Cette facette porte sur l’intérêt pour les idées abstraites, la lecture exigeante et les discussions théoriques.

**التعريف.** تتناول هذه السمة الفرعية الاهتمام بالأفكار المجرّدة والقراءة الجادة والنقاشات النظرية.

**Les quatre affirmations du questionnaire (français) :**

- « J’adore lire des documents exigeants » (cotation directe)
- « J’évite les discussions philosophiques » (cotation inversée)
- « J’ai des difficultés à comprendre les idées abstraites » (cotation inversée)
- « Je ne suis pas intéressé par les discussions théoriques » (cotation inversée)

### O5 · Bas / منخفض

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous préférez les sujets concrets aux discussions abstraites ou théoriques. Cela décrit un intérêt, non une capacité de compréhension.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ramener une discussion aux faits et aux actions possibles.
- Votre travail peut être efficace là où une méthode éprouvée suffit.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous passiez à côté d’idées dont l’intérêt n’apparaît qu’après un détour théorique.
- Une réflexion de fond peut vous sembler éloignée de votre travail réel.

**Question pour l’entretien** (`hypothese`) : Quelles situations de travail vous ont déjà montré l’utilité d’une réflexion plus abstraite ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى تفضيل المواضيع الملموسة على النقاشات المجرّدة أو النظرية. يصف هذا اهتمامًا، ولا يدل على قدرة على الفهم.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك إعادة النقاش إلى الوقائع والإجراءات الممكنة.
- قد يكون عملك ناجعًا حيث يكفي أسلوب مجرَّب.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تفوتك أفكار لا تظهر فائدتها إلا بعد المرور بالنظرية.
- قد يبدو لك التفكير في العمق بعيدًا عن واقع عملك.

**سؤال للجلسة** (`hypothese`) : ما مواقف العمل التي بدت لك فيها فائدة التفكير الأكثر تجريدًا؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : ما مواقف العمل التي رأيتَ فيها فائدة التفكير الأكثر تجريدًا؟
  f : ما مواقف العمل التي رأيتِ فيها فائدة التفكير الأكثر تجريدًا؟

### O5 · Plutôt bas / منخفض نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût marqué pour le concret, avec un intérêt occasionnel pour les idées abstraites. L’intérêt pour la théorie semble dépendre du sujet.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez relier une idée à son application.
- Vous pouvez vous engager dans une réflexion théorique quand elle a un but précis.

**Ce que cela peut coûter** (`hypothese`)

- Un débat d’idées peut être écourté avant d’avoir porté ses fruits.
- Un document très abstrait peut vous demander un effort que vous préférez éviter.

**Question pour l’entretien** (`hypothese`) : Sur quels sujets une réflexion théorique vous paraît-elle utile ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى ميل واضح إلى الملموس، مع اهتمام عرضي بالأفكار المجرّدة. يبدو أن الاهتمام بالنظرية يتوقف على الموضوع.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك ربط الفكرة بتطبيقها.
- قد يكون بوسعك الانخراط في تفكير نظري حين يكون له غرض محدد.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يُختصر نقاش في الأفكار قبل أن يؤتي ثماره.
- قد تتطلب وثيقة شديدة التجريد جهدًا لا يغريك بذله.

**سؤال للجلسة** (`hypothese`) : في أي موضوعات يبدو لك التفكير النظري مفيدًا؟

### O5 · Milieu de l’échelle / قرب المنتصف

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers le concret ni vers l’abstrait. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez passer d’une discussion théorique à une question pratique.
- Vous pouvez vous adapter à des interlocuteurs de styles différents.

**Ce que cela peut coûter** (`hypothese`)

- Votre intérêt pour la théorie peut dépendre de votre disponibilité du moment.
- Vous pouvez hésiter sur le niveau d’abstraction à adopter dans une présentation.

**Question pour l’entretien** (`hypothese`) : Quand préférez-vous creuser une idée, et quand préférez-vous passer à l’action ?

**الوصف** (`ipip-items`, ar)

تقع إجاباتك قرب منتصف المقياس: فهي لا تميل بوضوح إلى الملموس ولا إلى المجرّد. لا تقول النتيجة القريبة من المنتصف وحدها الكثير: وتفيد جلسة عرض النتائج في توضيح معناها.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك الانتقال من نقاش نظري إلى سؤال عملي.
- قد يكون بوسعك التكيف مع محاورين مختلفي الأساليب.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يتوقف اهتمامك بالنظرية على مدى تفرّغك في اللحظة.
- قد يصعب عليك تحديد مستوى التجريد المناسب في عرض ما.

**سؤال للجلسة** (`hypothese`) : متى يلائمك التعمّق في فكرة، ومتى يلائمك الانتقال إلى التنفيذ؟

### O5 · Plutôt haut / مرتفع نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût assez marqué pour les idées, la lecture exigeante et les discussions théoriques. Cette tendance décrit un intérêt, non un niveau de connaissance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez apporter du recul et des cadres de réflexion à un groupe.
- Vous pouvez vous plonger dans un sujet complexe sans vous lasser rapidement.

**Ce que cela peut coûter** (`hypothese`)

- Une discussion théorique peut vous retenir plus longtemps que le projet ne le permet.
- Il se peut que vos interlocuteurs trouvent vos propos éloignés de leurs préoccupations immédiates.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous qu’une réflexion a suffisamment avancé pour passer à l’action ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى ميل واضح إلى الأفكار والقراءة الجادة والنقاشات النظرية. يصف هذا الميل اهتمامًا، ولا يدل على مستوى معرفة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك منح المجموعة سعة نظر وأطرًا للتفكير.
- قد يكون بوسعك الاستغراق في موضوع معقد دون أن يسرع إليك الملل.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يطول بك نقاش نظري أكثر مما يسمح به المشروع.
- قد يرى محاوروك أن كلامك بعيد عن شواغلهم الآنية.

**سؤال للجلسة** (`hypothese`) : كيف يتبيّن لك أن التفكير بلغ ما يكفي للانتقال إلى التنفيذ؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : كيف تقدّر أن التفكير بلغ ما يكفي للانتقال إلى التنفيذ؟
  f : كيف تقدّرين أن التفكير بلغ ما يكفي للانتقال إلى التنفيذ؟

### O5 · Haut / مرتفع

**Description** (`ipip-items`, fr)

Vos réponses indiquent un goût très marqué pour les idées abstraites, la lecture exigeante et les discussions théoriques. Cette tendance décrit un intérêt, non un niveau de connaissance.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez éclairer un problème par des angles que le groupe n’avait pas envisagés.
- Vous pouvez soutenir un effort de lecture ou de recherche sur la durée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que l’exploration d’idées prenne le pas sur la décision à prendre.
- Votre langage peut devenir difficile à suivre pour qui n’aime pas l’abstraction.

**Question pour l’entretien** (`hypothese`) : Quels moyens utilisez-vous pour rendre vos idées accessibles à ceux qui préfèrent le concret ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى ميل واضح جدًّا إلى الأفكار المجرّدة والقراءة الجادة والنقاشات النظرية. يصف هذا الميل اهتمامًا، ولا يدل على مستوى معرفة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك إضاءة مشكلة بزوايا لم تخطر على بال المجموعة.
- قد يكون بوسعك مواصلة جهد القراءة أو البحث على المدى الطويل.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يطغى استكشاف الأفكار على القرار الواجب اتخاذه.
- قد يصعب على من لا يحبون التجريد متابعة كلامك.

**سؤال للجلسة** (`hypothese`) : ما الوسائل التي تجعل أفكارك في متناول من يفضّلون الملموس؟

## A4 · Coopération / التعاون

**Définition.** Cette facette est mesurée par quatre affirmations qui portent sur la confrontation ouverte : dispute, cris, insultes, représailles.

**التعريف.** تُقاس هذه السمة الفرعية بأربع عبارات تتعلق بالمواجهة العلنية: المشاجرة والصراخ والإهانة والانتقام.

**Les quatre affirmations du questionnaire (français) :**

- « J’adore une bonne dispute » (cotation inversée)
- « Je crie sur les gens » (cotation inversée)
- « J’insulte les gens » (cotation inversée)
- « Je me venge » (cotation inversée)

> **Avertissement sur le libellé.** Le libellé « Coopération » est plus large que ce qui est mesuré : un résultat haut décrit surtout l’absence de confrontation ouverte, il ne dit pas si vous coopérez bien.
>
> **تنبيه حول العنوان.** عنوان «التعاون» أوسع مما يُقاس فعلًا: فالنتيجة المرتفعة تصف أساسًا غياب المواجهة العلنية، ولا تدل على جودة تعاونك.

### A4 · Bas / منخفض

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’un désaccord peut parfois s’exprimer chez vous avec vivacité : ton qui monte, riposte, goût du débat musclé. Cela décrit une manière d’exprimer un désaccord, non un jugement sur votre rapport aux autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez dire clairement un désaccord sans le laisser s’enliser.
- Vous pouvez défendre vos intérêts ou ceux de votre équipe sans détour.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que votre vivacité soit perçue comme une agression, même sans que vous l’ayez voulu.
- Une riposte peut entretenir un conflit qui se serait éteint seul.

**Question pour l’entretien** (`hypothese`) : Quand un désaccord monte en tension, qu’est-ce qui vous aide à reprendre une discussion calme ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الخلاف قد يظهر لديك أحيانًا بحدّة: ارتفاع في النبرة، أو ردّ، أو ميل إلى النقاش الساخن. يصف هذا طريقة في التعبير عن الخلاف، لا حكمًا على علاقتك بالآخرين.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك قول الخلاف بوضوح دون تركه يتعثر.
- قد يكون بوسعك الدفاع عن مصالحك أو مصالح فريقك دون مواربة.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تُفهم حدّتك على أنها عدوانية حتى دون قصد منك.
- قد يُبقي الرد خلافًا كان سينطفئ من تلقاء نفسه.

**سؤال للجلسة** (`hypothese`) : حين يشتد توتر خلاف ما، ما الذي يساعدك على استئناف نقاش هادئ؟

### A4 · Plutôt bas / منخفض نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’un désaccord peut parfois s’exprimer chez vous assez vivement. Cela décrit une manière d’exprimer un désaccord, non un jugement sur votre rapport aux autres.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez aborder un sujet délicat plutôt que de l’éviter.
- Votre franchise peut faire avancer une discussion bloquée.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certaines de vos réactions soient interprétées plus durement que vous ne le pensiez.
- Une réponse vive peut fermer une discussion que vous vouliez ouvrir.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations votre réaction a-t-elle été plus vive que vous ne l’auriez souhaité ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الخلاف قد يظهر لديك أحيانًا بحدّة ملحوظة. يصف هذا طريقة في التعبير عن الخلاف، لا حكمًا على علاقتك بالآخرين.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك مواجهة موضوع حساس بدل تجنّبه.
- قد تدفع صراحتك نقاشًا متوقفًا إلى الأمام.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تُفسَّر بعض ردودك بقسوة أشد مما كان متوقعًا.
- قد يغلق رد حاد نقاشًا كان المراد فتحه.

**سؤال للجلسة** (`hypothese`) : في أي مواقف جاء ردّك أشد حدّة مما أردت؟

### A4 · Milieu de l’échelle / قرب المنتصف

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la confrontation ouverte ni vers son évitement. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez choisir entre exprimer un désaccord et le laisser passer.
- Vous pouvez adapter votre façon de réagir à la personne et à l’enjeu.

**Ce que cela peut coûter** (`hypothese`)

- Votre façon de réagir peut sembler difficile à anticiper.
- Vous pouvez hésiter entre confronter et temporiser.

**Question pour l’entretien** (`hypothese`) : Comment décidez-vous d’exprimer un désaccord ou de le laisser passer ?

**الوصف** (`ipip-items`, ar)

تقع إجاباتك قرب منتصف المقياس: فهي لا تميل بوضوح إلى المواجهة العلنية ولا إلى تجنّبها. لا تقول النتيجة القريبة من المنتصف وحدها الكثير: وتفيد جلسة عرض النتائج في توضيح معناها.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك الاختيار بين التعبير عن خلاف وتركه يمر.
- قد يتغير أسلوب تفاعلك بحسب الشخص والرهان.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يصعب على المحيطين بك توقع ردّ فعلك.
- قد يصعب عليك الاختيار بين المواجهة والتأجيل.

**سؤال للجلسة** (`hypothese`) : كيف يتحدد لديك التعبير عن خلاف أو تركه يمر؟

### A4 · Plutôt haut / مرتفع نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous évitez le plus souvent la confrontation ouverte et la riposte. Quand un désaccord survient, il semble se traiter chez vous sans élever le ton.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez maintenir un climat apaisé quand un désaccord survient.
- Vous pouvez désamorcer une tension avant qu’elle ne s’installe.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que certains désaccords ne soient pas exprimés alors qu’il serait utile de les traiter.
- Vos interlocuteurs peuvent ignorer que vous avez un avis différent.

**Question pour l’entretien** (`hypothese`) : Quels désaccords restent en vous sans être exprimés, et que se passe-t-il ensuite ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن المواجهة العلنية والرد بالمثل يغيبان في الغالب عن طريقتك في التعامل مع الخلاف. حين يقع خلاف، يبدو أنه يُعالَج لديك دون رفع للنبرة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يبقى المناخ هادئًا حين يقع خلاف.
- قد يكون بوسعك نزع فتيل توتر قبل أن يستقر.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تبقى بعض الخلافات دون تعبير رغم فائدة معالجتها.
- قد يجهل محاوروك أن لك رأيًا مخالفًا.

**سؤال للجلسة** (`hypothese`) : ما الخلافات التي تبقى في داخلك دون تعبير، وماذا يحدث بعد ذلك؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : ما الخلافات التي تحتفظ بها دون تعبير، وماذا يحدث بعد ذلك؟
  f : ما الخلافات التي تحتفظين بها دون تعبير، وماذا يحدث بعد ذلك؟

### A4 · Haut / مرتفع

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous écartez très nettement la dispute, les cris, l’insulte et la riposte. Les tensions semblent s’exprimer chez vous sans confrontation ouverte.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez maintenir des relations de travail stables, même quand la discussion est difficile.
- Vous pouvez garder la maîtrise de votre ton quand le ton monte autour de vous.

**Ce que cela peut coûter** (`hypothese`)

- Un désaccord important peut rester sans réponse parce que la confrontation est évitée.
- Il se peut que votre réserve laisse à d’autres le soin de défendre des positions qui vous importent.

**Question pour l’entretien** (`hypothese`) : Qu’est-ce qui vous permettrait d’exprimer un désaccord important sans que la relation en souffre ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى استبعاد واضح جدًّا للمشاجرة والصراخ والإهانة والانتقام. يبدو أن التوتر يُعبَّر عنه لديك دون مواجهة علنية.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك الحفاظ على علاقات عمل مستقرة حتى حين يصعب النقاش.
- قد يكون بوسعك الاحتفاظ بضبط نبرتك حين ترتفع النبرات من حولك.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يبقى خلاف مهم دون جواب لأن المواجهة تُتجنَّب.
- قد يترك تحفّظك للآخرين مهمة الدفاع عن مواقف تهمّك.

**سؤال للجلسة** (`hypothese`) : ما الذي يتيح لك التعبير عن خلاف مهم دون أن تتأثر العلاقة؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : تشير إجاباتك إلى أنك تستبعد بوضوح تام المشاجرة والصراخ والإهانة والانتقام.
  f : تشير إجاباتك إلى أنكِ تستبعدين بوضوح تام المشاجرة والصراخ والإهانة والانتقام.

## C5 · Autodiscipline / الانضباط الذاتي

**Définition.** Cette facette porte sur la préparation, la mise en route des tâches et la régularité avec laquelle vous menez vos projets à terme.

**التعريف.** تتناول هذه السمة الفرعية الاستعداد والشروع في المهام والانتظام في إنجاز المشاريع حتى نهايتها.

**Les quatre affirmations du questionnaire (français) :**

- « Je suis toujours préparé » (cotation directe)
- « Je réalise mes projets » (cotation directe)
- « Je perds mon temps » (cotation inversée)
- « J’ai de la difficulté à commencer les tâches » (cotation inversée)

### C5 · Bas / منخفض

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

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى صعوبة متكررة في الشروع في العمل وفي مواصلة المشاريع حتى نهايتها. يتعلق ما تصرّح به إجاباتك بالشروع والاستمرار، لا بقيمتك ولا بذكائك.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يبقى مجال الطارئ مفتوحًا أمامك بدل اتباع خطة حرفيًّا.
- قد يتاح لك اغتنام فرصة لم تكن مخططة.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تقترب مواعيد التسليم دون أن يكون العمل متقدمًا.
- قد تتراكم المهام التي يصعب الشروع فيها.

**سؤال للجلسة** (`hypothese`) : ما الظروف (موعد نهائي، وجود شخص آخر، تقسيم المهمة) التي تعينك على الشروع؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : قد تبقى منفتحًا على الطارئ بدل اتباع خطة حرفيًّا.
  f : قد تبقين منفتحةً على الطارئ بدل اتباع خطة حرفيًّا.

### C5 · Plutôt bas / منخفض نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent qu’il peut vous arriver de peiner à démarrer ou à poursuivre ce que vous aviez prévu. Cela peut dépendre de l’intérêt que vous trouvez à la tâche.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez ajuster un plan quand les circonstances changent.
- Vous pouvez vous engager pleinement dans ce qui vous mobilise.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que des tâches peu motivantes soient repoussées.
- Vous pouvez avoir besoin d’un cadre extérieur pour tenir un calendrier.

**Question pour l’entretien** (`hypothese`) : Sur quels types de tâches repoussez-vous le plus souvent, et pourquoi ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى أن الشروع فيما خُطِّط له أو مواصلته قد يصعب عليك أحيانًا. قد يتوقف ذلك على مدى اهتمامك بالمهمة.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك تعديل خطة حين تتغير الظروف.
- قد يكون بوسعك الانخراط الكامل فيما يستهويك.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد تُؤجَّل المهام الأقل حفزًا.
- قد يلزمك إطار خارجي للالتزام بجدول زمني.

**سؤال للجلسة** (`hypothese`) : في أي أنواع المهام يتكرر التأجيل لديك، ولماذا؟

*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*

- m : في أي أنواع المهام تؤجّل، ولماذا؟
  f : في أي أنواع المهام تؤجّلين، ولماذا؟

### C5 · Milieu de l’échelle / قرب المنتصف

**Description** (`ipip-items`, fr)

Vos réponses se situent près du milieu de l’échelle : elles ne penchent nettement ni vers la discipline ni vers la souplesse. Seul, un résultat proche du milieu dit peu de choses : l’entretien de restitution sert à en préciser le sens.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez alterner entre planification et improvisation.
- Vous pouvez tenir un plan sans vous y enfermer.

**Ce que cela peut coûter** (`hypothese`)

- Votre régularité peut varier d’une période à l’autre.
- Vos collègues peuvent ne pas savoir sur quel degré de préparation compter.

**Question pour l’entretien** (`hypothese`) : Dans quelles périodes tenez-vous le plus régulièrement vos engagements, et qu’ont-elles en commun ?

**الوصف** (`ipip-items`, ar)

تقع إجاباتك قرب منتصف المقياس: فهي لا تميل بوضوح إلى الانضباط ولا إلى المرونة. لا تقول النتيجة القريبة من المنتصف وحدها الكثير: وتفيد جلسة عرض النتائج في توضيح معناها.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك التناوب بين التخطيط والارتجال.
- قد يكون بوسعك الالتزام بخطة دون أن تحبسك.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يتفاوت انتظامك من فترة إلى أخرى.
- قد لا يعرف زملاؤك درجة الاستعداد التي يمكنهم الاعتماد عليها.

**سؤال للجلسة** (`hypothese`) : في أي فترات يكون التزامك بتعهداتك أكثر انتظامًا، وما الذي يجمع بينها؟

### C5 · Plutôt haut / مرتفع نسبيًّا

**Description** (`ipip-items`, fr)

Vos réponses indiquent que vous vous préparez le plus souvent et que vous menez à terme ce que vous avez prévu. Démarrer une tâche semble vous demander rarement un effort particulier.

**Ce que cela peut apporter** (`hypothese`)

- Vous pouvez tenir un engagement dans la durée.
- Vous pouvez rendre un projet plus fiable par votre préparation.

**Ce que cela peut coûter** (`hypothese`)

- Il se peut que vous teniez un plan alors que la situation justifierait de le changer.
- Vous pouvez avoir du mal à travailler avec un rythme moins planifié que le vôtre.

**Question pour l’entretien** (`hypothese`) : Dans quelles situations est-il utile pour vous de lâcher le plan prévu ?

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى استعداد في الغالب وإلى إنجاز ما خُطِّط له حتى نهايته. يبدو أن الشروع في مهمة نادرًا ما يتطلب جهدًا خاصًّا.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك الوفاء بالتزام على المدى الطويل.
- قد يزيد استعدادك من موثوقية مشروع ما.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يبقى تمسكك بخطة قائمًا حين يبرّر الموقف تغييرها.
- قد يصعب عليك العمل مع إيقاع أقل تخطيطًا من إيقاعك.

**سؤال للجلسة** (`hypothese`) : في أي مواقف يفيدك التخلي عن الخطة الموضوعة؟

### C5 · Haut / مرتفع

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

**الوصف** (`ipip-items`, ar)

تشير إجاباتك إلى استعداد شبه دائم وإلى إنجاز المشاريع حتى نهايتها بانتظام كبير. لا يطرح الشروع في المهام، بحسب إجاباتك، أي صعوبة تقريبًا.

**ما قد يتيحه ذلك** (`hypothese`)

- قد يكون بوسعك إيصال مشروع شاق إلى نهايته.
- قد يكون بوسعك منح فريقك نقاط ارتكاز يمكن التنبؤ بها.

**ما قد يكلّفه ذلك** (`hypothese`)

- قد يتطلب الطارئ منك جهدًا خاصًّا.
- قد يقع عليك وحدك عبء إعداد كان يمكن للمجموعة أن تتقاسمه.

**سؤال للجلسة** (`hypothese`) : ماذا يحدث لديك حين يتعين التخلي عن خطة أُعدّت بعناية؟

