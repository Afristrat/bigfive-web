# -*- coding: utf-8 -*-
"""Contrôle déterministe et rendu de la bibliothèque de textes (docs/design/bases-rapports-individuel-et-binome.md, § 7.2 étapes 7 et 9, et § 7.5 pour l'accord).

Usage :
  python -I controle.py facettes-pilote.json              contrôle seul (code de sortie 1 si un défaut)
  python -I controle.py facettes-pilote.json --md         contrôle puis écrit facettes-pilote.md
  python -I controle.py facettes-pilote.json --selftest   prouve que chaque contrôle échoue sur une erreur volontaire
  python -I controle.py facettes-pilote.json --regression AVANT.json
                                                          prouve que la forme sans accord rend exactement le texte de AVANT.json

Accord : un texte peut contenir des marqueurs {masculin|féminin|sans accord}. accorder(texte, 'm'|'f'|'n')
choisit l'alternative ; une valeur absente ou inconnue donne 'n'. Chaque phrase est contrôlée dans ses trois formes.
"""
import copy, datetime, json, re, sys

NIVEAUX = ["bas", "plutot_bas", "milieu", "plutot_haut", "haut"]
NIVEAU_FR = {"bas": "Bas", "plutot_bas": "Plutôt bas", "milieu": "Milieu de l’échelle",
             "plutot_haut": "Plutôt haut", "haut": "Haut"}
NIVEAU_AR = {"bas": "منخفض", "plutot_bas": "منخفض نسبيًّا", "milieu": "قرب المنتصف",
             "plutot_haut": "مرتفع نسبيًّا", "haut": "مرتفع"}
ACCORDS = ("m", "f", "n")
STATUT_BLOC = "non relue"  # tout bloc d'une bibliothèque à relecture requise porte l'une des deux mentions
STATUT_RELU = "relue"      # « relue » exige relue_par (nom du relecteur) ET relue_le (date ISO AAAA-MM-JJ)


def date_iso(v):
    """Vrai pour une date calendaire réelle au format AAAA-MM-JJ."""
    if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v): return False
    try: datetime.date.fromisoformat(v)
    except ValueError: return False
    return True


def controle_relecture(niv, ref):
    """Défauts de la mention de relecture d'un bloc : « non relue » ou « relue », jamais « relue » sans relecteur et sans date."""
    st = niv.get("relecture")
    par, le = niv.get("relue_par"), niv.get("relue_le")
    if st == STATUT_RELU:
        out = []
        if not (isinstance(par, str) and par.strip()): out.append(f"{ref} : bloc « {STATUT_RELU} » sans relue_par (nom du relecteur)")
        if not date_iso(le): out.append(f"{ref} : bloc « {STATUT_RELU} » sans relue_le valide (date AAAA-MM-JJ)")
        return out
    if st == STATUT_BLOC:
        return [f"{ref} : relue_par ou relue_le posé sur un bloc « {STATUT_BLOC} »"] if (par or le) else []
    return [f"{ref} : mention « {STATUT_BLOC} » ou « {STATUT_RELU} » absente du bloc"]
INDEX_ACCORD = {"m": 0, "f": 1, "n": 2}

MARQUEUR = re.compile(r"\{([^{}]*)\}")


def accorder(texte, accord):
    """Résout les marqueurs {m|f|n}. Une valeur inconnue ou absente donne la forme sans accord."""
    i = INDEX_ACCORD.get(accord, 2)
    def choisir(m):
        parts = m.group(1).split("|")  # un marqueur mal formé est signalé par defauts_marqueurs, jamais fatal ici
        return parts[i] if i < len(parts) else parts[-1]
    return MARQUEUR.sub(choisir, texte)


def defauts_marqueurs(texte):
    """Marqueurs mal formés : trois alternatives non vides, pas d'accolade isolée."""
    res = []
    for m in MARQUEUR.finditer(texte):
        parts = m.group(1).split("|")
        if len(parts) != 3 or any(not p.strip() for p in parts):
            res.append(f"marqueur à trois alternatives non vides attendu : {{{m.group(1)}}}")
    reste = MARQUEUR.sub("", texte)
    if "{" in reste or "}" in reste:
        res.append("accolade isolée ou imbriquée")
    return res


