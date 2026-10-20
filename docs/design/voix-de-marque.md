# Voix de marque de Tenga Assessments

20 octobre 2026. Document de référence pour tout texte affiché par Tenga Assessments, en français et en arabe. Il s'applique aux pages actuelles comme aux écrans de l'espace privé (`docs/conception-espace-prive.md`). Les propositions clé par clé se trouvent dans `textes.md`.

Convention typographique de ce document et des textes proposés : les espaces avant `:` `;` `!` `?` et à l'intérieur des guillemets « » sont des espaces insécables (U+00A0). Dans les fichiers de messages, les écrire ` `.

## 1. Qui parle, à qui, pour quoi faire

**Qui parle.** Tenga Conseil, cabinet de conseil marocain, par la voix de son service Tenga Assessments. Ce n'est ni une application grand public, ni un projet communautaire, ni un laboratoire de recherche. Le site actuel parle encore comme le projet d'origine (« open source », « gratuit », « comparez-vous à vos amis ») : cette voix disparaît entièrement.

**À qui.** Trois lecteurs, dans cet ordre de priorité :

1. **La personne invitée** (collaborateur, candidat). Elle n'a pas choisi de passer le questionnaire, elle se demande qui verra ses réponses et ce qu'on en fera. Le lien de subordination avec son employeur est réel (`conception-espace-prive.md` § 7). Tout texte qui lui est destiné doit d'abord lever cette inquiétude, puis lui donner envie de répondre sincèrement.
2. **Le responsable d'organisation** (direction, ressources humaines). Il veut un outil sérieux, défendable devant ses équipes et conforme. Il lit les pages publiques avant de signer.
3. **Le consultant Tenga.** Il restitue les résultats ; les textes ne doivent jamais promettre ce qu'il ne pourra pas tenir en entretien.

**Pour quoi faire.** Obtenir des réponses sincères (la qualité du profil en dépend) et installer la confiance dans Tenga Conseil comme tiers de confiance.

## 2. Principes

1. **Vouvoiement en français, toujours.** Jamais de tutoiement, jamais de « on » pour désigner la personne. Tenga parle à la première personne du pluriel quand il s'engage (« nous conservons », « nous ne transmettons pas »), jamais quand il décrit un fait technique.
2. **En arabe, une adresse qui n'exclut personne.** L'impératif arabe est genré (ابدأ pour un homme, ابدئي pour une femme). Règles :
   - boutons et intitulés au nom verbal (مصدر) : « بدء الاستبيان »، « متابعة »، « عرض النتائج » ;
   - phrases à la deuxième personne par le pronom suffixe non vocalisé, qui se lit au masculin comme au féminin : « نتيجتك »، « إجاباتك » ;
   - questions du questionnaire à la première personne avec des verbes, pas des adjectifs (« أتقبّل » plutôt que « أنا منفتح ») ;
   - jamais de « (ة) » ou de barre oblique pour marquer le féminin.
