# Audit des textes hors langue de la page

Date de l'audit : 2026-10-20. Cible : https://tenga.ai-mpower.com (production). Audit en lecture seule : aucun fichier du dépôt modifié, aucun serveur local, aucun test complet passé sur la production (aucune écriture en base).

## 1. Routage réel (vérifié par curl en suivant les redirections)

| URL demandée | Résultat | Langue servie (`<html lang>`) |
|---|---|---|
| `/` | 200, sans redirection | `en`, `dir=ltr` |
| `/en` | 200 après 1 redirection vers `/` | `en` |
| `/fr` | 200, sans redirection | `fr`, `dir=ltr` |
| `/ar` | 200, sans redirection | `ar`, `dir=rtl` |
| `/xyz`, `/fr/xyz` | 404 | selon le préfixe |

Constat : le français n'est PAS sans préfixe. La langue sans préfixe est l'anglais (`defaultLocale: 'en'`, `localePrefix: 'as-needed'` dans `web/src/middleware.ts` et `web/src/navigation.ts`). Le français est sous `/fr`, l'arabe sous `/ar`. Un visiteur qui arrive sur `/` voit donc la version anglaise, quelle que soit sa langue de navigateur à ce stade de l'audit (la négociation de langue du navigateur n'a pas été testée).

## 2. Méthode

- Script Playwright Node ESM (Chromium, 1440 px, puis 390 px pour le menu mobile), exécuté depuis `web/` puis supprimé. Brouillon : `C:\Users\amans\AppData\Local\Temp\claude\C--projets-Tenga-assessments\776563de-8514-41fa-9a9d-5b5e0f95e4c6\scratchpad\audit-i18n.mjs`.
- Pages parcourues dans chaque langue (fr, ar, en) : `/`, `/test` (13 premières questions, réponse par touches 1 à 5 puis bouton Suivant), `/about`, `/faq`, `/privacy`, `/articles` et les 2 premiers articles (`vulnerability_and_stress`, `help_your_kids_thrive`), `/compare`, `/xyz` (404), `/result/000000000000000000000000` (identifiant inexistant, lecture seule), menu de langue, menu mobile 390 px. Au total 60 captures, environ 5 300 nœuds de texte.
- Extraction : tous les nœuds texte visibles (arbre DOM), plus `placeholder`, `aria-label`, `title`, `alt`, `<title>` et meta description. Classement par heuristique : lettres arabes, mots-outils français et anglais, accents. Chaque phrase classée « autre langue » a été relue à la main ; les faux positifs (Tenga Conseil, Navigation principale, Six facettes, etc.) sont écartés.
- Passe statique : comparaison clé par clé de `web/src/messages/{fr,ar,en}.js`, de `node_modules/@bigfive-org/results/lib/data/{fr,ar,en}` et de `node_modules/@bigfive-org/questions/data/{fr,ar,en}`.
- Limites : la page de résultat réelle n'a pas été ouverte (écriture en base interdite) ; elle est auditée par lecture du code et des données du paquet. Les pages `/compare/<ids>` (comparaison réelle) idem. Les 120 questions n'ont pas été toutes parcourues en navigateur, mais les 120 sont vérifiées dans les données.
- Attention, dépôt en mouvement : pendant l'audit (vers 13 h 18) la session propriétaire du dépôt a supprimé `web/src/app/[locale]/compare/` et `web/src/components/share-bar-buttons.tsx` / `email-modal.tsx` du répertoire de travail. Les lignes citées pour ces fichiers ont été relevées avant leur disparition. La production, elle, sert encore `/compare` (relevé du jour). Les corrections correspondantes deviennent sans objet si ces fichiers sont définitivement retirés.

## 3. Résultat global

| Zone | fr | ar | en |
|---|---|---|---|
| En-tête, navigation, sélecteur de langue | 0 faute | 0 faute | 0 faute |
| Pied de page | 0 faute | 0 faute | 0 faute |
| Accueil, À propos, FAQ, 404, résultat inexistant | 0 faute | 0 faute | 0 faute |
| Test (13 questions relevées + 120 en données) | 0 faute | 0 faute | 0 faute |
| Confidentialité (`/privacy`) | 18 phrases en anglais | 18 phrases en anglais | sans objet |
| Comparer (`/compare`) | 6 chaînes en anglais | 6 chaînes en anglais | sans objet |
| Liste des articles (`/articles`) | environ 87 chaînes en anglais (45 titres, 45 résumés, moins les doublons) | environ 90 | sans objet |
| Pages d'article | environ 60 phrases en anglais par article (118 relevées sur 2 articles) | environ 65 par article (130 relevées sur 2) | sans objet |
| Résultat (lecture du code et des données) | 0 texte d'interprétation en anglais | 20 textes d'interprétation en anglais | sans objet |
| Fenêtre d'envoi par e-mail du résultat (code) | 8 chaînes en anglais | 8 chaînes en anglais | sans objet |
| Comparaison réelle `/compare/<ids>` (code) | 4 chaînes en anglais | 4 chaînes en anglais | sans objet |
| Messages dormants (fichiers de messages) | 33 clés identiques à l'anglais, non affichées | 29 clés idem | sans objet |

La page anglaise (`/`) ne contient aucun texte français ou arabe : les seuls éléments d'une autre langue y sont les noms de langue du sélecteur (Français, العربية), qui sont des noms propres attendus.

## 4. Détail par page, classé par gravité

Légende de gravité : 1 = visible en haut de page, 2 = dans le test, 3 = dans le résultat, 4 = contenu de page ou pied de page.

### Gravité 1 : visible en haut de page

Aucune faute. Navigation, sélecteur de langue (FR/AR/EN avec les noms Français, العربية, English, conformes à l'usage), liens d'en-tête et `aria-label` sont dans la langue de la page, y compris au format mobile 390 px. `<title>` et meta description sont dans la langue de la page, sauf sur les articles (voir gravité 4).

### Gravité 2 : dans le test

Aucune faute sur les 13 premières questions en fr, ar et en (consigne, intitulés « Affirmation n », échelle de réponse, boutons Précédent / Suivant, message « Choisissez une réponse pour passer à la suite », barre de progression). Données : les 120 questions et les 5 choix de réponse de `@bigfive-org/questions` existent en fr et en ar, 0 libellé resté en anglais, 0 libellé arabe sans lettre arabe. Les touches 1 à 5 sélectionnent la réponse sans avancer (comportement voulu, `survey.tsx` lignes 134 à 147) ; il faut ensuite activer « Suivant ».

### Gravité 3 : dans le résultat

| URL | Phrase fautive | Langue attendue | Langue trouvée | Fichier source | Correctif proposé |
|---|---|---|---|---|---|
| `/ar/result/<id>` | Description de chacun des 5 domaines, par exemple « Open people are intellectually curious, appreciative of art, and sensitive to beauty... » (injectée par `dangerouslySetInnerHTML`) | ar | en | `web/node_modules/@bigfive-org/results/lib/data/ar/{openness_to_experience,conscientiousness,extraversion,agreeableness,neuroticism}.js`, clé `description` ; affichage `web/src/app/[locale]/result/[id]/domain.tsx:101` | Le dossier `ar` du paquet est une copie de l'anglais pour ces champs. Traduire les 5 descriptions en arabe et les fournir par une surcharge locale (comme `web/src/lib/question-overrides.ts`) plutôt que d'éditer `node_modules` |
| `/ar/result/<id>` | Texte d'interprétation du niveau, 3 par domaine, soit 15 : « Your score on Openness to Experience is low, indicating you like to... » (faible, moyen, élevé pour O, C, E, A, N) | ar | en | mêmes fichiers, clés `results[0..2].text` ; affichage `domain.tsx:94` | Traduire les 15 textes et les fournir par la même surcharge locale |
| `/fr/result/<id>` | Aucun texte d'interprétation en anglais. Trois titres identiques à l'anglais (Imagination, Intellect, Extraversion) sont des mots français valides | fr | fr | `web/node_modules/@bigfive-org/results/lib/data/fr/*.js` | Aucun. Le français est complet : 110 chaînes sur 110, 0 hors langue détectée |
| `/en/result/<id>` | Aucune | en | en | | |

Mécanisme du repli : `getTestResult` (`web/src/actions/index.ts` lignes 41 à 70) choisit la langue de l'interprétation dans la liste du paquet, puis `get-template.js` retombe sur `data/en` seulement si le dossier de langue est absent. Pour l'arabe le dossier existe mais contient de l'anglais, donc aucun repli visible dans le code : l'anglais est servi comme s'il s'agissait d'arabe. Au total 20 chaînes (5 descriptions + 15 textes de niveau) sur 110 sont en anglais dans `ar`, soit 18 %. Les 30 libellés de facettes et leurs textes sont en arabe. Les libellés de domaine et de facette affichés viennent de `web/src/lib/domain-labels.ts` (fr, ar, en tous présents).

Autres textes de la zone résultat, à partir du code (avant suppression de ces fichiers par la session propriétaire) :

| URL | Phrase fautive | Langue attendue | Langue trouvée | Fichier source | Correctif proposé |
|---|---|---|---|---|---|
| `/fr/result/<id>`, `/ar/result/<id>` | Fenêtre d'envoi par e-mail : « Send the link to mail », « We will send the link to the email you provide. We will not spam you or use your email for any other purposes. », « Email », « Enter your email », « Please enter a valid email address », « Close » (et le bouton d'envoi) | fr / ar | en | `web/src/components/email-modal.tsx` lignes 53 à 90 (supprimé du répertoire de travail pendant l'audit) | Si la fonction est conservée, déplacer ces chaînes dans `messages/{fr,ar,en}.js`. Sinon, retrait déjà en cours : rien à traduire |
| idem | Retour de l'envoi : « Sent successfully! », « Error sending email! » | fr / ar | en | `web/src/actions/index.ts:131` et `:205` | Renvoyer un code d'état et traduire côté client |
| idem | Objet et corps du courriel : « Your Big Five personality test result », « Here is the link to your Big Five personality test result: ... » | langue du résultat | en | `web/src/actions/index.ts` lignes 180 à 182 | Passer la langue à `sendEmail` et traduire |
| `/fr/compare/<ids>`, `/ar/compare/<ids>` | « Overview », « Edit Comparison », description de partage « Explore our detailed comparison of personality traits » | fr / ar | en | `web/src/app/[locale]/compare/[id]/page.tsx:106` et `:111`, `compare-edit.tsx:19` et `:36` (supprimés pendant l'audit) | Traduire ou retirer la route |

### Gravité 4 : contenu de page

#### `/fr/privacy` et `/ar/privacy` (18 phrases en anglais chacune)

Fichier source : `web/src/app/[locale]/privacy/page.tsx` (texte en dur, aucune clé de messages, lignes 9 à 60). Correctif unique : passer la page par `getTranslations('privacy')`, ajouter l'espace de noms dans `fr.js`, `ar.js`, `en.js`, et faire valider le texte juridique par Amine (décision de contenu, hors périmètre technique).

| URL | Phrase fautive | Attendue | Trouvée |
|---|---|---|---|
| `/fr/privacy`, `/ar/privacy` | Privacy | fr / ar | en (ligne 9) |
| idem | Our privacy policy | fr / ar | en (ligne 10) |
| idem | This privacy policy will explain how we use the personal data we collect from you when you use our website. | fr / ar | en |
| idem | What data do we collect? | fr / ar | en |
| idem | When you submit the test we collect the following data | fr / ar | en (ligne 17) |
| idem | Choosen test language (faute d'anglais d'origine) | fr / ar | en (ligne 19) |
| idem | Test answers | fr / ar | en (ligne 20) |
| idem | Time spent on the test | fr / ar | en (ligne 21) |
| idem | Datetime of submitted test | fr / ar | en (ligne 22) |
| idem | If you ask us to e-mail you the link to a result, the address you enter is only used to send that message through our e-mail provider, Resend, and is not stored in our database. | fr / ar | en |
| idem | We do not use analytics services, advertising or tracking cookies. | fr / ar | en |
| idem | How do we collect your data? | fr / ar | en |
| idem | Your web browser automatically sends information to our server when you load a page. This can i.e. be information about which browser and version you are using and your Internet address (IP-address)... | fr / ar | en |
| idem | When you submit the test the information you provide (described above) is stored in our database. | fr / ar | en |
| idem | How will we use your data? | fr / ar | en |
| idem | We will create statistical, aggregated data from the test results for analytical purposes. | fr / ar | en |
| idem | How to contact us? | fr / ar | en |
| idem | If you have any questions about this privacy policy, please contact the operator of this website. (le lien « contact » n'apparaît que si `supportEmail` est défini) | fr / ar | en (lignes 53 à 60) |

Point à vérifier par Amine : le texte évoque l'envoi du lien par e-mail via Resend. Cette fonction est en cours de retrait dans le répertoire de travail ; la politique devra rester exacte quand la production sera redéployée.

#### `/fr/compare` et `/ar/compare`

| URL | Phrase fautive | Attendue | Trouvée | Fichier source | Correctif proposé |
|---|---|---|---|---|---|
| `/fr/compare`, `/ar/compare` | Name (champ de saisie, libellé) | fr / ar | en | `compare-people.tsx:174` et `:305` | Clé de messages `getCompare.name` |
| idem | ID | fr / ar | en | `compare-people.tsx:193` et `:321`, `result/get-result.tsx:50` | « Identifiant » / « المعرّف » |
| idem | NAME, ACTIONS (en-têtes de colonnes, lus par les lecteurs d'écran) | fr / ar | en | `compare-people.tsx:55` à `:66` | Clés de messages |
| idem | No rows to display. | fr / ar | en | `compare-people.tsx:222` | « Aucune personne ajoutée. » / équivalent arabe |
| idem | List of persons to compare (aria-label) | fr / ar | en | `compare-people.tsx:216` | Clé de messages |
| `/fr/compare`, `/ar/compare`, éléments non visibles à l'ouverture | Messages d'erreur « Only letters allowed. Min 2 and max 30 characters. » (`:187`, `:316`), « Please enter a valid ID. » (`:330`), `aria-label` « Open Menu », « Static Actions », « Edit item », « Delete item », « Edit », « Delete » (`:234` à `:271`) | fr / ar | en | `compare-people.tsx` | Clés de messages |

Remarque : le placeholder « Arthur Dent » est un nom propre fictif, acceptable ; à rendre local (nom marocain) si la page est conservée.

#### `/fr/articles` et `/ar/articles` (liste)

| URL | Phrase fautive | Attendue | Trouvée | Fichier source | Correctif proposé |
|---|---|---|---|---|---|
| `/fr/articles`, `/ar/articles` | 45 titres (par exemple « Book review: Quiet Power by Susan Cain », « Unlocking Global Leadership Potential ») | fr / ar | en | `web/posts/en/*.md` champ `title` ; repli dans `web/src/lib/helpers.ts:38` et `:42` (`translatedLanguages = ['no']`, tout le reste retombe sur `en`) | Soit produire `posts/fr/` et `posts/ar/` (45 articles, validés), soit masquer l'entrée « Articles » et la route dans ces deux langues, comme le recommande déjà la décision 13 de `docs/design/textes.md` (ligne 62) |
| idem | 45 résumés (par exemple « This article explores why some individuals are more vulnerable... ») | fr / ar | en | `posts/en/*.md` champ `description` | idem |
| idem | Les dates sont correctement localisées (« 19 octobre 2024 ») : seul le texte est anglais | | | | |

Le répertoire `posts/` ne contient que `en` (45 fichiers) et `no` (45 fichiers). Le norvégien existe mais n'est pas une langue servie.

#### Pages d'article (`/fr/articles/<slug>`, `/ar/articles/<slug>`)

| URL | Phrase fautive | Attendue | Trouvée | Fichier source | Correctif proposé |
|---|---|---|---|---|---|
| `/fr/articles/vulnerability_and_stress`, `/ar/...` | Titre, résumé, nom d'auteur et bio, 25 paragraphes ou intertitres (« Definition of Vulnerability », « Types of Stressors », « Conclusion: Why Are Some People More Vulnerable? »...), références, 15 mots-clés (« vulnerability », « resilience »...) | fr / ar | en | `web/posts/en/vulnerability_and_stress.md` | idem liste |
| `/fr/articles/help_your_kids_thrive`, `/ar/...` | Titre, résumé, 12 intertitres (« Embracing Nature's Classroom », « Crafting a Serene Bedtime Ritual »...), paragraphes, appel « Learn more about yourself for free at BigFive Test today! », 13 mots-clés | fr / ar | en | `web/posts/en/help_your_kids_thrive.md` | idem liste. Cet appel pointe vers un service tiers nommé « BigFive Test » : à relire (DÉFCON 1) |
| idem | `<title>` mixte : « Simple Self-Care Practices To Help Your Kids Thrive - Test de personnalité Big Five \| Tenga Assessments » (fr) et « ... - اختبار الشخصية وفق العوامل الخمسة الكبرى \| Tenga Assessments » (ar) | fr / ar | titre anglais + suffixe localisé | `web/src/app/[locale]/articles/[slug]/page.tsx` (génération du titre) | Résolu si l'article est traduit ; sinon `lang="en"` sur le bloc et `alternate` canonique vers la version anglaise |
| idem | Absence de `lang="en"` sur les blocs anglais dans une page `lang="fr"` ou `lang="ar"` | | | `articles/[slug]/page.tsx` | Ajouter `lang` et `dir="ltr"` sur le conteneur de l'article tant qu'il reste en anglais (lecteurs d'écran, césure, direction du texte arabe) |

Les 5 articles sur les traits de personnalité (Agreeableness, Conscientiousness, Extraversion, Neuroticism, Openness) sont aussi en anglais dans la liste.

#### Pied de page

Aucune faute : « © 2026 Tenga Conseil » dans toutes les langues, liens de pied de page traduits.

## 5. Fichiers de messages : clés dormantes en anglais

`web/src/messages/fr.js` et `ar.js` ont les mêmes 192 clés que `en.js` (aucune clé manquante, donc le repli par `web/src/i18n.ts` n'est pas sollicité). En revanche 33 clés de `fr.js` et 29 de `ar.js` sont identiques à l'anglais. Après vérification par `grep` des `getTranslations`/`useTranslations` de `web/src`, les espaces de noms `form`, `big_five`, `openness_to_experience`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` (sous-clés `seo`) ne sont appelés nulle part : ce sont des clés héritées du dépôt d'origine, jamais affichées.

| Fichier | Clés concernées | Lignes | Correctif proposé |
|---|---|---|---|
| `web/src/messages/fr.js` | `form.*` (information, informationText, mostAccurate, readMoreAbout, privacy, nextButton, declineButton, male, female, age, yearsOld, ageWarning, gender, confirmInfo, confirm, toTestButton, iama), `big_five.*`, `<domaine>.seo.*` | 134 à 225 environ | Purger (règle « purger l'obsolète ») dans `fr.js`, `ar.js` et `en.js`, après confirmation qu'aucun test n'y fait référence |
| `web/src/messages/ar.js` | idem | 133 à 224 environ | idem |

Faux positifs écartés : `radar.score` (« Score »), `toolbar.articles` (« Articles »), `extraversion.title` (« Extraversion ») sont des mots français valides. Dans `ar.js`, `shareLinks.shareFacebook` et `shareTwitter` mêlent marque latine et texte arabe, c'est attendu (`share*` est lui aussi peu utilisé : `grep` ne trouve que les messages eux-mêmes, à confirmer avant purge).

## 6. Synthèse chiffrée par page et par langue

Nombre de phrases fautives (langue différente de celle de la page), sans compter les faux positifs.

| Page | fr | ar | en |
|---|---|---|---|
| `/` | 0 | 0 | 0 |
| `/test` (13 questions + données des 120) | 0 | 0 | 0 |
| `/about` | 0 | 0 | 0 |
| `/faq` | 0 | 0 | 0 |
| `/privacy` | 18 | 18 | sans objet |
| `/articles` | 87 | 90 | sans objet |
| 2 articles échantillonnés | 118 | 130 | sans objet |
| `/compare` | 6 | 6 | sans objet |
| 404 (`/xyz`) et résultat inexistant | 0 | 0 | 0 |
| Menus (langue, mobile 390 px) | 0 | 0 | 0 |
| Résultat (données du paquet) | 0 | 20 | sans objet |
| Fenêtre e-mail du résultat (code, avant retrait) | 8 | 8 | sans objet |
| Comparaison `/compare/<ids>` (code, avant retrait) | 4 | 4 | sans objet |

Par gravité :

1. Visible en haut de page : 0 en fr, 0 en ar.
2. Dans le test : 0 en fr, 0 en ar.
3. Dans le résultat : 0 en fr, 20 en ar (interprétations), plus la fenêtre e-mail et la comparaison si elles sont conservées.
4. Contenu de page et pied de page : privacy 18 + 18, articles environ 205 + 220 (liste et 2 articles échantillonnés ; tout le corpus de 45 articles est concerné), compare 6 + 6 ; pied de page 0.

Réponse à la demande « textes anglais résiduels sur /fr » : la page française est irréprochable sur l'accueil, le test, À propos, la FAQ, la 404 et le résultat. Les résidus anglais sont limités à `/fr/privacy`, `/fr/compare`, `/fr/articles` (liste et pages) et aux dormants non affichés des messages.

## 7. Ordre de correction recommandé (fenêtre ouverte d'abord)

1. Interprétation du résultat en arabe (20 chaînes) : c'est le seul défaut dans le parcours principal du produit. Le contenu psychologique en arabe est une décision de contenu d'Amine (traduction validée), pas une traduction à improviser.
2. `/privacy` en fr et ar : obligation d'information du visiteur, texte juridique à faire valider (max RGPD, CNDP).
3. Articles : décider entre traduire, ou masquer « Articles » et la route en fr et ar (décision 13 de `docs/design/textes.md` ; recommandation actuelle : masquer).
4. `/compare` : traduire ou retirer, selon le sort de la route (déjà supprimée du répertoire de travail, toujours en ligne).
5. Purge des clés dormantes de `messages/*.js`.

## 8. Reproductibilité

Brouillons conservés dans le dossier de session : `audit-i18n.mjs` (parcours), `audit-test.mjs` (13 questions), `classify.py` et `agg.py` (classement), `res.cjs`, `res2.cjs`, `msg.mjs` (comparaison statique des données). Les données brutes (`raw.json`, `raw-test.json`) y sont aussi. Rien n'a été écrit dans `web/` (copies temporaires supprimées après exécution).
