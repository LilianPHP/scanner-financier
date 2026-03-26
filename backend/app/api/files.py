"""
Endpoints de gestion des fichiers uploadés.
POST /files/upload  → upload, parse, catégorise, sauvegarde
"""
import uuid
import io
import time
from collections import defaultdict
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Depends, Request
from typing import Optional

# Rate limiting : max 10 uploads par user par heure (fenêtre glissante)
_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 3600  # secondes
_upload_timestamps: dict = defaultdict(list)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _check_rate_limit(user_id: str) -> None:
    now = time.time()
    timestamps = _upload_timestamps[user_id]
    # Supprimer les entrées hors fenêtre
    _upload_timestamps[user_id] = [t for t in timestamps if now - t < _RATE_LIMIT_WINDOW]
    if len(_upload_timestamps[user_id]) >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Trop d'uploads — limite de {_RATE_LIMIT_MAX} fichiers par heure atteinte."
        )
    _upload_timestamps[user_id].append(now)

from app.parsers.csv_parser import parse_csv
from app.parsers.xlsx_parser import parse_xlsx
from app.parsers.pdf_parser import parse_pdf
from app.services.normalization import normalize_transactions
from app.services.categorization import categorize_batch
from app.services.analytics import compute_summary, compute_by_category, compute_monthly_timeline, detect_subscriptions
from jose import jwt as jose_jwt

from app.db.client import get_supabase

router = APIRouter()


def _get_user_id(authorization: Optional[str]) -> str:
    """Extrait l'user_id depuis le JWT Supabase sans vérification de signature."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token d'authentification manquant")
    token = authorization.split(" ")[1]
    try:
        payload = jose_jwt.get_unverified_claims(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """
    Upload et analyse un relevé bancaire.
    Retourne les transactions catégorisées + analytics.
    """
    # Auth
    user_id = _get_user_id(authorization)

    # Rate limiting
    _check_rate_limit(user_id)

    # Lire le fichier
    content = await file.read()

    # Taille max 10 MB
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux — maximum 10 Mo.")
    filename = file.filename or "unknown"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Parser selon le format
    try:
        if ext == "csv" or ext == "txt":
            raw_rows = parse_csv(content)
        elif ext in ("xls", "xlsx"):
            raw_rows = parse_xlsx(content)
        elif ext == "pdf":
            raw_rows = parse_pdf(content)
        else:
            raise HTTPException(status_code=400, detail=f"Format non supporté : .{ext}")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not raw_rows:
        raise HTTPException(status_code=422, detail="Aucune transaction trouvée dans le fichier")

    # Normaliser
    transactions = normalize_transactions(raw_rows)

    # Catégoriser
    transactions = categorize_batch(transactions)

    # Analytics
    summary = compute_summary(transactions)
    by_category = compute_by_category(transactions)
    timeline = compute_monthly_timeline(transactions)
    subscriptions = detect_subscriptions(transactions)

    # Sauvegarder en base Supabase
    sb = get_supabase()
    file_id = str(uuid.uuid4())

    # Enregistrer le fichier
    sb.table("uploaded_files").insert({
        "id": file_id,
        "user_id": user_id,
        "filename": filename,
        "file_type": ext,
        "transaction_count": len(transactions),
    }).execute()

    # Sauvegarder les transactions
    tx_records = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "file_id": file_id,
            "date": tx["date"],
            "label_raw": tx["label_raw"],
            "label_clean": tx["label_clean"],
            "amount": tx["amount"],
            "direction": tx["direction"],
            "category": tx["category"],
        }
        for tx in transactions
    ]
    sb.table("transactions").insert(tx_records).execute()

    # Sauvegarder le résumé analytique
    sb.table("analysis_results").insert({
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "user_id": user_id,
        "income_total": summary["income_total"],
        "expense_total": summary["expense_total"],
        "cashflow": summary["cashflow"],
        "savings_rate": summary["savings_rate"],
    }).execute()

    return {
        "file_id": file_id,
        "filename": filename,
        "transactions": tx_records,
        "summary": summary,
        "by_category": by_category,
        "subscriptions": subscriptions,
        "timeline": timeline,
    }
