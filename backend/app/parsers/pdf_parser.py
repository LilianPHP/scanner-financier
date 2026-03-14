"""
Parser PDF pour relevés bancaires.
Utilise pdfplumber pour extraire les tableaux et le texte structuré.
"""
import io
import re
from typing import List, Dict, Any, Optional

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

from app.parsers.csv_parser import (
    _find_column, _parse_amount, _normalize_col,
    DATE_COLUMNS, LABEL_COLUMNS, DEBIT_COLUMNS, CREDIT_COLUMNS, AMOUNT_COLUMNS
)

# Pattern pour détecter une date française (DD/MM/YYYY)
DATE_PATTERN = re.compile(r"^\d{1,2}[/\-\.]\d{1,2}[/\-\.](?:\d{4}|\d{2})$")
# Pattern pour un montant valide (sans capturer des années comme 2026)
AMOUNT_PATTERN = re.compile(r"^[-+]?\d{1,3}(?:[\s\xa0\u202f]\d{3})*[,\.]\d{2}$")

# Mots-clés à ignorer (lignes de métadonnées)
SKIP_LABELS = {
    "solde", "téléchargement", "telechargement", "liste des opérations",
    "liste des operations", "date libellé", "date libelle",
    "débit euros", "crédit euros", "debit euros", "credit euros",
}


def _is_date(s: str) -> bool:
    return bool(DATE_PATTERN.match(s.strip()))


def _is_amount(s: str) -> bool:
    s = s.strip().replace("\xa0", " ").replace("\u202f", " ")
    return bool(AMOUNT_PATTERN.match(s))


def _clean_label(label: str) -> str:
    """Nettoie un libellé multi-lignes."""
    lines = [l.strip() for l in label.split("\n") if l.strip()]
    return " ".join(lines)


def _parse_pdf_with_tables(content: bytes) -> List[Dict[str, Any]]:
    """Tente d'extraire les transactions via les tableaux pdfplumber."""
    import pandas as pd
    rows = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables({
                "vertical_strategy": "lines_strict",
                "horizontal_strategy": "lines_strict",
            })
            if not tables:
                tables = page.extract_tables()

            for table in tables:
                if not table or len(table) < 2:
                    continue

                # Trouver la ligne header dans le tableau
                header_idx = None
                for i, row in enumerate(table):
                    if not row:
                        continue
                    norm_cells = [_normalize_col(str(c or "")) for c in row]
                    matches = sum(
                        1 for nc in norm_cells
                        if len(nc) >= 3 and any(
                            _normalize_col(c) in nc or nc in _normalize_col(c)
                            for c in (DATE_COLUMNS + LABEL_COLUMNS + DEBIT_COLUMNS + CREDIT_COLUMNS)
                            if len(_normalize_col(c)) >= 4
                        )
                    )
                    if matches >= 2:
                        header_idx = i
                        break

                if header_idx is None:
                    continue

                header = [str(c or "").strip() for c in table[header_idx]]
                df = pd.DataFrame(table[header_idx + 1:], columns=header)
                date_col = _find_column(df, DATE_COLUMNS)
                label_col = _find_column(df, LABEL_COLUMNS)
                if not date_col or not label_col:
                    continue

                debit_col = _find_column(df, DEBIT_COLUMNS)
                credit_col = _find_column(df, CREDIT_COLUMNS)
                amount_col = _find_column(df, AMOUNT_COLUMNS)

                for _, row in df.iterrows():
                    date_val = str(row.get(date_col, "")).strip()
                    label_val = _clean_label(str(row.get(label_col, "")).strip())

                    if not date_val or not _is_date(date_val):
                        continue
                    if not label_val or label_val.lower() in ("nan", ""):
                        continue
                    if any(skip in label_val.lower() for skip in SKIP_LABELS):
                        continue

                    if debit_col and credit_col:
                        debit = _parse_amount(row.get(debit_col, ""))
                        credit = _parse_amount(row.get(credit_col, ""))
                        amount = credit - debit if credit > 0 else -abs(debit)
                    elif amount_col:
                        amount = _parse_amount(row.get(amount_col, ""))
                    else:
                        amount = 0.0

                    rows.append({
                        "date_raw": date_val,
                        "label_raw": label_val,
                        "amount": amount,
                    })

    return rows


def _parse_pdf_with_text(content: bytes) -> List[Dict[str, Any]]:
    """
    Fallback: parse le texte extrait du PDF par position de mots.
    Gère le format Crédit Agricole où date/libellé/montant sont sur des lignes séparées.
    """
    rows = []

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
            if not words:
                continue

            # Regrouper par ligne (tolérance verticale de 5px)
            lines_by_y = {}
            for word in words:
                y = round(word["top"] / 5) * 5
                lines_by_y.setdefault(y, []).append(word)

            lines = []
            for y in sorted(lines_by_y.keys()):
                line_words = sorted(lines_by_y[y], key=lambda w: w["x0"])
                lines.append([w["text"] for w in line_words])

            # Parser les lignes qui commencent par une date
            i = 0
            while i < len(lines):
                line = lines[i]
                if not line or not _is_date(line[0].strip()):
                    i += 1
                    continue

                date_val = line[0].strip()
                remaining = line[1:]
                amount = 0.0
                label_tokens = []

                # Rassembler les lignes suivantes jusqu'à la prochaine date
                j = i + 1
                while j < len(lines) and j <= i + 4:
                    next_line = lines[j]
                    if next_line and _is_date(next_line[0]):
                        break
                    remaining.extend(next_line)
                    j += 1

                # Extraire le montant (dernier token numérique valide)
                for k in range(len(remaining) - 1, -1, -1):
                    token = remaining[k]
                    if _is_amount(token):
                        amount_str = token.replace("\xa0", "").replace("\u202f", "").replace(" ", "")
                        try:
                            amount = float(amount_str.replace(",", "."))
                        except ValueError:
                            pass
                        label_tokens = remaining[:k]
                        break
                else:
                    label_tokens = remaining

                label_val = " ".join(t for t in label_tokens if t.strip())
                label_val = re.sub(r"\s+", " ", label_val).strip()

                if not label_val or any(skip in label_val.lower() for skip in SKIP_LABELS):
                    i = j
                    continue

                rows.append({
                    "date_raw": date_val,
                    "label_raw": label_val,
                    "amount": amount,
                })
                i = j

    return rows


def parse_pdf(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier PDF de relevé bancaire.
    Essaie d'abord l'extraction de tableaux, puis fallback texte structuré.
    """
    if not PDF_AVAILABLE:
        raise ImportError("pdfplumber n'est pas installé.")

    # Essai 1 : extraction par tableaux
    try:
        rows = _parse_pdf_with_tables(content)
        if rows:
            return rows
    except Exception:
        pass

    # Essai 2 : parsing texte structuré par position
    rows = _parse_pdf_with_text(content)

    if not rows:
        raise ValueError(
            "Aucune transaction détectée dans le PDF. "
            "Le relevé est peut-être scanné (image) ou son format n'est pas reconnu."
        )

    return rows
