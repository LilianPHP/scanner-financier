"""
Endpoints analytics.
GET /analytics/{file_id}/summary
GET /analytics/{file_id}/categories
GET /analytics/{file_id}/timeline
"""
from fastapi import APIRouter, Header, HTTPException, Path
from typing import Optional

from app.db.client import get_supabase
from app.auth import get_user_id as _get_user_id
from app.services.analytics import (
    compute_summary,
    compute_by_category,
    compute_monthly_timeline,
    detect_subscriptions,
    compute_score,
)

router = APIRouter()


def _get_transactions_for_file(file_id: str, user_id: str):
    """Récupère toutes les transactions d'un fichier."""
    sb = get_supabase()
    result = (
        sb.table("transactions")
        .select("*")
        .eq("file_id", file_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data


@router.get("/{file_id}/summary")
def get_summary(
    file_id: str = Path(...),
    authorization: Optional[str] = Header(None),
):
    """KPIs principaux : revenus, dépenses, cashflow, taux d'épargne."""
    user_id = _get_user_id(authorization)
    transactions = _get_transactions_for_file(file_id, user_id)
    if not transactions:
        raise HTTPException(status_code=404, detail="Aucune transaction pour ce fichier")
    return compute_summary(transactions)


@router.get("/{file_id}/categories")
def get_categories(
    file_id: str = Path(...),
    authorization: Optional[str] = Header(None),
):
    """Dépenses agrégées par catégorie."""
    user_id = _get_user_id(authorization)
    transactions = _get_transactions_for_file(file_id, user_id)
    if not transactions:
        raise HTTPException(status_code=404, detail="Aucune transaction pour ce fichier")

    return {
        "by_category": compute_by_category(transactions),
        "subscriptions": detect_subscriptions(transactions),
    }


@router.get("/{file_id}/score")
def get_score(
    file_id: str = Path(...),
    authorization: Optional[str] = Header(None),
):
    """Score de santé financière 0-100."""
    user_id = _get_user_id(authorization)
    transactions = _get_transactions_for_file(file_id, user_id)
    if not transactions:
        raise HTTPException(status_code=404, detail="Aucune transaction pour ce fichier")
    return compute_score(transactions)


@router.get("/{file_id}/timeline")
def get_timeline(
    file_id: str = Path(...),
    authorization: Optional[str] = Header(None),
):
    """Revenus et dépenses par mois."""
    user_id = _get_user_id(authorization)
    transactions = _get_transactions_for_file(file_id, user_id)
    if not transactions:
        raise HTTPException(status_code=404, detail="Aucune transaction pour ce fichier")
    return {"timeline": compute_monthly_timeline(transactions)}
