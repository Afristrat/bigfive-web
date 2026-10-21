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

// Pratique à essayer à 60 jours, par domaine de la priorité.
const PRATIQUES = {
  N: 'tenir un court relevé hebdomadaire des moments de tension et de ce qui les a apaisés',
  E: 'choisir un type de réunion pour essayer une prise de parole plus ou moins fréquente et noter l’effet sur la décision',
  O: 'choisir une idée nouvelle et un sujet à cadrer, et noter le temps consacré à chacun',
  A: 'formuler un désaccord et une demande d’aide dans la même semaine, et noter l’accueil reçu',
  C: 'convenir d’un point d’étape sur une tâche avec un critère de fin explicite, et noter l’écart entre l’effort engagé et le résultat'
};

const regleDe = (regles, id) => {
  const r = regles.regles.find((x) => x.id === id);
  if (!r) throw new Error(`règle inconnue ${id}`);
  return r;
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

const mentionRelecture = (b) => (b.relecture === 'relue' ? 'bloc relu' : 'bloc non relu');

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
    sections.push(section(id, titre, items.map(([texte, options], i) => paragraphe(`n1-${id}-${i + 1}`, texte, options))));
  };
  const hyp = (texte, confiance, verification, bloc_ids) => [texte, { statut: 'hypothese', confiance, verification, bloc_ids }];
  const con = (texte) => [texte, { statut: 'constate' }];

  // (0) cadre
  ajouter('cadre', `${p.code} : ${p.nom}`, [
    con(`Chapitre privé de ${p.nom} (${p.code}). ${p.etiquette}. Fonction : ${p.fonction} ; niveau : ${p.niveau} ; ancienneté : ${p.anciennete} ; rôle dans l’équipe : ${p.role_equipe} ; périmètre de décision : ${p.perimetre_decision} ; langue de passation : ${p.langue_passation}.`),
    con('Ce chapitre n’existe que parce que la personne a consenti au niveau individuel. Aucune décision d’emploi ne peut s’appuyer sur ce chapitre. Les niveaux sont des conventions de l’outil, lues sur l’échelle de la personne elle-même : aucune comparaison à un groupe de référence n’est faite et aucune étiquette de type n’est attribuée.'),
    con('Chaque lecture qui suit est une hypothèse à confirmer en entretien, avec un niveau de confiance et une façon de la vérifier. Les textes des facettes viennent de la bibliothèque de textes et sont repris tels quels ; chacun porte la mention « bloc non relu » tant qu’une relecture humaine n’a pas eu lieu.')
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

  // (b) 30 facettes, domaine par domaine
  for (const l of lectures) {
    const items = l.codes.map((c) => {
      const b = blocDe(c);
      const niveau = fp.facettes[c].niveau;
      const avertissement = b.avertissement ? `Avertissement de la bibliothèque : ${b.avertissement} ` : '';
      const texte = `${c}, ${b.libelle} : ${valeur(c)} sur l’échelle de 1 à 5, niveau ${niveauFacette(c)}. ${avertissement}${b.description.join(' ')} Apport possible : ${b.apport.join(' ')} Coût possible : ${b.cout.join(' ')} Question pour l’entretien : ${b.question} (${mentionRelecture(b)}).`;
      return hyp(texte, niveau === 'milieu' ? 'faible' : 'moyenne', b.question, [b.id]);
    });
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
      `Points d’appui possibles, d’après les cinq facettes les plus éloignées du milieu de l’échelle : ${forts.map((c) => `${c} ${lib(c)} (${niveauFacette(c)}) : ${blocDe(c).apport[0]}`).join(' ')} Il se peut que ces apports servent la tâche décrite ci-dessus dans le rôle « ${p.role_equipe} ». Règle de lecture : ${regleDe(regles, 'CONTRIB-1').texte}`,
      'faible',
      'Demander dans quelles situations de la tâche ces apports ont déjà servi, et dans lesquelles ils ont plutôt gêné.',
      idsForts
    ),
    hyp(
      couts.length
        ? `Coûts possibles à explorer : ${forts.map((c) => `${c} : ${blocDe(c).cout[0]}`).join(' ')} Les facettes engagées dans une tension interne (${liste(couts)}) sont celles où un coût est à explorer en priorité.`
        : `Coûts possibles à explorer : ${forts.map((c) => `${c} : ${blocDe(c).cout[0]}`).join(' ')} Aucune facette n’est engagée dans une tension interne : ces coûts sont ceux que décrit la bibliothèque pour les mêmes facettes.`,
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

  // (g) plan de développement : trois domaines aux facettes les plus écartées (ordre N, E, O, A, C en cas d’égalité)
  const priorites = [...lectures].sort((x, y) => y.etendue - x.etendue || DOMAINES.indexOf(x.d) - DOMAINES.indexOf(y.d)).slice(0, 3);
  const itemsPlan = [
    con('Le plan de développement retient trois priorités, tirées des écarts les plus nets entre facettes d’un même domaine. Chacune est suivie à 30, 60 et 90 jours avec un consultant qualifié, et ne sert à aucune décision d’emploi.')
  ];
  const detailPriorites = priorites.map((l, i) => {
    const haut = l.codesMax[0];
    const bas = l.codesMin[0];
    const tension = tensions.find((t) => t.domaine === l.d && t.ecart === l.etendue);
    const nom = LIBELLE_DOMAINE[l.d];
    const blocsPaire = [fp.facettes[haut].bloc_id, fp.facettes[bas].bloc_id];
    const lienRegle = tension
      ? `Cet écart correspond à la tension ${tension.id} relevée par la règle ${tension.regle}, avec ${fmt(tension.ecart)} points d’écart.`
      : `Cet écart reste sous le seuil de ${fmt(conv.tension.ecart_min)} point qui définit une tension interne : il s’agit d’une piste de développement, non d’une tension relevée.`;
    itemsPlan.push(hyp(
      `Priorité ${i + 1}, domaine ${nom} : ${haut} « ${lib(haut)} » à ${valeur(haut)} (${niveauFacette(haut)}) et ${bas} « ${lib(bas)} » à ${valeur(bas)} (${niveauFacette(bas)}). ${lienRegle} Hypothèse de travail : la manière dont ces deux facettes s’expriment peut varier selon les situations.`,
      'moyenne',
      'Demander à la personne si cet écart lui parle et dans quelles situations elle le perçoit.',
      blocsPaire
    ));
    const bh = blocDe(haut);
    itemsPlan.push(hyp(
      `À 30 jours : avec le consultant qualifié, tenir l’entretien de restitution et repérer deux situations de travail récentes où « ${lib(haut)} » et « ${lib(bas)} » ont conduit à des comportements différents ; question de départ de la bibliothèque : « ${bh.question} » (${mentionRelecture(bh)}). À 60 jours : ${PRATIQUES[l.d]}. À 90 jours : faire le point avec le consultant qualifié, relire les situations consignées, décider de conserver, d’ajuster ou d’abandonner la pratique, et fixer si la personne le souhaite une nouvelle priorité.`,
      'faible',
      'Faire valider par la personne que les actions sont réalistes dans son emploi du temps et utiles pour son travail.',
      blocsPaire
    ));
    itemsPlan.push(hyp(
      'Indicateurs : à 30 jours, au moins deux situations consignées ; à 60 jours, nombre de fois où la pratique a été essayée et effet noté dans le relevé de la personne ; à 90 jours, avis de la personne sur l’utilité de la pratique, noté de 1 à 5 lors du point final. Soutiens nécessaires : un consultant qualifié désigné par Tenga Conseil pour l’entretien et les points d’étape ; le rôle « ' + p.role_equipe + ' » pour la mise en œuvre au quotidien ; un temps réservé dans l’agenda, à négocier avec la contrainte d’équipe projet mobilisée aux sept dixièmes de son temps.',
      'faible',
      'Demander à la personne de quel soutien elle dispose déjà et de quel temps elle peut réellement disposer.'
    ));
    return { l, haut, bas, tension, nom };
  });
  ajouter('plan', `Chapitre ${p.code} : plan de développement à 30, 60 et 90 jours`, itemsPlan);

  // recommandations
  const recs = detailPriorites.map(({ l, haut, bas, tension, nom }, i) => recommandation(
    `REC-N1-${p.code}-${i + 1}`,
    ID_NIVEAU,
    `Conduire la priorité ${i + 1} du plan de développement (domaine ${nom}) sur 90 jours : repérer deux situations, essayer une pratique adaptée, puis faire le point avec un consultant qualifié.`,
    {
      donnee: tension
        ? `Tension ${tension.id} : écart de ${fmt(tension.ecart)} points entre ${haut} à ${valeur(haut)} et ${bas} à ${valeur(bas)}.`
        : `Facettes du domaine ${nom} entre ${fmt(l.min)} (${bas}) et ${fmt(l.max)} (${haut}) sur l’échelle de 1 à 5.`,
      contexte: `Chapitre privé de ${p.code}, fonction « ${p.fonction} », tâche de nature « ${tache.nature} » avec des échéances rapprochées.`,
      risque: 'La démarche peut être vécue comme une évaluation, ce qui réveille la méfiance héritée d’un précédent outil d’évaluation et peut orienter les réponses en entretien.',
      responsable: p.role_equipe,
      horizon: '90 jours',
      indicateur: 'Situations consignées à 30 jours, pratique essayée à 60 jours, avis de la personne de 1 à 5 à 90 jours.'
    }
  ));
  const plusNette = [...tensions].sort((a, b) => b.ecart - a.ecart)[0];
  const eloignee = [...forts].sort((a, b) => Math.abs(fp.facettes[b].moy - 3) - Math.abs(fp.facettes[a].moy - 3))[0];
  recs.push(recommandation(
    `REC-N1-${p.code}-${recs.length + 1}`,
    ID_NIVEAU,
    'Tenir l’entretien de restitution du chapitre individuel avec un consultant qualifié, en partant des questions des blocs de la bibliothèque et en laissant la personne corriger chaque lecture.',
    {
      donnee: plusNette
        ? `Tension la plus nette : ${plusNette.id}, écart de ${fmt(plusNette.ecart)} points.`
        : `Aucune tension interne ; facette la plus éloignée du milieu : ${eloignee} à ${valeur(eloignee)} sur l’échelle de 1 à 5.`,
      contexte: `Les trente facettes sont lues par des blocs non relus ; la fiabilité de la réponse n’est pas encore calculée, et le rapport prépare le travail d’un consultant qualifié.`,
      risque: 'Un entretien mené sans la parole de la personne ferait passer des hypothèses pour des constats.',
      responsable: p.role_equipe,
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
