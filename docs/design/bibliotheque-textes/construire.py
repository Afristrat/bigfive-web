# -*- coding: utf-8 -*-
"""Assemble facettes.json (30 facettes x 5 niveaux, français) à partir des 5 facettes pilotes (partie française) et des fragments par domaine.

  python -I construire.py --verifier fragments/N.json   contrôle un fragment seul (même contrôle que controle.py)
  python -I construire.py                                écrit facettes.json (échoue s'il manque un fragment ou si le contrôle trouve un défaut)
"""
import copy, json, os, sys
sys.stdout.reconfigure(encoding="utf-8")
ici = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ici)
import controle as c  # noqa: E402

DOMAINES = "NEOAC"


def charger(nom):
    return json.load(open(os.path.join(ici, nom), encoding="utf-8"))


def pilote_fr():
    """Les 5 facettes pilotes, partie française seule (l'arabe est hors périmètre de cette bibliothèque)."""
    out = []
    for f in charger("facettes-pilote.json")["facettes"]:
        g = copy.deepcopy(f)
        g["libelle"] = {"fr": f["libelle"]["fr"]}
        g["definition"] = {"fr": f["definition"]["fr"]}
        if g.get("avertissement"):
            g["avertissement"] = {"fr": g["avertissement"]["fr"]}
        for n in c.NIVEAUX:
            g["niveaux"][n] = {"fr": f["niveaux"][n]["fr"]}
        out.append(g)
    return out


def marquer(facettes):
    for f in facettes:
        for n in c.NIVEAUX:
            f["niveaux"][n]["relecture"] = c.STATUT_BLOC
    return facettes


def entete(facettes, complete):
    p = charger("facettes-pilote.json")
    return {
        "version": "bib-0.3", "date": "2026-10-21", "langues": ["fr"], "relecture_requise": True, "complete": complete,
        "accord": p["accord"], "niveaux_ordre": p["niveaux_ordre"], "sources": p["sources"],
        "statut": "ébauche, 150 blocs non relus : relecture humaine requise avant tout usage (§ 7.2 étape 7)",
        "facettes": facettes,
    }


if __name__ == "__main__":
    if "--verifier" in sys.argv:
        frag = charger(sys.argv[sys.argv.index("--verifier") + 1])["facettes"]
        lib = entete(marquer(copy.deepcopy(frag)), False)
        d = c.controler(lib)
        for x in d: print("DÉFAUT", x)
        print(f"{len(frag)} facette(s), {len(d)} défaut(s)")
        sys.exit(1 if d else 0)
    toutes = pilote_fr()
    for dom in DOMAINES:
        chemin = os.path.join(ici, "fragments", f"{dom}.json")
        if os.path.exists(chemin):
            toutes += json.load(open(chemin, encoding="utf-8"))["facettes"]
    toutes.sort(key=lambda f: (DOMAINES.index(f["domaine"]), f["code"]))
    lib = entete(marquer(toutes), True)
    d = c.controler(lib)
    for x in d: print("DÉFAUT", x)
    print(f"{len(toutes)} facette(s), {len(d)} défaut(s)")
    if d: sys.exit(1)
    json.dump(lib, open(os.path.join(ici, "facettes.json"), "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    print("écrit facettes.json")
