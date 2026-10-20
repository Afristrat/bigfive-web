# Propositions de traduction et de rédaction à valider

Date : 2026-10-20. Document de propositions : **aucune ligne de code ni de messages n'a été modifiée**. Le client valide chaque texte avant toute mise en ligne.

> **Statut de l'ensemble : à relire par un locuteur natif avant mise en ligne** (arabe, rubriques 1 et 2). **Texte juridique (rubrique 2) : à valider par le client et à relire par un juriste (RGPD et loi marocaine 09-08).**

Sources lues : `audit-traductions.md`, `voix-de-marque.md`, `textes.md`, `web/src/app/[locale]/privacy/page.tsx`, `web/src/messages/{fr,en,ar}.js`, `web/node_modules/@bigfive-org/results/lib/data/{en,fr,ar}/`, ainsi que le code de `web/src` et `supabase/migrations` pour la rubrique 2. Le dépôt est en mouvement (branche `tenga-espace-prive`, fichiers non commités d'une autre session) : les constats de code ci-dessous valent pour l'état du répertoire de travail du 20/10/2026.

Conventions : espaces insécables (U+00A0) posées dans les textes français proposés ; chiffres occidentaux en arabe ; adresse en arabe par pronom suffixe et noms verbaux (voix-de-marque § 2.2). Les mentions `⚠ passage sensible` signalent un passage de l'original qui contredit la voix de marque (jugement, aptitude, comparaison à une norme que le calcul n'a pas, vocabulaire clinique). Pour chacun, la proposition arabe reste fidèle quand c'est possible, et une recommandation est donnée : la décision est au client.

---

## 1. Interprétation du résultat en arabe

### 1.1 Constats préalables (à lire avant de valider)

