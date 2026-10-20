# -*- coding: utf-8 -*-
"""Contrôle déterministe et rendu de la bibliothèque de textes (docs/design/bases-rapports-individuel-et-binome.md, § 7.2 étapes 7 et 9).

Usage :
  python -I controle.py facettes-pilote.json           contrôle seul (code de sortie 1 si un défaut)
  python -I controle.py facettes-pilote.json --md      contrôle puis écrit facettes-pilote.md
  python -I controle.py facettes-pilote.json --selftest  prouve que chaque contrôle échoue sur une erreur volontaire
"""
import copy, json, re, sys

NIVEAUX = ["bas", "plutot_bas", "milieu", "plutot_haut", "haut"]
NIVEAU_FR = {"bas": "Bas", "plutot_bas": "Plutôt bas", "milieu": "Milieu de l’échelle",
             "plutot_haut": "Plutôt haut", "haut": "Haut"}
NIVEAU_AR = {"bas": "منخفض", "plutot_bas": "منخفض نسبيًّا", "milieu": "قرب المنتصف",
             "plutot_haut": "مرتفع نسبيًّا", "haut": "مرتفع"}

# Lexique interdit (voix-de-marque.md § 5 et § 2, principe 7). Les formes niées de
# « diagnostic », qui rassurent, sont retirées avant le contrôle.
INTERDITS_FR = [
    r"\bmoyenne\b", r"\bnormes?\b", r"\bpercentiles?\b", r"\bmeilleur", r"\bpire", r"\bmauvais",
    r"\bbon score\b", r"\bfaibles?\b", r"\bfortes?\b", r"\bforts\b", r"\bexcellent", r"\bscores?\b",
    r"\bnotes?\b", r"\bitems?\b", r"\bpassation", r"\btests?\b", r"\bfeedback", r"\bdebrief",
    r"\bcoach", r"\bpsychologue", r"\bcompatibilit", r"\baptitudes?\b", r"\bcomp[ée]tences?\b",
    r"\bpr[ée]dit", r"\bgarantit", r"\bvous [êe]tes\b", r"\btroubles?\b", r"\bmaladie",
    r"\bdiagnostic", r"\bpopulation", r"\bplus que d.autres", r"\bmoins que d.autres",
    r"\bque la plupart", r"\b(plus|moins|mieux|davantage|autant) que les autres", r"\bau-dessus de la moyenne",
]
NIEES_FR = [r"jamais d.un diagnostic", r"non un diagnostic", r"ni d.un diagnostic",
            r"pas un diagnostic", r"n.est pas un diagnostic"]
INTERDITS_AR = ["ضعيف", "جيد", "سيئ", "ممتاز", "أعلى من المتوسط", "المتوسط", "درجتك", "علامتك",
                "اختبار", "بند", "قارن", "التوافق بينكم", "أفضل", "أسوأ", "الأضعف", "كوتش"]
NIEES_AR = ["وليس بتشخيص", "ولا بتشخيص", "لا بتشخيص"]
HEDGE_FR = re.compile(r"\b(peut|peuvent|pourrait|pourraient|il se peut|vous pouvez)\b", re.I)
HEDGE_AR = re.compile(r"(قد |ربما)")
CHIFFRES = re.compile(r"[0-9٠-٩]")
LONGUEUR_MAX = 240


def phrases(niv, lang):
    b = niv[lang]
    for k in ("description", "apport", "cout"):
        for t in b[k]:
            yield k, t
    yield "question", b["question"]


