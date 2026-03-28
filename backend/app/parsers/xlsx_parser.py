"""
Parser Excel (.xls, .xlsx) pour relevés bancaires et fichiers budget perso.
Gère les lignes de métadonnées en tête (Crédit Agricole, BNP, etc.)
et les formats budget personnalisés (colonnes 'Catégories', 'Dépenses', 'Revenus', etc.)
"""
import io
import datetime
import pandas as pd
from typing import List, Dict, Any, Optional
from app.parsers.csv_parser import (
    _find_column, _parse_amount, _normalize_col,
    DATE_COLUMNS, LABEL_COLUMNS, DEBIT_COLUMNS, CREDIT_COLUMNS, AMOUNT_COLUMNS
)
from app.services.currency import detect_currency_from_columns


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


def _parse_sheet(content: bytes, sheet_name) -> List[Dict[str, Any]]:
    """Parse une feuille Excel et retourne les transactions brutes."""
    try:
        df_raw = pd.read_excel(io.BytesIO(content), dtype=str, sheet_name=sheet_name, header=None)
    except Exception as e:
        raise ValueError(f"Impossible de lire la feuille '{sheet_name}' : {e}")

    header_row = _find_header_row_xlsx(df_raw)

    try:
        df = pd.read_excel(
            io.BytesIO(content),
            dtype=str,
            sheet_name=sheet_name,
            skiprows=header_row,
            header=0,
        )
    except Exception as e:
        raise ValueError(f"Impossible de lire la feuille '{sheet_name}' : {e}")

    # Trouver les colonnes
    date_col = _find_column(df, DATE_COLUMNS)
    label_col = _find_column(df, LABEL_COLUMNS)

    if not date_col or not label_col:
        return []  # feuille non parsable, on passe

    debit_col = _find_column(df, DEBIT_COLUMNS)
    credit_col = _find_column(df, CREDIT_COLUMNS)
    amount_col = _find_column(df, AMOUNT_COLUMNS)

    # Si debit et credit sont trop éloignés dans le tableau (> 4 colonnes d'écart),
    # ils appartiennent probablement à deux tableaux distincts — ne pas les combiner
    cols_list = list(df.columns)
    if debit_col and credit_col:
        di = cols_list.index(debit_col)
        ci = cols_list.index(credit_col)
        if abs(di - ci) > 4:
            credit_col = None  # le credit sera géré par _try_parse_secondary_table

    # Détecter la devise
    amount_cols_found = [c for c in [amount_col, debit_col, credit_col] if c]
    sample_vals = []
    for col in amount_cols_found:
        sample_vals += list(df[col].dropna().head(5).astype(str))
    currency = detect_currency_from_columns(list(df.columns), sample_vals)

    # Colonnes déjà utilisées par le tableau principal → à exclure du scan secondaire
    primary_amount_cols = {c for c in [amount_col, debit_col, credit_col] if c}

    rows = _extract_rows(df, date_col, label_col, debit_col, credit_col, amount_col, currency)

    # Si un second tableau existe (ex: revenus à droite), le parser aussi
    extra_rows = _try_parse_secondary_table(
        df, date_col, label_col, currency, exclude_cols=primary_amount_cols
    )
    rows += extra_rows

    return rows


# Mots-clés indiquant une ligne agrégat/total — à ne pas parser comme transaction
_AGGREGATE_KEYWORDS = (
    "total", "sous-total", "subtotal", "totaux",
    "somme", "sum", "moyenne", "average",
    "solde", "balance",
)

# Colonnes qui ne contiennent pas de montants utiles (séparateurs, commentaires…)
_NON_AMOUNT_COLS = ("commentaire", "commentaires", "note", "notes", "description")

# Pour les fichiers XLSX (relevés bancaires ou budget perso), chaque ligne de transaction
# a en général sa propre date. Le forward-fill est désactivé par défaut pour éviter
# d'inclure les lignes-titres de catégories (Voiture, Nourriture, etc.) comme transactions.
# À réactiver (valeur > 0) si on rencontre des formats où plusieurs transactions partagent une date.
_MAX_FORWARD_FILL = 0


