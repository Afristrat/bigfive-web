# Cadrage : le leadership dans les résultats individuels et le rapport de groupe

Demande d'Amine du 23/10/2026 : inclure dans les résultats individuels et le rapport de groupe « les éléments qui définissent les styles de leadership, inspirés du management situationnel de Paul Hersey et Kenneth Blanchard (modèle LEAD) ». Ce document établit ce qui est possible, ce qui ne l'est pas, et prépare l'option recommandée jusqu'au texte. Aucune ligne de code avant la décision d'Amine.

## 1. Ce que mesure LEAD, et pourquoi le questionnaire Tenga ne peut pas le produire

- LEAD (Leader Effectiveness and Adaptability Description) présente douze situations de management ; la personne choisit pour chacune la conduite qu'elle adopterait. Il mesure un **choix de comportement selon la maturité du collaborateur** (styles S1 à S4), pas un trait. Source : [description de l'instrument, SIRC](https://societyforimplementationresearchcollaboration.org/?p=8095).
- Le questionnaire Tenga (IPIP-NEO-120) mesure des **traits habituels**. Aucune table validée ne convertit un profil Big Five en style S1 à S4. En fabriquer une serait affirmer une donnée sans source (règle DÉFCON 1) et attribuer un style à une personne qui n'a répondu à aucune situation de management.

## 2. Marque et licence

- « Situational Leadership® » appartient à Leadership Studies, Inc. (The Center for Leadership Studies). L'accord de 2018 a mis fin, au terme de deux ans, à la licence de Blanchard pour « Situational Leadership® II ». Sources : [présentation du Center for Leadership Studies](https://situational.com/wp-content/uploads/2025/05/SLE_Overview_Final.pdf), [annonce de l'accord](https://situational.com/?p=26998).
- LEAD Self et LEAD Other sont diffusés sous licence ; aucune condition publique trouvée. Reproduire les situations, les styles nommés ou la marque sans licence exposerait Tenga.

## 3. Solidité scientifique

- La théorie situationnelle est décrite comme l'une des approches de l'efficacité managériale les moins étudiées : Thompson et Vecchio, « Situational leadership theory: A test of three versions », *The Leadership Quarterly*, 20(5), 837-848, 2009 ([notice](https://nla.no/en/research%20and%20development/find-publications/situational-leadership-theory-a-test-of-three-versions)). Résumé NON lu : leurs conclusions précises ne sont pas citées ici.
- Ce qui est établi pour le Big Five : méta-analyse de Judge, Bono, Ilies et Gerhardt, *Journal of Applied Psychology*, 87(4), 765-780, 2002, DOI 10.1037/0021-9010.87.4.765 ([texte](https://home.ubalt.edu/tmitch/642/Articles%20syllabus/judge%20bono%20llies%20gerhardt%20pers%20and%20ldrship%202002.pdf)) : 222 corrélations, 73 échantillons ; extraversion 0,31, conscienciosité 0,28, ouverture 0,24, névrosisme -0,24, agréabilité 0,08 ; corrélation multiple 0,48. Ce sont des liens **de population** avec l'émergence et l'efficacité perçue du leader, pas des prédictions individuelles.

## 4. Contraintes de la voix de marque

- § 2.7 : décrire, jamais juger ; aucune comparaison avec « la moyenne » ou « les autres ».
- § 2.8 : jamais d'aptitude ni de compétence.
- Conséquence : interdit d'écrire « vous avez un profil de leader », « votre score prédit votre efficacité », ou de citer les corrélations à la personne. Autorisé : décrire ce que ses tendances peuvent apporter dans un rôle de pilotage et ce qui peut demander de l'attention, en hypothèses à vérifier en entretien.

## 5. Options

| Option | Contenu | Coût et risque |
|---|---|---|
| **A (recommandée)** | Section « Piloter une équipe : appuis et points d'attention » dérivée des cinq domaines déjà mesurés, en hypothèses ; aucune question ajoutée, aucun style nommé | Rédaction et relecture (Nezha, natif arabe) ; aucun coût de licence |
| B | Module situationnel officiel sous licence LEAD | Contrat et prix à négocier par Amine avec le Center for Leadership Studies ; questionnaire supplémentaire |
| C | Mises en situation propres à Tenga, « inspirées de », sans la marque | Instrument non validé ; à présenter comme support de conversation seulement |

## 6. Option A, prête à écrire

### 6.1 Rapport individuel

Placement : nouvelle section du rapport individuel (`web/src/lib/rapports/individuel.ts`, composant `web/src/components/rapports/rapport-individuel.tsx`, catalogues `web/src/messages/espace/rapport.{fr,en,ar}.js`) et du rapport cabinet (`docs/design/rapport-cabinet/rapport/niveau1-individuel.mjs`, section `n1-pilotage` après le plan de développement). Un bloc par domaine dont le niveau est « plutôt haut ou haut » ou « plutôt bas ou bas » ; rien au milieu de l'échelle. Ouverture de section, fixe :

> Cette section ne dit pas si vous êtes fait pour diriger : aucun questionnaire de personnalité ne le dit. Elle propose des pistes sur ce que vos tendances peuvent apporter quand vous pilotez une équipe, et sur ce qui peut demander de l'attention. Ce sont des hypothèses à vérifier avec votre consultant.

Projets de blocs (français ; anglais et arabe à écrire ensuite, l'arabe rédigé directement et relu par un natif) :

| Domaine | Niveau | Ce que cela peut apporter | Ce qui peut demander de l'attention |
|---|---|---|---|
| Extraversion | haut | Prendre la parole tôt, donner de l'élan, rester visible pour l'équipe | Laisser la place aux personnes plus discrètes avant de trancher |
| Extraversion | bas | Écouter longuement, réfléchir avant d'annoncer, échanger en tête à tête | Rendre visibles vos décisions et votre présence, surtout dans les périodes chargées |
| Conscienciosité | haut | Fixer des échéances claires, suivre les engagements, tenir le cap | Accepter qu'un travail soit fait autrement que vous ne l'auriez fait |
| Conscienciosité | bas | Ajuster vite quand le plan change, laisser de la latitude | Écrire les engagements et les dates, pour vous comme pour l'équipe |
| Ouverture | haut | Proposer des idées nouvelles, accueillir les essais | Dire ce qui ne changera pas, pour que l'équipe garde des repères |
| Ouverture | bas | Stabiliser les méthodes éprouvées, rassurer en période d'incertitude | Laisser une place aux essais proposés par l'équipe |
| Névrosisme | haut | Repérer tôt les risques et les signaux faibles | Prendre un temps de recul avant de réagir sous tension ; partager le poids des décisions difficiles |
| Névrosisme | bas | Garder son calme sous pression, stabiliser l'équipe | Prendre au sérieux l'inquiétude des autres, même quand vous ne la ressentez pas |
| Agréabilité | haut | Créer la confiance, faciliter la coopération | Nommer les désaccords et prendre les décisions qui déplaisent |
| Agréabilité | bas | Dire franchement ce qui ne va pas, défendre une position | Vérifier que la franchise est reçue comme une aide, pas comme une attaque |

Pour le consultant : même texte à la troisième personne, plus une question d'entretien par bloc (« Dans quelle situation récente avez-vous… ? »).

### 6.2 Rapport de groupe

La synthèse de groupe ne publie que des moyennes de domaine au-dessus du seuil d'anonymat (aucune donnée individuelle). Ajout possible sans toucher à la confidentialité : sous le tableau, une phrase par domaine dont la moyenne du groupe est « plutôt haute ou haute » ou « plutôt basse ou basse », reprenant la colonne « Ce qui peut demander de l'attention » à l'échelle de l'équipe (exemple : « Ouverture plutôt basse dans ce groupe : pensez à garder une place aux essais proposés par l'équipe »). Aucune lecture de style, aucune personne nommée.

### 6.3 Ce que l'option A ne fait pas

Elle ne nomme aucun style (S1 à S4, « directif », « délégatif »), n'utilise pas la marque Situational Leadership®, ne cite aucune corrélation à la personne, ne classe personne.

## 7. Décision d'Amine (23/10/2026)

Directive ANNULÉE : « Je dois affirmer le style de leadership donc on annule ma directive. » Le besoin était d'affirmer un style ; ni le questionnaire Tenga (§ 1), ni la licence (§ 2), ni la voix de marque (§ 4) ne le permettent. Aucune des options A, B, C n'est retenue ; ne rien coder sur ce sujet sans nouvelle demande.
