// Niveau 1 du rapport « cabinet » : analyse individuelle, privée (mandat § 4.2 point 1).
// Fonction pure et déterministe : aucun nombre n’est calculé ici sans venir de faits, du cas ou des profils.
import { DOMAINES, NIVEAU_FR, NOM_DOMAINE, bloc, fmt, liste, paragraphe, recommandation, section } from './outils.mjs';

const ID_NIVEAU = 'n1-individuel';

const LIBELLE_DOMAINE = NOM_DOMAINE;
// Voix de marque : « Névrosisme » s’emploie avec sa glose à la première occurrence de chaque chapitre.
const GLOSE_N = 'sensibilité aux émotions négatives et au stress ; ce n’est pas un diagnostic';

const HAUT = new Set(['haut', 'plutot_haut']);
const BAS = new Set(['bas', 'plutot_bas']);
const sens = (niveau) => (HAUT.has(niveau) ? 'haut' : BAS.has(niveau) ? 'bas' : 'milieu');

// Conditions d’épanouissement : hypothèses de lecture par domaine et par position sur l’échelle de la personne.
const CONDITIONS = {
  N: {
    haut: 'des priorités stables, une visibilité sur les échéances et des temps de récupération identifiés peuvent aider la personne à travailler avec sérénité ; des consignes changeantes ou un flou sur les attentes peuvent peser davantage.',
    bas: 'un cadre où les signaux d’alerte sont explicitement demandés peut aider, car une réaction calme à la pression peut conduire à ne pas signaler tôt une difficulté qui inquiète l’entourage.',
    milieu: 'des situations d’intensité variable, avec des échanges réguliers sur la charge de travail, peuvent convenir ; l’entretien précisera les contextes où la pression se fait davantage sentir.'
  },
  E: {
    haut: 'des échanges fréquents, des occasions de prendre la parole et un rythme soutenu peuvent convenir ; de longues périodes de travail isolé peuvent demander des aménagements.',
    bas: 'des temps de travail calme, des échanges préparés à l’avance et des réunions de taille réduite peuvent convenir ; des sollicitations relationnelles continues peuvent demander des temps de retrait.',
    milieu: 'une alternance entre travail en solitaire et échanges peut convenir ; l’entretien précisera les situations où l’une ou l’autre est recherchée.'
  },
  O: {
    haut: 'des sujets nouveaux, de l’autonomie dans la manière de les aborder et des occasions d’explorer des idées peuvent convenir ; des tâches très répétitives et sans marge de manœuvre peuvent peser.',
    bas: 'des méthodes éprouvées, des consignes claires et des objectifs concrets peuvent convenir ; des changements fréquents d’orientation peuvent demander un temps d’appropriation.',
    milieu: 'un mélange de méthodes éprouvées et de nouveautés peut convenir ; l’entretien précisera les domaines où la nouveauté est recherchée.'
  },
  A: {
    haut: 'un climat de coopération, des relations de confiance et des occasions d’aider peuvent convenir ; un désaccord frontal ou une compétition ouverte peuvent peser et rendre une position difficile à exprimer.',
    bas: 'des règles du jeu explicites, des critères de décision partagés et des échanges directs peuvent convenir ; une recherche d’harmonie à tout prix peut au contraire gêner.',
    milieu: 'des relations de travail alternant coopération et débat contradictoire peuvent convenir ; l’entretien précisera ce qui rend un désaccord facile ou difficile à exprimer.'
  },
  C: {
    haut: 'des objectifs clairs, des délais connus et la maîtrise de son propre calendrier peuvent convenir ; des priorités changeantes ou des exigences de qualité floues peuvent peser.',
    bas: 'de la souplesse dans l’organisation, des étapes courtes et des rappels d’échéance utiles peuvent convenir ; des cadres très formalisés peuvent demander un temps d’adaptation.',
    milieu: 'un cadre qui fixe l’essentiel et laisse de la marge sur le reste peut convenir ; l’entretien précisera les tâches où davantage de structure est souhaitée.'
  }
};