def controler(lib):
    defauts = []
    def d(msg): defauts.append(msg)
    for f in lib["facettes"]:
        code = f["code"]
        if sorted(f["niveaux"]) != sorted(NIVEAUX):
            d(f"{code} : niveaux attendus {NIVEAUX}")
            continue
        for lg in ("fr", "ar"):
            if not f["libelle"].get(lg) or not f["definition"].get(lg):
                d(f"{code}/{lg} : libellé ou définition manquant")
        if len(f["affirmations_fr"]) != 4:
            d(f"{code} : quatre affirmations attendues")
        for n in NIVEAUX:
            niv = f["niveaux"][n]
            vus = set()
            for lg in ("fr", "ar"):
                b = niv.get(lg)
                if not b:
                    d(f"{code}/{n}/{lg} : bloc manquant"); continue
                if len(b["description"]) != 2 or len(b["apport"]) != 2 or len(b["cout"]) != 2 or not isinstance(b["question"], str):
                    d(f"{code}/{n}/{lg} : structure 2+2+2+1 attendue")
                for kind, t in phrases(niv, lg):
                    ref = f"{code}/{n}/{lg}/{kind}"
                    if CHIFFRES.search(t): d(f"{ref} : chiffre dans le texte")
                    if "!" in t or "—" in t or "–" in t: d(f"{ref} : ponctuation interdite")
                    if len(t) > LONGUEUR_MAX: d(f"{ref} : phrase de plus de {LONGUEUR_MAX} caractères")
                    if lg == "fr":
                        s = t.lower()
                        for pat in NIEES_FR: s = re.sub(pat, " ", s)
                        for pat in INTERDITS_FR:
                            if re.search(pat, s): d(f"{ref} : lexique interdit {pat!r}")
                        if kind in ("apport", "cout") and not HEDGE_FR.search(t): d(f"{ref} : tournure d’hypothèse absente")
                        if kind == "question" and not t.rstrip().endswith("?"): d(f"{ref} : question sans point d’interrogation")
                        if kind != "question" and not t.rstrip().endswith("."): d(f"{ref} : phrase sans point final")
                    else:
                        s = t
                        for pat in NIEES_AR: s = s.replace(pat, " ")
                        for w in INTERDITS_AR:
                            if w in s: d(f"{ref} : lexique interdit {w!r}")
                        if kind in ("apport", "cout") and not HEDGE_AR.search(t): d(f"{ref} : tournure d’hypothèse absente")
                        if kind == "question" and not t.rstrip().endswith("؟"): d(f"{ref} : question sans « ؟ »")
                        if kind != "question" and not t.rstrip().endswith("."): d(f"{ref} : phrase sans point final")
                    if lg == "fr" and kind != "description" and t in vus: d(f"{ref} : phrase en double dans le niveau")
                    vus.add(t)
    # Aucune phrase d'apport, de coût ou de question identique entre deux niveaux d'une facette
    for f in lib["facettes"]:
        for lg in ("fr", "ar"):
            vus = {}
            for n in NIVEAUX:
                if n not in f["niveaux"] or lg not in f["niveaux"][n]:
                    continue  # déjà signalé par le premier passage
                for kind, t in phrases(f["niveaux"][n], lg):
                    if kind == "description" and t.startswith(("Seul,", "لا تقول")): continue
                    if kind == "description" and t in vus and vus[t] != n and ("ne dit rien" in t or "non un" in t or "لا يقول" in t or "لا يدل" in t or "ليس بتشخيص" in t or "وليس بتشخيص" in t or "Cela décrit" in t or "Cette tendance" in t or "Il s’agit" in t or "يصف" in t or "يتعلق" in t or "لا حكمًا" in t):
                        continue
                    if t in vus and vus[t] != n: d(f"{f['code']}/{lg} : phrase répétée entre {vus[t]} et {n} : {t[:40]}…")
                    vus.setdefault(t, n)
    return defauts


def rendre_md(lib):
    L = []
    a = L.append
    a("# Bibliothèque de textes : facettes pilotes (une par domaine)")
    a("")
    a(f"Version `{lib['version']}`, {lib['date']}. Statut : **{lib['statut']}**.")
    a("")
    a("Cinq facettes sur trente, cinq niveaux chacune, en français et en arabe. Fichier source : `facettes-pilote.json` ; ce document en est une copie lisible, générée par `controle.py --md` : ne pas l’éditer à la main. Les espaces avant les signes doubles du français et dans les guillemets sont à convertir en espaces insécables au moment de l’intégration dans les fichiers de messages (`voix-de-marque.md`).")
    a("")
    a("**Statut des blocs.** La description d’un niveau est tirée des quatre affirmations réelles de la facette (source `ipip-items`). Les rubriques « Ce que cela peut apporter », « Ce que cela peut coûter » et la question sont des **hypothèses de lecture, sans étude citée** (source `hypothese`) : le rapport les introduit par « Hypothèses de lecture, à confirmer en entretien ». Les niveaux sont des conventions de l’outil (`bases-rapports-individuel-et-binome.md` § 7.2), non des positions par rapport à d’autres personnes.")
    a("")
    for f in lib["facettes"]:
        a(f"## {f['code']} · {f['libelle']['fr']} / {f['libelle']['ar']}")
        a("")
        a(f"**Définition.** {f['definition']['fr']}")
        a("")
        a(f"**التعريف.** {f['definition']['ar']}")
        a("")
        a("**Les quatre affirmations du questionnaire (français) :**")
        a("")
        for it in f["affirmations_fr"]:
            a(f"- « {it['texte']} » (cotation {it['cotation']})")
        a("")
        if f["avertissement"]:
            a(f"> **Avertissement sur le libellé.** {f['avertissement']['fr']}")
            a(">")
            a(f"> **تنبيه حول العنوان.** {f['avertissement']['ar']}")
            a("")
        for n in NIVEAUX:
            niv = f["niveaux"][n]
            a(f"### {f['code']} · {NIVEAU_FR[n]} / {NIVEAU_AR[n]}")
            a("")
            for lg, titres in (("fr", ("Description", "Ce que cela peut apporter", "Ce que cela peut coûter", "Question pour l’entretien")),
                                ("ar", ("الوصف", "ما قد يتيحه ذلك", "ما قد يكلّفه ذلك", "سؤال للجلسة"))):
                b = niv[lg]
                a(f"**{titres[0]}** (`ipip-items`, {lg})")
                a("")
                a(" ".join(b["description"]))
                a("")
                a(f"**{titres[1]}** (`hypothese`)")
                a("")
                for t in b["apport"]: a(f"- {t}")
                a("")
                a(f"**{titres[2]}** (`hypothese`)")
                a("")
                for t in b["cout"]: a(f"- {t}")
                a("")
                a(f"**{titres[3]}** (`hypothese`) : {b['question']}")
                a("")
    return "\n".join(L) + "\n"


