from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import FRONTEND_URL
from app.api import files, transactions, analytics

app = FastAPI(
    title="Scanner Financier API",
    description="Backend d'analyse de relevés bancaires",
    version="1.0.0",
)

# CORS — autorise le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
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
