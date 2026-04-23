"""
Client Powens (Budget Insight) — Open Banking API.
Docs : https://docs.powens.com/api-reference/overview/webview
"""
import os
from urllib.parse import urlencode
from typing import Optional
import httpx

POWENS_DOMAIN = os.environ.get("POWENS_DOMAIN", "")        # ex: "senzio-sandbox"
POWENS_CLIENT_ID = os.environ.get("POWENS_CLIENT_ID", "")
POWENS_CLIENT_SECRET = os.environ.get("POWENS_CLIENT_SECRET", "")


def _base_url() -> str:
    return f"https://{POWENS_DOMAIN}.biapi.pro/2.0"


def _service_headers() -> dict:
    """Auth headers pour appels service-to-service (pas d'user token)."""
    import base64
    creds = base64.b64encode(f"{POWENS_CLIENT_ID}:{POWENS_CLIENT_SECRET}".encode()).decode()
    return {"Authorization": f"Basic {creds}"}


# ── Création d'un user Powens ──────────────────────────────────────────────────

def create_powens_user() -> dict:
    """
    Crée un user anonyme Powens et retourne son token permanent.
    Retourne { auth_token, id_user, ... }
    """
    resp = httpx.post(
        f"{_base_url()}/auth/init",
        headers=_service_headers(),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_temp_code(user_token: str) -> str:
    """
    Génère un code temporaire (single-use) depuis le token user permanent.
    Utilisé pour construire l'URL webview.
    """
    resp = httpx.get(
        f"{_base_url()}/auth/token/code",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["code"]


# ── URL Webview ────────────────────────────────────────────────────────────────

def build_webview_url(temp_code: str, redirect_uri: str, state: str) -> str:
    """
    Construit l'URL webview Powens pour la connexion bancaire.
    L'user sélectionne sa banque et s'authentifie côté Powens.
    Après auth, Powens redirige vers redirect_uri?connection_id=X&state=Y
    """
    params = {
        "domain": f"{POWENS_DOMAIN}.biapi.pro",
        "client_id": POWENS_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "state": state,
        "code": temp_code,
    }
    return f"https://webview.powens.com/connect?{urlencode(params)}"


# ── Récupération des transactions ──────────────────────────────────────────────

def get_connection_info(user_token: str, connection_id: str) -> dict:
    """Récupère les infos de la connexion (nom banque, logo, etc.)."""
    resp = httpx.get(
        f"{_base_url()}/users/me/connections/{connection_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        params={"expand": "connector"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_powens_transactions(user_token: str, connection_id: str, limit: int = 500) -> list:
    """
    Récupère les transactions d'une connexion bancaire.
    Filtre les transactions à venir (coming=True).
    """
    resp = httpx.get(
        f"{_base_url()}/users/me/transactions",
        headers={"Authorization": f"Bearer {user_token}"},
        params={
            "id_connection": connection_id,
            "limit": limit,
            "coming": False,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("transactions", [])


# ── Normalisation vers le format interne ──────────────────────────────────────

def normalize_powens_transactions(raw: list) -> list:
    """
    Convertit les transactions Powens vers le format interne de Senzio.
    Format Powens → { date, label_raw, label_clean, amount, direction, currency }
    """
    result = []
    for tx in raw:
        if tx.get("coming", False):
            continue  # ignorer les transactions en attente
        amount = float(tx.get("value", 0) or 0)
        label_raw = tx.get("original_wording") or tx.get("wording") or ""
        label_clean = tx.get("simplified_wording") or label_raw
        date = (tx.get("date") or tx.get("rdate") or "")[:10]  # garder YYYY-MM-DD
        if not date or not label_raw:
            continue
        result.append({
            "date": date,
            "label_raw": label_raw.strip(),
            "label_clean": label_clean.strip(),
            "amount": amount,
            "amount_original": amount,
            "currency": "EUR",
            "direction": "credit" if amount > 0 else "debit",
        })
    return result


def is_configured() -> bool:
    return bool(POWENS_DOMAIN and POWENS_CLIENT_ID and POWENS_CLIENT_SECRET)