def _is_aggregate_row(label_val: str) -> bool:
    """Retourne True si le libellé ressemble à une ligne de total/agrégat."""
    label_lower = label_val.lower().strip()
    return any(kw in label_lower for kw in _AGGREGATE_KEYWORDS)


def _extract_rows(df, date_col, label_col, debit_col, credit_col, amount_col, currency) -> List[Dict]:
    """Extrait les transactions d'un DataFrame.

    Gère :
    - Forward-fill des dates limité à _MAX_FORWARD_FILL lignes consécutives
    - Exclusion des lignes de totaux/agrégats (label contient 'total', etc.)
    - Fallback sur colonnes montant alternatives si la colonne principale est vide
    """
    rows = []
    last_date = None
    consecutive_no_date = 0  # compteur de lignes sans date propre consécutives

    # Identifier toutes les colonnes susceptibles de contenir un montant de fallback
    fallback_amount_cols = [
        c for c in df.columns
        if c not in (date_col, label_col, debit_col, credit_col, amount_col)
        and c is not None
        and not any(kw in _normalize_col(str(c)) for kw in _NON_AMOUNT_COLS)
    ]

    for _, row in df.iterrows():
        date_val = str(row[date_col]).strip() if pd.notna(row[date_col]) else ""
        label_val = str(row[label_col]).strip() if pd.notna(row[label_col]) else ""

        # Ignorer les en-têtes répétés ou lignes vides
        if not label_val or label_val.lower() in (
            "nan", "libelle", "libellé", "catégorie", "categorie",
            "catégories", "categories", "activite", "activité",
            "activites", "activités", "",
        ):
            continue

        # Ignorer explicitement les lignes de totaux/agrégats
        if _is_aggregate_row(label_val):
            continue

        # Gestion de la date
        date_is_own = bool(
            date_val and date_val.lower() not in ("nan", "date", "date opération", "date.1", "")
        )

        if date_is_own:
            last_date = date_val
            consecutive_no_date = 0
        elif last_date and consecutive_no_date < _MAX_FORWARD_FILL:
            # Forward-fill limité : on hérite de la date précédente (ex: banque avec date partagée)
            date_val = last_date
            consecutive_no_date += 1
        else:
            # Pas de date propre, et soit pas de last_date, soit quota forward-fill épuisé
            # → probablement une ligne-titre de catégorie, on ignore
            consecutive_no_date = 0  # reset pour la prochaine section
            continue

        # Calcul du montant
        if debit_col and credit_col:
            debit = _parse_amount(row.get(debit_col, 0))
            credit = _parse_amount(row.get(credit_col, 0))
            amount = credit - debit if credit > 0 else -abs(debit)
        elif debit_col:
            amount = -abs(_parse_amount(row.get(debit_col, 0)))
        elif credit_col:
            amount = abs(_parse_amount(row.get(credit_col, 0)))
        elif amount_col:
            amount = _parse_amount(row.get(amount_col, 0))
        else:
            amount = 0.0

        # Fallback : si montant principal = 0, essayer les colonnes annexes (ex: colonne AUD)
        if amount == 0.0:
            for fcol in fallback_amount_cols:
                val = _parse_amount(row.get(fcol, 0))
                if val != 0.0:
                    # Conserver le signe (débit = négatif si colonne "débit")
                    amount = -abs(val) if debit_col else val
                    break

        if amount == 0.0:
            continue

        rows.append({
            "date_raw": date_val,
            "label_raw": label_val,
            "amount": amount,
            "currency": currency,
        })

    return rows