1. **Périmètre exact.** Dans `ar/*.js`, `description` et `results[i].text` sont de l'anglais copié : 5 descriptions + 15 textes de niveau = 20 textes. Les 30 facettes (`facets[].title`, `facets[].text`) sont en arabe et ne sont pas traitées ici.
2. **Cinq textes de plus sont affichés et à corriger : `shortDescription`.** Ils s'affichent sous chaque domaine de la page de résultat (`result/[id]/page.tsx:175`). En arabe ils portent les anciens noms (« المسايرة », « اليقظة/التفاني ») et une coquille (« علو وفاق »). En français ils portent « Convivialité », « Conscience », « L'ouverture d'esprit », que `voix-de-marque.md` § 4.2 proscrit. Propositions en 1.4 (arabe) et 1.5 (français), hors des 20 demandés.
3. **Le français « validé » du paquet n'est pas une référence sûre pour le sens.** Il contient des erreurs de fond : « Les impulsions sont par définition mauvaises » (l'anglais dit l'inverse), « années d'expérience » pour *years of education*, « Convialité », « Ils minorent les frustrations comme le désespoir », fautes d'orthographe (« probalement », « abstration »). J'ai donc traduit **depuis l'anglais** et vérifié contre le français ; chaque divergence est signalée dans la colonne de notes. Le français du paquet est lui aussi à corriger (même mécanisme de surcharge), hors périmètre de ce document.
4. **Aucune norme de population dans le calcul.** `@bigfive-org/score` classe « élevé » si la moyenne des réponses du domaine dépasse 3, « bas » si elle est inférieure à 3, « moyen » (`neutral`) seulement si elle vaut exactement 3. Les textes anglais et français disent « average », « typical of the general population », « la plupart des gens » : c'est faux au regard du calcul. Les propositions arabes disent donc « في المنتصف » (comme `results.level.neutral` du site) et « في الجزء الأدنى / الأعلى من المقياس » sans comparaison à autrui. Écart volontaire, signalé là où il joue.
5. **Ton.** Les textes de niveau sont rédigés au conditionnel de tendance (« يدل على ميل إلى »), sans verbe conjugué à la 2e personne (genré en arabe), avec « نتيجتك » et le pronom suffixe. Libellés de niveau alignés sur le site : منخفضة / في المنتصف / مرتفعة.
6. **Passages d'aptitude et de jugement.** Les descriptions longues contiennent des affirmations sur la performance professionnelle (« police work, sales »), l'intelligence, la réussite, des qualificatifs de personnes (« compulsive perfectionists », « stuffy and boring »), ainsi que, pour le névrosisme, un vocabulaire clinique (« mental distress », « neurotic's ability »). Elles sont lues par des candidats. Elles contredisent `voix-de-marque.md` § 2.7 et § 2.8 et ne sont pas sourcées dans le paquet. Je ne les ai pas supprimées de mon propre chef : elles sont traduites et marquées `⚠ passage sensible`, avec ma recommandation. **Décision du client : traduire, atténuer ou retirer, et dans ce cas dans les trois langues pour ne pas créer trois contenus différents.**
7. **Affirmations factuelles non vérifiées.** Récit historique sur Freud, « les recherches ont montré que », lien entre ouverture et niveau d'études : reprises de l'anglais du paquet, non vérifiées indépendamment (DÉFCON 1). À faire sourcer ou retirer.

### 1.2 Mécanisme d'intégration proposé (non écrit)

- Fichier chemin du paquet par domaine : `web/node_modules/@bigfive-org/results/lib/data/ar/<nom>.js` avec `openness_to_experience`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`. **Ne pas éditer `node_modules`** (perdu à chaque installation).
- Clés à remplacer, par domaine : `description` (chaîne HTML, paragraphes séparés par `<br /><br />`), `shortDescription`, et `results[0].text` (bas), `results[1].text` (moyen, `score: 'neutral'`), `results[2].text` (élevé).
- Forme : un module `web/src/lib/result-overrides.ts`, sur le modèle de `web/src/lib/question-overrides.ts`, exportant un `Record<'O'|'C'|'E'|'A'|'N', { shortDescription, description, texts: { low, neutral, high } }>` par langue (`ar` ici, `fr` pour `shortDescription` et plus tard le reste).
- Point d'application unique : dans `getTestResult` (`web/src/actions/index.ts`, juste après `generateResult({ lang: selectedLanguage, scores })`), appliquer une fonction pure `applyResultOverrides(results, selectedLanguage)` qui renvoie des domaines copiés dont `description`, `shortDescription` et `text` (choisi d'après `scoreText`) sont remplacés. Aucun composant ne change : `domain.tsx` et `page.tsx` lisent déjà ces champs.
- Sécurité : `description` est injectée par `dangerouslySetInnerHTML` (`domain.tsx:101`). Les textes viennent d'un module du dépôt, jamais d'une saisie ; ils ne contiennent que du texte et `<br /><br />`.
- Test à prévoir : pour chaque domaine arabe, présence de lettres arabes, aucune phrase latine (hors noms de marque), même nombre de `<br /><br />` que l'anglais, aucun tiret cadratin.

### 1.3 Les 20 textes demandés

Pour chaque domaine : (a) la description, paragraphe par paragraphe (original anglais, français du paquet, proposition arabe, notes), puis (b) les trois textes de niveau. Les originaux sont reproduits à l'identique, retours à la ligne aplatis. Dans le bloc « à coller », les paragraphes arabes sont joints par `<br /><br />` ; **les paragraphes marqués `⚠` y figurent** : à retirer du bloc si le client le décide.

#### Domaine O : Openness to Experience / Ouverture à l'expérience / الانفتاح على الخبرة

- Fichier : `web/node_modules/@bigfive-org/results/lib/data/ar/openness_to_experience.js`
- Clés à remplacer : `description`, `results[0].text`, `results[1].text`, `results[2].text`

**(a) Description, 5 paragraphes** (`description`)

*Paragraphe 1*

- Anglais : Open people are intellectually curious, appreciative of art, and sensitive to beauty. They tend to be, compared to closed people, more aware of their feelings. They tend to think and act in individualistic and nonconforming ways. Intellectuals typically score high on Openness to Experience; consequently, this factor has also been called Culture or Intellect.
- Français du paquet : Les personnes ouvertes d'esprit sont intellectuellement curieuses, apprécient l'art et sont sensibles à la beauté. Ils tendent à être perçus comme des gens proches et en phase avec leurs émotions. Ils agissent de façon non conventionnelle. Les intellectuels ont typiquement un score haut en ouverture d'esprit, en conséquence, ce facteur est aussi appelé Culture ou Intellect.
- **Arabe proposé** : يتميّز الأشخاص المنفتحون على الخبرة بالفضول الفكري، وتقدير الفن، والتأثر بالجمال. وهم، قياسًا بالأشخاص الأقل انفتاحًا، أكثر وعيًا بمشاعرهم، ويميلون إلى التفكير والتصرف بطرق فردية لا تتقيّد بالمألوف. وغالبًا ما تكون نتائج أصحاب الاهتمامات الفكرية مرتفعة في هذه السمة، ولذلك سُمّي هذا العامل أيضًا «الثقافة» أو «الفكر».

*Paragraphe 2*

- Anglais : Nonetheless, Intellect is probably best regarded as one aspect of openness to experience. Scores on Openness to Experience are only modestly related to years of education and scores on standard intelligent tests.
- Français du paquet : Néanmoins, l'intellect est probalement l'aspect le plus important de l'ouverture d'esprit. Ce score n'est que peu corrélé aux années d'expérience ou au test d'intelligence standard.
- **Arabe proposé** : غير أن الأولى اعتبار «الفكر» جانبًا واحدًا من جوانب الانفتاح على الخبرة. فالنتائج في هذه السمة لا ترتبط إلا ارتباطًا محدودًا بعدد سنوات الدراسة وبنتائج اختبارات الذكاء المعيارية.
- Note : Le français du paquet écrit « années d'expérience » ; l'anglais dit « years of education » (années d'études). Traduit d'après l'anglais.

*Paragraphe 3*

- Anglais : Another characteristic of the open cognitive style is a facility for thinking in symbols and abstractions far removed from concrete experience. Depending on the individual's specific intellectual abilities, this symbolic cognition may take the form of mathematical, logical, or geometric thinking, artistic and metaphorical use of language, music composition or performance, or one of the many visual or performing arts.
- Français du paquet : Une autre caractéristique de l'ouverture cognitive est la facilité d'abstration des concepts plutôt que la limitation aux faits. Ramené à un individu, cette capacité peut se traduire par des formes de pensées orientées vers les mathématiques, la logique, la géometrie, l'art, les métaphores verbales, la musique ou bien d'autres formes d'arts.
- **Arabe proposé** : ومن خصائص هذا الأسلوب المعرفي أيضًا سهولة التفكير بالرموز والمفاهيم المجرّدة البعيدة عن التجربة الملموسة. وبحسب القدرات الذهنية الخاصة بكل شخص، قد يتخذ هذا التفكير الرمزي شكل تفكير رياضي أو منطقي أو هندسي، أو استعمالًا فنيًّا ومجازيًّا للغة، أو تأليفًا موسيقيًّا أو أداءً موسيقيًّا، أو أحد الفنون التشكيلية والأدائية الكثيرة.

*Paragraphe 4*

- Anglais : People with low scores on openness to experience tend to have narrow, common interests. They prefer the plain, straightforward, and obvious over the complex, ambiguous, and subtle. They may regard the arts and sciences with suspicion, regarding these endeavors as abstruse or of no practical use. Closed people prefer familiarity over novelty; they are conservative and resistant to change.
- Français du paquet : Les individus présentant un score bas tendent à avoir des centres d'intérêts restreints. Ils prefèreront des réflexions simples et claires plutôt que complexes, ambigües ou subtiles. Ils voient les réflexions artistiques et scientifiques comme obscures et complexes à mettre en œuvre. Ils préféreront la routine à la nouveauté. Ils sont conservateurs et résistants aux changements.
- **Arabe proposé** : أما أصحاب النتائج الواقعة في الجزء الأدنى من المقياس فتميل اهتماماتهم إلى أن تكون محدودة ومألوفة. فهم يفضّلون البسيط والمباشر والواضح على المعقّد والملتبس والدقيق، وقد ينظرون إلى الفنون والعلوم بشيء من الريبة، فيرونها غامضة أو عديمة الفائدة العملية. ويؤثرون المألوف على الجديد، ويميلون إلى المحافظة ومقاومة التغيير.
- Note : « Closed people » rendu par « أصحاب النتائج الواقعة في الجزء الأدنى » pour éviter une étiquette de personne.

*Paragraphe 5*  ⚠ passage sensible

- Anglais : Openness is often presented as healthier or more mature by psychologists, who are often themselves open to experience. However, open and closed styles of thinking are useful in different environments. The intellectual style of the open person may serve a professor well, but research has shown that closed thinking is related to superior job performance in police work, sales, and a number of service occupations.
- Français du paquet : L'ouverture d'esprit est souvent présentée comme étant une preuve de maturité et plus saine pour l'esprit. Cependant ces systèmes de pensée présentent des avantages et des inconvénients en fonction de l'environnement de l'individu. Par exemple, un score haut aidera les professeurs, à l'inverse un score bas aidera les policiers ou les commerciaux.
- **Arabe proposé (1/2)** : كثيرًا ما يقدّم علماء النفس الانفتاح على أنه أكثر صحة ونضجًا، وهم أنفسهم غالبًا من المنفتحين على الخبرة. غير أن أسلوبَي التفكير، المنفتح والمتحفّظ، يفيد كلٌّ منهما في بيئات مختلفة.
- **Arabe proposé (2/2)** ⚠ : [مقطع حسّاس] ويناسب الأسلوب الفكري للشخص المنفتح أستاذًا جامعيًّا، لكن الأبحاث بيّنت أن التفكير المتحفّظ يرتبط بأداء وظيفي أفضل في عمل الشرطة والمبيعات وعدد من مهن الخدمات.
- Note : Affirmation sur la performance au travail, sans source dans le paquet. Contraire à voix-de-marque § 2.8 (jamais d'aptitude ni de compétence). Recommandation : ne pas publier. En français et en anglais, la phrase existe aussi : la retirer des trois langues si le client la juge inadaptée à des candidats.

Bloc à coller (`description`) :

```text
يتميّز الأشخاص المنفتحون على الخبرة بالفضول الفكري، وتقدير الفن، والتأثر بالجمال. وهم، قياسًا بالأشخاص الأقل انفتاحًا، أكثر وعيًا بمشاعرهم، ويميلون إلى التفكير والتصرف بطرق فردية لا تتقيّد بالمألوف. وغالبًا ما تكون نتائج أصحاب الاهتمامات الفكرية مرتفعة في هذه السمة، ولذلك سُمّي هذا العامل أيضًا «الثقافة» أو «الفكر». <br /><br /> غير أن الأولى اعتبار «الفكر» جانبًا واحدًا من جوانب الانفتاح على الخبرة. فالنتائج في هذه السمة لا ترتبط إلا ارتباطًا محدودًا بعدد سنوات الدراسة وبنتائج اختبارات الذكاء المعيارية. <br /><br /> ومن خصائص هذا الأسلوب المعرفي أيضًا سهولة التفكير بالرموز والمفاهيم المجرّدة البعيدة عن التجربة الملموسة. وبحسب القدرات الذهنية الخاصة بكل شخص، قد يتخذ هذا التفكير الرمزي شكل تفكير رياضي أو منطقي أو هندسي، أو استعمالًا فنيًّا ومجازيًّا للغة، أو تأليفًا موسيقيًّا أو أداءً موسيقيًّا، أو أحد الفنون التشكيلية والأدائية الكثيرة. <br /><br /> أما أصحاب النتائج الواقعة في الجزء الأدنى من المقياس فتميل اهتماماتهم إلى أن تكون محدودة ومألوفة. فهم يفضّلون البسيط والمباشر والواضح على المعقّد والملتبس والدقيق، وقد ينظرون إلى الفنون والعلوم بشيء من الريبة، فيرونها غامضة أو عديمة الفائدة العملية. ويؤثرون المألوف على الجديد، ويميلون إلى المحافظة ومقاومة التغيير. <br /><br /> كثيرًا ما يقدّم علماء النفس الانفتاح على أنه أكثر صحة ونضجًا، وهم أنفسهم غالبًا من المنفتحين على الخبرة. غير أن أسلوبَي التفكير، المنفتح والمتحفّظ، يفيد كلٌّ منهما في بيئات مختلفة. <br /><br /> ويناسب الأسلوب الفكري للشخص المنفتح أستاذًا جامعيًّا، لكن الأبحاث بيّنت أن التفكير المتحفّظ يرتبط بأداء وظيفي أفضل في عمل الشرطة والمبيعات وعدد من مهن الخدمات.
```

**(b) Textes de niveau**

*Niveau bas (`results[0]`)*

- Anglais : Your score on Openness to Experience is low, indicating you like to think in plain and simple terms. Others describe you as down-to-earth, practical, and conservative.
- Français du paquet : Votre score bas indique que vous aimez réfléchir en termes simples. Votre entourage vous décrit comme quelqu'un de conservateur, pratique et terre à terre
- **Arabe proposé** : نتيجتك في الانفتاح على الخبرة منخفضة، وهذا يدل على ميل إلى التفكير بعبارات بسيطة ومباشرة. وقد يرى فيك المحيطون بك واقعية وحسًّا عمليًّا وميلًا إلى المحافظة.

*Niveau moyen (`results[1]`, clé `neutral`)*

- Anglais : Your score on Openness to Experience is average, indicating you enjoy tradition but are willing to try new things. Your thinking is neither simple nor complex. To others you appear to be a well-educated person but not an intellectual.
- Français du paquet : Votre score dans la moyenne indique que vous aimez les traditions mais également que vous n'êtes pas contre les nouvelles choses. Votre mode de pensée est plus simple que complexe. Votre entourage vous voit comme quelqu'un de bien éduqué mais pas non plus un intellectuel.
- **Arabe proposé** : نتيجتك في الانفتاح على الخبرة في المنتصف، وهذا يدل على ارتياح إلى التقاليد مع استعداد لتجربة أشياء جديدة. وتفكيرك ليس بسيطًا ولا معقّدًا. وقد يرى فيك المحيطون بك شخصًا على قدر جيد من التعليم، دون أن يكون من أهل الفكر والنظر.

*Niveau élevé (`results[2]`)*

- Anglais : Your score on Openness to Experience is high, indicating you enjoy novelty, variety, and change. You are curious, imaginative, and creative.
- Français du paquet : Votre score haut indique que vous aimez tenter de nouvelles expériences, varier les plaisirs et le changement en règle générale. Vous êtes curieux, imaginatif et créatif.
- **Arabe proposé** : نتيجتك في الانفتاح على الخبرة مرتفعة، وهذا يدل على ميل إلى حبّ الجديد والتنوّع والتغيير. ويغلب عليك الفضول والخيال والإبداع.


#### Domaine C : Conscientiousness / Conscienciosité / يقظة الضمير

- Fichier : `web/node_modules/@bigfive-org/results/lib/data/ar/conscientiousness.js`
- Clés à remplacer : `description`, `results[0].text`, `results[1].text`, `results[2].text`

**(a) Description, 6 paragraphes** (`description`)

*Paragraphe 1*

- Anglais : Impulses are not inherently bad; occasionally time constraints require a snap decision, and acting on our first impulse can be an effective response. Also, in times of play rather than work, acting spontaneously and impulsively can be fun. Impulsive individuals can be seen by others as colorful, fun-to-be-with, and zany.
- Français du paquet : Les impulsions sont par définition mauvaises. Occasionnellement, certaines contraintes impliquent de casser des décisions et nécessitent une action rapide, alors les impulsions sont efficaces. De plus hors du cadre du travail, lors de jeux par exemple, agir de façon spontanée et impulsive peut être amusant. Les impulsifs peuvent être vus comme divertissants ou loufoques.
- **Arabe proposé** : الدوافع ليست سيئة في ذاتها؛ فقد يفرض ضيق الوقت أحيانًا قرارًا سريعًا، وقد يكون التصرف وفق أول دافع ردًّا فعّالًا. وفي أوقات اللعب والترفيه، لا في أوقات العمل، قد يكون التصرف بعفوية واندفاع ممتعًا. وقد يرى الآخرون في الأشخاص الاندفاعيين حيوية وطرافة وخفّة ظل.
- Note : Le français du paquet dit « Les impulsions sont par définition mauvaises », ce qui contredit l'anglais (« not inherently bad »). Traduit d'après l'anglais.

*Paragraphe 2*  ⚠ passage sensible

- Anglais : Nonetheless, acting on impulse can lead to trouble in a number of ways. Some impulses are antisocial. Uncontrolled antisocial acts not only harm other members of society, but also can result in retribution toward the perpetrator of such impulsive acts. Another problem with impulsive acts is that they often produce immediate rewards but undesirable, long-term consequences. Examples include excessive socializing that leads to being fired from one's job, hurling an insult that causes the breakup of an important relationship, or using pleasure-inducing drugs that eventually destroy one's health.
- Français du paquet : Néanmoins, agir sous le coup d'une impulsion peut être mauvais. Certaines impulsions sont anti-sociales. Les actes anti-sociaux non contrôlés ne blessent pas seulement des membres de la société, mais les auteurs peuvent également encourir des sanctions. Un autre souci est l'immédiateté d'un résultat pas toujours désiré ou ayant des conséquences sur le long-terme. Par exemple impliquant un licenciement, hurler et insulter sur un collègue peut causer la destruction d'une importante relation de travail ou encore l'utilisation de drogue induit un plaisir immédiat mais une détérioration de l'état de santé sur le long terme.
- **Arabe proposé** : ومع ذلك، قد يوقع التصرف بدافع اللحظة في مشكلات من وجوه عدة. فبعض الدوافع مضادّ للمجتمع، والأفعال المضادّة للمجتمع التي لا يضبطها صاحبها لا تضرّ بغيره فحسب، بل قد تعرّضه هو أيضًا للعقاب. ومن مشكلات الأفعال الاندفاعية كذلك أنها كثيرًا ما تحقق مكاسب فورية لكن عواقبها بعيدة المدى غير مرغوبة. ومن الأمثلة الإفراط في الاختلاط الاجتماعي حتى يُفصل المرء من عمله، أو إطلاق إهانة تُنهي علاقة مهمة، أو تعاطي مخدرات تمنح لذة آنية ثم تُتلف الصحة في النهاية.
- Note : Ton alarmiste (actes antisociaux, drogues) dans un texte lu par des candidats. Fidèle à l'anglais ; à raccourcir ou retirer si le client le juge disproportionné.

*Paragraphe 3*  ⚠ passage sensible

- Anglais : Impulsive behavior, even when not seriously destructive, diminishes a person's effectiveness in significant ways. Acting impulsively disallows contemplating alternative courses of action, some of which would have been wiser than the impulsive choice. Impulsivity also sidetracks people during projects that require organized sequences of steps or stages. Accomplishments of an impulsive person are therefore small, scattered, and inconsistent.
- Français du paquet : Un comportement impulsif, non destructif, peut fortement réduire l'efficacité. Agir de façon impulsive interdit les actions alternatives, qui auraient pu être envisagées. L'impulsivité peut également distraire les participants d'un projet nécessitant une organisation séquentielle. La réussite d'une personne impulsive est donc faible, éparpillée et inconsistante.
- **Arabe proposé** : والسلوك الاندفاعي، حتى حين لا يكون مدمّرًا، يقلّل فاعلية الشخص تقليلًا ملحوظًا. فالتصرف بدافع اللحظة لا يترك مجالًا للتفكير في مسارات بديلة قد يكون بعضها أحكم من الخيار الاندفاعي. كما يصرف الاندفاع الناس عن المشاريع التي تتطلب خطوات أو مراحل متسلسلة، فتأتي إنجازات الشخص الاندفاعي صغيرة ومتفرقة وغير منتظمة.
- Note : Jugement sur la valeur des réalisations d'une personne. Contraire à voix-de-marque § 2.7 et § 2.8. Recommandation : retirer la dernière phrase.

*Paragraphe 4*  ⚠ passage sensible

- Anglais : A hallmark of intelligence, what potentially separates human beings from earlier life forms, is the ability to think about future consequences before acting on an impulse. Intelligent activity involves contemplation of long-range goals, organizing and planning routes to these goals, and persisting toward one's goals in the face of short-lived impulses to the contrary. The idea that intelligence involves impulse control is nicely captured by the term prudence, an alternative label for the Conscientiousness domain. Prudent means both wise and cautious.
- Français du paquet : Une des caractéristiques de l'intelligence, ce qui potentiellement différencie l'être humain des anciennes formes de vie, est la capacité à penser aux conséquences avant d'agir sur une impulsion. Une activité intelligente implique la prise en compte de but à long terme, l'organisation et la planification des différents chemins pour arriver à ces buts pour désamorcer les impulsions à court terme. L'idée que l'intelligence implique le contrôle de ses impulsions est représentée par l'indice de prudence, un synonyme du domaine de la Conscience.
- **Arabe proposé** : ومن علامات الذكاء، وربما مما يميّز الإنسان عن صور الحياة الأقدم، القدرة على التفكير في العواقب المستقبلية قبل الانسياق وراء دافع ما. فالنشاط الذكي يقتضي التأمل في الأهداف بعيدة المدى، وتنظيم الطرق المؤدية إليها والتخطيط لها، والمثابرة على بلوغها رغم دوافع عابرة تدفع في الاتجاه المعاكس. وهذه الفكرة، أي أن الذكاء ينطوي على ضبط الدوافع، يلخّصها لفظ «الحصافة»، وهو اسم بديل لهذا البعد؛ فالحصيف هو الحكيم الحذر معًا.
- Note : Lie la conscienciosité à l'intelligence : affirmation d'aptitude, non sourcée dans le paquet. Recommandation : retirer ou faire valider.

*Paragraphe 5*  ⚠ passage sensible

- Anglais : Persons who score high on the Conscientiousness scale are, in fact, perceived by others as intelligent. The benefits of high conscientiousness are obvious. Conscientious individuals avoid trouble and achieve high levels of success through purposeful planning and persistence. They are also positively regarded by others as intelligent and reliable. On the negative side, they can be compulsive perfectionists and workaholics. Furthermore, extremely conscientious individuals might be regarded as stuffy and boring.
- Français du paquet : Les individus ayant un score haut passent auprès des autres pour être intelligents et fiables. Les bénéfices sont indéniables. Ils évitent les soucis et réussissent à travers leur détermination et leur planification. Un des côtés négatifs, est qu'ils peuvent être compulsifs, perfectionnistes ou addictes au travail. A l'extrême ils peuvent passer pour étouffants ou ennuyeux.
- **Arabe proposé** : ويُنظر إلى أصحاب النتائج المرتفعة في هذه السمة، في الواقع، على أنهم أذكياء. وفوائد يقظة الضمير المرتفعة واضحة: فهم يتجنبون المتاعب ويحققون مستويات عالية من النجاح بفضل التخطيط الهادف والمثابرة، ويُنظر إليهم إيجابًا على أنهم أذكياء وجديرون بالثقة. وفي المقابل، قد يميلون إلى الكمالية المفرطة وإلى الإفراط في العمل، وقد يبدو أشدّهم يقظةً في الضمير في نظر الآخرين متزمّتًا ومملًّا.
- Note : Termes cliniques de l'anglais (« compulsive », « workaholics ») adoucis en « كمالية مفرطة » et « إفراط في العمل ». Affirmations d'aptitude et de réussite non sourcées : à faire valider.

*Paragraphe 6*  ⚠ passage sensible

- Anglais : Unconscientious people may be criticized for their unreliability, lack of ambition, and failure to stay within the lines, but they will experience many short-lived pleasures and they will never be called stuffy.
- Français du paquet : Les individus présentant un score bas peuvent être critiqués pour leur faillibilité, leur manque d'ambition et leurs échecs à rester dans les clous, mais ils expérimenteront le plaisir du court-terme et ne seront jamais perçus comme étouffants.
- **Arabe proposé** : أما أصحاب النتائج المنخفضة في هذه السمة فقد يُنتقدون لقلة الاعتماد عليهم وقلة الطموح وعدم التقيّد بالحدود المرسومة، لكنهم يعيشون كثيرًا من المتع العابرة، ولا يوصفون أبدًا بالتزمّت.
- Note : Passage de jugement (« unreliability, lack of ambition »). Contraire à voix-de-marque § 2.7. Recommandation : retirer ou atténuer.

Bloc à coller (`description`) :

```text
الدوافع ليست سيئة في ذاتها؛ فقد يفرض ضيق الوقت أحيانًا قرارًا سريعًا، وقد يكون التصرف وفق أول دافع ردًّا فعّالًا. وفي أوقات اللعب والترفيه، لا في أوقات العمل، قد يكون التصرف بعفوية واندفاع ممتعًا. وقد يرى الآخرون في الأشخاص الاندفاعيين حيوية وطرافة وخفّة ظل. <br /><br /> ومع ذلك، قد يوقع التصرف بدافع اللحظة في مشكلات من وجوه عدة. فبعض الدوافع مضادّ للمجتمع، والأفعال المضادّة للمجتمع التي لا يضبطها صاحبها لا تضرّ بغيره فحسب، بل قد تعرّضه هو أيضًا للعقاب. ومن مشكلات الأفعال الاندفاعية كذلك أنها كثيرًا ما تحقق مكاسب فورية لكن عواقبها بعيدة المدى غير مرغوبة. ومن الأمثلة الإفراط في الاختلاط الاجتماعي حتى يُفصل المرء من عمله، أو إطلاق إهانة تُنهي علاقة مهمة، أو تعاطي مخدرات تمنح لذة آنية ثم تُتلف الصحة في النهاية. <br /><br /> والسلوك الاندفاعي، حتى حين لا يكون مدمّرًا، يقلّل فاعلية الشخص تقليلًا ملحوظًا. فالتصرف بدافع اللحظة لا يترك مجالًا للتفكير في مسارات بديلة قد يكون بعضها أحكم من الخيار الاندفاعي. كما يصرف الاندفاع الناس عن المشاريع التي تتطلب خطوات أو مراحل متسلسلة، فتأتي إنجازات الشخص الاندفاعي صغيرة ومتفرقة وغير منتظمة. <br /><br /> ومن علامات الذكاء، وربما مما يميّز الإنسان عن صور الحياة الأقدم، القدرة على التفكير في العواقب المستقبلية قبل الانسياق وراء دافع ما. فالنشاط الذكي يقتضي التأمل في الأهداف بعيدة المدى، وتنظيم الطرق المؤدية إليها والتخطيط لها، والمثابرة على بلوغها رغم دوافع عابرة تدفع في الاتجاه المعاكس. وهذه الفكرة، أي أن الذكاء ينطوي على ضبط الدوافع، يلخّصها لفظ «الحصافة»، وهو اسم بديل لهذا البعد؛ فالحصيف هو الحكيم الحذر معًا. <br /><br /> ويُنظر إلى أصحاب النتائج المرتفعة في هذه السمة، في الواقع، على أنهم أذكياء. وفوائد يقظة الضمير المرتفعة واضحة: فهم يتجنبون المتاعب ويحققون مستويات عالية من النجاح بفضل التخطيط الهادف والمثابرة، ويُنظر إليهم إيجابًا على أنهم أذكياء وجديرون بالثقة. وفي المقابل، قد يميلون إلى الكمالية المفرطة وإلى الإفراط في العمل، وقد يبدو أشدّهم يقظةً في الضمير في نظر الآخرين متزمّتًا ومملًّا. <br /><br /> أما أصحاب النتائج المنخفضة في هذه السمة فقد يُنتقدون لقلة الاعتماد عليهم وقلة الطموح وعدم التقيّد بالحدود المرسومة، لكنهم يعيشون كثيرًا من المتع العابرة، ولا يوصفون أبدًا بالتزمّت.
```

**(b) Textes de niveau**

*Niveau bas (`results[0]`)*

- Anglais : Your score on Conscientiousness is low, indicating you like to live for the moment and do what feels good now. Your work tends to be careless and disorganized.
- Français du paquet : Votre score bas indique que vous aimez vivre le moment présent et faire ce qui vous rend heureux sur le moment. Votre travail tend à être négligé et désorganisé.
- **Arabe proposé** : نتيجتك في يقظة الضمير منخفضة، وهذا يدل على ميل إلى عيش اللحظة الراهنة وفعل ما يمنح الارتياح الآن. وقد يغلب على عملك قدر من العفوية وقلة التنظيم.
- Note : Atténué volontairement : l'anglais dit « careless and disorganized » (négligé et désorganisé), jugement de valeur.

*Niveau moyen (`results[1]`, clé `neutral`)*

- Anglais : Your score on Conscientiousness is average. This means you are reasonably reliable, organized, and self-controlled.
- Français du paquet : Votre score dans la moyenne indique que vous êtes plutôt fiable, organisé et que vous savez vous contrôler.
- **Arabe proposé** : نتيجتك في يقظة الضمير في المنتصف، وهذا يدل على قدر معقول من الموثوقية والتنظيم وضبط النفس.

*Niveau élevé (`results[2]`)*

- Anglais : Your score on Conscientiousness is high. This means you set clear goals and pursue them with determination. People regard you as reliable and hard-working.
- Français du paquet : Votre score haut indique que vous vous fixez des buts précis et les atteignez avec détermination. Les autres vous voient comme un travailleur acharné.
- **Arabe proposé** : نتيجتك في يقظة الضمير مرتفعة، وهذا يدل على ميل إلى وضع أهداف واضحة والسعي إلى بلوغها بعزيمة. وقد يرى فيك المحيطون بك موثوقية وجدًّا في العمل.


#### Domaine E : Extraversion / Extraversion / الانبساطية

- Fichier : `web/node_modules/@bigfive-org/results/lib/data/ar/extraversion.js`
- Clés à remplacer : `description`, `results[0].text`, `results[1].text`, `results[2].text`

**(a) Description, 3 paragraphes** (`description`)

*Paragraphe 1*

- Anglais : Extraverts enjoy being with people, are full of energy, and often experience positive emotions. They tend to be enthusiastic, action-oriented, individuals who are likely to say "Yes!" or "Let's go!" to opportunities for excitement. In groups they like to talk, assert themselves, and draw attention to themselves.
- Français du paquet : Les extravertis s'épanouissent en groupe, sont énergiques et sont enclins à ressentir des émotions positives. Ils sont enthousiastes, orientés vers l'action. Ils préférent dire "Oui" ou "C'est parti !" aux opportunités excitantes. En groupe ils apprécient de discuter, s'affirmer et attirer l'attention sur eux.
- **Arabe proposé** : يستمتع الانبساطيون بصحبة الناس، ويفيضون بالطاقة، وكثيرًا ما يعيشون مشاعر إيجابية. ويميلون إلى الحماس والنشاط والإقدام، فيجيبون في الغالب بـ«نعم» أو «هيّا بنا» حين تُعرض عليهم فرص للإثارة. وفي الجماعات يحبون الحديث وإثبات الذات ولفت الانتباه.
- Note : Points d'exclamation de l'anglais retirés (voix-de-marque § 2.5).

*Paragraphe 2*

- Anglais : Introverts lack the exuberance, energy, and activity levels of extraverts. They tend to be quiet, low-key, deliberate, and disengaged from the social world. Their lack of social involvement should not be interpreted as shyness or depression; the introvert simply needs less stimulation than an extravert and prefers to be alone.
- Français du paquet : Les introvertis n'apprécient pas l'exubérance, l'énergie et le niveau d'activité des extravertis. Ils aspirent au calme, la discrétion et le désengagement du monde social. Ils fuient l'implication sociale qui ne doit pas être interprétée comme de la timidité ou de la dépression. Ils ont juste besoin de moins de stimulations que les extravertis et préfèrent la solitude.
- **Arabe proposé** : أما الانطوائيون فلا يتّسمون بفيض الانبساطيين من حماس وطاقة ونشاط؛ وهم يميلون إلى الهدوء والرصانة والتأنّي، وإلى الابتعاد عن الحياة الاجتماعية. ولا ينبغي تفسير قلة انخراطهم الاجتماعي على أنه خجل أو اكتئاب؛ فالانطوائي يحتاج ببساطة إلى تحفيز أقل مما يحتاجه الانبساطي، ويفضّل الخلوة.

*Paragraphe 3*

- Anglais : The independence and reserve of the introvert is sometimes mistaken as unfriendliness or arrogance. In reality, an introvert who scores high on the agreeableness dimension will not seek others out but will be quite pleasant when approached.
- Français du paquet : L'indépendance et la réserve des introvertis sont parfois interprétées à tort comme de la froideur ou de l'arrogance. En réalité, un introverti qui a un score haut en Convialité ne recherchera pas la compagnie des autres mais prendra plaisir à les rencontrer.
- **Arabe proposé** : وكثيرًا ما يُظنّ خطأً أن استقلال الانطوائي وتحفظه جفاء أو تكبّر. والواقع أن الانطوائي الذي تقع نتيجته في المقبولية في الجزء الأعلى من المقياس لا يسعى إلى الآخرين، لكنه يكون لطيفًا جدًا إذا اقتربوا منه.
- Note : Le français du paquet nomme ici « Convialité » (faute et mauvais terme) ; l'arabe suit le lexique « المقبولية ».

Bloc à coller (`description`) :

```text
يستمتع الانبساطيون بصحبة الناس، ويفيضون بالطاقة، وكثيرًا ما يعيشون مشاعر إيجابية. ويميلون إلى الحماس والنشاط والإقدام، فيجيبون في الغالب بـ«نعم» أو «هيّا بنا» حين تُعرض عليهم فرص للإثارة. وفي الجماعات يحبون الحديث وإثبات الذات ولفت الانتباه. <br /><br /> أما الانطوائيون فلا يتّسمون بفيض الانبساطيين من حماس وطاقة ونشاط؛ وهم يميلون إلى الهدوء والرصانة والتأنّي، وإلى الابتعاد عن الحياة الاجتماعية. ولا ينبغي تفسير قلة انخراطهم الاجتماعي على أنه خجل أو اكتئاب؛ فالانطوائي يحتاج ببساطة إلى تحفيز أقل مما يحتاجه الانبساطي، ويفضّل الخلوة. <br /><br /> وكثيرًا ما يُظنّ خطأً أن استقلال الانطوائي وتحفظه جفاء أو تكبّر. والواقع أن الانطوائي الذي تقع نتيجته في المقبولية في الجزء الأعلى من المقياس لا يسعى إلى الآخرين، لكنه يكون لطيفًا جدًا إذا اقتربوا منه.
```

**(b) Textes de niveau**

*Niveau bas (`results[0]`)*

- Anglais : Your score on Extraversion is low, indicating you are introverted, reserved, and quiet. You enjoy solitude and solitary activities. Your socialization tends to be restricted to a few close friends.
- Français du paquet : Votre score bas, cela indique que vous êtes introverti, reservé et silencieux. Vous appréciez la solitude et les activités individuelles. Votre cercle d'amis est assez restreint.
- **Arabe proposé** : نتيجتك في الانبساطية منخفضة، وهذا يدل على ميل إلى الانطواء والتحفظ والهدوء، وإلى الاستمتاع بالخلوة وبالأنشطة الفردية. وتقتصر علاقاتك الاجتماعية عادةً على عدد قليل من الأصدقاء المقرّبين.

*Niveau moyen (`results[1]`, clé `neutral`)*

- Anglais : Your score on Extraversion is average, indicating you are neither a subdued loner nor a jovial chatterbox. You enjoy time with others but also time alone.
- Français du paquet : Votre score dans la moyenne, cela indique que vous n'êtes ni une personne solitaire, ni joviale. Vous appréciez le temps passé avec les autres mais également la solitude de certains moments.
- **Arabe proposé** : نتيجتك في الانبساطية في المنتصف، وهذا يدل على ميل متوازن، فلا انعزال تامّ ولا إكثار من الكلام والمرح الصاخب. ويروق لك قضاء الوقت مع الآخرين كما يروق لك قضاء بعضه وحدك.

*Niveau élevé (`results[2]`)*

- Anglais : Your score on Extraversion is high, indicating you are sociable, outgoing, energetic, and lively. You prefer to be around people much of the time.
- Français du paquet : Votre score haut, cela indique que vous êtes sociable, ouvert et plein de vie. Vous préférez passer votre temps avec les autres plutôt que seul.
- **Arabe proposé** : نتيجتك في الانبساطية مرتفعة، وهذا يدل على ميل إلى الاجتماعية والانفتاح على الناس والنشاط والحيوية. ويطيب لك قضاء معظم وقتك بين الناس.


#### Domaine A : Agreeableness / Agréabilité / المقبولية

- Fichier : `web/node_modules/@bigfive-org/results/lib/data/ar/agreeableness.js`
- Clés à remplacer : `description`, `results[0].text`, `results[1].text`, `results[2].text`

**(a) Description, 3 paragraphes** (`description`)

*Paragraphe 1*

- Anglais : They are therefore considerate, friendly, generous, helpful, and willing to compromise their interests with others'. Agreeable people also have an optimistic view of human nature. They believe people are basically honest, decent, and trustworthy.
- Français du paquet : Les personnes conviviales se considérent comme amicales, généreuses, serviables et sont plus enclines aux compromis, ils ont également une vision optimiste du genre humain. Ils croient en l'honnêteté, la décence et la confiance envers les autres.
- **Arabe proposé** : ولذلك يتّسمون بمراعاة الآخرين والود والكرم والاستعداد للمساعدة، ويقبلون التوفيق بين مصالحهم ومصالح غيرهم. كما أن لديهم نظرة متفائلة إلى الطبيعة البشرية، إذ يعتقدون أن الناس صادقون في الأصل، ومستقيمون، وجديرون بالثقة.

*Paragraphe 2*  ⚠ passage sensible

- Anglais : Disagreeable individuals place self-interest above getting along with others. They are generally unconcerned with others' well-being, and therefore are unlikely to extend themselves for other people. Sometimes their skepticism about others' motives causes them to be suspicious, unfriendly, and uncooperative.
- Français du paquet : Les moins conviviaux placent leurs intérêts au-dessus de ceux d'autrui. Ils se sentent moins concernés par le bien-être des autres et donc ne les aident pas. Ils sont souvent sceptiques sur les motivations des autres, voire suspicieux, froids et peu coopératifs.
- **Arabe proposé** : أما الأشخاص ذوو المقبولية المنخفضة فيقدّمون مصلحتهم الشخصية على التفاهم مع الآخرين. وهم لا ينشغلون عادةً بما فيه خير غيرهم، ولذلك لا يميلون إلى بذل الجهد من أجل الآخرين. وقد يدفعهم تشككهم في دوافع الناس أحيانًا إلى الريبة والجفاء وقلة التعاون.
- Note : Description sévère de la tendance basse (« disagreeable »). Rendu par « ذوو المقبولية المنخفضة » pour éviter l'étiquette. À valider.

*Paragraphe 3*  ⚠ passage sensible

- Anglais : Agreeableness is obviously advantageous for attaining and maintaining popularity. Agreeable people are better liked than disagreeable people. On the other hand, agreeableness is not useful in situations that require tough or absolute objective decisions. Disagreeable people can make excellent scientists, critics, or soldiers.
- Français du paquet : Etre convivial est évidemment un avantage, pour atteindre et maintenir une popularité. Les individus conviviaux sont plus appréciés. D'un autre coté, c'est un désavantage dans des situations nécessitant une certaine objectivité. Les individus avec un score bas font d'excellents scientifiques, critiques ou soldats.
- **Arabe proposé** : وللمقبولية فائدة واضحة في اكتساب الحظوة لدى الناس والمحافظة عليها؛ فالأشخاص ذوو المقبولية المرتفعة يحظون عادةً بمحبة أكبر من غيرهم. وفي المقابل، لا تفيد المقبولية في المواقف التي تتطلب قرارات موضوعية صارمة أو قاطعة، وقد يبرع ذوو المقبولية المنخفضة في العمل العلمي والنقد والخدمة العسكرية.
- Note : Comparaison entre personnes et affirmation d'aptitude professionnelle (« excellent scientists, critics, or soldiers »), non sourcées. Recommandation : retirer ce paragraphe ou la dernière phrase.

Bloc à coller (`description`) :

```text
ولذلك يتّسمون بمراعاة الآخرين والود والكرم والاستعداد للمساعدة، ويقبلون التوفيق بين مصالحهم ومصالح غيرهم. كما أن لديهم نظرة متفائلة إلى الطبيعة البشرية، إذ يعتقدون أن الناس صادقون في الأصل، ومستقيمون، وجديرون بالثقة. <br /><br /> أما الأشخاص ذوو المقبولية المنخفضة فيقدّمون مصلحتهم الشخصية على التفاهم مع الآخرين. وهم لا ينشغلون عادةً بما فيه خير غيرهم، ولذلك لا يميلون إلى بذل الجهد من أجل الآخرين. وقد يدفعهم تشككهم في دوافع الناس أحيانًا إلى الريبة والجفاء وقلة التعاون. <br /><br /> وللمقبولية فائدة واضحة في اكتساب الحظوة لدى الناس والمحافظة عليها؛ فالأشخاص ذوو المقبولية المرتفعة يحظون عادةً بمحبة أكبر من غيرهم. وفي المقابل، لا تفيد المقبولية في المواقف التي تتطلب قرارات موضوعية صارمة أو قاطعة، وقد يبرع ذوو المقبولية المنخفضة في العمل العلمي والنقد والخدمة العسكرية.
```

**(b) Textes de niveau**

*Niveau bas (`results[0]`)*

- Anglais : Your score on Agreeableness is low, indicating less concern with others' needs than with your own. People see you as tough, critical, and uncompromising.
- Français du paquet : Votre score est bas, cela indique que vous vous sentez moins concerné par les autres que par vous même. Votre entourage dit de vous que vous êtes dur, critique et n'êtes pas enclin au compromis.
- **Arabe proposé** : نتيجتك في المقبولية منخفضة، وهذا يدل على اهتمام بحاجات الآخرين أقل من اهتمامك بحاجاتك. وقد يرى فيك المحيطون بك صلابة وحسًّا نقديًّا وقلة استعداد للتنازل.

*Niveau moyen (`results[1]`, clé `neutral`)*

- Anglais : Your level of Agreeableness is average, indicating some concern with others' Needs, but, generally, unwillingness to sacrifice yourself for others.
- Français du paquet : Votre score est dans la moyenne, cela indique que vous vous sentez concerné par les autres mais que vous avez des reticences à vous sacrifiez pour eux.
- **Arabe proposé** : نتيجتك في المقبولية في المنتصف، وهذا يدل على اهتمام معقول بحاجات الآخرين، مع قلة ميل عامة إلى التضحية بمصالحك من أجلهم.

*Niveau élevé (`results[2]`)*

- Anglais : Your high level of Agreeableness indicates a strong interest in others' needs and well-being. You are pleasant, sympathetic, and cooperative.
- Français du paquet : Votre score haut, cela indique que vous portez un grand intérêt au autres et leur bien être. Votre entourage dit de vous que vous êtes quelqu'un d'agréable, sympathique et coopératif.
- **Arabe proposé** : نتيجتك في المقبولية مرتفعة، وهذا يدل على اهتمام كبير بحاجات الآخرين وبخيرهم. ويغلب عليك اللطف والتعاطف والتعاون.


#### Domaine N : Neuroticism / Névrosisme / العُصابية

- Fichier : `web/node_modules/@bigfive-org/results/lib/data/ar/neuroticism.js`
- Clés à remplacer : `description`, `results[0].text`, `results[1].text`, `results[2].text`

**(a) Description, 4 paragraphes** (`description`)

*Paragraphe 1*  ⚠ passage sensible

- Anglais : Freud originally used the term neurosis to describe a condition marked by mental distress, emotional suffering, and an inability to cope effectively with the normal demands of life. He suggested that everyone shows some signs of neurosis, but that we differ in our degree of suffering and our specific symptoms of distress. Today neuroticism refers to the tendency to experience negative feelings.
- Français du paquet : Freud utilisait originellement le terme "névrose" pour décrire une situation mentalement bouleversante, émotionnellement blessante et une incapacité à surmonter les situations normales de la vie. Il a suggéré que chacun montre des signes de névrose, mais que nous en souffrons à différents degrés et de façons différentes. Aujourd'hui le névrosisme se référe à la gestion des situations émotionnellement négatives.
- **Arabe proposé** : استعمل فرويد مصطلح «العُصاب» في الأصل لوصف حالة تتّسم بالضيق النفسي والمعاناة الوجدانية وعدم القدرة على مواجهة متطلبات الحياة العادية بفاعلية. ورأى أن الجميع تظهر عليهم بعض علامات العُصاب، وأننا نختلف في درجة المعاناة وفي مظاهر الضيق الخاصة بكل منا. أما اليوم فتشير العُصابية، بوصفها سمة من سمات الشخصية، إلى الميل إلى اختبار المشاعر السلبية، ولا تعني وجود اضطراب أو مرض.
- Note : Récit historique (Freud) non vérifié indépendamment. La fin « ولا تعني وجود اضطراب أو مرض » est un ajout (voix-de-marque § 2.8). À valider.

*Paragraphe 2*

- Anglais : Those who score high on Neuroticism may experience primarily one specific negative feeling such as anxiety, anger, or depression, but are likely to experience several of these emotions.
- Français du paquet : Ceux ayant un score haut éprouvent principalement un sentiment spécifique négatif comme l'anxiété, la colère ou la dépression, mais probalement plusieurs de ces derniers.
- **Arabe proposé** : وقد يعيش أصحاب النتائج المرتفعة في العُصابية شعورًا سلبيًّا واحدًا بعينه في المقام الأول، كالقلق أو الغضب أو المزاج الاكتئابي، لكنهم يعيشون في الغالب عدة مشاعر منها.
- Note : « Depression » rendu par « المزاج الاكتئابي », libellé de la facette N3 du site.

*Paragraphe 3*  ⚠ passage sensible

- Anglais : People high in neuroticism are emotionally reactive. They respond emotionally to events that would not affect most people, and their reactions tend to be more intense than normal. They are more likely to interpret ordinary situations as threatening, and minor frustrations as hopelessly difficult.
- Français du paquet : Les individus au score haut sont émotionnellement réactifs. Ils répondent émotionnellement aux événements qui normalement n'affecteraient pas les autres, et ils réagissent plus intensément que la normale. Ils interprètent les situations normales comme menaçantes, et minorent les frustrations comme le désespoir.
- **Arabe proposé** : ويتميّز المرتفعون في العُصابية بسرعة التفاعل الانفعالي: فهم يستجيبون وجدانيًّا لأحداث قد لا تؤثر في أغلب الناس، وتميل ردود أفعالهم إلى أن تكون أشدّ. وهم أكثر ميلًا إلى تفسير المواقف العادية على أنها مهدِّدة، وإلى رؤية الإحباطات الصغيرة صعبة إلى حدّ اليأس.
- Note : Compare à « la plupart des gens » sans norme de population dans le calcul (voix-de-marque § 2.7). À atténuer ou retirer.

*Paragraphe 4*  ⚠ passage sensible

- Anglais : Their negative emotional reactions tend to persist for unusually long periods of time, which means they are often in a bad mood. These problems in emotional regulation can diminish a neurotic's ability to think clearly, make decisions, and cope effectively with stress.
- Français du paquet : Leurs réactions émotionnelles négatives ont tendance à persister exceptionnellement sur de longues périodes, ce qui signifie qu'ils se sentent mal. Ces problèmes dans le régulations des émotions peuvent être diminués par une capacité à penser clairement, à prendre des décisions et à surmonter efficacement le stress
- **Arabe proposé** : وتميل ردود أفعالهم الانفعالية السلبية إلى الاستمرار مدة أطول من المعتاد، وهو ما يعني أن مزاجهم يكون سيئًا في كثير من الأحيان. وقد يؤثر هذا الاستمرار في صفاء التفكير وفي اتخاذ القرارات وفي مواجهة الضغوط بفاعلية.
- Note : L'anglais parle de « problems in emotional regulation » et de « a neurotic's ability » : vocabulaire clinique, supprimé ici. Reste un paragraphe fortement négatif : recommandation de le retirer ou de le faire valider par un psychologue.

Bloc à coller (`description`) :

```text
استعمل فرويد مصطلح «العُصاب» في الأصل لوصف حالة تتّسم بالضيق النفسي والمعاناة الوجدانية وعدم القدرة على مواجهة متطلبات الحياة العادية بفاعلية. ورأى أن الجميع تظهر عليهم بعض علامات العُصاب، وأننا نختلف في درجة المعاناة وفي مظاهر الضيق الخاصة بكل منا. أما اليوم فتشير العُصابية، بوصفها سمة من سمات الشخصية، إلى الميل إلى اختبار المشاعر السلبية، ولا تعني وجود اضطراب أو مرض. <br /><br /> وقد يعيش أصحاب النتائج المرتفعة في العُصابية شعورًا سلبيًّا واحدًا بعينه في المقام الأول، كالقلق أو الغضب أو المزاج الاكتئابي، لكنهم يعيشون في الغالب عدة مشاعر منها. <br /><br /> ويتميّز المرتفعون في العُصابية بسرعة التفاعل الانفعالي: فهم يستجيبون وجدانيًّا لأحداث قد لا تؤثر في أغلب الناس، وتميل ردود أفعالهم إلى أن تكون أشدّ. وهم أكثر ميلًا إلى تفسير المواقف العادية على أنها مهدِّدة، وإلى رؤية الإحباطات الصغيرة صعبة إلى حدّ اليأس. <br /><br /> وتميل ردود أفعالهم الانفعالية السلبية إلى الاستمرار مدة أطول من المعتاد، وهو ما يعني أن مزاجهم يكون سيئًا في كثير من الأحيان. وقد يؤثر هذا الاستمرار في صفاء التفكير وفي اتخاذ القرارات وفي مواجهة الضغوط بفاعلية.
```

**(b) Textes de niveau**

*Niveau bas (`results[0]`)*

- Anglais : Your score on Neuroticism is low, indicating that you are exceptionally calm, composed and unflappable. You do not react with intense emotions, even to situations that most people would describe as stressful.
- Français du paquet : Votre score bas indique que vous êtes exceptionnellement calme et imperturbable. Vous ne réagissez pas intensément à vos émotions, même dans des situations stressantes.
- **Arabe proposé** : نتيجتك في العُصابية منخفضة، وهذا يدل على ميل إلى الهدوء والاتزان وعدم الانفعال بسهولة. وتميل ردود فعلك الانفعالية إلى الاعتدال حتى في مواقف يعدّها كثيرون مجهدة.
- Note : « exceptionally » (exceptionnellement) supprimé : superlatif sans norme.

*Niveau moyen (`results[1]`, clé `neutral`)*

- Anglais : Your score on Neuroticism is average, indicating that your level of emotional reactivity is typical of the general population. Stressful and frustrating situations are somewhat upsetting to you, but you are generally able to get over these feelings and cope with these situations.
- Français du paquet : Votre score dans la moyenne indique que vous réagissez à vos émotions comme la plupart des gens. Les situations stressantes et frustrantes vous agacent, mais généralement vous contrôlez vos sentiments pour faire face à ces situations.
- **Arabe proposé** : نتيجتك في العُصابية في المنتصف، وهذا يدل على ردود فعل انفعالية متوسطة الشدة. فالمواقف المجهدة والمحبطة تزعجك إلى حدّ ما، لكن بوسعك عادةً تجاوز هذه المشاعر والتعامل مع تلك المواقف.
- Note : « typical of the general population » supprimé : le calcul n'a aucune norme de population (« milieu » = moyenne exactement égale à 3 sur 5).

*Niveau élevé (`results[2]`)*

- Anglais : Your score on Neuroticism is high, indicating that you are easily upset, even by what most people consider the normal demands of living. People consider you to be sensitive and emotional.
- Français du paquet : Votre score haut indique que vous vous agacez facilement, même dans des situations considérées comme normales. Les autres vous considèrent comme sensible et émotionnellement réceptif.
- **Arabe proposé** : نتيجتك في العُصابية مرتفعة، وهذا يدل على ميل إلى الانزعاج بسهولة، حتى من مطالب الحياة اليومية العادية. وقد يرى فيك المحيطون بك حساسية وعاطفية.


Total de la rubrique 1.3 : 5 descriptions et 15 textes de niveau, soit **20 textes**.

### 1.4 Textes courts affichés sous chaque domaine, en arabe (`shortDescription`, 5 textes en plus)

- **O (الانفتاح على الخبرة)**
  - Anglais : Openness to Experience describes a dimension of cognitive style that distinguishes imaginative, creative people from down-to-earth, conventional people.
  - Arabe actuel du paquet : الانفتاح أو الانفتاح على التجارب هو السمة التي تميّز أصحاب الخيال والإبداع عن غير الخياليين والتقليديين.
  - **Arabe proposé** : يصف الانفتاح على الخبرة بُعدًا في الأسلوب المعرفي، يتدرّج من الواقعية والميل إلى المألوف إلى الخيال والإبداع.
  - Note : Reformulé en continuum (l'anglais oppose deux catégories de personnes).
- **C (يقظة الضمير)**
  - Anglais : Conscientiousness concerns the way in which we control, regulate, and direct our impulses.
  - Arabe actuel du paquet : سمة اليقظة/التفاني تقيس تحكمنا وضبطنا وتوجيهنا لدوافعنا.
  - **Arabe proposé** : تتعلق يقظة الضمير بالطريقة التي نضبط بها دوافعنا وننظّمها ونوجّهها.
- **E (الانبساطية)**
  - Anglais : Extraversion is marked by pronounced engagement with the external world.
  - Arabe actuel du paquet : سمة الانبساطية تصف التفاعل البائن مع العالم الخارجي.
  - **Arabe proposé** : تتميّز الانبساطية بانخراط واضح في العالم الخارجي.
- **A (المقبولية)**
  - Anglais : Agreeableness reflects individual differences in concern with cooperation and social harmony. Agreeable individuals value getting along with others.
  - Arabe actuel du paquet : درجات المسايرة المختلفة تبيّن اختلاف الأفراد من نواحي التعاون والوئام الاجتماعي. الأفراد المسايرون يهمهم أن يكونوا علو وفاق مع الآخرين.
  - **Arabe proposé** : تعكس المقبولية الفروق بين الأفراد في الاهتمام بالتعاون والانسجام الاجتماعي. ويعطي الأشخاص ذوو المقبولية المرتفعة قيمة للتفاهم مع الآخرين.
  - Note : Corrige « المسايرة » (terme du paquet) et la coquille « علو وفاق ». La description qui suit commence par « ولذلك » : elle prolonge cette phrase, comme en anglais.
- **N (العُصابية)**
  - Anglais : Neuroticism refers to the tendency to experience negative feelings.
  - Arabe actuel du paquet : العُصابية تقيس قابلية الفرد لخوض المشاعر السلبية.
  - **Arabe proposé** : تشير العُصابية إلى الميل إلى اختبار المشاعر السلبية. وهي وصف لنزعة عامة وليست تشخيصًا.
  - Note : Deuxième phrase ajoutée (glose prévue par voix-de-marque § 4.2). Absente de l'anglais : à valider.

### 1.5 Textes courts affichés sous chaque domaine, en français (`shortDescription`, 5 textes en plus)

- **O (Ouverture à l'expérience)**
  - Anglais : Openness to Experience describes a dimension of cognitive style that distinguishes imaginative, creative people from down-to-earth, conventional people.
  - Français actuel du paquet : L'ouverture d'esprit représente les capacités d'imagination, de créativité et de curiosité de la personnalité.
  - **Français proposé** : L'ouverture à l'expérience décrit une dimension du style cognitif, qui va du goût du concret et du familier à l'imagination et à la créativité.
- **C (Conscienciosité)**
  - Anglais : Conscientiousness concerns the way in which we control, regulate, and direct our impulses.
  - Français actuel du paquet : La conscience concerne la façon dont on controle, régule, ou dirige nos impulsions.
  - **Français proposé** : La conscienciosité concerne la façon dont nous contrôlons, régulons et orientons nos impulsions.
- **E (Extraversion)**
  - Anglais : Extraversion is marked by pronounced engagement with the external world.
  - Français actuel du paquet : L'extraversion est marquée par un engagement prononcé pour le monde extérieur.
  - **Français proposé** : L'extraversion se caractérise par un engagement marqué envers le monde extérieur.
- **A (Agréabilité)**
  - Anglais : Agreeableness reflects individual differences in concern with cooperation and social harmony. Agreeable individuals value getting along with others.
  - Français actuel du paquet : La convivialité évalue l'esprit d'équipe, les interactions sociales et la capacité à bien s'entendre avec les autres
  - **Français proposé** : L'agréabilité reflète les différences entre les personnes dans l'attention portée à la coopération et à l'harmonie sociale. Les personnes très agréables accordent de la valeur au fait de bien s'entendre avec les autres.
  - Note : La description française du paquet commence par « Les personnes conviviales » : si cette phrase change, adapter aussi le premier paragraphe.
- **N (Névrosisme)**
  - Anglais : Neuroticism refers to the tendency to experience negative feelings.
  - Français actuel du paquet : Névrosisme réfère à une tendance à vivre des émotions négatives
  - **Français proposé** : Le névrosisme désigne la tendance à éprouver des émotions négatives. Il décrit une tendance habituelle, non un diagnostic.
  - Note : Seconde phrase ajoutée (glose de voix-de-marque § 4.2) : à valider.

### 1.6 Passages sensibles : récapitulatif pour décision

| Domaine | Paragraphe | Nature | Recommandation |
|---|---|---|---|
| O | 5 | Affirmation sur la performance au travail, sans source dans le paquet | à décider (retirer ou atténuer, dans les 3 langues) |
| C | 2 | Ton alarmiste (actes antisociaux, drogues) dans un texte lu par des candidats | à décider (retirer ou atténuer, dans les 3 langues) |
| C | 3 | Jugement sur la valeur des réalisations d'une personne | à décider (retirer ou atténuer, dans les 3 langues) |
| C | 4 | Lie la conscienciosité à l'intelligence : affirmation d'aptitude, non sourcée dans le paquet | à décider (retirer ou atténuer, dans les 3 langues) |
| C | 5 | Termes cliniques de l'anglais (« compulsive », « workaholics ») adoucis en « كمالية مفرطة » et « إفراط في العمل » | à décider (retirer ou atténuer, dans les 3 langues) |
| C | 6 | Passage de jugement (« unreliability, lack of ambition ») | à décider (retirer ou atténuer, dans les 3 langues) |
| A | 2 | Description sévère de la tendance basse (« disagreeable ») | à décider (retirer ou atténuer, dans les 3 langues) |
| A | 3 | Comparaison entre personnes et affirmation d'aptitude professionnelle (« excellent scientists, critics, or soldiers »), non sourcées | à décider (retirer ou atténuer, dans les 3 langues) |
| N | 1 | Récit historique (Freud) non vérifié indépendamment | à décider (retirer ou atténuer, dans les 3 langues) |
| N | 3 | Compare à « la plupart des gens » sans norme de population dans le calcul (voix-de-marque § 2.7) | à décider (retirer ou atténuer, dans les 3 langues) |
| N | 4 | L'anglais parle de « problems in emotional regulation » et de « a neurotic's ability » : vocabulaire clinique, supprimé ici | à décider (retirer ou atténuer, dans les 3 langues) |

---

## 2. Page de confidentialité `/privacy`

> **Texte juridique : à valider par le client et à relire par un juriste (RGPD et loi marocaine 09-08).** Les passages entre crochets `[…]` sont des informations que le code ne contient pas et que seul le client peut fournir.

### 2.1 Texte actuel (anglais pour toutes les langues)

Fichier : `web/src/app/[locale]/privacy/page.tsx`, texte en dur, identique en `/`, `/fr/privacy` et `/ar/privacy`. Version du répertoire de travail (modifiée, non commitée) :

```text
Privacy / Our privacy policy
This privacy policy will explain how we use the personal data we collect from you when you use our website.
What data do we collect?
When you submit the test we collect the following data
  - Choosen test language
  - Test answers
  - Time spent on the test
  - Datetime of submitted test
We do not use analytics services, advertising or tracking cookies.
How do we collect your data?
Your web browser automatically sends information to our server when you load a page. This can i.e. be information about which browser and version you are using and your Internet address (IP-address). Your IP-address is kept temporarily in the memory of the server to limit the number of submissions, and is not stored in our database.
When you submit the test the information you provide (described above) is stored in our database.
How will we use your data?
We will create statistical, aggregated data from the test results for analytical purposes.
How to contact us?
If you have any questions about this privacy policy, please contact us. (lien mailto si NEXT_PUBLIC_SUPPORT_EMAIL est défini, sinon : « please contact the operator of this website »)
```

La version commitée (`HEAD`) et celle encore en ligne contiennent en plus, entre la liste et la phrase sur les cookies : « If you ask us to e-mail you the link to a result, the address you enter is only used to send that message through our e-mail provider, Resend, and is not stored in our database. » Ce paragraphe a été retiré du répertoire de travail parce que la fonction d'envoi du lien par e-mail a été supprimée (`sendEmail` n'existe plus dans `actions/index.ts`). Il ne figure donc **pas** dans les propositions.

### 2.2 Ce que le code fait réellement (preuves)

| Sujet | Constat | Où |
|---|---|---|
| Données du questionnaire | Enregistrées dans MongoDB : `testId`, `lang`, `invalid`, 120 réponses (identifiant de question, note 1 à 5, domaine, facette), `timeElapsed` en secondes, `questionnaireVersion`, `dateStamp` posé par le serveur. Aucun nom, e-mail, âge ni genre. Aucun lien avec un compte | `web/src/actions/index.ts` (`saveTest`), `web/src/schemas/index.ts` (`testSchema`) |
| Accès au résultat | Par l'identifiant Mongo de 24 caractères hexadécimaux, sans authentification : tout détenteur de l'adresse lit le résultat, recalculé à chaque ouverture. La page n'est pas marquée `noindex` | `getTestResult` ; `result/[id]/page.tsx` (aucune clé `robots`) |
| Stockage local du navigateur | `localStorage` : `inProgress` et `b5data` (réponses en cours, effacées à l'envoi ou au nouveau départ), `resultId` (dernier résultat, conservé) ; clé `theme` de `next-themes` | `test/survey.tsx`, `result/get-result.tsx`, `app/providers.tsx` |
| Cookie de langue | `NEXT_LOCALE`, 1 an, `SameSite=Lax`, ni `HttpOnly` ni `Secure`. **Vérifié par `curl -I` sur la production le 20/10/2026** (réponses de `/`, `/fr`, `/ar/privacy`) | middleware `next-intl` 3.26.5 |
| Mesure d'audience, publicité, pixels | Aucun code : recherche de `analytics`, `gtag`, `plausible`, `umami`, `matomo`, `posthog`, `sentry`, `googletagmanager` dans `web/src` et `package.json` : aucun résultat. Les polices sont chargées par `next/font` (téléchargées à la construction, servies par le site) | `web/src`, `config/fonts.ts` |
| Adresse IP | Lue dans l'en-tête `cf-connecting-ip` ; sert de clé à un limiteur de débit **en mémoire** (fenêtres d'une heure : 60 envois, 600 lectures, tentatives de connexion) ; jamais écrite en base | `lib/rate-limit.ts`, `lib/sliding-window.ts` |
| Intermédiaire réseau | Les réponses de la production portent `Server: cloudflare` : Cloudflare relaie les requêtes | `curl -I https://tenga.ai-mpower.com/` |
| Envoi d'e-mail | Resend n'est appelé que par `sendMail` pour le lien de connexion (`lib/mailer.ts`). Plus aucun e-mail de partage de résultat | `lib/mailer.ts`, `lib/login-delivery.ts` |
| Espace de connexion | Présent dans le répertoire de travail seulement (pages `connexion`, `c/[token]`, `mon-compte`, `admin`, actions `auth.ts`, `account.ts`, base Supabase `0001` à `0003`). **Non déployé : la production sert encore l'ancienne version** (audit du jour). Le questionnaire public n'est pas encore relié aux comptes | `web/src/app/[locale]/{connexion,c,mon-compte,admin}`, `supabase/migrations/` |
| Données de compte | E-mail, nom facultatif (≤ 120 caractères), langue, organisations et rôles ; lien de connexion et code à 6 chiffres stockés sous forme d'empreinte SHA-256, valables 15 minutes, supprimés au plus tard 1 jour après expiration ; journal d'actions sans e-mail, conservé 12 mois par défaut (`private.settings`) ; purge quotidienne à 00:00 UTC | `supabase/migrations/0001`, `0002` |
| Cookies de session | `__Host-tenga_at` (jeton d'accès, durée du jeton moins 30 s), `__Host-tenga_rt` (renouvellement, 30 jours d'inactivité), `__Host-tenga_next` (destination, 15 minutes) ; `HttpOnly`, `Secure`, `SameSite=Lax` | `lib/session-cookies.ts` |
| Journal d'exploitation | Pas d'e-mail ; l'IP n'y figure que sous forme d'une étiquette HMAC de 12 caractères dont la clé est tirée au démarrage du processus | `lib/security-log.ts` |
| Suppression automatique des résultats du questionnaire public (MongoDB) | **Aucune** dans le code : pas d'index TTL, pas de purge (recherche de `expireAfter`, `createIndex`, `deleteMany`, `deleteOne` dans `web/src` : aucun résultat). Les durées de `private.settings` (36 mois, etc.) concernent les tables Supabase des lots suivants, pas MongoDB | `web/src`, `supabase/migrations/0001` |

### 2.3 Proposition en français

Les blocs **A** (questionnaire public) correspondent à ce qui est en ligne et au code actuel. Le bloc **B** (espace de connexion) ne doit être publié qu'au déploiement de l'espace privé : le publier avant serait une description inexacte.

```markdown
# Confidentialité

*Notre politique de confidentialité*

Cette page explique quelles données personnelles Tenga Conseil traite lorsque vous utilisez Tenga Assessments, pourquoi, pendant combien de temps, et comment exercer vos droits.

## Qui est responsable de vos données

Tenga Assessments est un service de Tenga Conseil, [dénomination sociale, forme juridique et adresse du siège : à compléter], responsable du traitement de vos données.

## [Bloc A] Les données que nous enregistrons quand vous répondez au questionnaire

Lorsque vous envoyez vos réponses, nous enregistrons :

- la langue dans laquelle vous avez répondu ;
- vos 120 réponses, chacune avec la question, la valeur choisie de 1 à 5, le domaine et la facette qu'elle mesure ;
- le temps passé sur le questionnaire, en secondes ;
- la date et l'heure de l'envoi, fixées par notre serveur ;
- la version du questionnaire utilisée.

Nous ne vous demandons ni nom, ni adresse e-mail, ni âge, ni genre pour répondre, et le questionnaire ne nécessite aucun compte. Ces données ne sont rattachées à aucun compte.

## [Bloc A] Votre résultat

Après l'envoi, un identifiant de 24 caractères est créé : c'est l'adresse de votre page de résultat. Toute personne qui connaît cette adresse peut consulter le résultat, car il n'y a pas de mot de passe. Ne la partagez qu'avec les personnes de votre choix. Le résultat est calculé à partir de vos réponses chaque fois que la page est ouverte. Votre navigateur garde l'identifiant sur votre appareil pour vous permettre de retrouver votre dernier résultat.

## [Bloc A] Cookies et stockage sur votre appareil

Nous n'utilisons ni service de mesure d'audience, ni publicité, ni cookie de suivi. Seuls des éléments nécessaires au fonctionnement du site sont enregistrés sur votre appareil :

| Nom | Type | À quoi il sert | Durée |
|---|---|---|---|
| NEXT_LOCALE | cookie | Mémoriser la langue choisie | 1 an |
| inProgress, b5data | stockage local | Conserver vos réponses en cours pour que vous puissiez reprendre | Jusqu'à l'envoi des réponses ou jusqu'à ce que vous recommenciez |
| resultId | stockage local | Vous proposer de retrouver votre dernier résultat | Jusqu'à l'effacement des données de votre navigateur |
| theme | stockage local | Mémoriser votre choix de thème clair ou sombre, si vous le modifiez | Jusqu'à l'effacement des données de votre navigateur |

## [Bloc A] Données techniques

Comme tout site, notre serveur reçoit votre adresse IP et des informations sur votre navigateur lorsque vous chargez une page. Pour limiter les abus, l'adresse IP est conservée dans la mémoire du serveur le temps d'une fenêtre de comptage des requêtes, d'une heure au plus. Elle n'est pas enregistrée dans notre base de données.

## [Bloc A] À quoi servent ces données

- calculer et afficher votre résultat ;
- faire fonctionner et protéger le service (limitation du nombre de requêtes).

[Base légale de chaque finalité : à qualifier par le juriste.]

## Nos prestataires

- Cloudflare relaie les requêtes entre votre appareil et notre serveur ; il voit donc votre adresse IP. [Pays de traitement et garanties : à compléter.]
- Vos réponses sont hébergées sur un serveur exploité pour Tenga Conseil. [Lieu d'hébergement : à compléter.]

## Combien de temps nous les conservons

Les réponses au questionnaire sont conservées [durée à fixer par le client]. [Aujourd'hui, aucune suppression automatique n'existe : ne rien écrire de plus précis tant qu'elle n'est pas en place.]

## [Bloc B, à publier seulement avec l'espace de connexion] Votre accès à l'espace de connexion

L'espace de connexion est réservé aux personnes pour lesquelles Tenga Conseil a créé un accès. Lorsque vous l'utilisez, nous traitons :

- votre adresse e-mail, pour vous envoyer votre lien de connexion ;
- votre nom, si vous choisissez de le renseigner, et votre langue ;
- les organisations auxquelles votre accès est rattaché et votre rôle dans chacune.

Il n'y a pas de mot de passe. Nous vous envoyons un lien et un code à 6 chiffres, valables 15 minutes et utilisables une seule fois. Nous ne les conservons que sous forme d'empreinte non réversible, et nous les supprimons au plus tard un jour après leur expiration. L'e-mail est envoyé par notre prestataire Resend, qui reçoit pour cela votre adresse e-mail et le contenu du message. [Pays de traitement et garanties : à compléter.]

Une fois connecté, votre session est maintenue par trois cookies nécessaires, inaccessibles aux scripts du site et transmis uniquement en HTTPS : un jeton d'accès de courte durée, un jeton de renouvellement qui expire après 30 jours sans connexion, et un cookie de 15 minutes qui mémorise la page demandée avant la connexion. Ils sont effacés lorsque vous vous déconnectez.

Nous tenons un journal technique des actions d'administration et de connexion. Il ne contient aucune adresse e-mail et est conservé 12 mois.

## Vos droits

Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, et vous opposer à leur traitement pour des motifs légitimes, conformément au règlement général sur la protection des données (RGPD) et à la loi marocaine n° 09-08. Pour retrouver vos réponses, indiquez l'identifiant de votre résultat. [Délai de réponse que Tenga Conseil s'engage à tenir : à fixer.]

Vous pouvez aussi saisir l'autorité de contrôle : la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP) au Maroc, ou l'autorité de votre pays de résidence dans l'Union européenne.

## Nous contacter

Pour toute question sur cette politique ou pour exercer vos droits, écrivez-nous à [adresse de contact].

*Dernière mise à jour : [date].*

```

### 2.4 Proposition en arabe

À relire par un locuteur natif et un juriste. Adresse au pluriel de politesse, comme dans l'e-mail de connexion du site (« استعملوا »).

```markdown
# الخصوصية

*سياسة الخصوصية لدينا*

توضح هذه الصفحة البيانات الشخصية التي تعالجها Tenga Conseil عند استعمالكم Tenga Assessments، وسبب معالجتها، ومدة الاحتفاظ بها، وكيفية ممارسة حقوقكم.

## الجهة المسؤولة عن بياناتكم

Tenga Assessments خدمة تقدّمها Tenga Conseil، [التسمية الاجتماعية والشكل القانوني وعنوان المقر: يُستكمل]، وهي المسؤولة عن معالجة بياناتكم.

## [الكتلة A] البيانات التي نسجّلها عند الإجابة عن الاستبيان

عند إرسال إجاباتكم، نسجّل ما يلي:

- اللغة التي أجبتم بها؛
- إجاباتكم الـ 120، لكل منها السؤال والقيمة المختارة من 1 إلى 5 والبُعد والسمة الفرعية التي تقيسها؛
- الوقت المستغرق في الاستبيان بالثواني؛
- تاريخ الإرسال وساعته، يحدّدهما خادمنا؛
- نسخة الاستبيان المستعملة.

لا نطلب منكم اسمًا ولا عنوان بريد إلكتروني ولا سنًّا ولا جنسًا للإجابة، ولا يتطلب الاستبيان أي حساب. وهذه البيانات غير مرتبطة بأي حساب.

## [الكتلة A] نتيجتكم

بعد الإرسال يُنشأ معرّف من 24 خانة، وهو عنوان صفحة نتيجتكم. كل من يعرف هذا العنوان يستطيع الاطلاع على النتيجة، إذ لا توجد كلمة مرور. لذلك لا تشاركوه إلا مع من تختارونه. وتُحسب النتيجة من إجاباتكم في كل مرة تُفتح فيها الصفحة. ويحتفظ متصفحكم بالمعرّف على جهازكم ليتيح لكم العثور على آخر نتيجة.

## [الكتلة A] ملفات تعريف الارتباط والتخزين على جهازكم

لا نستعمل أي خدمة لقياس عدد الزوار، ولا إعلانات، ولا ملفات تعريف ارتباط للتتبّع. ولا يُسجَّل على جهازكم إلا ما يلزم لعمل الموقع:

| الاسم | النوع | الغرض | المدة |
|---|---|---|---|
| NEXT_LOCALE | ملف تعريف ارتباط | تذكّر اللغة المختارة | سنة واحدة |
| inProgress, b5data | تخزين محلي | حفظ إجاباتكم الجارية لتتمكنوا من المتابعة | إلى حين إرسال الإجابات أو بدء استبيان جديد |
| resultId | تخزين محلي | تمكينكم من العثور على آخر نتيجة | إلى حين مسح بيانات المتصفح |
| theme | تخزين محلي | تذكّر اختياركم للمظهر الفاتح أو الداكن إن غيّرتموه | إلى حين مسح بيانات المتصفح |

## [الكتلة A] البيانات التقنية

كأي موقع، يتلقى خادمنا عنوان IP الخاص بكم ومعلومات عن متصفحكم عند تحميل صفحة. وللحد من إساءة الاستعمال، يُحفظ عنوان IP في ذاكرة الخادم طوال نافذة احتساب الطلبات، ولمدة ساعة على الأكثر. ولا يُسجَّل في قاعدة بياناتنا.

## [الكتلة A] أغراض استعمال هذه البيانات

- حساب نتيجتكم وعرضها؛
- تشغيل الخدمة وحمايتها (تحديد عدد الطلبات).

[الأساس القانوني لكل غرض: يحدّده المستشار القانوني.]

## مزوّدو الخدمة لدينا

- تنقل Cloudflare الطلبات بين جهازكم وخادمنا، ولذلك ترى عنوان IP الخاص بكم. [بلد المعالجة والضمانات: يُستكمل.]
- تُستضاف إجاباتكم على خادم تشغّله Tenga Conseil أو يُشغَّل لحسابها. [مكان الاستضافة: يُستكمل.]

## مدة الاحتفاظ

تُحفظ الإجابات عن الاستبيان مدة [تحدّدها الجهة العميلة]. [لا يوجد اليوم حذف تلقائي: لا يُكتب أي تفصيل آخر قبل وضعه.]

## [الكتلة B، لا تُنشر إلا مع فضاء الدخول] دخولكم إلى فضاء الدخول

فضاء الدخول مخصص للأشخاص الذين أنشأت Tenga Conseil لهم حق دخول. وعند استعماله نعالج:

- عنوان بريدكم الإلكتروني، لإرسال رابط الدخول إليكم؛
- اسمكم إن اخترتم إدخاله، ولغتكم؛
- المؤسسات المرتبطة بحق دخولكم ودوركم في كل منها.

لا توجد كلمة مرور. نرسل إليكم رابطًا ورمزًا من 6 أرقام، صالحين لمدة 15 دقيقة ولا يُستعملان إلا مرة واحدة. ولا نحتفظ بهما إلا في صورة بصمة لا يمكن عكسها، ونحذفهما بعد يوم واحد على الأكثر من انتهاء صلاحيتهما. ويُرسل البريد الإلكتروني عبر مزوّدنا Resend، الذي يتلقى لهذا الغرض عنوان بريدكم ومحتوى الرسالة. [بلد المعالجة والضمانات: يُستكمل.]

بعد الدخول تُحفظ جلستكم بثلاثة ملفات تعريف ارتباط ضرورية، لا تستطيع سكربتات الموقع قراءتها ولا تُرسل إلا عبر HTTPS: رمز وصول قصير الأمد، ورمز تجديد تنتهي صلاحيته بعد 30 يومًا دون دخول، وملف مدته 15 دقيقة يحفظ الصفحة المطلوبة قبل الدخول. وتُمسح عند تسجيل الخروج.

نحتفظ بسجل تقني لإجراءات الإدارة والدخول. لا يتضمن أي عنوان بريد إلكتروني، ويُحفظ 12 شهرًا.

## حقوقكم

يمكنكم طلب الاطلاع على بياناتكم أو تصحيحها أو محوها، والاعتراض على معالجتها لأسباب مشروعة، وفق اللائحة الأوروبية العامة لحماية البيانات (RGPD) والقانون المغربي رقم 09-08. وللعثور على إجاباتكم، أرفقوا طلبكم بمعرّف نتيجتكم. [مدة الرد التي تلتزم بها Tenga Conseil: تُحدَّد.]

ويمكنكم أيضًا اللجوء إلى سلطة الرقابة: اللجنة الوطنية لمراقبة حماية المعطيات ذات الطابع الشخصي (CNDP) في المغرب، أو سلطة بلد إقامتكم داخل الاتحاد الأوروبي.

## الاتصال بنا

لأي سؤال عن هذه السياسة أو لممارسة حقوقكم، راسلونا على [عنوان الاتصال].

*آخر تحديث: [التاريخ].*

```

### 2.5 Écarts à trancher

1. **Identité du responsable.** Dénomination sociale, forme juridique, adresse, numéro d'identification : absents du code (le pied de page dit seulement « © 2026 Tenga Conseil »). Obligatoire pour l'information de la personne.
2. **Adresse de contact.** Elle vient de la variable d'environnement `NEXT_PUBLIC_SUPPORT_EMAIL`, dont la valeur de production n'est pas lisible depuis le dépôt. Sans elle, la page actuelle renvoie à « l'exploitant du site », ce qui n'est pas exploitable pour exercer un droit.
3. **Durée de conservation des résultats du questionnaire public.** Aucune suppression automatique dans le code (voir 2.2). Les 36 mois de `private.settings` ne s'appliquent pas à MongoDB. Décision : fixer une durée et la mettre en oeuvre (index TTL ou purge) avant de l'écrire ; en attendant, le texte ne promet rien.
4. **Exercice des droits.** Aucun mécanisme dans le code pour retrouver et supprimer un résultat sur demande : ce serait une opération manuelle sur MongoDB. Le délai de réponse est un engagement organisationnel à fixer par le client.
5. **Finalité statistique de l'ancien texte** (« statistical, aggregated data … for analytical purposes »). Aucune requête d'agrégation n'existe dans le code. Je ne l'ai pas reprise. À rétablir seulement si une exploitation statistique est réellement prévue, avec sa base légale.
6. **Bases légales.** Non qualifiées (consentement, intérêt légitime, exécution d'un contrat avec l'organisation ?). Tâche du juriste ; elle dépend aussi de la relation avec l'employeur dans le cas d'une passation sur invitation.
7. **Déclaration ou autorisation CNDP.** Préalable déjà noté dans `voix-de-marque.md` § 7 et la conception de l'espace privé. Le texte ne l'affirme pas ; si elle est faite, ajouter le numéro de récépissé.
8. **Hébergement et transferts hors du Maroc.** Lieu physique du serveur et de l'instance Supabase non établi par le dépôt ; Cloudflare relaie le trafic (constat par l'en-tête `Server: cloudflare`) ; Resend traite les e-mails de connexion. Pays et garanties de transfert à documenter.
9. **Cloudflare peut avoir ses propres traceurs ou journaux** (journaux d'accès, jeton anti-robot, mesure d'audience si activée dans son tableau de bord). La phrase « aucun cookie de suivi » est vraie pour le code du site et pour les réponses de la production relevées par `curl` (seul `NEXT_LOCALE` est posé), mais l'état du tableau de bord Cloudflare n'est pas lisible depuis le dépôt. À vérifier.
10. **Journaux du serveur d'application et du proxy** (Coolify et son proxy inverse). Ils peuvent enregistrer des adresses IP en clair et des chemins d'URL, donc des identifiants de résultat. Durée et accès non établis par le dépôt ; la phrase « n'est pas enregistrée dans notre base de données » reste exacte, mais ne dit rien de ces journaux.
11. **Durée exacte de la mémoire du limiteur.** Fenêtres d'une heure ; je n'ai pas vérifié que les entrées sont effacées avant la fin du processus. D'où la formulation « d'une heure au plus », à confirmer par la lecture de `lib/sliding-window.ts`.
12. **Clé `theme` (next-themes).** Le texte dit qu'elle n'est écrite que si l'on change de thème. À confirmer dans un navigateur : cela n'a pas été testé.
13. **Page de résultat indexable.** Aucune balise `noindex` sur `result/[id]` et `robots.txt` autorise tout. Un lien publié par la personne peut donc être indexé. Décision de produit (code), mais le texte « ne partagez qu'avec les personnes de votre choix » en dépend.
14. **Bloc B et lot 1.** L'espace de connexion, la base Supabase et Resend ne sont pas en production. Publier le bloc B avant leur déploiement serait inexact. Le questionnaire public n'étant pas relié aux comptes, le texte devra être de nouveau réécrit à l'arrivée des campagnes, des invitations et de la restitution (lots suivants, `conception-espace-prive.md` § 7).
15. **Public concerné.** Les personnes invitées par leur employeur ne sont pas dans une situation de libre consentement : question juridique à poser (voix-de-marque § 1).
16. **Âge minimal.** L'ancien formulaire exigeait « 16 ans ou plus » (clé dormante `form.ageWarning`) ; rien ne le contrôle plus. Le texte ne dit rien sur les mineurs.
17. **Articles de loi.** Aucun numéro d'article n'est cité volontairement (non vérifiable ici). Sources consultées pour le cadre général : loi n° 09-08 promulguée par le dahir n° 1-09-15 de 2009, décret d'application n° 2-09-165 (recherche du 20/10/2026, sources secondaires) ; le site de la CNDP (cndp.ma) fait foi, à consulter par le juriste.

