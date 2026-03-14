"""
Parser CSV pour relevés bancaires français.
Gère différents encodages et structures de colonnes.
Supporte les formats avec lignes de métadonnées en tête (BNP, CA, SG, etc.)
"""
import io
import pandas as pd
from typing import List, Dict, Any, Optional


# Noms de colonnes courants dans les relevés bancaires français
DATE_COLUMNS = [
    "date", "date operation", "date valeur", "date d'opération", "date opération",
    "date de l'opération", "date comptable", "date transaction",
]
LABEL_COLUMNS = [
    "libelle", "libellé", "description", "intitule", "intitulé",
    "opération", "operation", "detail", "détail", "motif", "libelle operation",
    "libellé opération", "nature de l'opération", "nature operation",
]
AMOUNT_COLUMNS = ["montant", "montant eur", "montant en eur", "valeur"]
DEBIT_COLUMNS = [
    "debit", "débit", "montant debit", "montant débit", "sortie",
    "debit eur", "débit eur", "montant debite",
]
CREDIT_COLUMNS = [
    "credit", "crédit", "montant credit", "montant crédit", "entree", "entrée",
    "credit eur", "crédit eur", "montant credite",
]


def _normalize_col(name: str) -> str:
    """Normalise un nom de colonne pour la comparaison."""
    return (
        str(name).strip().lower()
        .replace("é", "e").replace("è", "e").replace("ê", "e")
        .replace("à", "a").replace("â", "a")
        .replace("ô", "o").replace("ù", "u").replace("û", "u")
        .replace("î", "i").replace("ï", "i")
        .replace("ç", "c")
        .replace("'", " ").replace("\u2019", " ").replace("-", " ")
        .replace("  ", " ")
    )


def _find_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
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
    s = s.replace("\xa0", "").replace("\u202f", "").replace(" ", "").replace("€", "")
    s = s.replace(",", ".")
    if s.count(".") > 1:
        s = s.replace(".", "", s.count(".") - 1)
    try:
        return float(s)
    except ValueError:
        return 0.0


def _find_header_row(text: str, sep: str) -> int:
    """
    Cherche la ligne qui contient les vraies colonnes du relevé bancaire.
    Les exports bancaires français ont souvent des métadonnées en tête.
    Retourne l'index de la ligne header (0-based), ou 0 si aucun skip nécessaire.
    """
    all_candidates = DATE_COLUMNS + LABEL_COLUMNS + AMOUNT_COLUMNS + DEBIT_COLUMNS + CREDIT_COLUMNS
    lines = text.splitlines()

    for i, line in enumerate(lines[:20]):
        parts = [p.strip().strip('"') for p in line.split(sep)]
        normalized_parts = [_normalize_col(p) for p in parts]
        matches = sum(
            1 for norm_part in normalized_parts
            if any(_normalize_col(c) in norm_part or norm_part in _normalize_col(c)
                   for c in all_candidates if len(_normalize_col(c)) >= 4)
        )
        if matches >= 2:
            return i

    return 0


def parse_csv(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier CSV de relevé bancaire.
    Retourne une liste de dicts bruts avec date, label, amount.
    """
    text = None
    for encoding in ["latin-1", "utf-8", "cp1252", "utf-8-sig"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        text = content.decode("latin-1", errors="replace")

    df = None
    for sep in [";", ",", "\t", "|"]:
        try:
            header_row = _find_header_row(text, sep)
            candidate_df = pd.read_csv(
                io.StringIO(text),
                sep=sep,
                skiprows=header_row,
                encoding=None,
                on_bad_lines="skip",
                dtype=str,
            )
            if len(candidate_df.columns) >= 2:
                date_col = _find_column(candidate_df, DATE_COLUMNS)
                label_col = _find_column(candidate_df, LABEL_COLUMNS)
                if date_col and label_col:
                    df = candidate_df
                    break
                elif df is None and len(candidate_df.columns) >= 2:
                    df = candidate_df
        except Exception:
            continue

    if df is None:
        raise ValueError("Impossible de lire le CSV : format non reconnu")

    date_col = _find_column(df, DATE_COLUMNS)
    label_col = _find_column(df, LABEL_COLUMNS)

    if not date_col or not label_col:
        non_empty_cols = [c for c in df.columns if not c.startswith("Unnamed") and df[c].notna().sum() > 0]
        if len(non_empty_cols) >= 2:
            date_col = non_empty_cols[0]
            label_col = non_empty_cols[1]
        else:
            raise ValueError(
                f"Colonnes date ou libellé non trouvées. Colonnes présentes : {list(df.columns)}. "
                f"Formats supportés : colonnes nommées 'Date', 'Libellé', 'Montant' (ou équivalents)."
            )

    debit_col = _find_column(df, DEBIT_COLUMNS)
    credit_col = _find_column(df, CREDIT_COLUMNS)
    amount_col = _find_column(df, AMOUNT_COLUMNS)

    rows = []
    for _, row in df.iterrows():
        date_val = str(row[date_col]).strip()
        label_val = str(row[label_col]).strip()

        if not date_val or date_val.lower() in ("nan", "date", "date opération", "date operation", ""):
            continue
        if not label_val or label_val.lower() in ("nan", "libelle", "libellé", ""):
            continue

        if debit_col and credit_col:
            debit = _parse_amount(row.get(debit_col, 0))
            credit = _parse_amount(row.get(credit_col, 0))
            amount = credit - debit if credit > 0 else -abs(debit)
        elif amount_col:
            amount = _parse_amount(row.get(amount_col, 0))
        else:
            amount = 0.0
            for col in df.columns:
                if col not in (date_col, label_col):
                    val = _parse_amount(row.get(col, 0))
                    if val != 0.0:
                        amount = val
                        break

        rows.append({
            "date_raw": date_val,
            "label_raw": label_val,
            "amount": amount,
        })

    if not rows:
        raise ValueError("Aucune transaction trouvée dans le fichier CSV.")

    return rows
