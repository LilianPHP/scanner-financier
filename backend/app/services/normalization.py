"""
Normalisation des transactions brutes.
Convertit les dates, nettoie les libellés, standardise les montants.
"""
import re
from datetime import datetime, date
from typing import List, Dict, Any


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


def _parse_date(date_raw: str) -> str:
    """Convertit une date brute en format YYYY-MM-DD."""
    date_raw = date_raw.strip()

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

    # Retourner tel quel si on n'arrive pas à parser
    return date_raw


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

        normalized.append({
            "date": _parse_date(date_raw),
            "label_raw": label_raw,
            "label_clean": _clean_label(label_raw),
            "amount": round(amount, 2),
            "direction": "credit" if amount > 0 else "debit",
        })

    # Trier par date
    normalized.sort(key=lambda x: x["date"])

    return normalized
