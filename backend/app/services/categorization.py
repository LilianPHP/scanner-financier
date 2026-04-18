"""
Catégorisation des transactions par règles déterministes.
L'IA (Claude) est utilisée en fallback pour les transactions non catégorisées.
"""
from typing import List, Dict, Any, Optional


# Règles directionnelles : certains libellés signifient des choses différentes
# selon que c'est un crédit ou un débit.
DIRECTION_RULES: Dict[str, Dict[str, str]] = {
    # France Travail : allocation (crédit) = salaire, cotisation (débit) = impots
    "france travail": {"credit": "salaire", "debit": "impots"},
    "pole emploi":    {"credit": "salaire", "debit": "impots"},
    # CPAM : remboursement (crédit) = santé, prélèvement (débit) = santé aussi
    "cpam remboursement": {"credit": "sante"},
    "remboursement securite sociale": {"credit": "sante"},
}

CATEGORY_RULES: Dict[str, List[str]] = {
    "salaire": [
        "salaire", " paie ", "remuneration", "virement employeur",
        "france travail revenu", "are ", "indemnite chomage",
        "allocations familiales", "caf ", "cpam versement", "retraite", "pension retraite",
        "alloca",          # FRANCE TRAVAIL DR IDF ALLOCA...
        "chomage",
    ],
    "investissement": [
        "bitstack", "crypto", "bitcoin", "ethereum", "bourse",
        "trading", " pea ", "cto ", "coinbase", "binance", "kraken",
        "degiro", "trade republic", "boursorama courtage",
    ],
    "epargne": [
        "livret a", "ldds", "ldd ", "pel ", "cel ", "livret jeune",
        "livret epargne", "emis web",   # "VIREMENT EMIS WEB M." → épargne perso
        "virement a moi", "virement perso", "epargne",
    ],
    "impots": [
        "france travail prelevement", "france travail idf",  # prelevement avant france travail dans le libelle CA
        "impots", "dgfip", "tva",
        "taxe fonciere", "taxe habitation", "urssaf", "cotisation sociale",
        "rsi ", "cipav", "sip ", "tresor public",
        # Australie / International — frais administratifs et visas
        "working holiday visa", "tourist visa", "student visa", "visa fee",
        "ato ", "australian tax", "medicare levy",
        "service nsw", "service vic", "service qld", "vicroads", "transport nsw",
    ],
    "abonnements": [
        # France
        "free ", "orange ", "sfr ", "bouygues",
        "netflix", "spotify", "amazon prime", "disney+", "disney plus",
        "canal+", "apple tv", "hulu", "dazn",
        "google play", "google one", "apple icloud", "apple music",
        "adobe", "microsoft 365", "dropbox", "youtube premium",
        "bee tv", "molotov", "salto",
        # Australie / International
        "telstra", "optus ", "vodafone", "tpg ", "aussie broadband",
        "stan ", "binge ", "kayo ", "foxtel", "paramount+",
        "amazon au", "prime video",
    ],
    "alimentation": [
        # France
        "carrefour", "leclerc", "lidl", "aldi", "auchan", "intermarche",
        "monoprix", "franprix", "casino ", "super u", "netto ",
        "biocoop", "naturalia", "picard",
        "uber eats", "deliveroo", "just eat", "dominos",
        "mcdonald", "burger king", "kfc", "subway", "quick ",
        "boulangerie", "patisserie", "boucherie", "fromagerie",
        "restaurant", "cafe ", "bistrot", "brasserie",
        "sushi", "pizza", "kebab",
        # Australie / International
        "coles", "woolworths", "iga ", "costco", "harris farm",
        "countdown", "pak'nsave", "new world",
        "grill'd", "oporto", "hungry jack", "nando", "chatime",
        "boost juice", "schnitz", "mad mex", "zambreros",
        "the cheesecake shop", "bakers delight",
        "twelve cafe", "yo-chi", "yo chi",
    ],
    "transport": [
        # France
        "uber ", "bolt ", "heetch", "taxi", "vtc ",
        "sncf", "ratp", "navigo", "transpole", "tcl ", "tan ",
        "ouigo", "tgv ", "ter ", "intercites",
        "blablacar", "ouibus", "flixbus",
        "essence", "carburant", "total ", "bp ", "shell ",
        "esso ", "q8 ", "station service",
        "peage", "parking", "indigo ", "q-park",
        "autoroutes", "vinci autoroutes", "sanef",
        "velib", "lime ", "bird ", "tier ",
        # Australie / International
        "7-eleven", "ampol", "caltex", "united petrol", "metro petroleum",
        "go card", "myki ", "opal ", "translink", "ptv ", "transperth",
        "qantas", "jetstar", "virgin australia", "rex airlines",
        "airasia", "scoot ", "tigerair",
        "bus ", "tram ", "ferry ", "train ",
    ],
    "logement": [
        "loyer", "charges locatives", "edf ", "engie ", "gdf ",
        "eau ", "veolia ", "suez ", "saur ",
        "assurance habitation", "assurance logement", "maaf ",
        "macif ", "axa ", "allianz ", "generali ", "matmut ",
        "copropriete", "syndic ", "gardien",
        "darty ", "boulanger ", "ikea ", "but ", "conforama",
        # Australie
        "bunnings", "mitre 10", "total tools", "diy ",
        "origin energy", "agl ", "energex", "ausgrid", "synergy ",
        "real estate", "domain.com", "rent ", "strata ",
    ],
    "sante": [
        "pharmacie", "pharmacy", "drug store", "drugstore",  # labels FR et EN
        "medecin", "docteur", "dentiste", "dentist", "opticien",
        "kinesitherapeute", "osteopathe", "hopital", "clinique",
        "mutuelle", "prevoyance",
        "doctolib", "ameli", "cpam ",
        # Australie
        "chemist warehouse", "priceline", "terry white", "blooms the chemist",
        "medical centre", "bulk bill", "medibank", "bupa ", "hcf ",
        "nib health", "australian unity",
    ],
    "loisirs": [
        # France
        "cinema", "ugc ", "pathe ", "gaumont ", "mk2 ",
        "theatre", "opera", "concert", "spectacle", "musee",
        "sport ", "gym ", "salle de sport", "fitness",
        "basic fit", "neoness", "orange bleue",
        "fnac ", "cultura ", "virgin",
        "amazon ", "cdiscount ", "ebay ", "vinted ",
        "playstation", "xbox ", "steam ", "nintendo",
        # Australie / International — grande distribution & shopping
        "kmart", "k mart", "k-mart", "target ", "big w", "myer ",
        "david jones", "jb hi-fi", "jb hifi", "harvey norman",
        "rebel sport", "bcf ", "kathmandu", "macpac",
        "event cinema", "hoyts", "village cinema",
        "sea world", "dreamworld", "luna park",
    ],
    "voyage": [
        "hotel", "booking.com", "airbnb", "abritel", "hostelworld",
        "expedia", "hotels.com", "agence de voyage", "club med", "thomas cook",
        "tripadvisor", "voyage", "sejour", "vacances", "circuit ", "croisiere",
        "stayz ", "wotif ", "lastminute",
    ],
    "education": [
        "universite", "fac ", "ecole ", "formation", "udemy", "coursera",
        "openclassrooms", "skillshare", "duolingo", "babbel ", "assimil",
        "scolarite", "frais de scolarite", "crous ", "campus",
        "toefl", "ielts", "delf", "dalf", "librairie", "papeterie",
        "tafe ", "university", "hecs ",
    ],
    "vetements": [
        "zara", "h&m", "hm ", "uniqlo", "primark", "mango ", "kiabi",
        "promod", "sezane", "asos ", "zalando", "shein ", "la redoute",
        "nike ", "adidas ", "puma ", "new balance", "reebok", "decathlon",
        "cotton on", "country road", "witchery", "the iconic", "glassons",
        "foot locker", "hype dc",
    ],
    "frais bancaires": [
        "cotisation carte", "cotisation compte", "cotisation offre", "offre premium",
        "commission", "frais de tenue", "frais bancaires", "agios", "interet debiteur",
        "frais virement", "frais change", "frais cb",
        # Transferts P2P (libellé reconnaissable, montant variable)
        "lydia ", "lydia*", "paylib",
        # Australie
        "wise ", "transferwise", "western union", "worldremit",
        "osko ", "payid", "bpay ",
        "atm fee", "atm withdrawal", "international fee",
    ],
}


