"""
Détection de devise et conversion vers EUR.
Utilise l'API Frankfurter (gratuite, sans clé, mise à jour quotidienne).
"""
import logging
import httpx

logger = logging.getLogger(__name__)

# Correspondance symbole/code → devise ISO 4217
# Ordre important : les plus longs d'abord pour éviter les faux positifs
_SYMBOL_MAP = [
    ("A$",   "AUD"),
    ("AU$",  "AUD"),
    ("AUD",  "AUD"),
    ("CA$",  "CAD"),
    ("CAD",  "CAD"),
    ("NZ$",  "NZD"),
    ("NZD",  "NZD"),
    ("HK$",  "HKD"),
    ("HKD",  "HKD"),
    ("SG$",  "SGD"),
    ("SGD",  "SGD"),
    ("CHF",  "CHF"),
    ("JPY",  "JPY"),
    ("CNY",  "CNY"),
    ("GBP",  "GBP"),
    ("USD",  "USD"),
    ("EUR",  "EUR"),
    ("€",    "EUR"),
    ("£",    "GBP"),
    ("¥",    "JPY"),
    ("$",    "USD"),   # générique — mettre en dernier
]

# Cache en mémoire des taux (réinitialisé à chaque redémarrage)
_rate_cache: dict[str, float] = {}


def detect_currency(text: str) -> str | None:
    """
    Détecte la devise ISO depuis un texte (libellé de colonne, valeur de montant…).
    Retourne None si rien trouvé.
    """
    t = text.strip().upper()
    for symbol, code in _SYMBOL_MAP:
        if symbol.upper() in t:
            return code
    return None


def detect_currency_from_columns(columns: list[str], sample_values: list[str]) -> str:
    """
    Détecte la devise à partir des noms de colonnes puis des valeurs exemple.
    Retourne 'EUR' par défaut.
    """
    # 1) Headers de colonnes
    for col in columns:
        found = detect_currency(col)
        if found:
            return found

    # 2) Valeurs d'exemple (ex : "150,00 AUD" ou "$150.00")
    for val in sample_values:
        found = detect_currency(val)
        if found:
            return found

    return "EUR"


def get_eur_rate(currency: str) -> float:
    """
    Retourne le taux de conversion currency → EUR.
    1.0 pour EUR, taux réel via Frankfurter sinon.
    Fallback silencieux à 1.0 si l'API est indisponible.
    """
    if currency == "EUR":
        return 1.0

    if currency in _rate_cache:
        return _rate_cache[currency]

    try:
        resp = httpx.get(
            "https://api.frankfurter.app/latest",
            params={"from": currency, "to": "EUR"},
            timeout=5.0,
        )
        resp.raise_for_status()
        rate = resp.json()["rates"]["EUR"]
        _rate_cache[currency] = rate
        logger.info(f"Taux {currency}→EUR : {rate}")
        return rate
    except Exception as e:
        logger.warning(f"Impossible de récupérer le taux {currency}→EUR : {e} — fallback 1.0")
        return 1.0


def to_eur(amount: float, currency: str) -> float:
    """Convertit un montant vers EUR."""
    if currency == "EUR":
        return amount
    return round(amount * get_eur_rate(currency), 2)