// Le plan automatique ne cible jamais ces facettes ni le domaine N : elles se traitent en entretien.
const FACETTES_NON_CIBLEES = new Set(['O6', 'A2', 'N3']);
// Porteur de l’entretien de restitution : le cas ne contient pas ce rôle, le mandat le prévoit (§ 3 point 8).
const CONSULTANT = 'Consultant qualifié désigné par Tenga Conseil';
// Apostrophes courbes dans tout texte visible, y compris les chaînes reprises du cas.
const typo = (t) => t.replace(/(\p{L})'(\p{L})/gu, '$1’$2');
// Le responsable reste le rôle du cas tel quel ; les autres champs passent par typo.
const recT = (id, niveau, texte, a) => recommandation(id, niveau, typo(texte), Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === 'string' && k !== 'responsable' ? typo(v) : v])));
const deNom = (nom) => (/^[AEIOUYHÉÈÊ]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
const deCode = (code) => (/^[AEIOUY]/.test(code) ? `d’${code}` : `de ${code}`);

const regleDe = (regles, id) => {
  const r = regles.regles.find((x) => x.id === id);
  if (!r) throw new Error(`règle inconnue ${id}`);
  return { ...r, texte: r.texte.replace(/(\p{L})'(\p{L})/gu, '$1’$2') };
};
const minuscule = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const arrondi = (x) => Math.round(x * 1000) / 1000;

/** Lecture d’un domaine à partir des facettes de faits : extrêmes et étendue (jamais affichée, seulement classée). */
function lectureDomaine(faitsPersonne, d, conventions) {
  const codes = [1, 2, 3, 4, 5, 6].map((i) => `${d}${i}`);
  const valeurs = codes.map((c) => faitsPersonne.facettes[c].moy);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const etendue = arrondi(max - min);
  const classe = etendue <= conventions.ecarts.proche_max ? 'resserrée' : etendue >= conventions.ecarts.notable_min ? 'large' : 'intermédiaire';
  return {
    d,
    codes,
    min,
    max,
    etendue,
    classe,
    codesMin: codes.filter((c) => faitsPersonne.facettes[c].moy === min),
    codesMax: codes.filter((c) => faitsPersonne.facettes[c].moy === max)
  };
}

function libelleFacette(bib, code) {
  const f = bib.facettes.find((x) => x.code === code);
  if (!f) throw new Error(`facette inconnue ${code}`);
  return f.libelle.fr;
}

function chapitre(ctx, p) {
  const { cas, faits, bib, regles } = ctx;
  const fp = faits.personnes[p.code];
  if (!fp) throw new Error(`faits absents pour ${p.code}`);
  const conv = faits.conventions;
  const lib = (c) => libelleFacette(bib, c);
  const blocDe = (c) => {
    const [code, niveau] = fp.facettes[c].bloc_id.split('/');
    return bloc(bib, code, niveau);
  };
  const valeur = (c) => fmt(fp.facettes[c].moy);
  const niveauFacette = (c) => NIVEAU_FR[fp.facettes[c].niveau];
  const lectures = DOMAINES.map((d) => lectureDomaine(fp, d, conv));
  const sections = [];
  const ajouter = (suffixe, titre, items) => {
    const id = `${p.code}-${suffixe}`;
    sections.push(section(id, typo(titre), items.map(([texte, options], i) => paragraphe(`n1-${id}-${i + 1}`, typo(texte), options.verification ? { ...options, verification: typo(options.verification) } : options))));
  };
  const hyp = (texte, confiance, verification, bloc_ids) => [texte, { statut: 'hypothese', confiance, verification, bloc_ids }];
  const con = (texte) => [texte, { statut: 'constate' }];

  // (0) cadre
  ajouter('cadre', `${p.code} : ${p.nom}`, [
    con(`Chapitre privé ${deNom(p.nom)} (${p.code}). ${p.etiquette}. Fonction : ${p.fonction} ; niveau : ${p.niveau} ; ancienneté : ${p.anciennete} ; rôle dans l’équipe : ${p.role_equipe} ; périmètre de décision : ${p.perimetre_decision} ; langue de passation : ${p.langue_passation}.`),
    con('Ce chapitre n’existe que parce que la personne a consenti au niveau individuel. Aucune décision d’emploi ne peut s’appuyer sur ce chapitre. Les niveaux sont des conventions de l’outil, lues sur l’échelle de la personne elle-même : aucune comparaison à un groupe de référence n’est faite et aucune étiquette de type n’est attribuée.'),
    con('Chaque lecture qui suit est une hypothèse à confirmer en entretien, avec un niveau de confiance et une façon de la vérifier. Les textes des facettes viennent de la bibliothèque de textes : ils sont cités entre guillemets et introduits comme tels, car ils s’adressent directement à la personne, alors que le reste du chapitre parle de « la personne ». La mention « bloc non relu » est portée une fois par domaine tant qu’une relecture humaine n’a pas eu lieu.')
  ]);

  // (a) domaines
  const paraDomaines = [];
  for (const l of lectures) {
    const dom = fp.domaines[l.d];
    const extremes = l.min === l.max
      ? `Les six facettes du domaine sont toutes à ${fmt(l.min)} sur l’échelle de 1 à 5`
      : `Les six facettes du domaine vont de ${fmt(l.min)} (${liste(l.codesMin)}) à ${fmt(l.max)} (${liste(l.codesMax)}) sur l’échelle de 1 à 5`;
    paraDomaines.push(con(`${LIBELLE_DOMAINE[l.d]} (${l.d})${l.d === 'N' ? `, ${GLOSE_N}` : ''} : valeur ${dom.score} sur l’échelle de 24 à 120, niveau ${NIVEAU_FR[dom.niveau]}. ${extremes} ; la dispersion est ${l.classe} au sens des conventions de l’outil (resserrée jusqu’à ${fmt(conv.ecarts.proche_max)} point d’étendue, large à partir de ${fmt(conv.ecarts.notable_min)} point).`));
    paraDomaines.push(hyp(
      `${LIBELLE_DOMAINE[l.d]} : ${regleDe(regles, `NIV-${dom.niveau}`).texte}`,
      dom.niveau === 'milieu' ? 'faible' : 'moyenne',
      'Demander à la personne si cette lecture correspond à son expérience du travail, avec un exemple récent.'
    ));
  }
  ajouter('domaines', `Chapitre ${p.code} : les cinq domaines`, paraDomaines);

  // (b) 30 facettes, domaine par domaine ; textes de la bibliothèque cités entre guillemets
  for (const l of lectures) {
    const nonRelus = l.codes.filter((c) => blocDe(c).relecture !== 'relue');
    const mention = nonRelus.length === l.codes.length
      ? 'Les six blocs de la bibliothèque cités ci-dessous portent la mention « bloc non relu » : aucune relecture humaine n’a encore eu lieu.'
      : `Mention « bloc non relu » pour ${liste(nonRelus)} ; les autres blocs ont été relus.`;
    const items = [con(`Facettes du domaine ${LIBELLE_DOMAINE[l.d]}. ${mention} Une valeur haute signifie davantage de ce que décrit le libellé de la facette. Les passages entre guillemets sont des textes de la bibliothèque, adressés à la personne.`)];
    for (const c of l.codes) {
      const b = blocDe(c);
      const niveau = fp.facettes[c].niveau;
      const avertissement = b.avertissement ? ` Avertissement de la bibliothèque : « ${b.avertissement.replace(/«\s*/g, '“').replace(/\s*»/g, '”')} »` : '';
      const texte = `${c}, ${b.libelle} : ${valeur(c)} sur l’échelle de 1 à 5, niveau ${niveauFacette(c)}.${avertissement} Description de la bibliothèque : « ${b.description.join(' ')} » Apport possible : « ${b.apport.join(' ')} » Coût possible : « ${b.cout.join(' ')} » Question pour l’entretien : « ${b.question} »`;
      items.push(hyp(texte, niveau === 'milieu' ? 'faible' : 'moyenne', `Poser à la personne la question de la bibliothèque : « ${b.question} »`, [b.id]));
    }
    ajouter(`facettes-${l.d}`, `Chapitre ${p.code} : facettes du domaine ${LIBELLE_DOMAINE[l.d]}`, items);
  }

  // (c) tensions internes
  const tensions = fp.tensions;
  if (tensions.length === 0) {
    ajouter('tensions', `Chapitre ${p.code} : tensions internes`, [
      con(`Aucun couple de facettes d’un même domaine n’atteint l’écart de ${fmt(conv.tension.ecart_min)} point : les règles de l’outil ne relèvent aucune tension interne. Cela ne dit pas qu’aucune tension n’existe : l’entretien peut en faire apparaître.`)
    ]);
  } else {
    const items = [];
    for (const d of DOMAINES) {
      const duDomaine = tensions.filter((t) => t.domaine === d);
      if (!duDomaine.length) continue;
      const regleId = duDomaine[0].regle;
      const couples = duDomaine.map((t) => {
        const [a, b] = t.facettes;
        return `${t.id} (${a} « ${lib(a)} » à ${valeur(a)} et ${b} « ${lib(b)} » à ${valeur(b)}, écart de ${fmt(t.ecart)} points)`;
      });
      items.push(con(`Domaine ${LIBELLE_DOMAINE[d]}, règle ${regleId} (écart d’au moins ${fmt(conv.tension.ecart_min)} point entre deux facettes du domaine) : ${couples.join(' ; ')}.`));
      items.push(hyp(
        regleDe(regles, regleId).texte,
        'moyenne',
        'Demander deux situations récentes où ces facettes ont conduit à des comportements différents, et ce qui a fait la différence.',
        [...new Set(duDomaine.flatMap((t) => t.facettes))].map((c) => fp.facettes[c].bloc_id)
      ));
    }
    ajouter('tensions', `Chapitre ${p.code} : tensions internes`, items);
  }

  // (d) profil de contribution
  const forts = fp.contribution.points_forts_hypothese;
  const idsForts = forts.map((c) => fp.facettes[c].bloc_id);
  const tache = cas.tache;
  const rTache = regleDe(regles, `CAL-TACHE-${tache.nature}`);
  const rOri = regleDe(regles, `CAL-ORI-${cas.strategie.orientation}`);
  const pertinents = (r) => (r.domaines_pertinents || []).map((d) => `${LIBELLE_DOMAINE[d]} (${d}) au niveau ${NIVEAU_FR[fp.domaines[d].niveau]}`).join(' ; ');
  const couts = fp.contribution.couts_hypothese;
  ajouter('contribution', `Chapitre ${p.code} : profil de contribution`, [
    con(`Contexte pris en compte : fonction « ${p.fonction} », périmètre de décision « ${p.perimetre_decision} », rôle dans l’équipe « ${p.role_equipe} ». Tâche commune : ${minuscule(tache.description)}, de nature « ${tache.nature} », avec pour échéances ${tache.echeances.map(minuscule).join(' ; ')}.`),
    hyp(
      `Points d’appui possibles. Ces cinq facettes sont celles que la règle ${regleDe(regles, 'CONTRIB-1').id} retient comme les plus éloignées du milieu de l’échelle. Passages de la bibliothèque, adressés à la personne : ${forts.map((c) => `${c} « ${lib(c)} » (${niveauFacette(c)}) : « ${blocDe(c).apport[0]} »`).join(' ; ')}. Il se peut que ces apports servent la tâche décrite ci-dessus dans le rôle « ${p.role_equipe} ».`,
      'faible',
      'Demander dans quelles situations de la tâche ces apports ont déjà servi, et dans lesquelles ils ont plutôt gêné.',
      idsForts
    ),
    hyp(
      couts.length
        ? `Coûts possibles à explorer. Passages de la bibliothèque : ${forts.map((c) => `${c} : « ${blocDe(c).cout[0]} »`).join(' ; ')}. Les facettes engagées dans une tension interne (${liste(couts)}) sont celles où un coût est à explorer en priorité.`
        : `Coûts possibles à explorer. Passages de la bibliothèque : ${forts.map((c) => `${c} : « ${blocDe(c).cout[0]} »`).join(' ; ')}. Aucune facette n’est engagée dans une tension interne : ces coûts sont ceux que décrit la bibliothèque pour les mêmes facettes.`,
      'faible',
      'Demander quel prix la personne paie, en énergie ou en relations, lorsqu’elle met ces apports en œuvre sous pression.',
      idsForts
    ),
    hyp(
      `Conditions de la tâche à prendre en compte. ${rTache.texte} Pour cette personne, les domaines pertinents sont : ${pertinents(rTache)}. ${rOri.texte} Pour cette personne, les domaines pertinents sont : ${pertinents(rOri)}.`,
      'faible',
      'Demander à la personne quelles échéances et quels interlocuteurs de la tâche sollicitent le plus ses apports, et lesquels demandent un effort.'
    )
  ]);

  // (e) conditions d’épanouissement
  ajouter('epanouissement', `Chapitre ${p.code} : conditions d’épanouissement`, lectures.map((l) => {
    const dom = fp.domaines[l.d];
    return hyp(
      `${LIBELLE_DOMAINE[l.d]}, niveau ${NIVEAU_FR[dom.niveau]} : ${CONDITIONS[l.d][sens(dom.niveau)]}`,
      dom.niveau === 'milieu' ? 'faible' : 'moyenne',
      'Demander à la personne dans quelles conditions de travail son énergie se maintient, et dans lesquelles elle diminue.'
    );
  }));

  // (f) fiabilité de la réponse
  ajouter('fiabilite', `Chapitre ${p.code} : fiabilité de la réponse`, [
    con(`Les indices de qualité de passation (réponses manquantes, durée, régularité des réponses) ne sont pas calculés dans cette démonstration : ils sont à valider sur données réelles avant toute publication. En leur absence, la fiabilité de la réponse n’est ni affirmée ni écartée. La passation a eu lieu en ${p.langue_passation} ; l’équivalence des versions linguistiques n’étant pas établie, ce chapitre se lit sans aucune comparaison avec une autre personne.`)
  ]);

  // (g) plan de développement : seule une tension relevée donne une priorité (facettes distinctes) ; O6, A2, N3 et le
  // domaine N ne sont jamais ciblés par le choix automatique ; sans tension éligible, entretien de restitution seul.
  const eligible = (t) => t.domaine !== 'N' && !t.facettes.some((c) => FACETTES_NON_CIBLEES.has(c));
  const utilisees = new Set();
  const priorites = [];
  for (const t of [...tensions].sort((x, y) => y.ecart - x.ecart)) {
    if (priorites.length === 3 || !eligible(t) || t.facettes.some((c) => utilisees.has(c))) continue;
    t.facettes.forEach((c) => utilisees.add(c));
    const [a, b] = t.facettes;
    const [haut, bas] = fp.facettes[a].moy >= fp.facettes[b].moy ? [a, b] : [b, a];
    priorites.push({ tension: t, haut, bas, domaine: t.domaine });
  }
  const noteEcartees = tensions.some((t) => !eligible(t))
    ? ` Les tensions portant sur ${liste([...FACETTES_NON_CIBLEES])} ou sur le domaine ${NOM_DOMAINE.N} ne sont pas instruites par le plan : elles se traitent en entretien.`
    : '';
  const itemsPlan = [
    priorites.length === 0
      ? con(`Pas de priorité de développement ; entretien de restitution seul. Aucune tension interne relevée ne désigne de piste que le plan puisse instruire : l’entretien de restitution de ce chapitre suffit à ce stade, et il ne sert à aucune décision d’emploi.${noteEcartees}`)
      : con(`Le plan de développement retient ${['', 'une priorité', 'deux priorités', 'trois priorités'][priorites.length]}, chacune tirée d’une tension interne relevée par les règles de l’outil (facettes distinctes). Chacune est suivie à 30, 60 et 90 jours avec un consultant qualifié, et ne sert à aucune décision d’emploi.${noteEcartees}`)
  ];
  const detailPriorites = priorites.map((pr, i) => {
    const nom = LIBELLE_DOMAINE[pr.domaine];
    const { haut, bas, tension } = pr;
    const bh = blocDe(haut);
    const bb = blocDe(bas);
    const blocsIds = [bh.id, bb.id];
    const decrit = (c) => `${c} « ${lib(c)} » à ${valeur(c)} (${niveauFacette(c)})`;
    const indicateurs = `à 30 jours, au moins deux situations repérées où « ${lib(haut)} » et « ${lib(bas)} » ont conduit à des comportements différents ; à 60 jours, nombre de fois où la façon convenue de limiter le coût possible de « ${lib(bas)} » a été mise en œuvre ; à 90 jours, avis de la personne sur l’utilité de cette façon de faire, noté de 1 à 5 lors du point final`;
    itemsPlan.push(hyp(
      `Priorité ${i + 1}, domaine ${nom} : tension ${tension.id} relevée par la règle ${tension.regle}, avec ${decrit(haut)} et ${decrit(bas)}, soit ${fmt(tension.ecart)} points d’écart. Hypothèse de travail : l’apport possible de « ${lib(haut)} » (« ${bh.apport[0]} ») et le coût possible de « ${lib(bas)} » (« ${bb.cout[0]} ») peuvent se rencontrer dans une même situation de travail ; à confirmer en entretien.`,
      'moyenne',
      'Demander à la personne si cette lecture lui parle et dans quelles situations elle la perçoit.',
      blocsIds
    ));
    itemsPlan.push(hyp(
      `À 30 jours : avec le consultant qualifié, tenir l’entretien de restitution et repérer deux situations de travail récentes où « ${lib(haut)} » et « ${lib(bas)} » ont conduit à des comportements différents ; questions de départ de la bibliothèque : « ${bh.question} » et « ${bb.question} ». À 60 jours : choisir une situation à venir de la tâche où l’apport possible de « ${lib(haut)} » peut servir, et convenir à l’avance d’une façon de limiter le coût possible de « ${lib(bas)} ». À 90 jours : faire le point avec le consultant qualifié, relire ce qui a été repéré et essayé, décider de conserver, d’ajuster ou d’abandonner cette façon de faire, et fixer si la personne le souhaite une nouvelle priorité.`,
      'faible',
      'Faire valider par la personne que les actions sont réalistes dans son emploi du temps et utiles pour son travail.',
      blocsIds
    ));
    itemsPlan.push(hyp(
      `Indicateurs : ${indicateurs}. Soutiens nécessaires : un consultant qualifié désigné par Tenga Conseil pour l’entretien et les points d’étape ; le rôle « ${p.role_equipe} » pour la mise en œuvre au quotidien ; un temps réservé dans l’agenda, à négocier avec la contrainte d’équipe projet mobilisée aux sept dixièmes de son temps.`,
      'faible',
      'Demander à la personne de quel soutien elle dispose déjà et de quel temps elle peut réellement disposer.'
    ));
    return { ...pr, nom, indicateurs, coutBas: bb.cout[0] };
  });
  ajouter('plan', `Chapitre ${p.code} : plan de développement à 30, 60 et 90 jours`, itemsPlan);

  // recommandations : une par priorité, puis l’entretien de restitution porté par le consultant
  const recs = detailPriorites.map((pr, i) => recT(
    `REC-N1-${p.code}-${i + 1}`,
    ID_NIVEAU,
    `Conduire la priorité ${i + 1} du plan de développement (domaine ${pr.nom}) sur 90 jours : explorer la tension ${pr.tension.id} avec un consultant qualifié, convenir d’une façon de limiter le coût possible de « ${lib(pr.bas)} », puis faire le point.`,
    {
      donnee: `Tension ${pr.tension.id} : écart de ${fmt(pr.tension.ecart)} points entre ${pr.haut} à ${valeur(pr.haut)} et ${pr.bas} à ${valeur(pr.bas)}.`,
      contexte: `Chapitre privé ${deCode(p.code)}, fonction « ${p.fonction} », tâche de nature « ${tache.nature} » avec des échéances rapprochées.`,
      risque: `Lire la tension ${pr.tension.id} comme un défaut à corriger plutôt que comme un point à explorer : le coût possible décrit pour « ${lib(pr.bas)} » (« ${pr.coutBas} ») deviendrait un reproche, dans un contexte où un précédent outil d’évaluation a laissé de la méfiance.`,
      responsable: p.role_equipe,
      horizon: '90 jours',
      indicateur: `${pr.indicateurs[0].toUpperCase()}${pr.indicateurs.slice(1)}.`
    }
  ));
  const plusNette = [...tensions].sort((a, b) => b.ecart - a.ecart)[0];
  const eloignee = [...forts].sort((a, b) => Math.abs(fp.facettes[b].moy - 3) - Math.abs(fp.facettes[a].moy - 3))[0];
  recs.push(recT(
    `REC-N1-${p.code}-${recs.length + 1}`,
    ID_NIVEAU,
    'Tenir l’entretien de restitution du chapitre individuel, en partant des questions des blocs de la bibliothèque et en laissant la personne corriger chaque lecture.',
    {
      donnee: plusNette
        ? `Tension la plus nette : ${plusNette.id}, écart de ${fmt(plusNette.ecart)} points.`
        : `Aucune tension interne relevée ; facette la plus éloignée du milieu : ${eloignee} à ${valeur(eloignee)} sur l’échelle de 1 à 5.`,
      contexte: `Les trente facettes ${deCode(p.code)} sont lues par des blocs non relus ; la fiabilité de la réponse n’est pas encore calculée, et le rapport prépare le travail d’un consultant qualifié.`,
      risque: `Un entretien mené sans la parole de la personne dans le rôle « ${p.role_equipe} » ferait passer des hypothèses pour des constats, d’autant que la passation a eu lieu en ${p.langue_passation} et que les indices de fiabilité ne sont pas calculés.`,
      responsable: CONSULTANT,
      horizon: '30 jours',
      indicateur: 'Entretien tenu avant la fin du premier mois, avec l’avis de la personne sur la justesse de chaque domaine, noté de 1 à 5.'
    }
  ));
  return { sections, recs };
}

/** ctx = { cas, faits, profils, bib, regles, refs } -> { niveau: { id, titre, sections }, recommandations } */
export function construire(ctx) {
  const sections = [];
  const recommandations = [];
  ctx.cas.personnes.forEach((p) => {
    if (!p.consentements?.individuel) return;
    const c = chapitre(ctx, p);
    sections.push(...c.sections);
    recommandations.push(...c.recs);
  });
  if (!sections.length) {
    sections.push(section('aucun-chapitre', 'Aucun chapitre individuel', [
      paragraphe('n1-aucun-chapitre-1', 'Aucune personne du cas n’a consenti au rapport individuel : aucun chapitre n’est produit.', { statut: 'constate' })
    ]));
  }
  return { niveau: { id: ID_NIVEAU, titre: 'Analyse individuelle', sections }, recommandations };
}