SUBCATEGORY_RULES: Dict[str, Dict[str, List[str]]] = {
    "alimentation": {
        "livraison": ["uber eats", "deliveroo", "just eat", "dominos"],
        "fast_food": ["mcdonald", "burger king", "kfc", "subway", "quick "],
        "restaurant": [
            "restaurant", "bistrot", "brasserie", "cafe ", "sushi", "pizza", "kebab",
            "grill'd", "oporto", "hungry jack", "nando", "schnitz", "mad mex", "zambreros",
            "twelve cafe", "yo-chi", "yo chi", "chatime", "boost juice",
        ],
        "boulangerie": ["boulangerie", "patisserie", "boucherie", "fromagerie", "bakers delight", "the cheesecake shop"],
        "courses": [
            "carrefour", "leclerc", "lidl", "aldi", "auchan", "intermarche",
            "monoprix", "franprix", "casino ", "super u", "netto ", "biocoop", "naturalia", "picard",
            "coles", "woolworths", "iga ", "costco", "harris farm", "countdown", "pak'nsave", "new world",
        ],
    },
    "transport": {
        "taxi_vtc": ["uber ", "bolt ", "heetch", "taxi", "vtc "],
        "velo_trottinette": ["velib", "lime ", "bird ", "tier "],
        "carburant": [
            "essence", "carburant", "total ", "bp ", "shell ", "esso ", "q8 ", "station service",
            "7-eleven", "ampol", "caltex", "united petrol", "metro petroleum",
        ],
        "parking_peage": ["peage", "parking", "indigo ", "q-park", "autoroutes", "vinci autoroutes", "sanef"],
        "train_avion": [
            "ouigo", "tgv ", "ter ", "intercites", "ouibus", "flixbus", "blablacar",
            "qantas", "jetstar", "virgin australia", "rex airlines", "airasia", "scoot ", "tigerair",
        ],
        "transports_commun": [
            "sncf", "ratp", "navigo", "transpole", "tcl ", "tan ",
            "go card", "myki ", "opal ", "translink", "ptv ", "transperth",
            "bus ", "tram ", "ferry ", "train ",
        ],
    },
    "logement": {
        "loyer": ["loyer", "charges locatives", "rent ", "real estate", "strata "],
        "energie": ["edf ", "engie ", "gdf ", "origin energy", "agl ", "energex", "ausgrid", "synergy "],
        "eau": ["eau ", "veolia ", "suez ", "saur "],
        "assurance_hab": ["assurance habitation", "assurance logement", "maaf ", "macif ", "axa ", "allianz ", "generali ", "matmut "],
        "electromenager": ["darty ", "boulanger ", "ikea ", "but ", "conforama", "bunnings", "mitre 10", "total tools", "diy ", "copropriete", "syndic "],
    },
    "sante": {
        "pharmacie": ["pharmacie", "pharmacy", "drug store", "drugstore", "chemist warehouse", "priceline", "terry white", "blooms the chemist"],
        "dentiste_opticien": ["dentiste", "dentist", "opticien"],
        "mutuelle": ["mutuelle", "prevoyance", "medibank", "bupa ", "hcf ", "nib health", "australian unity"],
        "medecin": ["medecin", "docteur", "kinesitherapeute", "osteopathe", "hopital", "clinique", "doctolib", "ameli", "cpam ", "medical centre", "bulk bill"],
    },
    "loisirs": {
        "jeux_video": ["playstation", "xbox ", "steam ", "nintendo"],
        "cinema_spectacle": [
            "cinema", "ugc ", "pathe ", "gaumont ", "mk2 ", "theatre", "opera", "concert", "spectacle", "musee",
            "event cinema", "hoyts", "village cinema", "sea world", "dreamworld", "luna park",
        ],
        "sport_fitness": ["gym ", "salle de sport", "fitness", "basic fit", "neoness", "orange bleue", "rebel sport", "bcf ", "kathmandu", "macpac"],
        "shopping": [
            "fnac ", "cultura ", "amazon ", "cdiscount ", "ebay ", "vinted ",
            "kmart", "k mart", "k-mart", "target ", "big w", "myer ", "david jones", "jb hi-fi", "jb hifi", "harvey norman",
        ],
    },
    "voyage": {
        "hebergement": ["hotel", "airbnb", "abritel", "hostelworld", "booking.com", "hotels.com", "stayz ", "wotif "],
        "sejour_circuit": ["voyage", "sejour", "vacances", "circuit ", "croisiere", "club med", "agence de voyage", "expedia", "lastminute"],
    },
    "education": {
        "scolarite": ["universite", "fac ", "ecole ", "scolarite", "frais de scolarite", "crous ", "campus", "tafe ", "university", "hecs "],
        "formation_en_ligne": ["udemy", "coursera", "openclassrooms", "skillshare", "duolingo", "babbel ", "assimil", "formation"],
        "langues_certif": ["toefl", "ielts", "delf", "dalf"],
        "livres_papeterie": ["librairie", "papeterie"],
    },
    "vetements": {
        "vetements_mode": ["zara", "h&m", "hm ", "uniqlo", "primark", "mango ", "kiabi", "promod", "sezane", "asos ", "zalando", "shein ", "la redoute", "cotton on", "country road", "witchery", "the iconic", "glassons"],
        "sport_chaussures": ["nike ", "adidas ", "puma ", "new balance", "reebok", "decathlon", "foot locker", "hype dc"],
    },
    "abonnements": {
        "telephone_internet": ["free ", "orange ", "sfr ", "bouygues", "telstra", "optus ", "vodafone", "tpg ", "aussie broadband"],
        "streaming_musique": ["spotify", "apple music", "youtube premium", "google play"],
        "logiciel_cloud": ["adobe", "microsoft 365", "dropbox", "google one", "apple icloud"],
        "streaming": [
            "netflix", "disney+", "disney plus", "canal+", "apple tv", "hulu", "dazn",
            "bee tv", "molotov", "salto", "amazon prime", "prime video",
            "stan ", "binge ", "kayo ", "foxtel", "paramount+",
        ],
    },
}


