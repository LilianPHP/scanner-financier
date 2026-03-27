import base64
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL, SUPABASE_JWT_SECRET
from app.api import files, transactions, analytics, rules
from jose import jwt, JWTError
from typing import Optional

app = FastAPI(
    title="Senzio API",
    description="Backend d'analyse de relevés bancaires",
    version="1.0.0",
)

# CORS — tous les domaines Senzio + localhost dev
_ALLOWED_ORIGINS = list({
    FRONTEND_URL,
    "https://senzio.app",
    "https://www.senzio.app",
    "https://scanner-financier-app.vercel.app",
    "https://scanner-financier-app-lilianphps-projects.vercel.app",
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(files.router, prefix="/files", tags=["Fichiers"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(rules.router, prefix="/rules", tags=["Règles"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "senzio-api"}


@app.get("/debug/jwt")
def debug_jwt(authorization: Optional[str] = Header(None)):
    """Endpoint de diagnostic temporaire — à supprimer après debug."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"error": "No token"}
    token = authorization.split(" ", 1)[1]
    results = {}
    secret_raw = SUPABASE_JWT_SECRET or ""
    for variant_name, secret in [("raw_string", secret_raw), ("b64_decoded", None)]:
        if variant_name == "b64_decoded":
            try:
                secret = base64.b64decode(secret_raw)
            except Exception as e:
                results[variant_name] = f"b64decode failed: {e}"
                continue
        try:
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
            results[variant_name] = {"ok": True, "sub": payload.get("sub"), "exp": payload.get("exp")}
        except JWTError as e:
            results[variant_name] = {"ok": False, "error": str(e)}
    return {"secret_present": bool(SUPABASE_JWT_SECRET), "secret_len": len(secret_raw), "results": results}
