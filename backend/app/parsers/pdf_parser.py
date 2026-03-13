"""
Parser PDF pour relevés bancaires.
Utilise pdfplumber pour une meilleure extraction de tables.
"""
import io
import re
from typing import List, Dict, Any

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


# Pattern pour détecter une date française (DD/MM/YYYY ou DD/MM/YY)
DATE_PATTERN = re.compile(r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.](?:\d{4}|\d{2}))\b")
# Pattern pour détecter un montant (avec virgule ou point décimal)
AMOUNT_PATTERN = re.compile(r"[-+]?\d{1,3}(?:[\s.]\d{3})*(?:[,\.]\d{2})")


def _extract_lines_from_pdf(content: bytes) -> List[str]:
    """Extrait les lignes de texte d'un PDF."""
    if not PDF_AVAILABLE:
        raise ImportError("pdfplumber n'est pas installé. Lancez : pip install pdfplumber")

    lines = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines.extend(text.split("\n"))
    return lines


def _parse_line(line: str) -> Dict[str, Any] | None:
    """
    Tente de parser une ligne de relevé bancaire.
    Format attendu : DATE LIBELLÉ MONTANT
    """
    line = line.strip()
    if len(line) < 10:
        return None

    date_match = DATE_PATTERN.search(line)
    if not date_match:
        return None

    date_raw = date_match.group(1)

    # Trouver le montant (dernier nombre de la ligne)
    amounts = AMOUNT_PATTERN.findall(line)
    if not amounts:
        return None

    amount_str = amounts[-1].replace("\xa0", "").replace(" ", "")
    try:
        amount = float(amount_str.replace(",", "."))
    except ValueError:
        return None

    # Le libellé est entre la date et le montant
    start = date_match.end()
    end = line.rfind(amounts[-1])
    label_raw = line[start:end].strip()
    label_raw = re.sub(r"\s+", " ", label_raw)

    if not label_raw:
        label_raw = line

    return {
        "date_raw": date_raw,
        "label_raw": label_raw,
        "amount": amount,
    }


def parse_pdf(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse un fichier PDF de relevé bancaire.
    Retourne une liste de dicts bruts avec date, label, amount.
    """
    lines = _extract_lines_from_pdf(content)
    rows = []

    for line in lines:
        parsed = _parse_line(line)
        if parsed:
            rows.append(parsed)

    if not rows:
        raise ValueError(
            "Aucune transaction détectée dans le PDF. "
            "Le relevé est peut-être scanné (image) ou son format n'est pas reconnu."
        )

    return rows
