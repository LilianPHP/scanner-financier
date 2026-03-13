"""
Parser CSV pour relevés bancaires français.
Gère différents encodages et structures de colonnes.
"""
import io
import pandas as pd
from typing import List, Dict, Any


# Noms de colonnes courants dans les relevés bancaires français
DATE_COLUMNS = ["date", "date operation", "date valeur", "date d'opération", "date opération"]
LABEL_COLUMNS = ["libelle", "libellé", "description", "intitule", "opération", "opération", "detail"]
AMOUNT_COLUMNS = ["montant", "debit", "crédit", "credit", "débit", "solde"]
DEBIT_COLUMNS = ["debit", "débit", "montant debit", "montant débit", "sortie"]
CREDIT_COLUMNS = ["credit", "crédit", "montant credit", "montant crédit", "entree", "entrée"]


def _normalize_col(name: str) -> str:
    """Normalise un nom de colonne pour la comparaison."""
    return name.strip().lower().replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ô", "o")


def _find_column(df: pd.DataFrame, candidates: List[str]) -> str | None:
    """Trouve le nom de colonne correspondant parmi les candidats."""
    normalized_cols = {_normalize_col(c): c for c in df.columns}
    for candidate in candidates:
        normalized = _normalize_col(candidate)
        if normalized in normalized_cols:
            return normalized_cols[normalized]
        # Recherche partielle
        for norm_col, orig_col in normalized_cols.items():
            if normalized in norm_col or norm_col in normalized:
                return orig_col
    return None


def _parse_amount(value: Any) -> float:
    """Convertit une valeur de montant en float."""
    if pd.isna(value):
        return 0.0
    s = str(value).strip()
    s = s.replace("\xa0", "").replace(" ", "").replace("€", "")
    s = s.replace(",", ".")
    # Supprimer les points de milliers (ex: 1.234,56 → 1234.56)
    if s.count(".") > 1:
        s = s.replace(".", "", s.count(".") - 1)
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_csv(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier CSV de relevé bancaire.
    Retourne une liste de dicts bruts avec date, label, amount.
    """
    # Essayer différents encodages
    for encoding in ["latin-1", "utf-8", "cp1252"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = content.decode("latin-1", errors="replace")

    # Essayer différents séparateurs
    for sep in [";", ",", "\t", "|"]:
        try:
            df = pd.read_csv(
                io.StringIO(text),
                sep=sep,
                encoding=None,
                on_bad_lines="skip",
                dtype=str,
            )
            if len(df.columns) >= 2:
                break
        except Exception:
            continue
    else:
        raise ValueError("Impossible de lire le CSV : format non reconnu")

    # Trouver les colonnes
    date_col = _find_column(df, DATE_COLUMNS)
    label_col = _find_column(df, LABEL_COLUMNS)

    if not date_col or not label_col:
        raise ValueError(f"Colonnes date ou libellé non trouvées. Colonnes présentes : {list(df.columns)}")

    # Gestion des montants : peut être une colonne unique, ou débit/crédit séparés
    debit_col = _find_column(df, DEBIT_COLUMNS)
    credit_col = _find_column(df, CREDIT_COLUMNS)
    amount_col = _find_column(df, AMOUNT_COLUMNS)

    rows = []
    for _, row in df.iterrows():
        date_val = str(row[date_col]).strip()
        label_val = str(row[label_col]).strip()

        # Ignorer les lignes vides ou d'en-tête
        if not date_val or date_val.lower() in ("nan", "date", "date opération"):
            continue

        # Calculer le montant
        if debit_col and credit_col:
            debit = _parse_amount(row.get(debit_col, 0))
            credit = _parse_amount(row.get(credit_col, 0))
            amount = credit - debit if credit > 0 else -abs(debit)
        elif amount_col:
            amount = _parse_amount(row.get(amount_col, 0))
        else:
            amount = 0.0

        if date_val and label_val and label_val.lower() != "nan":
            rows.append({
                "date_raw": date_val,
                "label_raw": label_val,
                "amount": amount,
            })

    return rows
