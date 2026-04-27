"""
Catégorisation des transactions par règles déterministes.
L'IA (Claude) est utilisée en fallback pour les transactions non catégorisées.
"""
from typing import List, Dict, Any, Optional


# PRIORITY_RULES : patterns qui doivent gagner même si un mot-clé moins spécifique
# d'une autre catégorie matche. Tournent AVANT CATEGORY_RULES.
# Cas typiques : "Uber Eats" doit gagner sur "Uber" générique → transport;
# "TotalEnergies station" doit aller en transport (carburant) plutôt que
# logement (électricité).
PRIORITY_RULES: List[tuple[str, str]] = [
    # Livraison de repas — sinon "uber " transport gagnerait
    ("uber eats",   "alimentation"),
    ("deliveroo",   "alimentation"),
    ("just eat",    "alimentation"),
    ("frichti",     "alimentation"),
    ("foodcheri",   "alimentation"),
    ("stuart ",     "alimentation"),
    # TotalEnergies à la pompe — sinon "totalenergies" logement gagnerait
    ("totalenergies station", "transport"),
    ("totalenergies access",  "transport"),
    # Carrefour Banque (frais) ne doit pas finir en alimentation
    ("carrefour banque",  "frais bancaires"),
    # Amazon Prime (abonnement) ne doit pas finir en loisirs (Amazon générique)
    ("amazon prime",      "abonnements"),
    ("prime video",       "abonnements"),
]


# Règles directionnelles : certains libellés signifient des choses différentes
# selon que c'est un crédit ou un débit.
DIRECTION_RULES: Dict[str, Dict[str, str]] = {
    # France Travail : allocation (crédit) = salaire, cotisation (débit) = impots
    "france travail": {"credit": "salaire", "debit": "impots"},
    "pole emploi":    {"credit": "salaire", "debit": "impots"},
    # CPAM : remboursement (crédit) = santé, prélèvement (débit) = santé aussi
    "cpam remboursement": {"credit": "sante"},
    "remboursement securite sociale": {"credit": "sante"},
    # Remboursements génériques (mutuelle, employeur, etc.) → santé/salaire selon direction
    "remboursement mutuelle": {"credit": "sante"},
    "remb mutuelle":          {"credit": "sante"},
    # Caf : allocations (crédit) → salaire, prélèvement (débit) → impots
    "caf ":                   {"credit": "salaire"},
    "caf-":                   {"credit": "salaire"},
    "caisse allocations":     {"credit": "salaire"},
}

