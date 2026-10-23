// Niveaux 3 (analyse d'équipe) et 4 (lecture organisationnelle agrégée) du rapport « cabinet ».
// Fonction pure : aucun aléa, aucun calcul de score. Tout nombre cité vient de faits.json, du cas ou de leurs listes.
// construire(ctx) -> { niveaux: [n3, n4], recommandations, reference_ids }
import { paragraphe, recommandation, section, liste, fmt, DOMAINES } from './outils.mjs';
import { relaisPrevus, perimetreAJour, LIENS } from '../moteur/reseau.mjs';

const NB = ' ';
const gui = (s) => `«${NB}${s}${NB}»`;
// Première lettre en minuscule, sauf pour un sigle (CNDP) ou un code (CT-01).
const minusc = (s) => (!s || /^[A-ZÉ]{2,}|^\S*\d/.test(s) ? s : s[0].toLowerCase() + s.slice(1));
const courbe = (s) => s.replace(/'/g, '’');

// Libellés de domaine sans le terme refusé par l'audit pour le domaine N.
const LIB = {
  N: 'névrosisme',
  E: 'énergie relationnelle, extraversion',
  O: 'ouverture',
  A: 'orientation vers autrui, agréabilité',
  C: 'rigueur et constance, conscienciosité'
};
const dom = (d) => `domaine ${d} (${LIB[d]})`;
const Dom = (d) => `Domaine ${d} (${LIB[d]})`;

const NIV_LOC = {
  bas: 'au niveau bas',
  plutot_bas: 'au niveau plutôt bas',
  milieu: "au milieu de l'échelle",
  plutot_haut: 'au niveau plutôt haut',
  haut: 'au niveau haut'
};
const NIVEAUX_ORDRE = ['bas', 'plutot_bas', 'milieu', 'plutot_haut', 'haut'];
const estHaut = (n) => n === 'plutot_haut' || n === 'haut';

const NATURE_FR = { routine: 'routine', creative: 'création', urgence: 'urgence', projet: 'projet à échéances' };
export const NATURE_LIEN = {
  ligne: 'ligne hiérarchique',
  fonctionnel: 'lien fonctionnel',
  pairs: 'pairs',
  'client-fournisseur': 'client-fournisseur interne',
  mentorat: 'mentorat',
  'co-direction': 'co-direction'
};

// Lecture des domaines, à l'échelle du domaine entier (jamais d'une facette). Accord selon le nombre de personnes citées.
const HYP_DOMAINE = {
  N: {
    haut: () => "un niveau plutôt haut ou haut peut s'accompagner d'une vigilance marquée devant les risques et les signaux de tension. Il se peut que cette vigilance serve l'équipe si elle est reconnue comme une veille des risques, et qu'elle pèse si elle reste portée sans relais.",
    bas: () => "un niveau plutôt bas ou bas peut s'accompagner d'un aplomb plus grand sous pression. Il se peut que des signaux faibles soient alors relevés plus tard, et que d'autres personnes de l'équipe doivent les porter.",
    verification: "Demander en entretien comment l'équipe repère un risque, qui en parle en premier et comment cela est reçu."
  },
  E: {
    haut: (n) => `un niveau plutôt haut ou haut peut s'accompagner d'une aisance à entrer en contact et à animer les échanges. Il se peut que ${n > 1 ? 'ces personnes servent' : 'cette personne serve'} de relais avec les autres sites et les parties prenantes, au risque de prendre beaucoup de place dans les échanges.`,
    bas: (n) => `un niveau plutôt bas ou bas peut s'accompagner d'une préférence pour les échanges restreints et la réflexion préalable. Il se peut que ${n > 1 ? 'leur' : 'sa'} contribution passe moins bien dans les réunions rapides et gagne à être sollicitée par écrit.`,
    verification: "Demander à l'équipe qui prend la parole en réunion, qui contribue plutôt par écrit, et si chacun trouve sa place dans les deux formats."
  },
  O: {
    haut: (n) => `un niveau plutôt haut ou haut peut s'accompagner d'un appétit pour la nouveauté et les alternatives. Il se peut que ${n > 1 ? 'ces personnes proposent' : 'cette personne propose'} plus d'idées que le cadre n'en peut absorber.`,
    bas: (n) => `un niveau plutôt bas ou bas peut s'accompagner d'une préférence pour ce qui est éprouvé. Il se peut que ${n > 1 ? 'ces personnes servent' : 'cette personne serve'} de garde-fou contre la dispersion, et que les idées nouvelles soient accueillies avec réserve.`,
    verification: "Demander ce qu'il advient d'une idée nouvelle proposée en équipe : qui la reprend, qui la freine, et pourquoi."
  },
  A: {
    haut: (n) => `un niveau plutôt haut ou haut peut s'accompagner d'une attention à la cohésion et à la coopération. Il se peut que le désaccord s'exprime moins facilement chez ${n > 1 ? 'ces personnes' : 'cette personne'}, et que la cohésion de l'équipe en dépende.`,
    bas: (n) => `un niveau plutôt bas ou bas peut s'accompagner d'une franchise dans le désaccord et d'une priorité donnée à la tâche. Il se peut que ${n > 1 ? 'ces personnes soient les premières' : 'cette personne soit la première'} à contredire, au risque de tensions relationnelles si le cadre ne l'autorise pas.`,
    verification: "Demander comment un désaccord s'est exprimé lors de la dernière décision difficile, et qui l'a formulé."
  },
  C: {
    haut: (n) => `un niveau plutôt haut ou haut peut s'accompagner de rigueur, de suivi des engagements et de souci du détail. Il se peut que ${n > 1 ? 'ces personnes tiennent' : 'cette personne tienne'} les échéances, au risque d'une moindre souplesse quand le plan change.`,
    bas: () => "un niveau plutôt bas ou bas peut s'accompagner d'une souplesse devant les changements de plan. Il se peut que le suivi fin des engagements demande alors des relais.",
    verification: "Demander comment l'équipe a réagi au dernier changement de plan et qui a tenu le suivi des engagements."
  }
};

// Lecture de la tâche : domaines à examiner en priorité, avec le côté qui sert la tâche.
const LECTURE_TACHE = {
  routine: {
    phrase: "Pour une tâche de routine, il se peut que la régularité et le suivi comptent davantage que l'appétit pour la nouveauté.",
    domaines: ['C']
  },
  creative: {
    phrase: "Pour une tâche de création, il se peut que l'ouverture aux idées nouvelles et la façon de les faire circuler comptent davantage que la régularité.",
    domaines: ['O', 'E']
  },
  urgence: {
    phrase: "Pour une tâche d'urgence, il se peut que la capacité à tenir le cap et à suivre les engagements pèse davantage que les préférences de méthode.",
    domaines: ['C']
  },
  projet: {
    phrase: "Pour une tâche de projet à échéances, il se peut que le suivi des engagements et la circulation de l'information entre les personnes pèsent davantage que les préférences de style.",
    domaines: ['C', 'E']
  }
};

const LECTURE_INTERDEPENDANCE = {
  'mise-en-commun': {
    titre: 'mise en commun',
    phrase: "chacune contribue de son côté à un résultat commun : il se peut que les écarts pèsent peu au quotidien et davantage au moment de l'assemblage",
    verification: "Demander à ces binômes comment leurs contributions sont assemblées, et à quel moment les écarts se révèlent."
  },
  sequentielle: {
    titre: 'séquence',
    phrase: "le travail de l'une alimente celui de l'autre : il se peut que les écarts de rythme et d'exigence se répercutent en aval, surtout près d'une échéance",
    verification: "Demander à ces binômes ce qui se passe quand la livraison de l'amont arrive tard ou incomplète."
  },
  reciproque: {
    titre: 'réciprocité',
    phrase: "les deux personnes s'ajustent en continu : il se peut que les écarts de communication et de gestion de la tension pèsent davantage que dans les autres formes d'interdépendance",
    verification: "Demander à ces binômes comment ils se réajustent quand les priorités changent, et qui prend l'initiative de le faire."
  }
};

const NOMS_REF = { 'house-2004': 'House et al.' };

export function construire(ctx) {
  const { cas, faits, refs } = ctx;
  for (const [cle, v] of [['cas', cas], ['faits', faits], ['refs', refs], ['faits.equipe', faits?.equipe], ['faits.organisation', faits?.organisation]]) {
    if (!v) throw new Error(`niveau34 : ${cle} manquant`);
  }

  // ---------------------------------------------------------------- outils locaux
  const utilisees = new Set();
  const nom = (id) => {
    const r = refs.references.find((x) => x.id === id);
    if (!r) throw new Error(`niveau34 : référence inconnue ${id}`);
    utilisees.add(id);
    return NOMS_REF[id] ?? liste(r.auteurs);
  };
  const c = (texte, brut = false) => ({ texte, statut: 'constate', brut });
  const h = (texte, confiance, verification) => ({ texte, statut: 'hypothese', confiance, verification });
  const sec = (k, cle, titre, specs) => {
    const id = `n${k}-${cle}`;
    const items = specs.filter(Boolean);
    return section(id, titre, items.map((s, i) => paragraphe(`${id}-${i + 1}`, s.brut ? s.texte : courbe(s.texte), s.statut === 'hypothese' ? { statut: 'hypothese', confiance: s.confiance, verification: courbe(s.verification) } : { statut: 'constate' })));
  };

  const toutes = cas.personnes;
  const consent = (p, cle) => p.consentements?.[cle] === true;
  const participants = toutes.filter((p) => consent(p, 'equipe'));
  const exclus = toutes.filter((p) => !consent(p, 'equipe'));
  const codesP = new Set(participants.map((p) => p.code));
  const tache = cas.tache;
  const nature = tache.nature;
  const natureFr = NATURE_FR[nature] ?? nature;

  const couvBrute = faits.equipe.couverture ?? {};
  const couv = (d) => ({
    hauts: (couvBrute[d]?.hauts ?? []).filter((x) => codesP.has(x)),
    bas: (couvBrute[d]?.bas ?? []).filter((x) => codesP.has(x))
  });
  const pilote = (pool) => pool.find((p) => p.niveau === 'direction') ?? pool[0] ?? toutes[0];
  const roleDe = (pool, pred) => (pool.find(pred) ?? pilote(pool)).role_equipe;
  const roleConformite = (pool) => (pool.find((x) => /conformité/i.test(`${x.perimetre_decision} ${x.fonction}`)) ?? pilote(pool)).role_equipe;

  const relationsP = (cas.relations ?? []).filter((r) => codesP.has(r.a) && codesP.has(r.b));
  const sansDirection = relationsP.filter((r) => r.sens === 'reciproque');
  const parInterdependance = (k) => relationsP.filter((r) => r.interdependance === k);
  const ids = (rels) => rels.map((r) => r.id).join(' ; ');

  const contraintes = cas.contraintes ?? [];
  const parType = (t) => contraintes.filter((x) => x.type === t);
  const idsCT = (arr) => liste(arr.map((x) => x.id));

  // ---------------------------------------------------------------- N3 : analyse d'équipe
  const langues = [...new Set(participants.map((p) => p.langue_passation))];
  const secPerimetre = sec(3, 'perimetre', 'Périmètre, consentements et limites', [
    c("Document de travail du consultant, jamais remis tel quel à un supérieur hiérarchique d'une personne citée."),
    participants.length >= 2
      ? c(`Cette analyse d'équipe porte sur ${participants.length} personnes ayant consenti à l'analyse d'équipe : ${liste(participants.map((p) => p.code))}. Elle compare ces personnes entre elles, chacune sur sa propre échelle, et ne les compare à aucun autre groupe.`)
      : c(`Moins de deux personnes ont consenti à l'analyse d'équipe : aucune lecture d'équipe n'est produite. Une lecture d'équipe suppose au moins deux personnes ayant consenti.`),
    exclus.length
      ? c(`L'exclusion de ${liste(exclus.map((p) => p.code))} résulte de l'absence de consentement à l'analyse d'équipe. Aucune donnée de ${exclus.length > 1 ? 'ces personnes' : 'cette personne'} n'est reprise dans ce niveau.`)
      : c("Aucune personne du cas n'est exclue de cette analyse : toutes ont consenti à l'analyse d'équipe."),
    participants.length >= 2
      ? c("Les niveaux (bas à haut) sont des conventions de l'outil, sans référence externe. Cette lecture ne prédit pas la performance de l'équipe : elle formule des hypothèses à vérifier en entretien, et aucune décision d'emploi ne peut s'y appuyer.")
      : null,
    participants.length >= 2
      ? c(langues.length > 1
        ? `Langues de passation du questionnaire dans l'équipe : ${participants.map((p) => `${p.code} (${p.langue_passation})`).join(', ')}. L'équivalence des versions n'est pas établie : toute comparaison entre ces personnes porte cette réserve de comparaison, et non un écart de personnalité.`
        : `Toutes les personnes de l'équipe ont répondu dans la même langue de passation (${langues[0]}).`)
      : null
  ]);

  // Cartographie
  const phraseCouv = (d) => {
    const l = couv(d).hauts;
    if (!l.length) return `aucune personne ne se situe plutôt haut ou haut sur le ${dom(d)}`;
    if (l.length === 1) return `une seule personne, ${l[0]}, se situe plutôt haut ou haut sur le ${dom(d)}`;
    return `${liste(l)} se situent plutôt haut ou haut sur le ${dom(d)}`;
  };

  const specCarto = [
    c("Les listes suivantes disent qui se situe où, domaine par domaine, d'après les niveaux conventionnels de chaque personne. Les personnes au milieu de l'échelle n'y figurent pas. Ces niveaux sont ceux du domaine entier : pour une personne donnée, une facette peut s'écarter du niveau de son domaine, ce que le niveau 1 détaille. Les domaines de personnalité ne sont pas des fonctions d'équipe : cette cartographie décrit des préférences de contribution, non des rôles à pourvoir.")
  ];
  for (const d of DOMAINES) {
    const { hauts, bas } = couv(d);
    specCarto.push(c(`${Dom(d)} : plutôt haut ou haut pour ${hauts.length ? liste(hauts) : 'aucune personne'} ; plutôt bas ou bas pour ${bas.length ? liste(bas) : 'aucune personne'}.`));
    const H = HYP_DOMAINE[d];
    const parts = [];
    if (hauts.length) parts.push(`Pour ${liste(hauts)}, ${H.haut(hauts.length)}`);
    if (bas.length) parts.push(`Pour ${liste(bas)}, ${H.bas(bas.length)}`);
    if (parts.length) specCarto.push(h(parts.join(' '), 'faible', H.verification));
  }
  const secCarto = sec(3, 'cartographie', 'Cartographie des contributions', specCarto);

  // Diversité et angles morts
  const eq = faits.equipe;
  const diverses = DOMAINES.filter((d) => eq.domaines?.[d]?.dispersion === 'diverse');
  const homogenes = DOMAINES.filter((d) => eq.domaines?.[d]?.dispersion === 'homogene');
  const entre = Object.keys(eq.facettes_etendue ?? {}).filter((k) => !(eq.facettes_diverses ?? []).includes(k) && !(eq.facettes_homogenes ?? []).includes(k));
  const nRel = relationsP.length;
  const nMc = parInterdependance('mise-en-commun').length;
  const nSq = parInterdependance('sequentielle').length;
  const nRc = parInterdependance('reciproque').length;

  const specDiv = [
    c(`Tâche de l'équipe : ${minusc(tache.description)}. Nature de la tâche saisie au cas : ${natureFr}.`),
    c(`Échéances du cas : ${(tache.echeances ?? []).join(' ; ')}.`),
    c(`Parmi les ${nRel} liens entre personnes ayant consenti à l'analyse d'équipe, l'interdépendance de la tâche est de mise en commun pour ${nMc}, de séquence pour ${nSq} et de réciprocité pour ${nRc} (typologie de ${nom('thompson-1967')}).`)
  ];
  if (exclus.length) {
    specDiv.push(c("La dispersion de l'équipe n'est pas reprise ici : le moteur l'a calculée avant le retrait d'un consentement, et elle doit être recalculée sans la personne exclue avant toute lecture."));
  } else {
    const nonDiverses = Object.keys(eq.facettes_etendue ?? {}).filter((k) => !(eq.facettes_diverses ?? []).includes(k));
    const parts = [];
    if (diverses.length) parts.push(`le moteur classe ${liste(diverses.map((d) => `le domaine ${d}`))} comme divers par leur dispersion (écart d'au moins un point, sur l'échelle de 1 à 5, entre la valeur la plus basse et la plus haute de l'équipe)`);
    if (homogenes.length) parts.push(`${liste(homogenes.map((d) => `le domaine ${d}`))} comme homogènes`);
    const f = [];
    if (parts.length) f.push(parts.join(' et ').replace(/^./, (x) => x.toUpperCase()) + '.');
    if (nonDiverses.length <= 3) {
      f.push(`Avec ${participants.length} personnes et un seuil d'un point d'étendue, ${nonDiverses.length ? `toutes les facettes sauf ${liste(nonDiverses)}` : 'toutes les facettes'} sont classées diverses : cet indicateur ne discrimine rien ici et n'est pas utilisé comme argument d'accompagnement.`);
    } else if ((eq.facettes_homogenes ?? []).length) f.push(`Facettes homogènes : ${liste(eq.facettes_homogenes)}.`);
    else f.push("Aucune facette n'est classée homogène.");
    if (entre.length) f.push(`${liste(entre)} ${entre.length > 1 ? "sont les seules facettes dont l'étendue se situe" : "est la seule facette dont l'étendue se situe"} entre les deux conventions (étendue de ${liste(entre.map((k) => `${fmt(eq.facettes_etendue[k])} point${eq.facettes_etendue[k] > 1 ? 's' : ''} pour ${k}`))}).`);
    specDiv.push(c(f.join(' ')));
  }
  specDiv.push(h(
    `Sur la composition des équipes, ${nom('bell-2007')} (2007) indique que la composition d'une équipe produit des effets variables selon le cadre d'étude. Que ces effets dépendent aussi de la nature de la tâche et de son interdépendance est un énoncé de la méthode de ce rapport, sans attribution à cette référence ; il n'existe pas de mélange universel. La diversité de cette équipe se lit donc par rapport à sa tâche, et non en elle-même.`,
    'faible',
    "Vérifier la référence avant diffusion, puis demander à l'équipe ce qui, dans sa composition, aide ou gêne son travail commun."
  ));
  const L = LECTURE_TACHE[nature];
  if (L) {
    const clauses = L.domaines.map(phraseCouv);
    const faible = L.domaines.some((d) => couv(d)[d === 'N' ? 'bas' : 'hauts'].length <= 1);
    specDiv.push(h(
      `${L.phrase} Dans cette équipe, ${clauses.join(' ; ')}.${faible ? " Un domaine sans personne, ou avec une seule personne, en position haute est un point d'attention pour cette tâche, non une fonction manquante." : ''}`,
      'moyenne',
      "Demander à l'équipe quels moments de la tâche ont été les plus difficiles à coordonner, et à qui elle s'adresse pour y remédier."
    ));
  }
  specDiv.push(h(
    "Si la tâche changeait de nature, la même diversité se lirait autrement : en routine, l'étendue sur l'ouverture (domaine O) compterait peu ; en création, elle deviendrait un atout à organiser ; en urgence, c'est la tenue du cap (domaine C) qui compterait ; en projet, ce sont les écarts de rythme et de suivi (domaine C) qui pèseraient aux échéances.",
    'faible',
    "Faire décrire par l'équipe un exemple récent où la même répartition aurait aidé ou gêné selon la nature de la tâche."
  ));
  for (const k of ['mise-en-commun', 'sequentielle', 'reciproque']) {
    const rels = parInterdependance(k);
    if (!rels.length) continue;
    const I = LECTURE_INTERDEPENDANCE[k];
    specDiv.push(h(`Liens en ${I.titre} (${ids(rels)}) : ${I.phrase}.`, 'faible', I.verification));
  }
  const secDiv = sec(3, 'diversite', 'Diversité et angles morts par rapport à la tâche', specDiv);

  // Décision
  const specDec = participants.map((p) => c(`${p.code}, ${minusc(p.role_equipe)} : ${minusc(p.perimetre_decision)}.`));
  const orientes = relationsP.filter((r) => r.sens !== 'reciproque');
  if (orientes.length) {
    specDec.push(c(`Liens orientés (de la personne qui oriente, décide ou fournit vers l'autre) : ${orientes.map((r) => `${r.sens === 'a->b' ? `${r.a} vers ${r.b}` : `${r.b} vers ${r.a}`} (${NATURE_LIEN[r.nature] ?? r.nature})`).join(' ; ')}.`));
  }
  if (sansDirection.length) {
    specDec.push(c(`Liens sans direction dominante : ${sansDirection.map((r) => `${r.id} (${NATURE_LIEN[r.nature] ?? r.nature})`).join(' ; ')}.`));
    specDec.push(h(
      `Pour les liens sans direction dominante (${ids(sansDirection)}), il se peut que la règle de décision soit implicite et que les désaccords se règlent au cas par cas. Une règle écrite de tranchage (qui décide, après quel délai, avec quel recours) est à instruire.`,
      'moyenne',
      'Demander à chaque binôme comment le dernier désaccord a été tranché, et par qui.'
    ));
  }
  const arbitrages = cas.strategie?.arbitrages ?? [];
  if (arbitrages.length) specDec.push(c(`Arbitrages déjà faits au cas : ${arbitrages.map(minusc).join(' ; ')}.`));
  const siegeBudget = arbitrages.some((a) => /siège/.test(a));
  specDec.push(h(
    `Les périmètres de décision sont répartis entre ${participants.length} personnes${siegeBudget ? ' et le siège pour le budget (arbitrage du cas)' : ''} : il se peut que le chemin d'une décision traverse plusieurs validations successives, et que leur durée pèse sur les échéances.`,
    'faible',
    "Faire retracer par l'équipe le parcours de la dernière décision importante : qui a été consulté, qui a validé, en combien de temps."
  ));
  const secDec = sec(3, 'decision', 'Mécanismes de décision', specDec);

  // Structure de l'équipe : liens déclarés au cas (structure prévue), jamais le réseau réel
  const POIDS_FREQ = { quotidienne: 3, hebdomadaire: 2, mensuelle: 1 };
  const FREQ_ADJ = { quotidienne: 'quotidien', hebdomadaire: 'hebdomadaire', mensuelle: 'mensuel' };
  const liensDe = (code) => relationsP.filter((r) => r.a === code || r.b === code);
  const autre = (r, code) => (r.a === code ? r.b : r.a);
  const amont = (r) => (r.sens === 'b->a' ? r.b : r.a);
  const aval = (r) => (r.sens === 'b->a' ? r.a : r.b);
  const paires = [];
  participants.forEach((p, i) => participants.slice(i + 1).forEach((q) => paires.push([p.code, q.code])));
  const sansLien = paires.filter(([x, y]) => !relationsP.some((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x)));
  const charge = participants.map((p) => ({ code: p.code, liens: liensDe(p.code), poids: liensDe(p.code).reduce((s, r) => s + (POIDS_FREQ[r.frequence] ?? 0), 0) }));
  const poidsMax = Math.max(0, ...charge.map((x) => x.poids));
  const poidsMin = Math.min(...charge.map((x) => x.poids));
  const carrefours = poidsMax > poidsMin ? charge.filter((x) => x.poids === poidsMax).map((x) => x.code) : [];
  const sequences = relationsP.filter((r) => r.interdependance === 'sequentielle' && r.sens !== 'reciproque');
  const relais = relaisPrevus(relationsP, participants.map((p) => p.code));
  // Relevé du réseau réel (étape 2) : lu seulement s'il a été calculé sur le périmètre actuel de l'analyse d'équipe.
  const rr = faits.reseau_reel;
  const releve = rr?.releve === true;
  const chaine = (code) => {
    const entrees = sequences.filter((r) => aval(r) === code).map(amont);
    const sorties = sequences.filter((r) => amont(r) === code).map(aval);
    return `${liste(entrees)} vers ${code} vers ${liste(sorties)}`;
  };
  const rares = relationsP.filter((r) => r.frequence === 'mensuelle');
  const detailFreq = (rels) => liste(Object.keys(POIDS_FREQ)
    .map((f) => [f, rels.filter((r) => r.frequence === f).length])
    .filter(([, n]) => n)
    .map(([f, n]) => `${n} ${FREQ_ADJ[f]}${n > 1 ? 's' : ''}`));

  const specStruct = [
    c(`Cette section lit les liens de travail déclarés au cas (nature, sens, fréquence, interdépendance) : ils décrivent la structure prévue de l'équipe. Le réseau réel, c'est-à-dire à qui chacun demande conseil, à qui il fait confiance et par où l'information circule vraiment, ${releve ? "fait l'objet d'un relevé distinct, présenté à la section suivante" : "n'est pas mesuré ici"} ; il peut s'écarter nettement de la structure prévue (réseau informel au sens de ${nom('krackhardt-hanson-1993')}, 1993).`),
    c(`${relationsP.length} lien${relationsP.length > 1 ? 's' : ''} déclaré${relationsP.length > 1 ? 's' : ''} sur ${paires.length} paire${paires.length > 1 ? 's' : ''} possible${paires.length > 1 ? 's' : ''} entre les personnes ayant consenti. ${sansLien.length ? `Paires sans lien déclaré : ${sansLien.map(([x, y]) => `${x} et ${y}`).join(' ; ')}.` : 'Chaque paire a un lien déclaré.'}`),
    c(`Liens déclarés par personne, et leur fréquence : ${charge.map((x) => `${x.code}, ${x.liens.length} lien${x.liens.length > 1 ? 's' : ''} (${detailFreq(x.liens)})`).join(' ; ')}.`)
  ];
  if (sequences.length) {
    specStruct.push(c(`Liens de séquence orientés (le travail de la première personne alimente celui de la seconde) : ${sequences.map((r) => `${amont(r)} vers ${aval(r)}`).join(' ; ')}.`));
  }
  for (const code of relais) {
    specStruct.push(h(
      `${code} se situe au milieu d'une chaîne de séquence déclarée (${chaine(code)}). Il se peut que les retards et les informations incomplètes de l'amont se concentrent à ce point de passage, et que ce rôle de relais n'apparaisse dans aucun organigramme ni dans aucune fiche de poste.`,
      'faible',
      `Demander à ${code} ce qu'il reçoit de l'amont, sous quelle forme et avec quel délai, et ce qu'il doit reprendre ou compléter avant de transmettre.`
    ));
  }
  if (carrefours.length) {
    specStruct.push(h(
      `En pondérant chaque lien par sa fréquence (quotidien 3, hebdomadaire 2, mensuel 1, convention de ce rapport), ${liste(carrefours)} ${carrefours.length > 1 ? 'portent' : 'porte'} la charge de liens la plus élevée de l'équipe. Il se peut que la coordination repose davantage sur ${carrefours.length > 1 ? 'ces personnes' : 'cette personne'}, et qu'une absence y produise un blocage que la structure prévue ne montre pas.`,
      'faible',
      `Demander à l'équipe ce qui s'est passé la dernière fois que ${carrefours.length > 1 ? `${carrefours.slice(0, -1).join(', ')} ou ${carrefours.at(-1)}` : carrefours[0]} était absent, et qui a pris le relais.`
    ));
  }
  if (rares.length) {
    specStruct.push(h(
      `Lien${rares.length > 1 ? 's' : ''} à fréquence mensuelle : ${rares.map((r) => `${r.id} (${NATURE_LIEN[r.nature] ?? r.nature})`).join(' ; ')}. Il se peut qu'un lien aussi espacé laisse passer des questions sans réponse entre deux rencontres, et que l'échange réel passe alors par une tierce personne.`,
      'faible',
      `Demander aux personnes concernées comment elles se joignent entre deux rencontres prévues, et par qui passe l'information dans l'intervalle.`
    ));
  }
  if (sansLien.length) {
    specStruct.push(h(
      `Pour les paires sans lien déclaré, il se peut que l'information transite par une tierce personne, ce qui allonge le circuit et charge cette personne.`,
      'faible',
      "Demander à chacune des deux personnes à qui elle s'adresse quand elle a besoin de l'autre."
    ));
  }
  const leviers = [];
  if (relais.length) leviers.push(`rendre visible et partager la charge de relais de ${liste(relais)} (un point de passage écrit, une personne de suppléance désignée)`);
  if (carrefours.length) leviers.push(`organiser une suppléance pour ${liste(carrefours)}, afin qu'aucune décision ne dépende d'une seule présence`);
  if (rares.length) leviers.push(`installer un canal d'échange entre deux rencontres sur ${rares.length > 1 ? 'les liens' : 'le lien'} ${ids(rares)}`);
  if (sansLien.length) leviers.push('créer un lien direct là où l\'information transite par un tiers');
  if (!leviers.length) leviers.push('confronter la structure prévue au réseau réel avant tout changement, faute de point de fragilité visible dans les liens déclarés');
  specStruct.push(h(
    `Leviers pour développer cette structure, à choisir avec l'équipe et non à imposer : ${leviers.join(' ; ')}. Le réseau informel se développe par des occasions de travail réelles, non par un organigramme ; ${nom('cross-parker-2004')} (2004) décrivent ce travail à partir des personnes centrales, des intermédiaires et des personnes en périphérie.`,
    'faible',
    "Soumettre ces leviers à l'équipe et lui demander lesquels répondent à une difficulté qu'elle a déjà rencontrée, et lesquels seraient une charge de plus."
  ));
  specStruct.push(c(releve
    ? "La section suivante compare la structure prévue au réseau réel, relevé auprès des membres de l'équipe par quatre questions (à qui chacun demande conseil, de qui il reçoit une information utile, à qui il pourrait signaler une erreur sans crainte, de qui il attend le travail pour avancer), avec un consentement spécifique, puisque chaque réponse porte sur des collègues. Cette comparaison est la seule lecture directe de la structure invisible de l'équipe."
    : "Étape suivante proposée, non réalisée dans ce rapport : relever le réseau réel par quatre questions posées à chaque membre (à qui il demande conseil, d'où lui vient l'information utile, à qui il se fie pour signaler une erreur, de qui il dépend pour avancer), avec un consentement spécifique, puisque chaque réponse porte sur des collègues, et un cadrage au titre de la loi 09-08. La comparaison entre la structure prévue et le réseau réel est la seule lecture directe de la structure invisible de l'équipe."));
  const secStruct = sec(3, 'structure', "Structure de l'équipe : liens déclarés et comment les développer", specStruct);

  // Réseau réel et écarts avec la structure prévue (étape 2). Jamais un classement de personnes : des positions et des
  // décomptes, toute lecture en hypothèse à vérifier en entretien. Sans accord de chaque personne représentée, aucun nom.
  // Une personne non représentée (opposée ou non informée) n'est jamais nommée : son opposition ne doit pas être visible de l'équipe.
  let secReseau = null;
  if (releve) {
    const aJour = perimetreAJour(rr, cas);
    const fictifR = rr.statut === 'fictif';
    const pluriel = (n, s, p = `${s}s`) => (n > 1 ? p : s);
    const specR = [];
    if (!aJour) {
      specR.push(c("Le relevé du réseau réel n'est pas repris ici : le moteur l'a lu avant un changement de consentement à l'analyse d'équipe, et il doit être recalculé sur le périmètre actuel avant toute lecture."));
    } else if (!rr.suffisant) {
      specR.push(c(`Relevé insuffisant : ${rr.n_repondants} ${pluriel(rr.n_repondants, 'répondant')} sur ${rr.n_representes} ${pluriel(rr.n_representes, 'personne représentée', 'personnes représentées')}, quand la lecture exige au moins ${rr.seuils.repondants_min} répondants et au moins ${rr.seuils.taux_reponse_min_pct} pour cent de réponses. Aucune lecture du réseau réel n'est produite : un lien que ne déclare pas une personne qui n'a pas répondu n'est pas un lien inexistant.${fictifR ? ' Relevé de démonstration fictif.' : ''}`));
    } else {
      const nominatif = rr.carte_nominative === true;
      const SEUIL_TXT = { conseil: 'au moins chaque mois', information: 'au moins chaque mois', confiance: `au moins ${gui('plutôt oui')}`, dependance: 'au moins chaque mois' };
      const LIEN_FR = {
        conseil: { titre: 'Conseil', question: 'à qui chacun demande conseil pour résoudre un problème de travail', verbe: 'demande conseil à' },
        information: { titre: 'Information', question: 'de qui chacun reçoit une information utile à son travail', verbe: 'reçoit une information utile de' },
        confiance: { titre: 'Confiance', question: 'à qui chacun pourrait signaler une erreur ou une difficulté sans crainte', verbe: 'pourrait signaler une erreur sans crainte à' },
        dependance: { titre: 'Dépendance', question: 'de qui chacun attend le travail pour avancer', verbe: 'attend le travail de' }
      };
      const FREQ_TXT = { 2: 'chaque mois', 3: 'chaque semaine', 4: 'chaque jour' };
      const e = rr.ecarts;
      const nP = rr.paires_possibles;
      const nNonRep = rr.non_representes.length;

      if (fictifR) specR.push(c("Relevé de démonstration fictif : les réponses de cette section sont toutes inventées pour illustrer la lecture ; personne n'a répondu au relevé du réseau réel."));
      specR.push(c(`Le relevé pose à chaque membre de l'équipe, sur la liste fermée des autres membres, quatre questions : à qui il demande conseil, de qui il reçoit une information utile, à qui il pourrait signaler une erreur sans crainte, de qui il attend le travail pour avancer. Un lien réel est retenu à partir de ${gui('chaque mois')} pour le conseil, l'information et la dépendance, et de ${gui('plutôt oui')} pour la confiance (conventions de ce rapport). Un lien n'est dit réciproque que si les deux personnes l'ont déclaré ; un lien déclaré d'un seul côté est présenté tel quel, jamais corrigé.`));
      specR.push(c(`Seuils de lecture, conventions de ce rapport : au moins ${rr.seuils.repondants_min} répondants et au moins ${rr.seuils.taux_reponse_min_pct} pour cent de réponses parmi les personnes représentées. Ici, ${rr.n_repondants} répondants sur ${rr.n_representes} personnes représentées : le relevé est lu.`));
      if (nNonRep) {
        specR.push(c(nNonRep > 1
          ? `${nNonRep} personnes non représentées dans ce relevé : leurs liens, dans les deux sens, sont retirés de la lecture, et rien n'est dit de leur place dans l'équipe.`
          : "1 personne non représentée dans ce relevé : ses liens, dans les deux sens, sont retirés de la lecture, et rien n'est dit de sa place dans l'équipe."));
      }
      specR.push(c(`Garantie du relevé : aucun usage pour une décision d'emploi ou une évaluation des personnes. Il sert à décrire avec l'équipe, en atelier de restitution, sa façon réelle de travailler ; les questions d'éthique propres à l'analyse de réseau en organisation sont traitées par ${nom('borgatti-molina-2003')} (2003).`));
      specR.push(c(nominatif
        ? "Chaque personne représentée a accepté que la carte nominative de l'équipe soit montrée aux membres en atelier : la carte du réseau réel, par type de lien, nomme les personnes."
        : "Au moins une personne représentée n'a pas accepté la carte nominative : aucune carte n'est montrée, et cette section ne donne que des indicateurs sans noms."));

      // Carte : indicateurs par type de lien, nominatifs seulement sur accord de chacun.
      const declares = [];
      for (const l of LIENS) {
        const L = LIEN_FR[l];
        const ind = rr.indicateurs[l];
        const tete = `${L.titre}, ${L.question} (${SEUIL_TXT[l]})`;
        const relies = ind.paires_reliees ? `${ind.paires_reliees} ${pluriel(ind.paires_reliees, 'paire reliée', 'paires reliées')} sur ${nP} possibles` : `aucune paire reliée sur ${nP} possibles`;
        if (nominatif) {
          const rec = rr.liens[l].filter((x) => x.reciproque);
          const un = rr.liens[l].filter((x) => !x.reciproque);
          const phrases = [`${tete} : ${relies}.`];
          if (rec.length) phrases.push(`${rec.length > 1 ? 'Liens réciproques' : 'Lien réciproque'} : ${rec.map((x) => `${x.a} et ${x.b}`).join(' ; ')}.`);
          if (un.length) {
            const cible = (x) => (x.declare_par === x.a ? x.b : x.a);
            phrases.push(`${un.length > 1 ? "Liens déclarés d'un seul côté" : "Lien déclaré d'un seul côté"} : ${un.map((x) => `${x.declare_par} ${L.verbe} ${cible(x)} (déclaré par ${x.declare_par} seulement)`).join(' ; ')}.`);
            declares.push(...un.map((x) => `${x.declare_par} vers ${cible(x)} (${L.titre.toLowerCase()})`));
          }
          specR.push(c(phrases.join(' ')));
        } else {
          const dont = ind.paires_reliees
            ? `, dont ${ind.reciproques ? `${ind.reciproques} par un lien réciproque` : 'aucune par un lien réciproque'} et ${ind.un_seul_cote ? `${ind.un_seul_cote} par un lien déclaré d'un seul côté` : "aucune par un lien déclaré d'un seul côté"}`
            : '';
          specR.push(c(`${tete} : ${relies}${dont}.`));
          if (ind.un_seul_cote) declares.push(l);
        }
      }
      specR.push(c(rr.liens_reciproques_total
        ? `Au total, ${rr.liens_reciproques_total} ${pluriel(rr.liens_reciproques_total, 'lien réciproque', 'liens réciproques')} sur les quatre types de lien.`
        : 'Aucun lien réciproque sur les quatre types de lien.'));

      // Écarts entre la structure prévue et le réseau réel.
      const nE = e.n_ecarts;
      specR.push(c(`Écarts entre la structure prévue (liens déclarés au cas, section précédente) et le réseau réel : ${nE ? `${nE} ${pluriel(nE, 'écart relevé', 'écarts relevés')}` : 'aucun écart relevé'}. Chaque écart est une hypothèse à vérifier en entretien, non un constat sur les personnes.`));
      const decrireHors = (x) => x.liens.map((k) => `${k.de} ${LIEN_FR[k.lien].verbe} ${k.de === x.a ? x.b : x.a} ${FREQ_TXT[k.valeur]}`).join(' ; ');
      const leviersR = [];
      if (nominatif) {
        for (const x of e.prevus_sans_lien_reel) {
          specR.push(h(
            `Lien prévu sans lien réel retenu : ${x.id} (${NATURE_LIEN[x.nature] ?? x.nature}, ${FREQ_ADJ[x.frequence] ?? x.frequence}). Aucune réponse ne relève, entre ${x.a} et ${x.b}, de conseil, d'information ou de dépendance au moins chaque mois, ni de confiance au moins ${gui('plutôt oui')}. Il se peut que ce lien existe surtout sur le papier, ou que ce qu'il devait porter passe par une tierce personne.`,
            'faible',
            `Demander à ${x.a} et à ${x.b} quand ce lien a servi pour la dernière fois, et par qui passe aujourd'hui ce qu'il devait porter.`
          ));
          leviersR.push(h(
            `Levier, lien prévu sans lien réel (${x.id}) : lui redonner une occasion de travail réelle, ou le retirer de la structure prévue s'il ne répond plus à un besoin, plutôt que de le maintenir sur le papier.`,
            'faible',
            `Demander à ${x.a} et à ${x.b} ce que ce lien devait apporter, et si ce besoin existe encore.`
          ));
        }
        if (e.prevus_non_lisibles.length) {
          specR.push(c(`${e.prevus_non_lisibles.length > 1 ? 'Liens prévus non lisibles' : 'Lien prévu non lisible'}, aucune des deux personnes n'ayant répondu : ${e.prevus_non_lisibles.join(' ; ')}.`));
        }
        if (e.structure_prevue_complete) {
          specR.push(c("La structure prévue relie chaque paire de personnes représentées : aucun lien réel ne peut apparaître hors de la structure prévue dans cette équipe."));
        } else if (!e.reels_hors_prevu.length) {
          specR.push(c("Aucun lien réel de conseil, d'information ou de dépendance, au moins chaque semaine, ne relie une paire que la structure prévue ne relie pas."));
        }
        for (const x of e.reels_hors_prevu) {
          specR.push(h(
            `Lien réel hors de la structure prévue : ${x.a} et ${x.b} (${decrireHors(x)}). Il se peut que ce lien porte une coordination qu'aucun organigramme ne prévoit, et qu'il disparaisse sans bruit si l'une des deux personnes change de poste.`,
            'faible',
            `Demander à ${x.a} et à ${x.b} ce qui passe par ce lien, et ce qui se passerait sans lui.`
          ));
          leviersR.push(h(
            `Levier, lien réel hors de la structure prévue (${x.a} et ${x.b}) : le reconnaître dans la structure prévue s'il porte une coordination nécessaire, afin qu'il ne repose pas sur la seule initiative des deux personnes.`,
            'faible',
            `Demander à ${x.a} et à ${x.b} si ce lien doit être reconnu, et sous quelle forme (point régulier, mention dans la répartition des rôles).`
          ));
        }
        for (const x of e.relais_reels) {
          const qui = x.demandeurs.length === 2
            ? `${liste(x.demandeurs)}, deux personnes qui ne se demandent pas conseil entre elles`
            : `${liste(x.demandeurs)}, dont au moins deux ne se demandent pas conseil entre elles`;
          if (e.relais_reels_non_prevus.includes(x.code)) {
            specR.push(h(
              `Relais réel de conseil : ${x.code} reçoit des demandes de conseil de ${qui}. Ce rôle n'apparaît pas dans la structure prévue. Il se peut que ${x.code} porte une charge de mise en relation que personne ne voit.`,
              'faible',
              `Demander à ${x.code} quelles questions lui sont adressées et ce qu'elles lui demandent de temps, puis demander à ${liste(x.demandeurs)} ce qu'ils pourraient se demander directement.`
            ));
            leviersR.push(h(
              `Levier, relais réel non prévu (${x.code}) : reconnaître cette charge de mise en relation (temps dédié, mention dans la répartition des rôles), ou ouvrir un échange direct entre ${liste(x.demandeurs)} pour les questions qui n'ont pas besoin d'intermédiaire.`,
              'faible',
              `Demander séparément à ${liste(x.demandeurs)} ce qu'ils demandent à ${x.code}, et à ${x.code} ce que cette charge lui coûte.`
            ));
          } else {
            specR.push(h(
              `Relais prévu et réel : ${x.code}, au milieu d'une chaîne de séquence prévue, reçoit aussi des demandes de conseil de ${qui}. Il se peut que ce point de passage concentre à la fois le travail et les questions.`,
              'faible',
              `Demander à ${x.code} ce qu'il reçoit comme travail et comme questions, et qui pourrait en prendre une part.`
            ));
          }
        }
        for (const code of e.relais_prevus_non_reels) {
          specR.push(h(
            `${code}, relais prévu au milieu d'une chaîne de séquence (section précédente), ne reçoit pas de demandes de conseil de deux personnes qui ne se consultent pas entre elles. Il se peut que la chaîne prévue fonctionne par la transmission du travail plutôt que par le conseil, ou que des questions la contournent.`,
            'faible',
            `Demander à ${code} ce qu'il reçoit de l'amont et ce qu'il transmet, puis demander aux autres membres à qui ils s'adressent quand une question bloque la chaîne.`
          ));
          leviersR.push(h(
            `Levier, relais prévu sans relais réel de conseil (${code}) : vérifier ce qui passe réellement par la chaîne de séquence prévue avant de lui attribuer, ou de lui retirer, une charge de relais.`,
            'faible',
            `Demander à ${code} et aux personnes de part et d'autre de la chaîne ce qui passe par ${code}, et ce qui le contourne.`
          ));
        }
        if (!e.relais_reels.length && !e.relais_prevus_non_reels.length) {
          specR.push(c(e.relais_prevus.length ? 'Aucun écart de relais : chaque relais prévu est aussi un relais réel de conseil.' : "Aucune personne n'apparaît comme relais réel de conseil, et la structure prévue ne prévoit aucun relais."));
        }
      } else {
        const parts = [
          `${e.prevus_sans_lien_reel.length ? `${e.prevus_sans_lien_reel.length} ${pluriel(e.prevus_sans_lien_reel.length, 'lien prévu', 'liens prévus')} sans lien réel retenu` : 'aucun lien prévu sans lien réel retenu'}`,
          e.structure_prevue_complete
            ? 'aucun lien réel hors de la structure prévue, qui relie chaque paire'
            : `${e.reels_hors_prevu.length ? `${e.reels_hors_prevu.length} ${pluriel(e.reels_hors_prevu.length, 'lien réel', 'liens réels')}` : 'aucun lien réel'} au moins hebdomadaire hors de la structure prévue`,
          `${e.relais_reels_non_prevus.length ? `${e.relais_reels_non_prevus.length} ${pluriel(e.relais_reels_non_prevus.length, 'relais réel de conseil non prévu', 'relais réels de conseil non prévus')}` : 'aucun relais réel de conseil non prévu'}`,
          `${e.relais_prevus_non_reels.length ? `${e.relais_prevus_non_reels.length} ${pluriel(e.relais_prevus_non_reels.length, "relais prévu qui n'apparaît pas", "relais prévus qui n'apparaissent pas")} comme relais réel` : "aucun relais prévu qui n'apparaisse pas comme relais réel"}`
        ];
        specR.push(c(`Écarts, sans noms : ${parts.join(' ; ')}.`));
        if (nE) {
          specR.push(h(
            "Il se peut que la coordination réelle de l'équipe emprunte d'autres chemins que ceux de la structure prévue. Ces écarts sont à instruire avec l'équipe, sans chercher à savoir qui a répondu quoi.",
            'faible',
            "En atelier, présenter ces décomptes à l'équipe et lui demander quels chemins réels elle reconnaît, sans demander à quiconque de dévoiler ses réponses."
          ));
          leviersR.push(h(
            "Levier, écarts sans noms : laisser l'équipe désigner elle-même, en atelier, les liens prévus qui ne servent plus et les chemins réels à reconnaître, plutôt que de les déduire du relevé.",
            'faible',
            "Demander à l'équipe, collectivement, quels liens elle propose de reconnaître ou de retirer, et ce qui la retient de le faire."
          ));
        }
      }
      if (declares.length) {
        leviersR.push(h(
          "Levier, liens déclarés d'un seul côté : les présenter en atelier comme des attentes à éclaircir, non comme des erreurs du relevé, sans demander à quiconque de justifier sa réponse.",
          'faible',
          "Demander à l'équipe, collectivement, ce qu'un lien déclaré d'un seul côté peut signifier dans son travail (une attente, un rythme différent, une question restée sans réponse)."
        ));
      }
      leviersR.push(h(
        "Levier, suivi : refaire le relevé après un délai convenu avec l'équipe, dans la limite de la durée de conservation du relevé, pour voir ce qui a bougé ; les leviers sont à choisir avec l'équipe, non à imposer.",
        'faible',
        "Convenir avec l'équipe du moment du prochain relevé et des changements qu'elle souhaite y voir apparaître."
      ));
      specR.push(...leviersR);
    }
    secReseau = sec(3, 'reseau-reel', 'Réseau réel et écarts avec la structure prévue', specR);
  }

  // Sécurité psychologique
  const facteurs = [];
  const heritage = parType('heritage')[0];
  if (heritage) facteurs.push(`${heritage.id} : ${minusc(heritage.libelle)}`);
  const hier = relationsP.filter((r) => r.nature === 'ligne' || r.nature === 'mentorat');
  if (hier.length) facteurs.push(`des liens de ligne ou de mentorat au sein de l'équipe (${ids(hier)})`);
  if (langues.length > 1) facteurs.push('des langues de passation différentes');
  const secSecu = sec(3, 'securite-psychologique', 'Sécurité psychologique à instruire', [
    c(`Les profils mesurent des préférences de comportement ; ils ne mesurent pas la sécurité psychologique, c'est-à-dire la croyance partagée qu'on peut prendre la parole, signaler une erreur ou poser une question sans risque (notion d'${nom('edmondson-1999')}). Elle s'instruit par entretien et par observation, jamais par déduction à partir d'un profil.`),
    facteurs.length ? c(`Éléments du cas qui invitent à l'instruire : ${facteurs.join(' ; ')}.`) : null,
    h(
      `Il se peut que la prise de parole sur les erreurs, les doutes et les désaccords soit freinée là où ces éléments se combinent${hier.length ? `, en particulier dans les liens où une personne oriente ou décide pour l'autre (${ids(hier)})` : ''}. Cette hypothèse est la plus fragile de ce niveau : elle ne repose sur aucune donnée de profil.`,
      'faible',
      `Conduire des entretiens individuels courts autour d'une question commune, ${gui("Que se passe-t-il ici quand quelqu'un signale une erreur ?")}, puis observer deux réunions.`
    )
  ]);

  // Coordination
  const specCoord = [];
  for (const risque of tache.risques ?? []) {
    specCoord.push(c(`Risque inscrit au cas : ${minusc(risque)}.`));
    if (/CNDP|autorisation/i.test(risque)) {
      specCoord.push(h(`Ce risque tient à un délai extérieur à l'équipe. Il se peut que la part maîtrisable du risque (qualité du dossier, relances, suivi) soit déterminante : ${phraseCouv('C')}, ce qui reste à confirmer en entretien.`, 'faible', "Demander qui suit le dossier, comment les relances sont organisées et quelle part du délai l'équipe estime maîtrisable."));
    } else if (/siège|décalage|langue/i.test(risque)) {
      specCoord.push(h(`Ce risque tient à la circulation de l'information entre sites et à la langue du groupe. Il se peut que des décisions attendues glissent faute de règle de communication asynchrone ; ${phraseCouv('E')}, ce qui peut aider à entretenir le lien sans remplacer une règle. Le volet des sites est lu au niveau 4.`, 'faible', "Demander quelles décisions ont attendu le plus longtemps la validation du siège, et pour quelle raison."));
    } else if (/méfiance/i.test(risque)) {
      specCoord.push(h("Ce risque rejoint la sécurité psychologique à instruire : il se peut que la transparence sur l'usage des résultats, plutôt que la composition de l'équipe, soit le levier principal.", 'faible', "Demander aux membres de l'équipe ce qu'ils craignent que l'on fasse des résultats, et ce qui les rassurerait."));
    } else {
      specCoord.push(h("Il se peut que ce risque se lise d'abord par la tâche et le contexte plutôt que par les profils.", 'faible', "Demander à l'équipe comment ce risque s'est déjà manifesté, et qui l'a traité."));
    }
  }
  specCoord.push(h(
    `Avec des échéances rapprochées, il se peut que les écarts de rythme entre personnes pèsent davantage à l'approche des dates. En position de rigueur : ${phraseCouv('C')}.`,
    'faible',
    "Demander à l'équipe comment elle gère un retard de l'un de ses membres à l'approche d'une échéance."
  ));
  const sources = [];
  if (sansDirection.length) sources.push('les liens sans direction dominante');
  if (nRc) sources.push("les liens d'interdépendance réciproque");
  if (sources.length) {
    const nb = ['', 'Une source', 'Deux sources', 'Trois sources'][sources.length];
    specCoord.push(h(`${nb} de risque de coordination ${sources.length > 1 ? 'ressortent' : 'ressort'} de ce niveau : ${liste(sources)}. Ce sont des points d'attention à instruire, pas des prévisions.`, 'faible', "Soumettre cette liste à l'équipe et lui demander lesquels de ces points elle reconnaît, lesquels manquent."));
  }
  const secCoord = sec(3, 'coordination', 'Risques de coordination', specCoord);

  const n3 = {
    id: 'n3-equipe',
    titre: "Analyse d'équipe",
    sections: participants.length >= 2 ? [secPerimetre, secCarto, secDiv, secDec, secStruct, secReseau, secSecu, secCoord].filter(Boolean) : [secPerimetre]
  };

  // ---------------------------------------------------------------- N4 : lecture organisationnelle
  const org = faits.organisation;
  const poolOrg = toutes.filter((p) => consent(p, 'organisation'));
  const sansConsentOrg = toutes.filter((p) => !consent(p, 'organisation'));
  const seuil = org.seuil_anonymat;
  const n = org.n_personnes;
  const derogation = org.derogation_demonstration;
  const derogationApplicable = !org.seuil_atteint && cas.fictif === true && typeof derogation === 'string' && derogation.length > 0;
  const agregatAutorise = sansConsentOrg.length === 0 && (org.seuil_atteint || derogationApplicable);

  const specSeuil = [
    org.seuil_atteint
      ? c(`Le seuil d'anonymat de ${seuil} personnes est atteint : l'effectif de ce cas est de ${n} personnes. La lecture agrégée peut être montrée ; elle ne décrit aucune personne en particulier.`)
      : c(`Le seuil d'anonymat de ${seuil} personnes n'est pas atteint : l'effectif de ce cas est de ${n} personnes. En dessous de ce seuil, un agrégat permettrait de retrouver des personnes.`),
    !org.seuil_atteint && derogationApplicable ? c(derogation, true) : null,
    !org.seuil_atteint && derogationApplicable
      ? c((() => {
        const reels = toutes.filter((p) => p.fictif === false).map((p) => p.code);
        return reels.length ? `Précision : le cas est fictif, à l'exception du profil estimé de ${liste(reels)}, consenti (estimation, pas une mesure).` : 'Précision : le cas est entièrement fictif.';
      })())
      : null,
    sansConsentOrg.length
      ? c("Au moins une personne n'a pas consenti à la lecture organisationnelle : l'agrégat du moteur doit être recalculé sans elle avant toute lecture. La lecture agrégée n'est pas produite.")
      : null,
    !org.seuil_atteint && !derogationApplicable && !sansConsentOrg.length
      ? c("La dérogation de démonstration ne s'applique pas à ce cas : la lecture agrégée (profils d'ensemble, adéquation, implications) n'est pas produite. Seuls les éléments qui ne dérivent pas des profils (contraintes, volet des sites) sont présentés.")
      : null,
    c(`Règle de fond : cette lecture agrégée ne doit jamais être produite pour un effectif réel inférieur à ${seuil} personnes ; la dérogation de démonstration est réservée aux cas fictifs et consentis. Ce niveau décrit l'organisation, pas les personnes, et aucune décision d'emploi ne peut s'y appuyer.`)
  ];
  const secSeuil = sec(4, 'seuil', "Seuil d'anonymat et dérogation de démonstration", specSeuil);

  const ag = org.agregats;
  const niv = (d) => ag?.domaines?.[d]?.niveau;
  const dominants = agregatAutorise ? DOMAINES.filter((d) => estHaut(niv(d))) : [];
  const secProfils = agregatAutorise
    ? sec(4, 'profils', "Position d'ensemble de l'équipe", [
      c("Position d'ensemble de l'équipe par domaine, d'après les niveaux conventionnels de la position d'ensemble calculée sur l'ensemble des personnes (échelle de 1 à 5, sans référence externe)."),
      ...DOMAINES.map((d) => {
        const rep = NIVEAUX_ORDRE.filter((k) => (ag.repartition?.[d]?.[k] ?? 0) > 0).map((k) => `${ag.repartition[d][k]} ${NIV_LOC[k]}`);
        return c(`${Dom(d)} : la position d'ensemble de l'équipe se situe ${NIV_LOC[niv(d)]}. Répartition des niveaux individuels : ${liste(rep)}.`);
      }),
      h(
        `La position d'ensemble ne décrit aucune personne : elle masque la dispersion individuelle. ${dominants.length ? `Les domaines où elle se situe plutôt haut ou haut sont ${liste(dominants.map((d) => `le ${dom(d)}`))} ; ce sont les domaines dominants de l'ensemble au sens de cette lecture, et non des traits de l'organisation.` : "Aucun domaine ne se situe plutôt haut ou haut en position d'ensemble."}`,
        'moyenne',
        "Confronter cette position d'ensemble à la perception du commanditaire et de l'équipe sur ce qui fonctionne et sur ce qui manque."
      )
    ])
    : null;

  // Adéquation
  const o = cas.organisation;
  const strat = cas.strategie;
  const cadre = (regle) => (regle.startsWith('ADEQ-STRUCT') ? `configurations de ${nom('mintzberg-1979')}` : regle.startsWith('ADEQ-CULT') ? `modèle des valeurs concurrentes de ${nom('cameron-quinn-1999')}` : `distinction entre exploration et exploitation de ${nom('march-1991')}`);
  const lectures = (org.adequation ?? []).filter((x) => /^(ADEQ-STRUCT|ADEQ-CULT|CAL-ORI)/.test(x.regle));
  const structureRigide = o.structure === 'bureaucratie mécaniste' && o.culture === 'hiérarchie' && ['croissance', 'exploration'].includes(strat.orientation);
  let secAdeq = null;
  if (agregatAutorise) {
    const spec = [
      c(`Configuration saisie au cas : structure ${gui(o.structure)} (${nom('mintzberg-1979')}), culture dominante ${gui(o.culture)} (${nom('cameron-quinn-1999')}), orientation des objectifs ${gui(strat.orientation)} (${nom('march-1991')}).`)
    ];
    for (const x of lectures) {
      spec.push(h(`${x.lecture} Cadre de lecture : ${cadre(x.regle)}.`, 'moyenne', "Confirmer en entretien avec le commanditaire et avec des membres de l'équipe que la configuration décrite correspond à ce qu'ils vivent."));
    }
    if (structureRigide) {
      spec.push(h(
        `Selon ${nom('march-1991')}, mener l'exploitation de l'existant et l'exploration de pistes nouvelles à la fois est difficile. Une orientation de ${strat.orientation} dans une ${o.structure} suppose d'exploiter l'existant (processus, conformité) et d'explorer le canal nouveau ; il se peut que l'équipe porte cette double demande avec des ressources contraintes.`,
        'faible',
        "Demander au commanditaire quelle part des objectifs relève de la nouveauté et quelle part de l'amélioration de l'existant."
      ));
      spec.push(h(
        `Les lectures de structure et de culture valorisent la maîtrise des processus, quand l'orientation sollicite la nouveauté. En position d'ensemble, le ${dom('C')} se situe ${NIV_LOC[niv('C')]} et le ${dom('O')} ${NIV_LOC[niv('O')]} : ${estHaut(niv('C')) && estHaut(niv('O')) ? "l'ensemble dispose, au niveau agrégé, des deux ressources." : "les deux ressources ne sont pas toutes deux en position haute au niveau agrégé."} Selon le modèle de congruence (${nom('nadler-tushman-1980')}), la question porte alors moins sur les profils que sur l'espace laissé à l'ouverture dans un cadre de processus standardisés.`,
        'faible',
        "Demander où, dans le fonctionnement actuel, une proposition nouvelle peut être faite, qui la reçoit et en combien de temps elle obtient une réponse."
      ));
    } else {
      spec.push(h(
        `Selon le modèle de congruence (${nom('nadler-tushman-1980')}), l'enjeu est l'accord entre les profils, la structure, la culture et les objectifs : les lectures ci-dessus montrent des accords et des tensions à instruire.`,
        'faible',
        "Demander au commanditaire où il observe aujourd'hui un accord ou un frottement entre la façon de travailler de l'équipe et ce que l'organisation attend d'elle."
      ));
    }
    secAdeq = sec(4, 'adequation', "Adéquation avec la structure, la culture et l'orientation", spec);
  }

  // Contraintes
  const ctCNDP = contraintes.find((x) => /CNDP/.test(x.libelle));
  const ctTransfert = contraintes.find((x) => /^Transfert/.test(x.libelle));
  const europeen = /européen/i.test(o.historique ?? '');
  const specCt = [
    c(`Le droit marocain est la référence : loi 09-08 relative aux données à caractère personnel (contrôlée par la CNDP) et Code du travail (loi 65-99).${europeen ? ' Le groupe étant européen (cas), le RGPD et le règlement 2024/1689 sur l\'intelligence artificielle peuvent aussi s\'appliquer ; la règle de prudence est d\'appliquer l\'exigence la plus forte des deux cadres.' : ' Le RGPD et le règlement 2024/1689 sur l\'intelligence artificielle ne s\'appliquent que si l\'organisation y est soumise.'} La règle selon laquelle aucune décision d'emploi ne s'appuie sur ces rapports est posée par l'outil ; son articulation avec le Code du travail (loi 65-99) est à instruire par Tenga Conseil. Base juridique à faire instruire par Tenga Conseil avant tout usage.`),
    ...contraintes.map((x) => {
      const dur = x.durete === 'dure' ? 'dure' : 'négociable';
      if (/décision d'emploi/.test(x.libelle)) return c(`${x.id}, dureté ${dur} : aucune décision d'emploi ne peut s'appuyer sur ces rapports (règle posée par l'outil ; son articulation avec le Code du travail (loi 65-99) est à instruire par Tenga Conseil).`);
      return c(`${x.id}, dureté ${dur} : ${x.libelle}.`);
    }),
    contraintes.some((x) => x.durete === 'dure')
      ? h(`Les contraintes dures (${idsCT(contraintes.filter((x) => x.durete === 'dure'))}) ne se négocient pas : toute lecture et toute recommandation les respectent. Les contraintes réglementaires${parType('reglementation').length ? ` (${idsCT(parType('reglementation'))})` : ''} conditionnent l'usage des données et des rapports et s'instruisent avant toute action.`, 'moyenne', 'Faire confirmer par le commanditaire la dureté de chaque contrainte et son échéance.')
      : null,
    ctCNDP
      ? h(`Le traitement dans son ensemble est soumis à déclaration ou autorisation préalable (à confirmer par Tenga Conseil) ; ${ctCNDP.id} pose en outre cette exigence avant les niveaux 2 et 3${ctTransfert ? `, et le cadre du transfert vers le siège (${ctTransfert.id}) reste à instruire avant tout envoi de données` : ''}.`, 'moyenne', "Faire vérifier par Tenga Conseil l'état de la déclaration auprès de la CNDP et le cadre du transfert avant toute diffusion.")
      : null,
    contraintes.some((x) => x.durete !== 'dure')
      ? h(
        `Les contraintes négociables (${idsCT(contraintes.filter((x) => x.durete !== 'dure'))}) offrent la marge de manœuvre : la première piste pour desserrer une friction se cherche là.${parType('ressources').length || parType('budget').length ? ` Les ressources et le budget (${idsCT([...parType('ressources'), ...parType('budget')])}) se négocient en temps et en format d'action.` : ''}${parType('heritage').length || parType('syndical').length ? ` Il se peut que l'héritage de méfiance et l'information des représentants du personnel (${idsCT([...parType('heritage'), ...parType('syndical')])}) soient à séquencer plutôt qu'à négocier : ils conditionnent l'accueil de la démarche.` : ''}`,
        'moyenne',
        'Faire confirmer par le commanditaire ce qui est réellement négociable, avec qui, et dans quel délai.'
      )
      : null
  ];
  const secCt = sec(4, 'contraintes', 'Contraintes et cadre juridique', specCt);

  // Interculturel (organisation et sites seulement)
  const ic = cas.interculturel;
  let secIc = null;
  if (ic?.actif) {
    const passations = [...new Set(toutes.map((p) => p.langue_passation))];
    const cmm = ic.culture_maison_mere;
    const cloc = ic.culture_locale;
    const spec = [
      c("Ce volet est lu au niveau de l'organisation et de ses sites seulement : aucune tendance de pays n'est appliquée à une personne, et rien dans ce volet ne décrit un individu."),
      c(`Sites en présence : ${liste(ic.sites)}. Langues de travail : ${liste(ic.langues_travail)}. Fuseaux horaires concernés : ${liste(ic.fuseaux)}.`),
      c([ic.rapport_siege_filiale, ic.part_expatries, ic.travail_reparti].filter(Boolean).map((x) => `${x}.`).join(' ')),
      cmm && cloc ? c(`Culture d'organisation de la maison mère : ${cmm} ; de la filiale : ${cloc} ; culture dominante saisie pour l'organisation : ${o.culture} (quadrants de ${nom('cameron-quinn-1999')}). Ce sont des cultures d'entités, jamais des traits attribués à une personne.`) : null,
      (ic.sites ?? []).length > 1 ? h("Il se peut que des frictions viennent des règles du jeu propres à chaque site (circuits de décision, rituels, horaires) plutôt que des personnes. Le rapport entre le siège et la filiale encadre la marge de décision locale : il se peut que les délais de validation pèsent sur le calendrier du lancement.", 'moyenne', "Demander à chaque site comment une décision se prend chez lui, et combien de temps prend une validation du siège.") : null,
      (ic.langues_travail ?? []).length > 1 ? h(`Plusieurs langues de travail coexistent (${ic.langues_travail.length} ici) : il se peut que le choix de la langue selon le type d'échange (décision, documents de pilotage, échanges informels) mérite une règle explicite.`, 'moyenne', "Demander dans quelle langue se prennent les décisions, s'écrivent les documents et se tiennent les échanges informels, et ce qui se perd à chaque passage d'une langue à l'autre.") : null,
      (ic.fuseaux ?? []).length > 1 ? h("Le travail est réparti entre plusieurs fuseaux horaires : il se peut que les réunions et les validations demandent des règles de communication asynchrone.", 'moyenne', "Demander quelles réunions tombent hors des heures de travail d'un site, et ce qui est décidé par écrit.") : null,
      ic.part_expatries ? h("Des postes de direction sont occupés par des expatriés du groupe : il se peut que les références de fonctionnement du siège et celles de la filiale se rencontrent dans l'équipe de direction.", 'faible', "Demander à l'équipe de direction quelles habitudes de travail du siège et de la filiale se contredisent, et comment elles sont arbitrées.") : null,
      cmm && cloc && cmm !== cloc ? h(`Deux logiques de culture d'organisation coexistent, celle de la maison mère (${cmm}) et celle de la filiale (${cloc}), au-dessus de la culture dominante saisie (${o.culture}) : il se peut que la logique de la maison mère s'impose sur le budget et les outils, et celle de la filiale sur l'exécution. Le calibrage doit dire laquelle s'applique à chaque situation étudiée.`, 'faible', "Demander, pour trois décisions récentes, quelle logique (siège, filiale, métier) a finalement prévalu et pourquoi.") : null,
      c(`Piège 1, les grilles culturelles nationales : celles de ${nom('hofstede')}, de l'étude GLOBE (${nom('house-2004')}), de ${nom('meyer-2014')} (carte culturelle) et de ${nom('hall-1976')} (contexte élevé ou faible) décrivent des tendances de pays, non des personnes. Les appliquer à un individu est une erreur de raisonnement (erreur écologique). À l'usage, elles ne servent qu'à lire les règles du jeu d'une organisation et les frottements entre ses sites.`),
      c(`Piège 2, les styles de réponse : la façon de répondre à un questionnaire (tendance à acquiescer, à éviter les extrêmes) peut varier selon la langue de passation. Tant que l'équivalence des versions n'est pas établie, comparer des personnes ayant répondu dans des langues différentes demande de la prudence, et la langue de passation est indiquée à côté de toute comparaison. Dans ce cas, ${passations.length > 1 ? `les langues de passation sont ${liste(passations)}` : `la langue de passation est ${passations[0]}`}.`),
      c("Piège 3, la coexistence des cultures : dans un groupe, la culture de la maison mère, celle de la filiale et celle des métiers coexistent. Toute lecture doit dire laquelle s'applique à la situation étudiée (par exemple une équipe projet répartie entre plusieurs sites), faute de quoi elle mélange des règles du jeu différentes.")
    ];
    secIc = sec(4, 'interculturel', 'Volet interculturel : organisation et sites', spec);
  }

  // Implications
  const roles = poolOrg.map((p) => minusc(p.role_equipe));
  const indic = strat.indicateurs ?? [];
  const specImpl = [
    h(
      structureRigide
        ? "Structure : dans une organisation à processus standardisés, il se peut que la nouveauté (canal en ligne, ouverture et énergie relationnelle de l'ensemble) demande un espace à décisions déléguées, par exemple une équipe projet à mandat clair, plutôt qu'un passage par la ligne ordinaire."
        : "Structure : les lectures d'adéquation ci-dessus invitent à vérifier si la structure laisse de la place aux domaines que l'orientation des objectifs sollicite.",
      'faible',
      "Demander au commanditaire quelles décisions du projet peuvent être prises sans passer par la ligne ordinaire, et lesquelles non."
    ),
    h(
      `Rôles : les rôles tenus au cas sont ${liste(roles)}. Il se peut que chacun gagne à avoir un suppléant désigné, de façon que la tâche ne dépende pas d'une seule personne pour une fonction (niveau 3).`,
      'faible',
      "Demander à chaque rôle ce qui s'arrêterait s'il était absent deux semaines, et qui prendrait le relais."
    ),
    h(
      `Rituels : il se peut qu'un point de coordination régulier à horaire compatible avec les fuseaux, une revue de risques courte et un temps de retour d'expérience servent la tâche, plutôt qu'un rituel de suivi de plus.${indic.some((x) => /participation/i.test(x)) ? ' Le taux de participation aux rituels est déjà un indicateur du cas.' : ''}`,
      'faible',
      "Demander quels rituels existent aujourd'hui, lesquels sont jugés utiles par les participants et lesquels sont subis."
    ),
    h(
      `Pilotage : ${indic.length ? `les indicateurs du cas (${indic.map(minusc).join(' ; ')}) permettent un suivi avant et après. ` : ''}Il se peut qu'il faille y ajouter un indicateur de recours à la règle de décision écrite, relevé à 30, 60 et 90 jours.`,
      'faible',
      "Demander au commanditaire quels indicateurs il suit réellement, à quelle fréquence, et lesquels déclenchent une décision."
    )
  ];
  const secImpl = agregatAutorise ? sec(4, 'implications', 'Implications pour la structure, les rôles, les rituels et le pilotage', specImpl) : null;

  const n4 = {
    id: 'n4-organisation',
    titre: 'Lecture organisationnelle',
    sections: [secSeuil, secProfils, secAdeq, secCt, secIc, secImpl].filter(Boolean)
  };

  // ---------------------------------------------------------------- recommandations
  const recs = [];
  const pN3 = participants.length ? participants : toutes;
  const piloteN3 = roleDe(pN3, (p) => p.niveau === 'direction');
  const poolN4 = poolOrg.length ? poolOrg : toutes;
  const piloteN4 = roleDe(poolN4, (p) => p.niveau === 'direction');

  if (participants.length >= 2) {
    const roles3 = participants.map((p) => `${p.code} (${minusc(p.role_equipe)})`);
    recs.push(recommandation(
      'REC-N3-1', 'n3',
      "Désigner pour chaque rôle de l'équipe un suppléant, nommé par écrit, et documenter ce qu'il faut savoir pour le remplacer, en commençant par les rôles dont dépendent les échéances du cas.",
      {
        donnee: `Rôles tenus au cas, chacun avec un périmètre de décision propre : ${liste(roles3)}.`,
        contexte: `Équipe de ${participants.length} personnes, tâche de nature ${natureFr}, échéances rapprochées au cas : l'absence d'un rôle sans suppléant pèse directement sur le calendrier.`,
        preuve: { niveau: 'hypothese', reference_id: null },
        risque: "Une suppléance purement formelle, sans transfert réel de savoir-faire, donnerait une fausse assurance.",
        responsable: piloteN3,
        horizon: '30 jours',
        indicateur: 'Suppléant nommé par écrit pour chaque rôle, vérifié à la revue des 30 jours.'
      }
    ));
    recs.push(recommandation(
      'REC-N3-2', 'n3',
      `Installer un point de coordination hebdomadaire adapté à l'interdépendance des liens (assemblage pour la mise en commun, transmission des exigences pour la séquence, ajustement continu pour la réciprocité)${sansDirection.length ? ` et écrire la règle de décision pour les liens sans direction dominante (${ids(sansDirection)})` : ''}.`,
      {
        donnee: `Liens de mise en commun : ${nMc} ; de séquence : ${nSq} ; de réciprocité : ${nRc}${sansDirection.length ? ` ; sans direction dominante : ${ids(sansDirection)}` : ''}.`,
        contexte: `Tâche de nature ${natureFr} avec des échéances du cas, dans une équipe à disponibilité limitée.`,
        preuve: { niveau: 'source', reference_id: 'thompson-1967' },
        risque: "Le rituel peut devenir une formalité de plus, dans une équipe mobilisée à temps partiel.",
        responsable: piloteN3,
        horizon: '30 jours',
        indicateur: 'Part des décisions du point consignées avec leur décideur, relevée à 30 puis 60 jours.'
      }
    ));
    recs.push(recommandation(
      'REC-N3-3', 'n3',
      "Instruire la sécurité psychologique avant d'installer tout rituel de retour d'expérience : entretiens individuels courts menés par un tiers qualifié, puis observation de réunions, avec une restitution à l'équipe sans attribution nominative.",
      {
        donnee: facteurs.length ? `Éléments du cas à instruire : ${facteurs.join(' ; ')}.` : "Aucun élément du cas ne signale a priori un frein à la prise de parole ; l'instruction reste à faire.",
        contexte: "Les profils ne mesurent pas la sécurité psychologique : seule l'instruction par entretien et observation permet de la lire.",
        preuve: { niveau: 'source', reference_id: 'edmondson-1999' },
        risque: "Des entretiens menés par un supérieur direct peuvent biaiser les réponses (désirabilité sociale).",
        responsable: piloteN3,
        horizon: '60 jours',
        indicateur: `Synthèse des entretiens restituée à l'équipe, puis réponse de chaque personne à la question commune ${gui("Que se passe-t-il ici quand quelqu'un signale une erreur ?")}, relevée à 60 puis 90 jours.`
      }
    ));
    const facA4 = ctx.bib?.facettes?.find((x) => x.code === 'A4')?.libelle?.fr;
    const niveauA4 = (code) => faits.personnes?.[code]?.facettes?.A4?.niveau;
    const a4bas = participants.filter((p) => ['bas', 'plutot_bas'].includes(niveauA4(p.code))).map((p) => p.code);
    const a4haut = participants.filter((p) => estHaut(niveauA4(p.code))).map((p) => p.code);
    const a4 = a4bas.length || a4haut.length
      ? ` ; facette A4${facA4 ? ` (${facA4})` : ''} : plutôt basse ou basse pour ${a4bas.length ? liste(a4bas) : 'aucune personne'}, plutôt haute ou haute pour ${a4haut.length ? liste(a4haut) : 'aucune personne'}`
      : '';
    recs.push(recommandation(
      'REC-N3-4', 'n3',
      "Mettre en place une revue de risques hebdomadaire de quinze minutes, avec un rôle de contradicteur tournant, afin que les risques du cas soient discutés avant les échéances.",
      {
        donnee: `${(tache.risques ?? []).length} risques sont inscrits au cas${a4}.`,
        contexte: `Tâche de nature ${natureFr}, avec des échéances rapprochées : la facette A4 est lue ici au niveau de chaque personne (niveau 1), non à celui du domaine.`,
        preuve: { niveau: 'hypothese', reference_id: null },
        risque: "Le rôle de contradicteur peut être vécu comme une critique personnelle s'il n'est pas tournant et explicitement cadré.",
        responsable: roleDe(pN3, (p) => /exécution/i.test(p.role_equipe)),
        horizon: '30 jours',
        indicateur: "Nombre de risques inscrits et de décisions de traitement prises en revue, relevé à chaque revue sur 30 jours puis 60 jours."
      }
    ));
  }
  recs.push(recommandation(
    'REC-N3-5', 'n3',
    "Recalculer l'analyse d'équipe (dispersion et couverture) à chaque retrait ou ajout de consentement à l'analyse d'équipe, et n'y reprendre aucune donnée d'une personne qui n'a pas consenti.",
    {
      donnee: `Le moteur calcule la dispersion avant le filtrage des consentements ; ${exclus.length ? "au moins une personne est exclue de cette analyse" : "aucune personne n'est exclue de cette analyse à ce jour"}.`,
      contexte: "Le consentement est tracé par niveau de rapport : une analyse d'équipe ne peut contenir que les personnes qui y ont consenti.",
      preuve: { niveau: 'hypothese', reference_id: null },
      risque: "Une analyse qui conserverait les données d'une personne ayant retiré son consentement porterait atteinte à ce consentement.",
      responsable: roleConformite(pN3),
      horizon: '30 jours',
      indicateur: "Date du dernier recalcul comparée à la date du dernier changement de consentement, relevée avant chaque diffusion."
    }
  ));

  recs.push(recommandation(
    'REC-N4-1', 'n4',
    `Ne jamais produire la lecture organisationnelle agrégée sous le seuil d'anonymat, c'est-à-dire pour un effectif réel inférieur à ${seuil} personnes ; réserver la dérogation de démonstration aux cas fictifs et consentis, et la signaler en tête du niveau.`,
    {
      donnee: `Effectif de ${n} personnes pour un seuil d'anonymat de ${seuil} ; seuil ${org.seuil_atteint ? 'atteint' : 'non atteint'}.`,
      contexte: "La plateforme interdit à l'employeur de voir un résultat individuel ; un agrégat sous le seuil permettrait de retrouver des personnes.",
      preuve: { niveau: 'hypothese', reference_id: null },
      risque: "Une dérogation étendue à un cas réel exposerait des personnes identifiables par recoupement.",
      responsable: roleConformite(poolN4),
      horizon: '30 jours',
      indicateur: `Contrôle bloquant avant chaque génération de rapport (effectif au moins égal à ${seuil}, ou cas fictif consenti) ; nombre d'agrégats produits sous le seuil pour des cas réels, relevé à chaque génération (cible : aucun).`
    }
  ));
  const formalites = [...parType('reglementation'), ...parType('syndical')];
  const echeanceCNDP = (tache.echeances ?? []).find((e) => /CNDP/.test(e));
  recs.push(recommandation(
    'REC-N4-2', 'n4',
    "Séquencer les formalités avant toute diffusion : information et consentement des personnes (loi 09-08), déclaration ou autorisation de la CNDP, cadre du transfert vers le siège, information des représentants du personnel.",
    {
      donnee: formalites.length ? `Contraintes concernées : ${formalites.map((x) => `${x.id} (${x.durete === 'dure' ? 'dure' : 'négociable'})`).join(', ')}.` : 'Aucune contrainte réglementaire ou syndicale saisie au cas : à confirmer avec le commanditaire.',
      contexte: `Le droit marocain est la référence${europeen ? ' ; le groupe étant européen, le RGPD peut aussi s\'appliquer, et la règle de prudence retient l\'exigence la plus forte' : ''}.`,
      preuve: { niveau: 'hypothese', reference_id: null },
      risque: "Un envoi de données au siège avant que le cadre juridique soit instruit exposerait l'organisation à un manquement.",
      responsable: roleConformite(poolN4),
      horizon: echeanceCNDP ? `30 jours (échéance du cas : ${minusc(echeanceCNDP).replace(' : ', ', ')})` : '30 jours',
      indicateur: "Statut de chaque formalité (faite, en cours, à faire), relevé à 30 jours puis avant le dépôt du dossier à la CNDP."
    }
  ));
  const ctSiege = (tache.risques ?? []).find((r) => /siège/i.test(r));
  const indDelai = indic.find((x) => /délai/i.test(x));
  recs.push(recommandation(
    'REC-N4-3', 'n4',
    "Écrire une règle de langue et de circuit de décision entre la filiale et le siège : langue par type d'échange, décisions asynchrones avec un délai de réponse convenu, résumé des documents de pilotage dans les langues de travail de la filiale.",
    {
      donnee: ic?.actif ? `${ic.sites.length} sites, ${ic.langues_travail.length} langues de travail, ${ic.fuseaux.length} fuseaux horaires ; ${minusc(ic.rapport_siege_filiale)}.` : "Volet interculturel non activé au cas : à confirmer avec le commanditaire.",
      contexte: ctSiege ? `Risque inscrit au cas : ${minusc(ctSiege)}.` : "Travail réparti entre plusieurs sites, avec validations du siège.",
      preuve: { niveau: 'hypothese', reference_id: null },
      risque: "Une règle écrite au seul niveau de la filiale ne lie pas le siège : elle suppose son accord.",
      responsable: piloteN4,
      horizon: '60 jours',
      indicateur: `${indDelai ?? 'Délai de décision entre la filiale et le siège'}, relevé à 60 puis 90 jours.`
    }
  ));
  recs.push(recommandation(
    'REC-N4-4', 'n4',
    "Ouvrir, dans un fonctionnement standardisé, un espace dédié à la nouveauté (créneau récurrent de propositions, avec un cadre de décision et un délai de réponse), afin que l'ouverture et l'énergie relationnelle s'exercent sans contourner les processus.",
    {
      donnee: agregatAutorise
        ? `Structure ${gui(o.structure)} et orientation ${gui(strat.orientation)} saisies au cas ; position d'ensemble de l'équipe ${NIV_LOC[niv('O')]} sur le ${dom('O')} et ${NIV_LOC[niv('E')]} sur le ${dom('E')}.`
        : `Structure ${gui(o.structure)} et orientation ${gui(strat.orientation)} saisies au cas ; lecture agrégée non produite.`,
      contexte: "Une orientation de croissance dans une organisation à processus standardisés demande d'exploiter l'existant et d'explorer le nouveau à la fois.",
      preuve: { niveau: 'source', reference_id: 'march-1991' },
      risque: "L'espace dédié peut devenir une boîte à idées sans suite et décourager l'ouverture.",
      responsable: roleDe(poolN4, (p) => /innovation/i.test(p.role_equipe)),
      horizon: '60 jours',
      indicateur: 'Nombre de propositions examinées et part de celles qui reçoivent une réponse dans le délai convenu, relevés à 60 puis 90 jours.'
    }
  ));
  const syndical = parType('syndical')[0];
  recs.push(recommandation(
    'REC-N4-5', 'n4',
    "Publier auprès des équipes et des représentants du personnel une note d'usage claire : ce que ces rapports servent, qui les lit, et ce qu'ils ne servent jamais (aucune décision d'emploi), avant toute passation ou restitution.",
    {
      donnee: [heritage ? `${heritage.id} : ${minusc(heritage.libelle)}` : null, syndical ? `${syndical.id} : ${minusc(syndical.libelle)}` : null].filter(Boolean).join(' ; ') || 'Aucune contrainte de méfiance héritée ou de sensibilité syndicale saisie au cas.',
      contexte: "La transparence sur l'usage des résultats conditionne l'accueil de la démarche et la qualité des réponses.",
      preuve: { niveau: 'hypothese', reference_id: null },
      risque: "Une note trop générale, sans engagement vérifiable sur l'usage des résultats, ne lèverait pas la méfiance.",
      responsable: piloteN4,
      horizon: '30 jours',
      indicateur: `${indic.find((x) => /participation/i.test(x)) ?? "Taux de participation aux rituels d'équipe du projet"}, relevé à 30 puis 90 jours, et questions des représentants du personnel restées sans réponse.`
    }
  ));

  for (const x of recs) if (x.preuve.reference_id) {
    if (!refs.references.some((r) => r.id === x.preuve.reference_id)) throw new Error(`niveau34 : référence inconnue ${x.preuve.reference_id}`);
    utilisees.add(x.preuve.reference_id);
  }

  const recsCourbes = recs.map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typeof v === 'string' && !['id', 'niveau', 'responsable'].includes(k) ? courbe(v) : v])));
  return { niveaux: [n3, n4], recommandations: recsCourbes, reference_ids: [...utilisees].sort() };
}
