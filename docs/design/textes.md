# Textes de Tenga Assessments : état actuel et propositions (français, arabe)

20 octobre 2026. Application de `voix-de-marque.md` à chaque texte affiché sur les pages publiques actuelles. Aucun fichier de code ni de messages n'a été modifié.

## 0. Mode d'emploi pour l'agent qui appliquera

- **Clé** : chemin exact dans l'objet exporté par `web/src/messages/fr.js` et `ar.js` (exemple : `frontpage.cards.free.text`). Une clé marquée **nouvelle** n'existe pas encore : le texte est aujourd'hui écrit en dur dans le composant indiqué, et il faut créer la clé dans `fr.js`, `ar.js` et `en.js` puis brancher le composant.
- **Activation** :
  - *immédiate* : texte exact dès aujourd'hui, à appliquer sans attendre ;
  - *lot N* : texte exact seulement une fois le lot N de `conception-espace-prive.md` § 8 déployé ; ne pas l'appliquer avant (risque d'affirmer une protection qui n'existe pas encore) ;
  - *obsolète (lot N)* : la fonction disparaît avec le lot N ; pas de réécriture, la clé sera supprimée avec la fonction. Si un correctif transitoire est indispensable (texte faux ou cassé à l'écran), il est donné sous « Transitoire ».
- **Décision** : le texte engage une décision d'Amine (numéro du § 7 de `voix-de-marque.md`) ; appliquer la recommandation par défaut seulement après accord.
- Espaces avant `:` `;` `!` `?` et dans « » : insécables (U+00A0, à écrire ` ` dans les fichiers de messages).
- Balises `<violet>`, `<green>`, `{n}`, `{email}` : à conserver telles quelles, ce sont des points d'insertion du code.

## 1. Commun à toutes les pages : titre d'onglet, en-tête, pied

Fichiers : `app/[locale]/layout.tsx`, `config/site.ts`, `components/navbar.tsx`, `components/footer.tsx`.

### `frontpage.seo.title` (titre d'onglet ; aussi suffixe de chaque page via le gabarit `%s - …`)
- FR actuel : Test de personnalité Big Five
- AR actuel : Free open-source BigFive personality traits test
- FR proposé : Test de personnalité Big Five | Tenga Assessments
- AR proposé : اختبار الشخصية وفق العوامل الخمسة الكبرى | Tenga Assessments
- Activation : immédiate. Note pour le code : le gabarit produira « À propos - Test de personnalité Big Five | Tenga Assessments » ; un gabarit `%s | Tenga Assessments` serait plus lisible (hors périmètre de ce document).

### `frontpage.seo.description` (description pour les moteurs et les aperçus de lien)
- FR actuel : Passez le test de personnalité Big Five : découvrez vos traits de personnalité et comparez-vous à vos collègues, à votre équipe ou à vos proches.
- AR actuel : Take a free, open-source Big Five personality test. Learn to know your personality traits and compare yourself with your partner, colleagues, friends or family.
- FR proposé : Questionnaire de personnalité fondé sur le modèle des cinq grands facteurs (Big Five), proposé par Tenga Conseil, cabinet de conseil marocain, aux organisations qu'il accompagne.
- AR proposé : استبيان للشخصية قائم على نموذج العوامل الخمسة الكبرى، يقدّمه مكتب الاستشارات المغربي Tenga Conseil للمؤسسات التي يرافقها.
- Activation : immédiate. Au lot 1, ajouter en fin de phrase : FR « , sur invitation personnelle » ; AR « ، بدعوة شخصية ».

### `seo.keywords`
- FR actuel : big five personality test, big 5 personality test, b5 test, bigfive test, personality traits, bigfive, compare, free, jordan peterson
- AR actuel : اختبار الشخصية الخمسة الكبار، اختبار الخمس الكبار للشخصية، اختبار بي 5، اختبار بيغفايف، صفات الشخصية، بيغفايف، مقارنة، مجاني، جوردان بيترسون
- FR proposé : test de personnalité, questionnaire de personnalité, Big Five, cinq grands facteurs, IPIP-NEO-120, évaluation de la personnalité, Tenga Conseil, Maroc
- AR proposé : اختبار الشخصية، استبيان الشخصية، العوامل الخمسة الكبرى، تقييم الشخصية، IPIP-NEO-120، Tenga Conseil، المغرب
- Activation : immédiate. Retrait de « jordan peterson » : associer la marque à une personnalité publique clivante sans son accord est un risque d'image ; retrait de « gratuit » (décision 2).

### `toolbar.home`
- FR actuel : Accueil | AR actuel : Home
- FR proposé : Accueil | AR proposé : الرئيسية
- Activation : immédiate.

### `toolbar.result` (barre de navigation)
- FR actuel : Résultat | AR actuel : النتيجة
- Obsolète (lot 3) : remplacé par l'accès à « Mes résultats ». Texte cible pour la future clé : FR « Mes résultats » ; AR « نتائجي ».

### `toolbar.see_results` (menu mobile)
- FR actuel : Voir vos résultats | AR actuel : شاهد نتيجتك
- Obsolète (lot 3), même remplacement que `toolbar.result`.
- Transitoire : FR « Retrouver un résultat » ; AR « استرجاع نتيجة » (l'impératif genré « شاهد » exclut les femmes).

### `toolbar.compare` et `toolbar.compare_with`
- FR actuel : Comparer ; Comparez avec les autres | AR actuel : قارن ; قارن مع غيرك
- Obsolète (lot 1 pour l'accès public, lot 4 pour la comparaison de groupe, qui vit dans l'espace de l'organisation et non dans la navigation publique). Pas de réécriture.

### `toolbar.articles`
- FR actuel : Articles | AR actuel : مقالات
- FR proposé : Articles | AR proposé : مقالات
- Décision 13 : aucun article n'existe en français ni en arabe ; recommandation, masquer ce lien dans ces deux langues.

### `toolbar.privacy`
- FR actuel : Confidentialité | AR actuel : الخصوصية
- FR proposé : Confidentialité | AR proposé : الخصوصية
- Activation : immédiate (inchangé).

### `toolbar.about`
- FR actuel : À propos | AR actuel : عنّا
- FR proposé : À propos | AR proposé : من نحن
- Activation : immédiate.

### `toolbar.faq`
- FR actuel : FAQ | AR actuel : FAQ
- FR proposé : Questions fréquentes | AR proposé : أسئلة شائعة
- Activation : immédiate. Si la largeur de la barre ne le permet pas, FR « Questions » ; AR « أسئلة ».

### Nouvelles clés de l'en-tête (`components/navbar.tsx`, textes en dur)
| Nouvelle clé | Actuel (en dur) | FR proposé | AR proposé |
|---|---|---|---|
| `toolbar.home_aria` | Home | Accueil de Tenga Assessments | الصفحة الرئيسية لـ Tenga Assessments |
| `toolbar.open_menu` | Open menu | Ouvrir le menu | فتح القائمة |
| `toolbar.close_menu` | Close menu | Fermer le menu | إغلاق القائمة |

### Nouvelle clé de partage social (`app/[locale]/layout.tsx`, texte alternatif de l'image d'aperçu)
- `frontpage.seo.image_alt` ; actuel en dur : People comparing personality tests
- FR proposé : Tenga Assessments, questionnaire de personnalité
- AR proposé : Tenga Assessments، استبيان الشخصية
- Activation : immédiate.

### Pied de page (`components/footer.tsx`)
« © {année} Tenga Conseil » : conforme, rien à changer. Les liens reprennent les clés `toolbar.*` ci-dessus.

## 2. Accueil (`app/[locale]/page.tsx`)

Ordre d'affichage : titre, sous-titre, bouton, mention sous le bouton, trois cartes, bandeau du compteur, bloc « Comparez-vous », cercle des domaines, articles, bandeau des langues.

### `frontpage.description.top` (titre principal, h1)
- FR actuel : Lgagnez à mieux vous connaître grâce à un test de personnalité <violet>gratuit</violet> et open source.
- AR actuel : تعرّف على نفسك أكثر عن طريق هذا الاختبار <violet>المجاني</violet> ومفتوح المصدر
- FR proposé : Mieux comprendre votre façon d'agir, pour <violet>mieux travailler ensemble</violet>.
- AR proposé : فهمٌ أدقّ لأسلوبك في العمل، من أجل <violet>تعاون أفضل</violet> داخل الفريق.
- Activation : immédiate. Corrige la coquille « Lgagnez » ; retire « gratuit » (décision 2) et « open source ».

### `frontpage.description.info` (sous-titre, h2)
- FR actuel : Le test suivant contient 120 questions qui devraient vous prendre environ 10 minutes.
- AR actuel : الاختبار يحتوي على ١٢٠ سؤال وسيستغرق منك إتمامه حوالي ١٠ دقائق
- FR proposé : Un questionnaire de 120 affirmations, proposé par Tenga Conseil aux organisations qu'il accompagne. Il n'y a ni bonne ni mauvaise réponse, et aucune limite de temps.
- AR proposé : استبيان من 120 عبارة يقدّمه مكتب Tenga Conseil للمؤسسات التي يرافقها. لا توجد فيه إجابات صحيحة وأخرى خاطئة، ولا يتقيّد بوقت محدّد.
- Activation : immédiate. Décision 5 : la durée « 10 minutes » n'est pas sourcée ; la remettre seulement une fois mesurée sur les passations réelles. L'arabe actuel contient aussi une faute d'accord (« ١٢٠ سؤال » pour « 120 سؤالًا »).

### `frontpage.call_to_action` (bouton principal ; aussi infobulle et libellé accessible du bouton rond)
- FR actuel : Faites le test gratuit maintenant
- AR actuel : ابدأ الاختبار الآن مجاناً
- FR proposé : Commencer le questionnaire
- AR proposé : بدء الاستبيان
- Activation : immédiate. Au lot 1 (test sur invitation uniquement), le bouton mène à la connexion : FR « Accéder à mon espace » ; AR « الدخول إلى حسابي ».

### `frontpage.no_registration` (mention sous le bouton)
- FR actuel : * Aucune inscription requise
- AR actuel : * لا يتطلب التسجيل
- Obsolète (lot 1) : faux dès que le test exige une invitation. Remplacement par une **nouvelle clé** `frontpage.invitation_note`, activation lot 1 :
  - FR : Le questionnaire est accessible sur invitation personnelle de votre organisation. Vous avez reçu un e-mail ? Il vous suffit d'ouvrir le lien qu'il contient.
  - AR : يُتاح الاستبيان بدعوة شخصية من مؤسستك. إن وصلتك رسالة بالبريد الإلكتروني، فيكفي فتح الرابط الوارد فيها.

### `frontpage.cards.open.title` et `frontpage.cards.open.text` (carte 1)
- FR actuel : Ouvert ; Il s'agit d'un projet open source sous licence MIT.
- AR actuel : مفتوح ; MIT هذا مشروع مفتوح المصدر تحت ترخيص
- Activation immédiate :
  - FR : Sources publiques ; Les questions et le calcul des scores proviennent de l'International Personality Item Pool, placé dans le domaine public.
  - AR : مصادر عمومية ; الأسئلة وطريقة احتساب النتائج مأخوذة من المجمع الدولي لعبارات الشخصية (IPIP)، وهو ملك عام.
- Activation lot 1 (remplace la version immédiate) :
  - FR : Confidentiel ; Votre résultat individuel n'est visible que par vous, par le consultant Tenga affecté à votre organisation et par l'équipe d'administration de Tenga Conseil. Votre organisation n'en voit jamais le détail.
  - AR : سرّي ; لا يطّلع على نتيجتك الفردية سواك، والمستشار المكلَّف من Tenga بمرافقة مؤسستك، وفريق إدارة Tenga Conseil. ولا تطّلع مؤسستك على تفاصيلها أبدًا.
- Note : l'icône « open source » du composant est à changer (code). Source de la règle : `conception-espace-prive.md` § 9.2. Décision 3 (relecture juridique).

### `frontpage.cards.free.title` et `frontpage.cards.free.text` (carte 2)
- FR actuel : Gratuit ; Le test est totalement gratuit
- AR actuel : مجاني ; الاختبار مجاني تماماً
- FR proposé : Adapté au Maroc ; Proposé en français et en arabe, avec des formulations adaptées au contexte marocain qui mesurent la même facette que les questions d'origine.
- AR proposé : مكيَّف مع السياق المغربي ; متاح بالعربية والفرنسية، بصياغات ملائمة للسياق المغربي تقيس السمة نفسها التي تقيسها العبارات الأصلية.
- Activation : immédiate, après décision 2 (abandon de l'argument « gratuit »). Fait vérifié : `question-overrides.ts` garde la facette et le sens de cotation de chaque question reformulée.

### `frontpage.cards.scientific.title` et `frontpage.cards.scientific.text` (carte 3)
- FR actuel : Scientifique ; BigFive est un modèle psychologique scientifiquement validé et fiable.
- AR actuel : علمي ; نموذج السمات الخمسة في علم النفس هو نموذج علمي محقّق وموثوق
- FR proposé : Fondé sur la recherche ; Le questionnaire repose sur le modèle des cinq grands facteurs, largement utilisé en psychologie de la personnalité, et reprend l'IPIP-NEO-120 de John A. Johnson (2014).
- AR proposé : قائم على البحث العلمي ; يعتمد الاستبيان على نموذج العوامل الخمسة الكبرى، الشائع الاستعمال في علم نفس الشخصية، ويستند إلى استبيان IPIP-NEO-120 الذي وضعه جون أ. جونسون (2014).
- Activation : immédiate. Sources : https://ipip.ori.org/30FacetNEO-PI-RItems.htm ; https://fr.wikipedia.org/wiki/Mod%C3%A8le_des_Big_Five_(psychologie). Décision 6 : ne jamais écrire « validé » pour la version adaptée au Maroc.

### `frontpage.tests_taken` (bandeau compteur)
- FR actuel : Plus de <green>{n}</green> personnes ont passé le test (n = « 4.000.000 », écrit en dur dans `page.tsx`)
- AR actuel : أكثر من <green>{n}</green> أخذوا الاختبار
- À supprimer immédiatement, clé et bandeau : le chiffre provient du site d'origine et est faux pour Tenga Assessments. Pas de texte de remplacement chiffré (aucune donnée sourcée à ce jour).

### `frontpage.compare.title`, `frontpage.compare.text1`, `frontpage.compare.text2`, `frontpage.compare.action`
- FR actuel : Comparez-vous aux autres ; Comparez-vous avec votre partenaire, vos collègues, vos amis ou votre famille. ; Découvrez en quoi vous vous différenciez des autres dans les cinq domaines: ; Regardez-le en direct en action
- AR actuel : قارن شخصيتك بشخصية غيرك ; قارن شخصيتك بشخصية شريكك أو زميلك أو صديقك ; اعرف ما يميّزك عن غيرك في السمات الخمسة ; شاهد عينة
- Obsolète (lot 1) : la comparaison publique par identifiant disparaît. Pas de réécriture. Si le bloc doit survivre comme présentation des cinq domaines, nouveau titre proposé (nouvelle clé `frontpage.domains.title`) : FR « Les cinq grands facteurs de la personnalité » ; AR « العوامل الخمسة الكبرى للشخصية ». `compare.action` est aussi l'une des six pastilles du cercle : la retirer (code).

### `facets.openness_to_experience.title` … `facets.neuroticism.title` (pastilles du cercle)
| Clé | FR actuel | AR actuel | FR proposé | AR proposé |
|---|---|---|---|---|
| `facets.openness_to_experience.title` | Ouverture à l 'experience | الانفتاح | Ouverture | الانفتاح على الخبرة |
| `facets.conscientiousness.title` | Conscience | اليقظة/التفاني | Conscienciosité | يقظة الضمير |
| `facets.extraversion.title` | Extraversion | الانبساطية | Extraversion | الانبساطية |
| `facets.agreeableness.title` | Agréable | المسايرة/الطيبة | Agréabilité | المقبولية |
| `facets.neuroticism.title` | Névrosisme | العُصابية | Névrosisme | العُصابية |

Activation : immédiate. Justification et sources : `voix-de-marque.md` § 4. Forme courte en français (pastilles de 195 px). Les clés de premier niveau `openness_to_experience.title`, `conscientiousness.title`, `extraversion.title`, `agreeableness.title`, `neuroticism.title` reçoivent les mêmes valeurs (forme longue « Ouverture à l'expérience » en français) ; elles ne sont affichées par aucune page actuelle. Les titres de domaine **affichés sur la page de résultat** viennent du paquet `@bigfive-org/results` (« Ouverture d'esprit », « Conscience », « Convivialité » en français ; « المسايرة » en arabe) : à surcharger dans le code avec le même lexique.

### Section articles (textes en dur dans `page.tsx`)
| Nouvelle clé | Actuel (en dur) | FR proposé | AR proposé |
|---|---|---|---|
| `frontpage.posts.title` | Latest posts | À lire | للقراءة |
| `frontpage.posts.subtitle` | All the latest and greatest news and articles on #personality | Repères sur la personnalité et le travail en équipe | مفاتيح لفهم الشخصية والعمل الجماعي |
| `frontpage.posts.all` | Show all articles ... | Voir tous les articles | عرض جميع المقالات |

Décision 13 : sans article en français ni en arabe, recommandation, masquer toute la section dans ces deux langues.

### Bandeau des langues (`components/translated.tsx`, texte en dur)
- Nouvelle clé `frontpage.languages.title` ; actuel en dur : Translated in multiple languages
- Si décision 8 adoptée (trois langues) : FR « Disponible en français, en arabe et en anglais » ; AR « متاح بالعربية والفرنسية والإنجليزية ».
- Sinon : recommandation, supprimer le bandeau (43 drapeaux pour des traductions non relues par Tenga).

### `frontpage.description.reference` (non affichée aujourd'hui, à afficher)
- FR actuel : Tests and evaluation for this site is gathered from <a href="http://ipip.ori.org" …>ipip.ori.org</a>, inventory is from <i>Johnson's (2014) 120-item IPIP NEO-PI-R</i>.
- AR actuel : identique, en anglais
- FR proposé : Questions et calcul des scores : International Personality Item Pool (<a href="https://ipip.ori.org" rel="noopener" target="_blank">ipip.ori.org</a>), questionnaire IPIP-NEO-120 de John A. Johnson (2014), placé dans le domaine public.
- AR proposé : الأسئلة وطريقة احتساب النتائج: المجمع الدولي لعبارات الشخصية (<a href="https://ipip.ori.org" rel="noopener" target="_blank">ipip.ori.org</a>)، استبيان IPIP-NEO-120 لجون أ. جونسون (2014)، وهو ملك عام.
- Activation : immédiate, sous les cartes ou en pied d'accueil (choix de mise en page de l'autre agent). Corrige aussi l'appellation fautive « IPIP NEO-PI-R » et le lien en `http`.

### Autres clés `frontpage.*` non affichées
`frontpage.title`, `frontpage.share` (obsolète, partage public), `frontpage.description.subtop`, `subtop2`, `result`, `description.tests_taken` : aucune page ne les affiche ; à supprimer lors du nettoyage des messages.

## 3. Questionnaire (`app/[locale]/test/page.tsx`, `survey.tsx`)

### 3.1 Clés de l'interface

#### `test.next`
- FR actuel : Suivant | AR actuel : التالي
- Inchangé.

#### `test.back`
- FR actuel : Retour | AR actuel : السابق
- FR proposé : Précédent | AR proposé : السابق
- Activation : immédiate (« Retour » évoque la sortie du questionnaire).

#### `test.seeResults`
- FR actuel : Voir les résultats | AR actuel : شاهد النتيجة
- FR proposé : Voir mes résultats | AR proposé : عرض نتائجي
- Activation : immédiate.

#### `test.restored` + `test.newTest` (lus à la suite : « {restored} {newTest} »)
- FR actuel : Vos réponses ont été restaurées. Cliquez ici pour + recommencer le test
- AR actuel : تمت استعادة إجاباتك. انقر هنا من أجل + بدء اختبار جديد
- Activation immédiate :
  - FR : Nous avons retrouvé vos réponses enregistrées sur cet appareil. Vous pouvez reprendre là où vous en étiez, ou + recommencer depuis le début
  - AR : استعدنا إجاباتك المحفوظة على هذا الجهاز. يمكنك المتابعة من حيث توقفت، أو + البدء من جديد
- Activation lot 2 (progression sauvegardée sur le serveur) : `test.restored` FR « Nous avons retrouvé votre progression. Vous pouvez reprendre là où vous en étiez, sur cet appareil comme sur un autre. » ; AR « استعدنا تقدّمك في الاستبيان. يمكنك المتابعة من حيث توقفت، على هذا الجهاز أو على غيره. » La possibilité de « recommencer depuis le début » dans une campagne est une règle métier à trancher avec le lot 2.

#### `test.saveFailedTitle`
- FR actuel : Résultat non enregistré | AR actuel : لم يتم حفظ النتيجة
- FR proposé : Vos réponses ne sont pas encore enregistrées | AR proposé : لم تُحفظ إجاباتك بعد
- Activation : immédiate.

#### `test.saveFailedText`
- FR actuel : Votre résultat n'a pas pu être enregistré, souvent parce que le site a été mis à jour pendant votre test. Vos réponses sont conservées sur cet appareil : rechargez la page, puis cliquez de nouveau sur le bouton des résultats.
- AR actuel : تعذّر حفظ نتيجتك، وغالبًا ما يكون السبب تحديث الموقع أثناء إجرائك للاختبار. إجاباتك محفوظة على هذا الجهاز: أعد تحميل الصفحة ثم انقر مرة أخرى على زر النتائج.
- FR proposé : L'enregistrement a échoué, le plus souvent parce que le site a été mis à jour pendant que vous répondiez. Vos réponses restent conservées sur cet appareil : rechargez la page, puis cliquez de nouveau sur « Voir mes résultats ».
- AR proposé : تعذّر الحفظ، وغالبًا ما يحدث ذلك عند تحديث الموقع أثناء الإجابة. إجاباتك ما تزال محفوظة على هذا الجهاز، ويكفي إعادة تحميل الصفحة ثم النقر من جديد على «عرض نتائجي».
- Activation : immédiate ; à revoir au lot 2 (la sauvegarde ne sera plus seulement locale).

#### `test.reload`
- FR actuel : Recharger la page | AR actuel : إعادة تحميل الصفحة
- Inchangé.

#### `test.more`
Non affichée ; à supprimer lors du nettoyage.

#### Nouvelles clés (textes en dur dans `survey.tsx`)
| Nouvelle clé | Actuel (en dur) | FR proposé | AR proposé |
|---|---|---|---|
| `test.progress_aria` | Progress bar | Progression dans le questionnaire | التقدّم في الاستبيان |
| `test.clear_aria` | Clear data | Effacer mes réponses enregistrées sur cet appareil | حذف إجاباتي المحفوظة على هذا الجهاز |
| `test.instructions` (consigne, à afficher au-dessus de la première page) | aucun | Pour chaque affirmation, indiquez dans quelle mesure elle vous décrit tel que vous êtes habituellement, et non tel que vous aimeriez être. Répondez spontanément. | يُرجى تحديد مدى انطباق كل عبارة عليك كما أنت في العادة، لا كما تودّ أن تكون، والإجابة بعفوية. |

La consigne est une nouveauté de contenu : elle réduit les réponses idéalisées, qui faussent le profil. Activation : immédiate.

### 3.2 Questions surchargées (`lib/question-overrides.ts`)

Changer une formulation change le questionnaire : nouvelle valeur de `QUESTIONNAIRE_VERSION` obligatoire (décision 9).

| Question | Texte d'origine (IPIP) | FR actuel | AR actuel | FR proposé | AR proposé |
|---|---|---|---|---|---|
| 28, O6, `79186f48-…` | Tend to vote for liberal political candidates | Je suis ouvert aux idées qui remettent en question les traditions | أميل نحو الآراء المنفتحة (paquet, sans surcharge) | J'accueille volontiers les idées qui remettent en question les traditions | أتقبّل بسهولة الأفكار التي تُسائل التقاليد |
| 88, O6, `96ba77b2-…` | Tend to vote for conservative political candidates | Je préfère que l'on garde les façons de faire établies | أميل نحو الآراء المحافظة (paquet, sans surcharge) | inchangé | أفضّل الحفاظ على الطرق المعتادة في تدبير الأمور |

Raisons : « ouvert » est masculin et exclut les répondantes ; l'arabe de ces deux questions n'a jamais été aligné sur la reformulation française, si bien que les deux langues ne posent pas la même question. Les cinq autres surcharges sont conformes (neutres en genre dans les deux langues).

### 3.3 Échelle de réponse (paquet `@bigfive-org/questions`, fichiers `data/fr/choices.js` et `data/ar/choices.js`)

Décision 12. Proposition alignée sur l'échelle d'exactitude de l'IPIP (« Very Inaccurate » à « Very Accurate ») :

| Valeur | FR actuel | AR actuel | FR proposé | AR proposé |
|---|---|---|---|---|
| 1 | Fortement en désaccord | لا تنطبق عليّ إطلاقاً | Ne me correspond pas du tout | لا تنطبق عليّ إطلاقًا |
| 2 | Plutot en désaccord | تنطبق عليّ قليلاً | Me correspond plutôt mal | لا تنطبق عليّ في الغالب |
| 3 | Ni en accord ni en désaccord | تنطبق عليّ أحياناً | Ni l'un ni l'autre | لا أستطيع الحسم |
| 4 | Plutot en accord | تنطبق عليّ كثيراً | Me correspond plutôt bien | تنطبق عليّ في الغالب |
| 5 | Fortement en accord | تنطبق عليّ دائماً | Me correspond tout à fait | تنطبق عليّ تمامًا |

À appliquer par surcharge locale (code), dans la même nouvelle version du questionnaire que § 3.2.

## 4. Résultat

### 4.1 Recherche d'un résultat par identifiant (`app/[locale]/result/page.tsx`, `get-result.tsx`)

Toute la page est **obsolète (lot 1)** : il n'existera plus de lien public par identifiant ; la personne retrouvera ses résultats dans son espace (lot 3).

#### `getResult.result`
- FR actuel : Résultat | AR actuel : النتيجة
- Obsolète (lot 1).

#### `getResult.explanation`
- FR actuel : Si vous avez passé le test et enregistré votre identifiant, vous pouvez voir les résultats ici en tapant l'identifiant que vous avez obtenu, c'est-à-dire
- AR actuel : سبق وأخذت الاختبار واحتفظت برمز النتيجة؟ يمكنك تحصيل نتيجتك هنا عن طريق إدخال رمز النتيجة مثل
- Obsolète (lot 1). Transitoire (la phrase s'arrête aujourd'hui à l'écran sur « c'est-à-dire », la suite n'étant pas affichée) :
  - FR : Saisissez l'identifiant de votre résultat, affiché en haut de la page de résultat après le questionnaire.
  - AR : يُرجى إدخال رمز نتيجتك، وهو الرمز الظاهر أعلى صفحة النتيجة بعد إتمام الاستبيان.

#### `getResult.getResult`, `getResult.viewPrevious`
- FR actuel : Obtenez le résultat ; Afficher le résultat précédent | AR actuel : احصل على النتيجة ; عرض النتيجة السابقة
- Obsolète (lot 1). Transitoire : FR « Afficher le résultat » ; AR « عرض النتيجة » (l'impératif « احصل » est genré). `viewPrevious` inchangé.

#### `getResult.idInput`, `getResult.urlOrId`
Non affichées ; obsolètes.

#### Textes en dur de `get-result.tsx`
« ID », « 58a70606a835c400c8b38e84 », « Please enter a valid ID » : obsolètes (lot 1), pas de nouvelle clé.

### 4.2 Page de résultat (`app/[locale]/result/[id]/page.tsx`)

#### `results.important`, `results.saveResults`, `results.compare`, `results.toOthers` (bandeau « Important ! Enregistrez l'ID… »)
- FR actuel : Important! ; Enregistrez l'ID suivant pour voir les résultats plus tard ou ; comparer ; toi-même aux autres
- AR actuel : !مهم ; احفط الرمز التالي لتتمكن من رؤية نتيجتك في وقت لاحق أو لتتمكن من ; مقارنة ; نتيجتك بغيرك
- Obsolète (lot 1) : plus d'identifiant à conserver ni de comparaison publique. Transitoire, si le bandeau reste visible d'ici là (le texte actuel tutoie, inverse le point d'exclamation arabe et contient la coquille « احفط ») :
  - `results.important` FR « Important : » ; AR « مهم: »
  - `results.saveResults` FR « conservez l'identifiant ci-dessous pour retrouver ce résultat plus tard ou pour le » ; AR « يُرجى الاحتفاظ بالرمز أدناه لاسترجاع هذه النتيجة لاحقًا أو »
  - `results.compare` FR « comparer » ; AR « مقارنتها »
  - `results.toOthers` FR « à d'autres résultats. » ; AR « بنتائج أخرى. »

#### `results.theBigFive` (titre au-dessus du graphique)
- FR actuel : Les cinq grands | AR actuel : السمات الخمسة الكبرى
- FR proposé : Les cinq grands facteurs | AR proposé : العوامل الخمسة الكبرى
- Activation : immédiate.

#### `results.score` (intitulé de la valeur chiffrée dans les onglets de domaine)
- FR actuel : But | AR actuel : الدرجة
- FR proposé : Score | AR proposé : الدرجة
- Activation : immédiate. « But » est un contresens.

#### `results.seo.title`
- FR actuel : My results from the BigFive personality test | AR actuel : identique
- FR proposé : Mes résultats au questionnaire Big Five | AR proposé : نتائجي في استبيان العوامل الخمسة الكبرى
- Activation : immédiate. Au lot 1, la page de résultat devient privée : elle ne doit plus être indexée (code).

#### `results.seo.description`
- FR actuel : See my personality and compare yourself in the following five domains: Neuroticism, Openness To Experience, Conscientiousness, Extraversion, Agreeableness
- AR actuel : identique
- FR proposé : Profil de personnalité selon les cinq grands facteurs : ouverture à l'expérience, conscienciosité, extraversion, agréabilité et névrosisme.
- AR proposé : الملف الشخصي وفق العوامل الخمسة الكبرى: الانفتاح على الخبرة، ويقظة الضمير، والانبساطية، والمقبولية، والعُصابية.
- Activation : immédiate.

#### Nouvelle clé `results.intro` (à placer au-dessus du graphique)
- FR : Ces résultats décrivent vos tendances habituelles, d'après vos propres réponses. Ils ne mesurent ni vos compétences ni votre valeur, et ne constituent pas un diagnostic.
- AR : تصف هذه النتائج ميولك المعتادة كما تظهر من إجاباتك. وهي لا تقيس كفاءاتك ولا قيمتك، ولا تُعدّ تشخيصًا.
- Activation : immédiate. Volontairement sans comparaison à d'autres personnes : le calcul n'utilise aucune norme (`voix-de-marque.md` § 2.7). Une seconde phrase sur la restitution par un consultant (FR « Votre consultant Tenga vous aidera à les interpréter. » ; AR « وسيساعدك مستشار Tenga على قراءتها. ») ne s'active qu'au lot 6 et si chaque participant bénéficie bien d'une restitution (décision commerciale).

#### Date du résultat
Affichée par `toLocaleDateString()` sans langue : elle sort au format du navigateur, pas de la langue de la page (code).

#### Barre de partage (`components/share-bar.tsx`) et envoi par e-mail (`components/email-modal.tsx`)
Textes en dur : « Share on facebook », « Share on X », « Download PDF », « Mail link », « Copy link », « Explore my personality traits », « Send the link to mail », « We will send the link to the email you provide… », « Please enter a valid email address », « Enter your email ».
Obsolète (lot 1) : un résultat privé ne se partage plus sur les réseaux sociaux ni par lien. Seule l'impression survit ; nouvelle clé proposée `results.print` : FR « Imprimer ou enregistrer en PDF » ; AR « طباعة أو حفظ بصيغة PDF ». Les clés `shareLinks.*` (non affichées par ce composant, qui écrit en dur) sont obsolètes.

#### Textes d'interprétation des domaines et facettes
Ils viennent du paquet `@bigfive-org/results`, hors des fichiers de messages. Leurs titres français et arabes contiennent les contresens listés dans `voix-de-marque.md` § 4.3 ; leur correction relève d'une surcharge locale (code) et d'une relecture complète des descriptions avec le lexique de ce document.

## 5. Comparaison (`app/[locale]/compare/**`)

Toutes les clés `getCompare.*` (title, description1, description2, description3, needToAddPeople, addAnother, addPerson, comparePeople, nameOfPerson, urlOrId, name) et les textes en dur de `compare-people.tsx` et `compare-edit.tsx` (« Name », « Arthur Dent », « Only letters allowed… », « Please enter a valid ID… », « No rows to display. », « Edit Comparison », « Overview ») : **obsolètes (lot 1)**. La comparaison publique est remplacée au lot 4 par les moyennes de groupe d'au moins 5 personnes, dans l'espace de l'organisation. Pas de réécriture.

Les clés `common.save` et `common.close` restent utiles au-delà de la comparaison :
| Clé | FR actuel | AR actuel | FR proposé | AR proposé |
|---|---|---|---|---|
| `common.save` | Save | محل | Enregistrer | حفظ |
| `common.close` | Close | يغلق | Fermer | إغلاق |
| `common.and` | et | و | et | و |

Activation : immédiate. « محل » signifie « boutique », « يغلق » est un verbe conjugué (« il ferme »).

## 6. À propos (`app/[locale]/about/page.tsx`)

### `about.seo.title`
- FR actuel : About and the big five team | AR actuel : identique
- FR proposé : À propos de Tenga Assessments | AR proposé : تعريف بـ Tenga Assessments
- Activation : immédiate.

### `about.seo.description`
- FR actuel : BigFive has a very active and engaged team that is constantly striving to push BigFive forward. | AR actuel : identique
- FR proposé : Tenga Assessments est le service d'évaluation de la personnalité de Tenga Conseil, cabinet de conseil marocain.
- AR proposé : Tenga Assessments هي خدمة تقييم الشخصية التابعة لمكتب الاستشارات المغربي Tenga Conseil.
- Activation : immédiate. L'actuel décrit l'équipe du projet d'origine : faux pour Tenga.

### Corps de la page (texte anglais en dur, nouvelles clés)
| Nouvelle clé | FR proposé | AR proposé | Activation |
|---|---|---|---|
| `about.title` | À propos | من نحن | immédiate |
| `about.p1` | Tenga Assessments est le service d'évaluation de la personnalité de Tenga Conseil, cabinet de conseil marocain. Il est proposé aux organisations que le cabinet accompagne : directions, équipes de ressources humaines, consultants. | Tenga Assessments هي خدمة تقييم الشخصية التابعة لمكتب الاستشارات المغربي Tenga Conseil، ويقدّمها المكتب للمؤسسات التي يرافقها: الإدارات العامة، وفرق الموارد البشرية، والمستشارين. | immédiate |
| `about.p2` | Le questionnaire décrit la personnalité selon les cinq grands facteurs : ouverture à l'expérience, conscienciosité, extraversion, agréabilité et névrosisme, détaillés en trente facettes. Il reprend l'IPIP-NEO-120 de John A. Johnson (2014), issu de l'International Personality Item Pool et placé dans le domaine public. | يصف الاستبيان الشخصية وفق العوامل الخمسة الكبرى: الانفتاح على الخبرة، ويقظة الضمير، والانبساطية، والمقبولية، والعُصابية، مفصَّلةً في ثلاثين سمة فرعية. ويستند إلى استبيان IPIP-NEO-120 الذي وضعه جون أ. جونسون (2014) انطلاقًا من المجمع الدولي لعبارات الشخصية، وهو ملك عام. | immédiate |
| `about.p3` | Il est proposé en français et en arabe. Quelques formulations ont été adaptées au contexte marocain ; chacune conserve la facette mesurée et le sens de cotation de la question d'origine. | يُقدَّم الاستبيان بالعربية والفرنسية، وقد كُيِّفت بعض صياغاته مع السياق المغربي، مع الحفاظ في كل منها على السمة المقيسة وعلى اتجاه التنقيط في العبارة الأصلية. | immédiate |
| `about.p4` | Les résultats décrivent des tendances habituelles de comportement. Ils ne mesurent pas des compétences et ne constituent pas un diagnostic. | تصف النتائج ميولًا سلوكية معتادة، ولا تقيس الكفاءات ولا تُعدّ تشخيصًا. | immédiate |
| `about.p5` | Votre résultat individuel n'est visible que par vous, par le consultant Tenga affecté à votre organisation et par l'équipe d'administration de Tenga Conseil. Votre organisation ne voit que des moyennes de groupe. | لا يطّلع على نتيجتك الفردية سواك، والمستشار المكلَّف من Tenga بمرافقة مؤسستك، وفريق إدارة Tenga Conseil. أما مؤسستك فلا ترى إلا متوسطات المجموعات. | lot 1 (décision 3) |
| `about.contact_faq` | Une question ? Consultez d'abord les <link>questions fréquentes</link>. | لديك سؤال؟ يمكنك الاطلاع أولًا على <link>الأسئلة الشائعة</link>. | immédiate |
| `about.contact_email` | Si vous n'y trouvez pas la réponse, écrivez-nous à {email}. | وإن لم تجد الجواب هناك، يمكنك مراسلتنا على {email}. | immédiate |

L'actuel (« your premier destination », « scientifically acclaimed », « free, open-source ») est entièrement à retirer.

## 7. Questions fréquentes (`app/[locale]/faq/page.tsx`, texte anglais en dur, nouvelles clés)

| Nouvelle clé | FR proposé | AR proposé | Activation |
|---|---|---|---|
| `faq.title` | Questions fréquentes | أسئلة شائعة | immédiate |
| `faq.error.question` | Une erreur s'est affichée sur le site : que faire ? | ظهر خطأ في الموقع، فما العمل؟ | immédiate |
| `faq.error.answer` | Décrivez-nous ce qui s'est passé par e-mail à {email}. | يُرجى وصف ما حدث في رسالة إلى {email}. | immédiate (si l'adresse est configurée, comme aujourd'hui) |
| `faq.print.question` | Comment imprimer mes résultats ? | كيف أطبع نتائجي؟ | immédiate |
| `faq.print.answer` | Depuis la page de résultats, utilisez la fonction d'impression de votre navigateur, ou enregistrez la page au format PDF. | من صفحة النتائج، يمكن استعمال خاصية الطباعة في المتصفح، أو حفظ الصفحة بصيغة PDF. | immédiate |
| `faq.source.question` | D'où viennent les questions ? | من أين أُخذت الأسئلة؟ | immédiate |
| `faq.source.answer` | Les questions et le calcul des scores proviennent de l'International Personality Item Pool (ipip.ori.org), placé dans le domaine public : il s'agit de l'IPIP-NEO-120 de John A. Johnson (2014). Tenga Conseil a adapté quelques formulations au contexte marocain, sans changer ce que mesure chaque question. | الأسئلة وطريقة احتساب النتائج مأخوذة من المجمع الدولي لعبارات الشخصية (ipip.ori.org)، وهو ملك عام، وتحديدًا من استبيان IPIP-NEO-120 لجون أ. جونسون (2014). وقد كيّف مكتب Tenga Conseil بعض الصياغات مع السياق المغربي دون تغيير ما تقيسه كل عبارة. | immédiate |
| `faq.answers.question` | Y a-t-il de bonnes et de mauvaises réponses ? | هل توجد إجابات صحيحة وأخرى خاطئة؟ | immédiate |
| `faq.answers.answer` | Non. Chaque affirmation décrit une manière d'être. Répondez selon ce qui vous ressemble habituellement, pas selon ce que vous aimeriez être. | لا. كل عبارة تصف طريقة في السلوك، والمطلوب هو الإجابة بحسب ما يشبهك في العادة، لا بحسب ما تودّ أن تكون. | immédiate |
| `faq.diagnosis.question` | Le questionnaire établit-il un diagnostic ? | هل يقدّم الاستبيان تشخيصًا؟ | immédiate |
| `faq.diagnosis.answer` | Non. Il décrit des tendances de comportement d'après vos propres réponses. Il ne mesure ni vos compétences, ni votre intelligence, ni votre santé. | لا. فهو يصف ميولًا سلوكية انطلاقًا من إجاباتك، ولا يقيس كفاءاتك ولا ذكاءك ولا حالتك الصحية. | immédiate |
| `faq.who_sees.question` | Qui peut voir mon résultat ? | من يمكنه الاطلاع على نتيجتي؟ | lot 1 |
| `faq.who_sees.answer` | Vous, le consultant de Tenga Conseil affecté à votre organisation et l'équipe d'administration de Tenga Conseil. Chaque consultation par une autre personne que vous est enregistrée. Votre organisation ne voit jamais votre résultat individuel : elle voit seulement si vous avez répondu, et des moyennes calculées sur des groupes d'au moins {seuil} personnes. | أنت، والمستشار المكلَّف من Tenga Conseil بمرافقة مؤسستك، وفريق إدارة Tenga Conseil. وتُسجَّل كل عملية اطلاع يقوم بها شخص غيرك. أما مؤسستك فلا ترى نتيجتك الفردية أبدًا، بل ترى فقط ما إذا كنت قد أجبت، ومتوسطات محسوبة لمجموعات لا يقل عدد أفرادها عن {seuil}. | lot 1 ; moyennes au lot 4 ; décision 3 |
| `faq.retention.question` | Combien de temps mes données sont-elles conservées ? | ما مدة الاحتفاظ ببياناتي؟ | lot 1 |
| `faq.retention.answer` | Vos résultats sont conservés {duree_resultats}, puis supprimés automatiquement. Vous pouvez aussi télécharger vos données ou demander leur suppression depuis votre espace. | يُحتفظ بنتائجك مدة {duree_resultats}، ثم تُحذف تلقائيًا. ويمكنك أيضًا تنزيل بياناتك أو طلب حذفها من حسابك. | lot 1 pour la durée, lot 3 pour la seconde phrase ; décision 4 |

Les deux questions actuelles « Where can I find more information about the questions and the evaluation? » et « Where do the questions come from? » sont fusionnées dans `faq.source.*`. `{seuil}` et `{duree_resultats}` doivent être lus dans les réglages (`settings`), jamais écrits en dur.

## 8. Pages d'erreur (`app/[locale]/not-found.tsx`, `error.tsx`, textes anglais en dur, nouvelles clés)

| Nouvelle clé | Actuel | FR proposé | AR proposé |
|---|---|---|---|
| `notFound.title` | Not found | Page introuvable | الصفحة غير موجودة |
| `notFound.text` | Could not find requested resource | L'adresse demandée n'existe pas ou n'est plus disponible. | العنوان المطلوب غير موجود أو لم يعد متاحًا. |
| `notFound.image_alt` | Page not found | Page introuvable | الصفحة غير موجودة |
| `notFound.home` | aucun | Retour à l'accueil | العودة إلى الصفحة الرئيسية |
| `error.title` | Error | Une erreur est survenue | حدث خطأ |
| `error.text` | Something went wrong! (ou le message technique brut) | Réessayez dans un instant. Si l'erreur persiste, écrivez-nous. | يُرجى إعادة المحاولة بعد لحظات، وإن استمر الخطأ يُرجى مراسلتنا. |

Activation : immédiate. Note pour le code : `error.tsx` affiche `error.message` brut à l'écran ; un message technique ne doit pas être montré à l'utilisateur.

## 9. Confidentialité (`app/[locale]/privacy/page.tsx`)

Texte anglais en dur, juridique, et décrivant le fonctionnement actuel (test anonyme, envoi du lien par e-mail). Il sera entièrement réécrit avec la notice d'information du lot 2 (conception § 7) : **pas de proposition ici**, ce texte relève d'Amine et d'une relecture juridique (décision 3), et la déclaration à la CNDP reste un préalable.

## 10. Titres d'onglet qui mentionnent encore « open-source »

### Arabe : `frontpage.seo.title` et `frontpage.seo.description` de `ar.js`
Voir § 1 (propositions arabes).

### Allemand : `frontpage.seo.title` et `frontpage.seo.description` de `de.js`
- Actuel : Kostenloser open-source BigFive Persönlichkeitstest ; Machen Sie einen kostenlosen open-source Persönlichkeitstest. Lernen Sie Ihre Persönlichkeitsmerkmale kennen und vergleichen Sie sich mit Ihrem Partner, Kollegen, Freunden oder Familie.
- Proposé : Big-Five-Persönlichkeitstest | Tenga Assessments ; Persönlichkeitsfragebogen nach dem Fünf-Faktoren-Modell (Big Five), angeboten von Tenga Conseil, einer marokkanischen Unternehmensberatung, für die Organisationen, die sie begleitet.
- Activation : immédiate.

### Autres langues concernées
« open-source » ou « open source » apparaît aussi dans `cs.js`, `da.js`, `en.js`, `es.js`, `fr.js` (carte et titre principal, traités § 2), `id.js`, `it.js`, `nl.js`, `no.js`, `pl.js`, `ro.js`, `sr.js`, `sv.js`, `zh-cn.js`, ainsi que dans `app/manifest.ts`, `config/site.ts` (`siteConfig.description`) et le corps anglais de `about/page.tsx`. Recommandation (décision 8) : retirer ces langues du site ; à défaut, appliquer le modèle « Big Five personality test | Tenga Assessments » traduit, sans « open-source » ni « gratuit ».

## 11. Défauts relevés hors texte (pour l'agent de code)

- `ar.js` déclare deux fois la clé `language` (chaîne puis objet) : la première est écrasée.
- `fr.js` et `ar.js` n'ont pas les clés `articles.*`, `test.surveyLanguage`, `results.retriveReportError`, `results.reportLanguage`, `getResult.validIdError` et plusieurs `getCompare.*` présentes dans `en.js` ; seules `articles.*` restent utiles (et seulement si la rubrique est conservée).
- Le paquet `@bigfive-org/results` porte des titres de domaines et de facettes erronés (`voix-de-marque.md` § 4.3).
