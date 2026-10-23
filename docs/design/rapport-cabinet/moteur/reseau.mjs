// Moteur du réseau réel (étape 2 de la structure invisible), contrat-reseau §3. Pur, déterministe, sans dépendance.
// Entrée : le cas, dont cas.reseau_reel = { statut, membres: [{code, informe, oppose, accord_repondre, accord_carte, a_repondu}],
// reponses: [{de, vers, lien, valeur}] } (forme de app.reseau_lire, codes à la place des identifiants).
// Sortie : l'objet écrit dans faits.reseau_reel ; aucun classement de personnes, seulement des positions et des décomptes.

export const REPONDANTS_MIN = 4;
export const TAUX_REPONSE_MIN_PCT = 80;
// Lien réel retenu : au moins « chaque mois » (2) pour conseil, information, dépendance ; au moins « plutôt oui » (2) pour la confiance.
export const VALEUR_SIGNIFICATIVE = 2;
// Écart (b) : au moins « chaque semaine » (3), sur les liens de fréquence seulement (la confiance n'est pas une fréquence).
export const VALEUR_HEBDOMADAIRE = 3;
export const LIENS = ['conseil', 'information', 'confiance', 'dependance'];
const LIENS_FREQUENCE = ['conseil', 'information', 'dependance'];
const VALEUR_MAX = { conseil: 4, information: 4, confiance: 3, dependance: 4 };

const SEUILS = Object.freeze({
  repondants_min: REPONDANTS_MIN,
  taux_reponse_min_pct: TAUX_REPONSE_MIN_PCT,
  valeur_significative: VALEUR_SIGNIFICATIVE,
  valeur_hebdomadaire: VALEUR_HEBDOMADAIRE
});

/** Seuil de production : au moins REPONDANTS_MIN répondants ET au moins TAUX_REPONSE_MIN_PCT pour cent des personnes représentées (comparaison entière, sans arrondi). */
export function suffisance(nRepondants, nRepresentes) {
  return nRepresentes > 0 && nRepondants >= REPONDANTS_MIN && nRepondants * 100 >= TAUX_REPONSE_MIN_PCT * nRepresentes;
}

/** Relais prévus (étape 1) : personnes au milieu d'une chaîne de séquence orientée, entre personnes de `codes`. */
export function relaisPrevus(relations, codes) {
  const dans = new Set(codes);
  const amont = (r) => (r.sens === 'b->a' ? r.b : r.a);
  const aval = (r) => (r.sens === 'b->a' ? r.a : r.b);
  const sequences = (relations ?? []).filter((r) => dans.has(r.a) && dans.has(r.b) && r.interdependance === 'sequentielle' && r.sens !== 'reciproque');
  return codes.filter((code) => sequences.some((r) => aval(r) === code) && sequences.some((r) => amont(r) === code));
}

/** Fraîcheur du relevé : vrai seulement si rr.perimetre coïncide exactement (même taille, mêmes codes, sans doublon) avec les
 * personnes du cas qui consentent à l'analyse d'équipe. Un consentement retiré ou donné après le relevé le rend caduc : ni texte
 * ni carte ne doivent alors le lire. Partagée par le texte du rapport (niveau34) et sa carte (rendu). */
export function perimetreAJour(rr, cas) {
  const releve = rr?.perimetre;
  if (!Array.isArray(releve)) return false;
  const actuel = new Set((cas?.personnes ?? []).filter((p) => p.consentements?.equipe === true).map((p) => p.code));
  return releve.length === actuel.size && new Set(releve).size === releve.length && releve.every((c) => actuel.has(c));
}

/** Faits complets écrits par calculer.mjs : les faits du moteur, puis faits.reseau_reel. moteur.mjs reste sans import (ses mutants sont copiés seuls). */
export function ajouterReseau(faits, cas) {
  return { ...faits, reseau_reel: lireReseau(cas) };
}

