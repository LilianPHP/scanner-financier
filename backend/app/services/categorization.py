"""
Catégorisation des transactions par règles déterministes.
L'IA (Claude) est utilisée en fallback pour les transactions non catégorisées.
"""
from typing import List, Dict, Any


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
    ],
    "abonnements": [
        "free ", "orange ", "sfr ", "bouygues",
        "netflix", "spotify", "amazon prime", "disney+", "disney plus",
        "canal+", "apple tv", "hulu", "dazn",
        "google play", "google one", "apple icloud", "apple music",
        "adobe", "microsoft 365", "dropbox", "youtube premium",
        "bee tv", "molotov", "salto",
    ],
    "alimentation": [
        "carrefour", "leclerc", "lidl", "aldi", "auchan", "intermarche",
        "monoprix", "franprix", "casino ", "super u", "netto ",
        "biocoop", "naturalia", "picard",
        "uber eats", "deliveroo", "just eat", "dominos",
        "mcdonald", "burger king", "kfc", "subway", "quick ",
        "boulangerie", "patisserie", "boucherie", "fromagerie",
        "restaurant", "cafe ", "bistrot", "brasserie",
        "sushi", "pizza", "kebab",
    ],
    "transport": [
        "uber ", "bolt ", "heetch", "taxi", "vtc ",
        "sncf", "ratp", "navigo", "transpole", "tcl ", "tan ",
        "ouigo", "tgv ", "ter ", "intercites",
        "blablacar", "ouibus", "flixbus",
        "essence", "carburant", "total ", "bp ", "shell ",
        "esso ", "q8 ", "station service",
        "peage", "parking", "indigo ", "q-park",
        "autoroutes", "vinci autoroutes", "sanef",
        "velib", "lime ", "bird ", "tier ",
    ],
    "logement": [
        "loyer", "charges locatives", "edf ", "engie ", "gdf ",
        "eau ", "veolia ", "suez ", "saur ",
        "assurance habitation", "assurance logement", "maaf ",
        "macif ", "axa ", "allianz ", "generali ", "matmut ",
        "copropriete", "syndic ", "gardien",
        "darty ", "boulanger ", "ikea ", "but ", "conforama",
    ],
    "sante": [
        "pharmacie", "pharmacy", "drug store", "drugstore",  # labels FR et EN
        "medecin", "docteur", "dentiste", "dentist", "opticien",
        "kinesitherapeute", "osteopathe", "hopital", "clinique",
        "mutuelle", "prevoyance",
        "doctolib", "ameli", "cpam ",
    ],
    "loisirs": [
        "cinema", "ugc ", "pathe ", "gaumont ", "mk2 ",
        "theatre", "opera", "concert", "spectacle", "musee",
        "sport ", "gym ", "salle de sport", "fitness",
        "basic fit", "neoness", "orange bleue",
        "voyage", "hotel", "booking.com", "airbnb", "abritel",
        "agence de voyage", "club med", "thomas cook",
        "fnac ", "cultura ", "virgin",
        "amazon ", "cdiscount ", "ebay ", "vinted ",
        "playstation", "xbox ", "steam ", "nintendo",
    ],
    "frais bancaires": [
        "cotisation carte", "cotisation compte", "cotisation offre", "offre premium",
        "commission", "frais de tenue", "frais bancaires", "agios", "interet debiteur",
        "frais virement", "frais change", "frais cb",
    ],
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
    user_rules: Dict[str, str] | None = None,
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