# NOTE on order: Python dicts preserve insertion order, and the matcher returns
# the first hit. Highly-specific categories MUST come first so e.g.
# "CARREFOUR BANQUE COTISATION" lands in `frais bancaires`, not `alimentation`.
CATEGORY_RULES: Dict[str, List[str]] = {
    # ── 1. Frais bancaires (very specific patterns) ─────────────────────────
    "frais bancaires": [
        # Cotisations cartes & offres
        "cotisation carte", "cotisation compte", "cotisation offre", "offre premium",
        "cotisation visa", "cotisation mastercard", "cotisation amex",
        "carrefour banque", "boursorama frais", "lcl frais", "ing frais",
        # Frais & commissions
        "commission", "frais de tenue", "frais bancaires", "agios",
        "interet debiteur", "interets debiteurs",
        "frais virement", "frais sepa", "frais change", "frais cb",
        "frais retrait", "frais decouvert", "frais incident",
        "frais paiement etranger", "frais commerce etranger",
        "decouvert non autorise", "rejet prelevement",
        # Transferts P2P (libellé reconnaissable, montant variable)
        "lydia ", "lydia*", "lydia-", "paylib", "pumpkin",
        # Australie / International
        "wise ", "transferwise", "western union", "worldremit", "remitly",
        "osko ", "payid", "bpay ",
        "atm fee", "atm withdrawal", "international fee", "foreign transaction",
    ],

    # ── 2. Salaire ──────────────────────────────────────────────────────────
    "salaire": [
        "salaire", " paie ", "remuneration", "virement employeur", "vir employeur",
        "vir sepa salaire", "salaires", "bulletin de paie",
        "france travail revenu", "are ", "indemnite chomage",
        "allocations familiales", "caf ", "caf-", "caisse allocations",
        "cpam versement", "retraite", "pension retraite", "carsat ", "agirc-arrco",
        "alloca",          # FRANCE TRAVAIL DR IDF ALLOCA...
        "chomage",
        # Indemnités
        "indemnite stage", "gratification stage", "stage ", "ags ",
        "prime ", "13e mois", "interessement", "participation",
        "bourse crous", "bourse etudiante", "bourse etude",
        # Remboursements employeur (pris en charge transport, télétravail)
        "remb employeur", "remboursement employeur",
    ],

    # ── 3. Impôts & administratif ───────────────────────────────────────────
    "impots": [
        "france travail prelevement", "france travail idf",
        "impot", "dgfip", "tva", "tipi ",
        "taxe fonciere", "taxe habitation", "taxe d'habitation",
        "redevance audiovisuelle", "contribution audiovisuelle",
        "urssaf", "cotisation sociale", "cotisations sociales",
        "rsi ", "cipav", "sip ", "tresor public",
        "amende", "fps ", "antai ", "infraction",
        "carte grise", "ants ", "permis de conduire",
        # Australie / International
        "working holiday visa", "tourist visa", "student visa", "visa fee",
        "ato ", "australian tax", "medicare levy",
        "service nsw", "service vic", "service qld", "vicroads", "transport nsw",
    ],

    # ── 4. Investissement ───────────────────────────────────────────────────
    "investissement": [
        # Crypto exchanges
        "bitstack", "crypto", "bitcoin", "ethereum",
        "coinbase", "binance", "kraken", "bitvavo", "bitpanda",
        "crypto.com", "swissborg", "bitfinex", "gemini",
        # Bourse / courtiers
        "bourse", "trading", " pea ", "cto ", "compte titres",
        "degiro", "trade republic", "boursorama courtage",
        "bforbank invest", "fortuneo bourse", "saxo bank", "interactive brokers",
        # Robo-advisors / assurance-vie
        "yomoni", "nalo ", "linxea", "spirica", "ramify", "goodvest",
        # Plateformes UK/AU
        "etoro", "freetrade", "vanguard ", "blackrock",
    ],

    # ── 5. Épargne ──────────────────────────────────────────────────────────
    "epargne": [
        "livret a", "ldds", "ldd ", "pel ", "cel ", "livret jeune",
        "livret epargne", "livret bleu", "livret developpement",
        "emis web",   # "VIREMENT EMIS WEB M." → épargne perso
        "virement a moi", "virement perso", "epargne",
        "alimentation epargne", "transfert epargne",
        # Australie : Mighty/Spaceship/Up Saver
        "savings account", "spaceship", "mighty save",
    ],

    # ── 6. Logement ─────────────────────────────────────────────────────────
    "logement": [
        "loyer", "charges locatives", "charges copropriete",
        # Énergie FR
        "edf ", "engie ", "gdf ", "totalenergies", "total energies",
        "vattenfall", "plum energie", "octopus energy", "eni gas",
        "mint energie", "ekwateur", "alterna ", "ohm energie",
        "carrefour energie",  # fournisseur d'électricité Carrefour
        # Eau
        "eau ", "veolia ", "suez ", "saur ", "lyonnaise des eaux",
        # Assurance habitation
        "assurance habitation", "assurance logement", "assurance mrh",
        "maaf ", "macif ", "axa ", "allianz ", "generali ", "matmut ",
        "groupama", "gmf ", "maif ", "luko ", "lemonade",
        "april ", "swiss life", "harmonie mutuelle",
        # Syndic / immobilier
        "copropriete", "syndic ", "gardien", "foncia", "nexity", "citya",
        "sci ", "agence immobiliere", "loueur ",
        # Maison / déco
        "darty ", "boulanger ", "ikea ", "but ", "conforama",
        "leroy merlin", "castorama", "brico depot", "mr bricolage",
        "maisons du monde", "la redoute interieur", "alinea ",
        "amazon basics", "ali express maison",
        # Australie
        "bunnings", "mitre 10", "total tools", "diy ",
        "origin energy", "agl ", "energex", "ausgrid", "synergy ",
        "real estate", "domain.com", "rent ", "strata ",
    ],

    # ── 7. Santé ────────────────────────────────────────────────────────────
    "sante": [
        "pharmacie", "pharmacy", "drug store", "drugstore",
        # Marques pharma FR
        "lafayette ", "pharmavie", "univers pharmacie", "leadersante",
        # Médecins / spé
        "medecin", "docteur", "dr ", "dentiste", "dentist", "orthodontiste",
        "opticien", "optic 2000", "krys ", "atol ", "afflelou", "grandvision",
        "kinesitherapeute", "kine ", "osteopathe", "osteo ", "chiropracteur",
        "podologue", "orthophoniste", "sage femme", "sage-femme",
        "infirmier", "infirmiere", "sophrologue", "naturopathe",
        "psychologue", "psychiatre", "psychotherapeute",
        "dermatologue", "dermato ", "ophtalmologue", "ophtalmo ",
        "cardiologue", "gynecologue", "gyneco ", "pediatre",
        # Établissements
        "hopital", "clinique", "centre medical", "maison medicale",
        # Téléconsult
        "doctolib", "maiia ", "qare ", "livi ", "mesdocteurs",
        # Mutuelles & remboursements
        "mutuelle", "prevoyance", "harmonie ", "alan ", "april sante",
        "ameli", "cpam ", "msa ", "ramsay sante",
        # Australie
        "chemist warehouse", "priceline", "terry white", "blooms the chemist",
        "medical centre", "bulk bill", "medibank", "bupa ", "hcf ",
        "nib health", "australian unity",
    ],

    # ── 8. Abonnements (telco, streaming, SaaS) ─────────────────────────────
    "abonnements": [
        # Telco FR
        "free mobile", "free telecom", "free fix",
        "orange ", "sosh ", "sfr ", "red by sfr", "bouygues", "bbox ", "bytel ",
        "prixtel", "la poste mobile", "coriolis", "lebara", "lycamobile",
        # Streaming vidéo
        "netflix", "amazon prime", "disney+", "disney plus", "canal+",
        "apple tv", "hulu", "dazn", "youtube premium", "molotov", "salto",
        "crunchyroll", "twitch", "vimeo ",
        # Streaming musique
        "spotify", "apple music", "deezer", "tidal ", "soundcloud",
        # SaaS / Cloud / Logiciels
        "google play", "google one", "google workspace", "google storage",
        "apple icloud", "icloud ", "apple one",
        "adobe", "microsoft 365", "office 365", "ms office",
        "dropbox", "notion ", "linear ", "figma ", "miro ",
        "openai", "chatgpt", "anthropic", "claude.ai",
        "github", "gitlab", "vercel", "netlify", "cloudflare",
        "slack ", "zoom ", "loom ", "calendly",
        "wordpress", "shopify", "wix ", "squarespace",
        "presse ", "le monde ", "le figaro", "liberation", "mediapart",
        "lefigaro", "lemonde", "premium",
        # Australie / International
        "telstra", "optus ", "vodafone", "tpg ", "aussie broadband",
        "stan ", "binge ", "kayo ", "foxtel", "paramount+",
        "amazon au", "prime video",
    ],

    # ── 9. Transport ────────────────────────────────────────────────────────
    "transport": [
        # VTC / taxi
        "uber ", "bolt ", "heetch", "taxi", "vtc ", "kapten ", "freenow",
        "lyft ", "didi ",
        # Train FR
        "sncf", "trainline", "omio ", "ouigo", "tgv ", "ter ", "intercites",
        "eurostar", "thalys", "thello", "renfe ",
        # Bus longue distance
        "blablacar", "ouibus", "flixbus", "isilines", "eurolines",
        # Transports en commun FR
        "ratp", "navigo", "transpole", "tcl ", "tan ", "tisseo",
        "tbm ", "stas ", "star ", "bibus", "tag ", "twisto",
        "ile-de-france mobilites", "idf mobilites", "idfm ",
        # Carburant / stations FR
        "essence", "carburant", "total ", "totalenergies station",
        "bp ", "shell ", "esso ", "q8 ", "station service", "avia ",
        "leclerc energie",  # carte carburant Leclerc
        # Péage / parking / autoroutes
        "peage", "parking", "indigo ", "q-park", "saemes",
        "autoroutes", "vinci autoroutes", "sanef", "apr ",
        # Mobilités douces
        "velib", "lime ", "bird ", "tier ", "voi ", "dott ",
        # Aérien FR/EU
        "air france", "airfrance", "transavia", "easyjet", "ryanair",
        "lufthansa", "klm ", "british airways", "vueling", "wizz air",
        # Location voiture
        "europcar", "hertz ", "avis ", "sixt ", "enterprise rent",
        "getaround ", "drivy ", "ouicar ",
        # Australie / International
        "7-eleven", "ampol", "caltex", "united petrol", "metro petroleum",
        "go card", "myki ", "opal ", "translink", "ptv ", "transperth",
        "qantas", "jetstar", "virgin australia", "rex airlines",
        "airasia", "scoot ", "tigerair",
        "bus ", "tram ", "ferry ", "train ",
    ],

    # ── 10. Voyage (hébergement & séjours) ──────────────────────────────────
    "voyage": [
        "hotel", "booking.com", "airbnb", "abritel", "hostelworld",
        "expedia", "hotels.com", "agence de voyage", "club med", "thomas cook",
        "tripadvisor", "voyage", "sejour", "vacances", "circuit ", "croisiere",
        "getyourguide", "civitatis", "viator", "klook ",
        "ibis ", "novotel", "mercure ", "accor", "campanile", "f1 ", "premiere classe",
        "hilton", "marriott", "best western", "ihg ",
        "stayz ", "wotif ", "lastminute",
    ],

    # ── 11. Éducation ───────────────────────────────────────────────────────
    "education": [
        "universite", "university", "fac ", "ecole ", "ecole de ",
        "polytechnique", "sciences po", "hec ", "essec ", "edhec", "em lyon",
        "sorbonne", "dauphine", "neoma", "skema", "audencia", "ipag ",
        "scolarite", "frais de scolarite", "crous ", "campus", "tafe ", "hecs ",
        "udemy", "coursera", "openclassrooms", "skillshare",
        "duolingo", "babbel ", "assimil", "memrise", "rosetta stone",
        "formation", "elephorm", "ladigitale",
        "toefl", "ielts", "delf", "dalf", "tcf ", "tef ",
        "librairie", "papeterie", "fnac scolaire",
        "tafe ", "university", "hecs ",
    ],

    # ── 12. Vêtements & mode ────────────────────────────────────────────────
    "vetements": [
        # Fast fashion
        "zara", "h&m", "hm ", "uniqlo", "primark", "mango ", "bershka",
        "pull&bear", "stradivarius", "kiabi", "promod",
        "shein ", "asos ", "zalando", "la redoute", "boohoo ", "pretty little",
        # Fashion FR
        "sezane", "rouje", "ami paris", "isabel marant", "maje ", "sandro ",
        "the kooples", "celio ", "jules ", "brice ",
        "lacoste", "petit bateau", "agnes b", "comptoir des cotonniers",
        "etam ", "darjeeling", "princesse tam", "intimissimi",
        # Sport-style
        "nike ", "adidas ", "puma ", "new balance", "reebok", "asics ",
        "decathlon", "go sport", "intersport", "courir ", "foot locker",
        "jd sports", "snipes ", "size?", "vans ", "converse",
        "carhartt", "levis ", "levi's", "wrangler",
        # Grands magasins (mode)
        "galeries lafayette", "printemps haussmann", "bhv ", "le bon marche",
        # Australie
        "cotton on", "country road", "witchery", "the iconic", "glassons",
        "hype dc",
    ],

    # ── 13. Alimentation ────────────────────────────────────────────────────
    "alimentation": [
        # Supermarchés FR
        "carrefour", "leclerc", "lidl", "aldi", "auchan", "intermarche",
        "monoprix", "franprix", "casino ", "super u", "marche u", "u express",
        "netto ", "cora ", "g20 ", "spar ", "diagonal ", "petit casino",
        "biocoop", "naturalia", "la vie claire", "bio c bon", "picard",
        "grand frais", "marche frais", "primeur",
        # Livraison repas
        "uber eats", "deliveroo", "just eat", "stuart ", "frichti", "foodcheri",
        "dominos", "pizza hut", "sushi shop", "class'croute",
        # Fast-food chaînes
        "mcdonald", "mc do", "burger king", "kfc", "subway", "quick ",
        "five guys", "popeyes", "leon de bruxelles", "buffalo grill",
        "bagelstein", "exki ", "pomme de pain", "brioche doree",
        "paul ", "eric kayser", "marie blachere", "ange ",
        # Cafés / coffee
        "starbucks", "columbus cafe", "pret a manger", "costa coffee",
        # Restaurants génériques
        "boulangerie", "patisserie", "boucherie", "fromagerie", "caviste",
        "restaurant", "cafe ", "bistrot", "brasserie", "bar a ",
        "sushi", "pizza", "kebab", "tacos", "burger ", "wok ",
        # Australie / International
        "coles", "woolworths", "iga ", "costco", "harris farm",
        "countdown", "pak'nsave", "new world",
        "grill'd", "oporto", "hungry jack", "nando", "chatime",
        "boost juice", "schnitz", "mad mex", "zambreros",
        "the cheesecake shop", "bakers delight",
        "twelve cafe", "yo-chi", "yo chi",
    ],

    # ── 14. Loisirs (catch-all en dernier) ──────────────────────────────────
    "loisirs": [
        # Cinéma FR
        "cinema", "ugc ", "pathe ", "gaumont ", "mk2 ", "cgr ", "kinepolis",
        # Spectacle vivant
        "theatre", "opera", "concert", "spectacle", "festival",
        "musee", "exposition", "fnac spectacles", "ticketmaster", "see tickets",
        "shotgun", "dice ",
        # Sport / fitness
        "sport ", "gym ", "salle de sport", "fitness",
        "basic fit", "neoness", "orange bleue", "fitness park",
        "keep cool", "vita liberte", "on air fitness", "magic form",
        "club med gym", "moving ", "l'orange bleue", "anytime fitness",
        # Culture & livres
        "fnac", "cultura ", "virgin", "gibert ", "decitre", "amazon kindle",
        "audible", "scribd ", "storytel",
        # Marketplace généralistes (catch tardif après alimentation)
        "amazon ", "cdiscount ", "ebay ", "vinted ", "leboncoin",
        "rakuten", "back market", "boulanger.com",
        # Jeux vidéo
        "playstation", "xbox ", "steam ", "nintendo", "epic games",
        "blizzard", "ea ", "ubisoft", "riot games",
        # Enfants / parc d'attractions
        "disneyland", "parc asterix", "futuroscope", "puy du fou", "vulcania",
        # Australie / International
        "kmart", "k mart", "k-mart", "target ", "big w", "myer ",
        "david jones", "jb hi-fi", "jb hifi", "harvey norman",
        "rebel sport", "bcf ", "kathmandu", "macpac",
        "event cinema", "hoyts", "village cinema",
        "sea world", "dreamworld", "luna park",
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
        "location_vehicule": ["europcar", "hertz ", "avis ", "sixt ", "enterprise rent", "getaround", "drivy ", "ouicar"],
    },
    "logement": {
        "loyer": ["loyer", "charges locatives", "rent ", "real estate", "strata "],
        "energie": ["edf ", "engie ", "gdf ", "origin energy", "agl ", "energex", "ausgrid", "synergy "],
        "eau": ["eau ", "veolia ", "suez ", "saur "],
        "assurance_hab": ["assurance habitation", "assurance logement", "maaf ", "macif ", "axa ", "allianz ", "generali ", "matmut "],
        "electromenager": ["darty ", "boulanger ", "ikea ", "but ", "conforama"],
        "travaux_bricolage": ["leroy merlin", "castorama", "brico depot", "mr bricolage", "bunnings", "mitre 10", "total tools"],
        "charges_syndic": ["copropriete", "syndic ", "foncia", "nexity", "citya", "gardien", "charges copropriete"],
    },
    "sante": {
        "pharmacie": ["pharmacie", "pharmacy", "drug store", "drugstore", "chemist warehouse", "priceline", "terry white", "blooms the chemist"],
        "dentiste_opticien": ["dentiste", "dentist", "opticien", "optic 2000", "krys ", "atol ", "afflelou", "grandvision"],
        "mutuelle": ["mutuelle", "prevoyance", "medibank", "bupa ", "hcf ", "nib health", "australian unity"],
        "hopital_clinique": ["hopital", "clinique", "centre medical", "maison medicale", "ramsay sante"],
        "medecin": ["medecin", "docteur", "kinesitherapeute", "osteopathe", "doctolib", "ameli", "cpam ", "medical centre", "bulk bill", "psychologue", "psychiatre", "dermato", "ophtalmo"],
    },
    "loisirs": {
        "jeux_video": ["playstation", "xbox ", "steam ", "nintendo", "epic games", "blizzard", "ubisoft", "riot games"],
        "cinema_spectacle": [
            "cinema", "ugc ", "pathe ", "gaumont ", "mk2 ", "theatre", "opera", "concert", "spectacle", "musee", "exposition",
            "event cinema", "hoyts", "village cinema", "sea world", "dreamworld", "luna park",
        ],
        "sport_fitness": ["gym ", "salle de sport", "fitness", "basic fit", "neoness", "orange bleue", "rebel sport", "bcf ", "kathmandu", "macpac"],
        "livres_culture": ["fnac ", "cultura ", "virgin", "gibert ", "decitre", "librairie", "amazon kindle", "audible", "scribd ", "storytel"],
        "shopping": [
            "amazon ", "cdiscount ", "ebay ", "vinted ", "leboncoin", "rakuten", "back market", "boulanger.com",
            "kmart", "k mart", "k-mart", "target ", "big w", "myer ", "david jones", "jb hi-fi", "jb hifi", "harvey norman",
        ],
        "sorties": ["bar ", "boite de nuit", "discotheque", "pub "],
    },
    "voyage": {
        "hebergement": ["hotel", "airbnb", "abritel", "hostelworld", "booking.com", "hotels.com", "stayz ", "wotif ", "ibis ", "novotel", "mercure ", "accor", "hilton", "marriott"],
        "sejour_circuit": ["voyage", "sejour", "vacances", "circuit ", "croisiere", "club med", "agence de voyage", "expedia", "lastminute"],
        "activites_visites": ["getyourguide", "civitatis", "viator", "klook ", "tripadvisor"],
        "location_voiture_voyage": ["europcar voyage", "hertz voyage"],  # rare — most rentals stay in transport
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
        "seconde_main": ["vinted", "ebay vetement", "le closet"],
    },
    "abonnements": {
        "telephone_internet": ["free ", "orange ", "sfr ", "bouygues", "telstra", "optus ", "vodafone", "tpg ", "aussie broadband"],
        "streaming_musique": ["spotify", "apple music", "youtube premium", "google play"],
        "logiciel_cloud": ["adobe", "microsoft 365", "dropbox", "google one", "apple icloud", "notion ", "linear ", "figma ", "github", "openai", "chatgpt"],
        "streaming": [
            "netflix", "disney+", "disney plus", "canal+", "apple tv", "hulu", "dazn",
            "bee tv", "molotov", "salto", "amazon prime", "prime video",
            "stan ", "binge ", "kayo ", "foxtel", "paramount+",
        ],
        "presse": ["le monde ", "le figaro", "liberation", "mediapart", "lemonde", "lefigaro", "presse "],
    },
    "salaire": {
        "salaire_principal": ["salaire", " paie ", "remuneration", "virement employeur", "vir employeur", "vir sepa salaire"],
        "prime": ["prime ", "13e mois", "interessement", "participation", "gratification stage"],
        "aides_allocations": [
            "france travail revenu", "are ", "indemnite chomage", "allocations familiales",
            "caf ", "caf-", "caisse allocations", "alloca", "chomage",
        ],
        "remboursements_employeur": ["remb employeur", "remboursement employeur"],
        "retraite": ["retraite", "pension retraite", "carsat ", "agirc-arrco"],
        "bourse_etudiante": ["bourse crous", "bourse etudiante", "bourse etude"],
    },
    "frais bancaires": {
        "tenue_compte": ["frais de tenue", "frais bancaires", "cotisation compte", "cotisation offre", "offre premium"],
        "carte_bancaire": ["cotisation carte", "cotisation visa", "cotisation mastercard", "cotisation amex"],
        "agios": ["agios", "interet debiteur", "interets debiteurs", "decouvert non autorise", "frais decouvert"],
        "frais_etranger": [
            "frais paiement etranger", "frais commerce etranger", "frais change",
            "atm fee", "international fee", "foreign transaction",
        ],
        "incident": ["frais incident", "rejet prelevement"],
        "virement_p2p": ["lydia ", "lydia*", "lydia-", "paylib", "pumpkin", "wise ", "transferwise", "western union", "worldremit", "remitly"],
    },
    "impots": {
        "impot_revenu": ["impot", "dgfip", "tipi ", "tresor public"],
        "taxes_locales": [
            "taxe fonciere", "taxe habitation", "taxe d'habitation",
            "redevance audiovisuelle", "contribution audiovisuelle",
        ],
        "amendes": ["amende", "fps ", "antai ", "infraction"],
        "urssaf_cotisations": ["urssaf", "cotisation sociale", "cotisations sociales", "rsi ", "cipav", "sip "],
        "documents_officiels": ["carte grise", "ants ", "permis de conduire", "service nsw", "service vic", "service qld", "vicroads"],
    },
    "epargne": {
        "livret": [
            "livret a", "ldds", "ldd ", "pel ", "cel ", "livret jeune",
            "livret epargne", "livret bleu", "livret developpement", "savings account",
        ],
        "virement_epargne": [
            "emis web", "virement a moi", "virement perso",
            "alimentation epargne", "transfert epargne", "epargne",
        ],
    },
    "investissement": {
        "crypto": [
            "bitstack", "crypto", "bitcoin", "ethereum", "coinbase", "binance",
            "kraken", "bitvavo", "bitpanda", "crypto.com", "swissborg", "bitfinex", "gemini",
        ],
        "bourse": [
            "bourse", "trading", "degiro", "trade republic", "boursorama courtage",
            "bforbank invest", "fortuneo bourse", "saxo bank", "interactive brokers",
            "etoro", "freetrade", "vanguard ", "blackrock",
        ],
        "pea_cto": [" pea ", "cto ", "compte titres"],
        "robo_advisor": ["yomoni", "nalo ", "linxea", "spirica", "ramify", "goodvest"],
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

    # Passe 0a : règles prioritaires (résolvent les ambiguïtés)
    for kw, category in PRIORITY_RULES:
        if _normalize(kw) in normalized:
            return category

    # Passe 0b : règles directionnelles (crédit vs débit)
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

    # Passe 2 : fallback IA — uniquement les transactions non catégorisées
    # ET dont le montant est suffisant pour justifier l'appel API.
    # Seuil 5€ : sous ce montant, l'erreur de catégorisation est négligeable
    # vs. le coût d'un round-trip Claude (~$0.0002 / label avec Haiku).
    AI_MIN_AMOUNT = 5.0
    uncategorized = [
        tx for tx in transactions
        if tx["category"] == "autres" and abs(tx.get("amount", 0)) >= AI_MIN_AMOUNT
    ]

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