def autotest(lib):
    """Chaque mutation doit faire échouer le contrôle : sinon le contrôle ne protège rien."""
    muts = []
    def m(nom, fn): muts.append((nom, fn))
    m("chiffre dans un texte", lambda l: l["facettes"][0]["niveaux"]["bas"]["fr"]["description"].__setitem__(0, "Vous répondez à 3 sur 5."))
    m("mot interdit FR (moyenne)", lambda l: l["facettes"][1]["niveaux"]["haut"]["fr"]["description"].__setitem__(1, "Vous êtes au-dessus de la moyenne."))
    m("mot interdit FR (faible)", lambda l: l["facettes"][2]["niveaux"]["bas"]["fr"]["cout"].__setitem__(0, "Votre intérêt peut paraître faible."))
    m("mot interdit AR (ضعيف)", lambda l: l["facettes"][3]["niveaux"]["milieu"]["ar"]["cout"].__setitem__(0, "قد يظهر أداء ضعيف."))
    m("hypothèse sans tournure d’hypothèse", lambda l: l["facettes"][4]["niveaux"]["haut"]["fr"]["apport"].__setitem__(0, "Vous tenez toujours vos engagements."))
    m("diagnostic non nié", lambda l: l["facettes"][0]["niveaux"]["haut"]["fr"]["description"].__setitem__(1, "Ceci est un diagnostic."))
    m("bloc arabe manquant", lambda l: l["facettes"][1]["niveaux"]["milieu"].pop("ar"))
    m("structure incomplète", lambda l: l["facettes"][2]["niveaux"]["haut"]["fr"]["apport"].pop())
    m("niveau manquant", lambda l: l["facettes"][3]["niveaux"].pop("plutot_bas"))
    m("point d’exclamation", lambda l: l["facettes"][4]["niveaux"]["bas"]["fr"]["question"].__setitem__("0", "") if False else l["facettes"][4]["niveaux"]["bas"]["fr"].__setitem__("question", "Pourquoi ?!"))
    m("phrase dupliquée entre niveaux", lambda l: l["facettes"][0]["niveaux"]["haut"]["fr"]["apport"].__setitem__(0, l["facettes"][0]["niveaux"]["bas"]["fr"]["apport"][0]))
    ok = True
    for nom, fn in muts:
        copie = copy.deepcopy(lib)
        try:
            fn(copie)
        except Exception as e:
            print(f"ERREUR DE MUTATION {nom} : {e}"); ok = False; continue
        r = controler(copie)
        etat = "ROUGE (attendu)" if r else "VERT (le contrôle ne voit rien : défaut du contrôle)"
        print(f"  mutation « {nom} » : {etat}")
        if not r: ok = False
    return ok


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # le mode isolé (-I) ignore PYTHONIOENCODING
    chemin = sys.argv[1]
    lib = json.load(open(chemin, encoding="utf-8"))
    if "--selftest" in sys.argv:
        base = controler(lib)
        print(f"contrôle sur la bibliothèque saine : {len(base)} défaut(s)")
        sys.exit(0 if (not base and autotest(lib)) else 1)
    defauts = controler(lib)
    for x in defauts: print("DÉFAUT", x)
    print(f"{len(defauts)} défaut(s)")
    if defauts: sys.exit(1)
    if "--md" in sys.argv:
        out = chemin.rsplit(".", 1)[0] + ".md"
        open(out, "w", encoding="utf-8", newline="\n").write(rendre_md(lib))
        print("écrit", out)
