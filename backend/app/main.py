from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.api import files, transactions, analytics

app = FastAPI(
    title="Scanner Financier API",
    description="Backend d'analyse de relevés bancaires",
    version="1.0.0",
)

# CORS — autorise le frontend Next.js (tous les ports localhost pour le dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(files.router, prefix="/files", tags=["Fichiers"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "scanner-financier-api"}


@app.get("/health/ai")
def health_ai():
    """Diagnostic temporaire — teste la clé Anthropic."""
    import os, anthropic
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        return {"status": "error", "detail": "ANTHROPIC_API_KEY non définie", "key_prefix": "NONE"}
    try:
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=10,
            messages=[{"role": "user", "content": "Reply: OK"}],
        )
        return {"status": "ok", "response": msg.content[0].text, "key_prefix": key[:20] + "..."}
    except Exception as e:
        return {"status": "error", "detail": str(e), "error_type": type(e).__name__, "key_prefix": key[:20] + "..."}