def _normalize(text: str) -> str:
    """Minuscule + suppression des accents."""
    text = text.lower()
    replacements = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a", "ä": "a",
        "ô": "o", "ö": "o",
        "û": "u", "ü": "u", "ù": "u",
        "î": "i", "ï": "i",
        "ç": "c",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text


def categorize_subcategory(label_raw: str, category: str):
    """Retourne la sous-catégorie détectée ou None si non applicable."""
    if category not in SUBCATEGORY_RULES:
        return None
    normalized = _normalize(label_raw)
    for subcat, keywords in SUBCATEGORY_RULES[category].items():
        for kw in keywords:
            if _normalize(kw) in normalized:
                return subcat
    return None


def categorize(label_raw: str, amount: float) -> str:
    """
    Catégorise une transaction par règles.
    Retourne la catégorie détectée ou "autres".
    """
    normalized = _normalize(label_raw)
    direction = "credit" if amount > 0 else "debit"

    # Passe 0 : règles directionnelles (crédit vs débit)
    for kw, mapping in DIRECTION_RULES.items():
        if _normalize(kw) in normalized:
            cat = mapping.get(direction)
            if cat:
                return cat

    # Passe 1 : règles génériques
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if _normalize(kw) in normalized:
                return category

    return "autres"


def categorize_batch(
    transactions: List[Dict[str, Any]],
    user_rules: Optional[Dict[str, str]] = None,
) -> List[Dict[str, Any]]:
    """
    Catégorise une liste de transactions en trois passes :
    0. Règles personnalisées de l'utilisateur (priorité absolue)
    1. Règles déterministes sur label_clean ET label_raw (rapide, sans API)
    2. Fallback IA Claude pour les transactions encore en "autres"
       → utilise label_clean (plus lisible pour l'IA)
    """
    # Passe 0 : règles perso (exact match sur label_clean normalisé)
    for tx in transactions:
        if user_rules:
            key = _normalize(tx.get("label_clean", ""))
            if key in user_rules:
                tx["category"] = user_rules[key]
                continue
        tx["category"] = "__pending__"

    # Passe 1 : règles keyword pour les non-matchés
    for tx in transactions:
        if tx["category"] != "__pending__":
            continue
        # Essaie label_clean d'abord (épuré du bruit bancaire)
        cat = categorize(tx.get("label_clean", ""), tx["amount"])
        # Si pas de match, essaie label_raw (peut contenir des patterns différents)
        if cat == "autres":
            cat = categorize(tx["label_raw"], tx["amount"])
        tx["category"] = cat

    # Passe 2 : fallback IA — crédits ET débits non catégorisés
    uncategorized = [tx for tx in transactions if tx["category"] == "autres"]

    if uncategorized:
        from app.services.ai_categorization import categorize_with_ai
        # Envoie label_clean à l'IA : libellé épuré, sans codes internes
        labels = [tx.get("label_clean", tx["label_raw"]) for tx in uncategorized]
        ai_results = categorize_with_ai(labels)

        for tx in uncategorized:
            label_key = tx.get("label_clean", tx["label_raw"])
            if label_key in ai_results:
                tx["category"] = ai_results[label_key]

    return transactions
