"""
Parser Excel (.xls, .xlsx) pour relevés bancaires.
Gère les lignes de métadonnées en tête (format Crédit Agricole, BNP, etc.)
"""
import io
import pandas as pd
from typing import List, Dict, Any, Optional
from app.parsers.csv_parser import (
    _find_column, _parse_amount, _normalize_col,
    DATE_COLUMNS, LABEL_COLUMNS, DEBIT_COLUMNS, CREDIT_COLUMNS, AMOUNT_COLUMNS
)


def _find_header_row_xlsx(df_raw: pd.DataFrame) -> int:
    """
    Cherche la ligne qui contient les vraies colonnes du relevé bancaire.
    Retourne l'index de la ligne (0-based) à utiliser comme header.
    """
    all_candidates = DATE_COLUMNS + LABEL_COLUMNS + AMOUNT_COLUMNS + DEBIT_COLUMNS + CREDIT_COLUMNS

    for i, row in df_raw.iterrows():
        if i > 20:
            break
        values = [str(v) for v in row.values if pd.notna(v) and str(v).strip()]
        normalized = [_normalize_col(v) for v in values]
        matches = sum(
            1 for norm_val in normalized
            if len(norm_val) >= 3 and any(
                _normalize_col(c) in norm_val or norm_val in _normalize_col(c)
                for c in all_candidates if len(_normalize_col(c)) >= 4
            )
        )
        if matches >= 2:
            return i

    return 0


def parse_xlsx(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier Excel de relevé bancaire.
    Retourne une liste de dicts bruts avec date, label, amount.
    """
    try:
        # Lire sans header d'abord pour détecter où commence le vrai tableau
        df_raw = pd.read_excel(io.BytesIO(content), dtype=str, sheet_name=0, header=None)
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel : {e}")

    header_row = _find_header_row_xlsx(df_raw)

    try:
        df = pd.read_excel(
            io.BytesIO(content),
            dtype=str,
            sheet_name=0,
            skiprows=header_row,
            header=0,
        )
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel : {e}")

    # Trouver les colonnes
    date_col = _find_column(df, DATE_COLUMNS)
    label_col = _find_column(df, LABEL_COLUMNS)

    if not date_col or not label_col:
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
        raise ValueError("Aucune transaction trouvée dans le fichier Excel.")

    return rows
