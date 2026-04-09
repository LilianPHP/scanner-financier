import os
import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.api import files, transactions, analytics, rules

_SENTRY_DSN = os.environ.get("SENTRY_DSN")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        traces_sample_rate=0.2,   # 20% des requêtes tracées (perf)
        profiles_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )

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
