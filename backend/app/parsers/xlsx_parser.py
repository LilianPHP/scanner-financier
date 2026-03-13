"""
Parser Excel (.xls, .xlsx) pour relevés bancaires.
"""
import io
import pandas as pd
from typing import List, Dict, Any
from app.parsers.csv_parser import (
    _find_column, _parse_amount,
    DATE_COLUMNS, LABEL_COLUMNS, DEBIT_COLUMNS, CREDIT_COLUMNS, AMOUNT_COLUMNS
)


def parse_xlsx(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier Excel de relevé bancaire.
    Retourne une liste de dicts bruts avec date, label, amount.
    """
    try:
        df = pd.read_excel(io.BytesIO(content), dtype=str, sheet_name=0)
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel : {e}")

    # Trouver les colonnes
    date_col = _find_column(df, DATE_COLUMNS)
    label_col = _find_column(df, LABEL_COLUMNS)

    if not date_col or not label_col:
        raise ValueError(f"Colonnes date ou libellé non trouvées. Colonnes présentes : {list(df.columns)}")

    debit_col = _find_column(df, DEBIT_COLUMNS)
    credit_col = _find_column(df, CREDIT_COLUMNS)
    amount_col = _find_column(df, AMOUNT_COLUMNS)

    rows = []
    for _, row in df.iterrows():
        date_val = str(row[date_col]).strip()
        label_val = str(row[label_col]).strip()

        if not date_val or date_val.lower() in ("nan", "date"):
            continue

        if debit_col and credit_col:
            debit = _parse_amount(row.get(debit_col, 0))
            credit = _parse_amount(row.get(credit_col, 0))
            amount = credit - debit if credit > 0 else -abs(debit)
        elif amount_col:
            amount = _parse_amount(row.get(amount_col, 0))
        else:
            amount = 0.0

        if label_val and label_val.lower() != "nan":
            rows.append({
                "date_raw": date_val,
                "label_raw": label_val,
                "amount": amount,
            })

    return rows
