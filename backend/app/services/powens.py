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


def delete_powens_connection(user_token: str, connection_id: str) -> None:
    """
    Supprime définitivement la connexion bancaire côté Powens.

    L'endpoint Powens effectue un hard delete de la connexion et des données
    associées, ce qui correspond à l'attente RGPD pour la suppression.
    """
    resp = httpx.delete(
        f"{_base_url()}/users/me/connections/{connection_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        timeout=15,
    )
    resp.raise_for_status()


def get_powens_transactions(
    user_token: str,
    connection_id: str,
    limit: int = 1000,
    period_months: int = 6,
    target_month: Optional[str] = None,
) -> list:
    """
    Récupère les transactions d'une connexion bancaire.

    Deux modes :
    - target_month (format "YYYY-MM") : récupère UNIQUEMENT le mois donné.
      Économique : moins de transactions à catégoriser, sync plus rapide.
    - period_months : récupère les N derniers mois depuis aujourd'hui.
      Mode legacy / fallback si target_month n'est pas fourni.

    Filtre toujours les transactions à venir (coming=True).
    """
    from datetime import date, timedelta
    from calendar import monthrange

    params = {
        "id_connection": connection_id,
        "limit": limit,
    }

    if target_month:
        # "2026-04" → min_date = 2026-04-01, max_date = 2026-04-30
        try:
            year, month = map(int, target_month.split("-"))
            last_day = monthrange(year, month)[1]
            params["min_date"] = f"{year:04d}-{month:02d}-01"
            params["max_date"] = f"{year:04d}-{month:02d}-{last_day:02d}"
        except (ValueError, AttributeError):
            # Format invalide → fallback period_months
            params["min_date"] = (date.today() - timedelta(days=period_months * 30)).strftime("%Y-%m-%d")
    else:
        params["min_date"] = (date.today() - timedelta(days=period_months * 30)).strftime("%Y-%m-%d")

    resp = httpx.get(
        f"{_base_url()}/users/me/transactions",
        headers={"Authorization": f"Bearer {user_token}"},
        params=params,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    txs = data.get("transactions", [])
    # Filtrer les transactions à venir (coming=True)
    return [tx for tx in txs if not tx.get("coming", False)]


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
