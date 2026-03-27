"""
Endpoints pour les règles de catégorisation personnalisées.
POST /rules  → sauvegarder une règle (label → catégorie)
GET  /rules  → lister toutes les règles de l'utilisateur
DELETE /rules/{label_pattern} → supprimer une règle
"""
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.db.client import get_supabase
from app.auth import get_user_id as _get_user_id

router = APIRouter()


class RuleIn(BaseModel):
    label_pattern: str
    category: str


@router.post("")
async def save_rule(
    body: RuleIn,
    authorization: Optional[str] = Header(None),
):
    """Sauvegarde ou met à jour une règle de catégorisation."""
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    label = body.label_pattern.strip().lower()
    if not label:
        raise HTTPException(status_code=422, detail="label_pattern ne peut pas être vide")

    # Upsert : si la règle existe déjà pour ce label, on la met à jour
    sb.table("user_category_rules").upsert({
        "user_id": user_id,
        "label_pattern": label,
        "category": body.category,
    }, on_conflict="user_id,label_pattern").execute()

    return {"ok": True, "label_pattern": label, "category": body.category}


@router.get("")
async def get_rules(authorization: Optional[str] = Header(None)):
    """Retourne toutes les règles personnalisées de l'utilisateur."""
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    res = sb.table("user_category_rules") \
        .select("label_pattern,category,created_at") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .execute()

    return {"rules": res.data or []}


@router.delete("/{label_pattern:path}")
async def delete_rule(
    label_pattern: str,
    authorization: Optional[str] = Header(None),
):
    """Supprime une règle personnalisée."""
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    sb.table("user_category_rules") \
        .delete() \
        .eq("user_id", user_id) \
        .eq("label_pattern", label_pattern.lower()) \
        .execute()

    return {"ok": True}