### 2.6 Intégration suggérée (non écrite)

Namespace `privacy` dans `fr.js`, `ar.js` et `en.js`, page lue par `getTranslations('privacy')` avec `t.rich` pour le lien de contact et le tableau ; tableau de cookies conservé en JSX. Le bloc B derrière un indicateur de déploiement de l'espace privé. Le sous-titre et le titre existent déjà (`toolbar.privacy`).

---

## 3. Libellés de `/compare` (à titre informatif)

La route `/compare` est supprimée du répertoire de travail et sera retirée au lot 2 ; ces libellés ne sont à intégrer que si la page restait en ligne. Source : `compare-people.tsx` (version `HEAD`), 6 chaînes recensées par l'audit.

| # | Anglais actuel | Rôle | Français proposé | Arabe proposé |
|---|---|---|---|---|
| 1 | Name | libellé du champ de saisie | Nom | الاسم |
| 2 | ID | libellé du champ de saisie | Identifiant | المعرّف |
| 3 | NAME | en-tête de colonne (lecteurs d'écran) | Nom | الاسم |
| 4 | ACTIONS | en-tête de colonne (lecteurs d'écran) | Actions | الإجراءات |
| 5 | No rows to display. | tableau vide | Aucune personne ajoutée. | لم تُضَف أي شخص بعد. |
| 6 | List of persons to compare | `aria-label` du tableau | Liste des personnes à comparer | قائمة الأشخاص المراد مقارنتهم |

Remarques : « Identifiant » est la forme de `voix-de-marque.md` (et de l'audit) ; l'arabe « المعرّف » est celui que l'audit propose. Le placeholder « Arthur Dent » est un nom fictif à rendre local si la page survivait.

---

## 4. Clés de messages identiques à l'anglais : vérification d'usage avant purge

### 4.1 Comptage actuel et écart avec l'audit

Script de comparaison (clés aplaties de `fr.js` et `ar.js` contre `en.js`, valeur strictement identique) exécuté sur le répertoire de travail et sur `HEAD` :

| Source | fr identiques à l'anglais | ar identiques à l'anglais | Clés manquantes |
|---|---|---|---|
| `HEAD` (commité) | 35 | 31 | 0 |
| Répertoire de travail du 20/10/2026 (192 puis 251 clés) | 46 | 34 | 0 |

L'audit annonçait 33 et 29 (hors faux positifs). Les chiffres diffèrent parce que le dépôt a bougé (la session propriétaire a ajouté les espaces `login`, `account`, `roles`, `admin`, dont des mots légitimement identiques : « Consultant », « Participant », « Administration », « Action », « Date », noms de langue) et parce que le décompte de l'audit écartait certains faux positifs. **Je donne ci-dessous l'inventaire exact recalculé** ; la décision de purge porte sur les clés **dormantes**.

### 4.2 Clés légitimement identiques (mots valides dans la langue, lues par le code) : à conserver

`radar.score` et `results.radar.score` (« Score »), `toolbar.articles` (« Articles »), `account.languages.fr|ar|en` (noms de langue), `roles.consultant`, `roles.participant`, `admin.title`, `admin.colConsultants`, `admin.colParticipants`, `admin.status.active`, `admin.colDate`, `admin.colAction` (fr seulement). Chacune est lue : `radar('score')` dans `app/[locale]/page.tsx:146`, `t('radar.score')` dans `result/[id]/page.tsx`, `t('languages.fr')` dans `mon-compte/page.tsx`, `t('colDate')` etc. dans `admin/page.tsx`.

### 4.3 Clés dormantes : inventaire

- `form.*` : 18 clés, fr et ar : `form.information`, `form.informationText`, `form.mostAccurate`, `form.readMoreAbout`, `form.privacy`, `form.nextButton`, `form.declineButton`, `form.iama`, `form.male`, `form.female`, `form.age`, `form.iam`, `form.yearsOld`, `form.ageWarning`, `form.gender`, `form.confirmInfo`, `form.confirm`, `form.toTestButton`
- `big_five.title`, `big_five.seo.title`, `big_five.seo.description` : 3 clés, fr et ar
- `<domaine>.seo.title` et `<domaine>.seo.description` pour `openness_to_experience`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` : 10 clés, fr et ar
- `extraversion.title` : 1 clé, fr seulement (« Extraversion » est un mot français valide, mais l'espace de noms est dormant)

Total dormant recalculé : **fr = 32** (18 + 3 + 10 + 1), **ar = 31** (18 + 3 + 10). Ces clés existent aussi dans `en.js` (et sans doute dans les 39 autres fichiers de langue, non vérifiés).

### 4.4 Vérification qu'aucun appel du code ne les lit

Espaces de noms effectivement demandés au chargeur de messages (commande 1), puis recherche de chaque espace de noms dormant (commandes 2 à 4). Exécutées depuis `web/` le 20/10/2026.

**Commande 1** : `grep -rhoE "(useTranslations|getTranslations)\([^)]*\)" src --include=*.ts --include=*.tsx | sort -u`

```text
getTranslations('about')
getTranslations('account')
getTranslations('admin')
getTranslations('articles')
getTranslations('faq')
getTranslations('frontpage')
getTranslations('getResult')
getTranslations('home')
getTranslations('login')
getTranslations('notFound')
getTranslations('radar')
getTranslations('results')
getTranslations('roles')
getTranslations('test')
getTranslations('toolbar')
getTranslations({ locale })
getTranslations({ locale, namespace: 'about' })
getTranslations({ locale, namespace: 'account' })
getTranslations({ locale, namespace: 'admin' })
getTranslations({ locale, namespace: 'articles' })
getTranslations({ locale, namespace: 'faq' })
getTranslations({ locale, namespace: 'frontpage' })
getTranslations({ locale, namespace: 'login' })
getTranslations({ locale, namespace: 'results' })
getTranslations({ locale, namespace: 'seo' })
getTranslations({ locale, namespace: 'toolbar' })
useTranslations('error')
useTranslations('notFound')
useTranslations('results')
```

Aucun des sept espaces `form`, `big_five`, `openness_to_experience`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` n'apparaît. Le chargeur `layout.tsx` ne transmet d'ailleurs au client que `notFound` et `error` (`messages={{ notFound: messages.notFound, error: messages.error }}`). `getTranslations({ locale })` sans espace de noms (`layout.tsx:98`) ne lit que `a11y.skip`.

**Commandes 2 à 4**, pour chaque espace de noms `R` : (2) `grep -rnE "(useTranslations|getTranslations)\([^)]*['\"]R['\"]" src tests --include=*.ts --include=*.tsx | wc -l` ; (3) `grep -rnE "['\"]R\.[A-Za-z_.]+" src tests --include=*.ts --include=*.tsx | grep -v '^src/messages' | wc -l` ; (4) `grep -rnE "messages(\?)?\.R|messages\[['\"]R" src tests --include=*.ts --include=*.tsx | grep -v '^src/messages' | wc -l`.

| Espace de noms | (2) appel du chargeur | (3) chemin complet `R.xxx` | (4) accès par objet de messages |
|---|---|---|---|
| `form` | 0 | 0 | 0 |
| `big_five` | 0 | 0 | 0 |
| `openness_to_experience` | 0 | 0 | 0 |
| `conscientiousness` | 0 | 0 | 0 |
| `extraversion` | 0 | 0 | 0 |
| `agreeableness` | 0 | 0 | 0 |
| `neuroticism` | 0 | 0 | 0 |

Lecture : 0 occurrence partout, y compris dans `tests/`. Le seul test qui cite les messages (`tests/unit/messages-parity.test.ts`) ne vise que `login`, `account`, `roles`, `admin`, `toolbar`, `share`, `getCompare`, `shareLinks`. Aucun usage dynamique repéré : les seuls appels construits (`t(`${key}.question`)` dans `faq/page.tsx`) portent sur l'espace `faq`.

**Limites de la preuve.** Une recherche textuelle ne prouve pas l'absence d'un accès construit à l'exécution ; ici aucun appel ne passe un espace de noms variable pour ces sept noms. Les 39 autres fichiers de langue n'ont pas été examinés. Les anciennes pages (`compare`, `email-modal`, `share-bar`) qui lisaient d'autres espaces ont été supprimées du répertoire de travail.

### 4.5 Décision demandée au client

Purger ces 32 (fr) et 31 (ar) clés, et leurs pendants dans `en.js`, retire du texte à maintenir environ 50 chaînes jamais affichées, dont l'ancien formulaire « âge / genre / Okey, next question » qui contredit la voix de marque (`voix-de-marque.md` § 2.5, § 5). Rien n'est supprimé par ce document. Le test de parité existant n'en dépend pas ; un test devra constater l'absence de ces espaces de noms.

---

## Bilan chiffré

- Rubrique 1 : **20 textes demandés** (5 descriptions, soit 22 paragraphes, et 15 textes de niveau) en arabe, plus 5 `shortDescription` arabes et 5 `shortDescription` français, soit 30 propositions. 11 paragraphes sur 22 sont marqués `⚠ passage sensible`.
- Rubrique 2 : 1 page, proposée en français et en arabe (bloc A en ligne, bloc B conditionnel) ; 17 écarts à trancher.
- Rubrique 3 : 6 libellés en français et en arabe.
- Rubrique 4 : 32 clés dormantes (fr) et 31 (ar), 0 lecture trouvée.
