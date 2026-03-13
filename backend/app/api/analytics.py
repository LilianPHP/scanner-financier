"""
Endpoints analytics.
GET /analytics/{file_id}/summary
GET /analytics/{file_id}/categories
GET /analytics/{file_id}/timeline
"""
from fastapi import APIRouter, Header, HTTPException, Path
from typing import Optional

from app.db.client import get_supabase
from app.services.analytics import (
    compute_summary,
    compute_by_category,
    compute_monthly_timeline,
    detect_subscriptions,
)

router = APIRouter()


def _get_user_id(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token d'authentification manquant")
    token = authorization.split(" ")[1]
    try:
        sb = get_supabase()
        user = sb.auth.get_user(token)
        return user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


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
