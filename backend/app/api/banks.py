"""
Endpoints Open Banking — connexion bancaire via Powens.
GET  /banks/connect          → retourne l'URL webview Powens
POST /banks/callback         → traite le retour webview, importe les transactions
GET  /banks/connections      → liste les connexions bancaires de l'utilisateur
POST /banks/sync/{conn_id}   → resynchronise une connexion existante
"""
import uuid
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.db.client import get_supabase
from app.auth import get_user_id as _get_user_id
from app.services.powens import (
    create_powens_user, get_temp_code, build_webview_url,
    get_powens_transactions, get_connection_info,
    normalize_powens_transactions, is_configured,
)
from app.services.categorization import categorize_batch, categorize_subcategory
from app.services.analytics import (
    compute_summary, compute_by_category,
    compute_monthly_timeline, detect_subscriptions,
)

FRONTEND_URL = __import__("app.config", fromlist=["FRONTEND_URL"]).FRONTEND_URL
REDIRECT_URI = f"{FRONTEND_URL}/accounts/callback"

router = APIRouter()


def _check_configured():
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Connexion bancaire non configurée — variables POWENS_* manquantes.",
        )


# ── GET /banks/connect ─────────────────────────────────────────────────────────

@router.get("/connect")
def get_connect_url(authorization: Optional[str] = Header(None)):
    """
    Crée un user Powens, génère un code temporaire, retourne l'URL webview.
    Le frontend redirige l'user vers cette URL.
    """
    _check_configured()
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    try:
        # Créer un user Powens anonyme
        powens_user = create_powens_user()
        user_token = powens_user["auth_token"]
        state = str(uuid.uuid4())

        # Stocker le token temporairement (avant que la connexion soit établie)
        sb.table("bank_connections").insert({
            "id": state,
            "user_id": user_id,
            "powens_connection_id": "pending",
            "powens_user_token": user_token,
            "status": "pending",
        }).execute()

        temp_code = get_temp_code(user_token)
        webview_url = build_webview_url(temp_code, REDIRECT_URI, state)

        return {"webview_url": webview_url, "state": state}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Powens : {e}")


# ── POST /banks/callback ───────────────────────────────────────────────────────

class CallbackRequest(BaseModel):
    connection_id: str
    state: str


@router.post("/callback")
def process_callback(body: CallbackRequest, authorization: Optional[str] = Header(None)):
    """
    Traite le retour du webview Powens.
    Récupère les transactions, les catégorise et les sauvegarde.
    Retourne un UploadResult (même format que /files/upload).
    """
    _check_configured()
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    # Récupérer la connexion pending (par state = id)
    conn_res = sb.table("bank_connections") \
        .select("*") \
        .eq("id", body.state) \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not conn_res.data:
        raise HTTPException(status_code=404, detail="Session de connexion introuvable")

    user_token = conn_res.data["powens_user_token"]

    try:
        # Infos sur la banque connectée
        conn_info = get_connection_info(user_token, body.connection_id)
        connector = conn_info.get("connector") or {}
        institution_name = connector.get("name") or conn_info.get("id_connector") or "Banque"
        institution_logo = connector.get("logo_url") or connector.get("thumbnail_url") or ""

        # Récupérer les transactions (retry car Powens sync en arrière-plan)
        import time
        raw_transactions = []
        for attempt in range(4):
            raw_transactions = get_powens_transactions(user_token, body.connection_id)
            if raw_transactions:
                break
            time.sleep(3)  # attendre que Powens synchronise

        if not raw_transactions:
            raise HTTPException(status_code=422, detail="Aucune transaction récupérée depuis votre banque. La synchronisation est peut-être encore en cours — réessaie dans quelques secondes.")

        transactions = normalize_powens_transactions(raw_transactions)
        if not transactions:
            raise HTTPException(status_code=422, detail="Aucune transaction valide après normalisation.")

        # Charger les règles perso
        rules_res = sb.table("user_category_rules") \
            .select("label_pattern,category") \
            .eq("user_id", user_id) \
            .execute()
        user_rules = {r["label_pattern"]: r["category"] for r in (rules_res.data or [])}

        # Catégorisation
        transactions = categorize_batch(transactions, user_rules=user_rules)
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
        file_id = str(uuid.uuid4())

        # Enregistrer comme un "fichier" virtuel
        sb.table("uploaded_files").insert({
            "id": file_id,
            "user_id": user_id,
            "filename": f"Connexion {institution_name}",
            "file_type": "bank",
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
                "amount_original": tx.get("amount_original", tx["amount"]),
                "currency": tx.get("currency", "EUR"),
                "direction": tx["direction"],
                "category": tx["category"],
                "subcategory": tx.get("subcategory"),
            }
            for tx in transactions
        ]
        sb.table("transactions").insert(tx_records).execute()

        # Analytics summary
        sb.table("analysis_results").insert({
            "id": str(uuid.uuid4()),
            "file_id": file_id,
            "user_id": user_id,
            "income_total": summary["income_total"],
            "expense_total": summary["expense_total"],
            "cashflow": summary["cashflow"],
            "savings_rate": summary["savings_rate"],
        }).execute()

        # Mettre à jour la connexion bancaire
        sb.table("bank_connections").update({
            "powens_connection_id": body.connection_id,
            "institution_name": institution_name,
            "institution_logo": institution_logo,
            "file_id": file_id,
            "status": "active",
            "last_synced_at": "now()",
        }).eq("id", body.state).execute()

    except HTTPException:
        raise
    except Exception as e:
        sb.table("bank_connections").update({"status": "error"}).eq("id", body.state).execute()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'import bancaire : {e}")

    return {
        "file_id": file_id,
        "filename": f"Connexion {institution_name}",
        "transactions": tx_records,
        "summary": summary,
        "by_category": by_category,
        "subscriptions": subscriptions,
        "timeline": timeline,
    }


# ── GET /banks/connections ─────────────────────────────────────────────────────

@router.get("/connections")
def list_connections(authorization: Optional[str] = Header(None)):
    """Liste les connexions bancaires actives de l'utilisateur."""
    user_id = _get_user_id(authorization)
    sb = get_supabase()
    result = sb.table("bank_connections") \
        .select("id,institution_name,institution_logo,status,last_synced_at,file_id,created_at") \
        .eq("user_id", user_id) \
        .neq("status", "pending") \
        .order("created_at", desc=True) \
        .execute()
    return {"connections": result.data or []}


# ── POST /banks/sync/{conn_id} ─────────────────────────────────────────────────

@router.post("/sync/{conn_id}")
def sync_connection(conn_id: str, authorization: Optional[str] = Header(None)):
    """Resynchronise une connexion bancaire existante."""
    _check_configured()
    user_id = _get_user_id(authorization)
    sb = get_supabase()

    conn_res = sb.table("bank_connections") \
        .select("*") \
        .eq("id", conn_id) \
        .eq("user_id", user_id) \
        .single() \
        .execute()

    if not conn_res.data:
        raise HTTPException(status_code=404, detail="Connexion introuvable")

    conn = conn_res.data
    body = CallbackRequest(connection_id=conn["powens_connection_id"], state=conn_id)
    return process_callback(body, authorization=authorization)
