"""
Vérification JWT Supabase centralisée.
Utilisé par tous les endpoints protégés.
"""
import base64
from typing import Optional
from fastapi import HTTPException
from jose import jwt, JWTError, ExpiredSignatureError

from app.config import SUPABASE_JWT_SECRET


def _secret_variants(secret: str):
    """Retourne les variantes du secret à tester : raw string + bytes base64-décodés."""
    variants = [secret]
    try:
        decoded = base64.b64decode(secret)
        if decoded != secret.encode():
            variants.append(decoded)
    except Exception:
        pass
    return variants


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

    # Essayer les deux variantes du secret (raw string et bytes b64-décodés)
    # Supabase GoTrue peut utiliser l'une ou l'autre selon la version
    last_error: str = "Token invalide ou expiré"
    for secret in _secret_variants(SUPABASE_JWT_SECRET):
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Token invalide")
            return user_id
        except ExpiredSignatureError:
            last_error = "Session expirée — reconnecte-toi"
            break  # inutile d'essayer l'autre variante si le token est expiré
        except JWTError:
            continue

    raise HTTPException(status_code=401, detail=last_error)