export function lireReseau(cas) {
  const seuils = { ...SEUILS };
  const rr = cas?.reseau_reel;
  if (!rr) return { releve: false, suffisant: false, seuils };

  const tousCodes = new Set((cas.personnes ?? []).map((p) => p.code));
  const perimetre = (cas.personnes ?? []).filter((p) => p.consentements?.equipe === true).map((p) => p.code);
  const dansPerimetre = new Set(perimetre);
  const fiche = new Map();
  for (const m of rr.membres ?? []) {
    if (!tousCodes.has(m.code)) throw new Error(`réseau réel : code inconnu ${m.code} dans les membres`);
    if (fiche.has(m.code)) throw new Error(`réseau réel : membre en doublon ${m.code}`);
    fiche.set(m.code, m);
  }
  // Représentée : informée et non opposée. Une personne non informée ne peut pas être citée (loi 09-08, art. 5 §3).
  const representes = perimetre.filter((c) => fiche.get(c)?.informe === true && fiche.get(c)?.oppose !== true);
  const estRepresente = new Set(representes);
  const nonRepresentes = perimetre.filter((c) => !estRepresente.has(c));
  const repondants = representes.filter((c) => fiche.get(c).accord_repondre === true && fiche.get(c).a_repondu === true);
  const estRepondant = new Set(repondants);

  // Contrôle de forme sur toutes les réponses, puis lecture des seules réponses entre personnes représentées, émises par un répondant.
  const valeurs = new Map(); // clé `${lien}|${de}|${vers}` -> valeur
  for (const x of rr.reponses ?? []) {
    if (!LIENS.includes(x.lien)) throw new Error(`réseau réel : lien inconnu « ${x.lien} »`);
    for (const c of [x.de, x.vers]) if (!tousCodes.has(c)) throw new Error(`réseau réel : code inconnu ${c} dans une réponse`);
    if (x.de === x.vers) throw new Error(`réseau réel : réponse de ${x.de} sur soi-même`);
    if (!Number.isInteger(x.valeur) || x.valeur < 0 || x.valeur > VALEUR_MAX[x.lien]) throw new Error(`réseau réel : valeur ${x.valeur} hors de l'échelle de ${x.lien} (0 à ${VALEUR_MAX[x.lien]})`);
    const cle = `${x.lien}|${x.de}|${x.vers}`;
    if (valeurs.has(cle)) throw new Error(`réseau réel : doublon ${x.de} vers ${x.vers} (${x.lien})`);
    valeurs.set(cle, x.valeur);
  }
  const lue = (lien, de, vers) => (dansPerimetre.has(de) && dansPerimetre.has(vers) && estRepondant.has(de) && estRepresente.has(vers) ? valeurs.get(`${lien}|${de}|${vers}`) ?? null : null);
  const significatif = (v) => v !== null && v >= VALEUR_SIGNIFICATIVE;

  const nRep = representes.length;
  const base = {
    releve: true,
    statut: rr.statut ?? null,
    seuils,
    perimetre,
    representes,
    non_representes: nonRepresentes,
    repondants,
    n_representes: nRep,
    n_repondants: repondants.length,
    taux_reponse_pct: nRep ? Math.round((1000 * repondants.length) / nRep) / 10 : 0,
    suffisant: suffisance(repondants.length, nRep)
  };
  if (!base.suffisant) return base;

  // Paires entre personnes représentées, dans l'ordre du cas.
  const paires = [];
  representes.forEach((a, i) => representes.slice(i + 1).forEach((b) => paires.push([a, b])));

  const liens = {};
  const indicateurs = {};
  for (const lien of LIENS) {
    liens[lien] = [];
    for (const [a, b] of paires) {
      const ab = lue(lien, a, b);
      const ba = lue(lien, b, a);
      const sab = significatif(ab);
      const sba = significatif(ba);
      if (!sab && !sba) continue;
      liens[lien].push({ a, b, a_vers_b: ab, b_vers_a: ba, reciproque: sab && sba, declare_par: sab && sba ? null : sab ? a : b });
    }
    const reciproques = liens[lien].filter((x) => x.reciproque).length;
    indicateurs[lien] = { paires_reliees: liens[lien].length, reciproques, un_seul_cote: liens[lien].length - reciproques };
  }

  // Écarts avec la structure prévue (cas.relations).
  const prevues = (cas.relations ?? []).filter((r) => estRepresente.has(r.a) && estRepresente.has(r.b));
  const prevuePaire = (x, y) => prevues.some((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x));
  const relie = (x, y) => LIENS.some((l) => liens[l].some((k) => (k.a === x && k.b === y) || (k.a === y && k.b === x)));

  const prevusSansLienReel = [];
  const prevusNonLisibles = [];
  for (const r of prevues) {
    if (relie(r.a, r.b)) continue;
    if (estRepondant.has(r.a) || estRepondant.has(r.b)) prevusSansLienReel.push({ id: r.id, a: r.a, b: r.b, nature: r.nature, frequence: r.frequence });
    else prevusNonLisibles.push(r.id);
  }

  const relsHors = [];
  for (const [a, b] of paires) {
    if (prevuePaire(a, b)) continue;
    const trouves = [];
    for (const lien of LIENS_FREQUENCE) {
      for (const [de, vers] of [[a, b], [b, a]]) {
        const v = lue(lien, de, vers);
        if (v !== null && v >= VALEUR_HEBDOMADAIRE) trouves.push({ lien, de, valeur: v });
      }
    }
    if (trouves.length) relsHors.push({ a, b, liens: trouves });
  }

  // Relais réel : demandes de conseil reçues d'au moins deux personnes qui ne se demandent pas conseil entre elles.
  const demandeConseil = (de, vers) => significatif(lue('conseil', de, vers));
  const relaisReels = [];
  for (const x of representes) {
    const demandeurs = representes.filter((y) => y !== x && demandeConseil(y, x));
    const pont = demandeurs.some((y, i) => demandeurs.slice(i + 1).some((z) => !demandeConseil(y, z) && !demandeConseil(z, y)));
    if (pont) relaisReels.push({ code: x, demandeurs });
  }
  const prevusRelais = relaisPrevus(cas.relations, perimetre);
  const codesReels = relaisReels.map((x) => x.code);
  const relaisReelsNonPrevus = codesReels.filter((c) => !prevusRelais.includes(c));
  const relaisPrevusNonReels = prevusRelais.filter((c) => estRepresente.has(c) && !codesReels.includes(c));

  return {
    ...base,
    carte_nominative: representes.every((c) => fiche.get(c).accord_carte === true),
    paires_possibles: paires.length,
    liens,
    indicateurs,
    liens_reciproques_total: LIENS.reduce((s, l) => s + indicateurs[l].reciproques, 0),
    ecarts: {
      prevus_sans_lien_reel: prevusSansLienReel,
      prevus_non_lisibles: prevusNonLisibles,
      structure_prevue_complete: paires.every(([a, b]) => prevuePaire(a, b)),
      reels_hors_prevu: relsHors,
      relais_reels: relaisReels,
      relais_prevus: prevusRelais,
      relais_reels_non_prevus: relaisReelsNonPrevus,
      relais_prevus_non_reels: relaisPrevusNonReels,
      n_ecarts: prevusSansLienReel.length + relsHors.length + relaisReelsNonPrevus.length + relaisPrevusNonReels.length
    }
  };
}