3. **Arabe littéral moderne natif, jamais traduit du français.** On écrit d'abord ce que dirait un rédacteur arabophone dans un document professionnel marocain, puis on vérifie que le sens correspond. Pas de calque de structure (« يتم + مصدر » en cascade, « قم بـ »). Ponctuation arabe : « ، » « ؛ » « ؟ », sans espace avant. Les points d'exclamation et d'interrogation ne sont pas inversés à la main (« !مهم » est une erreur actuelle : c'est le navigateur qui gère le sens de lecture).
4. **Chiffres occidentaux en arabe** (120 et non ١٢٠), conformément à l'usage courant de la presse et de l'administration marocaines. À confirmer par Tenga Conseil (voir § 7).
5. **Sobriété.** Phrases courtes, un message par phrase, aucun point d'exclamation hors des messages d'erreur. Pas d'adjectifs de vente (« incroyable », « révolutionnaire », « le meilleur »). Le sérieux se prouve par la précision, pas par le ton.
6. **Exactitude avant séduction (DÉFCON 1).** Aucun chiffre sans source vérifiable. Aucune affirmation scientifique au superlatif. Aucune promesse de confidentialité qui ne soit pas déjà garantie par le code en production (voir la colonne « Activation » de `textes.md`).
7. **Décrire, ne jamais juger.** Un trait de personnalité n'est ni une qualité ni un défaut. On écrit « vous tendez à », « plutôt », « vous vous décrivez comme » ; jamais « vous êtes », « bon score », « mauvais score », « faible ». **Jamais de comparaison avec « la moyenne » ou « les autres »** : le calcul actuel (`@bigfive-org/score`) n'utilise aucune norme de population ; il classe un domaine en « élevé » dès que la moyenne des réponses dépasse 3 sur 5, milieu de l'échelle. Un texte qui situerait la personne par rapport à d'autres serait faux.
8. **Ce n'est pas un diagnostic.** Le Big Five décrit des tendances habituelles de comportement. Les textes ne parlent jamais de maladie, de trouble, d'aptitude ou de compétence, même pour le domaine du névrosisme.
9. **Nommer les sources honnêtement.** Le questionnaire est l'IPIP-NEO-120 de John A. Johnson (2014), construit à partir de l'International Personality Item Pool, placé dans le domaine public ([ipip.ori.org, autorisation d'usage](https://ipip.ori.org/newPermission.htm)). Il mesure des facettes **proches** de celles du NEO PI-R, sans être le NEO PI-R ([ipip.ori.org, liste des 30 facettes](https://ipip.ori.org/30FacetNEO-PI-RItems.htm)). Ne jamais écrire « NEO PI-R » pour désigner le questionnaire de Tenga : c'est un instrument commercial distinct, sous marque.

## 3. Ton selon les écrans

| Écran | Intention | Ton | Exemple de registre |
|---|---|---|---|
| Accueil public | Expliquer à un responsable ce qu'est le service ; rassurer une personne invitée qui arrive sans lien | Institutionnel, posé, factuel | « Un questionnaire de personnalité proposé par Tenga Conseil aux organisations qu'il accompagne. » |
| Invitation et notice d'information | Informer avant tout engagement : finalité, destinataires, durée | Clair, transparent, aucune pression ; l'information précède le bouton | « Votre résultat individuel n'est jamais transmis à votre employeur. » (seulement une fois le lot 1 en production) |
| Questionnaire | Faciliter des réponses spontanées et sincères | Neutre, bref, encourageant sans flatter | « Répondez spontanément : il n'y a ni bonne ni mauvaise réponse. » |
| Erreurs et reprises | Dire ce qui s'est passé, ce qui est préservé, quoi faire | Calme, concret, une action par message | « Vos réponses sont conservées sur cet appareil. Rechargez la page. » |
| Résultat | Restituer sans étiqueter | Descriptif, nuancé, au conditionnel de tendance | « Vous tendez à rechercher la compagnie des autres. » |
| Notices, confidentialité, À propos, FAQ | Répondre aux questions réelles, citer les sources | Précis, complet, sans jargon juridique gratuit | « Le questionnaire provient de l'IPIP, placé dans le domaine public. » |

## 4. Lexique des cinq domaines

### 4.1 Décision

| Code | Anglais (IPIP) | Français retenu | Forme courte (graphiques, puces) | Arabe retenu |
|---|---|---|---|---|
| O | Openness to Experience | Ouverture à l'expérience | Ouverture | الانفتاح على الخبرة |
| C | Conscientiousness | Conscienciosité | Conscienciosité | يقظة الضمير |
| E | Extraversion | Extraversion | Extraversion | الانبساطية |
| A | Agreeableness | Agréabilité | Agréabilité | المقبولية |
| N | Neuroticism | Névrosisme | Névrosisme | العُصابية |

Titre générique : « les cinq grands facteurs de la personnalité » ; « Big Five » reste admis en français (usage courant, y compris chez les éditeurs). En arabe : « العوامل الخمسة الكبرى للشخصية ».

### 4.2 Justification et sources

- **Ouverture à l'expérience.** Forme française courante ([Wikipédia, Modèle des Big Five](https://fr.wikipedia.org/wiki/Mod%C3%A8le_des_Big_Five_(psychologie))). L'adaptation française de référence du NEO (J.-P. Rolland, éditée par Hogrefe) dit simplement « Ouverture » ([fiche Hogrefe du NEO-PI-3](https://www.hogrefe.com/fr/shop/media/downloads/sample-reports/FRA5602216_FicheRH_p.pdf)), d'où la forme courte. Les libellés actuels sont fautifs : « Ouverture à l 'experience » (espace parasite, accent manquant) dans `fr.js`, « Ouverture d'esprit » dans le paquet de résultats (sens moral, pas psychologique).
- **Conscienciosité.** Retenu par la validation française du Big Five Inventory (BFI-Fr, Plaisant et coll., *Annales médico-psychologiques*, 2010, [résumé](https://www.em-consulte.com/article/244774)) et par Wikipédia. Rolland écrit « Caractère consciencieux » ([fiche Hogrefe](https://www.hogrefe.com/fr/shop/media/downloads/sample-reports/FRA5602216_FicheRH_p.pdf)) : même sens, mais trop long pour un graphique. « Conscience » (libellé actuel) est à proscrire : en français courant, il signifie la conscience de soi ou la conscience morale, et induit le lecteur en erreur.
- **Extraversion.** Terme identique dans toutes les sources citées.
- **Agréabilité.** Terme de Rolland et de la BFI-Fr ; Wikipédia signale « amabilité » comme variante. « Agréable » (actuel, adjectif) et « Convivialité » (paquet de résultats) sont faux.
- **Névrosisme, et pourquoi pas « Stabilité émotionnelle ».** Les deux noms désignent le même axe, mais **en sens inverse** : un score élevé de névrosisme correspond à une stabilité émotionnelle faible. Le calcul actuel (IPIP) produit un score de névrosisme, et le graphique l'affiche tel quel. Afficher « Stabilité émotionnelle » au-dessus de ce score ferait lire l'inverse de la réalité : c'est une donnée erronée. Tant que le score n'est pas inversé dans le code, le seul libellé exact est « Névrosisme », qui est aussi celui de Rolland, y compris dans la documentation destinée aux ressources humaines ([fiche Hogrefe](https://www.hogrefe.com/fr/shop/media/downloads/sample-reports/FRA5602216_FicheRH_p.pdf)). Le passage à « Stabilité émotionnelle », plus acceptable en entreprise, est une décision d'Amine (§ 7) qui suppose d'inverser le score, l'axe du graphique et les textes d'interprétation. À chaque première occurrence auprès d'une personne évaluée, accompagner « Névrosisme » d'une glose : « sensibilité aux émotions négatives et au stress ; ce n'est pas un diagnostic ».
- **Arabe.** Les études arabes qui utilisent l'inventaire de Costa et McCrae dans la traduction de Badr Al-Ansari (1997) nomment les cinq facteurs « العصابية، الانبساطية، الانفتاح على الخبرة، المقبولية، يقظة الضمير » ([Université de Ouargla, dépôt institutionnel](https://dspace.univ-ouargla.dz/jspui/handle/123456789/26872), page vue dans les résultats du moteur, accès direct indisponible le 20/10/2026) ; une étude de l'Université de Damas emploie « الطيبة » à la place de « المقبولية » ([Revue de l'Université de Damas](https://journal.damascusuniversity.edu.sy/index.php/eduj/article/view/238/202)). Choix :
  - « يقظة الضمير » et non « اليقظة/التفاني » (actuel) : la barre oblique trahit une hésitation de traducteur, et « التفاني » (dévouement) déforme le sens ;
  - « المقبولية » et non « الطيبة » : « الطيبة » porte un jugement moral (bonté) qui devient blessant quand le score est bas (« طيبة منخفضة ») ; « المقبولية » est le terme technique majoritaire. On l'accompagne toujours de sa définition (coopération, confiance, souci d'autrui) ;
  - « الانفتاح على الخبرة » et non « الانفتاح » seul, sauf en forme courte ;
  - « العُصابية » ; son pendant, si Amine choisit l'inversion, serait « الاتزان الانفعالي ».

### 4.3 Les 30 facettes

Les libellés français du paquet `@bigfive-org/results` contiennent des contresens graves (« Conformisme » pour la grégarité, « Affection » pour l'émotivité, « Conscience de soi » pour la timidité sociale, « Respect » pour le sens du devoir, « Enthousiasme » pour la recherche de sensations). Ils s'affichent sur la page de résultat ; leur correction passe par une surcharge locale, comme `question-overrides.ts`, ce qui relève d'un travail de code hors de ce document. Lexique cible, établi sur les libellés IPIP ([ipip.ori.org](https://ipip.ori.org/30FacetNEO-PI-RItems.htm)) et alignés, quand le construit est le même, sur ceux de Rolland ([fiche Hogrefe](https://www.hogrefe.com/fr/shop/media/downloads/sample-reports/FRA5602216_FicheRH_p.pdf)) :

| Code | IPIP | Libellé actuel (paquet FR) | Français retenu | Libellé actuel (paquet AR) | Arabe retenu |
|---|---|---|---|---|---|
| N1 | Anxiety | Anxiété | Anxiété | القلق | القلق |
| N2 | Anger | Colère | Colère | الغضب | الغضب |
| N3 | Depression | Dépression | Humeur dépressive | الاكتئاب | المزاج الاكتئابي |
| N4 | Self-Consciousness | Conscience de soi | Timidité sociale | التدقيق بالذات | الحرج الاجتماعي |
| N5 | Immoderation | Immodération | Impulsivité | الانغماس | الاندفاعية |
| N6 | Vulnerability | Vulnérabilité | Vulnérabilité au stress | قابلية التأثر | الهشاشة أمام الضغط |
| E1 | Friendliness | Bienveillance | Chaleur relationnelle | الود | الودّ |
| E2 | Gregariousness | Conformisme | Sociabilité | الاجتماعية | الاجتماعية |
| E3 | Assertiveness | Assurance | Affirmation de soi | توكيد الذات | توكيد الذات |
| E4 | Activity Level | Activité | Niveau d'activité | النشاط | مستوى النشاط |
| E5 | Excitement-Seeking | Enthousiasme | Recherche de sensations | البحث عن الإثارة | البحث عن الإثارة |
| E6 | Cheerfulness | Gaieté | Gaieté | الابتهاج | البهجة |
| O1 | Imagination | Imagination | Imagination | الخيال | الخيال |
| O2 | Artistic Interests | Sens Artistique | Sensibilité artistique | الجماليات | الاهتمامات الفنية |
| O3 | Emotionality | Affection | Ouverture aux émotions | المشاعر | الانفتاح على المشاعر |
| O4 | Adventurousness | Aventure | Goût de la nouveauté | المغامرة | حبّ التجديد |
| O5 | Intellect | Intellect | Curiosité intellectuelle | الأفكار | الفضول الفكري |
| O6 | Liberalism | Libéralisme | Ouverture aux valeurs | التحرر | الانفتاح على القيم |
| A1 | Trust | Confiance | Confiance | الثقة | الثقة |
| A2 | Morality | Moralité | Franchise | الاستقامة | الصراحة |
| A3 | Altruism | Altruisme | Altruisme | الإيثار | الإيثار |
| A4 | Cooperation | Coopération | Coopération | التعاون | التعاون |
| A5 | Modesty | Modestie | Modestie | التواضع | التواضع |
| A6 | Sympathy | Sympathie | Compassion | التعاطف | التعاطف |
| C1 | Self-Efficacy | Auto-efficacité | Sentiment d'efficacité | الإحساس بالكفاءة | الإحساس بالكفاءة |
| C2 | Orderliness | Organisation | Sens de l'organisation | التنظيم | التنظيم |
| C3 | Dutifulness | Respect | Sens du devoir | الالتزام | الشعور بالواجب |
| C4 | Achievement-Striving | Persévérance | Recherche de réussite | النضال من أجل الإنجاز | السعي إلى الإنجاز |
| C5 | Self-Discipline | Auto-discipline | Autodiscipline | ضبط الذات | الانضباط الذاتي |
| C6 | Cautiousness | Prudence | Prudence | الحذر/الرويّة | الحذر |

Choix délicats :
- **O6 « Ouverture aux valeurs »** plutôt que « Libéralisme » ou « التحرر » : l'intitulé IPIP a une connotation politique, et Tenga a déjà reformulé les questions de cette facette pour le contexte marocain (`question-overrides.ts`). « Ouverture aux valeurs » est le libellé de Rolland pour le construit correspondant.
- **A2 « Franchise »** plutôt que « Moralité » : un score bas en « moralité » se lit comme une accusation. Le construit (sincérité, absence de manipulation) correspond à la « Franchise » de Rolland.
- **N3 « Humeur dépressive »** plutôt que « Dépression » : rappelle qu'il s'agit d'une tendance d'humeur et non d'un diagnostic clinique.

## 5. Lexique imposé et lexique interdit

### 5.1 Français

| Imposé | Interdit | Raison |
|---|---|---|
| questionnaire, questionnaire de personnalité | test (dans l'interface) | Il n'y a ni réussite ni échec ; « test » reste admis dans les titres d'onglet et le référencement, où c'est le mot que les gens cherchent |
| affirmation, question | item | Jargon |
| répondre, remplir le questionnaire | passer le test, passation | « Passation » est un terme de praticien, réservé aux écrans des consultants |
| vos résultats, votre profil | test réussi, test raté | Ni réussite ni échec |
| tendance, plutôt, vous vous décrivez comme | bon, mauvais, faible, fort, excellent, au-dessus de la moyenne | Pas de jugement de valeur ; aucune norme de population dans le calcul |
| score (seulement comme intitulé d'une valeur chiffrée) | votre score, votre note | Une note évoque un classement |
| restitution, entretien de restitution | feedback, debrief | Anglicismes |
| organisation, organisation cliente | entreprise cliente (sauf contexte commercial), client final | Les clients ne sont pas tous des entreprises |
| responsable de l'organisation | manager, RH (seul) | Rôle défini dans la conception |
| consultant Tenga, consultante Tenga | coach, psychologue | Ne pas revendiquer un titre réglementé sans vérification |
| Tenga Conseil (le cabinet), Tenga Assessments (le service) | BigFive, Bigfive web, b5 | Restes du projet d'origine |
| domaine public (IPIP) | open source, licence MIT, gratuit | Positionnement abandonné ; « gratuit » est une décision commerciale (§ 7) |
| invitation personnelle, lien personnel | aucune inscription requise | Faux dès le lot 1 |
| groupe, moyenne de groupe | comparez-vous aux autres, compatibilité | Fin de la comparaison publique |
| e-mail, adresse électronique | mail, email | Usage recommandé en français |

Jamais : « v1 », « MVP », « bêta », « non bloquant », acronymes non développés à la première occurrence, tiret cadratin.

### 5.2 Arabe

| Imposé | Interdit | Raison |
|---|---|---|
| استبيان الشخصية، الاستبيان | اختبار (dans l'interface) | Même raison qu'en français ; « اختبار » reste admis dans les titres d'onglet |
| عبارة، سؤال | بند | Jargon |
| نتائجك، ملفك الشخصي | درجتك، علامتك | Évoque une notation |
| يميل إلى، نسبيًّا، تصف نفسك بأنك | جيد، سيئ، ضعيف، ممتاز، أعلى من المتوسط | Pas de jugement ; aucune norme de population |
| جلسة عرض النتائج | فيدباك | Anglicisme |
| المؤسسة، المؤسسة المتعاقدة | الشركة (sauf contexte commercial) | Les clients ne sont pas tous des entreprises |
| مستشار Tenga، مستشارة Tenga | كوتش، أخصائي نفسي | Titre réglementé |
| Tenga Conseil و Tenga Assessments en caractères latins (§ 7) | بيغفايف، بي 5 | Restes du projet d'origine |
| ملك عام (pour l'IPIP) | مفتوح المصدر، مجاني | Positionnement abandonné |
| دعوة شخصية، رابط شخصي | لا يتطلب التسجيل | Faux dès le lot 1 |
| مجموعة، متوسط المجموعة | قارن نفسك بغيرك، التوافق بينكم | Fin de la comparaison publique |
| بدء، متابعة، عرض (noms verbaux) | ابدأ، اضغط، قم بـ | Impératifs genrés ou calques |
| البريد الإلكتروني | الإيميل | Registre |

## 6. Avant, après : exemples tirés des textes actuels

| Clé | Avant | Après | Ce qui change |
|---|---|---|---|
| `frontpage.description.top` (FR) | « Lgagnez à mieux vous connaître grâce à un test de personnalité gratuit et open source. » | « Mieux comprendre sa façon d'agir, pour mieux travailler ensemble. » | Coquille supprimée ; plus de « gratuit » ni d'« open source » ; la promesse porte sur l'usage professionnel |
| `frontpage.tests_taken` (FR) | « Plus de 4.000.000 personnes ont passé le test » | supprimé | Le chiffre appartient au site d'origine (bigfive-test.com) et est codé en dur : il est faux pour Tenga |
| `frontpage.cards.scientific.text` (FR) | « BigFive est un modèle psychologique scientifiquement validé et fiable. » | « Le modèle des cinq grands facteurs est l'un des cadres les plus étudiés en psychologie de la personnalité. Notre questionnaire reprend l'IPIP-NEO-120, placé dans le domaine public. » | Superlatif invérifiable remplacé par une formule prudente et une source nommée |
| `frontpage.compare.text1` (AR) | « قارن شخصيتك بشخصية شريكك أو زميلك أو صديقك » | obsolète | Comparaison publique supprimée avec l'espace privé |
| `facets.conscientiousness.title` (AR) | « اليقظة/التفاني » | « يقظة الضمير » | Terme de référence, sans hésitation affichée |
| `results.score` (FR) | « But » | « Score » | Contresens de traduction automatique (« score » au sens de « marquer un but ») |
| `results.important` (AR) | « !مهم » | « مهم: » puis obsolète | Ponctuation inversée à la main |
| `common.save` (AR) | « محل » | « حفظ » | « محل » signifie « boutique » |
| `test.restored` (FR) | « Vos réponses ont été restaurées. Cliquez ici pour » | « Nous avons retrouvé vos réponses sur cet appareil. Vous pouvez reprendre où vous en étiez ou » | Dit d'où viennent les réponses ; supprime « cliquez ici » |
| `getResult.explanation` (FR) | « … en tapant l'identifiant que vous avez obtenu, c'est-à-dire » | phrase complète, puis obsolète | La phrase s'arrête à l'écran sur « c'est-à-dire » : la suite (`getResult.idInput`) n'est pas affichée |
| Question O6 n° 28 (FR) | « Je suis ouvert aux idées qui remettent en question les traditions » | « J'accueille volontiers les idées qui remettent en question les traditions » | L'adjectif masculin exclut les répondantes |

## 7. Points qui exigent une décision d'Amine

Chaque point porte ma recommandation par défaut. Aucun de ces textes ne doit être publié avant décision.

1. **« Névrosisme » ou « Stabilité émotionnelle ».** Recommandation : à court terme, « Névrosisme » avec sa glose (seul libellé exact pour le score actuel) ; à moyen terme, inverser le score et adopter « Stabilité émotionnelle » / « الاتزان الانفعالي », plus acceptable dans un cadre professionnel et utilisé par de nombreux outils RH. L'inversion est un chantier de code et de textes d'interprétation.
2. **Gratuité.** Le site dit « totalement gratuit ». Pour Tenga, le service est vendu aux organisations. Recommandation : ne plus parler de prix sur le site ; au besoin, « sans frais pour la personne invitée ». Tarifs et formulation : décision commerciale.
3. **Promesses de confidentialité.** « Votre employeur ne voit jamais votre résultat individuel » est la règle décidée (§ 9.2 de la conception), mais elle n'est vraie qu'avec le lot 1 en production : aujourd'hui, tout détenteur d'un lien lit le résultat. Recommandation : n'afficher ces phrases qu'au déploiement du lot correspondant (colonne « Activation » de `textes.md`) et faire relire la notice d'information par un juriste ; la déclaration à la CNDP reste un préalable (conception § 7).
4. **Durées de conservation affichées.** Les valeurs par défaut (3 ans pour les résultats) sont réglables. Recommandation : afficher la valeur effectivement configurée, lue depuis les réglages, jamais un nombre écrit en dur dans un texte.
5. **Durée de réponse annoncée.** Le site dit « environ 10 minutes », chiffre hérité et non sourcé pour 120 affirmations. Recommandation : ne pas afficher de durée tant que la médiane réelle n'a pas été calculée sur les passations de Tenga (la durée est déjà enregistrée) ; en attendant, « sans limite de temps ».
6. **Affirmation scientifique.** Recommandation : formule prudente du § 6 et mention honnête de l'adaptation marocaine, dont la cohérence interne « reste à vérifier sur les passations réelles » (commentaire de `question-overrides.ts`). Ne jamais écrire « validé » pour la version adaptée.
7. **Nom de la marque en arabe.** Recommandation : garder « Tenga Assessments » et « Tenga Conseil » en caractères latins dans les textes arabes (usage courant des marques au Maroc, aucun risque de transcription concurrente) ; à défaut, choisir une graphie unique (« تنغا » ou « تينغا ») et l'imposer partout.
8. **Langues proposées.** Le site expose 43 langues et un bandeau « Translated in multiple languages », alors que seules les versions française et arabe sont adaptées et relues. Recommandation : limiter le site au français, à l'arabe et à l'anglais ; à défaut, retirer le bandeau.
9. **Reformulation des questions 28 et 88 (O6) et ajout de leur version arabe.** Changer une formulation modifie le questionnaire : il faut une nouvelle valeur de `QUESTIONNAIRE_VERSION`. Recommandation : valider les propositions de `textes.md` § 3.2 avec Tenga Conseil avant la première campagne réelle, pour ne pas mélanger deux versions dans les agrégats.
10. **Chiffres occidentaux en arabe.** Recommandation : 0-9 partout (usage marocain courant) ; à confirmer par Tenga Conseil.
11. **Titre de consultant.** Recommandation : « consultant Tenga » uniquement ; ne jamais écrire « psychologue » sans vérifier le titre de chaque intervenant.
12. **Échelles de réponse non équivalentes entre le français et l'arabe.** L'IPIP demande dans quelle mesure l'affirmation décrit la personne (« Very Inaccurate » à « Very Accurate »). Le paquet `@bigfive-org/questions` propose en français une échelle d'accord (« Fortement en désaccord » à « Fortement en accord », avec « Plutot » sans accent) et en arabe une échelle de fréquence (« لا تنطبق عليّ إطلاقاً » à « تنطبق عليّ دائماً »). Ce ne sont pas les mêmes questions posées aux deux publics, et un groupe mêlant les deux langues mélangerait deux mesures. Recommandation : aligner les deux langues sur l'échelle d'exactitude de l'IPIP (`textes.md` § 3.3), dans la même nouvelle version du questionnaire que le point 9.
13. **Rubrique Articles en français et en arabe.** Les 45 articles n'existent qu'en anglais et en norvégien (`web/posts/en`, `web/posts/no`). Recommandation : masquer le lien « Articles » et la section « Latest posts » en français et en arabe tant que Tenga Conseil n'a pas publié de contenu propre.

## 8. Sources

- International Personality Item Pool, autorisation d'usage (domaine public) : https://ipip.ori.org/newPermission.htm
- International Personality Item Pool, les 30 facettes de l'IPIP-NEO-120 (Johnson, 2014) : https://ipip.ori.org/30FacetNEO-PI-RItems.htm
- Hogrefe, fiche du NEO-PI-3, adaptation française de J.-P. Rolland (noms des domaines et facettes) : https://www.hogrefe.com/fr/shop/media/downloads/sample-reports/FRA5602216_FicheRH_p.pdf
- Plaisant et coll., validation de la BFI-Fr, *Annales médico-psychologiques*, 2010 : https://www.em-consulte.com/article/244774
- Wikipédia, Modèle des Big Five : https://fr.wikipedia.org/wiki/Mod%C3%A8le_des_Big_Five_(psychologie)
- Université de Ouargla, étude utilisant la traduction arabe d'Al-Ansari (1997) : https://dspace.univ-ouargla.dz/jspui/handle/123456789/26872 (vu via moteur de recherche ; accès direct impossible le 20/10/2026, à revérifier)
- Revue de l'Université de Damas, étude employant « الطيبة » : https://journal.damascusuniversity.edu.sy/index.php/eduj/article/view/238/202
