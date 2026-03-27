"""
Vérification JWT Supabase centralisée.
Supporte ES256 (asymétrique, via JWKS) et HS256 (symétrique, legacy).
"""
import base64
import threading
import time
from typing import Optional

import httpx
from fastapi import HTTPException
from jose import jwt, JWTError

from app.config import SUPABASE_URL, SUPABASE_JWT_SECRET

# ── Cache JWKS ────────────────────────────────────────────────────────────────
_jwks_cache: dict = {}
_jwks_lock = threading.Lock()
_jwks_last_fetch: float = 0
_JWKS_TTL = 3600  # recharger toutes les heures


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_last_fetch
    with _jwks_lock:
        if time.time() - _jwks_last_fetch < _JWKS_TTL and _jwks_cache:
            return _jwks_cache
        try:
            url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
            resp = httpx.get(url, timeout=5)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_last_fetch = time.time()
        except Exception:
            pass  # utiliser le cache existant si disponible
    return _jwks_cache


def _find_key(jwks: dict, kid: Optional[str]):
    """Retourne la clé JWK correspondant au kid, ou la première disponible."""
    keys = jwks.get("keys", [])
    if kid:
        for k in keys:
            if k.get("kid") == kid:
                return k
    return keys[0] if keys else None


# ── Vérification ─────────────────────────────────────────────────────────────

def get_user_id(authorization: Optional[str]) -> str:
    """
    Extrait et vérifie l'user_id depuis le JWT Supabase.
    Supporte ES256 (JWKS) et HS256 (secret symétrique).
    Lève HTTPException 401 si le token est absent, invalide ou expiré.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token d'authentification manquant")

    token = authorization.split(" ", 1)[1]

    # Lire le header pour savoir quel algo utiliser
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    alg = unverified_header.get("alg", "HS256")
    kid = unverified_header.get("kid")

    try:
        if alg in ("RS256", "ES256", "RS384", "ES384"):
            # Vérification asymétrique via JWKS
            jwks = _get_jwks()
            key = _find_key(jwks, kid)
            if not key:
                raise HTTPException(status_code=500, detail="Clé publique introuvable")
            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
        else:
            # Vérification symétrique HS256 — essayer raw + b64-décodé
            if not SUPABASE_JWT_SECRET:
                raise HTTPException(status_code=500, detail="Configuration serveur manquante")
            secrets = [SUPABASE_JWT_SECRET]
            try:
                decoded = base64.b64decode(SUPABASE_JWT_SECRET)
                if decoded != SUPABASE_JWT_SECRET.encode():
                    secrets.append(decoded)
            except Exception:
                pass

            payload = None
            last_err = "Token invalide ou expiré"
            for secret in secrets:
                try:
                    payload = jwt.decode(
                        token, secret,
                        algorithms=["HS256"],
                        options={"verify_aud": False},
                    )
                    break
                except JWTError as e:
                    last_err = str(e)
            if payload is None:
                raise HTTPException(status_code=401, detail=last_err)

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        return user_id

    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
