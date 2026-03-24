"""
Catégorisation des transactions par règles déterministes.
L'IA (Claude) n'est utilisée qu'en fallback pour les cas ambigus.
"""
import re
from typing import List, Dict, Any


CATEGORY_RULES: Dict[str, List[str]] = {
    "salaire": [
        "salaire", " paie ", "remuneration", "virement employeur",
        "pole emploi", "france travail revenu", "are ", "indemnite chomage",
        "allocations familiales", "caf ", "cpam versement", "retraite", "pension retraite",
    ],
    "investissement": [
        "bitstack", "crypto", "bitcoin", "ethereum", "bourse",
        "trading", " pea ", "cto ", "coinbase", "binance", "kraken",
        "degiro", "trade republic", "boursorama courtage",
    ],
    "epargne": [
        "livret a", "ldds", "ldd ", "pel ", "cel ", "livret jeune",
        "livret epargne", "virement emis web m.", "virement a moi",
        "virement perso", "epargne",
    ],
    "impots": [
        "france travail prelevement", "impots", "dgfip", "tva",
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
        "pharmacie", "medecin", "docteur", "dentiste", "opticien",
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
        "cotisation carte", "cotisation compte", "commission",
        "frais de tenue", "frais bancaires", "agios", "interet debiteur",
        "frais virement", "frais change", "frais cb",
    ],
}

# Mapping pour normalisation (accents supprimés)
def _normalize(text: str) -> str:
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

    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if _normalize(kw) in normalized:
                return category

    return "autres"


def categorize_batch(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Catégorise une liste de transactions.
    """
    for tx in transactions:
        tx["category"] = categorize(tx["label_raw"], tx["amount"])
    return transactions
