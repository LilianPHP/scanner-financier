"""
Vérification JWT Supabase centralisée.
Utilisé par tous les endpoints protégés.
"""
import base64
from typing import Optional
from fastapi import HTTPException
from jose import jwt, JWTError

from app.config import SUPABASE_JWT_SECRET


def _decode_secret(secret: str) -> bytes | str:
    """
    Supabase stocke le JWT secret comme une chaîne base64.
    python-jose a besoin des bytes bruts pour vérifier la signature HS256.
    """
    try:
        return base64.b64decode(secret)
    except Exception:
        return secret


def get_user_id(authorization: Optional[str]) -> str:
    """
    Extrait et vérifie l'user_id depuis le JWT Supabase (HS256).
    Lève HTTPException 401 si le token est absent, invalide ou expiré.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token d'authentification manquant")

    token = authorization.split(" ", 1)[1]

    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Configuration serveur manquante")

    secret = _decode_secret(SUPABASE_JWT_SECRET)

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase n'utilise pas le claim standard aud
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
