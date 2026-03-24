"""
Endpoints de gestion des transactions.
GET  /transactions/{file_id}       → liste des transactions
PATCH /transactions/{tx_id}        → modifier une catégorie
"""
from fastapi import APIRouter, Header, HTTPException, Path
from pydantic import BaseModel
from typing import Optional

from app.db.client import get_supabase

router = APIRouter()

VALID_CATEGORIES = {
    "alimentation", "logement", "transport", "loisirs", "abonnements",
    "salaire", "frais bancaires", "sante", "investissement",
    "epargne", "impots", "autres",
}


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


@router.get("/{file_id}")
def get_transactions(
    file_id: str = Path(...),
    authorization: Optional[str] = Header(None),
):
    """Retourne les transactions d'un fichier."""
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    result = (
        sb.table("transactions")
        .select("*")
        .eq("file_id", file_id)
        .eq("user_id", user_id)
        .order("date")
        .execute()
    )

    return {"transactions": result.data}


class UpdateCategoryRequest(BaseModel):
    category: str
    propagate: bool = False  # Si True, met à jour les transactions similaires


@router.patch("/{tx_id}")
def update_transaction(
    tx_id: str = Path(...),
    body: UpdateCategoryRequest = ...,
    authorization: Optional[str] = Header(None),
):
    """Met à jour la catégorie d'une transaction (et optionnellement les similaires)."""
    user_id = _get_user_id(authorization)

    if body.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Catégorie invalide. Valeurs acceptées : {', '.join(VALID_CATEGORIES)}",
        )

    sb = get_supabase()

    # Vérifier que la transaction appartient à l'utilisateur
    tx_result = sb.table("transactions").select("*").eq("id", tx_id).eq("user_id", user_id).execute()
    if not tx_result.data:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")

    tx = tx_result.data[0]

    # Mettre à jour la transaction
    sb.table("transactions").update({"category": body.category}).eq("id", tx_id).execute()

    updated_count = 1

    # Propagation aux transactions avec EXACTEMENT le même libellé
    if body.propagate:
        similar = (
            sb.table("transactions")
            .select("id")
            .eq("user_id", user_id)
            .eq("label_clean", tx["label_clean"])
            .neq("id", tx_id)
            .execute()
        )

        for similar_tx in similar.data:
            sb.table("transactions").update({"category": body.category}).eq("id", similar_tx["id"]).execute()
            updated_count += 1

    return {
        "updated": True,
        "transaction_id": tx_id,
        "new_category": body.category,
        "total_updated": updated_count,
    }