def _try_parse_secondary_table(
    df, primary_date_col, primary_label_col, currency, exclude_cols=None
) -> List[Dict]:
    """
    Détecte et parse un second tableau dans la même feuille (ex: colonne revenus à droite).
    Cherche une seconde colonne de date et une seconde colonne de label parmi les colonnes restantes.

    exclude_cols : ensemble de colonnes déjà utilisées par le tableau principal à ne pas réutiliser
    """
    used_cols = {primary_date_col, primary_label_col}
    if exclude_cols:
        used_cols.update(exclude_cols)
    remaining_cols = [c for c in df.columns if c not in used_cols]

    # Chercher une autre colonne de date
    alt_date_col = None
    for col in remaining_cols:
        norm = _normalize_col(col)
        if any(_normalize_col(c) in norm or norm in _normalize_col(c) for c in DATE_COLUMNS if len(_normalize_col(c)) >= 3):
            alt_date_col = col
            break

    if not alt_date_col:
        return []

    # Chercher une autre colonne de label parmi les restantes
    remaining_after_date = [c for c in remaining_cols if c != alt_date_col]
    alt_label_col = None
    for col in remaining_after_date:
        norm = _normalize_col(col)
        if any(_normalize_col(c) in norm or norm in _normalize_col(c) for c in LABEL_COLUMNS if len(_normalize_col(c)) >= 4):
            alt_label_col = col
            break

    if not alt_label_col:
        return []

    # Chercher une colonne montant pour ce second tableau
    # → on ne cherche qu'à DROITE de alt_label_col pour éviter de prendre
    #   une colonne montant du tableau principal (ex: colonne AUD des dépenses)
    alt_amount_col = None
    cols_list = list(df.columns)
    alt_label_idx = cols_list.index(alt_label_col) if alt_label_col in cols_list else -1
    remaining_amount = [
        c for c in remaining_after_date
        if c != alt_label_col and (alt_label_idx < 0 or cols_list.index(c) > alt_label_idx)
    ]
    all_amount_candidates = AMOUNT_COLUMNS + DEBIT_COLUMNS + CREDIT_COLUMNS
    for col in remaining_amount:
        norm = _normalize_col(col)
        if any(_normalize_col(c) in norm or norm in _normalize_col(c) for c in all_amount_candidates if len(_normalize_col(c)) >= 4):
            alt_amount_col = col
            break

    if not alt_amount_col:
        return []

    # Déterminer si c'est un crédit (revenu) ou débit
    col_norm = _normalize_col(alt_amount_col)
    is_credit = any(_normalize_col(c) in col_norm or col_norm in _normalize_col(c) for c in CREDIT_COLUMNS)

    rows = []
    for _, row in df.iterrows():
        date_val = str(row[alt_date_col]).strip() if pd.notna(row[alt_date_col]) else ""
        label_val = str(row[alt_label_col]).strip() if pd.notna(row[alt_label_col]) else ""

        if not date_val or date_val.lower() in ("nan", "date", ""):
            continue
        if not label_val or label_val.lower() in ("nan", ""):
            continue

        amount = _parse_amount(row.get(alt_amount_col, 0))
        if amount == 0.0:
            continue

        # Les revenus sont positifs
        if is_credit:
            amount = abs(amount)
        else:
            amount = -abs(amount)

        rows.append({
            "date_raw": date_val,
            "label_raw": label_val,
            "amount": amount,
            "currency": currency,
        })

    return rows


def parse_xlsx(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier Excel de relevé bancaire ou de suivi budget.
    Essaie toutes les feuilles et retourne toutes les transactions trouvées.
    """
    try:
        xl = pd.ExcelFile(io.BytesIO(content))
        sheet_names = xl.sheet_names
    except Exception as e:
        raise ValueError(f"Impossible de lire le fichier Excel : {e}")

    all_rows: List[Dict] = []

    for sheet in sheet_names:
        try:
            rows = _parse_sheet(content, sheet)
            all_rows += rows
        except Exception:
            continue

    # Fallback : essayer uniquement la première feuille avec l'ancienne logique si rien trouvé
    if not all_rows:
        try:
            df_raw = pd.read_excel(io.BytesIO(content), dtype=str, sheet_name=0, header=None)
            header_row = _find_header_row_xlsx(df_raw)
            df = pd.read_excel(io.BytesIO(content), dtype=str, sheet_name=0, skiprows=header_row, header=0)
            date_col = _find_column(df, DATE_COLUMNS)
            label_col = _find_column(df, LABEL_COLUMNS)
            if not date_col or not label_col:
                raise ValueError(
                    f"Colonnes date ou libellé non trouvées. Colonnes présentes : {list(df.columns)}. "
                    f"Formats supportés : colonnes nommées 'Date', 'Libellé', 'Montant' (ou équivalents)."
                )
        except ValueError:
            raise

    if not all_rows:
        raise ValueError("Aucune transaction trouvée dans le fichier Excel.")

    return all_rows