# Lexique interdit (voix-de-marque.md § 5 et § 2, principe 7). Les formes niées de
# « diagnostic », qui rassurent, sont retirées avant le contrôle.
INTERDITS_FR = [
    r"\bmoyenne\b", r"\bnormes?\b", r"\bpercentiles?\b", r"\bmeilleur", r"\bpire", r"\bmauvais",
    r"\bbon score\b", r"\bfaibles?\b", r"\bfortes?\b", r"\bforts\b", r"\bexcellent", r"\bscores?\b",
    r"\bnotes?\b", r"\bitems?\b", r"\bpassation", r"\btests?\b", r"\bfeedback", r"\bdebrief",
    r"\bcoach", r"\bpsychologue", r"\bcompatibilit", r"\baptitudes?\b", r"\bcomp[ée]tences?\b",
    r"\bpr[ée]dit", r"\bgarantit", r"\bvous [êe]tes\b", r"\btroubles?\b", r"\bmaladie",
    r"\bdiagnostic", r"\bpopulation", r"\b(plus|moins|mieux|davantage|autant) que (les|d.)autres",
    r"\bque la plupart", r"\bau-dessus de la moyenne",
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


def verifier_phrase(ref, kind, lg, t, d):
    """Contrôles de contenu sur une phrase déjà accordée (une des trois formes)."""
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


PHRASES_FIXES = ("ne dit rien", "non un", "لا يقول", "لا يدل", "ليس بتشخيص", "وليس بتشخيص", "Cela décrit",
                 "Cette tendance", "Il s’agit", "يصف", "يتعلق", "لا حكمًا")


def langues(lib):
    return lib.get("langues", ["fr", "ar"])


def controler(lib):
    defauts = []
    langs = langues(lib)
    def d(msg): defauts.append(msg)
    if lib.get("complete"):  # bibliothèque annoncée complète : les 30 facettes, une fois chacune
        attendus = [dom + str(i) for dom in "NEOAC" for i in range(1, 7)]
        codes = [f["code"] for f in lib["facettes"]]
        if sorted(codes) != sorted(attendus):
            d(f"facettes attendues {len(attendus)}, trouvées {len(codes)} : manquantes {sorted(set(attendus) - set(codes))}, en trop ou en double {sorted(c for c in set(codes) if codes.count(c) > 1 or c not in attendus)}")
    for f in lib["facettes"]:
        code = f["code"]
        if sorted(f["niveaux"]) != sorted(NIVEAUX):
            d(f"{code} : niveaux attendus {NIVEAUX}")
            continue
        for lg in langs:
            if not f["libelle"].get(lg) or not f["definition"].get(lg):
                d(f"{code}/{lg} : libellé ou définition manquant")
        if len(f["affirmations_fr"]) != 4:
            d(f"{code} : quatre affirmations attendues")
        for n in NIVEAUX:
            niv = f["niveaux"][n]
            vus = set()
            if lib.get("relecture_requise"):
                for x in controle_relecture(niv, f"{code}/{n}"): d(x)
            for lg in langs:
                b = niv.get(lg)
                if not b:
                    d(f"{code}/{n}/{lg} : bloc manquant"); continue
                if len(b["description"]) != 2 or len(b["apport"]) != 2 or len(b["cout"]) != 2 or not isinstance(b["question"], str):
                    d(f"{code}/{n}/{lg} : structure 2+2+2+1 attendue")
                for kind, t in phrases(niv, lg):
                    ref = f"{code}/{n}/{lg}/{kind}"
                    for m in defauts_marqueurs(t): d(f"{ref} : {m}")
                    if defauts_marqueurs(t):
                        continue  # inutile de contrôler le contenu d'un texte non résoluble
                    for acc in ACCORDS:
                        verifier_phrase(f"{ref}[{acc}]", kind, lg, accorder(t, acc), d)
                    if lg == "fr" and kind != "description" and accorder(t, "n") in vus:
                        d(f"{ref} : phrase en double dans le niveau")
                    vus.add(accorder(t, "n"))
    # Aucune phrase d'apport, de coût ou de question identique entre deux niveaux d'une facette
    for f in lib["facettes"]:
        for lg in langs:
            vus = {}
            for n in NIVEAUX:
                if n not in f["niveaux"] or lg not in f["niveaux"][n]:
                    continue  # déjà signalé par le premier passage
                for kind, t in phrases(f["niveaux"][n], lg):
                    t = accorder(t, "n")
                    if kind == "description" and t.startswith(("Seul,", "لا تقول")): continue
                    if kind == "description" and t in vus and vus[t] != n and any(x in t for x in PHRASES_FIXES):
                        continue
                    if t in vus and vus[t] != n: d(f"{f['code']}/{lg} : phrase répétée entre {vus[t]} et {n} : {t[:40]}…")
                    vus.setdefault(t, n)
    return defauts


def regression(lib, avant):
    """La forme sans accord doit rendre exactement le texte d'avant le marquage : aucun profil sans valeur ne change."""
    ecarts = []
    for f, g in zip(lib["facettes"], avant["facettes"]):
        for n in NIVEAUX:
            for lg in ("fr", "ar"):
                for (k1, t1), (k2, t2) in zip(phrases(f["niveaux"][n], lg), phrases(g["niveaux"][n], lg)):
                    if accorder(t1, "n") != t2:
                        ecarts.append(f"{f['code']}/{n}/{lg}/{k1}")
    return ecarts


def variantes(niv, lg):
    """Phrases marquées d'un bloc, avec leurs trois formes."""
    sorties = []
    for kind, t in phrases(niv, lg):
        if MARQUEUR.search(t):
            sorties.append((accorder(t, "m"), accorder(t, "f"), accorder(t, "n")))
    return sorties


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
    a("**Accord grammatical.** Le corps de chaque bloc ci-dessous est la forme **sans accord**, celle que reçoit tout profil sans valeur renseignée. Les phrases qui s’accordent portent des marqueurs dans le fichier source et sont listées sous chaque bloc avec leurs trois formes (masculin, féminin, sans accord). Syntaxe : " + "`{masculin|féminin|sans accord}`" + ", exactement trois alternatives ; la forme sans accord est identique au texte d’avant le marquage (prouvé par `--regression`).")
    a("")
    for f in lib["facettes"]:
        a(f"## {f['code']} · {f['libelle']['fr']}" + (f" / {f['libelle']['ar']}" if "ar" in langues(lib) else ""))
        a("")
        a(f"**Définition.** {f['definition']['fr']}")
        a("")
        if "ar" in langues(lib):
            a(f"**التعريف.** {f['definition']['ar']}")
            a("")
        a("**Les quatre affirmations du questionnaire (français) :**")
        a("")
        for it in f["affirmations_fr"]:
            a(f"- « {it['texte']} » (cotation {it['cotation']})")
        a("")
        if f["avertissement"]:
            a(f"> **Avertissement sur le libellé.** {f['avertissement']['fr']}")
            if "ar" in langues(lib):
                a(">")
                a(f"> **تنبيه حول العنوان.** {f['avertissement']['ar']}")
            a("")
        for n in NIVEAUX:
            niv = f["niveaux"][n]
            a(f"### {f['code']} · {NIVEAU_FR[n]}" + (f" / {NIVEAU_AR[n]}" if "ar" in langues(lib) else "") + (f" ({niv['relecture']}" + (f" par {niv['relue_par']} le {niv['relue_le']}" if niv.get("relecture") == STATUT_RELU else "") + ")" if niv.get("relecture") else ""))
            a("")
            for lg, titres in (("fr", ("Description", "Ce que cela peut apporter", "Ce que cela peut coûter", "Question pour l’entretien")),
                                ("ar", ("الوصف", "ما قد يتيحه ذلك", "ما قد يكلّفه ذلك", "سؤال للجلسة"))):
                if lg not in langues(lib): continue
                b = niv[lg]
                a(f"**{titres[0]}** (`ipip-items`, {lg})")
                a("")
                a(" ".join(accorder(t, "n") for t in b["description"]))
                a("")
                a(f"**{titres[1]}** (`hypothese`)")
                a("")
                for t in b["apport"]: a(f"- {accorder(t, 'n')}")
                a("")
                a(f"**{titres[2]}** (`hypothese`)")
                a("")
                for t in b["cout"]: a(f"- {accorder(t, 'n')}")
                a("")
                a(f"**{titres[3]}** (`hypothese`) : {accorder(b['question'], 'n')}")
                a("")
                vs = variantes(niv, lg)
                if vs:
                    a("*Variantes d’accord de ce bloc (masculin, féminin) :*" if lg == "fr" else "*متغيّرات الصياغة بحسب الصيغة المختارة (مذكر، مؤنث):*")
                    a("")
                    for m_, f_, n_ in vs:
                        a(f"- m : {m_}")
                        a(f"  f : {f_}")
                    a("")
    return "\n".join(L) + "\n"


def autotest(lib):
    """Chaque mutation doit faire échouer le contrôle : sinon le contrôle ne protège rien."""
    def trouver(l, pred):
        for f in l["facettes"]:
            for n in NIVEAUX:
                for lg in langues(l):
                    b = f["niveaux"][n][lg]
                    for k in ("description", "apport", "cout"):
                        for i, t in enumerate(b[k]):
                            if pred(t): return b[k], i
                    if pred(b["question"]): return b, "question"
        raise LookupError("aucune phrase marquée")
    marque = lambda t: bool(MARQUEUR.search(t))
    francais = lambda t: bool(MARQUEUR.search(t)) and not re.search(r"[؀-ۿ]", t)
    def modifier(l, fn, fr=False):
        cont, i = trouver(l, francais if fr else marque)
        cont[i] = fn(cont[i])
    muts = []
    def m(nom, fn): muts.append((nom, fn))
    langs = langues(lib)
    codes = [f["code"] for f in lib["facettes"]]
    def F(l, k): return l["facettes"][k % len(l["facettes"])]
    def txt(l, k, niv, lg, rub, i=0): return F(l, k)["niveaux"][niv][lg][rub], i
    def poser(l, k, niv, lg, rub, i, valeur):
        cont = F(l, k)["niveaux"][niv][lg][rub]
        if rub == "question": F(l, k)["niveaux"][niv][lg]["question"] = valeur
        else: cont[i] = valeur
    m("chiffre dans un texte", lambda l: poser(l, 0, "bas", "fr", "description", 0, "Vous répondez à 3 sur 5."))
    m("mot interdit FR (moyenne)", lambda l: poser(l, 1, "haut", "fr", "description", 1, "Vous êtes au-dessus de la moyenne."))
    m("mot interdit FR (faible)", lambda l: poser(l, 2, "bas", "fr", "cout", 0, "Votre intérêt peut paraître faible."))
    if "ar" in langs:
        m("mot interdit AR (ضعيف)", lambda l: poser(l, 3, "milieu", "ar", "cout", 0, "قد يظهر أداء ضعيف."))
        m("bloc arabe manquant", lambda l: F(l, 1)["niveaux"]["milieu"].pop("ar"))
    m("hypothèse sans tournure d’hypothèse", lambda l: poser(l, 4, "haut", "fr", "apport", 0, "Vous tenez toujours vos engagements."))
    m("diagnostic non nié", lambda l: poser(l, 0, "haut", "fr", "description", 1, "Ceci est un diagnostic."))
    m("bloc français manquant", lambda l: F(l, 2)["niveaux"]["milieu"].pop("fr"))
    m("structure incomplète", lambda l: F(l, 2)["niveaux"]["haut"]["fr"]["apport"].pop())
    m("niveau manquant", lambda l: F(l, 3)["niveaux"].pop("plutot_bas"))
    m("point d’exclamation", lambda l: poser(l, 4, "bas", "fr", "question", 0, "Pourquoi ?!"))
    m("phrase dupliquée entre niveaux", lambda l: poser(l, 0, "haut", "fr", "apport", 0, F(l, 0)["niveaux"]["bas"]["fr"]["apport"][0]))
    m("phrase de plus de 240 caractères", lambda l: poser(l, 1, "milieu", "fr", "description", 0, "Vos réponses indiquent " + "une tendance " * 25 + "."))
    m("tiret cadratin", lambda l: poser(l, 2, "plutot_haut", "fr", "cout", 1, "Il se peut que ce soit lourd — parfois."))
    m("lexique interdit (coach)", lambda l: poser(l, 3, "plutot_bas", "fr", "apport", 1, "Un coach peut vous aider."))
    m("lexique interdit (compétence)", lambda l: poser(l, 4, "milieu", "fr", "cout", 0, "Cela peut limiter une compétence."))
    m("question sans point d’interrogation", lambda l: poser(l, 0, "milieu", "fr", "question", 0, "Que se passe-t-il pour vous."))
    if lib.get("relecture_requise"):
        m("mention « non relue » retirée d’un bloc", lambda l: F(l, 5)["niveaux"]["milieu"].pop("relecture"))
        m("mention « relue » posée sans relecteur", lambda l: F(l, 6)["niveaux"]["haut"].__setitem__("relecture", "relue"))
        m("mention « relue » avec relecteur mais sans date", lambda l: F(l, 6)["niveaux"]["bas"].update(relecture="relue", relue_par="Nezha Bentara"))
        m("mention « relue » avec date mais sans relecteur", lambda l: F(l, 7)["niveaux"]["bas"].update(relecture="relue", relue_le="2026-10-21"))
        m("mention « relue » avec relecteur blanc", lambda l: F(l, 8)["niveaux"]["bas"].update(relecture="relue", relue_par="  ", relue_le="2026-10-21"))
        m("mention « relue » avec date impossible", lambda l: F(l, 9)["niveaux"]["bas"].update(relecture="relue", relue_par="Nezha Bentara", relue_le="2026-13-45"))
        m("mention « relue » avec date non ISO", lambda l: F(l, 9)["niveaux"]["haut"].update(relecture="relue", relue_par="Nezha Bentara", relue_le="21/10/2026"))
        m("relecteur posé sur un bloc « non relue »", lambda l: F(l, 10)["niveaux"]["bas"].__setitem__("relue_par", "Nezha Bentara"))
        m("mention de relecture inconnue", lambda l: F(l, 11)["niveaux"]["bas"].__setitem__("relecture", "validée"))
    if lib.get("complete"):
        m("facette manquante", lambda l: l["facettes"].pop())
        m("facette en double", lambda l: l["facettes"].append(copy.deepcopy(l["facettes"][0])))
    # Accord (seulement si la bibliothèque porte des marqueurs)
    def a_marqueur(l):
        try: trouver(l, marque); return True
        except LookupError: return False
    if a_marqueur(lib):
        m("marqueur à deux alternatives seulement", lambda l: modifier(l, lambda t: re.sub(r"\{([^{}|]*)\|([^{}|]*)\|[^{}|]*\}", r"{|}", t, count=1)))
        m("alternative vide dans un marqueur", lambda l: modifier(l, lambda t: re.sub(r"\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}", r"{||}", t, count=1)))
        m("accolade non fermée", lambda l: modifier(l, lambda t: t + " {oups"))
        m("mot interdit seulement dans la forme féminine (français)", lambda l: modifier(l, lambda t: re.sub(r"\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}", lambda x: "{%s|%s faible|%s}" % (x.group(1), x.group(2), x.group(3)), t, count=1), fr=True))
        m("chiffre seulement dans la forme masculine", lambda l: modifier(l, lambda t: re.sub(r"\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}", lambda x: "{%s 3|%s|%s}" % (x.group(1), x.group(2), x.group(3)), t, count=1)))
        m("marqueur imbriqué", lambda l: modifier(l, lambda t: t.replace("{", "{{", 1)))
    ok = True
    if lib.get("relecture_requise"):  # une relecture complète ne doit PAS être refusée (contrôle positif)
        bonne = copy.deepcopy(lib)
        F(bonne, 12)["niveaux"]["milieu"].update(relecture="relue", relue_par="Nezha Bentara", relue_le="2026-10-21")
        refus = controler(bonne)
        print(f"  bloc « relue » complet (relecteur et date) : {'accepté (attendu)' if not refus else 'REFUSÉ : ' + str(refus)}")
        if refus: ok = False
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
    # La résolution doit aussi neutraliser un accord inconnu
    if accorder("x {a|b|c} y", "?") != "x c y" or accorder("x {a|b|c} y", None) != "x c y":
        print("  accord inconnu ou absent : le contrôle attend la forme sans accord : ROUGE"); ok = False
    else:
        print("  accord inconnu ou absent : forme sans accord (attendu)")
    return ok


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # le mode isolé (-I) ignore PYTHONIOENCODING
    chemin = sys.argv[1]
    lib = json.load(open(chemin, encoding="utf-8"))
    if "--selftest" in sys.argv:
        base = controler(lib)
        print(f"contrôle sur la bibliothèque saine : {len(base)} défaut(s)")
        sys.exit(0 if (not base and autotest(lib)) else 1)
    if "--regression" in sys.argv:
        avant = json.load(open(sys.argv[sys.argv.index("--regression") + 1], encoding="utf-8"))
        ecarts = regression(lib, avant)
        for e in ecarts: print("ÉCART", e)
        print(f"{len(ecarts)} écart(s) entre la forme sans accord et le texte d'avant")
        sys.exit(1 if ecarts else 0)
    defauts = controler(lib)
    for x in defauts: print("DÉFAUT", x)
    print(f"{len(defauts)} défaut(s)")
    if defauts: sys.exit(1)
    if "--md" in sys.argv:
        out = chemin.rsplit(".", 1)[0] + ".md"
        open(out, "w", encoding="utf-8", newline="\n").write(rendre_md(lib))
        print("écrit", out)
