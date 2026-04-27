# Senzio

> Connecte ta banque, comprends où part ton argent.

Application web de finance personnelle — connexion bancaire via **Powens** (open banking, agréé ACPR, lecture seule) → catégorisation automatique des transactions → dashboard, objectifs, abonnements détectés.

> Le repo s'appelle encore `scanner-financier` (nom historique du projet — rebrandé Senzio).

---

## Structure

```
scanner-financier/
├── frontend/        ← Next.js 14 (App Router) → Vercel
├── backend/         ← FastAPI (Python) → Railway
├── supabase/        ← migrations SQL
├── docs/            ← documentation, changelog, design briefs
├── skills/          ← skills Claude liés au projet
├── Test/            ← fixtures (relevés bancaires d'exemple)
└── legacy/          ← prototype HTML/JS v1 (référence uniquement)
```

## Stack

- **Frontend** : Next.js 14, TypeScript, Tailwind, Supabase Auth (Google OAuth + email)
- **Backend** : FastAPI, pandas, supabase-py
- **Banking** : Powens — open banking agréé ACPR (lecture seule)
- **DB** : PostgreSQL via Supabase (RLS activée)
- **IA** : Claude Haiku — catégorisation des transactions ambiguës (cache persistant + prompt cache, ~$2-5/mois)
- **Monitoring** : Sentry + Plausible
- **CI/CD** : GitHub Actions (lint + build sur PR) → Vercel + Railway en auto-deploy depuis `main`

## URLs

| Environnement | URL |
|---|---|
| Production (v3) | `https://scanner-financier-app.vercel.app` (alias prévu : `senzio.app`) |
| API | `https://scanner-financier-production.up.railway.app` |
| Repo | `https://github.com/LilianPHP/scanner-financier` |

> ⚠️ `scanner-financier.vercel.app` (sans `-app`) pointe sur la v1 legacy — ne pas y toucher.

## Démarrage local

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

Variables d'environnement : copier `.env.example` et remplir les clés (Supabase, Powens, Anthropic). Détail complet dans [`docs/GUIDE_DEPLOIEMENT.md`](docs/GUIDE_DEPLOIEMENT.md).

## Documentation

- [`docs/CLAUDE_CONTEXT.md`](docs/CLAUDE_CONTEXT.md) — contexte projet complet pour Claude
- [`docs/PROJECT_ROADMAP.md`](docs/PROJECT_ROADMAP.md) — feuille de route
- [`docs/GUIDE_DEPLOIEMENT.md`](docs/GUIDE_DEPLOIEMENT.md) — guide de déploiement pas-à-pas
- [`docs/CHANGELOG_PROJET.md`](docs/CHANGELOG_PROJET.md) — historique des releases
- [`docs/senzio-design-brief.md`](docs/senzio-design-brief.md) — brief de design
