// Niveau 5 du rapport « cabinet » : plan d’accompagnement intégré. Fonctions pures, aucun aléa, aucun modèle.
// Tout nombre vient de faits ou du cas, formaté par fmt(). Toute lecture est une hypothèse avec confiance et vérification.
import { fmt, liste, paragraphe, recommandation, section, personne, NIVEAU_FR, NOM_DOMAINE } from './outils.mjs';

/** Familles d’actions : chaque texte de recommandation commence par l’une d’elles. */
export const FAMILLES = ['Coaching', 'Mentorat', 'Formation', 'Organisation', 'Mesure'];

const TYPE_FR = { reglementation: 'réglementation', delai: 'délai', budget: 'budget', ressources: 'ressources', culture: 'culture', heritage: 'héritage', syndical: 'syndical' };
const INTERDEP_FR = { 'mise-en-commun': 'mise en commun', sequentielle: 'séquentielle', reciproque: 'réciproque' };
const CONSULTANT = 'consultant qualifié désigné par Tenga Conseil';

const nomDomaine = (d) => NOM_DOMAINE[d];
const nette = (fonction) => fonction.replace(/\s*\((?:fictif|fonction fictive)\)\s*$/, '');

export function construire({ cas, faits, bib }) {
  const lib = (code) => {
    const f = bib.facettes.find((x) => x.code === code);
    if (!f) throw new Error(`facette inconnue ${code}`);
    return f.libelle.fr;
  };
  const facette = (code) => `${code} (${lib(code)})`;
  const role = (code) => personne(cas, code).role_equipe;
  const roles = (codes) => liste(codes.map(role));
  const resp = (codes) => `${roles(codes)}, avec le ${CONSULTANT}`;
  const ok = (codes, niveau) => codes.every((c) => personne(cas, c).consentements[niveau] === true);
  const toutes = cas.personnes.map((p) => p.code);
  const echeances = cas.tache.echeances;
  const dures = cas.contraintes.filter((c) => c.durete === 'dure');
  const ct = (id) => {
    const c = cas.contraintes.find((x) => x.id === id);
    if (!c) throw new Error(`contrainte inconnue ${id}`);
    return c;
  };

  // ---------------------------------------------------------------- faits mobilisés
  const tensions = [];
  for (const pe of cas.personnes) {
    if (!pe.consentements.individuel) continue;
    const f = faits.personnes[pe.code];
    for (const t of f.tensions) tensions.push({ code: pe.code, ...t, valeurs: t.facettes.map((k) => f.facettes[k].moy) });
  }
  tensions.sort((a, b) => b.ecart - a.ecart);
  const tensionTop = tensions[0] ?? null;
  const tensionSeconde = tensionTop ? tensions.find((t) => t.domaine !== tensionTop.domaine) ?? null : null;

  const relation = (nature) => {
    const r = cas.relations.find((x) => x.nature === nature);
    if (!r) return null;
    const f = faits.relations.find((x) => x.id === r.id);
    const top = f.facettes_notables.reduce((m, x) => (!m || x.ecart > m.ecart ? x : m), null);
    return { ...r, top, niveauA: top && NIVEAU_FR[top.niveau_a], niveauB: top && NIVEAU_FR[top.niveau_b] };
  };
  const relCo = relation('co-direction');
  const relMentorat = relation('mentorat');
  const relClient = relation('client-fournisseur');

  const ecartsBinomes = faits.relations
    .map((r) => ({ id: r.id, ...r.facettes_notables.reduce((m, x) => (!m || x.ecart > m.ecart ? x : m), null) }))
    .filter((r) => r.k && ok([r.id.split('-')[0], r.id.split('-')[1]], 'binome'))
    .sort((a, b) => b.ecart - a.ecart)
    .slice(0, 3);

  const etendues = Object.entries(faits.equipe.facettes_etendue).sort((a, b) => b[1] - a[1]);
  const [large1, large2] = etendues;
  const toutesDiverses = Object.values(faits.equipe.domaines).every((d) => d.dispersion === 'diverse');
  const equipeOk = ok(toutes, 'equipe');
  const orgOk = ok(toutes, 'organisation');
  const etenduC = faits.equipe.facettes_etendue;
  const nSites = cas.interculturel.sites.length;
  const nLangues = cas.interculturel.langues_travail.length;
  const nFuseaux = cas.interculturel.fuseaux.length;

  // ---------------------------------------------------------------- actions (recommandation + paragraphe de plan)
  const actions = [];
  const ajouter = (a) => actions.push(a);

  // Coaching individuel sur la tension la plus nette
  if (tensionTop) {
    const [ka, kb] = tensionTop.facettes;
    const [va, vb] = tensionTop.valeurs;
    ajouter({
      section: 'coaching',
      paragraphe: {
        texte: `Coaching individuel de ${tensionTop.code}, centré sur la tension interne la plus nette entre ${facette(ka)} et ${facette(kb)} (écart de ${fmt(tensionTop.ecart)} points, valeurs de ${fmt(va)} et de ${fmt(vb)} sur l’échelle de 1 à 5). Format proposé : trois séances courtes, une toutes les deux semaines, intégrées au temps de travail puisque l’équipe n’est mobilisée qu’aux sept dixièmes de son temps (${ct('CT-07').id}). Objectif : que la personne formule elle-même comment cette tension l’aide ou la gêne sur le lancement, puis choisisse un engagement d’essai d’un mois. Le coach ne conclut pas sur la personne.`,
        confiance: 'moyenne',
        verification: `Demander à ${tensionTop.code}, en entretien, une situation récente du projet où ces deux facettes ont tiré dans des sens opposés, et ce qui en est résulté.`
      },
      rec: {
        texte: `Coaching individuel : proposer à ${tensionTop.code} trois séances courtes autour de la tension entre ${facette(ka)} et ${facette(kb)}, avec un engagement d’essai choisi par la personne.`,
        donnee: `Tension la plus nette du cas : écart de ${fmt(tensionTop.ecart)} points entre ${ka} (valeur ${fmt(va)}) et ${kb} (valeur ${fmt(vb)}), règle ${tensionTop.regle}.`,
        contexte: `Tâche de projet avec lancement dans les 9 mois (${ct('CT-05').id}) ; équipe mobilisée aux sept dixièmes (${ct('CT-07').id}) : séances courtes et intégrées au travail.`,
        risque: 'La tension peut être lue comme un défaut de la personne ; le coaching reste une exploration choisie par elle, privée, sans restitution au hiérarchique sans son accord.',
        responsable: resp([tensionTop.code]),
        horizon: '30 jours',
        indicateur: `Engagement d’essai formulé par ${tensionTop.code} à la deuxième séance, puis auto-évaluation guidée de son effet à 30 jours et à 90 jours (source : compte rendu remis à la personne seule).`
      },
      ok: ok([tensionTop.code], 'individuel')
    });
  }

  // Coaching de binôme de co-direction
  if (relCo && relCo.top) {
    const [a, b] = [relCo.a, relCo.b];
    ajouter({
      section: 'coaching',
      paragraphe: {
        texte: `Coaching du binôme en co-direction ${relCo.id} : cycle court de séances conjointes qui clarifie qui décide de quoi, qui informe qui, et à quel rythme. Point d’appui factuel : l’écart sur ${facette(relCo.top.k)}, de ${fmt(relCo.top.ecart)} points (niveaux ${relCo.niveauA} et ${relCo.niveauB}). Le contact est ${cas.relations.find((x) => x.id === relCo.id).frequence} et l’interdépendance ${INTERDEP_FR[relCo.interdependance]} : la clarté des règles du binôme pèse donc sur toute l’équipe. Les langues de passation étant différentes (${personne(cas, a).langue_passation} et ${personne(cas, b).langue_passation}), toute comparaison entre les deux personnes porte une réserve tant que l’équivalence des versions n’est pas établie.`,
        confiance: 'moyenne',
        verification: 'Faire décrire à chacune des deux personnes, séparément, trois décisions récentes du binôme et la façon dont elles ont été prises ; comparer les deux récits.'
      },
      rec: {
        texte: `Coaching de binôme : conduire pour ${relCo.id} un cycle court de séances conjointes de clarification des décisions, à partir de l’écart sur ${facette(relCo.top.k)}.`,
        donnee: `Écart de ${fmt(relCo.top.ecart)} points sur ${relCo.top.k} entre ${a} (niveau ${relCo.niveauA}) et ${b} (niveau ${relCo.niveauB}) ; co-direction, interdépendance ${INTERDEP_FR[relCo.interdependance]}.`,
        contexte: `Contact ${cas.relations.find((x) => x.id === relCo.id).frequence} sur un projet de lancement ; langues de passation différentes, équivalence des versions non établie.`,
        risque: 'Une séance conjointe peut être vécue comme un arbitrage entre les deux personnes ; le cadre se limite aux règles de fonctionnement du binôme.',
        responsable: resp([a, b]),
        horizon: '60 jours',
        indicateur: 'Nombre de décisions du binôme reprises après coup, relevé dans le journal de décisions du programme au départ puis à 60 jours.'
      },
      ok: ok([a, b], 'binome')
    });
  }

  // Coaching d’équipe
  if (large1 && large2) {
    ajouter({
      section: 'coaching',
      paragraphe: {
        texte: `Coaching d’équipe : ${toutesDiverses ? 'les cinq domaines présentent une dispersion diverse' : 'la dispersion de l’équipe est variable selon les domaines'}, et les étendues de facette les plus larges sont celles de ${facette(large1[0])} et de ${facette(large2[0])} (${fmt(large1[1])} et ${fmt(large2[1])} points). Format proposé : un atelier de lancement puis des temps courts, chacun portant sur une règle de fonctionnement choisie par l’équipe. Le coach aide l’équipe à nommer ses angles morts au regard de la tâche, sans attribuer de rôle fixe à quiconque.`,
        confiance: 'moyenne',
        verification: 'Demander à chaque membre, avant l’atelier, deux situations du projet où la différence de style de travail a aidé et deux où elle a gêné ; confronter les réponses.'
      },
      rec: {
        texte: 'Coaching d’équipe : animer un atelier de lancement puis des temps courts de règles de fonctionnement, à partir des facettes où l’équipe est la plus dispersée.',
        donnee: `Étendue de ${fmt(large1[1])} points sur ${large1[0]} et de ${fmt(large2[1])} points sur ${large2[0]} dans l’équipe de ${cas.personnes.length} personnes.`,
        contexte: `Équipe projet répartie sur ${nSites} sites, interdépendance variable selon les relations ; ${ct('CT-07').id} limite le temps disponible.`,
        risque: 'La différence de style peut être lue comme un manque chez certains ; l’atelier part de la tâche et des règles, jamais de la valeur des personnes.',
        responsable: resp(toutes),
        horizon: '60 jours',
        indicateur: 'Nombre de règles de fonctionnement adoptées par l’équipe et appliquées, relevé à l’atelier puis à 60 jours (source : charte d’équipe).'
      },
      ok: equipeOk
    });
  }

  // Mentorat dans la relation de mentorat du cas
  if (relMentorat && relMentorat.top) {
    const [a, b] = [relMentorat.a, relMentorat.b];
    ajouter({
      section: 'mentorat',
      paragraphe: {
        texte: `Mentorat dans la relation ${relMentorat.id} (${relMentorat.sens === 'a->b' ? `${a} accompagne ${b}` : `${b} accompagne ${a}`}, contact ${relMentorat.frequence}) : une charte courte fixe les objectifs, choisis par la personne accompagnée, la confidentialité et le rythme. L’écart sur ${facette(relMentorat.top.k)} (${fmt(relMentorat.top.ecart)} points, niveaux ${relMentorat.niveauA} et ${relMentorat.niveauB}) sert de sujet possible de conversation, jamais de grille d’évaluation. Les sujets de conformité des données, portés par la personne accompagnée, sont un terrain d’apprentissage concret pour le lancement.`,
        confiance: 'moyenne',
        verification: 'Demander à la personne accompagnée trois sujets sur lesquels elle souhaite être accompagnée, avant de fixer le contenu de la charte.'
      },
      rec: {
        texte: `Mentorat : formaliser pour ${relMentorat.id} une charte de mentorat (objectifs choisis par la personne accompagnée, confidentialité, rythme) et tenir une séance par mois.`,
        donnee: `Écart de ${fmt(relMentorat.top.ecart)} points sur ${relMentorat.top.k} entre ${a} et ${b} ; relation de mentorat, contact ${relMentorat.frequence}.`,
        contexte: 'Relation asymétrique : la personne qui accompagne oriente et décide pour l’autre dans le programme ; le mentorat doit rester distinct de la ligne de décision.',
        risque: 'Le mentorat peut glisser vers une évaluation déguisée ; la charte interdit tout compte rendu au hiérarchique sans l’accord de la personne accompagnée.',
        responsable: resp([a, b]),
        horizon: '30 jours',
        indicateur: 'Charte signée dans les 30 jours, puis nombre de séances tenues et objectifs atteints relevés par la personne accompagnée à 90 jours (source : carnet de mentorat privé).'
      },
      ok: ok([a, b], 'binome')
    });
  }

  // Mentorat croisé entre pairs dans la relation client-fournisseur
  if (relClient && relClient.top) {
    const [a, b] = [relClient.a, relClient.b];
    ajouter({
      section: 'mentorat',
      paragraphe: {
        texte: `Mentorat croisé de ${relClient.id}, relation client-fournisseur interne à interdépendance ${INTERDEP_FR[relClient.interdependance]} : pendant six semaines, chaque personne présente à l’autre une pratique de son propre travail et recueille ses questions. L’écart sur ${facette(relClient.top.k)} (${fmt(relClient.top.ecart)} points, niveaux ${relClient.niveauA} et ${relClient.niveauB}) indique un terrain où les deux façons de travailler diffèrent sensiblement ; il s’agit d’apprendre l’une de l’autre, sans désigner de référence.`,
        confiance: 'faible',
        verification: 'Demander à chaque personne ce qu’elle attend de l’autre en amont ou en aval du travail, puis vérifier si ces attentes sont connues de l’autre.'
      },
      rec: {
        texte: `Mentorat croisé : organiser pour ${relClient.id} six semaines d’échanges de pratiques entre la personne qui fournit et celle qui reçoit, à partir de l’écart sur ${facette(relClient.top.k)}.`,
        donnee: `Écart de ${fmt(relClient.top.ecart)} points sur ${relClient.top.k} entre ${a} (niveau ${relClient.niveauA}) et ${b} (niveau ${relClient.niveauB}) ; interdépendance ${INTERDEP_FR[relClient.interdependance]}.`,
        contexte: 'Dans une chaîne séquentielle, ce que l’une livre conditionne ce que l’autre peut faire : les attentes de livraison gagnent à être explicitées de part et d’autre.',
        risque: 'Les échanges peuvent tourner à la critique du travail de l’autre ; un cadre de questions ouvertes et un temps borné limitent ce risque.',
        responsable: resp([a, b]),
        horizon: '60 jours',
        indicateur: 'Nombre de livraisons entre les deux personnes renvoyées pour reprise, relevé avant le mentorat et à 60 jours (source : suivi des livrables du programme).'
      },
      ok: ok([a, b], 'binome')
    });
  }

  // Formation : décision et communication entre sites
  ajouter({
    section: 'formation',
    paragraphe: {
      texte: `Formation 1, savoir-faire comportementaux de communication et de décision entre sites. Objectifs d’apprentissage : rédiger une demande de décision que le siège peut traiter sans échange supplémentaire, choisir la langue et le canal selon le type d’échange (décision, document, échange informel), conduire un point à distance sur ${nFuseaux} fuseaux. Modalités : deux ateliers pratiques de demi-journée, des cas tirés du lancement, un exercice entre les sites et le siège. Le contexte est celui de ${nSites} sites et de ${nLangues} langues de travail (${ct('CT-08').id}).`,
      confiance: 'moyenne',
      verification: 'Relever, avant la formation, trois demandes de décision récentes adressées au siège et le nombre d’échanges nécessaires pour obtenir la réponse.'
    },
    rec: {
      texte: 'Formation : dispenser un module de savoir-faire comportementaux sur la demande de décision et la communication à distance entre sites, avec cas réels du lancement.',
      donnee: `${nSites} sites, ${nLangues} langues de travail et ${nFuseaux} fuseaux (${ct('CT-08').id}) ; objectif de réduire de moitié le délai de décision avec le siège en 18 mois.`,
      contexte: 'Les documents de pilotage du groupe sont en anglais alors que la filiale travaille en arabe, en darija et en français ; les décisions du siège sont tardives selon les risques connus de la tâche.',
      risque: 'Une formation générale sans cas réels reste sans effet sur le comportement ; les cas sont donc tirés du lancement.',
      responsable: resp(['AM', 'KB']),
      horizon: '60 jours',
      indicateur: 'Délai de décision entre la filiale et le siège, relevé avant la formation puis à 90 jours (source : journal des décisions du programme).'
    },
    ok: true
  });

  // Formation : retour d’information et confiance
  if (etenduC.N4 !== undefined) {
    ajouter({
      section: 'formation',
      paragraphe: {
        texte: `Formation 2, savoir-faire comportementaux de donner et de recevoir un retour d’information dans un climat de confiance. Objectifs d’apprentissage : formuler un fait observable plutôt qu’une interprétation, accueillir une remarque sans la lire comme un jugement, poser une règle d’équipe sur les erreurs. Modalités : un atelier de demi-journée en équipe puis deux exercices courts en binôme. La notion de sécurité psychologique, issue des travaux d’Edmondson (référence à vérifier), sert de fil conducteur. Le contexte justifie ce choix : un précédent outil d’évaluation a laissé de la méfiance (${ct('CT-09').id}) et l’étendue de l’équipe sur ${facette('N4')} est de ${fmt(etenduC.N4)} points.`,
        confiance: 'faible',
        verification: 'Recueillir par questions ouvertes, auprès de chaque membre, ce qu’il pense pouvoir dire en réunion sans crainte ; comparer ces réponses avant et après la formation.'
      },
      rec: {
        texte: 'Formation : dispenser un module de savoir-faire comportementaux sur le retour d’information et la sécurité psychologique, en lien avec la méfiance héritée du précédent outil (référence à vérifier).',
        donnee: `Étendue de ${fmt(etenduC.N4)} points sur ${facette('N4')} dans l’équipe ; contrainte ${ct('CT-09').id} (méfiance héritée d’un précédent outil d’évaluation).`,
        contexte: 'La démarche touche aux personnes dans un climat de méfiance : la transparence sur l’usage des résultats est un préalable (règle CONTR-heritage).',
        risque: 'Le module peut être perçu comme une évaluation des comportements ; il est présenté comme un entraînement, sans restitution individuelle au hiérarchique.',
        responsable: resp(['HT']),
        horizon: '90 jours',
        preuve: { niveau: 'source', reference_id: 'edmondson-1999' },
        indicateur: 'Réponses des membres à trois questions ouvertes sur ce qu’ils peuvent dire en réunion, relevées avant la formation et à 90 jours (source : questionnaire court anonyme de l’équipe).'
      },
      ok: equipeOk
    });
  }

  // Formation : rythme et planification sous échéance
  if (etenduC.C1 !== undefined && etenduC.C6 !== undefined) {
    ajouter({
      section: 'formation',
      paragraphe: {
        texte: `Formation 3, savoir-faire comportementaux de planification partagée et de gestion des désaccords sur le rythme. Objectifs d’apprentissage : décomposer un jalon en livrables datés, décider ensemble du moment où l’on arrête de préparer pour livrer, négocier un compromis entre vitesse et soin. Modalités : un atelier sur le calendrier réel du lancement, avec un exercice de pré-mortem sur les trois échéances du cas. Le choix vient de l’étendue de l’équipe sur ${facette('C1')} (${fmt(etenduC.C1)} points) et sur ${facette('C6')} (${fmt(etenduC.C6)} points), à lire avec l’échéance fixée par le siège (${ct('CT-05').id}).`,
        confiance: 'moyenne',
        verification: 'Demander à chaque membre comment il décide qu’un livrable est prêt, puis comparer ces critères entre les membres.'
      },
      rec: {
        texte: 'Formation : dispenser un atelier de savoir-faire comportementaux sur la planification partagée et la gestion des désaccords de rythme, appuyé sur le calendrier réel du lancement.',
        donnee: `Étendue de ${fmt(etenduC.C1)} points sur ${facette('C1')} et de ${fmt(etenduC.C6)} points sur ${facette('C6')} dans l’équipe ; calendrier de lancement fixé par le siège (${ct('CT-05').id}).`,
        contexte: 'La contrainte de délai est dure : les écarts de rythme entre personnes pèsent davantage à l’approche des échéances.',
        risque: 'L’atelier peut ranimer des désaccords anciens ; il porte sur le calendrier du lancement, pas sur des personnes.',
        responsable: resp(['AM', 'KB']),
        horizon: echeances[1] ?? '90 jours',
        indicateur: 'Respect des jalons datés du calendrier de lancement, relevé à chaque jalon du programme (source : tableau de bord du programme).'
      },
      ok: equipeOk
    });
  }

  // Organisation : rôles et responsabilités
  ajouter({
    section: 'organisation',
    paragraphe: {
      texte: `Rôles et répartition des responsabilités : établir une matrice qui indique, pour chaque livrable du lancement, qui décide, qui réalise, qui est consulté et qui est informé, à partir des rôles du cas (${liste(cas.personnes.map((p) => p.role_equipe.toLowerCase()))}) et de leur périmètre de décision. Le cas compte ${cas.relations.length} relations de ${new Set(cas.relations.map((r) => r.nature)).size} natures différentes (ligne, lien fonctionnel, mentorat, client-fournisseur, pairs, co-direction) : la matrice rend explicite ce qui, aujourd’hui, dépend de la nature de chaque lien.`,
      confiance: 'moyenne',
      verification: 'Faire remplir la matrice séparément par chaque personne, puis relever les cases où les réponses divergent ; ces cases sont les sujets de la réunion de validation.'
    },
    rec: {
      texte: 'Organisation : établir une matrice des rôles et des responsabilités par livrable du lancement (qui décide, réalise, consulte, informe), validée en réunion.',
      donnee: `${cas.relations.length} relations entre ${cas.personnes.length} personnes, de ${new Set(cas.relations.map((r) => r.nature)).size} natures différentes ; périmètres de décision distincts pour chaque rôle.`,
      contexte: 'Tâche de projet à plusieurs interdépendances ; les décisions de budget restent validées par le siège, ce que la matrice doit refléter.',
      risque: 'Une matrice trop détaillée devient une charge de plus pour une équipe mobilisée aux sept dixièmes ; elle se limite aux livrables critiques du lancement.',
      responsable: resp(['AM']),
      horizon: '30 jours',
      indicateur: 'Nombre de cases de la matrice sans accord entre les personnes, relevé à la validation puis à 60 jours (source : matrice versionnée du programme).'
    },
    ok: true
  });

  // Organisation : règles de décision entre filiale et siège
  ajouter({
    section: 'organisation',
    paragraphe: {
      texte: `Règles de décision entre la filiale et le siège : définir quelles décisions sont prises localement, lesquelles remontent, avec quel délai de réponse attendu et dans quelle langue. L’arbitrage déjà fait est que les décisions de budget restent validées par le siège ; l’objectif du cas est de réduire de moitié le délai de décision en 18 mois. Le travail est réparti sur ${nFuseaux} fuseaux : une règle de communication asynchrone (demande écrite, réponse sous un délai convenu) complète le point hebdomadaire avec le siège.`,
      confiance: 'moyenne',
      verification: 'Relever, sur les décisions des derniers mois, le délai entre la demande et la réponse du siège, et les décisions remontées alors qu’elles auraient pu être prises localement.'
    },
    rec: {
      texte: 'Organisation : écrire avec le siège des règles de décision (décisions locales, décisions remontées, délai de réponse, langue) et une règle de communication asynchrone.',
      donnee: `Objectif de réduire de moitié le délai de décision filiale-siège en 18 mois ; ${nFuseaux} fuseaux et ${nLangues} langues de travail (${ct('CT-08').id}).`,
      contexte: 'Autonomie encadrée : le siège valide le budget et les choix d’outils, la filiale conduit l’exécution ; les décisions tardives du siège figurent parmi les risques connus.',
      risque: 'Le siège peut ne pas s’engager sur un délai de réponse ; la règle est alors proposée comme expérimentation sur le seul site pilote.',
      responsable: resp(['AM']),
      horizon: '60 jours',
      indicateur: 'Délai moyen de décision entre la filiale et le siège, relevé avant les règles puis à 90 jours (source : journal des décisions du programme).'
    },
    ok: true
  });

  // Organisation : rituels
  ajouter({
    section: 'organisation',
    paragraphe: {
      texte: `Rituels : un point court quotidien pour les relations d’interdépendance ${INTERDEP_FR.reciproque}, un point hebdomadaire d’équipe, une revue mensuelle des décisions et un bilan à chaque jalon. Dans une interdépendance réciproque, le travail de l’un devient tour à tour l’entrée et la sortie du travail de l’autre : l’ajustement mutuel y est plus fréquent, d’après la typologie de Thompson (référence à vérifier). Chaque rituel a une durée bornée, un ordre du jour fixe et un compte rendu d’une page, pour respecter le temps disponible (${ct('CT-07').id}).`,
      confiance: 'moyenne',
      verification: 'Demander à chaque membre quels échanges lui font perdre du temps et lesquels débloquent le travail, avant de fixer le calendrier des rituels.'
    },
    rec: {
      texte: 'Organisation : instaurer des rituels bornés (point court, point hebdomadaire, revue mensuelle des décisions, bilan de jalon), plus fréquents là où l’interdépendance est réciproque (référence à vérifier).',
      donnee: `${cas.relations.filter((r) => r.interdependance === 'reciproque').length} relations à interdépendance réciproque sur ${cas.relations.length} ; indicateur du cas : taux de participation aux rituels d’équipe du projet.`,
      contexte: 'Équipe répartie entre Casablanca et Dubaï avec un point hebdomadaire avec Paris ; temps disponible limité (CT-07).',
      risque: 'Des rituels trop nombreux alourdissent le travail ; chaque rituel est supprimé s’il n’a pas produit de décision durant deux jalons.',
      responsable: resp(['SR', 'HT']),
      horizon: '30 jours',
      preuve: { niveau: 'source', reference_id: 'thompson-1967' },
      indicateur: 'Taux de participation aux rituels d’équipe du projet, relevé chaque mois depuis le premier rituel (source : feuilles de présence des rituels).'
    },
    ok: true
  });

  // Organisation : information, transparence et gouvernance de l’usage des résultats
  ajouter({
    section: 'organisation',
    paragraphe: {
      texte: `Gouvernance de l’usage des résultats : un comité restreint, comprenant la personne chargée de la conformité des données, décide de qui voit quoi, selon les consentements par niveau de rapport. Les représentants du personnel sont informés de la démarche avant toute diffusion (${ct('CT-10').id}) et la transparence sur l’usage des résultats est affichée pour répondre à la méfiance héritée (${ct('CT-09').id}). Le dépôt du dossier auprès de la CNDP conditionne toute analyse de relation ou d’équipe (${ct('CT-02').id}).`,
      confiance: 'moyenne',
      verification: 'Demander aux représentants du personnel et à quelques membres de l’équipe ce qu’ils ont compris de l’usage des résultats ; corriger l’information tant que leurs réponses divergent.'
    },
    rec: {
      texte: 'Organisation : mettre en place un comité de gouvernance de l’usage des résultats, informer les représentants du personnel et afficher les règles de partage avant toute diffusion.',
      donnee: `Contraintes ${ct('CT-02').id} (autorisation de la CNDP avant toute analyse de relation ou d’équipe), ${ct('CT-09').id} et ${ct('CT-10').id} ; ${dures.length} contraintes dures dans le cas.`,
      contexte: 'Un précédent outil d’évaluation a laissé de la méfiance ; la loi 09-08 impose information et consentement préalables des personnes.',
      risque: 'Une information tardive ou incomplète ravive la méfiance et peut conduire à des retraits de consentement.',
      responsable: resp(['HT']),
      horizon: echeances[0] ?? '30 jours',
      indicateur: 'Représentants du personnel informés avant diffusion (oui ou non), puis nombre de retraits de consentement, relevés à 30 jours et à 90 jours (source : registre des consentements).'
    },
    ok: orgOk
  });

  // Mesure : indicateurs d’équipe avant et après
  ajouter({
    section: 'mesure',
    paragraphe: {
      texte: `Mesure d’impact de l’équipe, avant et après : les trois indicateurs de succès du cas sont relevés une première fois avant le démarrage des actions (référence de départ, dans les 30 jours), puis à 60 jours et à 90 jours. Les sources sont celles du programme : journal des décisions pour le délai filiale-siège, tableau de bord du lancement pour le respect du calendrier, feuilles de présence pour la participation aux rituels. Une évolution constatée n’est pas imputable au seul plan : d’autres facteurs (décisions du siège, calendrier de la CNDP) jouent aussi.`,
      confiance: 'moyenne',
      verification: 'Faire valider par le commanditaire la définition de chaque indicateur et la source de la donnée avant la mesure de départ.'
    },
    rec: {
      texte: 'Mesure : relever avant le démarrage, à 60 jours et à 90 jours les indicateurs de succès du cas pour l’équipe, avec une source de donnée fixée à l’avance.',
      donnee: `Trois indicateurs de succès du cas : ${liste(cas.strategie.indicateurs.map((i) => i.toLowerCase()))} ; objectif de réduire de moitié le délai de décision en 18 mois.`,
      contexte: 'Sans mesure de départ, aucun changement ne peut être attribué au plan ; la mesure se fait au niveau de l’équipe, jamais d’une personne.',
      risque: 'Un changement observé peut avoir d’autres causes que le plan ; le rapport de mesure le dit et ne conclut pas à un effet.',
      responsable: resp(['AM']),
      horizon: '90 jours',
      indicateur: 'Les trois indicateurs relevés à la référence de départ (avant le premier jour), à 60 jours et à 90 jours (source : journal des décisions, tableau de bord du lancement, feuilles de présence).'
    },
    ok: true
  });

  // Mesure : évaluation des formations par les niveaux de Kirkpatrick
  ajouter({
    section: 'mesure',
    paragraphe: {
      texte: 'Évaluation des formations selon les quatre niveaux de Kirkpatrick (référence à vérifier) : niveau 1, réaction des participants, à la fin de chaque session ; niveau 2, apprentissage, par un exercice pratique avant puis après ; niveau 3, comportement, relevé à 30 jours par l’observation en situation de travail et par le témoignage de deux collègues ; niveau 4, résultats, lus dans les indicateurs d’équipe à 90 jours. Seuls les niveaux 1 et 2 sont directement atteignables avant 90 jours ; les niveaux 3 et 4 demandent un recul plus long.',
      confiance: 'moyenne',
      verification: 'Faire confirmer par le concepteur de chaque formation la forme de l’exercice du niveau 2 et les situations de travail observées au niveau 3.'
    },
    rec: {
      texte: 'Mesure : évaluer chaque formation selon les quatre niveaux de Kirkpatrick (réaction, apprentissage, comportement, résultats), référence à vérifier.',
      donnee: `${actions.filter((a) => a.section === 'formation' && a.ok).length} formations prévues dans le plan, dans une enveloppe d’accompagnement plafonnée sur 12 mois (${ct('CT-06').id}).`,
      contexte: 'Le budget est négociable mais plafonné : l’évaluation doit coûter peu de temps et s’appuyer sur des outils courts.',
      risque: 'Les niveaux 3 et 4 sont les plus utiles et les plus tardifs : sans suivi planifié à 30 jours et à 90 jours, l’évaluation s’arrête au niveau 1.',
      responsable: resp(['AM', 'KB']),
      horizon: '90 jours',
      preuve: { niveau: 'source', reference_id: 'kirkpatrick' },
      indicateur: 'Pour chaque formation, niveaux 1 et 2 relevés à la session, niveau 3 à 30 jours et niveau 4 à 90 jours (source : questionnaires de session et indicateurs d’équipe).'
    },
    ok: true
  });

  // Mesure : consentement et confiance
  ajouter({
    section: 'mesure',
    paragraphe: {
      texte: 'Suivi de la confiance dans la démarche : nombre de retraits de consentement, demandes d’information reçues des représentants du personnel, et trois questions ouvertes posées à l’équipe avant puis après. La mesure est anonyme, pour l’équipe seulement, et ses résultats sont communiqués à l’équipe avant tout autre destinataire.',
      confiance: 'faible',
      verification: 'Tester les trois questions auprès de deux personnes avant leur diffusion pour vérifier qu’elles sont comprises de la même façon.'
    },
    rec: {
      texte: 'Mesure : suivre la confiance dans la démarche (retraits de consentement, demandes des représentants du personnel, trois questions ouvertes avant et après).',
      donnee: `Contrainte ${ct('CT-09').id} (méfiance héritée d’un précédent outil) et ${ct('CT-01').id} (information et consentement préalables) ; ${cas.personnes.length} personnes concernées.`,
      contexte: 'Un seuil d’anonymat de 5 personnes n’est pas atteint par l’équipe de 4 : la mesure reste qualitative et lue par le consultant, sans diffusion nominative.',
      risque: 'Avec quatre personnes, une réponse peut être reconnue ; les questions ouvertes sont relues et regroupées par le consultant avant toute restitution.',
      responsable: resp(['HT']),
      horizon: '90 jours',
      indicateur: 'Nombre de retraits de consentement et réponses aux trois questions ouvertes, relevés avant le démarrage puis à 90 jours (source : registre des consentements et questionnaire court).'
    },
    ok: equipeOk
  });

  // ---------------------------------------------------------------- recommandations
  const retenues = actions.filter((a) => a.ok);
  const recommandations = retenues.map((a, i) => recommandation(`REC-N5-${i + 1}`, 'n5', a.rec.texte, a.rec));

  // ---------------------------------------------------------------- sections
  const sections = [];
  const construireSection = (id, titre, intro) => {
    const paras = [...intro];
    const propres = retenues.filter((a) => a.section === id);
    for (const a of propres) paras.push({ ...a.paragraphe, statut: 'hypothese' });
    if (!propres.length && !intro.length) {
      paras.push({ texte: 'Aucune action n’est proposée dans cette section : le consentement requis pour les données qui la fondent n’est pas réuni.', statut: 'constate' });
    }
    sections.push(section(id, titre, paras.map((p, k) => paragraphe(`n5-${id}-${k + 1}`, p.texte, { statut: p.statut, confiance: p.confiance, verification: p.verification }))));
  };

  const c = (texte) => ({ texte, statut: 'constate' });

  // Point de départ
  const depart = [];
  depart.push(c(`Le plan d’accompagnement est tiré des seuls faits calculés par le moteur et des contraintes saisies pour ${cas.organisation.nom} : ${cas.personnes.length} personnes, ${cas.relations.length} relations, orientation de ${cas.strategie.orientation}, tâche de nature ${cas.tache.nature}. Aucune référence à un groupe externe n’est utilisée et rien n’y est conclu sur la valeur des personnes.`));
  if (tensionTop) {
    const [ka, kb] = tensionTop.facettes;
    const [va, vb] = tensionTop.valeurs;
    let t = `Tension interne la plus nette : ${facette(ka)} et ${facette(kb)} pour ${tensionTop.code}, écart de ${fmt(tensionTop.ecart)} points sur l’échelle de 1 à 5 (valeurs de ${fmt(va)} et de ${fmt(vb)}).`;
    if (tensionSeconde) {
      const [sa, sb] = tensionSeconde.facettes;
      t += ` Une tension d’un autre domaine, d’écart ${fmt(tensionSeconde.ecart)} points, porte sur ${facette(sa)} et ${facette(sb)} pour ${tensionSeconde.code}.`;
    }
    depart.push(c(t));
  }
  if (ecartsBinomes.length) {
    const morceaux = ecartsBinomes.map((r) => `${facette(r.k)} dans ${r.id} (${fmt(r.ecart)} points)`);
    depart.push(c(`Écarts de facette les plus notables entre deux personnes : ${liste(morceaux)}. Ces écarts décrivent des façons de travailler différentes sur la tâche, sans désigner de référence.`));
  }
  if (large1 && large2) {
    depart.push(c(`Diversité d’équipe : ${toutesDiverses ? 'les cinq domaines ont une dispersion diverse' : 'la dispersion varie selon les domaines'} ; les étendues de facette les plus larges sont celles de ${facette(large1[0])} et de ${facette(large2[0])}, de ${fmt(large1[1])} points chacune.`));
  }
  {
    const hauts = Object.entries(faits.organisation.agregats.domaines).filter(([, d]) => d.niveau === 'plutot_haut' || d.niveau === 'haut');
    const lecture = hauts.map(([d, v]) => `${nomDomaine(d)} à ${fmt(v.moy)} (${NIVEAU_FR[v.niveau]})`);
    const derog = faits.organisation.seuil_atteint
      ? ''
      : ` (effectif de ${faits.organisation.n_personnes} personnes pour un seuil d’anonymat de ${faits.organisation.seuil_anonymat} : agrégat montré par dérogation de démonstration)`;
    depart.push(c(`Adéquation organisationnelle${derog} : valeurs d’équipe pour ${liste(lecture)}, selon les conventions de l’outil. Ces valeurs se lisent avec la structure (${cas.organisation.structure}), la culture dominante (${cas.organisation.culture}) et l’orientation de ${cas.strategie.orientation} ; leur effet sur le travail de l’équipe est à instruire en entretien, et les dispositifs d’organisation du plan en tiennent compte.`));
  }
  depart.push(c(`Contraintes dures du cas, que le plan respecte sans les négocier : ${liste(dures.map((x) => `${x.id} (${TYPE_FR[x.type] ?? x.type})`))}. La marge de manœuvre se cherche dans les contraintes négociables (${liste(cas.contraintes.filter((x) => x.durete !== 'dure').map((x) => x.id))}).`));
  sections.push(section('depart', 'Point de départ : les faits qui fondent le plan', depart.map((p, k) => paragraphe(`n5-depart-${k + 1}`, p.texte, { statut: 'constate' }))));

  construireSection('coaching', 'Coaching individuel et d’équipe', []);
  construireSection('mentorat', 'Mentorat', []);
  construireSection('formation', 'Formation aux savoir-faire comportementaux', []);
  construireSection('organisation', 'Dispositifs d’organisation : rôles, règles de décision, rituels, responsabilités', []);

  // Calendrier
  const cal = [];
  const par = (id, jalon) => retenues.filter((a) => a.rec.horizon === jalon).map((a) => FAMILLES.find((f) => a.rec.texte.startsWith(f)));
  const resume = (jalon) => {
    const fam = par(null, jalon);
    return fam.length ? liste([...new Set(fam)].map((f) => f.toLowerCase())) : 'suivi des actions engagées';
  };
  cal.push({ texte: `Échéances du cas, reprises telles quelles : ${echeances.join(' ; ')}. Le plan se cale sur ces échéances et ne les modifie pas.`, statut: 'constate' });
  cal.push({
    texte: `À 30 jours : information des représentants du personnel et clarification de la base juridique avant toute analyse de relation ou d’équipe, matrice des rôles validée, charte de mentorat signée, première mesure des indicateurs d’équipe (référence de départ) et démarrage du coaching individuel. Familles d’actions engagées : ${resume('30 jours')}. Responsables : ${roles(['AM'])} pour le pilotage, ${roles(['HT'])} pour la conformité des données, avec le ${CONSULTANT}.`,
    statut: 'hypothese', confiance: 'moyenne',
    verification: 'Vérifier avec le pilote du programme que chaque action de ce jalon a un responsable nommé et une date, et qu’aucune ne dépend d’une autorisation non encore obtenue.'
  });
  cal.push({
    texte: `À 60 jours : formations de communication entre sites et règles de décision avec le siège en place, coaching du binôme en co-direction et d’équipe, mentorat croisé engagé, premier relevé des indicateurs. Familles d’actions engagées : ${resume('60 jours')}. Responsables : ${roles(['AM', 'KB'])} pour les règles de décision et la formation, ${roles(['SR', 'HT'])} pour le coaching du binôme, avec le ${CONSULTANT}.`,
    statut: 'hypothese', confiance: 'faible',
    verification: 'Vérifier en réunion de jalon que le siège a confirmé les règles de décision et que le temps de formation a pu être libéré malgré la mobilisation aux sept dixièmes.'
  });
  cal.push({
    texte: `À 90 jours : bilan du plan, deuxième relevé des indicateurs d’équipe comparé à la référence de départ, évaluation des formations aux niveaux 3 et 4 de Kirkpatrick (référence à vérifier), décision du commanditaire sur la poursuite. Familles d’actions engagées : ${resume('90 jours')}. Responsables : ${roles(['AM'])} pour le bilan, avec le ${CONSULTANT} qui relit et signe le bilan.`,
    statut: 'hypothese', confiance: 'faible',
    verification: 'Comparer, avec le commanditaire, les indicateurs du jalon à la référence de départ et recueillir le point de vue de chaque membre sur ce qui a changé dans le travail.'
  });
  cal.push({
    texte: 'Le dépôt du dossier auprès de la CNDP et son autorisation ne dépendent pas de l’équipe : si l’autorisation tarde, les actions qui exploitent des résultats de relation ou d’équipe sont reportées, et seules les actions de cadre, de formation et d’organisation se poursuivent.',
    statut: 'hypothese', confiance: 'moyenne',
    verification: 'Demander à la personne chargée de la conformité des données un état d’avancement du dossier à chaque jalon.'
  });
  sections.push(section('calendrier', 'Calendrier en jalons à 30, 60 et 90 jours', cal.map((p, k) => paragraphe(`n5-calendrier-${k + 1}`, p.texte, p))));

  // Mesure
  const mes = [];
  mes.push(c(`Indicateurs de succès du cas : ${liste(cas.strategie.indicateurs)}. Moments de mesure proposés : avant le démarrage (référence de départ), à 60 jours et à 90 jours ; source de la donnée : journal des décisions du programme, tableau de bord du lancement et feuilles de présence des rituels.`));
  construireSection('mesure', 'Indicateurs et mesure d’impact', mes);

  // Garde-fous
  const g = [];
  g.push(c('Aucune décision d’emploi (recrutement, promotion, licenciement, affectation) ne peut s’appuyer sur ces rapports. Cette règle est une contrainte dure du cas (CT-03, Code du travail, loi 65-99) et un garde-fou du mandat ; elle vaut pour le plan comme pour les lectures qui le fondent.'));
  g.push(c('Consentement : les résultats du questionnaire sont des données personnelles (loi 09-08, CT-01). Information et consentement préalables des personnes, consentement distinct pour chaque niveau de rapport (individuel, binôme, équipe, organisation), retrait possible à tout moment ; aucune donnée n’est exploitée sans consentement tracé.'));
  g.push(c('Base juridique à faire instruire par Tenga Conseil avant tout usage : déclaration ou autorisation préalable du traitement auprès de la CNDP avant toute analyse de relation ou d’équipe (CT-02) ; cadre et autorisation d’un transfert de données vers le siège à l’étranger (CT-04) ; Code du travail (loi 65-99). Le RGPD et le règlement 2024/1689 ne s’appliquent que si l’organisation y est soumise, ce qui est à instruire ; la règle de prudence retenue est d’appliquer l’exigence la plus forte. Ces éléments sont des faits de cadre, non un avis juridique.'));
  g.push(c(`Relecture et signature : un ${CONSULTANT} relit et signe le plan avant toute remise. L’outil prépare et argumente, il ne conclut pas. La norme ISO 10667 (prestation d’évaluation en contexte de travail) est citée comme pratique visée, sans certification revendiquée.`));
  g.push(c(`Seuil d’anonymat : l’équipe compte ${faits.organisation.n_personnes} personnes pour un seuil de ${faits.organisation.seuil_anonymat}${faits.organisation.seuil_atteint ? '' : ' non atteint ; l’agrégat n’est montré que par dérogation de démonstration, parce que le cas est fictif et consenti'}. Cette dérogation ne s’applique à aucune organisation réelle.`));
  g.push(c('Information des représentants du personnel (CT-10) et transparence sur l’usage des résultats (CT-09) avant toute diffusion. Les niveaux « bas » à « haut » sont des conventions de l’outil, non calibrées : le plan compare des personnes entre elles et chacune à sa propre échelle, jamais à un groupe de référence.'));
  sections.push(section('garde-fous', 'Conditions et garde-fous', g.map((p, k) => paragraphe(`n5-garde-fous-${k + 1}`, p.texte, { statut: 'constate' }))));

  // Ordre final : départ, a, b, c, d, calendrier, mesure, garde-fous
  const ordre = ['depart', 'coaching', 'mentorat', 'formation', 'organisation', 'calendrier', 'mesure', 'garde-fous'];
  const triees = ordre.map((id) => sections.find((s) => s.id === id));
  return {
    niveau: { id: 'n5-accompagnement', titre: 'Plan d’accompagnement intégré', sections: triees },
    recommandations
  };
}
