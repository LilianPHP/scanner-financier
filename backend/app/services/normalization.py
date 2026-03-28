"""
Normalisation des transactions brutes.
Convertit les dates, nettoie les libellés, standardise les montants.
"""
import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional


# Codes internes à supprimer du libellé
NOISE_PATTERNS = [
    r"\bCB\b",           # "CB CARREFOUR" → "CARREFOUR"
    r"\bVIR\b",          # "VIR SEPA"
    r"\bSEPA\b",
    r"\bX\d{4}\b",       # Numéros de carte partiels "X9518"
    r"\*+\d+",           # "*****1234"
    r"\d{6,}",           # Longs numéros (références internes)
    r"\b\d{2}/\d{2}\b",  # Dates dans le libellé
]

DATE_FORMATS = [
    "%d/%m/%Y", "%d/%m/%y",
    "%d-%m-%Y", "%d-%m-%y",
    "%d.%m.%Y", "%d.%m.%y",
    "%Y-%m-%d",
    "%d %m %Y",
]


def _parse_date(date_raw: str) -> Optional[str]:
    """Convertit une date brute en format YYYY-MM-DD. Retourne None si non parseable."""
    date_raw = date_raw.strip()
    # Tronquer les timestamps (ex: "2026-02-26 00:00:00" → "2026-02-26")
    if len(date_raw) > 10 and " " in date_raw:
        date_raw = date_raw.split(" ")[0]

    # Gérer les plages de dates type "4 & 5/3/26" → prendre la première date : "4/3/26"
    if "&" in date_raw:
        parts = date_raw.split("&")
        first_day = parts[0].strip()
        rest = parts[1].strip()  # ex: "5/3/26"
        for sep in ("/", "-", "."):
            if sep in rest:
                rest_parts = rest.split(sep)
                if len(rest_parts) >= 2:
                    date_raw = first_day + sep + sep.join(rest_parts[1:])
                    break
        else:
            date_raw = rest  # fallback : utiliser la seconde date telle quelle

    for fmt in DATE_FORMATS:
        try:
            d = datetime.strptime(date_raw, fmt)
            # Si l'année est dans le passé lointain, probablement une erreur
            if d.year < 1990:
                d = d.replace(year=d.year + 2000 if d.year < 100 else d.year)
            return d.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Dernier recours : essayer de parser partiellement
    # Ex: "12/03" → "2024-03-12"
    match = re.match(r"(\d{1,2})[/\-\.](\d{1,2})", date_raw)
    if match:
        day, month = int(match.group(1)), int(match.group(2))
        year = datetime.now().year
        try:
            return date(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Impossible à parser → None (la transaction sera ignorée)
    return None


def _clean_label(label_raw: str) -> str:
    """Nettoie un libellé de transaction."""
    label = label_raw.upper()

    # Supprimer les patterns de bruit
    for pattern in NOISE_PATTERNS:
        label = re.sub(pattern, "", label)

    # Nettoyer les espaces multiples
    label = re.sub(r"\s+", " ", label).strip()

    # Capitaliser proprement
    label = label.title()

    # Supprimer les préfixes courants inutiles
    for prefix in ["Virement ", "Paiement ", "Retrait ", "Prelevement "]:
        if label.startswith(prefix) and len(label) > len(prefix) + 3:
            label = label[len(prefix):]

    return label.strip()


def normalize_transactions(raw_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalise une liste de transactions brutes.
    Retourne une liste de transactions avec date, label_clean, amount, direction.
    """
    normalized = []

    for row in raw_rows:
        date_raw = row.get("date_raw", "")
        label_raw = row.get("label_raw", "")
        amount = float(row.get("amount", 0))

        # Ignorer les montants nuls
        if amount == 0:
            continue

        parsed_date = _parse_date(date_raw)
        if parsed_date is None:
            continue  # date non parseable → ignorer la transaction

        normalized.append({
            "date": parsed_date,
            "label_raw": label_raw,
            "label_clean": _clean_label(label_raw),
            "amount": round(amount, 2),
            "direction": "credit" if amount > 0 else "debit",
        })

    # Trier par date
    normalized.sort(key=lambda x: x["date"])

    return normalized
