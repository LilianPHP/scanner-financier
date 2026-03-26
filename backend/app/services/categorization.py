"""
Catégorisation des transactions par règles déterministes.
L'IA (Claude) est utilisée en fallback pour les transactions non catégorisées.
"""
from typing import List, Dict, Any


# Règles directionnelles : certains libellés signifient des choses différentes
# selon que c'est un crédit ou un débit.
DIRECTION_RULES: Dict[str, Dict[str, str]] = {
    "france travail": {"credit": "salaire", "debit": "impots"},
    "pole emploi":    {"credit": "salaire", "debit": "impots"},
    "en votre faveur": {"credit": "salaire"},   # virement entrant générique = revenu
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


def categorize_batch(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Catégorise une liste de transactions en deux passes :
    1. Règles déterministes (rapide, sans API)
    2. Fallback IA Claude pour les transactions encore en "autres"
    """
    # Passe 1 : règles
    for tx in transactions:
        tx["category"] = categorize(tx["label_raw"], tx["amount"])

    # Passe 2 : fallback IA pour les transactions non catégorisées
    # On inclut les crédits aussi (ex: virements entrants atypiques)
    uncategorized = [tx for tx in transactions if tx["category"] == "autres"]

    if uncategorized:
        from app.services.ai_categorization import categorize_with_ai
        labels = [tx["label_raw"] for tx in uncategorized]
        ai_results = categorize_with_ai(labels)

        for tx in uncategorized:
            if tx["label_raw"] in ai_results:
                tx["category"] = ai_results[tx["label_raw"]]

    return transactions
