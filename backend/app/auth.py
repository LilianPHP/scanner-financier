"""
Vérification JWT Supabase centralisée.
Utilisé par tous les endpoints protégés.
"""
from typing import Optional
from fastapi import HTTPException
from jose import jwt, JWTError

from app.config import SUPABASE_JWT_SECRET


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

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
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
