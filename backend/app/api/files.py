"""
Endpoints de gestion des fichiers uploadés.
POST /files/upload  → upload, parse, catégorise, sauvegarde
"""
import uuid
import io
import time
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Depends, Request
from typing import Optional

# Rate limiting : max 10 uploads par user par heure (fenêtre glissante)
_RATE_LIMIT_MAX = 10
_RATE_LIMIT_WINDOW = 3600  # secondes
_upload_timestamps: dict = defaultdict(list)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _check_rate_limit_memory(user_id: str) -> None:
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


def _check_rate_limit(user_id: str, sb) -> None:
    """Rate limit persistant, partagé entre instances. Fallback mémoire si table absente."""
    since = datetime.now(timezone.utc) - timedelta(seconds=_RATE_LIMIT_WINDOW)
    try:
        sb.table("rate_limit_events").delete() \
            .eq("user_id", user_id) \
            .eq("action", "upload") \
            .lt("created_at", since.isoformat()) \
            .execute()

        existing = sb.table("rate_limit_events") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("action", "upload") \
            .gte("created_at", since.isoformat()) \
            .execute()

        if len(existing.data or []) >= _RATE_LIMIT_MAX:
            raise HTTPException(
                status_code=429,
                detail=f"Trop d'uploads — limite de {_RATE_LIMIT_MAX} fichiers par heure atteinte."
            )

        sb.table("rate_limit_events").insert({
            "user_id": user_id,
            "action": "upload",
        }).execute()
    except HTTPException:
        raise
    except Exception:
        _check_rate_limit_memory(user_id)

from app.parsers.csv_parser import parse_csv
from app.parsers.xlsx_parser import parse_xlsx
from app.parsers.pdf_parser import parse_pdf
from app.services.normalization import normalize_transactions
from app.services.categorization import categorize_batch, categorize_subcategory
from app.services.analytics import compute_summary, compute_by_category, compute_monthly_timeline, detect_subscriptions, compute_insights
from app.db.client import get_supabase
from app.auth import get_user_id as _get_user_id
from app.services.currency import assert_supported_currency

router = APIRouter()


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
    sb = get_supabase()

    # Rate limiting
    _check_rate_limit(user_id, sb)

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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erreur lors de la lecture du fichier : {e}")

    if not raw_rows:
        raise HTTPException(status_code=422, detail="Aucune transaction trouvée dans le fichier")

    try:
        # Normaliser
        transactions = normalize_transactions(raw_rows)

        # Senzio cible la France : les imports non-EUR sont rejetés explicitement.
        file_currency = raw_rows[0].get("currency", "EUR") if raw_rows else "EUR"
        assert_supported_currency(file_currency)
        for tx in transactions:
            tx["amount_original"] = tx["amount"]
            tx["currency"] = "EUR"

        # Charger les règles perso de l'utilisateur
        rules_res = sb.table("user_category_rules") \
            .select("label_pattern,category") \
            .eq("user_id", user_id) \
            .execute()
        user_rules = {r["label_pattern"]: r["category"] for r in (rules_res.data or [])}

        # Catégoriser (règles perso appliquées en priorité)
        transactions = categorize_batch(transactions, user_rules=user_rules)

        # Sous-catégorisation (dérivée, non stockée en DB)
        for tx in transactions:
            label = tx.get("label_clean") or tx["label_raw"]
            subcat = categorize_subcategory(label, tx["category"])
            if subcat is None:
                subcat = categorize_subcategory(tx["label_raw"], tx["category"])
            tx["subcategory"] = subcat

        # Analytics
        summary = compute_summary(transactions)
        by_category = compute_by_category(transactions)
        timeline = compute_monthly_timeline(transactions)
        subscriptions = detect_subscriptions(transactions)
        insights = compute_insights(transactions, timeline)
        file_id = str(uuid.uuid4())

        # Enregistrer le fichier
        sb.table("uploaded_files").insert({
            "id": file_id,
            "user_id": user_id,
            "filename": filename,
            "file_type": ext,
            "transaction_count": len(transactions),
        }).execute()

        tx_records = [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "file_id": file_id,
                "date": tx["date"],
                "label_raw": tx["label_raw"],
                "label_clean": tx["label_clean"],
                "amount": tx["amount"],
                "amount_original": tx.get("amount_original", tx["amount"]),
                "currency": tx.get("currency", "EUR"),
                "direction": tx["direction"],
                "category": tx["category"],
                "subcategory": tx.get("subcategory"),
            }
            for tx in transactions
        ]
        sb.table("transactions").insert(tx_records).execute()
        response_transactions = tx_records

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

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur lors du traitement : {e}")

    return {
        "file_id": file_id,
        "filename": filename,
        "transactions": response_transactions,
        "summary": summary,
        "by_category": by_category,
        "subscriptions": subscriptions,
        "insights": insights,
        "timeline": timeline,
    }
